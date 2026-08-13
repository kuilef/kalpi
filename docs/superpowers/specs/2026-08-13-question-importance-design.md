# Personal question importance

Each answered question has a compact control in the question heading: `☆ Важно`; its selected state is `★ Важно`. The control is a real button with `aria-pressed`, a Russian accessible name, and is visually reduced to the star on narrow screens.

The state stores a de-duplicated list of priority question IDs alongside answers. It is restored from the existing browser session and silently removes priorities for unanswered questions. A selected question receives a ranking and coverage multiplier of 2; the five-axis display stays unchanged. Recalculation happens without moving focus or scrolling the page.

No arbitrary cap is applied. The feature is enabled explicitly by `data/scoring-config.json` and is covered by state, rendering, scoring, and interaction-structure tests.
