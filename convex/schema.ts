import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  folders: defineTable({
    name: v.string(),
    filesCount: v.number(),
    sizeDisplay: v.string(),
    icon: v.string(),
    color: v.string(),
  }),

  storage: defineTable({
    usedGb: v.number(),
    totalGb: v.number(),
  }),

  notes: defineTable({
    title: v.string(),
    body: v.optional(v.string()),
    folder: v.string(),
    date: v.string(),
    userEmail: v.optional(v.string()),
    isChecklist: v.optional(v.boolean()),
    checklistItems: v.optional(
      v.array(
        v.object({
          id: v.string(),
          text: v.string(),
          checked: v.boolean(),
        })
      )
    ),
    imageUrl: v.optional(v.string()),
  })
    .index("by_folder", ["folder"])
    .index("by_userEmail", ["userEmail"]),

  users: defineTable({
    username: v.string(),
    email: v.string(),
    password: v.string(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  otpCodes: defineTable({
    email: v.string(),
    code: v.string(),
    expiresAt: v.number(),
  }).index("by_email", ["email"]),
});
