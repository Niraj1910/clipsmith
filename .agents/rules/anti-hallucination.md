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
