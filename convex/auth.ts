import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { sha256 } from "./helpers";

export const signup = mutation({
  args: {
    name: v.string(),
    village: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const { name, village, phone, email, password } = args;
    const normalizedPhone = phone?.trim() || undefined;
    const normalizedEmail = email?.trim() || undefined;

    // Check if phone already exists
    if (normalizedPhone) {
      const existing = await ctx.db
        .query("ashaWorkers")
        .withIndex("by_phone", (q) => q.eq("phone", normalizedPhone))
        .unique();
      if (existing) {
        throw new Error("An account with that phone already exists");
      }
    }

    // Check if email already exists
    if (normalizedEmail) {
      const existing = await ctx.db
        .query("ashaWorkers")
        .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
        .unique();
      if (existing) {
        throw new Error("An account with that email already exists");
      }
    }

    const salt = crypto.randomUUID();
    const hash = await sha256(`${salt}:${password}`);

    const displayName = name.trim() || "ASHA Worker";
    const displayVillage = village?.trim() || "Rampur";

    // Optional fields must be omitted (not null) to satisfy v.optional().
    const workerId = await ctx.db.insert("ashaWorkers", {
      name: displayName,
      village: displayVillage,
      ...(normalizedPhone ? { phone: normalizedPhone } : {}),
      ...(normalizedEmail ? { email: normalizedEmail } : {}),
      passwordHash: hash,
      passwordSalt: salt,
      createdAt: Date.now(),
    });

    // The worker id doubles as the session token: every other endpoint
    // authorizes by treating the bearer token as the ashaWorkerId.
    const token = workerId;
    return {
      token,
      workerId,
      name: displayName,
      village: displayVillage,
      phone: normalizedPhone ?? null,
    };
  },
});

export const login = mutation({
  args: {
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const { phone, email, password } = args;
    const normalizedPhone = phone?.trim() || undefined;
    const normalizedEmail = email?.trim() || undefined;

    if (!normalizedPhone && !normalizedEmail) {
      throw new Error("Either phone or email is required");
    }

    let worker;
    if (normalizedPhone) {
      worker = await ctx.db
        .query("ashaWorkers")
        .withIndex("by_phone", (q) => q.eq("phone", normalizedPhone))
        .unique();
    } else if (normalizedEmail) {
      worker = await ctx.db
        .query("ashaWorkers")
        .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
        .unique();
    }

    if (!worker) {
      throw new Error("Phone / email or password is wrong");
    }

    const candidate = await sha256(`${worker.passwordSalt}:${password}`);
    if (candidate !== worker.passwordHash) {
      throw new Error("Phone / email or password is wrong");
    }

    const token = worker._id;
    return {
      token,
      worker: {
        id: worker._id,
        name: worker.name,
        village: worker.village,
        phone: worker.phone,
      },
    };
  },
});

export const me = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    // In a real app, you'd validate the token against a sessions table
    // For now, we'll use the token as the worker ID directly (dev mode)
    const worker = await ctx.db.get(args.token as any);
    if (!worker) return { worker: null };
    return {
      worker: {
        id: worker._id,
        name: worker.name,
        village: worker.village,
        phone: worker.phone,
      },
    };
  },
});