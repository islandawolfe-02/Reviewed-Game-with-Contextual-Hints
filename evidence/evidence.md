# P3 evidence record (keep it short)

Pair / personal branch: `p3-hints` (personal branch); pair: ______  (synthetic identifiers only, e.g. p3-team-a)

Labels: *executed on work laptop (WSL, 2026-11-25)* = WSL Ubuntu-26.04, Node v22.22.1, Python 3.14.4;
*executed on Mac (date)*; *pending*. Raw transcripts are in [`outputs/`](outputs/). Commit hashes are the ones in
the bundle (`p3.bundle`); if the history is re-authored on the Mac, update them from `git log --oneline`.

| Milestone | Commit | Command(s) run | Actual result | Observed / unverified |
|---|---|---|---|---|
| Baseline (`make test CANDIDATE=project/game`) | `9351d13` Baseline: starter copied unchanged | `make test CANDIDATE=project/game` | tests 29, pass 29, fail 0, `PASS supplied adapter checks` ([01](outputs/01-baseline-supplied-checks.txt)) | executed on work laptop (WSL, 2026-11-25); Mac re-check pending |
| Refactor: interface + normal/boundary tests | `c0e1f3a` Extract hint presentation | `npx tsc -p tsconfig.json && node --test tests/presentation.test.mjs`, then `make test CANDIDATE=project/game` | 10/10 own unit tests pass; 29/29 supplied still pass ([02](outputs/02-refactor-presentation-tests.txt)) | executed on work laptop (WSL, 2026-11-25) |
| Hint integrated (state unchanged after advice) | `dcf9703` Show allowed moves and why | headless Chromium run ([05](outputs/05-browser-run-headless-chromium.txt)); test A5 | After Hint at (0,0): "Suggested: east - Explore the open eastern square. (source: model, request ID: hint-ffbe758e)", status still "moves remaining: 6", `#state` unchanged: `true` | executed on work laptop (WSL, 2026-11-25, headless); by hand on Mac pending |
| Peer trace browser → adapter → validator → display | `dcf9703` | – | Trace written in [ARCHITECTURE.md](../ARCHITECTURE.md#one-request-traced); partner traces it aloud | pending (pair) |
| Rejection, fallback, UI failure states, stale discard | `dcf9703`, `2b07d97` | headless run ([05](outputs/05-browser-run-headless-chromium.txt)); tests A2, A3, A4, A7 | validation: fallback east, East still moves (6 → 5). timeout: "Loading advice...", Hint disabled `true`, East accepted while waiting, then "State changed while waiting; request fresh advice."; Hint + Reset gives the same stale message. Server stopped: "Advice unavailable; keep playing.", East moves (6 → 5) | executed on work laptop (WSL, 2026-11-25, headless); by hand on Mac pending |
| Own unit/integration checks (`node --test tests/*.test.mjs`) | `2b07d97` Add HTTP integration tests | `npx tsc -p tsconfig.json && node --test tests/*.test.mjs` | First run: 46 pass, **1 fail** (A2 assertion too broad, see below) ([03](outputs/03-all-tests-RED-broad-assertion.txt)). After the fix: tests 47, pass 47, fail 0 ([04](outputs/04-all-tests-GREEN.txt)). Fixtures F01–F11 all pass ([07](outputs/07-fixtures-F01-F11.txt)) | executed on work laptop (WSL, 2026-11-25) |
| Seeded failure diagnosed (request ID → event) | `23402f0` | `python3 lab.py serve --candidate project/game --mode validation` / `--mode timeout` + one POST ([06](outputs/06-release-candidate-local-host.txt)); browser IDs in [05](outputs/05-browser-run-headless-chromium.txt) | See "Failure linked to its event" below | executed on work laptop (WSL, 2026-11-25); browser-displayed ID on Mac pending |
| PR / local review decision | – | PR `p3-hints` → `main` on GitHub | – | pending (Mac PR) |
| Release candidate in local host (URL, restart command) | `23402f0` | `python3 lab.py serve --candidate project/game --mode success` | `http://127.0.0.1:4310`, `/healthz` → `Healthy`, `/dist/presentation.js` → 200, hint `hint-dd788eeb` model-success ([06](outputs/06-release-candidate-local-host.txt)). Restart: Ctrl+C, then the same command (it recompiles) | executed on work laptop (WSL, 2026-11-25); Mac re-run pending |

## Bounded refactor

- **Component and interface:** `project/game/src/presentation.ts` (compiled to `dist/presentation.js`, already on the
  host's browser allow-list).
  - `allowedMovesText(board: Board, state: GameState): string`
  - `adviceView(board: Board, requested: GameState, envelope: Envelope, savedVersion: number, currentVersion: number): { advice: string; why: string }`
  - Inputs are read only; outputs are strings. No DOM, fetch, clock or randomness. Legality comes from
    `allowedActions` in `rules.ts`; nothing here calls `evaluate` or changes state.
- **Exactly what changed from supplied code** (`git diff --stat main p3-hints -- project/game`, [08](outputs/08-candidate-diff-vs-supplied-starter.txt)):
  - added `src/presentation.ts`, `tests/presentation.test.mjs`, `tests/hint-flow.test.mjs`;
  - `browser/app.mjs`: imports `/dist/presentation.js`; `render()` fills `#allowed`; `showAdvice(text, why)` also
    fills `#why`; in `onHint` the inline stale check and the two advice strings are replaced by one `adviceView`
    call (same wording); `reset()` clears both lines;
  - `browser/index.html`: two new paragraphs, `#allowed` and `#why`.
  - Supplied adapter, rules, validator, instrumentation, host and the 29 fixed checks: unchanged.
- **Tests (normal, boundary) and their independent expectations:** `tests/presentation.test.mjs`, from board facts:
  - normal: (0,0) → "east, south" (north/west leave the board); (1,0) → "east, west" (north edge, south wall);
    model east at (0,0) → "Permitted: east is an allowed move from (0,0) (east, south)."; fallback north at (2,1) →
    names the N/E/S/W fallback rule;
  - boundary: won (2,2) and lost (0,1) → "none"; `hint: null` → "Nothing to suggest"; versions 0/1 → stale text for
    valid advice; north at (0,0) → "Not permitted"; inputs not mutated.

**Failure found and fixed (kept, not hidden):** the first full run failed A2 ("the rejected direction is never
displayed") because the check scanned the whole view for the word `north`, and the fallback-rule sentence
legitimately names the order "north, east, south, west". The code was correct. The assertion now checks the offered
move and the why line exactly. No expectation was loosened: it is stricter than before.

## Failure linked to its event

Same request ID in the response the page displays and in the terminal event line.

| Mode | Browser request ID | Displayed result | Terminal event line | Cause |
|---|---|---|---|---|
| validation | `hint-243204dd` (headless Chromium, [05](outputs/05-browser-run-headless-chromium.txt)) | "Suggested: east - A permitted next move. (source: fallback, request ID: hint-243204dd)" | `{"requestId":"hint-243204dd","latencyMs":0.6730530000000385,"outcome":"validation-failure","fallback":true}` | Well-shaped north at (0,0) is outside the allowed list `[east, south]` |
| timeout | `hint-212b15c6` (headless Chromium, [05](outputs/05-browser-run-headless-chromium.txt)) | "Suggested: east - A permitted next move. (source: fallback, request ID: hint-212b15c6)" after ~2 s | `{"requestId":"hint-212b15c6","latencyMs":2001.1672019999996,"outcome":"timeout","fallback":true}` | Hanging client stopped by the 2000 ms deadline |

Both show the same fallback text. The `outcome` field (and the ~2000 ms latency) tells them apart. These are terminal
events, local evidence only, not Grafana. The same pair from the manual's serve command with `curl`:
`hint-fe0c1bc8` → `validation-failure`, `hint-c43bea17` → `timeout` ([06](outputs/06-release-candidate-local-host.txt)).

Unfinished criteria (honest list):
- Browser checks by hand on the Mac (the work-laptop run is headless Chromium, scripted).
- Request ID read from the visible page on the Mac and matched to the terminal line, for validation and timeout.
- Peer trace by the partner (pair work).
- "Helpful? (human)" judgements in `evaluation-record.md`.
- PR review, findings and decision (`review-record.md`); the assistance record, if it applies.
- Mac re-runs of baseline, all tests and the release candidate.
- Individual demonstration.
- BP items (Yalla, BP PR, BP deployment): pending.
