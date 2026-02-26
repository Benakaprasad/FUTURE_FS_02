# FitZone Gym CRM

A full-stack CRM application built for gym businesses to manage leads and staff. Admin and staff log in to track potential gym customers (leads) through a conversion pipeline.

---

## Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Frontend   | React 18, Vite, CSS Modules             |
| Backend    | Node.js, Express.js                     |
| Database   | PostgreSQL                              |
| Auth       | JWT (access token) + httpOnly cookie (refresh token) |
| Deployment | Render (backend + PostgreSQL), Vercel or Render (frontend) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Frontend                          │
│  React + Vite                                            │
│  ┌──────────┐  ┌─────────────┐  ┌───────────────────┐  │
│  │ Auth Page│  │  Dashboard  │  │   Staff Manager   │  │
│  │ (login)  │  │ (leads tab) │  │ (admin only tab)  │  │
│  └──────────┘  └─────────────┘  └───────────────────┘  │
│         │              │                  │              │
│         └──────────────┴──────────────────┘              │
│                    axios + interceptors                   │
│              (auto token refresh on 401)                  │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────┐
│                        Backend                           │
│  Express.js                                              │
│                                                          │
│  Security Layer                                          │
│  helmet → cors → rate-limit → body-parser → xss → hpp   │
│                                                          │
│  ┌─────────────┐        ┌──────────────────────────┐    │
│  │ /api/auth   │        │ /api/lead                │    │
│  │  POST /login│        │  GET    /          (all) │    │
│  │  POST /reg* │        │  GET    /:id       (all) │    │
│  │  POST /ref  │        │  POST   /          (all) │    │
│  │  POST /logo │        │  PUT    /:id       (all) │    │
│  │  GET  /me   │        │  PATCH  /:id/status(all) │    │
│  │  GET  /staf*│        │  DELETE /:id      (admin)│    │
│  │  PATCH/dea* │        └──────────────────────────┘    │
│  └─────────────┘                                         │
│   * = admin only                                         │
│                                                          │
│  Middleware                                              │
│  authenticateToken → authorizeRole                       │
│                                                          │
│  Background Jobs                                         │
│  node-cron → cleans expired tokens every midnight        │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                      PostgreSQL                          │
│                                                          │
│  users ──────────────────────── leads                    │
│  id (uuid)                      id (uuid)                │
│  username                       name                     │
│  email                          email                    │
│  password (bcrypt)              phone                    │
│  role (admin|staff)             source (enum)            │
│  full_name                      status (enum)            │
│  phone                          notes                    │
│  country                        created_by → users.id    │
│  is_active                      created_at               │
│  created_by → users.id          updated_at               │
│  created_at                                              │
│  updated_at                                              │
│                                                          │
│  refresh_tokens                 refresh_tokens_revoked   │
│  (active sessions)              (reuse detection)        │
└─────────────────────────────────────────────────────────┘
```

---

## Role System

```
Admin (1 — created manually in DB)
  └── creates Staff accounts via dashboard
        └── Staff creates and tracks Leads
```

| Permission              | Admin | Staff |
|-------------------------|-------|-------|
| Login                   | ✅    | ✅    |
| View leads              | ✅    | ✅    |
| Create lead             | ✅    | ✅    |
| Update lead status      | ✅    | ✅    |
| Delete lead             | ✅    | ❌    |
| View staff list         | ✅    | ❌    |
| Create staff account    | ✅    | ❌    |
| Deactivate staff        | ✅    | ❌    |

> Admin is created once directly in the database. There is no public registration endpoint.

---

## Auth Flow

```
Login
  → server generates access token (15min JWT) + refresh token (7d random bytes)
  → access token  → sent in response body → stored in sessionStorage
  → refresh token → hashed with SHA-256   → stored in DB
                  → raw sent as httpOnly cookie (JS cannot read it)

Every request
  → axios attaches access token as Authorization: Bearer <token>

Token expires (401)
  → axios interceptor silently calls POST /api/auth/refresh
  → server reads httpOnly cookie, verifies hash against DB
  → issues new access token + rotates refresh token
  → original request is replayed automatically

Logout
  → refresh token deleted from DB
  → httpOnly cookie cleared

Theft detection (token rotation)
  → if old rotated token is reused → ALL sessions for that user are revoked
```

---

## Project Structure

```
FUTURE_FS_02/
├── backend/
│   ├── config/
│   │   └── database.js          # PostgreSQL pool with SSL support
│   ├── jobs/
│   │   └── cleanupTokens.js     # cron job — deletes expired tokens daily
│   ├── middleware/
│   │   ├── auth.js              # JWT verification → populates req.user
│   │   └── role.js              # role-based access control
│   ├── models/
│   │   ├── User.js              # user DB queries
│   │   └── Lead.js              # lead DB queries (with created_by join)
│   ├── routes/
│   │   ├── auth.js              # login, register (admin only), staff management
│   │   └── lead.js              # full lead CRUD + search + filter
│   ├── env.js                   # validates required env vars on startup
│   ├── migrate.js               # runs migration.sql against DB
│   ├── migration.sql            # full schema — tables, enums, indexes, triggers
│   ├── server.js                # express app entry point
│   ├── xss-clean.d.ts           # TS declaration for xss-clean (no @types package)
│   └── package.json
│
├── frontend/
│   └── src/
│       ├── api/
│       │   └── api.js           # axios instance with auto token refresh interceptor
│       ├── components/
│       │   ├── ProtectedRoute.jsx  # redirects to /login if not authenticated
│       │   └── AdminRoute.jsx      # redirects to /dashboard if not admin
│       ├── context/
│       │   └── AuthContext.jsx  # global user state, login/logout/register
│       ├── pages/
│       │   ├── Auth.jsx         # login page (staff & admin only, no public register)
│       │   ├── Auth.module.css
│       │   ├── Dashboard.jsx    # leads tab + staff tab (admin only)
│       │   └── Dashboard.module.css
│       ├── App.jsx              # routing
│       ├── main.jsx
│       └── index.css            # CSS variables, fonts, global styles
│
└── README.md
```

---

## Security Measures

| Threat | Protection |
|---|---|
| XSS | httpOnly cookies, xss-clean middleware, helmet CSP |
| CSRF | sameSite: strict on cookies |
| Brute force | express-rate-limit (10 req / 15min on auth routes) |
| SQL injection | Parameterized queries via pg |
| Token theft | Refresh token rotation + reuse detection |
| Payload attacks | Body size limited to 10kb |
| HTTP header attacks | helmet middleware |
| Parameter pollution | hpp middleware |
| Privilege escalation | Role checked server-side on every protected route |
| Second admin | Blocked at API level — only one admin allowed |

---

## Local Development Setup

**Prerequisites:** Node.js 18+, PostgreSQL 14+

**1. Clone and install**
```bash
git clone https://github.com/yourname/FUTURE_FS_02.git
cd FUTURE_FS_02

cd backend && npm install
cd ../frontend && npm install
```

**2. Set up backend environment**
```bash
# backend/.env
PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=5432
DB_NAME=mini_crm
DB_USER=postgres
DB_PASS=yourdbpassword

JWT_SECRET=your_long_random_secret
JWT_REFRESH_SECRET=another_long_random_secret
```

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**3. Create database and run migration**
```bash
createdb mini_crm
cd backend
npm run migrate
```

**4. Create admin account**
```bash
# Generate hash for your chosen password
node -e "import('bcryptjs').then(m => m.default.hash('YourPassword', 12).then(console.log))"
```
```sql
INSERT INTO users (username, email, password, role, full_name, is_active)
VALUES ('admin', 'admin@fitzone.com', '$2b$12$...hash...', 'admin', 'FitZone Admin', true);
```

**5. Set up frontend environment**
```bash
# frontend/.env
VITE_API_URL=http://localhost:3000/api
```

**6. Run both servers**
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

Visit `http://localhost:5173/login`

---

## Production Deployment (Render)

**1. Create PostgreSQL** on Render → copy internal host, user, password, database name.

**2. Create Web Service** → connect GitHub repo:
```
Root Directory : backend
Build Command  : npm install
Start Command  : npm start
```

**3. Set environment variables** on Render (same as `.env` but with production values and `NODE_ENV=production`).

**4. Run migration** via Render shell:
```bash
npm run migrate
```

**5. Deploy frontend** to Vercel or Render static site:
```
Build Command  : npm run build
Output Dir     : dist
```
Set `VITE_API_URL` to your Render backend URL.

---

## Database Schema

```sql
-- ENUMs
user_role   : admin | staff
lead_status : new | contacted | qualified | converted | lost
lead_source : website | referral | social_media | walk_in | phone | other

-- Key relationships
users.created_by  → users.id   (which admin created this staff member)
leads.created_by  → users.id   (which staff member created this lead)
refresh_tokens.user_id → users.id
```

---

## API Endpoints

```
POST   /api/auth/login                    public
POST   /api/auth/refresh                  public (uses httpOnly cookie)
POST   /api/auth/logout                   public
GET    /api/auth/me                       authenticated
POST   /api/auth/register                 admin only
GET    /api/auth/staff                    admin only
PATCH  /api/auth/staff/:id/deactivate     admin only
PATCH  /api/auth/staff/:id/reactivate     admin only

GET    /api/lead                          staff + admin
GET    /api/lead?search=john              staff + admin
GET    /api/lead?status=new              staff + admin
GET    /api/lead/:id                      staff + admin
POST   /api/lead                          staff + admin
PUT    /api/lead/:id                      staff + admin
PATCH  /api/lead/:id/status               staff + admin
DELETE /api/lead/:id                      admin only

GET    /health                            public
```
