import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createRun = mutation({
  args: { name: v.string(), adText: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("runs", {
      name: args.name,
      adText: args.adText,
      status: "running",
      passesCompleted: 0,
      totalConcepts: 0,
      totalImages: 0,
      completedImages: 0,
    });
  },
});

export const updateRun = mutation({
  args: {
    runId: v.id("runs"),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("running"),
        v.literal("complete"),
        v.literal("failed"),
      ),
    ),
    passesCompleted: v.optional(v.number()),
    totalConcepts: v.optional(v.number()),
    totalImages: v.optional(v.number()),
    completedImages: v.optional(v.number()),
    error: v.optional(v.string()),
    pass1Raw: v.optional(v.string()),
    pass2Raw: v.optional(v.string()),
    pass3Raw: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { runId, ...rest } = args;
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined) patch[k] = v;
    }
    await ctx.db.patch(runId, patch);
  },
});

export const listRuns = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("runs").order("desc").take(50);
  },
});

export const getRun = query({
  args: { runId: v.id("runs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.runId);
  },
});
