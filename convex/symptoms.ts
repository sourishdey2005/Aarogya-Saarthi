import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createSymptomLog = mutation({
  args: {
    clientRecordId: v.string(),
    patientId: v.id("patients"),
    ashaWorkerId: v.id("ashaWorkers"),
    rawTranscript: v.optional(v.string()),
    symptoms: v.array(v.string()),
    capturedAt: v.number(),
    triageResult: v.optional(v.union(v.literal("home_care"), v.literal("visit_phc"), v.literal("refer_immediately"))),
    triageAdvice: v.optional(v.object({
      headline_hi: v.string(),
      headline_en: v.string(),
      reasoning: v.string(),
      source: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const { clientRecordId, patientId, ashaWorkerId, rawTranscript, symptoms, capturedAt, triageResult, triageAdvice } = args;

    // Verify patient belongs to worker
    const patient = await ctx.db.get(patientId);
    if (!patient || patient.ashaWorkerId !== ashaWorkerId) {
      throw new Error("Patient not found for this worker");
    }

    // Check if already exists (idempotent)
    const existing = await ctx.db
      .query("symptomLogs")
      .withIndex("by_client_record_id", (q) => q.eq("clientRecordId", clientRecordId))
      .first();

    if (existing) {
      return { symptomLog: existing, created: false };
    }

    const logId = await ctx.db.insert("symptomLogs", {
      patientId,
      ashaWorkerId,
      clientRecordId,
      ...(rawTranscript !== undefined ? { rawTranscript } : {}),
      symptoms,
      capturedAt,
      syncedAt: Date.now(),
      ...(triageResult ? { triageResult } : {}),
      ...(triageAdvice ? { triageAdvice } : {}),
      createdAt: Date.now(),
    });

    // Add to sync queue
    await ctx.db.insert("syncQueue", {
      clientRecordId,
      recordType: "symptom_log",
      ashaWorkerId,
      payload: {
        patient_id: patientId,
        symptoms,
        captured_at: capturedAt,
        ...(triageResult ? { triage_result: triageResult } : {}),
      },
      status: "synced",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update patient with latest triage
    if (triageResult) {
      await ctx.db.patch(patientId, {
        triageResult,
        triageAdvice,
        isHighRisk: triageResult === "refer_immediately",
        status: triageResult === "refer_immediately" ? "referred" : "active",
      });
    }

    const log = await ctx.db.get(logId);
    return { symptomLog: log, created: true };
  },
});

export const getSymptomLogs = query({
  args: { patientId: v.id("patients"), ashaWorkerId: v.id("ashaWorkers") },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.ashaWorkerId !== args.ashaWorkerId) {
      throw new Error("Patient not found for this worker");
    }

    const logs = await ctx.db
      .query("symptomLogs")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .collect();

    return logs.map((s) => ({
      id: s._id,
      patientId: s.patientId,
      rawTranscript: s.rawTranscript,
      symptoms: s.symptoms,
      capturedAt: new Date(s.capturedAt).toISOString(),
      syncedAt: s.syncedAt ? new Date(s.syncedAt).toISOString() : null,
      triageResult: s.triageResult,
      triageAdvice: s.triageAdvice,
    }));
  },
});