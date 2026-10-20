import { mutation, query, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { sha256 } from "./helpers";

/**
 * Looks a worker up by either identifier column. Older accounts may have stored
 * an email in the `phone` field, so both indexes are checked.
 */
async function findWorkerByIdentifier(ctx: MutationCtx, value: string) {
  const byEmail = await ctx.db
    .query("ashaWorkers")
    .withIndex("by_email", (q) => q.eq("email", value))
    .unique();
  if (byEmail) return byEmail;

  return await ctx.db
    .query("ashaWorkers")
    .withIndex("by_phone", (q) => q.eq("phone", value))
    .unique();
}

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

    for (const identifier of [normalizedPhone, normalizedEmail]) {
      if (!identifier) continue;
      const existing = await findWorkerByIdentifier(ctx, identifier);
      if (existing) {
        throw new Error(
          "An account with this phone/email already exists. Please sign in instead."
        );
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
    const identifier = email?.trim() || phone?.trim() || undefined;

    if (!identifier) {
      throw new Error("Enter your phone number or email.");
    }

    const worker = await findWorkerByIdentifier(ctx, identifier);
    if (!worker) {
      throw new Error("Incorrect phone/email or password.");
    }

    const candidate = await sha256(`${worker.passwordSalt}:${password}`);
    if (candidate !== worker.passwordHash) {
      throw new Error("Incorrect phone/email or password.");
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
    // The token is the worker id, so a session is a direct document lookup.
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
