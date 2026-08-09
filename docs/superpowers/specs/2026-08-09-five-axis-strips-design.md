# Five-axis result strips

## Goal

Make the five-dimensional result easier to scan than the existing selectable 2D map. Users should see their position and every party with sufficient data on each of the five axes at once.

## Main visualization

The results page replaces the five-axis table with five horizontal strips, one per configured axis, in the source order from `data/axes.json`.

- Each strip represents the existing calculated coordinate range from -100 to +100 and labels its negative and positive poles.
- Every party with a `known` coordinate gets a small circular marker at that coordinate. Each party ID has one predefined, stable, accessible colour, reused on every strip.
- The user gets a larger marker in one separate, high-contrast colour.
- A party whose coordinate is `insufficient_data` is omitted rather than placed at zero. The strip reports omitted parties in text so the absence is explicit.
- Hovering a party marker, or focusing it with the keyboard, opens a tooltip with its localized name, rounded coordinate, and axis coverage. The marker has an equivalent localized accessible label.
- The user marker has a localized accessible label and tooltip with the coordinate and coverage. If it is unknown, the strip states why the user is not shown.

HTML buttons and positioned elements, rather than a canvas, supply the interactive markers so tooltip and keyboard support work without custom hit testing.

## Existing map and scope

The existing X/Y selectable canvas map, selectors, and insufficient-data explanation remain available inside a native `<details>` element labelled as an additional multidimensional map. It is closed by default. No score, axis-coordinate, coverage, evidence, or data-model logic changes.

The existing five-axis table is removed from the results page because it duplicates the strips. The existing transparency and data-quality sections remain unchanged.

## Visual language

The strip base is a neutral rule with endpoint labels and a centre tick. Party colours are predefined in JavaScript by party ID, not assigned by ranking or calculated position. The user marker uses a dedicated dark red/orange that does not overlap the party palette. Colour is never the sole identifier: the tooltip/accessible label identifies the party.

## Testing and verification

- Extend structural UI tests to require the strip host, tooltip semantics, and collapsed map container, and to ensure the obsolete five-axis table host is absent from results.
- Add pure helper tests for the stable party-colour mapping and generated marker metadata, including omission of unknown coordinates.
- Run the existing Node and Python test suites and inspect the page at desktop and narrow-mobile widths.
