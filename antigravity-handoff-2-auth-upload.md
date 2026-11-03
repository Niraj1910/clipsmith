# HANDOFF 2 — Step 0 Fixes + Slice 4.1 (Auth + Upload)

> Give this file to Antigravity. Do ONLY what is written here.
> Read `AGENTS.md` and `.agents/rules/*` first and follow them for the whole handoff.
> Work in this order: Step 0, then Slice 4.1. STOP after Step 0 verification passes only if a
> Step 0 item needs my decision; otherwise continue straight into Slice 4.1. STOP at the end (section 9).

## 0. Context

Handoff 1 is done (scaffold, rules, Mongoose models, health page). This handoff delivers the first
vertical slice: **signup, login, logout, current user, video upload, video list, video detail**,
end to end (API -> UI), plus a few Step 0 fixes from the Handoff 1 review.

### Already installed (exact versions from the Handoff 1 report; do not change unless a Step 0 item says so)

| Workspace | Package | Version |
|---|---|---|
| shared | mongoose / typescript | 8.24.7 / 5.9.3 |
| backend | express / @types/express | 4.22.3 / 5.0.6 (**mismatch, see Step 0.1**) |
| backend | cors / dotenv / ioredis / zod | 2.8.6 / 16.6.1 / 5.11.1 / 3.25.76 |
| backend | tsx / @types/node | 4.23.15 / 22.20.5 |
| frontend | react / react-dom / react-router-dom | 19.3.1 / 19.3.1 / 7.18.5 |
| frontend | @tanstack/react-query / vite / tailwindcss | 5.105.0 / 6.4.5 / 3.4.19 |

Node `v24.19.0`, npm `11.17.0`.

## 1. Rules for this handoff

1. Never guess APIs or versions. After installing a package, read its installed README/types before use,
   and record its exact version from `package.json` in your report.
2. **Pre-approved new packages (backend):** `bcryptjs`, `jsonwebtoken`, `cookie-parser`, `multer`, plus the
   matching `@types/*` packages for each of them that needs one. (`bcryptjs` is chosen over `bcrypt` to avoid native builds.)
   Any other new package: STOP and ask.
3. No new env vars beyond those listed in section 4. No new database fields beyond the Handoff 1 models.
4. Do not build anything from later slices: no transcription, jobs, clips, scheduling, credits spending, admin.
5. Tag unverified statements `[Assumption]` in the report.

## 2. Step 0 — fixes from the Handoff 1 review

**0.1 Express types mismatch.** Runtime is `express` 4.22.3 but `@types/express` is 5.0.6.
Run `npm ls express @types/express`, then install the `@types/express` version whose major matches Express 4
(check the registry with `npm view @types/express versions --json`; do not guess). Re-run `npm run typecheck`.
Report the final pair.

**0.2 Native service scripts.** Keep `docker-compose.yml` as the reference setup. In `README.md`, document the
`services:*` scripts and the `GLIBC_TUNABLES` workaround as a local-only fallback, with the reason it exists.
Then verify and report the real output of: `redis-cli config get maxmemory-policy` (must be `noeviction`; if native
Redis is not started with it, fix the start script) and `redis-cli ping`.

**0.3 Health polling.** The health query refetches about every 5 seconds, which the spec did not ask for.
Report whether it was deliberate. Unless there is a documented reason, remove the interval so it fetches on load
and on the Refresh button only. Move the health page to the route `/status`.

**0.4 Tailwind.** Tailwind 3.4.19 stays. Add a "Decisions" section to `README.md` recording this and the
`bcryptjs` choice from section 1.

**0.5 Evidence.** Paste the real "worker ready" output from `npm run dev:worker`. List the files in
`.agents/rules/` and show the frontmatter of each, so I can check them against the spec.

**0.6 ffmpeg prerequisite.** Run `ffmpeg -version` and `ffprobe -version`. If either is missing, STOP and tell me
the install command for this OS; do not continue to Slice 4.1 until both work.

## 3. Slice 4.1 — scope

### 3.1 New env vars (add to `.env.example`, validate with zod in `backend/src/config/env.ts`)

```
JWT_SECRET=change-me-to-a-random-string-of-at-least-32-characters
JWT_EXPIRES_DAYS=7
STORAGE_PROVIDER=local
LOCAL_STORAGE_DIR=./storage
```

- `JWT_SECRET`: required, minimum 32 characters, fail fast otherwise.
- `JWT_EXPIRES_DAYS`: integer 1..30, default 7.
- `STORAGE_PROVIDER`: enum `['local']` for now (an `r2` option is added in a later slice).
- `LOCAL_STORAGE_DIR`: default `./storage`. Add it to `.gitignore`.

### 3.2 Shared DTO types

Add `shared/src/dto.ts`, exported as `@clipper/shared/dto` (plain TypeScript types only, no Mongoose, no zod):

```ts
UserDto  = { id, email, name?, role, credits, createdAt }
VideoDto = { id, title?, originalFilename?, sizeBytes?, durationSec?, status, failureReason?, createdAt }
ErrorBody = { error: { code: ErrorCode, message: string, details?: unknown } }
ErrorCode = 'VALIDATION_ERROR' | 'UNAUTHENTICATED' | 'INSUFFICIENT_CREDITS' | 'NOT_FOUND'
          | 'CONFLICT' | 'PAYLOAD_TOO_LARGE' | 'UNSUPPORTED_MEDIA_TYPE' | 'RATE_LIMITED' | 'INTERNAL'
Paginated<T> = { items: T[], page: number, limit: number, total: number }
```

The frontend imports types from `@clipper/shared/dto` and constants from `@clipper/shared/constants` only.
Add the two new export paths to `shared/package.json` `exports`. Dates are ISO strings in DTOs.

### 3.3 Backend structure (create these files)

```
backend/src/
├── lib/errors.ts           # AppError(code, status, message, details?) + status map for ErrorCode
├── middleware/validate.ts  # zod validate(params|query|body) helper -> AppError VALIDATION_ERROR
├── middleware/auth.ts      # requireAuth: reads cookie, verifies JWT, loads user from DB, attaches req.user
├── middleware/error.ts     # central error handler -> ErrorBody; unknown errors -> 500 INTERNAL (no stack to client)
├── lib/dto.ts              # toUserDto(), toVideoDto()
├── storage/
│   ├── storage.ts          # interface: put(tempPath, key), delete(key), exists(key), getPath?(key) for local
│   ├── local.ts            # local-disk implementation under LOCAL_STORAGE_DIR
│   └── index.ts            # picks implementation from STORAGE_PROVIDER
├── lib/ffprobe.ts          # runs ffprobe via child_process.spawn with an args array (no shell), returns parsed JSON
├── routes/auth.ts
├── routes/videos.ts
└── app.ts                  # mount cors (credentials: true, origin: CORS_ORIGIN exact), json, cookie-parser,
                            # /health (unchanged), /api/auth, /api/videos, then error middleware
```

### 3.4 Endpoints (exact contract)

All routes are under `/api`. Errors use `ErrorBody`. A resource that belongs to another user returns **404**, never 403.

**Cookie:** name `clipper_token`; httpOnly; `SameSite=Lax`; `Secure` only when `NODE_ENV=production`;
max age `JWT_EXPIRES_DAYS` days; path `/`. JWT payload: `{ sub: <userId>, role }`, signed with `JWT_SECRET`.

| Endpoint | Auth | Behavior |
|---|---|---|
| `POST /api/auth/signup` | none | Body `{ email, password, name? }`. Email: valid, trimmed, lowercased. Password: 8–72 chars. Name: optional, max 100. Creates the user with `credits = LIMITS.SIGNUP_CREDITS` and then a `credit_ledgers` row `{ delta: 30, reason: 'signup_grant', balanceAfter: 30 }`. Hash with bcryptjs (use a cost factor of 12 unless the library docs you read say otherwise, and report it). Sets cookie. 201 `{ user }`. Duplicate email: 409 `CONFLICT`. |
| `POST /api/auth/login` | none | Body `{ email, password }`. On wrong email OR wrong password return the same 401 `UNAUTHENTICATED` with the message "Invalid email or password". When the email does not exist, still run a bcrypt compare against a fixed dummy hash so timing does not reveal it. Sets cookie. 200 `{ user }`. |
| `POST /api/auth/logout` | cookie | Clears the cookie. 204. |
| `GET /api/auth/me` | cookie | 200 `{ user }`. 401 if missing/invalid/expired token or the user no longer exists. |
| `POST /api/videos/upload` | cookie | `multipart/form-data`: field `file` (required), field `title` (optional, max 200). See 3.5. 201 `{ video }`. |
| `GET /api/videos` | cookie | Query `page` (default 1), `limit` (default 20, max 100). Only the caller's videos, newest first. 200 `Paginated<VideoDto>`. |
| `GET /api/videos/:id` | cookie | 200 `{ video, transcript: null, clips: [], latestJob: null }` (the null/empty fields are placeholders for later slices). Invalid or foreign id: 404 `NOT_FOUND`. |

Do not return `passwordHash` anywhere. `UserDto.createdAt` is an ISO string.
The ledger write in signup is not transactional (single-node Mongo). If the ledger write fails, log the error
server-side and still return success. Note this in the README "Decisions" section.

### 3.5 Upload rules

1. Parse with `multer` using disk storage into a temp directory `<LOCAL_STORAGE_DIR>/tmp`, with a file size
   limit of `LIMITS.MAX_UPLOAD_BYTES` and a single file. Oversize -> 413 `PAYLOAD_TOO_LARGE`. Missing file -> 400 `VALIDATION_ERROR`.
2. Allowed extensions: `.mp4`, `.mov`, `.webm`. Anything else -> 415 `UNSUPPORTED_MEDIA_TYPE`.
3. Do not trust the client MIME type or filename. Run `ffprobe` on the temp file via `spawn` with an args array
   (JSON output of format and streams, with a timeout). Require: ffprobe succeeds, at least one video stream, and
   a container format in the allowed set (MP4/MOV family or WebM/Matroska). Otherwise 415.
4. Duration: if `format.duration` is missing, 415. If it exceeds `LIMITS.MAX_VIDEO_MINUTES` minutes -> 400 `VALIDATION_ERROR`.
5. On ANY rejection or error, delete the temp file. No orphaned files.
6. On success: generate the storage key server-side as `videos/<userId>/<uuid>.<ext>` (use Node's built-in `crypto.randomUUID()`;
   never use client-supplied names in paths), move the file into storage via the storage interface, and create the Video:
   `status: 'uploaded'`, `title` (given title, else filename without extension), `originalFilename` (basename only, max 255 chars),
   `mimeType` derived from the validated container (not the client header), `sizeBytes` from the file, `durationSec` from ffprobe,
   `storageKey`.
7. The upload does not spend credits and creates no Job in this slice.

## 4. Frontend scope

Routes (React Router): `/login`, `/signup`, `/` (Library, protected), `/status` (health page from Handoff 1).
Visual style: match the existing dark card look. No extra design work.

- `src/lib/api.ts` is the ONLY place that calls the network. All requests use `credentials: 'include'`.
  Add typed functions: `signup`, `login`, `logout`, `getMe`, `listVideos`, `getVideo`, `uploadVideo`.
  `uploadVideo(file, title, onProgress)` uses `XMLHttpRequest` (for upload progress) and lives in `api.ts` too.
  Failed responses are parsed as `ErrorBody` and thrown as a typed `ApiError` carrying `code` and `message`.
- Auth state: a TanStack Query `['me']` query. 401 means "logged out" (not an error screen). A `ProtectedRoute`
  redirects to `/login`. Login/signup redirect to `/` when already logged in. Logout clears the query cache.
- **Login / Signup pages:** email, password (and optional name on signup), inline error messages from `ApiError`, loading state.
- **Library page (`/`):** header with the user's email, credit balance (`user.credits`), and a Logout button;
  an upload form (file input accepting `.mp4,.mov,.webm`, optional title, progress bar, error display);
  a list of the user's videos showing title, status badge, size, duration, and uploaded date, with an empty state.
  After a successful upload, invalidate the videos query so the list refreshes.
  Client-side checks (extension and size) are conveniences only; the server is the authority.
- No polling anywhere in this slice.

## 5. Task list (run in order; verify as you go)

1. Complete Step 0 (section 2).
2. Install the pre-approved backend packages; record exact versions.
3. Extend `.env.example` and `env.ts` (3.1). Add `LOCAL_STORAGE_DIR` to `.gitignore`.
4. Add `shared/src/dto.ts` + export paths; rebuild shared.
5. Build backend pieces in the order: errors, validate, error middleware, dto mappers, storage, ffprobe, auth middleware,
   auth routes, video routes, wire into `app.ts`.
6. Build the frontend pieces in the order: `api.ts`, auth query + ProtectedRoute, Login, Signup, Library, `/status` move.
7. Update `README.md` (new env vars, how to run, API summary, Decisions).
8. Run all verification steps in section 6 and paste the real outputs.

## 6. Verification (paste real outputs)

Create a test video first:

```bash
ffmpeg -f lavfi -i testsrc=duration=10:size=640x360:rate=30 -f lavfi -i sine=frequency=1000:duration=10 \
  -c:v libx264 -c:a aac -shortest sample.mp4
echo "this is not a video" > fake.mp4
```

Then, with `npm run dev:backend` running (the cookie jar is `jar.txt`):

```bash
# 1. signup works, returns user with credits 30, sets cookie
curl -i -c jar.txt -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"a@test.com","password":"password123","name":"A"}'          # 201

# 2. duplicate signup
curl -i -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"a@test.com","password":"password123"}'                     # 409 CONFLICT

# 3. invalid body
curl -i -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" -d '{"email":"nope","password":"1"}' # 400 VALIDATION_ERROR

# 4. login wrong password, then correct
curl -i -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"a@test.com","password":"wrongpass1"}'                      # 401, "Invalid email or password"
curl -i -c jar.txt -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"a@test.com","password":"password123"}'                     # 200

# 5. me with and without the cookie
curl -s -b jar.txt http://localhost:4000/api/auth/me                       # 200 {user} (no passwordHash)
curl -i http://localhost:4000/api/auth/me                                  # 401

# 6. upload rejects: no auth, fake video, wrong extension
curl -i -F "file=@sample.mp4" http://localhost:4000/api/videos/upload      # 401
curl -i -b jar.txt -F "file=@fake.mp4" http://localhost:4000/api/videos/upload   # 415
cp fake.mp4 fake.txt
curl -i -b jar.txt -F "file=@fake.txt" http://localhost:4000/api/videos/upload   # 415

# 7. upload succeeds
curl -s -b jar.txt -F "file=@sample.mp4" -F "title=My test" http://localhost:4000/api/videos/upload   # 201 {video}

# 8. list and detail
curl -s -b jar.txt http://localhost:4000/api/videos                        # items: 1, total: 1
curl -s -b jar.txt http://localhost:4000/api/videos/<id-from-step-7>       # 200 {video, transcript:null, clips:[], latestJob:null}

# 9. isolation: second user cannot see the first user's video
curl -s -c jar2.txt -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" -d '{"email":"b@test.com","password":"password123"}'
curl -i -b jar2.txt http://localhost:4000/api/videos/<id-from-step-7>      # 404
curl -s -b jar2.txt http://localhost:4000/api/videos                       # total: 0

# 10. logout
curl -i -b jar.txt -c jar.txt -X POST http://localhost:4000/api/auth/logout   # 204
curl -i -b jar.txt http://localhost:4000/api/auth/me                       # 401
```

Also verify and report:
- No temp files remain in `<LOCAL_STORAGE_DIR>/tmp` after the rejected uploads; the successful upload exists under `<LOCAL_STORAGE_DIR>/videos/<userId>/`.
- The `users` document for `a@test.com` has `credits: 30` and a matching `signup_grant` row exists in `credit_ledgers` (use `mongosh`;
  if it is not installed, say so instead of guessing).
- `npm run typecheck` and `npm run build` pass with zero errors.
- `grep -r "shared/models" frontend/src` returns nothing, and `grep -rn "fetch(\|XMLHttpRequest" frontend/src` matches only `frontend/src/lib/api.ts`.

**UI check (I will do this manually):** signup -> lands on Library with 30 credits -> upload `sample.mp4` with a progress bar ->
it appears in the list as `uploaded` -> refresh keeps me logged in -> logout -> `/` redirects to `/login`.

## 7. Out of scope (do not build)

Rate limiting, email verification, password reset, OAuth, refresh tokens, admin pages, credits spending,
transcription, jobs/queues, clips, scheduling, direct-to-R2 uploads, and CSRF tokens (all scheduled for later slices).

## 8. Definition of done

Every command in section 6 returns the expected status/shape, the manual UI check passes, typecheck and build are clean,
and the Step 0 items are resolved or explicitly escalated.

## 9. Final report format, then STOP

1. Step 0: result of each item 0.1 to 0.6, with real command outputs.
2. Exact versions of every newly installed package (with `package.json` paths) and the bcrypt cost factor used.
3. Real output of every command in section 6, in order.
4. Deviations from this file, with reasons. Anything tagged `[Assumption]` or `[Unknown]`.
5. Open questions.

Do NOT start Handoff 3. Wait for the user.
