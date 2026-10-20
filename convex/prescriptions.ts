import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createPrescription = mutation({
  args: {
    clientRecordId: v.string(),
    patientId: v.id("patients"),
    ashaWorkerId: v.id("ashaWorkers"),
    imageUrl: v.optional(v.string()),
    imageMime: v.optional(v.string()),
    imageBytes: v.optional(v.number()),
    ocrText: v.optional(v.string()),
    ocrConfidence: v.optional(v.number()),
    capturedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const { clientRecordId, patientId, ashaWorkerId, imageUrl, imageMime, imageBytes, ocrText, ocrConfidence, capturedAt } = args;

    // Verify patient belongs to worker
    const patient = await ctx.db.get(patientId);
    if (!patient || patient.ashaWorkerId !== ashaWorkerId) {
      throw new Error("Patient not found for this worker");
    }

    // Check if already exists (idempotent)
    const existing = await ctx.db
      .query("prescriptions")
      .withIndex("by_patient", (q) => q.eq("patientId", patientId))
      .filter((q) => q.eq(q.field("_id"), clientRecordId))
      .unique();

    if (existing) {
      return { prescription: existing, created: false };
    }

    const prescriptionId = await ctx.db.insert("prescriptions", {
      _id: clientRecordId,
      patientId,
      ashaWorkerId,
      imageUrl,
      imageMime,
      imageBytes,
      ocrText,
      ocrConfidence,
      capturedAt,
      syncedAt: Date.now(),
      createdAt: Date.now(),
    });

    // Add to sync queue
    await ctx.db.insert("syncQueue", {
      clientRecordId,
      recordType: "prescription",
      ashaWorkerId,
      payload: {
        patient_id: patientId,
        ocr_confidence: ocrConfidence,
      },
      status: "synced",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const prescription = await ctx.db.get(prescriptionId);
    return { prescription, created: true };
  },
});

export const getPrescriptions = query({
  args: { patientId: v.id("patients"), ashaWorkerId: v.id("ashaWorkers") },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.ashaWorkerId !== args.ashaWorkerId) {
      throw new Error("Patient not found for this worker");
    }

    const prescriptions = await ctx.db
      .query("prescriptions")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .collect();

    return prescriptions.map((p) => ({
      id: p._id,
      patientId: p.patientId,
      imageUrl: p.imageUrl,
      imageMime: p.imageMime,
      imageBytes: p.imageBytes,
      ocrText: p.ocrText,
      ocrConfidence: p.ocrConfidence,
      capturedAt: new Date(p.capturedAt).toISOString(),
      syncedAt: p.syncedAt ? new Date(p.syncedAt).toISOString() : null,
      createdAt: new Date(p.createdAt).toISOString(),
    }));
  },
});