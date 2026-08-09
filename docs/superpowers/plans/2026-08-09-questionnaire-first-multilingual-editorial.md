# Questionnaire-first multilingual editorial redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the questionnaire first in a strict editorial interface, reveal analysis only after calculation, remove browser deep-research imports, and make the prototype usable in English, Russian and Hebrew.

**Architecture:** Keep political scoring and evidence language-independent. Add a small UMD localization module for UI copy, locale selection and locale-specific record fields. `app.js` remains the renderer, but looks up every visible string in the active locale and re-renders without changing answers.

**Tech Stack:** HTML5, CSS custom properties and RTL selectors, vanilla JavaScript UMD modules, Node.js built-in test runner, Python 3 standard library bundle builder.

## Global Constraints

- Support `en`, `ru` and `he`; default to `ru`, persist the locale in `localStorage`, and show `EN`, `RU`, `HE`.
- Hebrew sets `lang="he"` and `dir="rtl"` at the document root; controls, tables, Canvas labels and keyboard focus remain usable.
- Do not change question IDs, positions, evidence, score formulas, coverage formulas, axis algorithms or answer values.
- Initially show only header and questionnaire. Results, inspection, notices and data-quality analytics appear only after calculation.
- Keep direct JSON loading, the data bundle and `tools/build_data_bundle.py`; remove browser import, restore and export flows.
- A missing user-facing translation is a dataset-validation error, not a fallback to Russian. External source titles and URLs retain their source language.

---

### Task 1: Locale contract and localized-data validation

**Files:**

- Create: `i18n.js`
- Create: `tests/i18n.test.js`
- Modify: `core.js:301-365`
- Modify: `tests/core.test.js`

**Interfaces:**

- Produces UMD `KalpiI18n` with `SUPPORTED_LOCALES`, `DEFAULT_LOCALE`, `isRtl(locale)`, `localized(record, baseKey, locale)`, `loadLocale(storage)` and `saveLocale(storage, locale)`.
- Extends `KalpiCore.validateDataset(data) -> string[]` with missing-localization errors.
- Uses localized JSON fields named `baseKey_locale`, for example `text_en`.

- [ ] **Step 1: Write failing locale tests.**

```js
const I18n = require('../i18n.js');

test('Hebrew is RTL and a missing locale does not fall back', () => {
  assert.equal(I18n.isRtl('he'), true);
  assert.equal(I18n.isRtl('en'), false);
  assert.equal(I18n.localized({ name_en: 'Likud', name_ru: 'Ликуд' }, 'name', 'en'), 'Likud');
  assert.throws(() => I18n.localized({ name_ru: 'Ликуд' }, 'name', 'he'), /name_he/);
});
```

- [ ] **Step 2: Run the test and confirm failure.**

Run: `node --test tests/i18n.test.js`  
Expected: failure resolving `../i18n.js`.

- [ ] **Step 3: Implement the dependency-free UMD module.**

```js
const SUPPORTED_LOCALES = Object.freeze(['en', 'ru', 'he']);
const DEFAULT_LOCALE = 'ru';
function isRtl(locale) { return locale === 'he'; }
function localized(record, baseKey, locale) {
  const key = baseKey + '_' + locale;
  if (typeof record?.[key] !== 'string' || !record[key].trim()) {
    throw new Error('Missing localized field ' + key);
  }
  return record[key];
}
```

Validate stored values against `SUPPORTED_LOCALES`, save under `kalpiPrototypeLocaleV1`, catch unavailable storage, and expose the same object through CommonJS and `window.KalpiI18n`.

- [ ] **Step 4: Add a failing core validation test.**

```js
test('validation reports a missing Hebrew question field', () => {
  const data = validDatasetFixture();
  delete data.questions[0].text_he;
  assert.ok(Core.validateDataset(data).includes(
    'question ' + data.questions[0].id + ': missing text_he'
  ));
});
```

- [ ] **Step 5: Extend `validateDataset`.**

For every locale require `name`, `negative` and `positive` on axes; `name` and `leader` on parties; `text` and `group` on questions; and `notes` on sources. Emit errors such as `axis economy_redistribution: missing name_he`; do not validate external `title`.

- [ ] **Step 6: Run focused tests and commit.**

Run: `node --test tests/i18n.test.js tests/core.test.js`  
Expected: all passing.

```bash
git add i18n.js core.js tests/i18n.test.js tests/core.test.js
git commit -m "feat: add locale contract and data validation"
```

### Task 2: Localize canonical research data and rebuild the bundle

**Files:**

- Modify: `data/axes.json`
- Modify: `data/parties.json`
- Modify: `data/questions.json`
- Modify: `data/sources.json`
- Modify: `data/default-data.js` (generated)
- Modify: `tests/data.test.js`
- Modify: `README.md`

**Interfaces:**

- Consumes the suffix convention from Task 1.
- Produces non-empty English, Russian and Hebrew display fields for every axis, party, question and source note.

- [ ] **Step 1: Add a failing canonical-data completeness test.**

```js
const LOCALES = ['en', 'ru', 'he'];
const assertLocalized = (record, fields, kind) => {
  for (const field of fields) for (const locale of LOCALES) {
    const value = record[field + '_' + locale];
    assert.equal(typeof value, 'string', kind + ' ' + record.id + ': missing ' + field + '_' + locale);
    assert.ok(value.trim(), kind + ' ' + record.id + ': blank ' + field + '_' + locale);
  }
};
```

Apply this helper to axis `name/negative/positive`, party `name/leader`, question `text/group`, and source `notes`.

- [ ] **Step 2: Run the data test and confirm current records fail.**

Run: `node --test tests/data.test.js`  
Expected: a failure such as `axis economy_redistribution: missing name_en`.

- [ ] **Step 3: Migrate and translate the canonical JSON.**

Rename party `leader` to `leader_ru`. Keep existing Russian/Hebrew names, and add all required `name_en`, `leader_en` and `leader_he` fields. Add `_en`/`_he` fields to every axis name/pole and every question text/group, preserving question IDs and weights. Add `notes_en`/`notes_he` to all 86 sources; leave `title` and `url` unchanged. Translate propositions in natural English and Israeli Hebrew with the same policy scope and strength as their Russian text.

- [ ] **Step 4: Validate data and rebuild the browser bundle.**

Run: `node --test tests/data.test.js tests/core.test.js`  
Expected: all passing and `Core.validateDataset(data)` returns `[]`.

Run: `python tools/build_data_bundle.py`  
Expected: regenerated `data/default-data.js`.

- [ ] **Step 5: Update README and commit.**

Delete all browser import/restore/export directions. Document the canonical edit workflow: update all three localized fields, run `python tools/build_data_bundle.py` for `file://`, and reload. State that translations are mandatory.

Run: `python -m unittest tests/bundle.test.py`  
Expected: both bundle-equivalence tests pass.

```bash
git add data/axes.json data/parties.json data/questions.json data/sources.json data/default-data.js tests/data.test.js README.md
git commit -m "feat: localize questionnaire research data"
```

### Task 3: Reorder the product and render the selected locale

**Files:**

- Modify: `index.html:2-156`
- Modify: `app.js:1-505`
- Modify: `tests/ui-structure.test.js`

**Interfaces:**

- Consumes `window.KalpiI18n`, localized data and unchanged `window.KalpiCore` results.
- Produces `applyLocale(locale)`, locale-aware question/result/analytics renderers, and a questionnaire-first document order.

- [ ] **Step 1: Replace obsolete import-UI test with failing structure tests.**

```js
test('questionnaire precedes initially hidden analysis', () => {
  const html = read('index.html');
  assert.ok(html.indexOf('id="questionnaire"') < html.indexOf('id="results"'));
  assert.ok(html.indexOf('id="results"') < html.indexOf('id="data-quality"'));
  assert.match(html, /id="data-quality"[^>]*class="[^"]*hidden/);
});

test('page offers three locales and no browser data controls', () => {
  const html = read('index.html');
  for (const id of ['locale-en', 'locale-ru', 'locale-he']) assert.match(html, new RegExp('id=["\\x27]' + id));
  for (const id of ['data-update', 'data-files', 'apply-data', 'restore-data', 'export-data']) {
    assert.doesNotMatch(html, new RegExp('id=["\\x27]' + id));
  }
});
```

- [ ] **Step 2: Run the test and confirm failure.**

Run: `node --test tests/ui-structure.test.js`  
Expected: failure because analytics precede the questionnaire, the import section exists and locale IDs are absent.

- [ ] **Step 3: Rebuild the static document order.**

Set `<html lang="ru">`. Add a header switcher with IDs `locale-en`, `locale-ru`, `locale-he`, `data-locale`, translated accessible labels and `aria-pressed`. Put questionnaire immediately after header. Move results, inspection, data-quality, developer warnings and data-source status below it; start results and data quality hidden. Delete `#data-update`. Load `i18n.js` before `app.js`.

- [ ] **Step 4: Add locale helpers and replace Russian-only rendering.**

Use a three-locale UI-copy dictionary and helpers `tr(key)` and `text(record, key)`. `applyLocale` updates `documentElement.lang`, `documentElement.dir`, switcher state and static copy, then renders questions. If results exist, re-render them without saving or changing answers. Replace every visible `name_ru`, `text_ru`, `group_ru`, `negative_ru`, `positive_ru`, `notes_ru` and hard-coded label. Pass localized axis text to Canvas, but preserve numerical coordinates.

- [ ] **Step 5: Make analysis user-triggered and remove replacement code.**

Remove `importSelectedData`, `restoreBundledData`, `exportActiveData`, `refreshForDataChange`, their listeners and the `imported` data-source label. Keep direct JSON/bundle fallback. In `init`, validate and render questionnaire only. In `renderResults`, reveal and render results, inspection, quality analytics and notices before scrolling. Reset hides every post-questionnaire section and leaves data unchanged.

- [ ] **Step 6: Bind locale buttons and test.**

Bind `[data-locale]` to `applyLocale`. Radio controls retain their existing IDs/names and read from `answers`; switching language must preserve checked answers, result state and map axes.

Run: `node --test tests/ui-structure.test.js tests/i18n.test.js tests/core.test.js`  
Expected: all passing.

```bash
git add index.html app.js tests/ui-structure.test.js
git commit -m "feat: make questionnaire first and multilingual"
```

### Task 4: Apply editorial styling, RTL layout and final checks

**Files:**

- Modify: `styles.css:1-183`
- Modify: `README.md`
- Modify: `tests/ui-structure.test.js`

**Interfaces:**

- Consumes semantic switcher/layout classes and document direction from Task 3.
- Produces a responsive editorial paper-and-ink UI that treats RTL as a layout direction rather than text alignment.

- [ ] **Step 1: Add failing style-presence tests.**

```js
test('stylesheet defines editorial and RTL treatment', () => {
  const css = read('styles.css');
  assert.match(css, /html\\[dir=["\\x27]rtl["\\x27]\\]/);
  assert.match(css, /\\.locale-switcher/);
  assert.match(css, /font-family:[^;]*serif/);
});
```

- [ ] **Step 2: Run the test and confirm failure.**

Run: `node --test tests/ui-structure.test.js`  
Expected: missing switcher and RTL/editorial selectors.

- [ ] **Step 3: Implement the agreed visual system.**

Use a warm paper background, dark ink text, one muted accent, a purposeful serif heading face with readable sans-serif UI text, thin rules and varied vertical rhythm. Remove generic large rounded/shadowed dashboard cards, excess badges and glass blur. Keep focus styles and readable grouped question controls.

- [ ] **Step 4: Add responsive RTL rules.**

Use logical properties for inline margins, padding, borders and positioning. Add `html[dir="rtl"]` rules for header/switcher, headings, progress, actions, answer controls, selectors, ranking, inspection summaries, tables, map metadata and explanation markers. At 920px, 700px and 600px ensure the switcher and all six answer options wrap without hiding a task-critical action.

- [ ] **Step 5: Run all checks, smoke test and commit.**

Run: `node --test tests/*.test.js`  
Expected: all Node tests pass.

Run: `python -m unittest tests/bundle.test.py`  
Expected: both tests pass.

Run: `python tools/build_data_bundle.py --check`  
Expected: `data bundle is current`.

Open through `start.bat` or a local HTTP server. At desktop and 390px verify: no dashboard initially; calculation reveals result then analytics; EN/RU/HE preserve checked answers; Hebrew is RTL with coherent tables/controls; reset returns to questionnaire-first state.

```bash
git add styles.css README.md tests/ui-structure.test.js
git commit -m "style: apply editorial multilingual questionnaire design"
```
