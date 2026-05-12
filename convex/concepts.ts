import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const addConcept = mutation({
  args: {
    runId: v.id("runs"),
    cNumber: v.string(),
    text: v.string(),
    reptileTriggers: v.optional(v.string()),
    googleSearch: v.optional(v.string()),
    pass: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("concepts", args);
  },
});

export const setRenderPrompt = mutation({
  args: { conceptId: v.id("concepts"), renderPrompt: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conceptId, { renderPrompt: args.renderPrompt });
  },
});

export const listForRun = query({
  args: { runId: v.id("runs") },
  handler: async (ctx, args) => {
    const concepts = await ctx.db
      .query("concepts")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect();
    return concepts.sort((a, b) => {
      const an = parseInt(a.cNumber.replace(/\D/g, ""), 10) || 0;
      const bn = parseInt(b.cNumber.replace(/\D/g, ""), 10) || 0;
      return an - bn;
    });
  },
});
