import { httpAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const signup = httpAction(async (ctx, req) => {
  const body = await req.json();
  const result = await ctx.runMutation(internal.auth.signup, body);
  // Normalize response format for frontend compatibility
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
});

export const login = httpAction(async (ctx, req) => {
  const body = await req.json();
  const result = await ctx.runMutation(internal.auth.login, body);
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  });
});

export const me = httpAction(async (ctx, req) => {
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
});

export const listPatients = httpAction(async (ctx, req) => {
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
});

export const createPatient = httpAction(async (ctx, req) => {
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
});

export const getPatientTimeline = httpAction(async (ctx, req) => {
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
});

export const createSymptomLog = httpAction(async (ctx, req) => {
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
});

export const createPrescription = httpAction(async (ctx, req) => {
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
});

export const getSyncPending = httpAction(async (ctx, req) => {
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
});

export const postTriage = httpAction(async (ctx, req) => {
  const body = await req.json();
  const result = await ctx.runAction(internal.triage.postTriage, body);
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  });
});

export const getHealth = httpAction(async (ctx, req) => {
  const result = await ctx.runQuery(internal.triage.getHealth, {});
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  });
});

// CORS preflight
export const options = httpAction(async (_ctx, req) => {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "access-control-allow-headers": "authorization,content-type,x-client-record-id",
      "access-control-max-age": "86400",
    },
  });
});