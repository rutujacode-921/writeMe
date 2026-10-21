const mongoose = require("mongoose");
const { Schema } = mongoose;

const messageSchema = new Schema(
    {
        taskId: {
            type: Schema.Types.ObjectId,
            ref: "Task",
            required: true,
            index: true,
        },
        sender: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        receiver: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        type: {
            type: String,
            enum: [
                "text",
                "location_share",
                "proof_request",
                "proof_photo",
                "system",
            ],
            default: "text",
        },
        content: { type: String, required: true },
        payload: Schema.Types.Mixed,
        readAt: Date,
    },
    { timestamps: true }
);

messageSchema.index({ taskId: 1, createdAt: 1 });
messageSchema.index({ receiver: 1, readAt: 1 });

module.exports = mongoose.model("Message", messageSchema);
