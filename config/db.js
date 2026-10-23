const mongoose = require("mongoose");
const env = require("./env");

async function connect() {
    await mongoose.connect(env.mongoUrl);
    console.log(`[db] connected to ${env.mongoUrl.replace(/\/\/.*@/, "//***@")}`);
}

module.exports = { connect };
