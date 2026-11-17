import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const defaultFolders = [
  {
    name: "Personal",
    filesCount: 30,
    sizeDisplay: "Size: 96 MBs",
    icon: "document",
    color: "#6C5CE7",
  },
  {
    name: "Academic",
    filesCount: 102,
    sizeDisplay: "Size: 2.26 GB",
    icon: "school",
    color: "#8B5CF6",
  },
  {
    name: "Work",
    filesCount: 300,
    sizeDisplay: "Size: 1.57 GB",
    icon: "briefcase",
    color: "#3498DB",
  },
  {
    name: "Others",
    filesCount: 201,
    sizeDisplay: "Size: 1.02 GB",
    icon: "folder",
    color: "#E67E22",
  },
];

export const getFolders = query({
  args: {},
  handler: async (ctx) => {
    const folders = await ctx.db.query("folders").take(100);
    const notes = await ctx.db.query("notes").take(1000);
    return folders.map((f) => {
      const count = notes.filter(
        (n) => (n.folder || "Personal").trim().toLowerCase() === f.name.toLowerCase()
      ).length;
      return {
        ...f,
        filesCount: count,
      };
    });
  },
});

export const getStorage = query({
  args: {},
  handler: async (ctx) => {
    const storageDoc = await ctx.db.query("storage").first();
    if (!storageDoc) {
      return { usedGb: 61, totalGb: 128 };
    }
    return { usedGb: storageDoc.usedGb, totalGb: storageDoc.totalGb };
  },
});

export const updateStorage = mutation({
  args: {
    usedGb: v.number(),
    totalGb: v.number(),
  },
  handler: async (ctx, args) => {
    const storageDoc = await ctx.db.query("storage").first();
    if (storageDoc) {
      await ctx.db.patch(storageDoc._id, {
        usedGb: args.usedGb,
        totalGb: args.totalGb,
      });
    } else {
      await ctx.db.insert("storage", {
        usedGb: args.usedGb,
        totalGb: args.totalGb,
      });
    }
    return true;
  },
});

export const seedInitialData = mutation({
  args: {},
  handler: async (ctx) => {
    const existingFolders = await ctx.db.query("folders").take(1);
    if (existingFolders.length === 0) {
      for (const f of defaultFolders) {
        await ctx.db.insert("folders", f);
      }
    }

    const existingStorage = await ctx.db.query("storage").take(1);
    if (existingStorage.length === 0) {
      await ctx.db.insert("storage", {
        usedGb: 61,
        totalGb: 128,
      });
    }

    return true;
  },
});
