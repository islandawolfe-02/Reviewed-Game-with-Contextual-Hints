# P3 evidence record (keep it short)

Pair / personal branch: `p3-hints` (personal branch); solo submission (owner-confirmed; no partner)

Labels: *executed on work laptop (WSL, 2026-11-25)* = WSL Ubuntu-26.04, Node v22.22.1, Python 3.14.4;
*executed on Mac (date)*; *pending*. Raw transcripts are in [`outputs/`](outputs/). Commit hashes are the ones in
the bundle (`p3.bundle`); if the history is re-authored on the Mac, update them from `git log --oneline`.

| Milestone | Commit | Command(s) run | Actual result | Observed / unverified |
|---|---|---|---|---|
| Baseline (`make test CANDIDATE=project/game`) | `9a33967` Baseline: starter copied unchanged | `make test CANDIDATE=project/game` | tests 29, pass 29, fail 0, `PASS supplied adapter checks` ([01](outputs/01-baseline-supplied-checks.txt)) | executed on work laptop (WSL, 2026-11-25); Mac supplied re-check 29/29 passed (2026-11-26), working tree after correction ([15](outputs/15-mac-supplied-after-advice-fix.txt)) |
| Refactor: interface + normal/boundary tests | `a0715fe` Extract hint presentation | `npx tsc -p tsconfig.json && node --test tests/presentation.test.mjs`, then `make test CANDIDATE=project/game` | 10/10 own unit tests pass; 29/29 supplied still pass ([02](outputs/02-refactor-presentation-tests.txt)) | executed on work laptop (WSL, 2026-11-25) |
| Hint integrated (state unchanged after advice) | `8f323b2` Show allowed moves and why | headless Chromium run ([05](outputs/05-browser-run-headless-chromium.txt)); test A5 | After Hint at (0,0): "Suggested: east - Explore the open eastern square. (source: model, request ID: hint-ffbe758e)", status still "moves remaining: 6", `#state` unchanged: `true` | executed on work laptop (WSL, 2026-11-25, headless). Executed on Mac (2026-11-26), Safari: [before](mac/p3-hint-before.png) / [after](mac/p3-hint-after.png) show (0,0), playing, moves 6 and score 0 unchanged; after Hint shows request `hint-64c29fa3`, matching [09](outputs/09-mac-success-host.txt). Success screenshots have complete state collapsed; later timeout [full before](mac/p3-full-before.png) / [after](mac/p3-timeout.png) confirm identical complete state including collected `[]` |
| Peer trace browser → adapter → validator → display | `8f323b2` | – | Written [solo walkthrough](../ARCHITECTURE.md#solo-walkthrough) explains the hint path, legality/fallback and state isolation | written explanation completed (2026-11-26); no partner trace or owner spoken demonstration claimed |
| Rejection, fallback, UI failure states, stale discard | `8f323b2`, `be0e94c` | headless run ([05](outputs/05-browser-run-headless-chromium.txt)); tests A2, A3, A4, A7 | validation: fallback east, East still moves (6 → 5). timeout: "Loading advice...", Hint disabled `true`, East accepted while waiting, then "State changed while waiting; request fresh advice."; Hint + Reset gives the same stale message. Server stopped: "Advice unavailable; keep playing.", East moves (6 → 5) | executed on work laptop (WSL, 2026-11-25, headless); executed on Mac (2026-11-26), Safari: unavailable, stale move/reset and timeout/validation fallback passed; loading confirmed by the owner; corrected winning display verified in [Safari](mac/p3-won-fixed.png) |
| Own unit/integration checks (`node --test tests/*.test.mjs`) | `be0e94c` Add HTTP integration tests | `npx tsc -p tsconfig.json && node --test tests/*.test.mjs` | First run: 46 pass, **1 fail** (A2 assertion too broad, see below) ([03](outputs/03-all-tests-RED-broad-assertion.txt)). After the fix: tests 47, pass 47, fail 0 ([04](outputs/04-all-tests-GREEN.txt)). Fixtures F01–F11 all pass ([07](outputs/07-fixtures-F01-F11.txt)) | executed on work laptop (WSL, 2026-11-25) |
| Seeded failure diagnosed (request ID → event) | `819b81f` | `python3 lab.py serve --candidate project/game --mode validation` / `--mode timeout` + one POST ([06](outputs/06-release-candidate-local-host.txt)); browser IDs in [05](outputs/05-browser-run-headless-chromium.txt) | See "Failure linked to its event" below | executed on work laptop (WSL, 2026-11-25); executed on Mac (2026-11-26), Safari: timeout `hint-8afaf086` and validation `hint-02aa9ac7` match their terminal events |
| PR / local review decision | Reviewed head `69326ab64a13116293f1d141cb3aab4469b3d18f` | Read-only hosted patch and CI inspection; [19](outputs/19-hosted-pr-review.txt) | [PR #1](https://github.com/islandawolfe-02/Reviewed-Game-with-Contextual-Hints/pull/1): CI passed; technical review and assistance records prepared | recorded on Mac (2026-11-26); owner approval communicated on 2026-11-26; PR #1 merged as `468a9083`; hosted decision comment not checked |
| Release candidate in local host (URL, restart command) | `819b81f` | `python3 lab.py serve --candidate project/game --mode success` | `http://127.0.0.1:4310`, `/healthz` → `Healthy`, `/dist/presentation.js` → 200, hint `hint-dd788eeb` model-success ([06](outputs/06-release-candidate-local-host.txt)). Restart: Ctrl+C, then the same command (it recompiles) | executed on work laptop (WSL, 2026-11-25); executed on Mac (2026-11-26), Safari: release check passed at `468a9083`: success hint and validation fallback verified in Safari; winning route confirmed by owner (see post-merge check) |

## Mac visible-change check

Executed on Mac (2026-11-26), Safari, owner-captured screenshots inspected:

- [Near goal](mac/p3-near-goal.png): (2,1), playing, moves 3, score 10, collected `["t1"]`.
  Allowed moves: north, south. Suggested south; the why line names (2,1) and both allowed moves.
  Page request ID: `hint-f7d40a7c`; matching terminal event pending.
- [Won](mac/p3-won.png): (2,2), won, moves 2, score 10, collected `["t1"]`.
  Allowed moves updates to "none (status: won)". The previous south hint and its why line from (2,1)
  remain visible after the move in the original capture; the owner authorized a correction, recorded below. Owner approval was communicated on 2026-11-26; PR #1 merged as `468a9083`; the hosted decision comment has not been checked.

These screenshots verify the near-goal and terminal displays. Intermediate-square screenshots and the
Mac fallback explanation is now confirmed in [validation](mac/p3-validation.png). The later timeout
[full before](mac/p3-full-before.png) / [after](mac/p3-timeout.png) confirm unchanged complete state.

Mac unavailable-server check: executed on Mac (2026-11-26), Safari. Owner-captured
[unavailable](mac/p3-unavailable.png) and [subsequent East move](mac/p3-unavailable-move.png) screenshots
inspected: advice unavailable at (0,0), moves 6; East still moves to (1,0), moves 5, allowed east, west.
Score remains 0, collected remains `[]`, and status remains playing. Check passed.

Mac stale-response checks: executed on Mac (2026-11-26), Safari. Owner-captured
[move](mac/p3-stale-move.png) and [reset](mac/p3-stale-reset.png) screenshots inspected: both show
"State changed while waiting; request fresh advice." Move leaves (1,0), moves 5; reset leaves (0,0),
moves 6. Both have score 0, collected `[]`, playing. Stale move/reset checks passed.
[10](outputs/10-mac-timeout-host.txt) preserves the timeout host transcript with three timeout events.
No request ID is visible in these stale screenshots, so they are not mapped individually to events.
The later non-stale timeout screenshot supplies a matching browser ID, recorded below.
The owner confirmed loading text and temporary Hint disabling on 2026-11-26.

## Review correction: clear completed advice after a move

Executed on Mac (2026-11-26), working tree including the correction; no new commit is claimed.
The owner confirmed the loading check and authorized fixing the previous advice remaining visible.
In the supplied browser file `project/game/browser/app.mjs`, the accepted-move branch now calls
`showAdvice('')` only when Hint is not disabled. This clears both advice and why, preserves pending
loading, and leaves rejected moves unchanged. No supplied adapter, fixture or fixed test was edited.
Added `tests/browser-app.test.mjs`, using actual page handlers with a DOM substitute and controlled
hint responses; expectations use the reference board facts.

- [13](outputs/13-mac-browser-advice-RED.txt): new regression test reproduced the original retained-advice issue; 1/2 passed.
- [14](outputs/14-mac-browser-test-wording-RED.txt): after the code fix, a new test's allowed-moves string omitted "from (2,2)". Corrected this wording to include the independently specified terminal position and existing display format; kept this failed transcript. No supplied expectation changed.
- [15](outputs/15-mac-supplied-after-advice-fix.txt): supplied checks, 29/29 passed.
- [16](outputs/16-mac-all-tests-after-advice-fix.txt): initial full-suite attempt could not bind local HTTP listeners (`EPERM`); retained as an environment failure.
- [17](outputs/17-mac-fixtures-after-advice-fix.txt): F01–F11 passed.
- [18](outputs/18-mac-all-tests-after-advice-fix.txt): full suite with local HTTP access, 49/49 passed, including both new browser-handler regression tests.

Executed on Mac (2026-11-26), Safari: [corrected won screenshot](mac/p3-won-fixed.png) inspected.
It shows (2,2), won, moves 2, score 10, collected `["t1"]`, allowed moves none, and no previous advice
or why line. Corrected winning display verified. Original screenshots remain evidence of the issue;
the owner communicated approval on 2026-11-26. PR #1 merged as `468a9083`; the hosted decision comment has not been checked.

## Post-merge Mac release check

Executed on Mac (2026-11-26), Safari, owner-captured screenshots inspected. Revision:
`468a9083f1584ad848a988302fb55bd8df4bdd7b`, merge of PR #1 ([20](outputs/20-mac-release-revision.txt)).
URL: `http://127.0.0.1:4310`. Restart: stop with Ctrl+C, then rerun the same serve command.

- Success startup: [host transcript](outputs/21-mac-release-success-host.txt) confirms successful compilation
  and startup in success mode. The [screenshot](mac/p3-release-success.png) shows (0,0), playing, moves 6,
  score 0, collected `[]`, and allowed east, south. It contains no displayed hint, and this host transcript
  contains no request event. This initial capture did not establish a success hint; the follow-up below completes that check.
- Validation fallback: [screenshot](mac/p3-release-validation.png) shows fallback east and the permission /
  deterministic fallback explanation, with unchanged initial complete state. Page ID `hint-57a19731`
  matches the exact [terminal event](outputs/22-mac-release-validation-host.txt):
  `{"requestId":"hint-57a19731","latencyMs":2.605542000001151,"outcome":"validation-failure","fallback":true}`.
  Validation release check passed.

- Success hint follow-up: [screenshot](mac/p3-release-success-hint.png) inspected. It shows suggested east,
  its permission explanation and expanded initial state: (0,0), playing, moves 6, score 0, collected `[]`.
  Page ID `hint-1093acd1` matches the exact [terminal event](outputs/23-mac-release-success-hint.txt):
  `{"requestId":"hint-1093acd1","latencyMs":8.059625000001688,"outcome":"model-success","fallback":false}`.
  Success hint release check passed.
- Winning route: the owner reported "done and it won" after following East, East, South, South in the
  same release check. This is the owner's reported result; no additional winning screenshot is claimed.

Overall release check: passed, executed on Mac (2026-11-26), Safari, merged revision `468a9083`.
This completes milestone 9; the separate individual demonstration remains pending.

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

Mac browser-to-event matches: executed on Mac (2026-11-26), Safari.

| Mode | Screenshot / page request ID | Exact matching terminal event | Raw transcript |
|---|---|---|---|
| timeout | [Screenshot](mac/p3-timeout.png), `hint-8afaf086` | `{"requestId":"hint-8afaf086","latencyMs":2007.274584000028,"outcome":"timeout","fallback":true}` | [11](outputs/11-mac-timeout-fallback.txt) |
| validation | [Screenshot](mac/p3-validation.png), `hint-02aa9ac7` | `{"requestId":"hint-02aa9ac7","latencyMs":4.020625000004657,"outcome":"validation-failure","fallback":true}` | [12](outputs/12-mac-validation-fallback.txt) |

Both screenshots offer east with the deterministic fallback explanation. Timeout full state matches its
[before screenshot](mac/p3-full-before.png): (0,0), moves 6, score 0, collected `[]`, playing.

Both show the same fallback text. The `outcome` field (and the ~2000 ms latency) tells them apart. These are terminal
events, local evidence only, not Grafana. The same pair from the manual's serve command with `curl`:
`hint-fe0c1bc8` → `validation-failure`, `hint-c43bea17` → `timeout` ([06](outputs/06-release-candidate-local-host.txt)).

Evaluation judgments: the owner reviewed and agreed with all five entries in
[evaluation-record.md](evaluation-record.md) on 2026-11-26 ("I agree").

## Gameplay handover

Provided by the owner on Mac (2026-11-26): [gameplay recording](mac/p3-gameplay.mov),
78,648,015 bytes. File presence verified; the video contents have not been independently reviewed.
The owner chose a gameplay recording and skipped the spoken demonstration. No spoken presentation or
partner review is claimed. The written solo walkthrough remains in [ARCHITECTURE.md](../ARCHITECTURE.md#solo-walkthrough).

Unfinished criteria (honest list):
- Hosted approval comment verification; approval was communicated on 2026-11-26 and PR #1 is merged.
- Spoken demonstration skipped by owner; gameplay recording provided as handover evidence.
- BP items (Yalla, BP PR, BP deployment): pending.
