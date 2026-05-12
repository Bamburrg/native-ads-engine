import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const recordImage = mutation({
  args: {
    runId: v.id("runs"),
    conceptId: v.id("concepts"),
    cNumber: v.string(),
    model: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const url = (await ctx.storage.getUrl(args.storageId)) ?? "";
    const id = await ctx.db.insert("images", { ...args, url });
    const run = await ctx.db.get(args.runId);
    if (run) {
      await ctx.db.patch(args.runId, { completedImages: run.completedImages + 1 });
    }
    return id;
  },
});

export const listForRun = query({
  args: { runId: v.id("runs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("images")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect();
  },
});

export const listForConcept = query({
  args: { conceptId: v.id("concepts") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("images")
      .withIndex("by_concept", (q) => q.eq("conceptId", args.conceptId))
      .collect();
  },
});
