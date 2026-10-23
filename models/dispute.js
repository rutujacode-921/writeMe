const mongoose = require("mongoose");
const { Schema } = mongoose;

const disputeSchema = new Schema(
    {
        taskId: {
            type: Schema.Types.ObjectId,
            ref: "Task",
            required: true,
            unique: true,
            index: true,
        },
        raisedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        against: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        reason: {
            type: String,
            enum: [
                "not_delivered",
                "not_paid",
                "bad_quality",
                "wrong_subject",
                "other",
            ],
            required: true,
        },
        details: { type: String, maxlength: 1000 },
        evidence: [{ url: String }],
        status: {
            type: String,
            enum: [
                "open",
                "resolved_for_raiser",
                "resolved_against_raiser",
                "closed",
            ],
            default: "open",
        },
        resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
        resolvedAt: Date,
        resolution: String,
        timeline: [
            {
                actor: { type: Schema.Types.ObjectId, ref: "User" },
                action: String,
                at: { type: Date, default: Date.now },
            },
        ],
    },
    { timestamps: true }
);

module.exports = mongoose.model("Dispute", disputeSchema);
