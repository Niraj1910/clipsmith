# HANDOFF 1 — Scaffold, Rules, Data Models

> Give this file to Antigravity. It is the complete spec for Handoff 1.
> Do ONLY what is written here. When finished, STOP and report (see section 9).

## 0. Project context

We are building an MVP of an AI video clipping and publishing product (working name: `clipper`).
Users upload long videos, the system transcribes them, detects "viral" moments with a heuristic
(real AI scoring comes later), renders vertical 9:16 clips with burned-in captions, and lets users
download clips and (stub) schedule posts. Credits are metered per source minute.

**Stack: MERN + TypeScript (ES modules everywhere).**
- Backend: Node.js + Express + TypeScript, MongoDB via Mongoose, zod validation
- Frontend: React + Vite + TypeScript + Tailwind, React Router, TanStack Query
- Auth (later): email/password with bcrypt, JWT in httpOnly cookie, handled in Express
- Queue: BullMQ + Redis (worker is a separate process)
- Storage (later): Cloudflare R2 / S3
- Video (later): FFmpeg
- Transcription (later): provider interface with `mock`, `groq`, `openai` implementations
- Local infra: Docker Compose (MongoDB + Redis)

**Defaults already decided:** 2 GB / 60 min / MP4-MOV-WebM upload limits; 1 credit per source minute;
30 free credits on signup; clip duration must be 5–120 s; roles are `creator` and `admin`.

## 1. Working rules for this handoff

1. Create `AGENTS.md` and `.agents/rules/*` FIRST (section 3), then re-read them and follow them.
2. Never guess package versions or APIs. Install packages, then read the resulting `package.json`
   and the installed package's docs/types before using it. If something is unclear, ASK.
3. Do not add features, endpoints, auth, upload, or UI beyond what is listed here.
4. Do not invent env vars, config keys, or database fields. Use only those defined in this file.
5. Mark anything not verified as `[Assumption]` in your final report.

## 2. Target repo structure

```
clipper/
├── AGENTS.md
├── .agents/
│   └── rules/
│       ├── anti-hallucination.md
│       ├── stack-conventions.md
│       └── vertical-slice-discipline.md
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
├── package.json              # npm workspaces root
├── tsconfig.base.json
├── shared/                   # constants + Mongoose models used by backend and worker
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── constants.ts
│       ├── models/
│       │   ├── user.ts
│       │   ├── video.ts
│       │   ├── transcript.ts
│       │   ├── clip.ts
│       │   ├── job.ts
│       │   ├── scheduled-post.ts
│       │   ├── credit-ledger.ts
│       │   └── index.ts
│       └── index.ts
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── config/env.ts     # zod-validated env, the ONLY place process.env is read
│       ├── lib/db.ts         # mongoose connection
│       ├── lib/redis.ts      # redis connection
│       ├── routes/health.ts
│       ├── app.ts
│       └── server.ts
├── worker/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── config/env.ts
│       └── index.ts          # connects to Mongo + Redis, logs ready, no jobs yet
└── frontend/
    ├── package.json
    └── src/
        ├── lib/api.ts        # the ONLY place fetch is called
        └── App.tsx           # shows backend health status
```

Package scope name: `@clipper/shared`, `@clipper/backend`, `@clipper/worker`, `@clipper/frontend`.
Use npm workspaces. `shared` is compiled with `tsc` to `dist` and consumed via its `exports` map
(`@clipper/shared/constants` for the frontend, `@clipper/shared/models` for backend and worker).
The frontend must NEVER import from `@clipper/shared/models` (it pulls in Mongoose).
Backend and worker run in dev with `tsx watch`.

## 3. Rules files (create these verbatim, FIRST)

### 3.1 `AGENTS.md` (repo root, no frontmatter)

````markdown
# AGENTS.md — clipper

## Project
MERN + TypeScript monorepo (npm workspaces): `shared`, `backend`, `worker`, `frontend`.
An AI video clipping product: upload -> transcribe -> detect moments -> render 9:16 captioned clips
-> download / schedule. Work is delivered in numbered handoff files; each handoff is a set of vertical slices.

## Non-negotiables
1. Read `.agents/rules/anti-hallucination.md` before doing anything else in a session.
2. When uncertain about an API, version, env var, field, or requirement: ASK. Do not generate plausible-looking code.
3. Follow the slice order given in the current handoff file. Do not jump ahead or add unrequested features.
4. Do not proceed past a STOP marker without an explicit "approved" from the user.
5. External services (Whisper/Groq/OpenAI, R2/S3, FFmpeg side effects) are built as MOCK first behind a feature flag.
6. Every slice ends with a verification command the user can run.
````

### 3.2 `.agents/rules/anti-hallucination.md`

````markdown
---
trigger: always_on
description: Prevents guessing. Always apply.
---

# Anti-hallucination rules

1. Never guess APIs, library versions, or function signatures. If you have not read the file or the
   installed package's types/docs, say so and read it first.
2. Every factual claim about the codebase must cite its source as `[Source: Code] path:line`.
3. Tag certainty on non-trivial statements: `[Confirmed]`, `[Inferred]`, `[Assumption]`, `[Unknown]`.
4. Before using an external library, state the exact installed version from the relevant
   `package.json`. If the library is not listed there, stop and ask before installing or using it.
5. Do not invent environment variables, config keys, or database fields/collections. If one is needed
   and not defined in the handoff, ask first.
6. Default action when unsure: ASK. Do not generate plausible-looking code to fill a gap.
7. If a command fails or output is unexpected, show the real output. Never claim success without evidence.
````

### 3.3 `.agents/rules/stack-conventions.md`

````markdown
---
trigger: model_decision
description: Apply when writing or editing backend, frontend, database, or FFmpeg code in this repo.
---

# Stack conventions

## Backend (Node + Express + TypeScript)
- ES modules only. No CommonJS `require`.
- Validate every route's params, query, and body with zod. Reject invalid input with a 400 and a structured error.
- Secrets and config come from `process.env` ONLY through `backend/src/config/env.ts` (zod-validated). Never read `process.env` elsewhere.
- Never log secrets, tokens, or password hashes.

## Frontend (React + Vite + TypeScript)
- All HTTP calls go through `frontend/src/lib/api.ts`. No `fetch`/`axios` calls in components.
- Server state uses TanStack Query. Routing uses React Router.
- Never import `mongoose` or `@clipper/shared/models` in the frontend. Use `@clipper/shared/constants` only.

## Database (MongoDB + Mongoose)
- Collection names: snake_case, plural. Field names: camelCase.
- Schema changes are additive. Never remove or rename a field in the same deploy that stops writing it:
  first stop writing, deploy, then remove in a later change. Data migrations must have `up` and `down`.
- Add indexes in the schema definition, and justify each index by a query that uses it.
- Credits are changed ONLY via an atomic conditional update plus a `credit_ledgers` entry.

## FFmpeg
- Run FFmpeg via `child_process.spawn` with an args array. Never use a shell. Never concatenate user input into a command string.
- Validate clip duration is between 5 and 120 seconds before rendering.
- Always handle non-zero exit codes and timeouts; mark the Job failed and refund reserved credits.
````

### 3.4 `.agents/rules/vertical-slice-discipline.md`

````markdown
---
trigger: model_decision
description: Apply when planning or implementing any feature slice.
---

# Vertical slice discipline

1. One slice touches model/schema -> API route -> UI -> wiring, in one pass, end to end.
2. No UI built on mock data before the API endpoint it needs exists.
3. After each slice, give the user a verification command or step (curl, test, or exact UI steps) and the expected output.
4. Do not start the next slice without an explicit "approved" from the user.
5. External services (transcription providers, S3/R2, Redis side effects): implement the MOCK first,
   selected by a feature flag, then the real implementation.
6. Keep slices small. If a slice needs more than one conceptual change, split it and ask.
````

## 4. Infra: `docker-compose.yml`

Services (use current stable official images; check Docker Hub tags, do not guess):
- `mongo` — port 27017, named volume for data, no auth needed for local dev
- `redis` — port 6379, named volume. Start with `--maxmemory-policy noeviction` (required by BullMQ)

## 5. `.env.example` (only these keys in Handoff 1)

```
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://localhost:27017/clipper
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=http://localhost:5173
VITE_API_URL=http://localhost:4000
```

`backend/src/config/env.ts` and `worker/src/config/env.ts` validate the relevant keys with zod and
fail fast with a readable error if any are missing or invalid. Do not add other keys.

## 6. Data models (implement in `shared/src/models/`, Mongoose, `timestamps: true`)

First read the installed Mongoose version's docs/types. Export TypeScript types inferred from each schema.
Define enums in `shared/src/constants.ts` as `as const` arrays and export their types:

```
ROLES          = ['creator', 'admin']
VIDEO_STATUS   = ['uploaded','transcribing','transcribed','detecting','ready','failed']
CLIP_STATUS    = ['detected','rendering','ready','failed']
JOB_TYPE       = ['transcribe','detect','render']
JOB_STATUS     = ['queued','running','succeeded','failed']
POST_STATUS    = ['scheduled','published','cancelled','failed']
PLATFORMS      = ['tiktok','instagram','facebook','x','linkedin']
LEDGER_REASON  = ['signup_grant','reserve','refund','admin_adjust']
TRANSCRIPTION_PROVIDERS = ['mock','groq','openai']
LIMITS         = { MAX_UPLOAD_BYTES: 2*1024**3, MAX_VIDEO_MINUTES: 60, MIN_CLIP_SEC: 5, MAX_CLIP_SEC: 120, SIGNUP_CREDITS: 30 }
```

Collections and fields (all ObjectId refs are to the model named after the arrow):

```
User  (collection: users)
  email: String, required, unique, lowercase, trim
  passwordHash: String, required
  name: String
  role: enum ROLES, default 'creator'
  credits: Number, integer, min 0, default LIMITS.SIGNUP_CREDITS
  indexes: { email: 1 } unique

Video  (videos)
  userId: ObjectId -> User, required
  title: String
  originalFilename: String
  mimeType: String
  sizeBytes: Number
  durationSec: Number
  storageKey: String, required
  status: enum VIDEO_STATUS, default 'uploaded'
  failureReason: String
  indexes: { userId: 1, createdAt: -1 }

Transcript  (transcripts)
  videoId: ObjectId -> Video, required, unique
  provider: enum TRANSCRIPTION_PROVIDERS
  language: String
  fullText: String
  segments: [{ start: Number, end: Number, text: String }]
  words: [{ word: String, start: Number, end: Number }]
  indexes: { videoId: 1 } unique

Clip  (clips)
  videoId: ObjectId -> Video, required
  userId: ObjectId -> User, required        // denormalized for "my clips" queries
  startSec: Number, required
  endSec: Number, required
  durationSec: Number, required, validated between LIMITS.MIN_CLIP_SEC and LIMITS.MAX_CLIP_SEC
  score: Number                              // heuristic score 0..1
  signals: Mixed                             // why it scored
  hookText: String
  captionStyle: String, default 'default'
  status: enum CLIP_STATUS, default 'detected'
  renderKey: String
  thumbnailKey: String
  indexes: { userId: 1, createdAt: -1 }, { videoId: 1 }

Job  (jobs)
  userId: ObjectId -> User, required
  type: enum JOB_TYPE, required
  videoId: ObjectId -> Video, required
  clipId: ObjectId -> Clip
  status: enum JOB_STATUS, default 'queued'
  progress: Number, 0..100, default 0
  attempts: Number, default 0
  bullJobId: String
  creditsReserved: Number, default 0
  error: { code: String, message: String }
  startedAt: Date
  finishedAt: Date
  indexes: { userId: 1, createdAt: -1 }, { videoId: 1 }, { status: 1 }

ScheduledPost  (scheduled_posts)
  clipId: ObjectId -> Clip, required
  userId: ObjectId -> User, required         // denormalized
  platform: enum PLATFORMS, required
  caption: String
  scheduledAt: Date, required
  status: enum POST_STATUS, default 'scheduled'
  externalPostId: String
  failureReason: String
  indexes: { userId: 1, scheduledAt: 1 }, { status: 1, scheduledAt: 1 }

CreditLedger  (credit_ledgers)
  userId: ObjectId -> User, required
  delta: Number, integer, required           // signed
  reason: enum LEDGER_REASON, required
  jobId: ObjectId -> Job
  balanceAfter: Number, required
  indexes: { userId: 1, createdAt: -1 }
```

Do NOT write any credit-handling logic, controllers, or routes yet. Models and types only.

## 7. App skeletons

**Backend:** Express app with `GET /health` returning
`{ "status": "ok", "mongo": "up" | "down", "redis": "up" | "down" }`, with CORS limited to `CORS_ORIGIN`.
No other routes. `server.ts` connects to Mongo and Redis, then listens on `PORT`.

**Worker:** connects to Mongo and Redis, logs `worker ready`, stays running. No queues or processors yet.

**Frontend:** Vite + React + TypeScript + Tailwind, following the OFFICIAL install guides for the versions
you install (read them; do not guess config). `App.tsx` calls `api.getHealth()` from `src/lib/api.ts`
via TanStack Query and shows the backend / Mongo / Redis status. No styling work beyond a clean basic layout.

## 8. Task list (run in order; verify each)

1. Check and record `node -v` and `npm -v`. If Node is older than the current LTS, tell me before continuing.
2. Create the folder structure from section 2. Create `AGENTS.md` and `.agents/rules/*` first (section 3).
3. `git init`, create `.gitignore` (node_modules, dist, .env, build output, volumes).
4. Root `package.json` with workspaces; `tsconfig.base.json` (strict mode on, ES module settings).
5. Create `docker-compose.yml`; run `docker compose up -d`; confirm both containers are healthy.
6. Set up `shared` (constants + models), install deps, build with `tsc`.
7. Set up `backend`, then `worker`, then `frontend` (installs as needed; record exact versions).
8. Add root scripts: `dev:backend`, `dev:worker`, `dev:frontend`, `build`, `typecheck`.
9. Write `README.md`: prerequisites, setup, how to run, how to verify, repo layout.
10. Run all verification commands below and paste the real output into your report.

### Verification commands

```bash
docker compose ps                                   # mongo and redis running
npm run typecheck                                   # zero errors across all workspaces
npm run build                                       # shared builds
npm run dev:backend                                 # in terminal 1
curl -s http://localhost:4000/health                # {"status":"ok","mongo":"up","redis":"up"}
npm run dev:worker                                  # in terminal 2, logs "worker ready"
npm run dev:frontend                                # in terminal 3, open http://localhost:5173
                                                    # page shows backend / Mongo / Redis all "up"
```

Also confirm the frontend has no import from `@clipper/shared/models` (e.g. `grep -r "shared/models" frontend/src` returns nothing).

## 9. Definition of done and final report

Handoff 1 is done when every verification command above passes. Then STOP and report:

1. Node/npm versions, and the exact installed version of every dependency you added (with the `package.json` path).
2. Real output of each verification command.
3. Anything tagged `[Assumption]` or `[Unknown]`, and any deviation from this file with the reason.
4. Open questions.

Do NOT start Handoff 2. Wait for the user.
