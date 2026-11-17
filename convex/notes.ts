import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const defaultStarterNotes = [
  {
    userEmail: "samundriabdullah560@gmail.com",
    title: "Welcome to your Notes",
    body: "Hello! This account is securely tied to samundriabdullah560@gmail.com. All notes you add or edit will safely sync to Convex and stay available across your devices.",
    folder: "Personal",
    date: "03.11.2026",
    isChecklist: false,
  },
  {
    userEmail: "samundriabdullah560@gmail.com",
    title: "My Grocery Checklist",
    body: "Weekly groceries list",
    folder: "Personal",
    date: "03.11.2026",
    isChecklist: true,
    checklistItems: [
      { id: "1", text: "Fresh Apples & Bananas", checked: false },
      { id: "2", text: "Organic Milk & Eggs", checked: true },
      { id: "3", text: "Whole Wheat Bread", checked: false },
    ],
  },
  {
    userEmail: "samundriabdullah560@gmail.com",
    title: "Computer Science Final Prep",
    body: "Key topics to review: Data Structures, Algorithms, OS scheduling, Networking protocols, and Database normalization.",
    folder: "Academic",
    date: "02.11.2026",
    isChecklist: false,
  },
  {
    userEmail: "samundriabdullah560@gmail.com",
    title: "Academic Assignments Due",
    body: "Upcoming assignment deadlines",
    folder: "Academic",
    date: "02.11.2026",
    isChecklist: true,
    checklistItems: [
      { id: "1", text: "Submit Mobile App UI assignment", checked: true },
      { id: "2", text: "Prepare presentation slides", checked: false },
      { id: "3", text: "Review chapter 5 research paper", checked: false },
    ],
  },
  {
    userEmail: "samundriabdullah560@gmail.com",
    title: "Q4 Project Roadmap",
    body: "Sprint planning meeting deliverables: Mobile UI polish, Convex backend synchronization, and app release.",
    folder: "Work",
    date: "01.11.2026",
    isChecklist: false,
  },
  {
    userEmail: "samundriabdullah560@gmail.com",
    title: "Weekly Work Tasks",
    body: "Action items for this week",
    folder: "Work",
    date: "01.11.2026",
    isChecklist: true,
    checklistItems: [
      { id: "1", text: "Review pull requests", checked: true },
      { id: "2", text: "Set up Convex cloud backend", checked: true },
      { id: "3", text: "Deploy staging build", checked: false },
    ],
  },
  {
    userEmail: "samundriabdullah560@gmail.com",
    title: "Ideas & Inspiration",
    body: "Explore React Native Reanimated transitions, folder animations, and clean responsive card layouts.",
    folder: "Others",
    date: "31.10.2026",
    isChecklist: false,
  },
  {
    userEmail: "samundriabdullah560@gmail.com",
    title: "Travel Packing List",
    body: "Essentials for the upcoming weekend trip",
    folder: "Others",
    date: "31.10.2026",
    isChecklist: true,
    checklistItems: [
      { id: "1", text: "Chargers & Powerbank", checked: true },
      { id: "2", text: "Passport & Tickets", checked: true },
      { id: "3", text: "Noise-cancelling headphones", checked: false },
    ],
  },
];

export const getNotes = query({
  args: {
    folder: v.optional(v.string()),
    search: v.optional(v.string()),
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let notes;
    if (args.folder && args.folder !== "All") {
      notes = await ctx.db
        .query("notes")
        .withIndex("by_folder", (q) => q.eq("folder", args.folder!))
        .take(200);
    } else {
      notes = await ctx.db.query("notes").order("desc").take(200);
    }

    if (args.userEmail && args.userEmail.trim()) {
      const email = args.userEmail.trim().toLowerCase();
      notes = notes.filter(
        (n) => !n.userEmail || n.userEmail.toLowerCase() === email
      );
    }

    if (args.search && args.search.trim()) {
      const q = args.search.trim().toLowerCase();
      notes = notes.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (n.body && n.body.toLowerCase().includes(q))
      );
    }

    return notes;
  },
});

export const createNote = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("notes", {
      title: args.title,
      body: args.body,
      folder: args.folder,
      date: args.date,
      userEmail: args.userEmail,
      isChecklist: args.isChecklist,
      checklistItems: args.checklistItems,
      imageUrl: args.imageUrl,
    });
    return id;
  },
});

export const updateNote = mutation({
  args: {
    id: v.id("notes"),
    title: v.string(),
    body: v.optional(v.string()),
    folder: v.string(),
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
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      title: args.title,
      body: args.body,
      folder: args.folder,
      userEmail: args.userEmail,
      isChecklist: args.isChecklist,
      checklistItems: args.checklistItems,
      imageUrl: args.imageUrl,
    });
    return true;
  },
});

export const deleteNote = mutation({
  args: {
    id: v.id("notes"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return true;
  },
});

export const toggleChecklistItem = mutation({
  args: {
    noteId: v.id("notes"),
    itemId: v.string(),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note || !note.checklistItems) return false;

    const updated = note.checklistItems.map((item) =>
      item.id === args.itemId ? { ...item, checked: !item.checked } : item
    );

    await ctx.db.patch(args.noteId, {
      checklistItems: updated,
    });
    return true;
  },
});

export const seedInitialNotes = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("notes").take(1);
    if (existing.length === 0) {
      for (const note of defaultStarterNotes) {
        await ctx.db.insert("notes", note);
      }
    }
    return true;
  },
});
