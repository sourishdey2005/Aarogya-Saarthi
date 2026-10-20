import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listExpenses = query({
  args: { ashaWorkerId: v.id("ashaWorkers"), type: v.optional(v.string()), patientId: v.optional(v.id("patients")) },
  handler: async (ctx, args) => {
    let q = ctx.db.query("expenses").withIndex("by_asha_worker", (q) =>
      q.eq("ashaWorkerId", args.ashaWorkerId)
    );
    const expenses = await q.order("desc").collect();
    let filtered = expenses.map((e) => ({
      id: e._id,
      ashaWorkerId: e.ashaWorkerId,
      patientId: e.patientId,
      appointmentId: e.appointmentId,
      type: e.type,
      amountRupees: e.amountRupees,
      description: e.description,
      date: e.date,
      createdAt: e.createdAt,
    }));
    if (args.type) {
      filtered = filtered.filter((e) => e.type === args.type);
    }
    if (args.patientId) {
      filtered = filtered.filter((e) => e.patientId === args.patientId);
    }
    return filtered;
  },
});

export const createExpense = mutation({
  args: {
    ashaWorkerId: v.id("ashaWorkers"),
    patientId: v.optional(v.id("patients")),
    appointmentId: v.optional(v.id("appointments")),
    type: v.union(v.literal("consultation"), v.literal("medicine"), v.literal("travel"), v.literal("other")),
    amountRupees: v.number(),
    description: v.optional(v.string()),
    date: v.string(),
    clientRecordId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const {
      ashaWorkerId,
      patientId,
      appointmentId,
      type,
      amountRupees,
      description,
      date,
      clientRecordId,
    } = args;

    if (clientRecordId) {
      const existing = await ctx.db
        .query("expenses")
        .withIndex("by_client_record_id", (q) => q.eq("clientRecordId", clientRecordId))
        .first();
      if (existing) {
        return { expense: existing, created: false };
      }
    }

    const expenseId = await ctx.db.insert("expenses", {
      ashaWorkerId,
      ...(clientRecordId ? { clientRecordId } : {}),
      ...(patientId ? { patientId } : {}),
      ...(appointmentId ? { appointmentId } : {}),
      type,
      amountRupees,
      ...(description ? { description } : {}),
      date,
      createdAt: Date.now(),
    });

    const expense = await ctx.db.get(expenseId);
    return { expense, created: true };
  },
});

export const totalExpensesRupees = query({
  args: { ashaWorkerId: v.id("ashaWorkers"), type: v.optional(v.string()), patientId: v.optional(v.id("patients")) },
  handler: async (ctx, args) => {
    let q = ctx.db.query("expenses").withIndex("by_asha_worker", (q) =>
      q.eq("ashaWorkerId", args.ashaWorkerId)
    );
    const expenses = await q.collect();
    let total = 0;
    for (const e of expenses) {
      if (args.type && e.type !== args.type) continue;
      if (args.patientId && e.patientId !== args.patientId) continue;
      total += e.amountRupees;
    }
    return { totalRupees: total };
  },
});

export const deleteExpense = mutation({
  args: {
    expenseId: v.id("expenses"),
    ashaWorkerId: v.id("ashaWorkers"),
  },
  handler: async (ctx, args) => {
    const { expenseId, ashaWorkerId } = args;
    const expense = await ctx.db.get(expenseId);
    if (!expense || expense.ashaWorkerId !== ashaWorkerId) {
      throw new Error("Expense not found for this worker");
    }
    await ctx.db.delete(expenseId);
    return { id: expenseId, deleted: true };
  },
});
