const mongoose = require("mongoose");
const crypto = require("crypto");
const { promisify } = require("util");
const { Schema } = mongoose;

const scrypt = promisify(crypto.scrypt);

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            minlength: 3,
            maxlength: 30,
            index: true,
        },
        email: { type: String, lowercase: true, trim: true },
        name: { type: String, required: true },
        passwordHash: { type: String, required: true },
        passwordSalt: { type: String, required: true },

        avatar: { type: String },

        college: { type: String, index: true },
        campus: { type: String, index: true },
        defaultPickup: { type: String },
        rolePreference: {
            type: String,
            enum: ["poster", "writer", "both"],
            default: "both",
        },

        rating: { type: Number, default: 0, min: 0, max: 5 },
        ratingCount: { type: Number, default: 0 },
        completedCount: { type: Number, default: 0 },
        cancelledCount: { type: Number, default: 0 },

        onboardedAt: { type: Date, default: null },
        bannedAt: { type: Date, default: null },
        isAdmin: { type: Boolean, default: false },
    },
    { timestamps: true }
);

userSchema.index({ campus: 1, rolePreference: 1 });

userSchema.statics.hashPassword = async function (password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const derived = await scrypt(password, salt, 64);
    return { passwordSalt: salt, passwordHash: derived.toString("hex") };
};

userSchema.methods.verifyPassword = async function (password) {
    const derived = await scrypt(password, this.passwordSalt, 64);
    const expected = Buffer.from(this.passwordHash, "hex");
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
};

module.exports = mongoose.model("User", userSchema);
