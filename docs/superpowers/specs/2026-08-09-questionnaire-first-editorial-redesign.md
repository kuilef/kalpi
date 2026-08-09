# Questionnaire-first editorial redesign

Date: 2026-08-09  
Status: Approved design, awaiting review of this specification

## Goal

Make the prototype feel like a restrained editorial questionnaire rather than a data dashboard. A visitor's first and only initial task is to answer policy questions. Recommendation and research analytics appear only after the visitor explicitly asks to calculate the result.

The whole product interface is available in Russian, English and Hebrew. The visitor can switch language before answering, and the selected language remains active throughout the questionnaire and results.

## Information order

The page order becomes:

1. Site header: concise description of the prototype and its evidence limitation.
2. Questionnaire: progress, grouped questions, answer controls, calculation and reset actions.
3. Results, initially hidden: recommendation, ranking, explanation, axis profile, map and answered-question inspection.
4. Data-quality analytics: dataset coverage, gaps, provenance and matrix. It follows the completed questionnaire and stays below the result.

Developer warnings and the active-data status remain functional notices. They must be compact, visually subordinate, and must not precede the questionnaire.

## Languages and direction

The header contains a compact three-option language switcher: `EN`, `RU`, `HE`. It changes the language of all product copy without clearing answers, changing the active data set or recalculating the result. The selection is persisted with the existing browser preferences and defaults to Russian until the visitor chooses otherwise.

- Russian (`ru`) and English (`en`) use left-to-right document direction.
- Hebrew (`he`) sets `lang="he"` and `dir="rtl"` on the document root. Section hierarchy, progress, controls, tables, map labels and focus order must remain usable in RTL rather than merely right-aligning text.
- The language switcher itself stays compact and recognisable in every locale; its accessible label and selected state are translated.
- A language change updates static UI copy, question groups and prompts, axis names/poles, party names/leader labels, status labels, result explanations, analytics labels and validation text. External-source titles and URLs retain their original language.

The data schema gains explicit localized fields for all user-facing political content: Russian, English and Hebrew question text and group labels; axis names and poles; party/list names and leader names; and any display labels used in result explanations. No language may silently fall back to Russian when a localized field is missing; dataset validation reports the incomplete record instead. Calculation IDs, numerical values, evidence and scoring remain language-independent.

## Visual direction

The interface uses a strict editorial/journal character:

- warm paper-like background, ink-like text, and one muted editorial accent;
- expressive serif headings paired with a highly readable sans-serif UI face;
- strong typographic hierarchy, thin rules and deliberate whitespace instead of many rounded cards, shadows, badges or decorative metrics;
- question groups read as sections of a questionnaire, with clear numbering and answer controls that remain easy to scan and operate;
- results and data tables keep their semantic distinctions, but use a quieter visual hierarchy than the questionnaire.

The redesign must not change scoring, coverage rules, provenance displays, question content, or the meaning of an answer.

## Deep-research supplement removal

Remove the entire user-facing data-replacement workflow:

- the `#data-update` section and its controls in `index.html`;
- its import, restore, export and file-selection event handling in `app.js`;
- CSS that only styles those controls;
- README instructions that describe importing data through the browser.

Canonical JSON files, the generated browser bundle and the `tools/build_data_bundle.py` workflow remain. Research updates are a repository-maintenance task: edit canonical JSON, regenerate the bundle when using `file://`, then reload the page. This preserves the prototype's data model without exposing a second, competing user journey.

## Behaviour and state

- Before calculation, only the header and questionnaire are visible as product content.
- A change to an answer keeps the existing persistence and progress behaviour. If results were previously visible, the existing calculation remains user-triggered rather than silently recalculated.
- Clicking “Показать результат” reveals results, inspection and data-quality analytics in their established calculation order; the result section receives focus or becomes the next clear reading target.
- Resetting answers hides results and inspection as it does now, and also returns the page to its questionnaire-first state without modifying the bundled data.

## Verification

Add or update structural tests to assert that:

1. the questionnaire appears before results and `#data-quality` in the document;
2. `#data-update` and browser data-control IDs are absent;
3. the page still loads its data/core/application scripts in the required order;
4. the language switcher offers Russian, English and Hebrew;
5. changing language preserves stored answers and changes only localized display text;
6. Hebrew switches the document to RTL; and
7. existing scoring and data-bundle tests continue to pass.

Perform a browser or static visual smoke check at desktop and narrow viewport widths. Confirm that the initial screen presents questions without dashboard analytics and that calculation reveals the analytics below the result.
