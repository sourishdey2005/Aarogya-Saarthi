/**
 * Convex-backed API client for Aarogya Saarthi.
 *
 * The Convex URL is embedded at build time via Vite's define config.
 * Falls back to local development server if not set.
 */

import { enqueueRequest } from "./offlineQueue";

/** Base URL for Convex HTTP actions - injected at build time via Vite define. */
declare const __CONVEX_URL__: string;

let convexUrlCache: string | null = null;

/** Resolves the Convex base URL. */
export function resolveApiBase(): string {
  if (convexUrlCache) return convexUrlCache;

  // Build-time injected value (from Vite define)
  const buildTimeUrl = (typeof __CONVEX_URL__ !== "undefined" && __CONVEX_URL__) || "";

  // Allow override via env for local development
  const env = (typeof import.meta !== "undefined" && (import.meta as { env?: Record<string, string> }).env) || {};
  const fromEnv = env.CONVEX_URL?.trim() || env.VITE_CONVEX_URL?.trim() || "";

  const url = (fromEnv || buildTimeUrl || "").replace(/\/+$/, "");

  if (!url) {
    // Fallback for local development
    if (typeof window !== "undefined" && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname)) {
      convexUrlCache = "http://127.0.0.1:3210";
      return convexUrlCache;
    }
    throw new Error("Convex URL not configured. Set CONVEX_URL or VITE_CONVEX_URL environment variable.");
  }

  convexUrlCache = url;
  return url;
}

/**
 * Base URL for the AI endpoints (`/api/triage`, `/api/ocr`).
 *
 * - Local development talks to the Convex HTTP API directly, where the AI
 *   logic lives.
 * - In production the request stays on the app's own origin, so it hits the
 *   Vercel functions in `/api` which inject the NVIDIA API key from the
 *   Vercel dashboard before forwarding to Convex.
 */
function resolveAiBase(): string {
  const isLocal =
    typeof window !== "undefined" &&
    /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
  if (isLocal || import.meta.env.DEV) return resolveApiBase();
  return "";
}

const TOKEN_STORAGE_KEY = "aarogya.auth.token";
const WORKER_STORAGE_KEY = "aarogya.auth.worker";

/** The signed-in ASHA worker. */
export interface AuthWorker {
  id: string;
  name: string;
  village?: string | null;
  phone?: string | null;
}

export function getStoredWorker(): AuthWorker | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WORKER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthWorker) : null;
  } catch {
    return null;
  }
}

export function setStoredWorker(worker: AuthWorker | null): void {
  if (typeof window === "undefined") return;
  if (worker) window.localStorage.setItem(WORKER_STORAGE_KEY, JSON.stringify(worker));
  else window.localStorage.removeItem(WORKER_STORAGE_KEY);
}

/** Short human-readable worker id derived from the Convex document id. */
export function workerDisplayId(worker: AuthWorker | null | undefined): string {
  if (!worker?.id) return "";
  return `ASHA-${worker.id.slice(-6).toUpperCase()}`;
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  const env = (typeof import.meta !== "undefined" && (import.meta as { env?: Record<string, string> }).env) || {};
  const fromEnv = env.VITE_API_TOKEN;
  if (fromEnv) return fromEnv;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setAuthToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export type TriageResult = "home_care" | "visit_phc" | "refer_immediately";

export interface TriageAdvice {
  headline_hi: string;
  headline_en: string;
  reasoning: string;
  source: string;
}

export interface TriageResponse {
  triage_result: TriageResult;
  triage_advice: TriageAdvice;
}

export interface ApiPatient {
  id: string;
  asha_worker_id: string;
  name: string;
  age: number | null;
  gender: "female" | "male" | "other" | null;
  village: string | null;
  created_at: string;
  symptom_log_count?: number;
  last_captured_at?: string | null;
  triage_result?: TriageResult | null;
}

export interface ApiSymptomLog {
  id: string;
  patient_id: string;
  raw_transcript: string | null;
  symptoms: string[];
  captured_at: string;
  synced_at: string | null;
  triage_result: TriageResult | null;
  triage_advice: TriageAdvice | null;
}

export interface ApiPrescription {
  id: string;
  patient_id: string;
  image_url: string | null;
  image_mime?: string | null;
  image_bytes?: number | null;
  has_image?: boolean;
  ocr_text: string | null;
  ocr_confidence: number | null;
  captured_at: string;
  synced_at: string | null;
  created_at: string;
}

export interface SyncPendingStatus {
  asha_worker_id: string;
  pending_count: number;
  symptom_logs_pending: number;
  prescriptions_pending: number;
  queue_pending: number;
  queue_failed: number;
  symptom_logs_total: number;
  prescriptions_total: number;
  records: unknown[];
  checked_at: string;
}

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export class OfflineError extends Error {
  constructor(message = "Network unreachable") {
    super(message);
    this.name = "OfflineError";
  }
}

export interface ApiResult<T> {
  data: T;
  queued: boolean;
}

export function newClientRecordId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  /** Overrides the base URL (used to send AI calls through Vercel). */
  base?: string;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getAuthToken();
  const baseUrl = options.base ?? resolveApiBase();
  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? "GET",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw error;
    throw new OfflineError((error as Error)?.message);
  }

  if (response.status === 204) return undefined as T;

  let payload: any = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const code = payload?.error?.code ?? "request_failed";
    const message = payload?.error?.message ?? `Request failed (${response.status})`;
    throw new ApiError(response.status, code, message);
  }

  return payload as T;
}

async function write<T>(
  path: string,
  body: Record<string, unknown>,
  method: "POST" | "PATCH" = "POST"
): Promise<ApiResult<T>> {
  const payload = {
    client_record_id: newClientRecordId(),
    ...body,
  };

  try {
    const data = await request<T>(path, { method, body: payload });
    return { data, queued: false };
  } catch (error) {
    if (error instanceof OfflineError) {
      await enqueueRequest({
        url: path,
        method,
        body: JSON.stringify(payload),
      });
      return { data: undefined as T, queued: true };
    }
    throw error;
  }
}

export interface CreatePatientInput {
  name: string;
  age?: number | null;
  gender?: "female" | "male" | "other" | null;
  village?: string | null;
  client_id?: string;
}

export async function createPatient(
  input: CreatePatientInput
): Promise<ApiResult<{ patient: ApiPatient; created: boolean }>> {
  return write("/api/patients", input as unknown as Record<string, unknown>);
}

export async function listPatients(): Promise<ApiPatient[]> {
  const result = await request<{ patients: ApiPatient[] }>("/api/patients");
  return result.patients ?? [];
}

export interface PostSymptomLogInput {
  patient_id: string;
  raw_transcript?: string | null;
  symptoms?: string[];
  captured_at: string;
  triage_result?: TriageResult | null;
  triage_advice?: TriageAdvice | null;
  client_record_id?: string;
}

export async function postSymptomLog(
  input: PostSymptomLogInput
): Promise<ApiResult<{ symptom_log: ApiSymptomLog; created: boolean }>> {
  return write("/api/symptom-logs", input as unknown as Record<string, unknown>);
}

export interface PostPrescriptionInput {
  patient_id: string;
  image_base64?: string | null;
  ocr_text?: string | null;
  ocr_confidence?: number | null;
  captured_at: string;
  client_record_id?: string;
}

export async function postPrescription(
  input: PostPrescriptionInput
): Promise<ApiResult<{ prescription: ApiPrescription; created: boolean }>> {
  return write("/api/prescriptions", input as unknown as Record<string, unknown>);
}

export interface PatientTimeline {
  patient: ApiPatient;
  symptom_logs: ApiSymptomLog[];
  prescriptions: ApiPrescription[];
}

export async function getPatientTimeline(patientId: string): Promise<PatientTimeline> {
  return request<PatientTimeline>(`/api/patients/${encodeURIComponent(patientId)}/timeline`);
}

export async function getSyncPending(
  ashaWorkerId?: string
): Promise<SyncPendingStatus> {
  return request<SyncPendingStatus>(`/api/sync/pending`);
}

export async function postTriage(input: {
  symptoms?: string[];
  raw_transcript?: string | null;
}): Promise<TriageResponse> {
  return request<TriageResponse>("/api/triage", {
    method: "POST",
    body: input,
    base: resolveAiBase(),
  });
}

export interface OcrMedicine {
  name: string;
  strength: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface OcrResult {
  medicines: OcrMedicine[];
  ocr_text: string;
  ocr_confidence: number;
  source: string;
}

/** Reads a prescription photo with the AI vision model (requires auth). */
export async function ocrPrescription(input: {
  image_base64: string;
  mime_type?: string;
}): Promise<OcrResult> {
  return request<OcrResult>("/api/ocr", {
    method: "POST",
    body: input,
    base: resolveAiBase(),
  });
}

/** Fetches the worker tied to the stored auth token (null when signed out). */
export async function getMe(): Promise<AuthWorker | null> {
  if (!getAuthToken()) return null;
  try {
    const result = await request<{ worker: AuthWorker | null }>("/api/auth/me");
    return result.worker ?? null;
  } catch {
    return null;
  }
}

export async function checkBackend(): Promise<boolean> {
  try {
    const baseUrl = resolveApiBase();
    const response = await fetch(`${baseUrl}/api/health`, {
      method: "GET",
      headers: getAuthToken() ? { authorization: `Bearer ${getAuthToken()}` } : {},
    });
    return response.ok;
  } catch {
    return false;
  }
}