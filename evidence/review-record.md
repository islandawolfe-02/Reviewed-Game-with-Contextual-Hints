# P3 local review record (use when no hosted PR is available)

This is a local review record, not a hosted pull request or merge approval. The hosted PR on GitHub
(`p3-hints` → `main`, `islandawolfe-02/Reviewed-Game-with-Contextual-Hints`) is the primary review; copy its
number, CI result and decision comment here.

| Field | Record |
|---|---|
| Base revision / proposal revision | `main` = `9351d13` (unchanged starter) / `p3-hints` head (see `git log --oneline -1 p3-hints`) |
| Complete changed file list (`git diff --name-only BASE PROPOSAL`) | `ARCHITECTURE.md`, `README.md`, `evidence/browser-checks.md`, `evidence/evaluation-record.md`, `evidence/evidence.md`, `evidence/review-record.md`, `evidence/outputs/02-…` to `08-…` (7 files), `project/game/browser/app.mjs`, `project/game/browser/index.html`, `project/game/src/presentation.ts`, `project/game/tests/hint-flow.test.mjs`, `project/game/tests/presentation.test.mjs` |
| Design decision (feature, boundary, fallback choice) | Reference game throughout. Feature: show the allowed moves for the current state and why the offered hint is permitted. Boundary: one pure presentation module (`src/presentation.ts`) between the envelope and the DOM; legality stays in `allowedActions`, validation and fallback stay in the supplied server adapter. Fallback: supplied rule, first allowed move in N/E/S/W order, `null` when none. Stale advice: compare the saved `stateVersion` after the await (inside `adviceView`). |
| Authored changes | pending (owner) |
| Assisted changes (and how each was inspected) | pending (owner) |
| Checks run (command, location, revision, result) | `make test CANDIDATE=project/game`, work laptop WSL, `9351d13`: 29/29 · `node --test tests/*.test.mjs`, WSL, `2b07d97`: first 46/47 (A2 assertion), then 47/47 · `npm run fixtures`, WSL: F01–F11 pass · headless Chromium run, WSL, `dcf9703`: all five browser checks as expected · `lab.py serve` success/validation/timeout + POST, WSL: IDs match events. Mac and CI results: pending |
| Reviewer findings and resolution (location, concern, consequence, verification) | pending (owner, in the PR) |
| Reviewer decision (approve / request changes / pending named evidence) | pending (owner, as a PR comment) |
| Remaining limitations | All modes are local stubs, so usefulness of real model advice is not established. The stub's choice does not reason about the treasure. A discarded stale response still logs a normal terminal event (the server cannot know the browser discarded it). The work-laptop browser run is headless and scripted. BP items pending. |
| Remaining step (e.g. hosted PR in an authorised environment) | Hosted PR on GitHub (facilitator-approved route), CI p3-gates green, decision comment, merge |
