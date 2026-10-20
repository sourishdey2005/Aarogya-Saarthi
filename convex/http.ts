import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const router = httpRouter();

router.route({
  path: "/api/auth/signup",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const body = await req.json();
    const result = await ctx.runMutation(internal.auth.signup, body);
    const response = {
      token: result.token,
      worker: {
        id: result.workerId,
        name: result.name,
        village: result.village,
        phone: result.phone,
      },
    };
    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
    });
  }),
});

router.route({
  path: "/api/auth/login",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const body = await req.json();
    const result = await ctx.runMutation(internal.auth.login, body);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
    });
  }),
});

router.route({
  path: "/api/auth/me",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: { code: "missing_token", message: "Missing Authorization header" } }), {
        status: 401,
        headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
      });
    }
    const result = await ctx.runQuery(internal.auth.me, { token });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
    });
  }),
});

router.route({
  path: "/api/patients",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: { code: "missing_token", message: "Missing Authorization header" } }), {
        status: 401,
        headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
      });
    }
    const result = await ctx.runQuery(internal.patients.listPatients, { ashaWorkerId: token as any });
    return new Response(JSON.stringify({ patients: result, count: result.length }), {
      status: 200,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
    });
  }),
});

router.route({
  path: "/api/patients",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
    const body = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: { code: "missing_token", message: "Missing Authorization header" } }), {
        status: 401,
        headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
      });
    }
    const result = await ctx.runMutation(internal.patients.createPatient, { ashaWorkerId: token as any, ...body });
    return new Response(JSON.stringify(result), {
      status: result.created ? 201 : 200,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
    });
  }),
});

router.route({
  path: "/api/patients/:patientId/timeline",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
    const url = new URL(req.url);
    const patientId = url.pathname.split("/").pop();
    if (!token || !patientId) {
      return new Response(JSON.stringify({ error: { code: "validation_error", message: "Missing patient ID" } }), {
        status: 400,
        headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
      });
    }
    const result = await ctx.runQuery(internal.patients.getPatientTimeline, { patientId: patientId as any, ashaWorkerId: token as any });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
    });
  }),
});

router.route({
  path: "/api/symptom-logs",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
    const body = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: { code: "missing_token", message: "Missing Authorization header" } }), {
        status: 401,
        headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
      });
    }
    const result = await ctx.runMutation(internal.symptoms.createSymptomLog, { ashaWorkerId: token as any, ...body });
    return new Response(JSON.stringify(result), {
      status: result.created ? 201 : 200,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
    });
  }),
});

router.route({
  path: "/api/prescriptions",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
    const body = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: { code: "missing_token", message: "Missing Authorization header" } }), {
        status: 401,
        headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
      });
    }
    const result = await ctx.runMutation(internal.prescriptions.createPrescription, { ashaWorkerId: token as any, ...body });
    return new Response(JSON.stringify(result), {
      status: result.created ? 201 : 200,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
    });
  }),
});

router.route({
  path: "/api/sync/pending",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: { code: "missing_token", message: "Missing Authorization header" } }), {
        status: 401,
        headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
      });
    }
    const result = await ctx.runQuery(internal.sync.getSyncPending, { ashaWorkerId: token as any });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
    });
  }),
});

router.route({
  path: "/api/triage",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const body = await req.json();
    const result = await ctx.runAction(internal.triage.postTriage, body);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
    });
  }),
});

router.route({
  path: "/api/health",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const result = await ctx.runQuery(internal.triage.getHealth, {});
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
    });
  }),
});

// CORS preflight
router.route({
  pathPrefix: "/api/",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, req) => {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
        "access-control-allow-headers": "authorization,content-type,x-client-record-id",
        "access-control-max-age": "86400",
      },
    });
  }),
});

export default router;