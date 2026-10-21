const mongoose = require("mongoose");
const { Schema } = mongoose;

const transactionSchema = new Schema(
    {
        taskId: {
            type: Schema.Types.ObjectId,
            ref: "Task",
            required: true,
            unique: true,
            index: true,
        },
        poster: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        writer: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        amount: { type: Number, required: true },
        method: {
            type: String,
            enum: ["cash", "upi", "wallet"],
            default: "cash",
        },
        status: {
            type: String,
            enum: ["pending", "cash_recorded", "paid", "refunded", "disputed"],
            default: "pending",
            index: true,
        },
        recordedAt: Date,
        notes: String,
    },
    { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
