const express= require("express");
const app=express();
const mongoose=require('mongoose');
const Data=require("./models/datamodel.js");
const path=require("path");
const methodOverride=require("method-override");
const ejsMate=require("ejs-mate");
const Message = require("./models/message");

//login page............
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user");

// Session Configuration
const sessionOptions = {
    secret: "mysupersecretcode",
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true
    }
};

app.use(session(sessionOptions));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Pass currentUser variable to all EJS views automatically
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    next();
});
//login page


app.use(methodOverride("_method"));
app.use(express.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname,"/public")))

app.set("view engine" ,"ejs");
app.set("views" ,path.join(__dirname,"views"));
app.engine("ejs" , ejsMate);

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

app.listen(3030, ()=>{
    console.log("server started successfully on port 3030" )
});
app.get("/home", async(req,res) =>{
    const allData= await Data.find({});
    res.render("home/show.ejs" , {allData});
});
//my status...........

// Route: Accept a Task
app.post("/listing/:id/accept", async (req, res) => {
  const { id } = req.params;
  const currentUserId = "User1";

  await Data.findByIdAndUpdate(id, {
    status: "accepted",
    acceptedBy: currentUserId
  });
  res.redirect("/");
});

// Route: Update Status (Submitted / Completed)
app.post("/listing/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  await Data.findByIdAndUpdate(id, { status });
  res.redirect("/mystatus");
});
//my status.........
//total ernings
// Route: Total Earnings......
app.get("/earnings", async (req, res) => {
    try {
        const currentUserId = "User1"; 
        
        // Find tasks that are accepted or submitted by the current user
        const acceptedTasks = await Data.find({ 
            acceptedBy: currentUserId, 
            status: { $in: ["accepted", "submitted", "Submitted"] } 
        });
        
        // Calculate total earnings by summing up the price field
        let totalEarnings = acceptedTasks.reduce((sum, task) => sum + Number(task.price || 0), 0);
        
        res.render("home/earnings.ejs", { acceptedTasks, totalEarnings });
    } catch (err) {
        console.log(err);
        res.redirect("/");
    }
});
//total ernings

//search........
app.get("/", async (req, res) => {
    try {
        let searchQuery = req.query.location || "";
        let query = {};

        if (searchQuery.trim() !== "") {
            // Split search input by commas and spaces into individual keywords
            const keywords = searchQuery
                .trim()
                .split(/[\s,]+/) // splits on spaces and commas
                .filter(word => word.length > 0);

            // Create regex conditions for each keyword
            const regexConditions = keywords.map(word => ({
                location: { $regex: word, $options: "i" }
            }));

            // Match documents containing ALL searched keywords
            query = { $and: regexConditions };
        }

        const allData = await Data.find(query);
        res.render("home/show", { allData, searchQuery });
    } catch (err) {
        console.log(err);
        res.redirect("/");
    }
});
//search
//login page........
// Render Signup Page
app.get("/signup", (req, res) => {
    res.render("users/signup");
});

// Process Signup
app.post("/signup", async (req, res) => {
    try {
        const { username, email, college, password } = req.body;
        const newUser = new User({ email, username, college });
        const registeredUser = await User.register(newUser, password);
        
        req.login(registeredUser, (err) => {
            if (err) return next(err);
            res.redirect("/");
        });
    } catch (e) {
        console.log(e);
        res.redirect("/signup");
    }
});

// Render Login Page
app.get("/login", (req, res) => {
    res.render("users/login");
});

// Process Login
app.post("/login", passport.authenticate("local", {
    failureRedirect: "/login",
}), (req, res) => {
    res.redirect("/");
});

// Logout Route
app.get("/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect("/");
    });
});
//login page
//personal msgs......
// Middleware to check if user is logged in
function isLoggedIn(req, res, next) {
    if (!req.isAuthenticated()) {
        return res.redirect("/login");
    }
    next();
}

// View Chat for a Task (Only logged-in users)
// View Chat for a Task (Only logged-in users)
app.get("/messages/:taskId", isLoggedIn, async (req, res) => {
    try {
        const { taskId } = req.params;
        const task = await Data.findById(taskId).populate("author");

        if (!task) {
            return res.redirect("/inbox");
        }

        // Fetch messages for this task that involve the currently logged-in user
        const messages = await Message.find({
            taskId: taskId,
            $or: [
                { sender: req.user._id },
                { receiver: req.user._id }
            ]
        }).populate("sender receiver");

        res.render("home/messages.ejs", { task, messages, currentUser: req.user });
    } catch (err) {
        console.log("FETCH MESSAGES ERROR:", err);
        res.redirect("/inbox");
    }
});

// User Inbox - View all chats the logged-in user participated in
app.get("/inbox", isLoggedIn, async (req, res) => {
    try {
        // 1. Fetch messages without any .populate() to avoid model crashes
        const messages = await Message.find({
            $or: [
                { sender: req.user._id },
                { receiver: req.user._id }
            ]
        }).sort({ createdAt: -1 });

        const taskMap = new Map();

        // 2. Look up each task manually by its ID string
        for (let msg of messages) {
            if (msg.taskId) {
                const taskIdStr = msg.taskId.toString();
                if (!taskMap.has(taskIdStr)) {
                    const foundTask = await Data.findById(taskIdStr);
                    if (foundTask) {
                        taskMap.set(taskIdStr, foundTask);
                    }
                }
            }
        }
        const tasks = Array.from(taskMap.values());
        res.render("home/inbox.ejs", { tasks, currentUser: req.user });
    } catch (err) {
        console.log("INBOX ERROR:", err);
        res.render("home/inbox.ejs", { tasks: [], currentUser: req.user });
    }
});
//personal messages
app.post("/messages/:taskId", isLoggedIn, async (req, res) => {
    try {
        // Directly pull taskId from req.params
        const { taskId } = req.params;
        console.log("SUCCESSFULLY CAPTURED TASK ID:", taskId);

        if (!taskId) {
            console.log("ERROR: Task ID is missing from URL parameters!");
            return res.redirect("/");
        }
        const task = await Data.findById(taskId);
        if (!task) {
            return res.redirect("/");
        }

        const recipient = task.author ? task.author : req.user._id;

        const newMessage = new Message({
            taskId: taskId, // 👈 Explicitly passed here
            sender: req.user._id,
            receiver: recipient,
            content: req.body.content || req.body.text,
            createdAt: new Date()
        });

        await newMessage.save();
        res.redirect(`/messages/${taskId}`);
    } catch (err) {
        console.log("SEND MESSAGE ERROR:", err);
        res.redirect("back");
    }
});
// My Status Dashboard - View tasks posted by the logged-in user
// My Status Dashboard - View tasks posted and accepted by the logged-in user
app.get("/mystatus", isLoggedIn, async (req, res) => {
    try {
        // Find tasks posted by this user (using author field)
        const myPostedTasks = await Data.find({ author: req.user._id });
        
        // Find tasks accepted by this user (assuming you store acceptedWorker or similar, 
        // or you can adjust the query field based on how your accepted tasks are linked)
        const myAcceptedTasks = await Data.find({ acceptedWorker: req.user._id });

        res.render("home/mystatus", { myPostedTasks, myAcceptedTasks });
    } catch (err) {
        console.log(err);
        res.redirect("/");
    }
});
//post new task........
// Render page/form to post a new task
app.get("/tasks/new", isLoggedIn, (req, res) => {
    res.render("home/new");
});
// Process form submission and save task with author ID
app.post("/tasks", isLoggedIn, async (req, res) => {
    try {
        const newTask = new Data(req.body.data);
        // Link task to the logged-in user
        newTask.author = req.user._id; 
        newTask.status = "open"; // Default status for new tasks
        await newTask.save();
        res.redirect("/home"); // Redirect directly to dashboard to see it!
    } catch (err) {
        console.log(err);
        res.redirect("/");
    }
});
app.get("/clean-db", async (req, res) => {
    // Delete messages that don't have a valid taskId attached
    await Message.deleteMany({ taskId: { $exists: false } });
    await Message.deleteMany({ taskId: null });
    res.send("Cleaned corrupted messages from DB!");

});

