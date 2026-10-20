const mongoose=require('mongoose');
const Schema=mongoose.Schema;

const dataSchema = new Schema({
    image : {
        type : String,
        default:"https://www.dreamstime.com/photos-images/random-tree-picture.html ",
        set : (v) => v=== "" ? "https://www.dreamstime.com/photos-images/random-tree-picture.html " : v,
        
    },
    subject: {
        type : String,
        required : true,
    },

    pages: {
        type : Number,
        required : true,
    },
    price: {
        type : Number,
        required : true,
    },
    deadline: {
        type : String,
        required : true,
    },
    location: {
        type : String,
        required : true,
    },
    //my status 
    status: {
    type: String,
    enum: ["open", "accepted", "submitted", "completed"],
    default: "open"
    },
    postedBy: { 
        type: String, 
        default: "User1" 
    },
    acceptedBy: { 
        type: String, 
        default: null 
    },
    //my status

    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

});
const data = mongoose.model("data", dataSchema);
module.exports = data;