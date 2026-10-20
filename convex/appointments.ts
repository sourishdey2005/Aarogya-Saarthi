import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listAppointments = query({
  args: { ashaWorkerId: v.id("ashaWorkers"), status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let q = ctx.db.query("appointments").withIndex("by_asha_worker", (q) =>
      q.eq("ashaWorkerId", args.ashaWorkerId)
    );
    const appointments = await q.order("desc").collect();
    let filtered = appointments.map((a) => ({
      id: a._id,
      ashaWorkerId: a.ashaWorkerId,
      patientId: a.patientId,
      doctorId: a.doctorId,
      hospitalId: a.hospitalId,
      doctorName: a.doctorName,
      hospitalName: a.hospitalName,
      appointmentDate: a.appointmentDate,
      appointmentTime: a.appointmentTime,
      consultationFeeRupees: a.consultationFeeRupees,
      amountPaidRupees: a.amountPaidRupees,
      status: a.status,
      notes: a.notes,
      createdAt: a.createdAt,
    }));
    if (args.status) {
      filtered = filtered.filter((a) => a.status === args.status);
    }
    return filtered;
  },
});

export const createAppointment = mutation({
  args: {
    ashaWorkerId: v.id("ashaWorkers"),
    patientId: v.id("patients"),
    doctorId: v.optional(v.id("doctors")),
    hospitalId: v.optional(v.id("hospitals")),
    doctorName: v.string(),
    hospitalName: v.string(),
    appointmentDate: v.string(),
    appointmentTime: v.string(),
    consultationFeeRupees: v.optional(v.number()),
    amountPaidRupees: v.optional(v.number()),
    status: v.optional(v.union(v.literal("pending"), v.literal("confirmed"), v.literal("completed"), v.literal("cancelled"))),
    notes: v.optional(v.string()),
    clientRecordId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const {
      ashaWorkerId,
      patientId,
      doctorId,
      hospitalId,
      doctorName,
      hospitalName,
      appointmentDate,
      appointmentTime,
      consultationFeeRupees,
      amountPaidRupees,
      status,
      notes,
      clientRecordId,
    } = args;

    if (clientRecordId) {
      const existing = await ctx.db
        .query("appointments")
        .withIndex("by_client_record_id", (q) => q.eq("clientRecordId", clientRecordId))
        .first();
      if (existing) {
        return { appointment: existing, created: false };
      }
    }

    const appointmentId = await ctx.db.insert("appointments", {
      ashaWorkerId,
      ...(clientRecordId ? { clientRecordId } : {}),
      patientId,
      ...(doctorId ? { doctorId } : {}),
      ...(hospitalId ? { hospitalId } : {}),
      doctorName,
      hospitalName,
      appointmentDate,
      appointmentTime,
      ...(consultationFeeRupees !== undefined ? { consultationFeeRupees } : {}),
      ...(amountPaidRupees !== undefined ? { amountPaidRupees } : {}),
      status: status ?? "pending",
      ...(notes ? { notes } : {}),
      createdAt: Date.now(),
    });

    const appointment = await ctx.db.get(appointmentId);
    return { appointment, created: true };
  },
});

export const updateAppointmentStatus = mutation({
  args: {
    appointmentId: v.id("appointments"),
    ashaWorkerId: v.id("ashaWorkers"),
    status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("completed"), v.literal("cancelled")),
  },
  handler: async (ctx, args) => {
    const { appointmentId, ashaWorkerId, status } = args;
    const appointment = await ctx.db.get(appointmentId);
    if (!appointment || appointment.ashaWorkerId !== ashaWorkerId) {
      throw new Error("Appointment not found for this worker");
    }
    await ctx.db.patch(appointmentId, { status });
    return { id: appointmentId, status, updated: true };
  },
});

export const deleteAppointment = mutation({
  args: {
    appointmentId: v.id("appointments"),
    ashaWorkerId: v.id("ashaWorkers"),
  },
  handler: async (ctx, args) => {
    const { appointmentId, ashaWorkerId } = args;
    const appointment = await ctx.db.get(appointmentId);
    if (!appointment || appointment.ashaWorkerId !== ashaWorkerId) {
      throw new Error("Appointment not found for this worker");
    }
    await ctx.db.delete(appointmentId);
    return { id: appointmentId, deleted: true };
  },
});
