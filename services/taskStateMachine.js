/**
 * Task state machine.
 * Decides whether a given actor (poster|writer|system) can transition
 * a task from its current state to a target state, and performs the
 * transition with timestamp bookkeeping.
 */

const Transaction = require("../models/transaction");
const User = require("../models/user");
const Message = require("../models/message");

const TRANSITIONS = {
    DRAFT: { poster: ["OPEN", "CANCELLED"] },
    OPEN: { poster: ["CANCELLED"], writer: ["IN_PROGRESS"] },
    IN_PROGRESS: {
        poster: ["CANCELLED"],
        writer: ["DELIVERED", "CANCELLED"],
    },
    DELIVERED: {
        poster: ["COMPLETED", "DISPUTED"],
        writer: ["DISPUTED"],
        system: ["COMPLETED"],
    },
    COMPLETED: { poster: ["DISPUTED"], writer: ["DISPUTED"] },
    DISPUTED: { system: ["COMPLETED", "CANCELLED"] },
    CANCELLED: {},
};

function roleFor(task, user) {
    if (!user || !task) return null;
    const authorId = task.author && (task.author._id || task.author);
    const acceptedId = task.acceptedBy && (task.acceptedBy._id || task.acceptedBy);
    if (authorId && authorId.equals(user._id)) return "poster";
    if (acceptedId && acceptedId.equals(user._id)) return "writer";
    return null;
}

function can(role, from, to) {
    const allowed = (TRANSITIONS[from] && TRANSITIONS[from][role]) || [];
    return allowed.includes(to);
}

/**
 * Transition a task. Throws if invalid.
 * @param {Document} task - Mongoose task doc
 * @param {Document|null} actor - User doc, or null for system
 * @param {string} targetState
 * @param {object} opts - { reason, acceptedBy, proofUrl }
 */
async function transition(task, actor, targetState, opts = {}) {
    const role = actor ? roleFor(task, actor) : "system";

    // Special case: OPEN → IN_PROGRESS is "accept" — writer isn't bound to the task yet.
    if (task.status === "OPEN" && targetState === "IN_PROGRESS") {
        if (!actor) throw httpErr(403, "Must be signed in to accept");
        if (task.author.equals(actor._id))
            throw httpErr(403, "You can't accept your own task");
    } else if (!role) {
        throw httpErr(403, "You can't change this task");
    }

    const effectiveRole =
        task.status === "OPEN" && targetState === "IN_PROGRESS"
            ? "writer"
            : role;

    if (!can(effectiveRole, task.status, targetState)) {
        throw httpErr(
            400,
            `Can't move task from ${task.status} to ${targetState}`
        );
    }

    const now = new Date();
    const previousStatus = task.status;
    task.status = targetState;

    switch (targetState) {
        case "IN_PROGRESS":
            if (!task.acceptedBy) {
                task.acceptedBy = actor._id;
                task.acceptedAt = now;
            }
            task.startedAt = now;
            break;
        case "DELIVERED":
            if (!task.deliveryProof || task.deliveryProof.length === 0) {
                if (!opts.proofUrl) {
                    throw httpErr(
                        400,
                        "Upload at least one delivery proof photo first"
                    );
                }
                task.deliveryProof.push({ url: opts.proofUrl, uploadedAt: now });
            }
            task.deliveredAt = now;
            break;
        case "COMPLETED":
            task.completedAt = now;
            break;
        case "CANCELLED":
            task.cancelledAt = now;
            task.cancelReason = opts.reason || "";
            break;
        case "DISPUTED":
            task.disputedAt = now;
            break;
    }

    await task.save();

    // Side effects.
    if (targetState === "COMPLETED") {
        await Transaction.updateOne(
            { taskId: task._id },
            {
                $setOnInsert: {
                    taskId: task._id,
                    poster: task.author,
                    writer: task.acceptedBy,
                    amount: task.price,
                    method: "cash",
                    status: "cash_recorded",
                    recordedAt: now,
                },
            },
            { upsert: true }
        );
        if (task.acceptedBy) {
            await User.updateOne(
                { _id: task.acceptedBy },
                { $inc: { completedCount: 1 } }
            );
        }
    }

    if (targetState === "CANCELLED" && task.acceptedBy) {
        await User.updateOne(
            { _id: task.acceptedBy },
            { $inc: { cancelledCount: 1 } }
        );
    }

    // System chat message so both parties see what happened.
    if (task.acceptedBy && actor) {
        const other = task.author.equals(actor._id)
            ? task.acceptedBy
            : task.author;
        await Message.create({
            taskId: task._id,
            sender: actor._id,
            receiver: other,
            type: "system",
            content: `${actor.name || "Someone"} changed task to ${targetState}`,
        });
    }

    return { previousStatus, task };
}

function httpErr(status, message) {
    const e = new Error(message);
    e.status = status;
    e.publicMessage = message;
    return e;
}

module.exports = { can, transition, roleFor, TRANSITIONS };
