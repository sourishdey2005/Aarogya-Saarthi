import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listDoctors = query({
  args: { ashaWorkerId: v.id("ashaWorkers"), hospitalId: v.optional(v.id("hospitals")) },
  handler: async (ctx, args) => {
    let q = ctx.db.query("doctors").withIndex("by_asha_worker", (q) =>
      q.eq("ashaWorkerId", args.ashaWorkerId)
    );
    if (args.hospitalId) {
      q = q.withIndex("by_hospital", (q) => q.eq("hospitalId", args.hospitalId));
    }
    const doctors = await q.order("desc").collect();
    return doctors.map((d) => ({
      id: d._id,
      ashaWorkerId: d.ashaWorkerId,
      hospitalId: d.hospitalId,
      name: d.name,
      specialization: d.specialization,
      phone: d.phone,
      consultationFeeRupees: d.consultationFeeRupees,
      availableDays: d.availableDays,
      availableTimes: d.availableTimes,
    }));
  },
});

export const createDoctor = mutation({
  args: {
    ashaWorkerId: v.id("ashaWorkers"),
    hospitalId: v.optional(v.id("hospitals")),
    name: v.string(),
    specialization: v.string(),
    phone: v.optional(v.string()),
    consultationFeeRupees: v.optional(v.number()),
    availableDays: v.optional(v.array(v.string())),
    availableTimes: v.optional(v.array(v.string())),
    clientRecordId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const {
      ashaWorkerId,
      hospitalId,
      name,
      specialization,
      phone,
      consultationFeeRupees,
      availableDays,
      availableTimes,
      clientRecordId,
    } = args;

    if (clientRecordId) {
      const existing = await ctx.db
        .query("doctors")
        .withIndex("by_client_record_id", (q) => q.eq("clientRecordId", clientRecordId))
        .first();
      if (existing) {
        return { doctor: existing, created: false };
      }
    }

    const doctorId = await ctx.db.insert("doctors", {
      ashaWorkerId,
      ...(clientRecordId ? { clientRecordId } : {}),
      ...(hospitalId ? { hospitalId } : {}),
      name,
      specialization,
      ...(phone ? { phone } : {}),
      ...(consultationFeeRupees !== undefined ? { consultationFeeRupees } : {}),
      ...(availableDays ? { availableDays } : {}),
      ...(availableTimes ? { availableTimes } : {}),
    });

    const doctor = await ctx.db.get(doctorId);
    return { doctor, created: true };
  },
});

export const deleteDoctor = mutation({
  args: {
    doctorId: v.id("doctors"),
    ashaWorkerId: v.id("ashaWorkers"),
  },
  handler: async (ctx, args) => {
    const { doctorId, ashaWorkerId } = args;
    const doctor = await ctx.db.get(doctorId);
    if (!doctor || doctor.ashaWorkerId !== ashaWorkerId) {
      throw new Error("Doctor not found for this worker");
    }
    await ctx.db.delete(doctorId);
    return { id: doctorId, deleted: true };
  },
});
