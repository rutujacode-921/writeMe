const mongoose = require("mongoose");
const { Schema } = mongoose;

const TASK_STATES = [
    "DRAFT",
    "OPEN",
    "IN_PROGRESS",
    "DELIVERED",
    "COMPLETED",
    "DISPUTED",
    "CANCELLED",
];

const taskSchema = new Schema(
    {
        subject: { type: String, required: true, trim: true },
        pagesMin: { type: Number, required: true, min: 1 },
        pagesMax: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 1 },
        priceType: {
            type: String,
            enum: ["fixed", "negotiable"],
            default: "fixed",
        },
        deadline: { type: Date, required: true },
        pickupPoint: { type: String, required: true },
        campus: { type: String, required: true, index: true },
        referenceImage: { type: String },

        status: {
            type: String,
            enum: TASK_STATES,
            default: "OPEN",
            index: true,
        },

        author: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        acceptedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true,
        },

        acceptedAt: Date,
        startedAt: Date,
        deliveredAt: Date,
        completedAt: Date,
        cancelledAt: Date,
        disputedAt: Date,

        deliveryProof: [
            {
                url: String,
                uploadedAt: { type: Date, default: Date.now },
            },
        ],
        cancelReason: String,
    },
    { timestamps: true }
);

taskSchema.index({ campus: 1, status: 1, createdAt: -1 });
taskSchema.index({ acceptedBy: 1, status: 1 });
taskSchema.index({ author: 1, status: 1 });

const Task = mongoose.model("Task", taskSchema);
Task.STATES = TASK_STATES;

module.exports = Task;
