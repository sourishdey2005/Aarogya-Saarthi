/**
 * Offline write queue.
 *
 * A rural ASHA worker is often offline for hours, so every write that cannot
 * reach the API is stored on the device and replayed later. The queue lives
 * in IndexedDB (with a localStorage fallback for browsers without it) and is
 * flushed when the app is opened and whenever the browser comes back online.
 *
 * Replays are safe because every queued request carries the same
 * `client_record_id`, which the server uses for idempotency.
 */

export interface QueuedRequest {
 /** Local id of the queue entry. */
 id: string;
 url: string;
 method: 'POST' | 'PATCH';
 body: string;
 createdAt: number;
 attempts: number;
 lastError?: string;
}

const DB_NAME = 'aarogya-saarthi';
const DB_VERSION = 1;
const STORE_NAME = 'offline-queue';
const LS_KEY = 'aarogya.offline.queue';

const hasIndexedDb = () =>
 typeof window !== 'undefined' && 'indexedDB' in window;

/**
 * A stuck IndexedDB request (private mode, a blocked upgrade, ...) must never
 * block the app, so every storage call is wrapped in a timeout.
 */
const withTimeout = <T,>(promise: Promise<T>, ms = 3000): Promise<T> =>
 new Promise<T>((resolve, reject) => {
 const timer = setTimeout(
 () => reject(new Error('IndexedDB request timed out')),
 ms
 );
 promise.then(
 (value) => {
 clearTimeout(timer);
 resolve(value);
 },
 (error) => {
 clearTimeout(timer);
 reject(error);
 }
 );
 });

function openDatabase(): Promise<IDBDatabase> {
 return new Promise((resolve, reject) => {
 const request = indexedDB.open(DB_NAME, DB_VERSION);
 request.onupgradeneeded = () => {
 const db = request.result;
 if (!db.objectStoreNames.contains(STORE_NAME)) {
 db.createObjectStore(STORE_NAME, { keyPath: 'id' });
 }
 };
 request.onsuccess = () => resolve(request.result);
 request.onerror = () => reject(request.error);
 request.onblocked = () => reject(new Error('IndexedDB upgrade blocked'));
 });
}

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
 return new Promise((resolve, reject) => {
 request.onsuccess = () => resolve(request.result);
 request.onerror = () => reject(request.error);
 });
}

/* --------------------------------------------------------- localStorage --- */
function readLocal(): QueuedRequest[] {
 if (typeof window === 'undefined') return [];
 try {
 const raw = window.localStorage.getItem(LS_KEY);
 return raw ? (JSON.parse(raw) as QueuedRequest[]) : [];
 } catch {
 return [];
 }
}

function writeLocal(items: QueuedRequest[]): void {
 if (typeof window === 'undefined') return;
 try {
 window.localStorage.setItem(LS_KEY, JSON.stringify(items));
 } catch {
 /* storage full - drop the queue silently */
 }
}

/* ------------------------------------------------------------- public API --- */
export async function enqueueRequest(input: {
 url: string;
 method: 'POST' | 'PATCH';
 body: string;
}): Promise<QueuedRequest> {
 const entry: QueuedRequest = {
 id:
 typeof crypto !== 'undefined' && 'randomUUID' in crypto
 ? crypto.randomUUID()
 : `q-${Date.now()}-${Math.random().toString(16).slice(2)}`,
 url: input.url,
 method: input.method,
 body: input.body,
 createdAt: Date.now(),
 attempts: 0,
 };

 if (hasIndexedDb()) {
 try {
 const db = await withTimeout(openDatabase());
 const tx = db.transaction(STORE_NAME, 'readwrite');
 await withTimeout(idbRequest(tx.objectStore(STORE_NAME).put(entry)));
 db.close();
 return entry;
 } catch {
 /* fall through to localStorage */
 }
 }

 const items = readLocal();
 items.push(entry);
 writeLocal(items);
 return entry;
}

export async function listQueued(): Promise<QueuedRequest[]> {
 if (hasIndexedDb()) {
 try {
 const db = await withTimeout(openDatabase());
 const tx = db.transaction(STORE_NAME, 'readonly');
 const items = await withTimeout(
 idbRequest<QueuedRequest[]>(
 tx.objectStore(STORE_NAME).getAll() as IDBRequest<QueuedRequest[]>
 )
 );
 db.close();
 return items.sort((a, b) => a.createdAt - b.createdAt);
 } catch {
 /* fall through */
 }
 }
 return readLocal().sort((a, b) => a.createdAt - b.createdAt);
}

export async function removeQueued(id: string): Promise<void> {
 if (hasIndexedDb()) {
 try {
 const db = await withTimeout(openDatabase());
 const tx = db.transaction(STORE_NAME, 'readwrite');
 await withTimeout(idbRequest(tx.objectStore(STORE_NAME).delete(id)));
 db.close();
 return;
 } catch {
 /* fall through */
 }
 }
 writeLocal(readLocal().filter((item) => item.id !== id));
}

export async function updateQueued(entry: QueuedRequest): Promise<void> {
 if (hasIndexedDb()) {
 try {
 const db = await withTimeout(openDatabase());
 const tx = db.transaction(STORE_NAME, 'readwrite');
 await withTimeout(idbRequest(tx.objectStore(STORE_NAME).put(entry)));
 db.close();
 return;
 } catch {
 /* fall through */
 }
 }
 const items = readLocal().filter((item) => item.id !== entry.id);
 items.push(entry);
 writeLocal(items);
}

/** Number of requests waiting to be synced. */
export async function queuedCount(): Promise<number> {
 return (await listQueued()).length;
}

export interface FlushResult {
 flushed: number;
 failed: number;
 remaining: number;
}

/**
 * Replays every queued request. Requests that fail because the device is
 * still offline stay in the queue; requests that are rejected by the server
 * (4xx) are dropped because retrying them would never succeed.
 */
export async function flushQueue(
 requestFn: (url: string, method: string, body: string) => Promise<{ ok: boolean; status: number }>
): Promise<FlushResult> {
 const items = await listQueued();
 let flushed = 0;
 let failed = 0;

 for (const item of items) {
 try {
 const result = await requestFn(item.url, item.method, item.body);
 if (result.ok) {
 await removeQueued(item.id);
 flushed += 1;
 } else if (result.status >= 400 && result.status < 500) {
 // The server rejected the payload - retrying is pointless.
 await removeQueued(item.id);
 failed += 1;
 } else {
 await updateQueued({
 ...item,
 attempts: item.attempts + 1,
 lastError: `HTTP ${result.status}`,
 });
 failed += 1;
 }
 } catch {
 // Still offline - keep the entry for the next attempt.
 await updateQueued({ ...item, attempts: item.attempts + 1 });
 failed += 1;
 }
 }

 return { flushed, failed, remaining: await queuedCount() };
}
