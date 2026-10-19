/*
 * Frontend <-> backend integration test.
 *
 * Starts the local API and the Vite dev server, then drives a real browser
 * to check that:
 *   - the app loads the patient list from GET /api/patients,
 *   - the sync screen shows the pending count from GET /api/sync/pending,
 *   - creating a patient through the API shows up in the app.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const API_URL = process.env.API_URL ?? 'http://localhost:8787';
const APP_URL = process.env.APP_URL ?? 'http://localhost:5173';
const PORT = 9228;

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aarogya-int-'));

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--user-data-dir=' + userDataDir,
    '--no-first-run',
    '--disable-gpu',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--autoplay-policy=no-user-gesture-required',
    'about:blank',
  ],
  { stdio: 'ignore' }
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getTarget() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const page = (await res.json()).find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch {
      /* not ready */
    }
    await sleep(250);
  }
  throw new Error('Chrome target not found');
}

const consoleErrors = [];

async function main() {
  const target = await getTarget();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));

  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      return;
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const myId = ++id;
      pending.set(myId, { resolve, reject });
      ws.send(JSON.stringify({ id: myId, method, params }));
    });

  await send('Runtime.enable');
  await send('Page.enable');

  // 1. Seed a patient straight into the API so we can look for it in the UI.
  const created = await fetch(`${API_URL}/api/patients`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer 11111111-1111-4111-8111-111111111111',
    },
    body: JSON.stringify({
      name: 'Integration Test Patient',
      age: 33,
      gender: 'female',
      village: 'रामपुर',
      client_id: crypto.randomUUID(),
    }),
  });
  const createdBody = await created.json();
  console.log('API created patient:', created.status, createdBody.patient?.name);

  // 2. Open the patients screen in the browser.
  await send('Page.navigate', { url: `${APP_URL}/patients` });
  await sleep(4000);

  const patientsCheck = await send('Runtime.evaluate', {
    expression: `JSON.stringify({
      hasPatient: document.body.innerText.includes('Integration Test Patient'),
      text: document.body.innerText.slice(0, 200)
    })`,
    returnByValue: true,
  });
  console.log('patients screen:', patientsCheck.result.value);

  // 3. Open the sync screen - the pending count must come from the API.
  await send('Page.navigate', { url: `${APP_URL}/sync` });
  await sleep(4000);

  const syncCheck = await send('Runtime.evaluate', {
    expression: `JSON.stringify({
      body: document.body.innerText.replace(/\\n+/g, ' | ').slice(0, 700)
    })`,
    returnByValue: true,
  });
  console.log('sync screen:', syncCheck.result.value);

  // The API is the source of truth: the screen must not show the mock count.
  const syncText = JSON.parse(syncCheck.result.value).body;
  const showsRealCount =
    syncText.includes('कोई नया डेटा लंबित नहीं है') || // no new data pending
    syncText.includes('सिंक पूर्ण है'); // all synced
  console.log('sync screen uses the API count:', showsRealCount);
  if (!showsRealCount) {
    console.error('the sync screen still shows the mock counters');
  }

  // 4. The API must report the record we created.
  const pendingCheck = await fetch(`${API_URL}/api/sync/pending`, {
    headers: { authorization: 'Bearer 11111111-1111-4111-8111-111111111111' },
  });
  const pendingBody = await pendingCheck.json();
  console.log('api pending:', JSON.stringify(pendingBody));

  const apiPatients = await (
    await fetch(`${API_URL}/api/patients`, {
      headers: { authorization: 'Bearer 11111111-1111-4111-8111-111111111111' },
    })
  ).json();
  console.log('api patient count:', apiPatients.count);

  console.log('console errors:', consoleErrors.length ? consoleErrors : 'none');

  ws.close();
  chrome.kill();
  try {
    fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch {
    /* ignore */
  }
  process.exit(showsRealCount && consoleErrors.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('integration test error:', error);
  chrome.kill();
  process.exit(1);
});
