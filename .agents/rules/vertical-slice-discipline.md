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
