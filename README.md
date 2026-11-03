# Clipper

MVP of an AI video clipping and publishing platform (MERN + TypeScript monorepo).

## Prerequisites

- **Node.js**: >= 20 LTS (tested on `v24.19.0`)
- **npm**: >= 10 (tested on `11.17.0`)
- **Docker & Docker Compose**: for local MongoDB and Redis instances

## Repository Structure

```
clipper/
├── AGENTS.md                         # Agent operating rules & non-negotiables
├── .agents/
│   └── rules/
│       ├── anti-hallucination.md     # Factual citations & no-guessing rules
│       ├── stack-conventions.md      # Conventions for backend, frontend, database, FFmpeg
│       └── vertical-slice-discipline.md # Rules for vertical slices
├── docker-compose.yml                # Mongo 8.0 & Redis 7.4 containers
├── .env.example                      # Documented environment variables
├── .gitignore
├── tsconfig.base.json                # Shared TypeScript base configuration
├── package.json                      # Workspaces root
├── shared/                           # Constants and Mongoose models
│   ├── src/constants.ts
│   └── src/models/                   # User, Video, Transcript, Clip, Job, ScheduledPost, CreditLedger
├── backend/                          # Express REST API (port 4000)
│   └── src/                          # Health check route, env validation, Mongo/Redis connections
├── worker/                           # Background processing worker
│   └── src/                          # Mongo/Redis connections, standby ready state
└── frontend/                         # Vite + React + TypeScript + Tailwind
    └── src/                          # Health monitor dashboard with TanStack Query
```

## Quick Start & Setup

1. **Environment Configuration**
   Copy the example environment configuration:
   ```bash
   cp .env.example .env
   ```

2. **Start Infrastructure Services**
   - **Option A (Reference Setup — Docker Compose)**:
     ```bash
     docker compose up -d
     docker compose ps
     ```
   - **Option B (Local Fallback — Native MongoDB & Redis)**:
     If running native MongoDB on Linux kernels >= 6.19 (such as Ubuntu with kernel 7.0), `GLIBC_TUNABLES="glibc.pthread.rseq=1"` is required due to MongoDB's bundled TCMalloc incompatibility ([SERVER-121912](https://jira.mongodb.org/browse/SERVER-121912)). BullMQ also requires Redis `maxmemory-policy noeviction`. Helper scripts handle this automatically:
     ```bash
     npm run services:start   # starts Redis (noeviction) and MongoDB in background
     npm run services:status  # checks connectivity (PONG and { ok: 1 })
     npm run services:stop    # stops both services
     ```

## Architectural & Technical Decisions

- **Tailwind CSS 3.4.19**: Maintained Tailwind v3 with standard PostCSS and Autoprefixer integration for reliable styling and broad compatibility.
- **`bcryptjs`**: Selected over native `bcrypt` to avoid platform-specific native C++ builds and node-gyp issues.
- **Non-transactional Signup Grant**: On single-node local MongoDB, the initial `signup_grant` entry in `credit_ledgers` during user creation is performed non-transactionally; if ledger writing fails, the error is logged server-side and signup succeeds.

3. **Install Dependencies**
   Install packages across all workspaces:
   ```bash
   npm install
   ```

4. **Build Shared Library**
   Compile TypeScript definitions and models in `shared`:
   ```bash
   npm run build
   ```

## Environment Variables

Defined in `.env.example` and validated via Zod in `backend/src/config/env.ts`:

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | Environment (`development`, `production`, `test`) | `development` |
| `PORT` | Backend HTTP port | `4000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/clipper` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `CORS_ORIGIN` | Allowed client origin | `http://localhost:5173` |
| `VITE_API_URL` | Backend URL for Vite frontend | `http://localhost:4000` |
| `JWT_SECRET` | Secret key for JWT signing (min 32 chars) | — |
| `JWT_EXPIRES_DAYS` | Token expiry in days (1..30) | `7` |
| `STORAGE_PROVIDER` | Video storage provider (`local`) | `local` |
| `LOCAL_STORAGE_DIR` | Local disk storage path | `./storage` |

## API Endpoints (Slice 4.1)

All API routes are served under `/api` and authenticate via the `clipper_token` httpOnly cookie.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | None | Returns MongoDB and Redis connection status |
| `POST` | `/api/auth/signup` | None | Creates user with 30 initial credits and sets cookie |
| `POST` | `/api/auth/login` | None | Authenticates user (constant-time check) and sets cookie |
| `POST` | `/api/auth/logout` | Cookie | Clears authentication cookie |
| `GET` | `/api/auth/me` | Cookie | Returns current authenticated user |
| `POST` | `/api/videos/upload` | Cookie | Uploads and validates MP4/MOV/WebM video via ffprobe |
| `GET` | `/api/videos` | Cookie | Returns caller's paginated videos (newest first) |
| `GET` | `/api/videos/:id` | Cookie | Returns video detail (or 404 if owned by another user) |

## Running the Applications

Each service can be started independently:

- **Backend** (API server at http://localhost:4000):
  ```bash
  npm run dev:backend
  ```

- **Worker** (Background worker process):
  ```bash
  npm run dev:worker
  ```

- **Frontend** (Vite development server at http://localhost:5173):
  ```bash
  npm run dev:frontend
  ```

## Verification

Run these commands to verify the scaffold:

1. **Containers / Services Running**:
   ```bash
   npm run services:status
   ```

2. **Type Checking (zero errors across all workspaces)**:
   ```bash
   npm run typecheck
   ```

3. **Build Shared**:
   ```bash
   npm run build
   ```

4. **Backend Health Endpoint**:
   ```bash
   curl -s http://localhost:4000/health
   # Expected response: {"status":"ok","mongo":"up","redis":"up"}
   ```

5. **Worker Standby**:
   ```bash
   npm run dev:worker
   # Expected output: logs "worker ready" and remains active
   ```

6. **Frontend Dashboard**:
   Open http://localhost:5173 in your browser to view the real-time library dashboard.
