const mongoose=require("mongoose");
const initData=require("./data.js");
const data=require("../models/datamodel.js");

async function main(){
    await mongoose.connect('mongodb://127.0.0.1:27017/writeme');
}
main()
    .then(() => {
        console.log("connected to DB");
    })
    .catch((err) => {
        console.log(err);
    });

const initDB= async ()=>{
    await data.deleteMany({});
    await data.insertMany(initData.data);
    console.log("data is initialized");
}

initDB();