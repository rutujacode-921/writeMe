const express = require("express");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const Task = require("../models/task");
const Message = require("../models/message");
const { requireAuth, requireOnboarded } = require("../middleware/auth");

const router = express.Router();

const msgLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    keyGenerator: (req) =>
        (req.user && req.user._id.toString()) || ipKeyGenerator(req.ip),
});

/** Inbox — list all task chats the user is a party to. */
router.get("/chats", requireAuth, requireOnboarded, async (req, res, next) => {
    try {
        const messages = await Message.find({
            $or: [{ sender: req.user._id }, { receiver: req.user._id }],
        })
            .sort({ createdAt: -1 })
            .limit(200);

        const taskMap = new Map();
        for (const msg of messages) {
            if (!msg.taskId) continue;
            const key = msg.taskId.toString();
            if (!taskMap.has(key)) {
                const task = await Task.findById(msg.taskId).populate(
                    "author acceptedBy",
                    "name avatar"
                );
                if (task) {
                    taskMap.set(key, {
                        task,
                        lastMessage: msg,
                    });
                }
            }
        }

        res.render("home/chats", {
            threads: Array.from(taskMap.values()),
        });
    } catch (err) {
        next(err);
    }
});

/** Chat for a single task */
router.get(
    "/tasks/:id/chat",
    requireAuth,
    requireOnboarded,
    async (req, res, next) => {
        try {
            const task = await Task.findById(req.params.id)
                .populate("author", "name avatar")
                .populate("acceptedBy", "name avatar");
            if (!task) return next();

            const isParty =
                task.author._id.equals(req.user._id) ||
                (task.acceptedBy && task.acceptedBy._id.equals(req.user._id));
            if (!isParty) {
                return res.status(403).render("errors/404");
            }

            const messages = await Message.find({
                taskId: task._id,
            }).sort({ createdAt: 1 });

            // Mark unread as read.
            await Message.updateMany(
                { taskId: task._id, receiver: req.user._id, readAt: null },
                { $set: { readAt: new Date() } }
            );

            res.render("home/chat", { task, messages });
        } catch (err) {
            next(err);
        }
    }
);

/** Send a message */
router.post(
    "/tasks/:id/messages",
    requireAuth,
    requireOnboarded,
    msgLimiter,
    body("content").trim().isLength({ min: 1, max: 2000 }),
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.redirect(`/tasks/${req.params.id}/chat`);
            }

            const task = await Task.findById(req.params.id);
            if (!task) return next();

            const isPoster = task.author.equals(req.user._id);
            const isWriter =
                task.acceptedBy && task.acceptedBy.equals(req.user._id);
            if (!isPoster && !isWriter) {
                const err = new Error("Not a party to this task");
                err.status = 403;
                throw err;
            }

            const receiver = isPoster ? task.acceptedBy : task.author;
            if (!receiver) {
                const err = new Error("Task has no counterparty yet");
                err.status = 400;
                throw err;
            }

            await Message.create({
                taskId: task._id,
                sender: req.user._id,
                receiver,
                type: "text",
                content: req.body.content.trim(),
            });

            res.redirect(`/tasks/${task._id}/chat`);
        } catch (err) {
            next(err);
        }
    }
);

module.exports = router;
