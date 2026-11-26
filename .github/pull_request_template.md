## Change
* **What and why:**
* **Files changed** (`git diff --name-only origin/main HEAD`):
* **Supplied adapter changed?** none expected (`src/handler.ts`, `request-hint.ts`, `validation.ts`, `clients.ts`, `instrumentation.ts`, `server.ts`, `tests/evaluation.test.mjs`, `tests/signals.test.mjs`)
* **Assisted changes and how they were inspected:** see `evidence/review-record.md`

## Checks run
* `python3 lab.py test --candidate project/game`: ____
* `cd project/game && npx tsc -p tsconfig.json && node --test tests/*.test.mjs`: ____
* CI p3-gates: ____

## Review decision (self-review; record as a PR comment before merging)
Reviewer: islandawolfe-02 (self). Decision: approve / request changes / pending named evidence. Reason: ____
