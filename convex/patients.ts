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
    clientId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { ashaWorkerId, name, age, gender, village, clientId } = args;
    const id = clientId ?? crypto.randomUUID();

    // Check if patient with this ID already exists for this worker
    const existing = await ctx.db
      .query("patients")
      .withIndex("by_asha_worker", (q) => q.eq("ashaWorkerId", ashaWorkerId))
      .filter((q) => q.eq(q.field("_id"), id))
      .unique();

    if (existing) {
      return { patient: existing, created: false };
    }

    const patientId = await ctx.db.insert("patients", {
      _id: id,
      ashaWorkerId,
      name,
      age: age ?? 0,
      gender: gender ?? "female",
      village: village ?? "",
      photoUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDnxJqC0Pa6-pUCGC68IZUtA5T_Fa-BRxOlVdA93uTJars9feBKeZCYx1KgINB7iAxJO0gJMh236vfEjbkPo7KzHzW4dEeWlb54Bn6FOGEv2dvhJCb8LB4-Kq_83ZbWJoaD7BjMi71kbspFMZ0ZiO9G31WSXEPzgd7eVLrxT5123m_DlxPqHQLaPcL2WfCkqq24Ii1jWkoTSFkXpYIvKKeqbCKswo7fj_tQjzARu6hWoDIPKMqEJXfJHA",
      symptoms: [],
      triageLevel: 2,
      lastVisit: new Date().toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }),
      isHighRisk: false,
      status: "referred",
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