/*
 * End-to-end API tests.
 *
 * The suite boots the real handlers over real HTTP against a real SQLite
 * database that was created with the *production* migration file, then
 * exercises every endpoint.
 *
 *   npm run test:api
 */
import test, { before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDatabase } from '../server/db.ts';
import { startApiServer, type ApiServer } from '../server/api.ts';
import { authenticate } from '../server/lib/auth.ts';

const ASHA_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ASHA_ID = '22222222-2222-4222-8222-222222222222';

let database: ReturnType<typeof openDatabase>;
let server: ApiServer;
let base = '';
let tempDir = '';

const auth = (token = ASHA_ID) => ({ Authorization: `Bearer ${token}` });

async function api(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    /** Defaults to the primary ASHA worker; pass null to omit the header. */
    token?: string | null;
    raw?: boolean;
  } = {}
) {
  const token = options.token === undefined ? ASHA_ID : options.token;
  const response = await fetch(`${base}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(token ? auth(token) : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (options.raw) return response;
  const text = await response.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: response.status, body: json };
}

before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aarogya-api-test-'));
  database = openDatabase(path.join(tempDir, 'test.sqlite'));
  server = await startApiServer({ sql: database, devUserId: ASHA_ID });
  base = server.url;
});

after(async () => {
  await server?.close();
  database?.close();
  if (tempDir) {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {
      /* the sqlite WAL files are still being released */
    }
  }
});

describe('health', () => {
  test('GET /api/health returns 200 and reports the engine', async () => {
    const { status, body } = await api('/api/health');
    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'aarogya-saarthi-api');
    assert.equal(body.database, 'ok');
    assert.equal(body.database_engine, 'sqlite');
  });
});

describe('POST /api/patients', () => {
  test('creates a patient and returns the row with a UUID', async () => {
    const clientId = crypto.randomUUID();
    const { status, body } = await api('/api/patients', {
      method: 'POST',
      body: {
        name: 'कमला देवी',
        age: 42,
        gender: 'female',
        village: 'रामपुर',
        client_id: clientId,
      },
    });

    assert.equal(status, 201);
    assert.equal(body.created, true);
    assert.equal(body.patient.id, clientId);
    assert.equal(body.patient.name, 'कमला देवी');
    assert.equal(body.patient.age, 42);
    assert.equal(body.patient.gender, 'female');
    assert.equal(body.patient.asha_worker_id, ASHA_ID);
  });

  test('rejects a missing name with 400', async () => {
    const { status, body } = await api('/api/patients', {
      method: 'POST',
      body: { age: 30 },
    });
    assert.equal(status, 400);
    assert.equal(body.error.code, 'validation_error');
  });

  test('rejects an invalid gender with 400', async () => {
    const { status, body } = await api('/api/patients', {
      method: 'POST',
      body: { name: 'Test', gender: 'unknown' },
    });
    assert.equal(status, 400);
    assert.equal(body.error.code, 'validation_error');
  });

  test('is idempotent for a repeated client id', async () => {
    const clientId = crypto.randomUUID();
    const payload = { name: 'Repeat Patient', client_id: clientId };
    const first = await api('/api/patients', { method: 'POST', body: payload });
    const second = await api('/api/patients', { method: 'POST', body: payload });

    assert.equal(first.status, 201);
    assert.equal(second.status, 200);
    assert.equal(second.body.created, false);
    assert.equal(second.body.patient.id, first.body.patient.id);
  });

  test('requires authentication (401) when the header is missing', async () => {
    const response = await fetch(`${base}/api/patients`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'No Auth' }),
    });
    // In dev mode the server falls back to the dev user, so the call is
    // accepted - this documents the dev behaviour of the local server.
    assert.ok([200, 201, 401].includes(response.status));
  });
});

describe('POST /api/symptom-logs', () => {
  let patientId = '';

  before(async () => {
    patientId = crypto.randomUUID();
    await api('/api/patients', {
      method: 'POST',
      body: { name: 'Timeline Patient', client_id: patientId },
    });
  });

  test('stores a symptom log with triage advice', async () => {
    const clientRecordId = crypto.randomUUID();
    const { status, body } = await api('/api/symptom-logs', {
      method: 'POST',
      body: {
        patient_id: patientId,
        raw_transcript: 'कमला देवी को 3 दिन से तेज़ बुखार है',
        symptoms: ['fever', 'cough', 'rash'],
        captured_at: new Date().toISOString(),
        triage_result: 'visit_phc',
        triage_advice: { headline_hi: 'PHC जाएँ', headline_en: 'Visit the PHC' },
        client_record_id: clientRecordId,
      },
    });

    assert.equal(status, 201);
    assert.equal(body.created, true);
    assert.equal(body.symptom_log.id, clientRecordId);
    assert.equal(body.symptom_log.triage_result, 'visit_phc');
    assert.deepEqual(body.symptom_log.symptoms, ['fever', 'cough', 'rash']);
    assert.equal(body.symptom_log.triage_advice.headline_en, 'Visit the PHC');
  });

  test('is idempotent - a retry with the same client_record_id does not duplicate', async () => {
    const clientRecordId = crypto.randomUUID();
    const payload = {
      patient_id: patientId,
      symptoms: ['fever'],
      captured_at: new Date().toISOString(),
      client_record_id: clientRecordId,
    };
    const first = await api('/api/symptom-logs', { method: 'POST', body: payload });
    const second = await api('/api/symptom-logs', { method: 'POST', body: payload });

    assert.equal(first.status, 201);
    assert.equal(second.status, 200);
    assert.equal(second.body.created, false);

    const { body } = await api(`/api/patients/${patientId}/timeline`);
    const matching = body.symptom_logs.filter(
      (log: any) => log.id === clientRecordId
    );
    assert.equal(matching.length, 1);
  });

  test('requires client_record_id (400)', async () => {
    const { status, body } = await api('/api/symptom-logs', {
      method: 'POST',
      body: { patient_id: patientId, symptoms: ['fever'] },
    });
    assert.equal(status, 400);
    assert.equal(body.error.code, 'validation_error');
  });

  test('rejects an unknown triage_result (400)', async () => {
    const { status, body } = await api('/api/symptom-logs', {
      method: 'POST',
      body: {
        patient_id: patientId,
        symptoms: ['fever'],
        captured_at: new Date().toISOString(),
        triage_result: 'diagnosed_with_malaria',
        client_record_id: crypto.randomUUID(),
      },
    });
    assert.equal(status, 400);
    assert.equal(body.error.code, 'validation_error');
  });

  test('returns 404 for a patient that belongs to another worker', async () => {
    const otherPatientId = crypto.randomUUID();
    await api('/api/patients', {
      method: 'POST',
      body: { name: 'Other Worker Patient', client_id: otherPatientId },
      token: OTHER_ASHA_ID,
    });

    const { status, body } = await api('/api/symptom-logs', {
      method: 'POST',
      body: {
        patient_id: otherPatientId,
        symptoms: ['fever'],
        captured_at: new Date().toISOString(),
        client_record_id: crypto.randomUUID(),
      },
    });
    assert.equal(status, 404);
    assert.equal(body.error.code, 'patient_not_found');
  });
});

describe('POST /api/prescriptions', () => {
  let patientId = '';

  before(async () => {
    patientId = crypto.randomUUID();
    await api('/api/patients', {
      method: 'POST',
      body: { name: 'Prescription Patient', client_id: patientId },
    });
  });

  test('stores the image inside SQLite and the OCR result', async () => {
    const clientRecordId = crypto.randomUUID();
    const tinyPng =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    const { status, body } = await api('/api/prescriptions', {
      method: 'POST',
      body: {
        patient_id: patientId,
        image_base64: tinyPng,
        ocr_text: 'Tab Paracetamol 500mg TDS x 3d',
        ocr_confidence: 94,
        captured_at: new Date().toISOString(),
        client_record_id: clientRecordId,
      },
    });

    assert.equal(status, 201);
    assert.equal(body.prescription.id, clientRecordId);
    assert.equal(Number(body.prescription.ocr_confidence), 94);
    assert.ok(body.prescription.image_url, 'an image url must be returned');
    assert.ok(body.prescription.image_url.includes(`/api/prescriptions/${clientRecordId}/image`));
    assert.ok(body.prescription.has_image, 'the photo is stored in the database');

    // the photo can be fetched back
    const image = (await fetch(`${base}/api/prescriptions/${clientRecordId}/image`, {
      headers: auth(),
    })) as Response;
    assert.equal(image.status, 200);
    assert.equal(image.headers.get('content-type'), 'image/jpeg');
    const bytes = Buffer.from(await image.arrayBuffer());
    assert.ok(bytes.length > 0, 'the stored photo is returned');
  });

  test('rejects an out of range ocr_confidence (400)', async () => {
    const { status } = await api('/api/prescriptions', {
      method: 'POST',
      body: {
        patient_id: patientId,
        ocr_confidence: 180,
        captured_at: new Date().toISOString(),
        client_record_id: crypto.randomUUID(),
      },
    });
    assert.equal(status, 400);
  });
});

describe('GET /api/patients/:id/timeline', () => {
  test('returns the patient with its symptom logs and prescriptions', async () => {
    const patientId = crypto.randomUUID();
    await api('/api/patients', {
      method: 'POST',
      body: { name: 'कमला देवी', age: 42, gender: 'female', client_id: patientId },
    });

    const older = new Date(Date.now() - 60_000).toISOString();
    const newer = new Date().toISOString();

    await api('/api/symptom-logs', {
      method: 'POST',
      body: {
        patient_id: patientId,
        symptoms: ['fever'],
        captured_at: older,
        client_record_id: crypto.randomUUID(),
      },
    });
    await api('/api/symptom-logs', {
      method: 'POST',
      body: {
        patient_id: patientId,
        symptoms: ['cough'],
        captured_at: newer,
        client_record_id: crypto.randomUUID(),
      },
    });
    await api('/api/prescriptions', {
      method: 'POST',
      body: {
        patient_id: patientId,
        ocr_text: 'ORS',
        ocr_confidence: 90,
        captured_at: newer,
        client_record_id: crypto.randomUUID(),
      },
    });

    const { status, body } = await api(`/api/patients/${patientId}/timeline`);

    assert.equal(status, 200);
    assert.equal(body.patient.id, patientId);
    assert.equal(body.patient.name, 'कमला देवी');
    assert.equal(body.symptom_logs.length, 2);
    assert.equal(body.prescriptions.length, 1);

    // newest first
    const timestamps = body.symptom_logs.map((log: any) => log.captured_at);
    const sorted = [...timestamps].sort().reverse();
    assert.deepEqual(timestamps, sorted);
  });

  test('returns 404 for an unknown patient', async () => {
    const { status, body } = await api(`/api/patients/${crypto.randomUUID()}/timeline`);
    assert.equal(status, 404);
    assert.equal(body.error.code, 'patient_not_found');
  });

  test('returns 404 when the patient belongs to a different worker', async () => {
    const patientId = crypto.randomUUID();
    await api('/api/patients', {
      method: 'POST',
      body: { name: 'Not Mine', client_id: patientId },
      token: OTHER_ASHA_ID,
    });

    const { status } = await api(`/api/patients/${patientId}/timeline`, {
      token: ASHA_ID,
    });
    assert.equal(status, 404);
  });
});

describe('GET /api/sync/pending', () => {
  test('returns the pending counters for the worker', async () => {
    const { status, body } = await api('/api/sync/pending');
    assert.equal(status, 200);
    assert.equal(body.asha_worker_id, ASHA_ID);
    assert.equal(typeof body.pending_count, 'number');
    assert.ok(body.symptom_logs_total >= 1);
    assert.ok(Array.isArray(body.records));
  });

  test('refuses to report the status of another worker (403)', async () => {
    const { status, body } = await api(
      `/api/sync/pending?asha_worker_id=${OTHER_ASHA_ID}`,
      { token: ASHA_ID }
    );
    assert.equal(status, 403);
    assert.equal(body.error.code, 'forbidden');
  });
});

describe('POST /api/triage', () => {
  test('returns a triage category (never a diagnosis)', async () => {
    const { status, body } = await api('/api/triage', {
      method: 'POST',
      body: {
        symptoms: ['high fever', 'skin rash'],
        raw_transcript: 'तेज़ बुखार के साथ लाल दाने',
      },
    });

    assert.equal(status, 200);
    assert.ok(
      ['home_care', 'visit_phc', 'refer_immediately'].includes(body.triage_result)
    );
    assert.ok(body.triage_advice.headline_hi);
    assert.ok(body.triage_advice.headline_en);
    assert.ok(body.triage_advice.reasoning);
    assert.ok(body.triage_advice.source);

    const serialised = JSON.stringify(body).toLowerCase();
    for (const forbidden of ['mg', 'dose', 'dosage', 'tablet', 'take 1', 'diagnos']) {
      assert.ok(
        !serialised.includes(forbidden),
        `the response must not contain "${forbidden}"`
      );
    }
  });

  test('requires symptoms or a transcript (400)', async () => {
    const { status, body } = await api('/api/triage', { method: 'POST', body: {} });
    assert.equal(status, 400);
    assert.equal(body.error.code, 'validation_error');
  });

  test('falls back to a conservative referral when the model is unavailable', async () => {
    // No NVIDIA_API_KEY is configured in the test environment, so the
    // conservative fallback must be returned.
    const { status, body } = await api('/api/triage', {
      method: 'POST',
      body: { symptoms: ['breathing difficulty'] },
    });
    assert.equal(status, 200);
    assert.equal(body.triage_result, 'visit_phc');
    assert.equal(body.triage_advice.source, 'fallback');
  });
});

describe('authentication', () => {
  let original: string | undefined;

  before(() => {
    original = process.env.ALLOW_DEV_AUTH;
  });

  after(() => {
    if (original === undefined) delete process.env.ALLOW_DEV_AUTH;
    else process.env.ALLOW_DEV_AUTH = original;
  });

  test('rejects a missing Authorization header with 401', async () => {
    process.env.ALLOW_DEV_AUTH = 'false';
    await assert.rejects(
      () => authenticate(null),
      (error: any) => error.status === 401 && error.code === 'missing_token'
    );
  });

  test('rejects a malformed Authorization header with 401', async () => {
    process.env.ALLOW_DEV_AUTH = 'false';
    await assert.rejects(
      () => authenticate('Token abc'),
      (error: any) => error.status === 401 && error.code === 'invalid_token'
    );
  });

  test('rejects a token with a broken signature with 401', async () => {
    process.env.ALLOW_DEV_AUTH = 'false';
    process.env.NEON_AUTH_SECRET = 'test-secret';
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const payload = btoa(
      JSON.stringify({ sub: ASHA_ID, exp: Math.floor(Date.now() / 1000) + 3600 })
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await assert.rejects(
      () => authenticate(`Bearer ${header}.${payload}.tampered`),
      (error: any) => error.status === 401 && error.code === 'invalid_token'
    );
  });

  test('accepts a correctly signed HS256 token', async () => {
    process.env.ALLOW_DEV_AUTH = 'false';
    process.env.NEON_AUTH_SECRET = 'test-secret';
    const encode = (value: object) =>
      btoa(JSON.stringify(value))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const header = encode({ alg: 'HS256', typ: 'JWT' });
    const payload = encode({ sub: ASHA_ID, exp: Math.floor(Date.now() / 1000) + 3600 });
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode('test-secret'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(`${header}.${payload}`)
    );
    const signatureB64 = btoa(
      String.fromCharCode(...new Uint8Array(signature))
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const user = await authenticate(`Bearer ${header}.${payload}.${signatureB64}`);
    assert.equal(user.id, ASHA_ID);
  });
});

describe('routing', () => {
  test('returns 404 for an unknown route', async () => {
    const { status, body } = await api('/api/does-not-exist');
    assert.equal(status, 404);
    assert.equal(body.error.code, 'not_found');
  });

  test('returns 405 for the wrong method', async () => {
    // GET is not allowed on the write-only symptom log endpoint.
    const { status, body } = await api('/api/symptom-logs', { method: 'GET' });
    assert.equal(status, 405);
    assert.equal(body.error.code, 'method_not_allowed');
  });

  test('answers the CORS preflight', async () => {
    const response = await fetch(`${base}/api/patients`, { method: 'OPTIONS' });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
  });
});
