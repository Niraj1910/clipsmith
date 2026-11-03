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
