# P3 real-browser checks (not covered by the fixed suite)

Work-laptop column: a scripted run in headless Chromium 149.0.7827.55 (Playwright 1.61.0), WSL Ubuntu-26.04,
2026-11-25, against `node dist/server.js --mode <mode> --port 4311`. Full transcript:
[outputs/05](outputs/05-browser-run-headless-chromium.txt). The Mac column is a check by hand in a normal browser.

| Check | Steps | Expected | Observed (date, browser): work laptop, headless | Observed on Mac (date, browser) |
|---|---|---|---|---|
| Loading | `MODE=timeout`; click Hint | "Loading advice..." and Hint disabled; move buttons still work | "Loading advice...", Hint disabled `true`; East accepted while waiting (moves 6 → 5) | pending |
| Unavailable server | Load page, stop the server (Ctrl+C), click Hint, then East | "Advice unavailable; keep playing."; East still moves | "Advice unavailable; keep playing."; East → "Moved east.", moves 6 → 5, allowed moves now (1,0): east, west | pending |
| Stale state | `MODE=timeout`; click Hint, then move or Reset before it returns | "State changed while waiting; request fresh advice."; old advice not shown | Move: stale message after ~2 s, old east-from-(0,0) advice not shown. Reset: same stale message, "New game." at (0,0) | pending |
| Advice does not move | Note moves remaining; click Hint | Same moves remaining, position, score, collected | `MODE=success` at (0,0): "moves remaining: 6 \| score: 0" before and after; `#state` text identical (`true`) | pending |
| Your visible change | Allowed moves + why the hint is permitted | `#allowed` follows every move; `#why` explains the offered move against that list | (0,0) "Allowed moves from (0,0): east, south." → after East "(1,0): east, west." → (2,1) "north, south" → won "none (status: won)". Why: "Permitted: east is an allowed move from (0,0) (east, south)."; fallback adds "Fallback rule: the first allowed move in north, east, south, west order." | pending |

Page errors in the headless run: none, except the expected `net::ERR_CONNECTION_REFUSED` in the stopped-server check.

Optional automation: an example Playwright 1.61.0 spec is provided to facilitators; it is not required.
