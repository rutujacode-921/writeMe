require("dotenv").config();

const required = ["MONGO_URL", "SESSION_SECRET"];
const missing = required.filter((k) => !process.env[k]);

if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(", ")}`);
    console.error(`Copy .env.example to .env and fill them in.`);
    process.exit(1);
}

const isProd = process.env.NODE_ENV === "production";

module.exports = {
    nodeEnv: process.env.NODE_ENV || "development",
    isProd,
    port: Number(process.env.PORT || 3030),
    mongoUrl: process.env.MONGO_URL,
    sessionSecret: process.env.SESSION_SECRET,
};
