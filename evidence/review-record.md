# P3 local review record (use when no hosted PR is available)

This is a local review record, not a hosted pull request or merge approval. The hosted PR on GitHub
(`p3-hints` → `main`, `islandawolfe-02/Reviewed-Game-with-Contextual-Hints`) is the primary review; copy its
number, CI result and decision comment here.

| Field | Record |
|---|---|
| Base revision / proposal revision | `main` = `9a33967` (unchanged starter) / `p3-hints` head (see `git log --oneline -1 p3-hints`) |
| Complete changed file list (`git diff --name-only BASE PROPOSAL`) | `ARCHITECTURE.md`, `README.md`, `evidence/browser-checks.md`, `evidence/evaluation-record.md`, `evidence/evidence.md`, `evidence/review-record.md`, `evidence/outputs/02-…` to `08-…` (7 files), `project/game/browser/app.mjs`, `project/game/browser/index.html`, `project/game/src/presentation.ts`, `project/game/tests/hint-flow.test.mjs`, `project/game/tests/presentation.test.mjs` |
| Design decision (feature, boundary, fallback choice) | Reference game throughout. Feature: show the allowed moves for the current state and why the offered hint is permitted. Boundary: one pure presentation module (`src/presentation.ts`) between the envelope and the DOM; legality stays in `allowedActions`, validation and fallback stay in the supplied server adapter. Fallback: supplied rule, first allowed move in N/E/S/W order, `null` when none. Stale advice: compare the saved `stateVersion` after the await (inside `adviceView`). |
| Authored changes | pending (owner) |
| Assisted changes (and how each was inspected) | pending (owner) |
| Checks run (command, location, revision, result) | `make test CANDIDATE=project/game`, work laptop WSL, `9a33967`: 29/29 · `node --test tests/*.test.mjs`, WSL, `be0e94c`: first 46/47 (A2 assertion), then 47/47 · `npm run fixtures`, WSL: F01–F11 pass · headless Chromium run, WSL, `8f323b2`: all five browser checks as expected · `lab.py serve` success/validation/timeout + POST, WSL: IDs match events. Mac working tree after the review correction (2026-11-26): 29/29 supplied checks ([15](outputs/15-mac-supplied-after-advice-fix.txt)), 49/49 all tests ([18](outputs/18-mac-all-tests-after-advice-fix.txt)), F01–F11 ([17](outputs/17-mac-fixtures-after-advice-fix.txt)); current PR CI pending |
| Reviewer findings and resolution (location, concern, consequence, verification) | pending (owner, in the PR) |
| Reviewer decision (approve / request changes / pending named evidence) | pending (owner, as a PR comment) |
| Remaining limitations | All modes are local stubs, so usefulness of real model advice is not established. The stub's choice does not reason about the treasure. A discarded stale response still logs a normal terminal event (the server cannot know the browser discarded it). The work-laptop browser run is headless and scripted. BP items pending. |
| Remaining step (e.g. hosted PR in an authorised environment) | Hosted PR on GitHub (facilitator-approved route), CI p3-gates green, decision comment, merge |

## Screenshot observation awaiting owner review

Executed on Mac (2026-11-26), Safari. The owner-captured [near-goal](mac/p3-near-goal.png) and
[won](mac/p3-won.png) screenshots were inspected. At (2,1), the page suggests south, request
`hint-f7d40a7c`, with a why line naming (2,1). After moving to (2,2), status is won and allowed moves
is "none (status: won)", while that previous suggestion and why line remain visible.

The owner authorized correcting this display issue on 2026-11-26. Completed advice and its why line
now clear on accepted moves; pending loading is preserved. Rejected moves retain advice. Two new
regression tests execute the page handlers with a DOM substitute. Executed on Mac (2026-11-26):
[29/29 supplied checks](outputs/15-mac-supplied-after-advice-fix.txt),
[49/49 all tests](outputs/18-mac-all-tests-after-advice-fix.txt), and
[F01–F11 fixtures](outputs/17-mac-fixtures-after-advice-fix.txt) passed.
The initial regression failure, new-test wording error and HTTP-listener permission failure are retained
in outputs 13, 14 and 16 and explained in [evidence.md](evidence.md).
Executed on Mac (2026-11-26), Safari: the owner-captured [corrected won screenshot](mac/p3-won-fixed.png)
was inspected. It confirms won at (2,2), moves 2, score 10, collected `["t1"]`, allowed moves none,
with previous advice and why cleared. Safari verification passed. The owner's final review decision
remains pending; this does not complete the reviewer fields above.
