# P3 real-browser checks (not covered by the fixed suite)

Work-laptop column: a scripted run in headless Chromium 149.0.7827.55 (Playwright 1.61.0), WSL Ubuntu-26.04,
2026-11-25, against `node dist/server.js --mode <mode> --port 4311`. Full transcript:
[outputs/05](outputs/05-browser-run-headless-chromium.txt). The Mac column is a check by hand in a normal browser.

| Check | Steps | Expected | Observed (date, browser): work laptop, headless | Observed on Mac (date, browser) |
|---|---|---|---|---|
| Loading | `MODE=timeout`; click Hint | "Loading advice..." and Hint disabled; move buttons still work | "Loading advice...", Hint disabled `true`; East accepted while waiting (moves 6 → 5) | executed on Mac (2026-11-26), Safari. Owner answered "yes" to seeing "Loading advice..." with Hint temporarily disabled for about two seconds. Movement during a pending request is supported by the [stale move capture](mac/p3-stale-move.png). Loading check passed (owner observation; no loading screenshot). |
| Unavailable server | Load page, stop the server (Ctrl+C), click Hint, then East | "Advice unavailable; keep playing."; East still moves | "Advice unavailable; keep playing."; East → "Moved east.", moves 6 → 5, allowed moves now (1,0): east, west | executed on Mac (2026-11-26), Safari. [Unavailable](mac/p3-unavailable.png): "Advice unavailable; keep playing.", (0,0), moves 6, score 0, collected `[]`, playing. [East still works](mac/p3-unavailable-move.png): "Moved east.", (1,0), moves 5, score 0, collected `[]`, playing; allowed east, west. Both screenshots inspected; check passed. |
| Stale state | `MODE=timeout`; click Hint, then move or Reset before it returns | "State changed while waiting; request fresh advice."; old advice not shown | Move: stale message after ~2 s, old east-from-(0,0) advice not shown. Reset: same stale message, "New game." at (0,0) | executed on Mac (2026-11-26), Safari. [Move](mac/p3-stale-move.png): (1,0), moves 5, score 0, collected `[]`, playing; stale message shown. [Reset](mac/p3-stale-reset.png): (0,0), moves 6, score 0, collected `[]`, playing; same stale message, "New game." Both screenshots inspected; stale move/reset checks passed. Timeout events are in [10](outputs/10-mac-timeout-host.txt); screenshots do not show request IDs, so no individual event-to-screenshot match is claimed. |
| Advice does not move | Note moves remaining; click Hint | Same moves remaining, position, score, collected | `MODE=success` at (0,0): "moves remaining: 6 \| score: 0" before and after; `#state` text identical (`true`) | executed on Mac (2026-11-26), Safari. Success-mode [before](mac/p3-hint-before.png) / [after](mac/p3-hint-after.png) show visible state unchanged, request `hint-64c29fa3` ([09](outputs/09-mac-success-host.txt)). Timeout-mode [full before](mac/p3-full-before.png) / [after fallback](mac/p3-timeout.png) show identical expanded complete state: (0,0), moves 6, score 0, collected `[]`, playing. Full-state comparison passed for timeout fallback. |
| Your visible change | Allowed moves + why the hint is permitted | `#allowed` follows every move; `#why` explains the offered move against that list | (0,0) "Allowed moves from (0,0): east, south." → after East "(1,0): east, west." → (2,1) "north, south" → won "none (status: won)". Why: "Permitted: east is an allowed move from (0,0) (east, south)."; fallback adds "Fallback rule: the first allowed move in north, east, south, west order." | executed on Mac (2026-11-26), Safari. [Start](mac/p3-hint-after.png): allowed east, south. [Near goal](mac/p3-near-goal.png): (2,1), playing, moves 3, score 10, collected `["t1"]`; allowed north, south; suggested south with "Permitted: south is an allowed move from (2,1) (north, south).", request `hint-f7d40a7c`. [Won](mac/p3-won.png): (2,2), won, moves 2, score 10, collected `["t1"]`; allowed "none (status: won)". Previous hint and why from (2,1) remain visible after the move (see observation below). Fallback explanation also confirmed in [validation](mac/p3-validation.png); intermediate (2,0) is not captured. |
| Timeout fallback | Reset; Hint; wait without moving | Fallback east; state unchanged; page request ID matches timeout event | See work-laptop transcript [05](outputs/05-browser-run-headless-chromium.txt) | executed on Mac (2026-11-26), Safari. [Screenshot](mac/p3-timeout.png): fallback east, request `hint-8afaf086`; why names east from (0,0) and first allowed move in north, east, south, west order. Matches [11](outputs/11-mac-timeout-fallback.txt): `timeout`, `fallback: true`. Complete state unchanged from [before](mac/p3-full-before.png). Passed. |
| Validation fallback | Reload in validation mode; Hint | Illegal north replaced by fallback east; why explains permission and fallback order | See work-laptop transcript [05](outputs/05-browser-run-headless-chromium.txt) | executed on Mac (2026-11-26), Safari. [Screenshot](mac/p3-validation.png): fallback east, request `hint-02aa9ac7`; permission and deterministic fallback rule shown. Complete state is (0,0), moves 6, score 0, collected `[]`, playing. Matches [12](outputs/12-mac-validation-fallback.txt): `validation-failure`, `fallback: true`. Passed. |

Page errors in the headless run: none, except the expected `net::ERR_CONNECTION_REFUSED` in the stopped-server check.

Mac screenshots, executed on Mac (2026-11-26), Safari, captured by the owner and inspected:
[success before](mac/p3-hint-before.png) and [success after](mac/p3-hint-after.png) confirm visible state
unchanged; their complete-state sections are collapsed. The later [full before](mac/p3-full-before.png)
and [timeout after](mac/p3-timeout.png) show the same expanded complete state:
`{"position":{"x":0,"y":0},"movesRemaining":6,"score":0,"collected":[],"status":"playing"}`.
The timeout request `hint-8afaf086` matches [11](outputs/11-mac-timeout-fallback.txt). The validation
request `hint-02aa9ac7` in [its screenshot](mac/p3-validation.png) matches [12](outputs/12-mac-validation-fallback.txt).
The owner confirmed loading text and temporary Hint disabling on 2026-11-26; recorded in the Loading row.

Mac near-goal and won screenshots, executed on Mac (2026-11-26), Safari:

- [Near goal](mac/p3-near-goal.png): expanded complete state shows
  `{"position":{"x":2,"y":1},"movesRemaining":3,"score":10,"collected":["t1"],"status":"playing"}`.
  The page offers south with request `hint-f7d40a7c`; its matching terminal event has not been supplied.
- [Won](mac/p3-won.png): expanded complete state shows
  `{"position":{"x":2,"y":2},"movesRemaining":2,"score":10,"collected":["t1"],"status":"won"}`.
  Allowed moves updates to "none (status: won)".
- Observation for owner review: the won screenshot still displays the previous suggested south and
  "Permitted: south is an allowed move from (2,1) (north, south)." The advice refers to the previous square
  after an accepted move. These captures predate the correction recorded below; the final owner review decision remains pending.

Optional automation: an example Playwright 1.61.0 spec is provided to facilitators; it is not required.

Correction after the owner approved the fix (2026-11-26): `browser/app.mjs` clears completed advice and
its why line after an accepted move. A pending request keeps "Loading advice..." until its response is
discarded as stale. Rejected moves retain advice because state is unchanged. The two new tests run the
actual page event handlers with a DOM substitute: [18](outputs/18-mac-all-tests-after-advice-fix.txt),
49/49 passed on Mac, including advice clearing after a win and preserving loading during a move.
Executed on Mac (2026-11-26), Safari: the owner-captured [corrected won screenshot](mac/p3-won-fixed.png)
was inspected. It shows (2,2), won, moves 2, score 10, collected `["t1"]`, allowed moves none, with
both the previous hint and why line absent. The corrected winning display passed Safari verification.
The original [won screenshot](mac/p3-won.png) remains unchanged as evidence of the original issue.
