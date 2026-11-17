import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const defaultUsers = [
  {
    username: "Abdullah Jutt",
    email: "samundriabdullah560@gmail.com",
    password: "ABDULLAHJUTT",
    createdAt: Date.now(),
  },
  {
    username: "Hakim Gul",
    email: "hakim.gul@nayatel.com",
    password: "password",
    createdAt: Date.now(),
  },
];

export const getUsers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").take(100);
  },
});

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const emailNorm = args.email.trim().toLowerCase();
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", emailNorm))
      .first();
  },
});

export const createUser = mutation({
  args: {
    username: v.string(),
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const emailNorm = args.email.trim().toLowerCase();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", emailNorm))
      .first();

    if (existing) {
      return { success: false, error: "User already exists" };
    }

    const id = await ctx.db.insert("users", {
      username: args.username.trim(),
      email: emailNorm,
      password: args.password,
      createdAt: Date.now(),
    });

    return { success: true, id };
  },
});

export const resetPassword = mutation({
  args: {
    email: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const emailNorm = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", emailNorm))
      .first();

    if (!user) {
      return { success: false, error: "User not found" };
    }

    await ctx.db.patch(user._id, {
      password: args.newPassword,
    });

    return { success: true };
  },
});

export const seedInitialUsers = mutation({
  args: {},
  handler: async (ctx) => {
    for (const user of defaultUsers) {
      const emailNorm = user.email.trim().toLowerCase();
      const existing = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", emailNorm))
        .first();

      if (!existing) {
        await ctx.db.insert("users", {
          username: user.username,
          email: emailNorm,
          password: user.password,
          createdAt: user.createdAt,
        });
      }
    }
    return true;
  },
});

