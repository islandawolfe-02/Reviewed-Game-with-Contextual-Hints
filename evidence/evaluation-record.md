# P3 advice evaluation record

Automatic checks (shape, legality, unchanged state) and human usefulness judgments are recorded
separately. A local stub validates the application flow; it does not establish real model quality. Label
any previously recorded model example explicitly as **recorded**.

| Case | State (position, moves, collected, status) | Mode | Actual suggestion + explanation | Legal? (automatic) | Helpful? (human) | Why (board fact / consequence) |
|---|---|---|---|---|---|---|
| Initial state | (0,0), 6, [], playing | success | | | | |
| Beside a wall | e.g. (1,0), 5, [], playing | | | | | |
| Near goal | e.g. (2,1), 3, [t1], playing | | | | | |
| Completed game | e.g. (2,2), 2, [t1], won | | | | | |
| Deliberately irrelevant explanation | (0,0), 6, [], playing | irrelevant | | | | |
