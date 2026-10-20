//const mongoose = require("mongoose");

// const messageSchema = new mongoose.Schema({
//     sender: {
//         type: String, // Or mongoose.Schema.Types.ObjectId if using User model
//         required: true
//     },
//     receiver: {
//         type: String,
//         required: true
//     },
//     task: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Data" // Points to your task/datamodel
//     },
//     text: {
//         type: String,
//         required: true
//     },
//     createdAt: {
//         type: Date,
//         default: Date.now
//     }
// });

//module.exports = mongoose.model("Message", messageSchema);
const mongoose = require("mongoose");
const messageSchema = new mongoose.Schema({
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Data",
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    content: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Message", messageSchema);