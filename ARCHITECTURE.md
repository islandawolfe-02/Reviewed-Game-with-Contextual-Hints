# Architecture: Reviewed Game with Contextual Hints

One Node process (`project/game/dist/server.js`, started by `lab.py serve`) serves the page and `POST /api/hint` on
the **same origin** (`http://127.0.0.1:4310`). The browser runs the game and applies moves locally with the rule
evaluator. The server only gives advice: it never changes the game.

## Request path

```mermaid
flowchart LR
  subgraph Browser["Browser (project/game/browser)"]
    APP["app.mjs<br/>state, stateVersion<br/>move() / reset() / onHint()"]
    PRES["dist/presentation.js (P3)<br/>allowedMovesText, adviceView"]
    RULESB["dist/rules.js<br/>evaluate, allowedActions"]
    CLIENT["client.mjs<br/>askForHint (fetch POST)"]
  end
  subgraph Host["Supplied host (dist/server.js, port 4310)"]
    SRV["server.ts<br/>request ID, readJson"]
    HND["handler.ts<br/>readRequest, allowedActions"]
    ADP["request-hint.ts<br/>context projection"]
    STUB["scenarios.ts / clients.ts<br/>mode stub + 2000 ms deadline"]
    VAL["validation.ts<br/>validHint / fallbackHint"]
    INS["instrumentation.ts<br/>one terminal event"]
  end
  APP -- "player move" --> RULESB
  APP -- "render, envelope" --> PRES -- "allowedActions" --> RULESB
  APP -- "snapshot + stateVersion" --> CLIENT -- "same-origin POST /api/hint" --> SRV --> HND
  HND --> ADP --> STUB
  HND --> VAL
  HND --> INS
  SRV -- "{hint, source, requestId}" --> CLIENT
```

## One request, traced
1. `browser/app.mjs` `onHint`: saves `stateVersion`, copies the state (`structuredClone`), shows "Loading advice...",
   disables Hint.
2. `browser/client.mjs` `askForHint`: `POST /api/hint` with `{ boardId, state, stateVersion }`.
3. `src/server.ts` `createHost`: assigns `hint-xxxxxxxx`, parses the body.
4. `src/handler.ts` `handleHint`: `readRequest` checks the body; `allowedActions(board, state)` from `src/rules.ts`
   derives the permitted moves. If there are none, it returns `hint: null` with no model call (`no-action`).
5. `src/request-hint.ts` `requestHint`: sends only `{ boardId, position, movesRemaining }` + permitted actions to the
   mode client, wrapped in `withTimeout` (2000 ms).
6. `src/validation.ts`: `validHint` checks the shape and that the direction is in the permitted list; otherwise
   `fallbackHint` picks the first permitted move (N, E, S, W) or null.
7. `src/instrumentation.ts` `recordHint` → `server.ts` `eventSink`: one line `{requestId, latencyMs, outcome, fallback}`.
8. Back in `onHint`: `adviceView(board, snapshot, envelope, savedVersion, stateVersion)` from
   `src/presentation.ts` returns the advice line and the why line, or the stale message if the version changed.
   `finally` re-enables Hint. On a network error, `catch` shows "Advice unavailable; keep playing."

The hint flow never assigns live browser `state`; only `move()` and `reset()` in `app.mjs` do.
`allowedActions()` uses pure rule evaluation to inspect possible moves without applying one to live state.

After an accepted move, completed advice and its why line are cleared. While a hint is pending,
loading stays visible until the response is discarded as stale. Rejected moves retain the existing advice.

## Solo walkthrough

Written explanation completed on 2026-11-26 for the solo submission. This records the code path;
no partner review or owner-performed spoken demonstration is claimed.

1. **After clicking Hint:** `onHint()` saves the current version and a copy of the game state, disables
   Hint and displays "Loading advice...". `askForHint()` posts that copy to the same-origin `/api/hint`.
   The supplied host assigns a request ID and passes the request to the handler. The returned envelope
   goes to `adviceView()`, which supplies the advice and why text. Hint is re-enabled in `finally`.
2. **Legality and fallback:** `allowedActions(board, state)` in `rules.ts` is the source of permitted
   actions. The handler passes that list to the adapter and checks the proposed hint with `validHint()`.
   An invalid response, timeout or provider failure uses `fallbackHint()`: the first allowed move in
   north, east, south, west order. A completed game has no allowed actions, so it returns a null hint
   without calling the client. Presentation reads the same allowed-action list to explain permission.
3. **Why a hint cannot move the player:** the request uses a copied snapshot, the handler returns advice,
   and presentation returns strings. `onHint()` displays those strings and never assigns the live game
   state or invokes the move handler. State changes occur in `move()` and `reset()`. Both increment
   `stateVersion`, so a response for an earlier version is replaced by the stale message. If the host
   is unreachable, the page shows "Advice unavailable; keep playing." and local moves still work.

For example, at (0,0), east and south are allowed. A success hint offers east while the player stays at
(0,0) with six moves, score zero and no collected treasure. After an actual East move, the live state
becomes (1,0) with five moves, and the displayed allowed moves become east and west. The Mac screenshots
and timeout/validation event matches are linked in [browser-checks.md](evidence/browser-checks.md).

## The refactored boundary (P3)

| Function | Input | Output | Never |
|---|---|---|---|
| `allowedMovesText(board, state)` | board, current state | `"Allowed moves from (0,0): east, south."` or `"… none (status: won)."` | mutates input; decides legality itself |
| `adviceView(board, requested, envelope, savedVersion, currentVersion)` | board, the snapshot the hint was asked for, the envelope, both versions | `{ advice, why }` | shows a stale envelope; calls a move |

Why lines:
- `Permitted: east is an allowed move from (0,0) (east, south).`
- For a fallback, it adds `Fallback rule: the first allowed move in north, east, south, west order.`
- `Nothing to suggest: …` when no move is allowed.
- `Not permitted: …` if a direction outside the list ever arrived. The server already prevents this; the page still
  never calls such a move permitted.

The host serves only `dist/rules.js` and `dist/presentation.js` to the browser, so no host change was needed.

## Who owns what

| Part | File | Owner |
|---|---|---|
| Presentation boundary | `project/game/src/presentation.ts` | Owned (new) |
| Browser flow | `project/game/browser/app.mjs`, `index.html` | Supplied, changed (see `evidence/evidence.md`) |
| Browser client, styles | `project/game/browser/client.mjs`, `styles.css` | Supplied, unchanged |
| Own tests | `project/game/tests/presentation.test.mjs`, `hint-flow.test.mjs`, `browser-app.test.mjs` | Owned (new) |
| Rules, adapter, validator, stubs, instrumentation, host | `project/game/src/*.ts` except `presentation.ts` | Supplied, unchanged |
| Fixed checks | `project/game/tests/evaluation.test.mjs` (24), `signals.test.mjs` (5) | Supplied, unchanged |
| Fixtures + runner | `project/game/fixtures/`, `scripts/verify-fixtures.mjs` | Supplied, unchanged |
| Harness | `lab.py`, `Makefile` | Supplied, unchanged |
| Records | `evidence/` | Owned |

## Outcomes in the terminal event

| Outcome | When | `fallback` |
|---|---|---|
| `model-success` | advice passed shape + legality | false |
| `validation-failure` | well-shaped but illegal, wrong shape, or malformed JSON | true |
| `timeout` | client did not settle within 2000 ms | true |
| `provider-failure` | client threw / HTTP error | true |
| `no-action` | game over, no permitted move, no client call | true |
