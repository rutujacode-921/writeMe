# writeMe

A hyperlocal marketplace where college students post handwritten assignments
(record books, journals, etc.) and other students accept them, write them,
and hand them over in person on campus for cash in ₹.

**Core loop**: Post → Accept → Chat → Deliver → Confirm → Earnings.

---

## Tech stack

- **Node.js** + **Express 5** — server
- **EJS** + **ejs-mate** — views
- **MongoDB** + **Mongoose** — database
- **express-session** + **connect-mongo** — persistent sessions
- **csurf**, **express-validator**, **express-rate-limit** — security
- Plain CSS with design tokens (no build step)

Auth is a simple **username + password** flow. Passwords are hashed with
Node's built-in `crypto.scrypt`.

---

## Prerequisites

Install these once on your machine:

1. **Node.js 18+** — https://nodejs.org (Windows: pick the `.msi` installer)
2. **MongoDB** — any of:
   - **Easiest on Windows**: install **MongoDB Community Server**
     https://www.mongodb.com/try/download/community
     During install check *"Install as a service"* — it'll auto-start Mongo.
   - **OR** install **Docker Desktop** and run:
     ```
     docker run -d --name writeme-mongo -p 27017:27017 mongo:7
     ```
3. **Git** — https://git-scm.com/downloads

---

## Setup

```bash
# 1. Clone (or pull latest)
git clone https://github.com/rutujacode-921/writeMe.git
cd writeMe

# 2. Install dependencies
npm install

# 3. Create your .env from the template
# macOS/Linux:
cp .env.example .env
# Windows (PowerShell):
copy .env.example .env
```

Open `.env` and set:

```
NODE_ENV=development
PORT=3030
MONGO_URL=mongodb://127.0.0.1:27017/writeme
SESSION_SECRET=any-long-random-string-at-least-32-chars
```

`SESSION_SECRET` can be anything random in development. For a quick one:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Run it

Make sure MongoDB is running (service or Docker container), then:

```bash
npm start
# or for auto-reload on file changes:
npm run dev
```

Open **http://localhost:3030** in your browser.

### Available scripts

| Command | What it does |
|---|---|
| `npm start` | Run the server |
| `npm run dev` | Run with auto-reload (`node --watch`) |
| `npm run migrate` | One-time migration from the legacy schema |

---

## First-time usage

1. Open http://localhost:3030 → click **Sign up**
2. Fill name, username, (optional email), password
3. On the onboarding screen enter your **college**, a **default pickup point**
   (e.g. "Main Library"), and whether you want to post, write, or both
4. You land on the feed → click **"+ Post"** to create your first task
5. Log out, create a second account, see the first user's task in the feed,
   and run through the full accept → deliver → confirm loop

---

## Project structure

```
writeMe/
├── app.js                  server boot, middleware, routes
├── config/
│   ├── env.js              loads + validates .env
│   └── db.js               mongoose.connect
├── middleware/
│   ├── auth.js             attachUser, requireAuth, requireOnboarded
│   └── error.js            404/500/csrf handlers
├── models/
│   ├── user.js             username+scrypt password, onboarding fields
│   ├── task.js             state machine fields, indexes
│   ├── message.js
│   ├── transaction.js
│   ├── review.js
│   └── dispute.js
├── routes/
│   ├── auth.js             /auth/signup, /auth/login, /auth/logout
│   ├── onboarding.js
│   ├── tasks.js            feed, create, detail, accept/deliver/confirm/...
│   └── messages.js         chat, inbox
├── services/
│   └── taskStateMachine.js single source of truth for allowed transitions
├── views/
│   ├── layouts/boilerplate.ejs
│   ├── includes/           navbar, bottomnav, components
│   ├── home/               feed, new, detail, chat, chats, earnings, mystatus, landing
│   ├── users/              signup, login
│   ├── onboarding/
│   └── errors/             404, 500, csrf, banned
├── public/
│   └── css/{tokens,app}.css
└── init/
    └── migrate.js          one-time schema migration
```

---

## Task lifecycle

```
OPEN  ──accept──▶  IN_PROGRESS  ──deliver──▶  DELIVERED  ──confirm──▶  COMPLETED
  │                     │                          │
  └── cancel ──┐        └── cancel ──┐             └── dispute ──▶ DISPUTED
               ▼                     ▼
           CANCELLED             CANCELLED
```

- **OPEN** tasks are visible to everyone, no location restriction. Anyone (except the poster) can accept.
- Accepting goes **straight to IN_PROGRESS** — one click.
- Only the two parties on a task can chat about it.
- The poster confirms delivery to mark the task **COMPLETED**; the writer sees it on **Earnings**.

---

## Troubleshooting

**Server won't boot — "Missing required env vars"**
→ You forgot to create `.env`. Run `copy .env.example .env` (or `cp` on Mac/Linux)
  and fill in the values.

**"MongoServerError: connect ECONNREFUSED"**
→ MongoDB isn't running. If you installed it as a Windows service, open
  Services (`services.msc`) and start **MongoDB Server**. If you're using
  Docker, run `docker start writeme-mongo`.

**"E11000 duplicate key error"**
→ You have stale indexes in Mongo from a different schema. The quick fix is
  to drop the users collection and re-sign up:
  ```
  docker exec writeme-mongo mongosh writeme --eval 'db.users.drop(); db.sessions.deleteMany({})'
  ```

**Login just reloads the login page**
→ Wrong username or password. Double-check case (usernames are lowercase).

**Changes to code aren't reflected**
→ Restart the server, or use `npm run dev` instead of `npm start` for
  auto-reload.

---

## What's NOT in this version yet

Planned but deferred to Phase 2/3:
- Real-time chat (currently refreshes on new messages — Phase 2 adds Socket.IO).
- Delivery proof photo upload (schema is reserved; UI not built yet).
- UPI/escrow payments (currently cash-only, recorded as a transaction).
- Admin dispute dashboard.
- Reviews & ratings.
- PWA / installable-on-phone.
