const User = require("../models/user");

async function attachUser(req, res, next) {
    res.locals.currentUser = null;
    if (!req.session || !req.session.userId) return next();
    try {
        const user = await User.findById(req.session.userId);
        if (user) {
            req.user = user;
            res.locals.currentUser = user;
        } else {
            req.session.userId = null;
        }
    } catch (err) {
        console.error("[auth] attachUser failed:", err);
    }
    next();
}

function requireAuth(req, res, next) {
    if (!req.user) {
        return res.redirect("/?signin=1");
    }
    if (req.user.bannedAt) {
        return res.status(403).render("errors/banned");
    }
    next();
}

function requireOnboarded(req, res, next) {
    if (!req.user) return res.redirect("/?signin=1");
    if (!req.user.onboardedAt) return res.redirect("/onboarding");
    next();
}

function requireAdmin(req, res, next) {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).render("errors/404");
    }
    next();
}

module.exports = { attachUser, requireAuth, requireOnboarded, requireAdmin };
