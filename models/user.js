// const mongoose = require("mongoose");
// const passportLocalMongoose = require("passport-local-mongoose");

// const userSchema = new mongoose.Schema({
//     email: {
//         type: String,
//         required: true,
//         unique: true
//     },
//     college: {
//         type: String
//     }
// });

// // Automatically adds username, hash, and salt fields to schema
// userSchema.plugin(passportLocalMongoose);

// module.exports = mongoose.model("User", userSchema);
const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    college: {
        type: String
    }
});

// Ensures we extract the plugin function whether it's exported directly or as .default
const passportPlugin = typeof passportLocalMongoose === "function" 
    ? passportLocalMongoose 
    : passportLocalMongoose.default;

userSchema.plugin(passportPlugin);

module.exports = mongoose.model("User", userSchema);