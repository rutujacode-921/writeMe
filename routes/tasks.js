const express = require("express");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const Task = require("../models/task");
const Dispute = require("../models/dispute");
const { requireAuth, requireOnboarded } = require("../middleware/auth");
const stateMachine = require("../services/taskStateMachine");

const router = express.Router();

const createLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
});

/** Feed — all open tasks, visible to everyone, no location restriction. */
router.get("/", async (req, res, next) => {
    try {
        const search = (req.query.q || "").trim();

        if (!req.user) {
            return res.render("home/landing");
        }

        if (!req.user.onboardedAt) return res.redirect("/onboarding");

        const query = { status: "OPEN" };

        if (search) {
            const kw = search.split(/[\s,]+/).filter(Boolean);
            query.$and = kw.map((w) => ({
                $or: [
                    { subject: { $regex: w, $options: "i" } },
                    { pickupPoint: { $regex: w, $options: "i" } },
                    { campus: { $regex: w, $options: "i" } },
                ],
            }));
        }

        const tasks = await Task.find(query)
            .sort({ createdAt: -1 })
            .limit(100)
            .populate("author", "name avatar rating completedCount");

        res.render("home/feed", { tasks, search });
    } catch (err) {
        next(err);
    }
});

/** Create form */
router.get("/tasks/new", requireAuth, requireOnboarded, (req, res) => {
    res.render("home/new", { errors: null, values: {} });
});

const taskValidators = [
    body("data.subject").trim().isLength({ min: 2, max: 120 }),
    body("data.pagesMin").toInt().isInt({ min: 1, max: 2000 }),
    body("data.pagesMax").toInt().isInt({ min: 1, max: 2000 }),
    body("data.price").toInt().isInt({ min: 1, max: 100000 }),
    body("data.priceType").isIn(["fixed", "negotiable"]),
    body("data.deadline").isISO8601().toDate(),
    body("data.pickupPoint").trim().isLength({ min: 1, max: 120 }),
];

/** Create a task */
router.post(
    "/tasks",
    requireAuth,
    requireOnboarded,
    createLimiter,
    taskValidators,
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).render("home/new", {
                    errors: errors.array(),
                    values: req.body.data || {},
                });
            }

            const d = req.body.data;
            if (d.pagesMin > d.pagesMax) {
                return res.status(400).render("home/new", {
                    errors: [{ msg: "pagesMin must be ≤ pagesMax" }],
                    values: d,
                });
            }
            if (new Date(d.deadline) <= new Date()) {
                return res.status(400).render("home/new", {
                    errors: [{ msg: "Deadline must be in the future" }],
                    values: d,
                });
            }

            const task = await Task.create({
                subject: d.subject,
                pagesMin: d.pagesMin,
                pagesMax: d.pagesMax,
                price: d.price,
                priceType: d.priceType,
                deadline: d.deadline,
                pickupPoint: d.pickupPoint,
                campus: req.user.campus || "Unknown",
                author: req.user._id,
                status: "OPEN",
            });

            res.redirect(`/tasks/${task._id}`);
        } catch (err) {
            next(err);
        }
    }
);

/** Task detail */
router.get("/tasks/:id", async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate("author", "name avatar rating completedCount college")
            .populate("acceptedBy", "name avatar rating completedCount");
        if (!task) return next();
        const role = req.user ? stateMachine.roleFor(task, req.user) : null;
        res.render("home/detail", { task, role });
    } catch (err) {
        next(err);
    }
});

/** My tasks (posted + accepted) */
router.get("/mytasks", requireAuth, requireOnboarded, async (req, res, next) => {
    try {
        const [posted, accepted] = await Promise.all([
            Task.find({ author: req.user._id }).sort({ createdAt: -1 }).limit(50),
            Task.find({ acceptedBy: req.user._id })
                .sort({ createdAt: -1 })
                .limit(50)
                .populate("author", "name avatar"),
        ]);
        res.render("home/mystatus", { posted, accepted });
    } catch (err) {
        next(err);
    }
});

/** Writer earnings dashboard */
router.get("/earnings", requireAuth, requireOnboarded, async (req, res, next) => {
    try {
        const completed = await Task.find({
            acceptedBy: req.user._id,
            status: "COMPLETED",
        })
            .sort({ completedAt: -1 })
            .limit(100);

        const pending = await Task.find({
            acceptedBy: req.user._id,
            status: { $in: ["DELIVERED", "IN_PROGRESS", "ASSIGNED"] },
        })
            .sort({ createdAt: -1 })
            .limit(50);

        const totalEarned = completed.reduce((s, t) => s + (t.price || 0), 0);
        const pendingTotal = pending
            .filter((t) => t.status === "DELIVERED")
            .reduce((s, t) => s + (t.price || 0), 0);

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEarned = completed
            .filter((t) => t.completedAt && t.completedAt >= monthStart)
            .reduce((s, t) => s + (t.price || 0), 0);
        const monthCount = completed.filter(
            (t) => t.completedAt && t.completedAt >= monthStart
        ).length;

        res.render("home/earnings", {
            completed,
            pending,
            totalEarned,
            pendingTotal,
            monthEarned,
            monthCount,
        });
    } catch (err) {
        next(err);
    }
});

/** --- state transitions --- */

function transitionRoute(target, extractOpts = () => ({})) {
    return async (req, res, next) => {
        try {
            const task = await Task.findById(req.params.id);
            if (!task) return next();
            await stateMachine.transition(task, req.user, target, extractOpts(req));
            res.redirect(`/tasks/${task._id}`);
        } catch (err) {
            next(err);
        }
    };
}

router.post("/tasks/:id/accept", requireAuth, requireOnboarded, transitionRoute("IN_PROGRESS"));
router.post("/tasks/:id/deliver", requireAuth, requireOnboarded, transitionRoute("DELIVERED"));
router.post("/tasks/:id/confirm", requireAuth, requireOnboarded, transitionRoute("COMPLETED"));
router.post(
    "/tasks/:id/cancel",
    requireAuth,
    requireOnboarded,
    transitionRoute("CANCELLED", (req) => ({ reason: req.body.reason || "" }))
);

/** Dispute: creates Dispute doc + moves task to DISPUTED. */
router.post(
    "/tasks/:id/dispute",
    requireAuth,
    requireOnboarded,
    async (req, res, next) => {
        try {
            const task = await Task.findById(req.params.id);
            if (!task) return next();

            const role = stateMachine.roleFor(task, req.user);
            if (!role) {
                const err = new Error("You can't dispute this task");
                err.status = 403;
                throw err;
            }

            const against = role === "poster" ? task.acceptedBy : task.author;
            if (!against) {
                const err = new Error("No counterparty on this task yet");
                err.status = 400;
                throw err;
            }

            await Dispute.findOneAndUpdate(
                { taskId: task._id },
                {
                    $setOnInsert: {
                        taskId: task._id,
                        raisedBy: req.user._id,
                        against,
                        reason: req.body.reason || "other",
                        details: req.body.details || "",
                    },
                    $push: {
                        timeline: {
                            actor: req.user._id,
                            action: `raised:${req.body.reason || "other"}`,
                        },
                    },
                },
                { upsert: true, new: true }
            );

            await stateMachine.transition(task, req.user, "DISPUTED");
            res.redirect(`/tasks/${task._id}`);
        } catch (err) {
            next(err);
        }
    }
);

module.exports = router;
