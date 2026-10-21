/**
 * One-time migration from legacy schema to v2.
 * - Drops legacy users (they must re-sign-in via Google).
 * - Rewrites legacy tasks (collection name "datas"): maps old fields to new, uppercases status.
 * - Drops orphan messages.
 *
 * Run: npm run migrate
 */

const mongoose = require("mongoose");
const env = require("../config/env");

const STATUS_MAP = {
    open: "OPEN",
    accepted: "ASSIGNED",
    submitted: "DELIVERED",
    Submitted: "DELIVERED",
    completed: "COMPLETED",
    Completed: "COMPLETED",
};

async function run() {
    await mongoose.connect(env.mongoUrl);
    const db = mongoose.connection.db;
    console.log("[migrate] connected");

    // Collections
    const legacyTasks = db.collection("datas");
    const newTasks = db.collection("tasks");
    const users = db.collection("users");
    const messages = db.collection("messages");

    // 1. Drop legacy users
    const userResult = await users.deleteMany({});
    console.log(`[migrate] deleted ${userResult.deletedCount} legacy users`);

    // 2. Migrate tasks: read legacy "datas", write to "tasks"
    const legacyDocs = await legacyTasks.find({}).toArray();
    console.log(`[migrate] found ${legacyDocs.length} legacy tasks`);

    let migrated = 0;
    for (const doc of legacyDocs) {
        const pages = Number(doc.pages) || 1;
        const parsedDeadline = doc.deadline ? new Date(doc.deadline) : null;
        const deadline =
            parsedDeadline && !isNaN(parsedDeadline.getTime())
                ? parsedDeadline
                : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const status = STATUS_MAP[doc.status] || "OPEN";

        // Can't migrate without an author (we deleted users). Skip.
        if (!doc.author) {
            continue;
        }

        const newDoc = {
            _id: doc._id,
            subject: doc.subject || "Untitled",
            pagesMin: pages,
            pagesMax: pages,
            price: Number(doc.price) || 1,
            priceType: "fixed",
            deadline,
            pickupPoint: doc.location || "Unknown",
            campus: "Unknown",
            status,
            author: doc.author,
            acceptedBy: null,
            deliveryProof: [],
            createdAt: doc.createdAt || new Date(),
            updatedAt: new Date(),
        };

        await newTasks.updateOne(
            { _id: doc._id },
            { $set: newDoc },
            { upsert: true }
        );
        migrated++;
    }
    console.log(`[migrate] migrated ${migrated} tasks into "tasks" collection`);

    // 3. Drop the legacy "datas" collection
    try {
        await legacyTasks.drop();
        console.log(`[migrate] dropped legacy "datas" collection`);
    } catch (e) {
        if (e.codeName !== "NamespaceNotFound") throw e;
    }

    // 4. Drop orphan messages (any taskId that doesn't exist in tasks)
    const msgResult = await messages.deleteMany({
        $or: [{ taskId: null }, { taskId: { $exists: false } }],
    });
    console.log(
        `[migrate] deleted ${msgResult.deletedCount} orphan messages`
    );

    await mongoose.disconnect();
    console.log("[migrate] done");
}

run().catch((err) => {
    console.error("[migrate] FAILED:", err);
    process.exit(1);
});
