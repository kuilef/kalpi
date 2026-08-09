# Five-axis Result Strips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** Replace the five-axis table with five interactive horizontal position strips while keeping the existing selectable 2D map in a collapsed additional-details block.

**Architecture:** \`axis-strips.js\` owns the immutable party palette and pure marker metadata derived from already-calculated axis results. \`app.js\` uses that metadata to render accessible DOM markers, localizes the copy, and binds one shared tooltip per strip. \`index.html\` supplies the semantic hosts; \`styles.css\` lays out the responsive strips and tooltip. The score, coordinate, coverage, source, and data-model calculations remain untouched.

**Tech Stack:** Static HTML, vanilla JavaScript (browser globals plus CommonJS-compatible helper), CSS, Node built-in test runner, Python bundle verification.

## Global Constraints

- Render exactly the five configured axes in \`data/axes.json\` order; their numeric range remains -100 to +100.
- Use a fixed colour for each active party ID, never a rank- or value-derived colour.
- The user marker uses one dedicated colour distinct from every party colour.
- Do not render \`insufficient_data\` as a zero/centre position; name omissions in text.
- Provide hover and keyboard-focus tooltips plus localized \`aria-label\`s; colour alone cannot identify a party.
- Keep the existing X/Y selectors, canvas map, and insufficient-data explanation intact inside a closed native \`<details>\` block.
- Remove the duplicate \`axis-profile\` table from the results page; do not modify \`core.js\` or data JSON.
- Preserve English, Russian, Hebrew, and RTL behaviour.

---

## File structure

- Create \`axis-strips.js\`: browser/global and CommonJS-compatible pure palette and marker-metadata helpers.
- Create \`tests/axis-strips.test.js\`: direct Node tests for the fixed palette and known/unknown metadata behaviour.
- Modify \`index.html\`: load the helper before \`app.js\`, add the five-strip host, and wrap the legacy map hosts in a collapsed \`details\` element.
- Modify \`app.js\`: add localized labels, render strip DOM from existing \`axisResults()\` output, and bind hover/focus tooltip behaviour.
- Modify \`styles.css\`: add responsive visual treatment for five strips, positioned markers, tooltip, and RTL-safe labels.
- Modify \`tests/ui-structure.test.js\`: assert the new semantic result structure and removal of the table host.

### Task 1: Add pure palette and marker metadata

**Files:**
- Create: \`axis-strips.js\`
- Create: \`tests/axis-strips.test.js\`

**Interfaces:**
- Consumes: \`{ id: string }\` party records and \`{ status: string, value?: number, coverage?: number }\` axis results from \`Core.computePartyAxes\` / \`Core.computeUserAxes\`.
- Produces: \`AxisStrips.getPartyColor(partyId): string\` and \`AxisStrips.buildMarkers({ parties, partyAxes, axisId }): Array<{ partyId: string, color: string, value: number, coverage: number }>\`.

- [ ] **Step 1: Write the failing palette and omission tests**

Create \`tests/axis-strips.test.js\`:

\`\`\`js
const test = require('node:test');
const assert = require('node:assert/strict');
const Strips = require('../axis-strips.js');

test('each configured party has a stable predefined colour', () => {
  assert.equal(Strips.getPartyColor('likud'), '#3569a8');
  assert.equal(Strips.getPartyColor('hadash_taal'), '#7547a8');
  assert.notEqual(Strips.getPartyColor('likud'), Strips.getPartyColor('hadash_taal'));
});

test('buildMarkers includes only known party coordinates for an axis', () => {
  const markers = Strips.buildMarkers({
    axisId: 'economy',
    parties: [{ id: 'likud' }, { id: 'shas' }],
    partyAxes: {
      likud: { economy: { status: 'known', value: 62.4, coverage: 0.8 } },
      shas: { economy: { status: 'insufficient_data', value: null, coverage: 0.1 } },
    },
  });
  assert.deepEqual(markers, [{ partyId: 'likud', color: '#3569a8', value: 62.4, coverage: 0.8 }]);
});
\`\`\`

- [ ] **Step 2: Run the new test to verify it fails**

Run: \`node --test tests/axis-strips.test.js\`

Expected: FAIL because \`../axis-strips.js\` does not exist.

- [ ] **Step 3: Implement the fixed palette and pure metadata helper**

Create \`axis-strips.js\` using a UMD-style export so \`<script src="axis-strips.js">\` assigns \`window.KalpiAxisStrips\`, while Node receives the same object through \`module.exports\`. Define all active IDs explicitly:

\`\`\`js
const PARTY_COLORS = Object.freeze({
  likud: '#3569a8', beyahad: '#d27628', shas: '#43835a', utj: '#7a5a9e',
  raam: '#b04a79', otzma: '#8e5d34', yisrael_beytenu: '#16828b',
  democrats: '#b8403e', yashar: '#697b2d', religious_zionism: '#9a497b',
  bait_zioni: '#476f9b', hadash_taal: '#7547a8',
});

function buildMarkers({ parties, partyAxes, axisId }) {
  return parties.flatMap((party) => {
    const coordinate = partyAxes[party.id]?.[axisId];
    return coordinate?.status === 'known'
      ? [{ partyId: party.id, color: getPartyColor(party.id), value: coordinate.value, coverage: coordinate.coverage }]
      : [];
  });
}
\`\`\`

\`getPartyColor\` must throw for an unconfigured ID, making data/palette drift visible instead of silently assigning a misleading colour.

- [ ] **Step 4: Run the new test to verify it passes**

Run: \`node --test tests/axis-strips.test.js\`

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit the independently testable helper**

\`\`\`bash
git add axis-strips.js tests/axis-strips.test.js
git commit -m "feat: add stable party marker palette"
\`\`\`

### Task 2: Replace the result markup and add structural coverage

**Files:**
- Modify: \`index.html:50-57\`
- Modify: \`tests/ui-structure.test.js:35-41\`

**Interfaces:**
- Consumes: \`window.KalpiAxisStrips\` loaded before \`app.js\`.
- Produces: \`#axis-strips\`, a \`#multidimensional-map\` closed \`<details>\`, and retained \`#map-x-axis\`, \`#map-y-axis\`, \`#party-map\`, \`#map-omitted\` hosts.

- [ ] **Step 1: Write the failing structural test**

Replace the old \`results include selectable two-dimensional map and five-axis profile\` test with:

\`\`\`js
test('results include five axis strips and retain the 2D map as collapsed details', () => {
  const html = read('index.html');
  assert.match(html, /id=["']axis-strips["']/);
  assert.match(html, /<details id=["']multidimensional-map["']/);
  assert.match(html, /<details id=["']multidimensional-map["'][^>]*>/);
  assert.doesNotMatch(html, /<details id=["']multidimensional-map["'][^>]*\sopen(?:\s|=|>)/);
  assert.doesNotMatch(html, /id=["']axis-profile["']/);
  for (const id of ['map-x-axis', 'map-y-axis', 'party-map', 'map-omitted']) {
    assert.match(html, new RegExp(\`id=["']\${id}["']\`));
  }
  assert.ok(html.indexOf('axis-strips.js') < html.indexOf('app.js'));
});
\`\`\`

- [ ] **Step 2: Run the structural test to verify it fails**

Run: \`node --test tests/ui-structure.test.js\`

Expected: FAIL because \`axis-strips\`, \`multidimensional-map\`, and \`axis-strips.js\` are absent while \`axis-profile\` remains.

- [ ] **Step 3: Implement the semantic result hosts**

In \`index.html\`, replace the current single map/table block with the following shape:

\`\`\`html
<section class="axis-section" aria-labelledby="axis-strips-title">
  <div class="section-heading compact-heading">
    <div><h3 id="axis-strips-title" data-i18n="axisStripsTitle"></h3><p class="hint" data-i18n="axisStripsHint"></p></div>
  </div>
  <div id="axis-strips" class="axis-strips" aria-live="polite"></div>

  <details id="multidimensional-map" class="multidimensional-map">
    <summary data-i18n="mapDetailsTitle"></summary>
    <div class="section-heading compact-heading">
      <div><h3 data-i18n="mapTitle"></h3><p class="hint" data-i18n="mapHint"></p></div>
      <div class="axis-selectors">…existing X/Y labels and selects…</div>
    </div>
    <div class="map-wrap"><canvas id="party-map" width="900" height="600"></canvas></div>
    <p id="map-omitted" class="hint"></p>
  </details>
</section>
\`\`\`

Add \`<script src="axis-strips.js"></script>\` directly before \`<script src="app.js"></script>\`. Do not set the \`open\` attribute on the details element.

- [ ] **Step 4: Run the structural test to verify it passes**

Run: \`node --test tests/ui-structure.test.js\`

Expected: PASS, including the renamed result-structure test.

- [ ] **Step 5: Commit the structural change**

\`\`\`bash
git add index.html tests/ui-structure.test.js
git commit -m "feat: add five-axis result strip host"
\`\`\`

### Task 3: Render accessible strips and localize their content

**Files:**
- Modify: \`app.js:3-15, 214-233, 293-303\`

**Interfaces:**
- Consumes: \`window.KalpiAxisStrips.buildMarkers\`, \`latestAxisState\`, \`text(axis, field)\`, \`text(party, 'name')\`, and \`pct(coverage)\`.
- Produces: \`renderAxisStrips(userAxes, partyAxes)\` and \`bindAxisStripTooltip(host)\`; \`renderAxes()\` calls the new renderer instead of \`renderAxisProfile()\`.

- [ ] **Step 1: Write a failing rendering-contract assertion**

Add this test to \`tests/ui-structure.test.js\`:

\`\`\`js
test('app renders focusable strip markers with a shared tooltip', () => {
  const app = read('app.js');
  assert.match(app, /function renderAxisStrips\s*\(/);
  assert.match(app, /function bindAxisStripTooltip\s*\(/);
  assert.match(app, /aria-label/);
  assert.match(app, /role=["']tooltip["']/);
  assert.match(app, /AxisStrips\.buildMarkers/);
});
\`\`\`

- [ ] **Step 2: Run the rendering-contract test to verify it fails**

Run: \`node --test tests/ui-structure.test.js\`

Expected: FAIL because no strip renderer, tooltip binder, or helper integration exists.

- [ ] **Step 3: Implement localized rendering with explicit missing-data text**

Set \`const AxisStrips = window.KalpiAxisStrips;\` beside the other top-level globals. Add \`axisStripsTitle\`, \`axisStripsHint\`, \`mapDetailsTitle\`, \`you\`, \`axisValue\`, \`axisCoverage\`, \`notShown\`, and \`userNotShown\` to all three \`COPY\` locales. Example Russian values: \`Позиции по пяти осям\`, \`Цветная точка — партия; отдельная точка — вы. Наведите или перейдите к точке с клавиатуры, чтобы увидеть детали.\`, \`Дополнительно: многомерная карта\`, \`Вы\`, \`Позиция\`, \`Покрытие\`, \`Не показаны из-за недостатка данных\`, \`Ваша позиция не показана: недостаточно ответов по этой оси.\`

Replace \`renderAxisProfile\` with a renderer that iterates \`data.axes\`, obtains only known party markers from \`AxisStrips.buildMarkers\`, and converts \`value\` to \`left: \${(value + 100) / 2}%\`. For every marker emit a real \`button\` with \`type="button"\`, \`class="axis-marker party-marker"\`, an inline \`--marker-color\`, and a localized \`aria-label\` such as \`Ликуд: позиция +62, покрытие 80%.\`.

Emit the user marker only when \`userAxes[axis.id]?.status === 'known'\`, using \`class="axis-marker user-marker"\` and a fixed CSS user colour. Each strip must include \`span.axis-strip-missing\` listing named omitted parties; if the user is unknown it appends the localized user-not-shown statement. Each strip has a unique \`<div id="axis-strip-tooltip-\${axis.id}" class="axis-strip-tooltip" role="tooltip" hidden></div>\`.

Implement \`bindAxisStripTooltip(host)\` with \`pointerover\`, \`focusin\`, \`pointerout\`, and \`focusout\`. When an \`.axis-marker\` is active, copy its \`data-tooltip\` text into that strip's tooltip, remove \`hidden\`, and position it using the marker's \`left\` percentage. Hide it on a pointer/focus transition that leaves the strip. This creates the same content for hover and keyboard focus; the \`aria-label\` remains the no-tooltip fallback.

Leave \`drawMap\` unchanged. Keep \`renderAxes()\` responsible for drawing the map and then call \`renderAxisStrips(userAxes, partyAxes)\`.

- [ ] **Step 4: Run the rendering contract and existing logic suite to verify they pass**

Run: \`node --test tests/ui-structure.test.js tests/core.test.js tests/i18n.test.js\`

Expected: PASS. The existing core and i18n assertions remain unchanged because calculations and locale helper semantics have not changed.

- [ ] **Step 5: Commit the renderer**

\`\`\`bash
git add app.js tests/ui-structure.test.js
git commit -m "feat: render accessible five-axis strips"
\`\`\`

### Task 4: Style the strips and verify the complete result UI

**Files:**
- Modify: \`styles.css:90-103\` and the existing editorial/RTL override area near the end of the file.
- Modify: \`tests/ui-structure.test.js\`

**Interfaces:**
- Consumes: \`.axis-strips\`, \`.axis-strip\`, \`.axis-track\`, \`.axis-marker\`, \`.party-marker\`, \`.user-marker\`, \`.axis-strip-tooltip\`, and \`.multidimensional-map\` markup created in Tasks 2-3.
- Produces: readable five-row desktop and narrow-mobile layout with visible keyboard focus and no horizontal overlap requirement for party names.

- [ ] **Step 1: Write the failing stylesheet contract test**

Add to \`tests/ui-structure.test.js\`:

\`\`\`js
test('stylesheet gives the strip markers, tooltip, and details block dedicated treatment', () => {
  const css = read('styles.css');
  for (const selector of ['.axis-strips', '.axis-track', '.axis-marker', '.user-marker', '.axis-strip-tooltip', '.multidimensional-map']) {
    assert.match(css, new RegExp(selector.replace('.', '\\.') + '\\s*\\{'));
  }
  assert.match(css, /\.axis-marker:focus-visible/);
});
\`\`\`

- [ ] **Step 2: Run the stylesheet contract test to verify it fails**

Run: \`node --test tests/ui-structure.test.js\`

Expected: FAIL because the new selectors are absent.

- [ ] **Step 3: Add responsive and RTL-safe CSS**

Add dedicated rules after the existing map rules. Use a two-column grid for a strip label and its track on wide displays; at \`max-width: 700px\`, stack label, negative pole, track, and positive pole without forcing a wide table. The track has a neutral 2px rule, a centre tick, and minimum \`44px\` interactive marker hit areas. Markers are \`position:absolute; left:var(--marker-left); transform:translateX(-50%)\`; party markers use \`background:var(--marker-color)\` and user marker uses \`--user-marker:#8d3f34\` plus a white ring. Style \`.axis-marker:hover, .axis-marker:focus-visible\` with a high-contrast outline.

Style the tooltip as an absolutely positioned, non-interactive small dark panel within the strip, bounded with \`max-width:min(260px, calc(100vw - 32px))\`, and translate it from \`left:var(--marker-left)\` so it remains attached to its marker. Use logical \`inset-inline-start\` and \`text-align:start\` where direction matters. Style \`details.multidimensional-map\` with a top border/margin and a visible pointer cursor on its \`summary\`; preserve the existing map responsive rules so rendering occurs once the details block is opened.

- [ ] **Step 4: Run automated checks**

Run:

\`\`\`bash
node --test tests/*.test.js
python tests/bundle.test.py
python tools/build_data_bundle.py --check
\`\`\`

Expected: every Node test passes; Python reports successful bundle validation; the bundle check reports no drift.

- [ ] **Step 5: Manually verify the rendered UI**

Run \`start.bat\`, answer sufficient questions to calculate a result, and check the page in desktop and a 390px-wide viewport:

1. Exactly five strips are visible in \`axes.json\` order; each has both localised pole labels and points are located on the -100..100 scale.
2. Party markers retain the same colour on every strip; the user marker has a distinct colour and is larger.
3. Hovering and tabbing to a party and user marker expose the same name/value/coverage tooltip; focus has a visible ring.
4. An unknown party or user axis is described as omitted and does not appear at the centre.
5. The additional map is closed on first render, opens on its summary, and its selectors/canvas still operate.
6. Switch to EN and HE: content localizes; Hebrew layout remains usable and aligned.

- [ ] **Step 6: Commit the final UI and verification-ready tests**

\`\`\`bash
git add styles.css tests/ui-structure.test.js
git commit -m "feat: style five-axis position strips"
\`\`\`
