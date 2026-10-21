const express = require("express");
const { body, validationResult } = require("express-validator");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, (req, res) => {
    if (req.user.onboardedAt) return res.redirect("/");
    res.render("onboarding/index", { errors: null, values: {} });
});

const onboardingValidators = [
    body("college")
        .trim()
        .isLength({ min: 2, max: 120 })
        .withMessage("Please enter your college name"),
    body("campus").trim().isLength({ max: 120 }),
    body("defaultPickup")
        .trim()
        .isLength({ min: 1, max: 120 })
        .withMessage("Please choose a default pickup point"),
    body("rolePreference")
        .isIn(["poster", "writer", "both"])
        .withMessage("Pick a role"),
];

router.post("/", requireAuth, onboardingValidators, async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render("onboarding/index", {
                errors: errors.array(),
                values: req.body,
            });
        }

        req.user.college = req.body.college.trim();
        req.user.campus = (req.body.campus || req.body.college).trim();
        req.user.defaultPickup = req.body.defaultPickup.trim();
        req.user.rolePreference = req.body.rolePreference;
        req.user.onboardedAt = new Date();
        await req.user.save();

        res.redirect("/");
    } catch (err) {
        next(err);
    }
});

module.exports = router;
