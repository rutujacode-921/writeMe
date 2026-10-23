const express = require("express");
const { rateLimit } = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const User = require("../models/user");

const router = express.Router();

const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
});

/** --- Signup --- */

router.get("/signup", (req, res) => {
    if (req.user) return res.redirect("/");
    res.render("users/signup", { errors: null, values: {} });
});

const signupValidators = [
    body("username")
        .trim()
        .toLowerCase()
        .matches(/^[a-z0-9_]{3,30}$/)
        .withMessage(
            "Username must be 3-30 chars (letters, numbers, underscore)"
        ),
    body("name").trim().isLength({ min: 1, max: 60 }).withMessage("Please enter your name"),
    body("email").optional({ checkFalsy: true }).isEmail().withMessage("Enter a valid email"),
    body("password")
        .isLength({ min: 6, max: 200 })
        .withMessage("Password must be at least 6 characters"),
];

router.post("/signup", authLimiter, signupValidators, async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render("users/signup", {
                errors: errors.array(),
                values: req.body,
            });
        }

        const { username, name, email, password } = req.body;

        const existing = await User.findOne({ username });
        if (existing) {
            return res.status(400).render("users/signup", {
                errors: [{ msg: "That username is taken" }],
                values: req.body,
            });
        }

        const { passwordHash, passwordSalt } = await User.hashPassword(password);
        const user = await User.create({
            username,
            name: name.trim(),
            email: email ? email.trim().toLowerCase() : undefined,
            passwordHash,
            passwordSalt,
        });

        req.session.regenerate((err) => {
            if (err) return next(err);
            req.session.userId = user._id.toString();
            req.session.save((saveErr) => {
                if (saveErr) return next(saveErr);
                res.redirect("/onboarding");
            });
        });
    } catch (err) {
        next(err);
    }
});

/** --- Login --- */

router.get("/login", (req, res) => {
    if (req.user) return res.redirect("/");
    res.render("users/login", { error: null, values: {} });
});

router.post(
    "/login",
    authLimiter,
    body("username").trim().toLowerCase().isLength({ min: 1 }),
    body("password").isLength({ min: 1 }),
    async (req, res, next) => {
        try {
            const { username, password } = req.body;
            const user = await User.findOne({ username });
            const ok = user && (await user.verifyPassword(password));
            if (!ok) {
                return res.status(401).render("users/login", {
                    error: "Invalid username or password",
                    values: { username },
                });
            }
            if (user.bannedAt) return res.redirect("/banned");

            req.session.regenerate((err) => {
                if (err) return next(err);
                req.session.userId = user._id.toString();
                req.session.save((saveErr) => {
                    if (saveErr) return next(saveErr);
                    if (!user.onboardedAt) return res.redirect("/onboarding");
                    res.redirect("/");
                });
            });
        } catch (err) {
            next(err);
        }
    }
);

/** --- Logout --- */

router.post("/logout", (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("writeme.sid");
        res.redirect("/");
    });
});

module.exports = router;
