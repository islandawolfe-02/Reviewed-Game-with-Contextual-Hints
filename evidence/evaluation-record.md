# P3 advice evaluation record

Automatic checks (shape, legality, unchanged state) and human usefulness judgments are recorded
separately. A local stub validates the application flow; it does not establish real model quality. Label
any previously recorded model example explicitly as **recorded**.

Actual suggestions come from the headless Chromium run on the work laptop (WSL, 2026-11-25,
[outputs/05](outputs/05-browser-run-headless-chromium.txt)). "Legal" is the automatic result: the server's
`validHint` accepted it against `allowedActions` (outcome `model-success`), or there was nothing to accept.
The two human columns are filled in by the owner after playing each case.

| Case | State (position, moves, collected, status) | Mode | Actual suggestion + explanation | Legal? (automatic) | Helpful? (human) | Why (board fact / consequence) |
|---|---|---|---|---|---|---|
| Initial state | (0,0), 6, [], playing | success | east - "Explore the open eastern square." (model, `hint-ffbe758e`) | Yes: allowed `[east, south]`; `model-success` | pending (owner) | pending (owner) |
| Beside a wall | (1,0), 5, [], playing | success | east - "Explore the open eastern square." (model, `hint-31002d0c`) | Yes: allowed `[east, west]` (south is the wall); `model-success` | pending (owner) | pending (owner) |
| Near goal | (2,1), 3, [t1], playing | success | south - "Explore the open southern square." (model, `hint-144395d0`) | Yes: allowed `[north, south]`; `model-success` | pending (owner) | pending (owner) |
| Completed game | (2,2), 2, [t1], won | success | No permitted action, `hint: null` (fallback, `hint-ef35bef5`) | Yes: nothing offered; `no-action`, no client call | pending (owner) | pending (owner) |
| Deliberately irrelevant explanation | (0,0), 6, [], playing | irrelevant | east - "Bananas are yellow." (model, `hint-97c8bb85`) | Yes: east allowed; `model-success` (passes every gate) | pending (owner) | pending (owner) |
