import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  runs: defineTable({
    name: v.string(),
    adText: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("complete"),
      v.literal("failed"),
    ),
    passesCompleted: v.number(),
    totalConcepts: v.number(),
    totalImages: v.number(),
    completedImages: v.number(),
    error: v.optional(v.string()),
    pass1Raw: v.optional(v.string()),
    pass2Raw: v.optional(v.string()),
    pass3Raw: v.optional(v.string()),
  }),

  concepts: defineTable({
    runId: v.id("runs"),
    cNumber: v.string(),
    text: v.string(),
    reptileTriggers: v.optional(v.string()),
    googleSearch: v.optional(v.string()),
    pass: v.number(),
    renderPrompt: v.optional(v.string()),
  })
    .index("by_run", ["runId"])
    .index("by_run_and_cnumber", ["runId", "cNumber"]),

  images: defineTable({
    runId: v.id("runs"),
    conceptId: v.id("concepts"),
    cNumber: v.string(),
    model: v.string(),
    storageId: v.id("_storage"),
    url: v.string(),
  })
    .index("by_run", ["runId"])
    .index("by_concept", ["conceptId"]),
});
