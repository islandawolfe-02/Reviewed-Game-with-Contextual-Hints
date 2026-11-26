# Reviewed Game with Contextual Hints

[![p3-gates](https://github.com/islandawolfe-02/Reviewed-Game-with-Contextual-Hints/actions/workflows/p3-gates.yml/badge.svg)](https://github.com/islandawolfe-02/Reviewed-Game-with-Contextual-Hints/actions/workflows/p3-gates.yml)

Project 3 (BP Software Engineering Academy, Week 3) is a treasure-hunt game with a hint button that fails gracefully.
The player asks for advice about the current state; the server derives the permitted moves, checks the advice
and falls back to a fixed legal move when the advice is invalid, late or unavailable. Asking never spends a move.
The page also shows the allowed moves for the current state and **why** the offered hint is permitted.

> **Scope.** Local only: the supplied Node host on `127.0.0.1:4310` with deterministic local stubs. No live model,
> no credentials, no BP environment. `source: model` names the adapter path, not a model call. Terminal events are
> local evidence, not Grafana. BP Yalla, the BP pull request and BP deployment are **pending**.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the request path, the refactored boundary and who owns what.

## The game
- Board 3×3: start (0,0), wall (1,1), treasure t1 at (2,0) worth 10, exit (2,2), 6 moves.
- **Win:** reach the exit holding t1. **Lose:** run out of moves. Winning route: East, East, South, South.
- **Hint:** one permitted next move with a short explanation, its source (`model`/`fallback`) and a request ID.
- **Fallback:** the first allowed move in north, east, south, west order, or no hint when nothing is allowed.

| Condition | Player sees | Game |
|---|---|---|
| Waiting | "Loading advice..."; Hint disabled | Move buttons still work |
| Valid advice | "Suggested: east - … (source: model, request ID: hint-…)" + why it is permitted | Nothing moves |
| Invalid advice / timeout / provider failure | The fallback move, `source: fallback` | Still playable; the event names the cause |
| Server unreachable | "Advice unavailable; keep playing." | Moves still work locally |
| State changed while waiting | "State changed while waiting; request fresh advice." | Old advice discarded |
| Game over | "No permitted action." | No model call |

## Quick start
```bash
(cd project/game && npm ci)                      # once: pinned TypeScript 5.9.3
make test CANDIDATE=project/game                 # the 29 supplied adapter checks
make serve CANDIDATE=project/game MODE=success   # http://127.0.0.1:4310 ; Ctrl+C stops it
```
Without make: `python3 lab.py test --candidate project/game` and
`python3 lab.py serve --candidate project/game --mode success [--port 4311]`.

Modes: `success`, `validation` (well-shaped but illegal), `timeout` (2 s deadline), `malformed`, `provider-failure`,
`irrelevant` ("Bananas are yellow."). Each request prints one event line:
`{"requestId":"hint-…","latencyMs":…,"outcome":"validation-failure","fallback":true}`.

## Checks
| Command (from `project/game` unless noted) | What it runs | Result (recorded) |
|---|---|---|
| `make test CANDIDATE=project/game` (repo root) | 29 supplied checks: H01–H06 + 5 signal checks | 29 pass |
| `npx tsc -p tsconfig.json && node --test tests/*.test.mjs` | supplied checks + own unit, HTTP integration and browser-handler tests | 49 pass (Mac, 2026-11-26) |
| `npm run fixtures` | rule evaluator against F01–F11 | all pass |

Own tests: `tests/presentation.test.mjs` (the refactored component, normal + boundary) and
`tests/hint-flow.test.mjs` (browser client → real host → handler → validator → event → display, cases A1–A7),
and `tests/browser-app.test.mjs` (advice clearing and pending-loading behavior in actual page handlers with a DOM substitute).
Real outputs are in [`evidence/outputs/`](evidence/outputs/); the records are in [`evidence/`](evidence/).

## Repository workflow
`main` holds the supplied starter unchanged (the baseline). The P3 work is on the personal branch `p3-hints` and
merges through a pull request with CI (`.github/workflows/p3-gates.yml`: supplied checks, all tests, fixtures and
a smoke run of the host in validation mode). CI never deploys.

## Status
| Completion check | Status |
|---|---|
| Hint about the current state through the supplied server boundary | done; Mac Safari checks recorded (2026-11-26) |
| One bounded refactor with interface and independent tests | done (`src/presentation.ts`) |
| Advice never changes state; only player moves apply rules | done (tests A5, browser run) |
| Invalid advice and failures give a deterministic legal fallback or null; unavailable server keeps play going | done |
| Loading and stale-state behaviour in the browser | done; Safari captures and owner loading confirmation recorded (Mac, 2026-11-26) |
| Request ID linked to its event; timeout vs validation failure | done |
| Tests and human usefulness judgements recorded separately | done; owner agreed with all five judgments (2026-11-26) |
| PR review record | owner approval recorded; PR #1 merged |
| Final candidate in the local host, URL and restart command | done (Mac, 2026-11-26): merged release success and validation verified; owner confirmed win |
