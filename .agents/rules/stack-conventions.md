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
