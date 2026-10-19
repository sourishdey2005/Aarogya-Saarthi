/*
 * Step 7.1 - local test:
 *   1. insert one asha_worker, one patient and one symptom_log with raw SQL
 *      (the equivalent of pasting the rows into the SQL editor)
 *   2. curl GET /api/patients/:id/timeline and verify the data comes back
 *
 *   node tests/sql-seed-and-curl.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDatabase } from '../server/db.ts';
import { startApiServer } from '../server/api.ts';

const ASHA_ID = '33333333-3333-4333-8333-333333333333';
const PATIENT_ID = '44444444-4444-4444-8444-444444444444';
const LOG_ID = '55555555-5555-4555-8555-555555555555';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aarogya-sql-test-'));
const database = openDatabase(path.join(tempDir, 'seed.sqlite'));
const server = await startApiServer({ sql: database, devUserId: ASHA_ID });
const base = server.url;

console.log('--- 1. raw SQL inserts (SQL editor equivalent) ---');

await database.query(
  `INSERT INTO asha_workers (id, name, village, phone)
   VALUES ($1, 'सुनीता देवी', 'रामपुर', '+919000000000')
   ON CONFLICT (id) DO UPDATE SET name = excluded.name`,
  [ASHA_ID]
);
console.log('inserted asha_worker  ', ASHA_ID);

await database.query(
  `INSERT INTO patients (id, asha_worker_id, name, age, gender, village)
   VALUES ($1, $2, 'कमला देवी', 42, 'female', 'रामपुर')`,
  [PATIENT_ID, ASHA_ID]
);
console.log('inserted patient     ', PATIENT_ID);

await database.query(
  `INSERT INTO symptom_logs
     (id, patient_id, asha_worker_id, raw_transcript, symptoms, captured_at,
      synced_at, triage_result, triage_advice)
   VALUES ($1, $2, $3, 'कमला देवी को 3 दिन से तेज़ बुखार है', $4, $5,
           strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'visit_phc', $6)`,
  [
    LOG_ID,
    PATIENT_ID,
    ASHA_ID,
    JSON.stringify(['fever', 'cough', 'rash']),
    new Date().toISOString(),
    JSON.stringify({
      headline_hi: '24 घंटे के अंदर PHC ले जाएँ',
      headline_en: 'Visit the PHC within 24 hours',
      reasoning: 'Fever above 102F with a rash needs a clinical check.',
      source: 'nvidia-nim',
    }),
  ]
);
console.log('inserted symptom_log ', LOG_ID);

console.log('\n--- 2. curl GET /api/patients/:id/timeline ---');
const response = await fetch(`${base}/api/patients/${PATIENT_ID}/timeline`, {
  headers: { authorization: `Bearer ${ASHA_ID}` },
});
const payload = await response.json();

console.log('HTTP', response.status);
console.log(JSON.stringify(payload, null, 2));

const ok =
  response.status === 200 &&
  payload.patient?.name === 'कमला देवी' &&
  payload.symptom_logs?.length === 1 &&
  payload.symptom_logs[0].triage_result === 'visit_phc' &&
  Array.isArray(payload.symptom_logs[0].symptoms) &&
  payload.symptom_logs[0].symptoms.includes('fever');

console.log('\nRESULT:', ok ? 'PASS' : 'FAIL');

await server.close();
database.close();
try {
  fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
} catch {
  /* the sqlite WAL files are still being released */
}
process.exit(ok ? 0 : 1);
