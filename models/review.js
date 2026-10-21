const mongoose = require("mongoose");
const { Schema } = mongoose;

const reviewSchema = new Schema(
    {
        taskId: {
            type: Schema.Types.ObjectId,
            ref: "Task",
            required: true,
            index: true,
        },
        reviewer: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        reviewee: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        stars: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, maxlength: 500 },
        role: {
            type: String,
            enum: ["poster", "writer"],
            required: true,
        },
    },
    { timestamps: true }
);

reviewSchema.index({ taskId: 1, reviewer: 1 }, { unique: true });

module.exports = mongoose.model("Review", reviewSchema);
