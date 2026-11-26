# P3 advice evaluation record

Automatic checks (shape, legality, unchanged state) and human usefulness judgments are recorded
separately. A local stub validates the application flow; it does not establish real model quality. Label
any previously recorded model example explicitly as **recorded**.

Actual suggestions come from the headless Chromium run on the work laptop (WSL, 2026-11-25,
[outputs/05](outputs/05-browser-run-headless-chromium.txt)). "Legal" is the automatic result: the server's
`validHint` accepted it against `allowedActions` (outcome `model-success`), or there was nothing to accept.
The usefulness and reason columns assess the recorded suggestions against the reference board
facts..

| Case | State (position, moves, collected, status) | Mode | Actual suggestion + explanation | Legal? (automatic) | Helpful? (human) | Why (board fact / consequence) |
|---|---|---|---|---|---|---|
| Initial state | (0,0), 6, [], playing | success | east - "Explore the open eastern square." (model, `hint-ffbe758e`) | Yes: allowed `[east, south]`; `model-success` | Yes, with a limited explanation | East moves toward t1 at (2,0). One more east followed by south, south reaches the exit with the treasure within the remaining five moves. The explanation is generic and does not mention the treasure or exit. |
| Beside a wall | (1,0), 5, [], playing | success | east - "Explore the open eastern square." (model, `hint-31002d0c`) | Yes: allowed `[east, west]` (south is the wall); `model-success` | Yes, with a limited explanation | East reaches t1 at (2,0), then south, south reaches the exit. This needs three of the five moves left. The explanation does not explain the treasure or the wall to the south. |
| Near goal | (2,1), 3, [t1], playing | success | south - "Explore the open southern square." (model, `hint-144395d0`) | Yes: allowed `[north, south]`; `model-success` | Yes | South reaches the exit at (2,2) while holding t1 and wins immediately, using one of the three moves left. The recorded explanation only describes an open square; it could explain the winning consequence. |
| Completed game | (2,2), 2, [t1], won | success | No permitted action, `hint: null` (fallback, `hint-ef35bef5`) | Yes: nothing offered; `no-action`, no client call | Yes | The game is already won. Offering no action matches the completed state and avoids suggesting another move. |
| Deliberately irrelevant explanation | (0,0), 6, [], playing | irrelevant | east - "Bananas are yellow." (model, `hint-97c8bb85`) | Yes: east allowed; `model-success` (passes every gate) | Partly | East still moves toward t1 and keeps a win possible, but "Bananas are yellow." provides no game-related reason for choosing it. A legal move alone does not establish a useful explanation. |
