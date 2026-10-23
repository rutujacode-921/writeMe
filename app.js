const env = require("./config/env");
const express = require("express");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const cookieParser = require("cookie-parser");
const csurf = require("csurf");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");

const db = require("./config/db");
const { attachUser } = require("./middleware/auth");
const { notFound, serverError } = require("./middleware/error");

const authRoutes = require("./routes/auth");
const onboardingRoutes = require("./routes/onboarding");
const taskRoutes = require("./routes/tasks");
const messageRoutes = require("./routes/messages");

const app = express();

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);

// Core middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

// Session
app.use(
    session({
        name: "writeme.sid",
        secret: env.sessionSecret,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({ mongoUrl: env.mongoUrl }),
        cookie: {
            httpOnly: true,
            secure: env.isProd,
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        },
    })
);

<<<<<<< HEAD
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
=======
// Hydrate user from session.
app.use(attachUser);

// Expose common locals.
app.use((req, res, next) => {
    res.locals.currentPath = req.path;
>>>>>>> ca845871046c80c2f13a4e9f02ff432cf0d0c46a
    next();
});

// CSRF for all state-changing form POSTs.
app.use(csurf({ cookie: false }));
app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken ? req.csrfToken() : "";
    next();
});

// Routes
app.use("/auth", authRoutes);
app.use("/onboarding", onboardingRoutes);
app.use(taskRoutes);
app.use(messageRoutes);

// Error handling
app.use(notFound);
app.use(serverError);

// Boot
async function start() {
    await db.connect();
    app.listen(env.port, () => {
        console.log(`[writeMe] listening on http://localhost:${env.port}`);
    });
}

start().catch((err) => {
    console.error("[writeMe] failed to start:", err);
    process.exit(1);
});
<<<<<<< HEAD

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

=======
>>>>>>> ca845871046c80c2f13a4e9f02ff432cf0d0c46a
