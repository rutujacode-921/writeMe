const env = require("./config/env");
const express = require("express");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const cookieParser = require("cookie-parser");
const csurf = require("csurf");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");

const db = require("./config/db");
const { attachUser } = require("./middleware/auth");
const { notFound, serverError } = require("./middleware/error");

const authRoutes = require("./routes/auth");
const onboardingRoutes = require("./routes/onboarding");
const taskRoutes = require("./routes/tasks");
const messageRoutes = require("./routes/messages");

const app = express();

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);

// Core middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

// Session
app.use(
    session({
        name: "writeme.sid",
        secret: env.sessionSecret,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({ mongoUrl: env.mongoUrl }),
        cookie: {
            httpOnly: true,
            secure: env.isProd,
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        },
    })
);

// Hydrate user from session.
app.use(attachUser);

// Expose common locals.
app.use((req, res, next) => {
    res.locals.currentPath = req.path;
    next();
});

// CSRF for all state-changing form POSTs.
app.use(csurf({ cookie: false }));
app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken ? req.csrfToken() : "";
    next();
});

// Routes
app.use("/auth", authRoutes);
app.use("/onboarding", onboardingRoutes);
app.use(taskRoutes);
app.use(messageRoutes);

// Error handling
app.use(notFound);
app.use(serverError);

// Boot
async function start() {
    await db.connect();
    app.listen(env.port, () => {
        console.log(`[writeMe] listening on http://localhost:${env.port}`);
    });
}

start().catch((err) => {
    console.error("[writeMe] failed to start:", err);
    process.exit(1);
});
