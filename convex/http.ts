import { httpRouter } from "convex/server";
import { httpAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";

const router = httpRouter();

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "access-control-allow-headers": "authorization,content-type,x-client-record-id",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}

function errorResponse(message: string, status = 400, code = "request_failed"): Response {
  return json({ error: { code, message } }, status);
}

/**
 * Convex prefixes thrown errors with "Uncaught Error:" and appends the source
 * location. Strip that so clients receive a clean, user-facing sentence.
 */
function cleanErrorMessage(raw: string): string {
  const firstLine = raw.split("\n")[0] ?? "";
  const cleaned = firstLine
    .replace(/^Uncaught Error:\s*/i, "")
    .replace(/^Error:\s*/i, "")
    .replace(/\s+at\s+(handler|async handler)\b.*$/i, "")
    .trim();
  return cleaned || "Something went wrong. Please try again.";
}

/**
 * Wraps a handler so that thrown errors are always serialized as JSON.
 * Without this, Convex returns a plain-text 500 and the browser fails with
 * "Unexpected end of JSON input".
 */
function safe(handler: (ctx: ActionCtx, req: Request) => Promise<Response>) {
  return httpAction(async (ctx, req) => {
    try {
      return await handler(ctx, req);
    } catch (error) {
      const message = cleanErrorMessage(error instanceof Error ? error.message : String(error));
      console.error("[http]", message);
      return errorResponse(message, 400);
    }
  });
}

function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  const token = header?.replace(/^Bearer\s+/i, "").trim();
  return token || null;
}

/**
 * NVIDIA API key injected by the Vercel proxy. When present it overrides the
 * key stored in the deployment environment, so the key only has to be managed
 * in one place (Vercel -> Settings -> Environment Variables).
 */
function nvidiaApiKey(req: Request): string | undefined {
  const value = req.headers.get("x-nvidia-api-key")?.trim();
  return value || undefined;
}

async function readJson(req: Request): Promise<Record<string, any>> {
  const text = await req.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, any>;
  } catch {
    throw new Error("Request body must be valid JSON");
  }
}

const str = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value : undefined;

const num = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const bool = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;

function timestamp(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return Date.now();
}

function iso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return new Date(value).toISOString();
  return null;
}

/* ------------------------------------------------------------------ */
/* Response serializers: Convex camelCase -> frontend snake_case       */
/* ------------------------------------------------------------------ */

function serializePatient(p: any) {
  if (!p) return null;
  return {
    id: p.id ?? p._id,
    asha_worker_id: p.ashaWorkerId ?? p.asha_worker_id ?? null,
    name: p.name,
    age: p.age ?? null,
    gender: p.gender ?? null,
    village: p.village ?? null,
    created_at: iso(p.createdAt ?? p.created_at) ?? new Date().toISOString(),
    symptom_log_count: p.symptomLogCount ?? p.symptoms?.length ?? 0,
    last_captured_at: p.lastCapturedAt ?? p.lastVisit ?? null,
    triage_result: p.triageResult ?? null,
  };
}

function serializeSymptomLog(s: any) {
  return {
    id: s.id ?? s._id,
    patient_id: s.patientId,
    raw_transcript: s.rawTranscript ?? null,
    symptoms: s.symptoms ?? [],
    captured_at: iso(s.capturedAt) ?? new Date().toISOString(),
    synced_at: iso(s.syncedAt),
    triage_result: s.triageResult ?? null,
    triage_advice: s.triageAdvice ?? null,
  };
}

function serializePrescription(p: any) {
  return {
    id: p.id ?? p._id,
    patient_id: p.patientId,
    image_url: p.imageUrl ?? null,
    image_mime: p.imageMime ?? null,
    image_bytes: p.imageBytes ?? null,
    has_image: Boolean(p.imageUrl),
    ocr_text: p.ocrText ?? null,
    ocr_confidence: p.ocrConfidence ?? null,
    captured_at: iso(p.capturedAt) ?? new Date().toISOString(),
    synced_at: iso(p.syncedAt),
    created_at: iso(p.createdAt) ?? new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/* Routes                                                              */
/* ------------------------------------------------------------------ */

router.route({
  path: "/api/auth/signup",
  method: "POST",
  handler: safe(async (ctx, req) => {
    const body = await readJson(req);
    const result = await ctx.runMutation(internal.auth.signup, {
      name: str(body.name) ?? "ASHA Worker",
      village: str(body.village),
      phone: str(body.phone),
      email: str(body.email),
      password: str(body.password) ?? "",
    });
    return json(
      {
        token: result.token,
        worker: {
          id: result.workerId,
          name: result.name,
          village: result.village,
          phone: result.phone,
        },
      },
      201
    );
  }),
});

router.route({
  path: "/api/auth/login",
  method: "POST",
  handler: safe(async (ctx, req) => {
    const body = await readJson(req);
    const result = await ctx.runMutation(internal.auth.login, {
      phone: str(body.phone),
      email: str(body.email),
      password: str(body.password) ?? "",
    });
    return json(result);
  }),
});

router.route({
  path: "/api/auth/me",
  method: "GET",
  handler: safe(async (ctx, req) => {
    const token = bearerToken(req);
    if (!token) return errorResponse("Missing Authorization header", 401, "missing_token");
    const result = await ctx.runQuery(internal.auth.me, { token });
    return json(result);
  }),
});

router.route({
  path: "/api/patients",
  method: "GET",
  handler: safe(async (ctx, req) => {
    const token = bearerToken(req);
    if (!token) return errorResponse("Missing Authorization header", 401, "missing_token");
    const result = await ctx.runQuery(internal.patients.listPatients, {
      ashaWorkerId: token as any,
    });
    const patients = result.map(serializePatient);
    return json({ patients, count: patients.length });
  }),
});

router.route({
  path: "/api/patients",
  method: "POST",
  handler: safe(async (ctx, req) => {
    const token = bearerToken(req);
    if (!token) return errorResponse("Missing Authorization header", 401, "missing_token");
    const body = await readJson(req);
    const result = await ctx.runMutation(internal.patients.createPatient, {
      ashaWorkerId: token as any,
      name: str(body.name) ?? "Unknown",
      age: num(body.age),
      gender: str(body.gender) as any,
      village: str(body.village),
      clientRecordId: str(body.client_record_id) ?? str(body.client_id),
    });
    return json(
      { patient: serializePatient(result.patient), created: result.created },
      result.created ? 201 : 200
    );
  }),
});

router.route({
  pathPrefix: "/api/patients/",
  method: "GET",
  handler: safe(async (ctx, req) => {
    const token = bearerToken(req);
    const segments = new URL(req.url).pathname.split("/").filter(Boolean);
    const patientId = segments.length >= 4 && segments[3] === "timeline" ? segments[2] : undefined;
    if (!token) return errorResponse("Missing Authorization header", 401, "missing_token");
    if (!patientId) return errorResponse("Missing patient ID", 400, "validation_error");
    const result = await ctx.runQuery(internal.patients.getPatientTimeline, {
      patientId: patientId as any,
      ashaWorkerId: token as any,
    });
    return json({
      patient: serializePatient(result.patient),
      symptom_logs: (result.symptomLogs ?? []).map(serializeSymptomLog),
      prescriptions: (result.prescriptions ?? []).map(serializePrescription),
    });
  }),
});

router.route({
  path: "/api/symptom-logs",
  method: "POST",
  handler: safe(async (ctx, req) => {
    const token = bearerToken(req);
    if (!token) return errorResponse("Missing Authorization header", 401, "missing_token");
    const body = await readJson(req);
    const patientId = str(body.patient_id);
    if (!patientId) return errorResponse("patient_id is required", 400, "validation_error");

    const result = await ctx.runMutation(internal.symptoms.createSymptomLog, {
      ashaWorkerId: token as any,
      patientId: patientId as any,
      clientRecordId: str(body.client_record_id) ?? crypto.randomUUID(),
      rawTranscript: str(body.raw_transcript),
      symptoms: Array.isArray(body.symptoms) ? body.symptoms.map(String) : [],
      capturedAt: timestamp(body.captured_at),
      triageResult: str(body.triage_result) as any,
      triageAdvice: body.triage_advice ?? undefined,
    });
    return json(
      { symptom_log: serializeSymptomLog(result.symptomLog), created: result.created },
      result.created ? 201 : 200
    );
  }),
});

router.route({
  path: "/api/prescriptions",
  method: "POST",
  handler: safe(async (ctx, req) => {
    const token = bearerToken(req);
    if (!token) return errorResponse("Missing Authorization header", 401, "missing_token");
    const body = await readJson(req);
    const patientId = str(body.patient_id);
    if (!patientId) return errorResponse("patient_id is required", 400, "validation_error");

    const imageBase64 = str(body.image_base64);
    // Convex documents are capped at 1MB, so only inline reasonably small images.
    const imageUrl = imageBase64 && imageBase64.length <= 700_000 ? imageBase64 : undefined;
    const imageBytes = imageBase64
      ? Math.floor((imageBase64.length * 3) / 4)
      : undefined;

    const result = await ctx.runMutation(internal.prescriptions.createPrescription, {
      ashaWorkerId: token as any,
      patientId: patientId as any,
      clientRecordId: str(body.client_record_id) ?? crypto.randomUUID(),
      imageUrl,
      imageMime: str(body.image_mime),
      imageBytes,
      ocrText: str(body.ocr_text),
      ocrConfidence: num(body.ocr_confidence),
      capturedAt: timestamp(body.captured_at),
    });
    return json(
      { prescription: serializePrescription(result.prescription), created: result.created },
      result.created ? 201 : 200
    );
  }),
});

router.route({
  path: "/api/sync/pending",
  method: "GET",
  handler: safe(async (ctx, req) => {
    const token = bearerToken(req);
    if (!token) return errorResponse("Missing Authorization header", 401, "missing_token");
    const result = await ctx.runQuery(internal.sync.getSyncPending, {
      ashaWorkerId: token as any,
    });
    return json({
      asha_worker_id: result.ashaWorkerId,
      pending_count: result.pendingCount,
      symptom_logs_pending: result.symptomLogsPending,
      prescriptions_pending: result.prescriptionsPending,
      queue_pending: result.queuePending,
      queue_failed: result.queueFailed,
      symptom_logs_total: result.symptomLogsTotal,
      prescriptions_total: result.prescriptionsTotal,
      records: result.records,
      checked_at: result.checkedAt,
    });
  }),
});

router.route({
  path: "/api/ocr",
  method: "POST",
  handler: safe(async (ctx, req) => {
    const token = bearerToken(req);
    if (!token) return errorResponse("Missing Authorization header", 401, "missing_token");
    const body = await readJson(req);

    const imageBase64 = str(body.image_base64) ?? str(body.imageBase64);
    if (!imageBase64) {
      return errorResponse("image_base64 is required", 400, "validation_error");
    }

    const result = await ctx.runAction(internal.ocr.extractPrescription, {
      imageBase64,
      mimeType: str(body.mime_type) ?? str(body.mimeType),
      apiKey: nvidiaApiKey(req),
    });
    return json(result);
  }),
});

router.route({
  path: "/api/triage",
  method: "POST",
  handler: safe(async (ctx, req) => {
    const body = await readJson(req);
    const result = await ctx.runAction(internal.triage.postTriage, {
      symptoms: Array.isArray(body.symptoms) ? body.symptoms.map(String) : undefined,
      rawTranscript: str(body.raw_transcript) ?? str(body.rawTranscript),
      apiKey: nvidiaApiKey(req),
    });
    return json(result);
  }),
});

router.route({
  path: "/api/health",
  method: "GET",
  handler: safe(async (ctx) => {
    const result = await ctx.runQuery(internal.triage.getHealth, {});
    return json(result);
  }),
});

router.route({
  pathPrefix: "/api/",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: CORS_HEADERS })),
});

export default router;
