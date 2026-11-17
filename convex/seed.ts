import { mutation } from "./_generated/server";

export const seedAll = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Seed Folders
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

    const existingFolders = await ctx.db.query("folders").take(1);
    if (existingFolders.length === 0) {
      for (const f of defaultFolders) {
        await ctx.db.insert("folders", f);
      }
    }

    // 2. Seed Storage
    const existingStorage = await ctx.db.query("storage").take(1);
    if (existingStorage.length === 0) {
      await ctx.db.insert("storage", {
        usedGb: 61,
        totalGb: 128,
      });
    }

    // 3. Seed Users
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

    for (const u of defaultUsers) {
      const emailNorm = u.email.trim().toLowerCase();
      const existing = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", emailNorm))
        .first();

      if (!existing) {
        await ctx.db.insert("users", {
          username: u.username,
          email: emailNorm,
          password: u.password,
          createdAt: u.createdAt,
        });
      }
    }

    // 4. Seed Notes
    const defaultNotes = [
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

    const existingNotes = await ctx.db.query("notes").take(1);
    if (existingNotes.length === 0) {
      for (const note of defaultNotes) {
        await ctx.db.insert("notes", note);
      }
    }

    return {
      status: "success",
      message: "All backend data seeded successfully!",
    };
  },
});

