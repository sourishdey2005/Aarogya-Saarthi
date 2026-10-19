/* Shows what the SQLite database really contains: tables, indexes, constraints. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDatabase } from '../server/db.ts';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aarogya-db-inspect-'));
const db = openDatabase(path.join(tempDir, 'inspect.sqlite'));

const tables = await db.query(
  `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
);
const indexes = await db.query(
  `SELECT name, tbl_name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%' ORDER BY name`
);
const columns = await db.query(
  `SELECT m.name AS table_name, p.name AS column_name, p.type
   FROM sqlite_master m JOIN pragma_table_info(m.name) p
   WHERE m.type = 'table' AND m.name NOT LIKE 'sqlite_%'
     AND p.name IN ('id','client_record_id','synced_at','triage_result','triage_advice',
                    'ocr_confidence','symptoms','image_url','image_blob','payload')
   ORDER BY m.name, p.cid`
);

const version = await db.query('SELECT sqlite_version() AS v');
console.log('sqlite version  :', version.rows[0].v);
console.log('\ntables          :', tables.rows.map((r) => r.name).join(', '));
console.log('\nindexes         :');
for (const row of indexes.rows) console.log(`   ${row.tbl_name}.${row.name}`);
console.log('\nkey columns     :');
for (const row of columns.rows) {
  console.log(`   ${row.table_name}.${row.column_name} (${row.type})`);
}

// prove the constraints are live
const bad = await db
  .query(`INSERT INTO patients (id, name, gender) VALUES ('x1', 'X', 'alien')`)
  .then(() => null)
  .catch((error) => error.message);
console.log('\ngender CHECK works            :', bad ? 'yes (rejected)' : 'NO');

await db.query(
  `INSERT INTO sync_queue (client_record_id, record_type, status)
   VALUES ('11111111-1111-4111-8111-111111111111', 'patient', 'synced')`
);
const dup = await db
  .query(
    `INSERT INTO sync_queue (client_record_id, record_type, status)
     VALUES ('11111111-1111-4111-8111-111111111111', 'patient', 'synced')`
  )
  .then(() => null)
  .catch((error) => error.message);
console.log('client_record_id UNIQUE works :', dup ? 'yes (rejected)' : 'NO');

const badJson = await db
  .query(
    `INSERT INTO symptom_logs (id, symptoms, captured_at)
     VALUES ('y1', 'not-json', '2026-01-01T00:00:00.000Z')`
  )
  .then(() => null)
  .catch((error) => error.message);
console.log('symptoms JSON CHECK works     :', badJson ? 'yes (rejected)' : 'NO');

db.close();
try {
  fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
} catch {
  /* ignore */
}
