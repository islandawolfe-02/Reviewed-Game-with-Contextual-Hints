# P3 real-browser checks (not covered by the fixed suite)

| Check | Steps | Expected | Observed (date, browser) |
|---|---|---|---|
| Loading | `MODE=timeout`; click Hint | "Loading advice..." and Hint disabled; move buttons still work | |
| Unavailable server | Load page, stop the server (Ctrl+C), click Hint, then East | "Advice unavailable; keep playing."; East still moves | |
| Stale state | `MODE=timeout`; click Hint, then move or Reset before it returns | "State changed while waiting; request fresh advice."; old advice not shown | |
| Advice does not move | Note moves remaining; click Hint | Same moves remaining, position, score, collected | |
| Your visible change | e.g. allowed moves + why the hint is permitted | | |

Optional automation: an example Playwright 1.61.0 spec is provided to facilitators; it is not required.
