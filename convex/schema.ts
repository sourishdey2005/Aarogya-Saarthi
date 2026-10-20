import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ashaWorkers: defineTable({
    name: v.string(),
    village: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    passwordHash: v.string(),
    passwordSalt: v.string(),
    createdAt: v.number(),
  })
    .index("by_phone", ["phone"])
    .index("by_email", ["email"]),

  patients: defineTable({
    ashaWorkerId: v.id("ashaWorkers"),
    name: v.string(),
    age: v.optional(v.number()),
    gender: v.optional(v.union(v.literal("female"), v.literal("male"), v.literal("other"))),
    village: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    symptoms: v.array(v.object({
      id: v.string(),
      nameHi: v.string(),
      nameEn: v.string(),
      severity: v.union(v.literal("low"), v.literal("moderate"), v.literal("high")),
    })),
    triageLevel: v.optional(v.union(v.literal(1), v.literal(2), v.literal(3))),
    lastVisit: v.optional(v.string()),
    isHighRisk: v.optional(v.boolean()),
    status: v.optional(v.string()),
    notes: v.optional(v.array(v.string())),
    isSynced: v.optional(v.boolean()),
    triageResult: v.optional(v.union(v.literal("home_care"), v.literal("visit_phc"), v.literal("refer_immediately"))),
    triageAdvice: v.optional(v.object({
      headline_hi: v.string(),
      headline_en: v.string(),
      reasoning: v.string(),
      source: v.string(),
    })),
    createdAt: v.number(),
  })
    .index("by_asha_worker", ["ashaWorkerId"]),

  symptomLogs: defineTable({
    patientId: v.id("patients"),
    ashaWorkerId: v.id("ashaWorkers"),
    rawTranscript: v.optional(v.string()),
    symptoms: v.array(v.string()),
    capturedAt: v.number(),
    syncedAt: v.optional(v.number()),
    triageResult: v.optional(v.union(v.literal("home_care"), v.literal("visit_phc"), v.literal("refer_immediately"))),
    triageAdvice: v.optional(v.object({
      headline_hi: v.string(),
      headline_en: v.string(),
      reasoning: v.string(),
      source: v.string(),
    })),
    createdAt: v.number(),
  })
    .index("by_patient", ["patientId"])
    .index("by_asha_worker", ["ashaWorkerId"]),

  prescriptions: defineTable({
    patientId: v.id("patients"),
    ashaWorkerId: v.id("ashaWorkers"),
    imageUrl: v.optional(v.string()),
    imageMime: v.optional(v.string()),
    imageBytes: v.optional(v.number()),
    ocrText: v.optional(v.string()),
    ocrConfidence: v.optional(v.number()),
    capturedAt: v.number(),
    syncedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_patient", ["patientId"])
    .index("by_asha_worker", ["ashaWorkerId"]),

  syncQueue: defineTable({
    clientRecordId: v.string(),
    recordType: v.union(v.literal("symptom_log"), v.literal("prescription"), v.literal("patient")),
    ashaWorkerId: v.id("ashaWorkers"),
    payload: v.any(),
    status: v.union(v.literal("pending"), v.literal("synced"), v.literal("failed")),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_asha_worker_status", ["ashaWorkerId", "status"])
    .index("by_client_record_id", ["clientRecordId"]),
});