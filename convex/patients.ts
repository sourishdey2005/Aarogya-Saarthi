import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listPatients = query({
  args: { ashaWorkerId: v.id("ashaWorkers") },
  handler: async (ctx, args) => {
    const patients = await ctx.db
      .query("patients")
      .withIndex("by_asha_worker", (q) => q.eq("ashaWorkerId", args.ashaWorkerId))
      .order("desc")
      .collect();
    return patients.map((p) => ({
      id: p._id,
      ashaWorkerId: p.ashaWorkerId,
      name: p.name,
      age: p.age,
      gender: p.gender,
      village: p.village,
      phone: p.phone,
      address: p.address,
      bloodGroup: p.bloodGroup,
      createdAt: new Date(p.createdAt).toISOString(),
      symptomLogCount: p.symptoms?.length ?? 0,
      lastCapturedAt: p.lastVisit,
      triageResult: p.triageResult,
    }));
  },
});

export const createPatient = mutation({
  args: {
    ashaWorkerId: v.id("ashaWorkers"),
    name: v.string(),
    age: v.optional(v.number()),
    gender: v.optional(v.union(v.literal("female"), v.literal("male"), v.literal("other"))),
    village: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    bloodGroup: v.optional(v.string()),
    clientRecordId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { ashaWorkerId, name, age, gender, village, phone, address, bloodGroup, clientRecordId } = args;

    // Idempotent replay: the same client record id never creates duplicates.
    if (clientRecordId) {
      const existing = await ctx.db
        .query("patients")
        .withIndex("by_client_record_id", (q) => q.eq("clientRecordId", clientRecordId))
        .first();
      if (existing) {
        return { patient: existing, created: false };
      }
    }

    const patientId = await ctx.db.insert("patients", {
      ashaWorkerId,
      ...(clientRecordId ? { clientRecordId } : {}),
      name,
      ...(age !== undefined ? { age } : {}),
      ...(gender ? { gender } : {}),
      ...(village ? { village } : {}),
      ...(phone ? { phone } : {}),
      ...(address ? { address } : {}),
      ...(bloodGroup ? { bloodGroup } : {}),
      symptoms: [],
      triageLevel: 2,
      lastVisit: new Date().toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }),
      isHighRisk: false,
      status: "active",
      notes: [],
      isSynced: true,
      createdAt: Date.now(),
    });

    const patient = await ctx.db.get(patientId);
    return { patient, created: true };
  },
});

export const getPatientTimeline = query({
  args: { patientId: v.id("patients"), ashaWorkerId: v.id("ashaWorkers") },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.ashaWorkerId !== args.ashaWorkerId) {
      throw new Error("Patient not found for this worker");
    }

    const symptomLogs = await ctx.db
      .query("symptomLogs")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .collect();

    const prescriptions = await ctx.db
      .query("prescriptions")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .collect();

    return {
      patient: {
        id: patient._id,
        ashaWorkerId: patient.ashaWorkerId,
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        village: patient.village,
        phone: patient.phone,
        address: patient.address,
        bloodGroup: patient.bloodGroup,
        createdAt: new Date(patient.createdAt).toISOString(),
      },
      symptomLogs: symptomLogs.map((s) => ({
        id: s._id,
        patientId: s.patientId,
        rawTranscript: s.rawTranscript,
        symptoms: s.symptoms,
        capturedAt: new Date(s.capturedAt).toISOString(),
        syncedAt: s.syncedAt ? new Date(s.syncedAt).toISOString() : null,
        triageResult: s.triageResult,
        triageAdvice: s.triageAdvice,
      })),
      prescriptions: prescriptions.map((p) => ({
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
      })),
    };
  },
});