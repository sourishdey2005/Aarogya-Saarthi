import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getSyncPending = query({
  args: { ashaWorkerId: v.id("ashaWorkers") },
  handler: async (ctx, args) => {
    const [symptomLogsPending, prescriptionsPending, queuePending, queueFailed, symptomLogsTotal, prescriptionsTotal] = await Promise.all([
      ctx.db.query("symptomLogs").withIndex("by_asha_worker", (q) => q.eq("ashaWorkerId", args.ashaWorkerId)).filter((q) => q.eq(q.field("syncedAt"), null)).collect(),
      ctx.db.query("prescriptions").withIndex("by_asha_worker", (q) => q.eq("ashaWorkerId", args.ashaWorkerId)).filter((q) => q.eq(q.field("syncedAt"), null)).collect(),
      ctx.db.query("syncQueue").withIndex("by_asha_worker_status", (q) => q.eq("ashaWorkerId", args.ashaWorkerId).eq("status", "pending")).collect(),
      ctx.db.query("syncQueue").withIndex("by_asha_worker_status", (q) => q.eq("ashaWorkerId", args.ashaWorkerId).eq("status", "failed")).collect(),
      ctx.db.query("symptomLogs").withIndex("by_asha_worker", (q) => q.eq("ashaWorkerId", args.ashaWorkerId)).collect(),
      ctx.db.query("prescriptions").withIndex("by_asha_worker", (q) => q.eq("ashaWorkerId", args.ashaWorkerId)).collect(),
    ]);

    const records = await ctx.db
      .query("syncQueue")
      .withIndex("by_asha_worker_status", (q) => q.eq("ashaWorkerId", args.ashaWorkerId))
      .filter((q) => q.neq(q.field("status"), "synced"))
      .order("asc")
      .take(100);

    const pending = symptomLogsPending.length + prescriptionsPending.length + queuePending.length;

    return {
      ashaWorkerId: args.ashaWorkerId,
      pendingCount: pending,
      symptomLogsPending: symptomLogsPending.length,
      prescriptionsPending: prescriptionsPending.length,
      queuePending: queuePending.length,
      queueFailed: queueFailed.length,
      symptomLogsTotal: symptomLogsTotal.length,
      prescriptionsTotal: prescriptionsTotal.length,
      records: records.map((r) => ({
        clientRecordId: r.clientRecordId,
        recordType: r.recordType,
        status: r.status,
        createdAt: new Date(r.createdAt).toISOString(),
        updatedAt: new Date(r.updatedAt).toISOString(),
        errorMessage: r.errorMessage,
      })),
      checkedAt: new Date().toISOString(),
    };
  },
});

export const flushSyncQueue = mutation({
  args: { ashaWorkerId: v.id("ashaWorkers") },
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("syncQueue")
      .withIndex("by_asha_worker_status", (q) => q.eq("ashaWorkerId", args.ashaWorkerId).eq("status", "pending"))
      .collect();

    let flushed = 0;
    for (const record of pending) {
      // In a real app, you'd replay the request to the external API
      // For now, just mark as synced
      await ctx.db.patch(record._id, { status: "synced", updatedAt: Date.now() });
      flushed++;
    }

    return { flushed };
  },
});