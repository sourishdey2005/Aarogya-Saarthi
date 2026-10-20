import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listHospitals = query({
  args: { ashaWorkerId: v.id("ashaWorkers") },
  handler: async (ctx, args) => {
    const hospitals = await ctx.db
      .query("hospitals")
      .withIndex("by_asha_worker", (q) => q.eq("ashaWorkerId", args.ashaWorkerId))
      .order("desc")
      .collect();
    return hospitals.map((h) => ({
      id: h._id,
      ashaWorkerId: h.ashaWorkerId,
      name: h.name,
      type: h.type,
      village: h.village,
      address: h.address,
      phone: h.phone,
      emergency: h.emergency,
      specialties: h.specialties,
      distanceKm: h.distanceKm,
    }));
  },
});

export const createHospital = mutation({
  args: {
    ashaWorkerId: v.id("ashaWorkers"),
    name: v.string(),
    type: v.union(v.literal("govt"), v.literal("private")),
    village: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    emergency: v.optional(v.boolean()),
    specialties: v.optional(v.array(v.string())),
    distanceKm: v.optional(v.number()),
    clientRecordId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const {
      ashaWorkerId,
      name,
      type,
      village,
      address,
      phone,
      emergency,
      specialties,
      distanceKm,
      clientRecordId,
    } = args;

    if (clientRecordId) {
      const existing = await ctx.db
        .query("hospitals")
        .withIndex("by_client_record_id", (q) => q.eq("clientRecordId", clientRecordId))
        .first();
      if (existing) {
        return { hospital: existing, created: false };
      }
    }

    const hospitalId = await ctx.db.insert("hospitals", {
      ashaWorkerId,
      ...(clientRecordId ? { clientRecordId } : {}),
      name,
      type,
      ...(village ? { village } : {}),
      ...(address ? { address } : {}),
      ...(phone ? { phone } : {}),
      ...(emergency !== undefined ? { emergency } : {}),
      ...(specialties ? { specialties } : {}),
      ...(distanceKm !== undefined ? { distanceKm } : {}),
    });

    const hospital = await ctx.db.get(hospitalId);
    return { hospital, created: true };
  },
});

export const deleteHospital = mutation({
  args: {
    hospitalId: v.id("hospitals"),
    ashaWorkerId: v.id("ashaWorkers"),
  },
  handler: async (ctx, args) => {
    const { hospitalId, ashaWorkerId } = args;
    const hospital = await ctx.db.get(hospitalId);
    if (!hospital || hospital.ashaWorkerId !== ashaWorkerId) {
      throw new Error("Hospital not found for this worker");
    }
    await ctx.db.delete(hospitalId);
    return { id: hospitalId, deleted: true };
  },
});
