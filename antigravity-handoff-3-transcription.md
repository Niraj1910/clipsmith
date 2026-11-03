# HANDOFF 3 — Step 0 (close Handoff 2) + Slice 4.2 (Transcription)

> Give this file to Antigravity. Do ONLY what is written here.
> Read `AGENTS.md` and `.agents/rules/*` first and follow them for the whole handoff.
> Order: Step 0, then Slice 4.2. If a Step 0 item says STOP, stop and ask me. STOP at the end (section 9).

## 0. Context

Handoffs 1 and 2 are done: scaffold, models, auth, upload, library UI. This handoff adds the first
**background-job slice**: a user starts processing on an uploaded video, a worker extracts the audio,
transcribes it (mock provider by default, Groq/OpenAI behind a flag), stores the transcript with
word-level timestamps, and the UI shows job progress and the transcript.

Known versions: Node `v24.19.0`, npm `11.17.0`, `express` 4.22.3 with `@types/express` 4.17.25,
`mongoose` 8.24.7, `zod` 3.25.76, `ioredis` 5.11.1, React 19.3.1, Vite 6.4.5, Tailwind 3.4.19.
(Versions of the Handoff 2 packages are requested in Step 0.2.)

Credits are NOT charged in this slice (that is slice 4.7). Do not touch the credits logic.

## 1. Rules for this handoff

1. Never guess APIs or versions. After installing, read the installed package's docs/types before using it,
   and record the exact version from `package.json` in your report.
2. **Pre-approved new package:** `bullmq` (backend and worker). Nothing else. Use Node's built-in
   `fetch`, `FormData`, and `Blob` for provider HTTP calls; do not add an SDK or HTTP client. Any other new package: STOP and ask.
3. Read the installed BullMQ docs before writing queue code. In particular verify, do not assume: the Redis
   connection options BullMQ requires, how to mark a failure as non-retryable, how to detect the final failed attempt,
   and how job ids work.
4. No env vars beyond section 3.1. No new Mongoose model fields (use the Handoff 1 models as they are).
5. Do not build anything from later slices (moment detection, clip rendering, captions, scheduling, credits).
6. Tag unverified statements `[Assumption]` in the report.

## 2. Step 0 — close Handoff 2

**0.1 Commit.** Run `git status`. Confirm `.env`, `storage/`, `node_modules`, and `dist` are NOT tracked. Commit all Handoff 2 work
(`Handoff 2: auth and upload`) and tag it `handoff-2`. Report `git log --oneline -5`.

**0.2 Missing Handoff 2 report items.** Report: (a) exact installed versions with `package.json` paths for `bcryptjs`, `jsonwebtoken`,
`cookie-parser`, `multer`, and the `@types/*` you added; (b) the bcrypt cost factor used; (c) real output of
`grep -r "shared/models" frontend/src` and `grep -rn "fetch(\|XMLHttpRequest" frontend/src`; (d) `mongosh` evidence that `a@test.com`
has `credits: 30` and a `signup_grant` row exists in `credit_ledgers` (if `mongosh` is missing, say so); (e) output of
`redis-cli config get maxmemory-policy`; (f) the frontmatter of each file in `.agents/rules/`; (g) a list of EVERY deviation from the Handoff 2 file.

**0.3 Storage key extension.** Handoff 2 required the key `videos/<userId>/<name>.<ext>` where `<ext>` follows the validated container
(`.mp4`, `.mov`, `.webm`). Your summary says keys are `<videoId>.mp4`. Using the video's ObjectId instead of a UUID is acceptable; forcing
`.mp4` is not. Fix it, then prove it: generate a small `.mov` and a small `.webm` with ffmpeg, upload both, and report the resulting
storage keys and their `ffprobe` format names.

**0.4 Extra ffprobe fields.** Your summary says ffprobe also extracts resolution, aspect ratio, and frame rate. The `Video` model has no such fields.
Report exactly where those values are stored or returned. If you added fields to `shared/src/models/video.ts`, show `git diff` for that file and STOP
for my decision. If they are only used transiently (not stored, not returned), say so and continue.

**0.5 Auth state.** Confirm the Auth context wraps the TanStack Query `['me']` query and does not duplicate the fetch. No change needed if so; just report.

**0.6 Audio encoder.** Run `ffmpeg -hide_banner -encoders | grep -i mp3`. It must list `libmp3lame`. If not, STOP and tell me.

## 3. Slice 4.2 — scope

### 3.1 Env vars (worker only; backend needs no new env)

Add to `.env.example` and validate with zod in `worker/src/config/env.ts` (the only place the worker reads `process.env`):

```
TRANSCRIPTION_PROVIDER=mock
TRANSCRIPTION_MODEL=
GROQ_API_KEY=
OPENAI_API_KEY=
```

Also add `STORAGE_PROVIDER` and `LOCAL_STORAGE_DIR` to the worker's validation (same keys as the backend already uses).

- `TRANSCRIPTION_PROVIDER`: one of `TRANSCRIPTION_PROVIDERS` (`mock`, `groq`, `openai`), default `mock`.
- If `groq`: `GROQ_API_KEY` and `TRANSCRIPTION_MODEL` are required and non-empty. If `openai`: `OPENAI_API_KEY` and `TRANSCRIPTION_MODEL` are required.
  If `mock`: keys and model are ignored. Fail fast with a readable error when a required value is missing.
- Add comments in `.env.example` with suggested values and mark them `[Assumption] verify in the provider's docs`:
  Groq model `whisper-large-v3-turbo`, OpenAI model `whisper-1`.
- Never log API keys, request headers, or audio.

### 3.2 Move shared Node-only helpers into `shared`

The worker needs the storage and ffprobe code that currently lives in `backend`. Move both into `shared/src/node/`:
`storage/` (interface + local implementation + factory) and `ffprobe.ts`. Export them as `@clipper/shared/node`.

- The storage factory must take its config as arguments (provider, directory). No `process.env` access inside `shared`.
- The local storage implementation must expose a way to resolve a storage key to an absolute path (for the worker to read it), and keep path-traversal protection.
- Update the backend to import from `@clipper/shared/node`. Behavior of the existing upload flow must not change.
- The frontend must NEVER import `@clipper/shared/node` or `@clipper/shared/models`.

### 3.3 Shared constants and DTOs

In `shared/src/constants.ts` add `JOB_ERROR_CODES = ['NO_AUDIO','NO_SPEECH','AUDIO_EXTRACTION_FAILED','AUDIO_TOO_LARGE','PROVIDER_AUTH','PROVIDER_ERROR','INTERNAL']`
and `PIPELINE_QUEUE_NAME = 'pipeline'`.

In `shared/src/dto.ts` add:

```ts
JobDto = { id, type, status, progress, videoId, clipId?, error?: { code, message }, createdAt, startedAt?, finishedAt? }
TranscriptDto = { provider, language?, fullText, segments: { start, end, text }[], wordCount: number,
                  words?: { word, start, end }[] }          // words only when ?include=words
VideoDetailDto = { video: VideoDto, transcript: TranscriptDto | null, clips: [], latestJob: JobDto | null }
```

### 3.4 Job lifecycle

One queue named `PIPELINE_QUEUE_NAME`; the BullMQ job name is the job type (`transcribe` for now). Worker concurrency: 1.
The backend creates the Mongo `Job` document first and uses its id as the BullMQ job id. Enqueue options: 2 attempts, exponential backoff
starting at 5 seconds, and bounded retention of completed/failed BullMQ jobs (check the docs for the option names).

Backend flow for `POST /api/videos/:id/clip`:

1. Validate the body with zod: `{ clipCount?: integer 1..5, default 3 }`. The value is validated and accepted but not used until slice 4.3.
2. Atomically claim the video: `findOneAndUpdate({ _id, userId, status: { $in: ['uploaded','failed'] } }, { status: 'transcribing', $unset: { failureReason: 1 } })`.
   If nothing matched: 404 when the video does not exist or is not the caller's, otherwise 409 `CONFLICT`.
3. Create the `Job` (`type: 'transcribe'`, `status: 'queued'`, `userId`, `videoId`), then enqueue. If enqueue throws, mark the Job `failed`
   (`error.code: 'INTERNAL'`), set the Video to `failed` with a failureReason, log it, and return 500 `INTERNAL`.
4. Respond 202 `{ job }`.

Worker `transcribe` processor, in order:

1. Load the Job and Video. Set Job `running`, `startedAt` (first attempt only), `attempts` = current attempt number, `progress` 5.
2. Resolve the stored file path. `ffprobe` it: if there is no audio stream, fail with `NO_AUDIO` (non-retryable).
3. Extract audio (section 3.6). Progress 30.
4. Call the provider (section 3.5). Progress 80.
5. If the transcript text is empty or has zero words, fail with `NO_SPEECH` (non-retryable).
6. Upsert the `Transcript` by `videoId` (the unique index means a retry must not create a duplicate). Set Video `transcribed`. Set Job `succeeded`, `progress` 100, `finishedAt`.
7. Always delete the temp audio file, on success and on every failure path.

Failure handling:
- Retryable errors (network errors, provider 429/5xx, ffmpeg crash): if attempts remain, set the Job back to `queued` with `error` recorded and `progress` 0; BullMQ retries.
- Non-retryable errors (`NO_AUDIO`, `NO_SPEECH`, `PROVIDER_AUTH`, `AUDIO_TOO_LARGE`): fail immediately without retrying.
- Final failure: Job `failed` with `error: { code, message }` and `finishedAt`; Video `failed` with `failureReason` set to a short human-readable message.
- Error messages stored in Mongo or returned to the client must never contain API keys, file system paths, or raw provider response bodies.

### 3.5 Transcription providers (`worker/src/transcription/`)

```
provider.ts           # interface: transcribe({ audioPath, durationSec }) -> { language?, fullText, segments[], words[] }
mock.ts               # no network, no keys
openai-compatible.ts  # one implementation used for both groq and openai via config { name, url, apiKey, model }
index.ts              # factory chosen by TRANSCRIPTION_PROVIDER
```

**mock:** deterministic for a given `durationSec`. Wait about 1.5 seconds to simulate work. Generate sentences from a fixed list of at least 12 neutral sentences
that include questions (`?`), exclamations (`!`), and varied lengths, each lasting 3 to 7 seconds with small gaps between them (0 to 1.5 s, deterministic),
until `durationSec` is covered. Distribute words evenly across each sentence's time span. `language: 'en'`, `provider: 'mock'`. This data is also the input for slice 4.3, so keep it realistic.

**openai-compatible:** POST multipart form data to the provider's transcription endpoint using built-in `fetch`, `FormData`, and `Blob` with these fields:
`file`, `model`, `response_format=verbose_json`, `timestamp_granularities[]=word`, `timestamp_granularities[]=segment`. Omit `language` (auto-detect).
Authorization via `Bearer` header. Use a 5 minute timeout. Parse the response with zod: `language?`, `text`, `segments[{start,end,text}]`, `words[{word,start,end}]`.
- If `words` is missing or empty while `text` is non-empty: fail with `PROVIDER_ERROR` ("provider returned no word timestamps"); captions need them.
- 401/403: `PROVIDER_AUTH` (non-retryable). 429 and 5xx and network errors: `PROVIDER_ERROR` (retryable). Schema mismatch: `PROVIDER_ERROR`; log only the response's top-level keys, not its content.
- Endpoint URLs: Groq `https://api.groq.com/openai/v1/audio/transcriptions`, OpenAI `https://api.openai.com/v1/audio/transcriptions`.
  Mark both `[Assumption]` unless you can verify them from the providers' docs, and tell me which you could verify.

### 3.6 Audio extraction (`worker/src/media/extract-audio.ts`)

Run ffmpeg via `child_process.spawn` with an args array (never a shell, never string concatenation), with a 10 minute timeout and exit-code check:
`-y -i <input> -map 0:a:0 -vn -ac 1 -ar 16000 -c:a libmp3lame -b:a 32k <output.mp3>`, output into `<LOCAL_STORAGE_DIR>/tmp/<jobId>.mp3`.
At 32 kbps mono, a 60-minute video is about 14.4 MB, which fits under the 25 MB provider upload cap, so no chunking is needed in v1.
If the output file is larger than 24 MB, fail with `AUDIO_TOO_LARGE`. On a non-zero exit, fail with `AUDIO_EXTRACTION_FAILED` (retryable) and keep ffmpeg's stderr out of client-visible messages.

### 3.7 Backend endpoints (exact contract)

| Endpoint | Auth | Behavior |
|---|---|---|
| `POST /api/videos/:id/clip` | cookie | As in 3.4. 202 `{ job }`. 404 foreign or missing video, 409 not startable, 400 invalid body |
| `GET /api/jobs/:id` | cookie | 200 `{ job }`. Invalid id or another user's job: 404 `NOT_FOUND` |
| `GET /api/videos/:id` | cookie | 200 `VideoDetailDto`: `transcript` is the stored transcript (no `words` unless `?include=words`), `clips: []`, `latestJob` is the newest job for that video. `include` accepts only `words`; anything else is 400 |

### 3.8 Frontend scope

- `api.ts` additions: `startProcessing(videoId, clipCount?)`, `getJob(id)`, and `getVideo(id, { includeWords? })` updated to the new response shape.
- New protected route `/videos/:id`. Library rows link to it.
- Detail page: title, status badge, size, duration, uploaded date. A "Generate transcript" button, enabled when the status is `uploaded` or `failed` (label "Retry" when `failed`),
  disabled otherwise. Show `failureReason` when failed.
- While the latest job is `queued` or `running`: show a progress bar and poll `getJob` every 2 seconds using TanStack Query `refetchInterval`
  (return `false` once the job is `succeeded` or `failed`, so polling stops). When it finishes, invalidate the video query.
- Transcript viewer when `transcript` exists: provider, language, word count, and the segments as rows with an `mm:ss` start time and text. No words, no editing.
- No polling on any other page.

## 4. Task list (in order)

1. Step 0 (section 2).
2. Install `bullmq` in backend and worker; read its installed docs; record the exact version.
3. Move storage and ffprobe into `shared/src/node/`; update backend imports; rebuild; confirm the existing upload still works.
4. Add constants and DTOs; rebuild shared.
5. Worker: env validation, Mongo and Redis connections, BullMQ worker with the `transcribe` processor, providers, audio extraction.
6. Backend: queue producer, `POST /api/videos/:id/clip`, `GET /api/jobs/:id`, updated `GET /api/videos/:id`.
7. Frontend: `api.ts`, detail page, route, library links.
8. README: worker env vars, mock vs real provider, how a job flows, and any new decisions.
9. Run all verification in section 5 and paste real outputs.

## 5. Verification (paste real outputs)

Prerequisites: services running, `npm run dev:backend` and `npm run dev:worker` running, provider `mock`.

```bash
ffmpeg -f lavfi -i testsrc=duration=20:size=640x360:rate=30 -f lavfi -i sine=frequency=440:duration=20 \
  -c:v libx264 -c:a aac -shortest sample20.mp4
ffmpeg -f lavfi -i testsrc=duration=10:size=640x360:rate=30 -an -c:v libx264 noaudio.mp4

# login as a@test.com, upload both (note the two video ids: V1 = sample20, V2 = noaudio)
curl -s -c jar.txt -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"a@test.com","password":"password123"}'
curl -s -b jar.txt -F "file=@sample20.mp4" http://localhost:4000/api/videos/upload     # -> V1
curl -s -b jar.txt -F "file=@noaudio.mp4"  http://localhost:4000/api/videos/upload     # -> V2

# 1. auth and isolation
curl -i -X POST http://localhost:4000/api/videos/<V1>/clip -H "Content-Type: application/json" -d '{}'          # 401
# (log in as b@test.com into jar2.txt first)
curl -i -b jar2.txt -X POST http://localhost:4000/api/videos/<V1>/clip -H "Content-Type: application/json" -d '{}'  # 404

# 2. validation
curl -i -b jar.txt -X POST http://localhost:4000/api/videos/<V1>/clip -H "Content-Type: application/json" -d '{"clipCount":9}'  # 400
curl -i -b jar.txt -X POST http://localhost:4000/api/videos/not-an-id/clip -H "Content-Type: application/json" -d '{}'          # 404

# 3. start V1 and try to double-start
curl -s -b jar.txt -X POST http://localhost:4000/api/videos/<V1>/clip -H "Content-Type: application/json" -d '{}'  # 202 {job} queued
curl -i -b jar.txt -X POST http://localhost:4000/api/videos/<V1>/clip -H "Content-Type: application/json" -d '{}'  # 409

# 4. poll the job until it finishes (show status/progress each time)
for i in $(seq 1 20); do curl -s -b jar.txt http://localhost:4000/api/jobs/<JOB1>; echo; sleep 1; done

# 5. detail: transcribed, transcript present, words only when asked
curl -s -b jar.txt http://localhost:4000/api/videos/<V1>                      # status transcribed, provider mock, segments > 0, wordCount > 0, no "words"
curl -s -b jar.txt "http://localhost:4000/api/videos/<V1>?include=words"      # words present, starts non-decreasing, last end <= durationSec + 1
curl -i -b jar.txt "http://localhost:4000/api/videos/<V1>?include=bogus"      # 400

# 6. a finished video cannot be restarted
curl -i -b jar.txt -X POST http://localhost:4000/api/videos/<V1>/clip -H "Content-Type: application/json" -d '{}'  # 409

# 7. no-audio failure: non-retryable, video failed, retry allowed and fails again with a NEW job
curl -s -b jar.txt -X POST http://localhost:4000/api/videos/<V2>/clip -H "Content-Type: application/json" -d '{}'
# poll the job: status failed, error.code NO_AUDIO, attempts 1
curl -s -b jar.txt http://localhost:4000/api/videos/<V2>      # status failed, failureReason set, latestJob failed
curl -s -b jar.txt -X POST http://localhost:4000/api/videos/<V2>/clip -H "Content-Type: application/json" -d '{}'   # 202, a different job id
```

Also verify and report:
- No `*.mp3` files remain in `<LOCAL_STORAGE_DIR>/tmp` after the success and failure cases.
- `mongosh`: exactly one `transcripts` document for V1; `jobs` for V2 has two failed documents with `error.code: 'NO_AUDIO'`.
- Worker env validation: start the worker with `TRANSCRIPTION_PROVIDER=groq` and no `GROQ_API_KEY`; it must fail fast with a readable error (paste it). Then restore `mock`.
- `grep -rn "process.env" backend/src worker/src shared/src` matches only the two `config/env.ts` files.
- `grep -r "shared/models\|shared/node" frontend/src` returns nothing. `grep -rn "fetch(\|XMLHttpRequest" frontend/src` matches only `frontend/src/lib/api.ts`.
- `npm run typecheck` and `npm run build` pass with zero errors.

**Manual checks I will do:** UI flow with mock (upload, open the video, generate transcript, watch the progress bar, see the transcript); then switch to Groq with a real spoken-word video and check that the transcript text matches the speech.

## 6. Out of scope (do not build)

Credits spending/refunds, moment detection, clip rendering, captions styling, scheduling, chunked transcription, direct-to-R2 uploads, rate limiting, admin pages, webhooks, and any retry UI beyond the "Retry" button.

## 7. Definition of done

All section 5 commands return the expected results, the existing auth/upload flow still works after the storage/ffprobe move, typecheck and build are clean, and Step 0 is resolved or escalated.

## 8. Notes for the reviewer (me)

Handoff 4 will be slice 4.3 (heuristic moment detection) and will consume the mock transcript shape from 3.5.

## 9. Final report format, then STOP

1. Step 0: result of 0.1 to 0.6 with real outputs.
2. Exact version of `bullmq` (with `package.json` paths) and anything BullMQ-specific you verified in its docs (connection options, non-retryable failures, final-attempt detection).
3. Real output of every command in section 5, in order.
4. Which provider endpoint URLs and model names you could verify, and which remain `[Assumption]`.
5. Deviations from this file with reasons; anything tagged `[Assumption]` or `[Unknown]`; open questions.

Do NOT start Handoff 4. Wait for the user.
