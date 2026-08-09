# Visible question explanations

## Goal

Help respondents understand every policy question without hiding essential context or changing the assessment model.

## Design

Each question receives `explanation_ru` in the canonical data. The explanation is rendered directly below the question and before the answer controls when Russian is the active locale.

The explanation is short, neutral and complete: it clarifies the policy scope, terms or boundaries of the question without arguing for either answer. It is ordinary, visually subordinate text, not a tooltip or hover-only interaction. This makes it available on touch devices and to keyboard and assistive-technology users.

## Constraints

- Preserve question IDs, ordering, answer values, weights, positions and scoring.
- This Russian editorial pass must not add or infer English/Hebrew translations. A later translation pass will add those fields; until then, non-Russian locales do not show a Russian fallback.
- Render the full explanation, with no truncation or collapsed state.
- Keep the existing locale switcher behaviour: changing languages updates the explanation without changing answers.

## Verification

- Canonical-data tests require a non-empty `explanation_ru` on every question.
- The UI structure test confirms the explanation has a dedicated class and is placed after the question text and before the answer controls.
- Run the Node test suite, bundle test and bundle-currentness check.
