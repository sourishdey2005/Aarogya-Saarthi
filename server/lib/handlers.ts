/**
 * API handlers. Every handler receives an already authenticated worker and
 * returns a plain object (the router wraps it into a JSON response).
 *
 * All queries are scoped by `asha_worker_id`: SQLite has no row level
 * security, so this application level check is what keeps one ASHA worker
 * out of another worker's records.
 */

import { HttpError } from './http.ts';
import { runTriage, fallbackTriage } from './triage.ts';
import { signJwt } from './auth.ts';
import type { SqlClient } from '../db.ts';
import {
  optionalEnum,
  optionalInteger,
  optionalString,
  optionalStringArray,
  optionalUuid,
  requireClientRecordId,
  requireString,
  requireTimestamp,
  requireUuid,
  TRIAGE_RESULTS,
  type TriageResult,
} from './validate.ts';

export interface WorkerRow {
  id: string;
  name: string;
  village: string;
  phone: string | null;
  created_at: string;
}

export interface HandlerContext {
  sql: SqlClient;
  worker: WorkerRow;
  body: Record<string, unknown>;
  params: Record<string, string>;
  query: URLSearchParams;
  request: Request;
}

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

/** Parses a JSON column back into a JS value. */
function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/** Shapes a symptom log row for the API response. */
function toSymptomLog(row: Record<string, unknown>) {
  return {
    ...row,
    symptoms: parseJson<string[]>(row.symptoms, []),
    triage_advice: parseJson<Record<string, unknown> | null>(row.triage_advice, null),
  };
}

/** Shapes a prescription row (the image blob never leaves the database). */
function toPrescription(row: Record<string, unknown>) {
  const { image_blob, ...rest } = row as Record<string, unknown> & { image_blob?: unknown };
  const bytes =
    image_blob !== undefined && image_blob !== null
      ? (image_blob as Uint8Array).length
      : (rest.image_bytes as number | null) ?? null;
  return {
    ...rest,
    image_bytes: bytes,
    has_image: Boolean(bytes),
  };
}

/** Resolves (and if needed creates) the asha_workers row for the caller. */
export async function ensureWorker(
  sql: SqlClient,
  userId: string,
  profile: { name?: string; village?: string; phone?: string } = {}
): Promise<WorkerRow> {
  const name = profile.name?.trim() || 'ASHA Worker';
  const village = profile.village?.trim() || 'Rampur';
  const phone = profile.phone?.trim() || null;

  const result = await sql.query<WorkerRow>(
    `INSERT INTO asha_workers (id, name, village, phone)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET
       name = COALESCE(NULLIF(excluded.name, ''), asha_workers.name),
       village = COALESCE(NULLIF(excluded.village, ''), asha_workers.village),
       phone = COALESCE(excluded.phone, asha_workers.phone)
     RETURNING id, name, village, phone, created_at`,
    [userId, name, village, phone]
  );

  const row = result.rows[0];
  if (!row) throw new HttpError(500, 'worker_not_created', 'Could not create the worker profile');
  return row;
}

// ───────────────────────────────────────────────────────────────────────────

/** SHA-256 helper (WebCrypto). */
async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
// POST /api/auth/signup
// ───────────────────────────────────────────────────────────────────────────
export async function signup(ctx: HandlerContext) {
  const body = ctx.body;

  const name = requireString(body, 'name', { min: 1, max: 120 });
  const village = optionalString(body, 'village', { max: 120 });
  const phone = optionalString(body, 'phone', { max: 40 });
  const email = optionalString(body, 'email', { max: 200 });
  const password = requireString(body, 'password', { min: 6, max: 200 });

  // Passwords are stored as salted SHA-256 hashes. This is a development
  // grade scheme - a production deployment should swap this for bcrypt or
  // Argon2, but it keeps the whole app dependency free.
  const salt = crypto.randomUUID();
  const hash = await sha256(`${salt}:${password}`);

  // A worker id is generated on the server (unlike patient ids, which are
  // generated on the device for offline safety).
  const id = crypto.randomUUID();

  try {
    await ctx.sql.query(
      `INSERT INTO asha_workers (id, name, village, phone)
       VALUES (?, ?, ?, ?)`,
      [id, name, village ?? 'Rampur', phone]
    );
  } catch (error) {
    // Phone is UNIQUE - treat a duplicate as "account already exists".
    if (String(error).includes('UNIQUE')) {
      throw new HttpError(409, 'account_exists', 'An account with that phone already exists');
    }
    throw error;
  }

  // Keep the password alongside the worker row in a separate table so the
  // public asha_workers table never exposes the hash.
  await ctx.sql.query(
    `CREATE TABLE IF NOT EXISTS asha_credentials (
       worker_id TEXT PRIMARY KEY REFERENCES asha_workers (id) ON DELETE CASCADE,
       email      TEXT UNIQUE,
       password_hash TEXT NOT NULL,
       salt       TEXT NOT NULL,
       created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
     )`
  );

  await ctx.sql.query(
    `INSERT INTO asha_credentials (worker_id, email, password_hash, salt)
     VALUES (?, ?, ?, ?)`,
    [id, email, hash, salt]
  );

  const token = await signJwt(id, name, email ?? undefined);

  return {
    status: 201,
    body: {
      token,
      worker: { id, name, village: village ?? 'Rampur', phone },
    },
  };
}

// ───────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ───────────────────────────────────────────────────────────────────────────
export async function login(ctx: HandlerContext) {
  const body = ctx.body;

  const phone = optionalString(body, 'phone', { max: 40 });
  const email = optionalString(body, 'email', { max: 200 });
  const password = requireString(body, 'password', { min: 1, max: 200 });

  if (!phone && !email) {
    throw new HttpError(400, 'validation_error', 'Either "phone" or "email" is required');
  }

  // Find the worker by phone (or email).
  let worker: { id: string; name: string; village: string; phone: string | null } | undefined;
  if (phone) {
    const result = await ctx.sql.query(
      `SELECT id, name, village, phone FROM asha_workers WHERE phone = ?`,
      [phone]
    );
    worker = result.rows[0] as typeof worker;
  } else if (email) {
    const result = await ctx.sql.query(
      `SELECT a.id, a.name, a.village, a.phone
       FROM asha_workers a JOIN asha_credentials c ON c.worker_id = a.id
       WHERE c.email = ?`,
      [email]
    );
    worker = result.rows[0] as typeof worker;
  }

  if (!worker) {
    throw new HttpError(401, 'invalid_credentials', 'Phone / email or password is wrong');
  }

  const credential = await ctx.sql.query(
    `SELECT password_hash, salt FROM asha_credentials WHERE worker_id = ?`,
    [worker.id]
  );
  const row = credential.rows[0] as { password_hash?: string; salt?: string } | undefined;
  if (!row?.password_hash || !row?.salt) {
    throw new HttpError(401, 'invalid_credentials', 'Phone / email or password is wrong');
  }

  const candidate = await sha256(`${row.salt}:${password}`);
  if (candidate !== row.password_hash) {
    throw new HttpError(401, 'invalid_credentials', 'Phone / email or password is wrong');
  }

  const token = await signJwt(worker.id, worker.name, email ?? undefined);
  return {
    status: 200,
    body: { token, worker },
  };
}

// ───────────────────────────────────────────────────────────────────────────
// GET /api/auth/me
// ───────────────────────────────────────────────────────────────────────────
export async function me(ctx: HandlerContext) {
  const worker = await ctx.sql.query(
    `SELECT id, name, village, phone FROM asha_workers WHERE id = ?`,
    [ctx.worker.id]
  );
  return { status: 200, body: { worker: worker.rows[0] ?? null } };
}
export async function listPatients(ctx: HandlerContext) {
  const patients = await ctx.sql.query(
    `SELECT p.id, p.asha_worker_id, p.name, p.age, p.gender, p.village, p.created_at,
            (SELECT COUNT(*) FROM symptom_logs s WHERE s.patient_id = p.id) AS symptom_log_count,
            (SELECT MAX(s.captured_at) FROM symptom_logs s WHERE s.patient_id = p.id) AS last_captured_at,
            (SELECT s.triage_result FROM symptom_logs s
              WHERE s.patient_id = p.id AND s.triage_result IS NOT NULL
              ORDER BY s.captured_at DESC LIMIT 1) AS triage_result
     FROM patients p
     WHERE p.asha_worker_id = $1
     ORDER BY p.created_at DESC`,
    [ctx.worker.id]
  );

  return { status: 200, body: { patients: patients.rows, count: patients.rows.length } };
}

// ───────────────────────────────────────────────────────────────────────────
// POST /api/patients
// ───────────────────────────────────────────────────────────────────────────
export async function createPatient(ctx: HandlerContext) {
  const body = ctx.body;

  const name = requireString(body, 'name', { min: 1, max: 120 });
  const age = optionalInteger(body, 'age', { min: 0, max: 130 });
  const gender = optionalEnum(body, 'gender', ['female', 'male', 'other'] as const);
  const village = optionalString(body, 'village', { max: 120 });
  // Offline-first: the device generates the UUID so a patient can be created
  // without a network connection and synced later.
  const clientId = optionalUuid(body, 'client_id') ?? optionalUuid(body, 'id');
  const id = clientId ?? crypto.randomUUID();

  const result = await ctx.sql.query(
    `INSERT INTO patients (id, asha_worker_id, name, age, gender, village)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO NOTHING
     RETURNING id, asha_worker_id, name, age, gender, village, created_at`,
    [id, ctx.worker.id, name, age, gender, village ?? ctx.worker.village]
  );

  const created = result.rows[0];

  if (!created) {
    // The row already existed - return it (idempotent replay).
    const existing = await ctx.sql.query(
      `SELECT id, asha_worker_id, name, age, gender, village, created_at
       FROM patients WHERE id = $1 AND asha_worker_id = $2`,
      [id, ctx.worker.id]
    );
    if (!existing.rows[0]) {
      throw new HttpError(409, 'patient_conflict', 'A patient with that id already exists');
    }
    return { status: 200, body: { patient: existing.rows[0], created: false } };
  }

  return { status: 201, body: { patient: created, created: true } };
}

// ───────────────────────────────────────────────────────────────────────────
// POST /api/symptom-logs
// ───────────────────────────────────────────────────────────────────────────
export async function createSymptomLog(ctx: HandlerContext) {
  const body = ctx.body;

  const clientRecordId = requireClientRecordId(body);
  const patientId = requireUuid(body, 'patient_id');
  const rawTranscript = optionalString(body, 'raw_transcript', { max: 8000 });
  const symptoms = optionalStringArray(body, 'symptoms', { maxItems: 50, maxLength: 120 });
  const capturedAt = requireTimestamp(body, 'captured_at');
  const triageResult = optionalEnum(body, 'triage_result', TRIAGE_RESULTS);
  const triageAdvice = body.triage_advice ?? null;

  if (triageAdvice !== null && typeof triageAdvice !== 'object') {
    throw new HttpError(400, 'validation_error', '"triage_advice" must be an object');
  }

  // The patient must belong to the caller.
  const patient = await ctx.sql.query(
    `SELECT id FROM patients WHERE id = $1 AND asha_worker_id = $2`,
    [patientId, ctx.worker.id]
  );
  if (!patient.rows[0]) {
    throw new HttpError(404, 'patient_not_found', 'Patient not found for this worker');
  }

  const result = await ctx.sql.query(
    `INSERT INTO symptom_logs
       (id, patient_id, asha_worker_id, raw_transcript, symptoms, captured_at,
        synced_at, triage_result, triage_advice)
     VALUES ($1, $2, $3, $4, $5, $6, ${NOW}, $7, $8)
     ON CONFLICT (id) DO NOTHING
     RETURNING id, patient_id, asha_worker_id, raw_transcript, symptoms,
               captured_at, synced_at, triage_result, triage_advice`,
    [
      clientRecordId,
      patientId,
      ctx.worker.id,
      rawTranscript,
      JSON.stringify(symptoms),
      capturedAt,
      triageResult,
      triageAdvice ? JSON.stringify(triageAdvice) : null,
    ]
  );

  const created = result.rows[0];

  if (!created) {
    const existing = await ctx.sql.query(
      `SELECT id, patient_id, asha_worker_id, raw_transcript, symptoms,
              captured_at, synced_at, triage_result, triage_advice
       FROM symptom_logs WHERE id = $1`,
      [clientRecordId]
    );
    if (!existing.rows[0]) {
      throw new HttpError(500, 'log_not_created', 'Could not store the symptom log');
    }
    return {
      status: 200,
      body: { symptom_log: toSymptomLog(existing.rows[0]), created: false },
    };
  }

  // Mirror the record in the server side sync queue.
  await ctx.sql.query(
    `INSERT INTO sync_queue
       (client_record_id, record_type, asha_worker_id, payload, status)
     VALUES ($1, 'symptom_log', $2, $3, 'synced')
     ON CONFLICT (client_record_id) DO NOTHING`,
    [
      clientRecordId,
      ctx.worker.id,
      JSON.stringify({
        patient_id: patientId,
        symptoms,
        captured_at: capturedAt,
        triage_result: triageResult,
      }),
    ]
  );

  return { status: 201, body: { symptom_log: toSymptomLog(created), created: true } };
}

// ───────────────────────────────────────────────────────────────────────────
// POST /api/prescriptions
// ───────────────────────────────────────────────────────────────────────────
export async function createPrescription(ctx: HandlerContext) {
  const body = ctx.body;

  const clientRecordId = requireClientRecordId(body);
  const patientId = requireUuid(body, 'patient_id');
  const capturedAt = requireTimestamp(body, 'captured_at');
  const ocrText = optionalString(body, 'ocr_text', { max: 20000 });
  const confidence = optionalInteger(body, 'ocr_confidence', { min: 0, max: 100 });
  const imageBase64 = optionalString(body, 'image_base64', { max: 8_000_000 });

  const patient = await ctx.sql.query(
    `SELECT id FROM patients WHERE id = $1 AND asha_worker_id = $2`,
    [patientId, ctx.worker.id]
  );
  if (!patient.rows[0]) {
    throw new HttpError(404, 'patient_not_found', 'Patient not found for this worker');
  }

  let imageBytes: Uint8Array | null = null;
  let imageMime: string | null = null;

  if (imageBase64) {
    imageBytes = decodeBase64(imageBase64);
    imageMime = imageBase64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
  }

  // The photo lives inside the SQLite file and is served back by
  // GET /api/prescriptions/:id/image
  const imageUrl = imageBytes
    ? new URL(`/api/prescriptions/${clientRecordId}/image`, ctx.request.url).toString()
    : null;

  const result = await ctx.sql.query(
    `INSERT INTO prescriptions
       (id, patient_id, asha_worker_id, image_url, image_mime, image_blob, image_bytes,
        ocr_text, ocr_confidence, captured_at, synced_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, ${NOW})
     ON CONFLICT (id) DO NOTHING
     RETURNING id, patient_id, asha_worker_id, image_url, image_mime, image_bytes,
               ocr_text, ocr_confidence, captured_at, synced_at, created_at`,
    [
      clientRecordId,
      patientId,
      ctx.worker.id,
      imageUrl,
      imageMime,
      imageBytes ? Buffer.from(imageBytes) : null,
      imageBytes ? imageBytes.length : null,
      ocrText,
      confidence,
      capturedAt,
    ]
  );

  const created = result.rows[0];
  if (!created) {
    const existing = await ctx.sql.query(
      `SELECT id, patient_id, asha_worker_id, image_url, image_mime, image_bytes,
              ocr_text, ocr_confidence, captured_at, synced_at, created_at
       FROM prescriptions WHERE id = $1`,
      [clientRecordId]
    );
    if (!existing.rows[0]) {
      throw new HttpError(500, 'prescription_not_created', 'Could not store the prescription');
    }
    return { status: 200, body: { prescription: toPrescription(existing.rows[0]), created: false } };
  }

  await ctx.sql.query(
    `INSERT INTO sync_queue
       (client_record_id, record_type, asha_worker_id, payload, status)
     VALUES ($1, 'prescription', $2, $3, 'synced')
     ON CONFLICT (client_record_id) DO NOTHING`,
    [
      clientRecordId,
      ctx.worker.id,
      JSON.stringify({ patient_id: patientId, ocr_confidence: confidence }),
    ]
  );

  return { status: 201, body: { prescription: toPrescription(created), created: true } };
}

// ───────────────────────────────────────────────────────────────────────────
// GET /api/prescriptions/:id/image - the captured photo
// ───────────────────────────────────────────────────────────────────────────
export async function getPrescriptionImage(ctx: HandlerContext) {
  const id = ctx.params.id;
  if (!id) throw new HttpError(400, 'validation_error', 'A prescription id is required');

  const row = await ctx.sql.query(
    `SELECT image_mime, image_blob FROM prescriptions
     WHERE id = $1 AND asha_worker_id = $2`,
    [id, ctx.worker.id]
  );

  const record = row.rows[0] as { image_mime?: string; image_blob?: Uint8Array } | undefined;
  if (!record) {
    throw new HttpError(404, 'prescription_not_found', 'Prescription not found for this worker');
  }
  if (!record.image_blob) {
    throw new HttpError(404, 'image_not_found', 'This prescription has no photo');
  }

  return {
    status: 200,
    body: Buffer.from(record.image_blob),
    headers: { 'content-type': record.image_mime ?? 'image/jpeg' },
  };
}

// ───────────────────────────────────────────────────────────────────────────
// GET /api/patients/:id/timeline
// ───────────────────────────────────────────────────────────────────────────
export async function getPatientTimeline(ctx: HandlerContext) {
  const patientId = ctx.params.id;
  if (!patientId) {
    throw new HttpError(400, 'validation_error', 'A patient id is required');
  }

  const patient = await ctx.sql.query(
    `SELECT id, asha_worker_id, name, age, gender, village, created_at
     FROM patients WHERE id = $1 AND asha_worker_id = $2`,
    [patientId, ctx.worker.id]
  );
  if (!patient.rows[0]) {
    throw new HttpError(404, 'patient_not_found', 'Patient not found for this worker');
  }

  const symptomLogs = await ctx.sql.query(
    `SELECT id, patient_id, raw_transcript, symptoms, captured_at, synced_at,
            triage_result, triage_advice
     FROM symptom_logs WHERE patient_id = $1 AND asha_worker_id = $2
     ORDER BY captured_at DESC`,
    [patientId, ctx.worker.id]
  );

  const prescriptions = await ctx.sql.query(
    `SELECT id, patient_id, image_url, image_mime, image_bytes, ocr_text,
            ocr_confidence, captured_at, synced_at, created_at
     FROM prescriptions WHERE patient_id = $1 AND asha_worker_id = $2
     ORDER BY captured_at DESC`,
    [patientId, ctx.worker.id]
  );

  return {
    status: 200,
    body: {
      patient: patient.rows[0],
      symptom_logs: symptomLogs.rows.map(toSymptomLog),
      prescriptions: prescriptions.rows.map(toPrescription),
    },
  };
}

// ───────────────────────────────────────────────────────────────────────────
// GET /api/sync/pending
// ───────────────────────────────────────────────────────────────────────────
export async function getSyncPending(ctx: HandlerContext) {
  const requested = ctx.query.get('asha_worker_id');
  if (requested && requested !== ctx.worker.id) {
    throw new HttpError(
      403,
      'forbidden',
      'You can only read the sync status of your own records'
    );
  }

  const counts = await ctx.sql.query(
    `SELECT
       (SELECT COUNT(*) FROM symptom_logs
         WHERE asha_worker_id = $1 AND synced_at IS NULL) AS symptom_logs_pending,
       (SELECT COUNT(*) FROM prescriptions
         WHERE asha_worker_id = $2 AND synced_at IS NULL) AS prescriptions_pending,
       (SELECT COUNT(*) FROM sync_queue
         WHERE asha_worker_id = $3 AND status = 'pending') AS queue_pending,
       (SELECT COUNT(*) FROM sync_queue
         WHERE asha_worker_id = $4 AND status = 'failed') AS queue_failed,
       (SELECT COUNT(*) FROM symptom_logs
         WHERE asha_worker_id = $5) AS symptom_logs_total,
       (SELECT COUNT(*) FROM prescriptions
         WHERE asha_worker_id = $6) AS prescriptions_total`,
    [
      ctx.worker.id,
      ctx.worker.id,
      ctx.worker.id,
      ctx.worker.id,
      ctx.worker.id,
      ctx.worker.id,
    ]
  );

  const row = (counts.rows[0] ?? {}) as Record<string, number>;
  const pending =
    (row.symptom_logs_pending ?? 0) +
    (row.prescriptions_pending ?? 0) +
    (row.queue_pending ?? 0);

  const queue = await ctx.sql.query(
    `SELECT client_record_id, record_type, status, created_at, updated_at, error_message
     FROM sync_queue
     WHERE asha_worker_id = $1 AND status <> 'synced'
     ORDER BY created_at ASC
     LIMIT 100`,
    [ctx.worker.id]
  );

  return {
    status: 200,
    body: {
      asha_worker_id: ctx.worker.id,
      pending_count: pending,
      symptom_logs_pending: row.symptom_logs_pending ?? 0,
      prescriptions_pending: row.prescriptions_pending ?? 0,
      queue_pending: row.queue_pending ?? 0,
      queue_failed: row.queue_failed ?? 0,
      symptom_logs_total: row.symptom_logs_total ?? 0,
      prescriptions_total: row.prescriptions_total ?? 0,
      records: queue.rows,
      checked_at: new Date().toISOString(),
    },
  };
}

// ───────────────────────────────────────────────────────────────────────────
// POST /api/triage
// ───────────────────────────────────────────────────────────────────────────
export async function postTriage(ctx: HandlerContext) {
  const body = ctx.body;
  const symptoms = optionalStringArray(body, 'symptoms', { maxItems: 50, maxLength: 120 });
  const rawTranscript = optionalString(body, 'raw_transcript', { max: 8000 });

  if (symptoms.length === 0 && !rawTranscript) {
    throw new HttpError(
      400,
      'validation_error',
      'Either "symptoms" or "raw_transcript" is required'
    );
  }

  const result = await runTriage({ symptoms, rawTranscript });
  return { status: 200, body: result };
}

// ───────────────────────────────────────────────────────────────────────────
// GET /api/health
// ───────────────────────────────────────────────────────────────────────────
export async function getHealth(ctx: HandlerContext) {
  let database = 'ok';
  let tables = 0;
  try {
    const result = await ctx.sql.query(
      `SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table'`
    );
    tables = Number((result.rows[0] as { count?: number })?.count ?? 0);
  } catch {
    database = 'unavailable';
  }
  return {
    status: 200,
    body: {
      status: 'ok',
      service: 'aarogya-saarthi-api',
      database,
      database_engine: 'sqlite',
      tables,
      nvidia_configured: Boolean(process.env.NVIDIA_API_KEY),
      ai_provider: 'nvidia-nim',
      ai_model: process.env.NVIDIA_MODEL || 'nvidia/nemotron-3.5-lightning-30b-a3b',
      time: new Date().toISOString(),
    },
  };
}

/** Decodes a base64 (or data-URL) payload into bytes. */
export function decodeBase64(input: string): Uint8Array {
  const cleaned = input.includes(',') ? input.slice(input.indexOf(',') + 1) : input;
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export { fallbackTriage };
export type { TriageResult };
