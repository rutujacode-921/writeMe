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

const passportPlugin = typeof passportLocalMongoose === "function" 
    ? passportLocalMongoose 
    : passportLocalMongoose.default;

userSchema.plugin(passportPlugin);

module.exports = mongoose.model("User", userSchema);