# Kalpi (קלפי)

[English](README.md) · [Русский](README.ru.md) · [עברית](README.he.md)

Kalpi (קלפי, “ballot box”) is a political questionnaire for comparing your views with party positions for the 2026 Knesset election. The site includes the [questionnaire](index.html), an [explanation of the methodology](methodology.html), and [data analytics](analytics.html).

The interface is available in Russian, English, and Hebrew. Hebrew uses right-to-left (RTL) layout. The figures and implementation details below were checked against the repository on September 6, 2026.

## What works now

- 26 core questions, presented one at a time;
- two question types: fundamental trade-offs and specific policy questions;
- five substantive answers: `-1`, `-0.5`, `0`, `+0.5`, `+1`;
- a separate “Don't know / not enough information” answer, stored as `null`, distinct from an intermediate position;
- automatic advance after answering, results immediately after the last answer, navigation back to earlier questions, and state saved in the browser;
- 14 thematic groups: fundamental questions usually have a component weight of `0.6` and policy questions `0.4`; policy-only groups use `policy_weight: 1`, with a separate `family_weight` of `0.5`;
- comparison with 12 parties; results show up to seven parties that meet the coverage threshold, with their match score, data coverage, and gap from the leader; a note highlights close results when the top three eligible parties (or two, if only two are available) are within 5 percentage points;
- detailed breakdowns by thematic group and question, including original status, entity scope, and links to supporting evidence;
- a public analytics page with a release readiness check, a heatmap, filters, cell details, and a review queue.

The result describes the closeness of stated positions; it is not advice to vote for a party.

## Methodology

### What Kalpi measures

Kalpi is a Voting Advice Application (VAA): a tool that compares a user's political preferences with publicly documented party positions.

Kalpi does not try to determine which policies are “objectively correct.” Nor does it assume that voters must independently master economics, military strategy, constitutional law, or other specialist fields.

Instead, it uses the following model of political choice:

> **interests and values → preferred goals and acceptable trade-offs → views on key political decisions → comparison with parties**

Citizens do not need to know the technically optimal solution to every public problem to have meaningful preferences about state goals, priorities, and acceptable trade-offs. Political theory describes this as a *division of democratic labor*: citizens help choose collective goals and representatives, while much of the work of developing specific ways to achieve those goals is delegated to politicians, public institutions, and specialists. See [Stanford Encyclopedia of Philosophy — Democracy, §4.2.5](https://plato.stanford.edu/entries/democracy/#DivDemLab).

The approach also recognizes **epistemic dependence**: in a complex society, people inevitably rely on expertise they cannot fully verify themselves. See John Hardwig, [*Epistemic Dependence*](https://doi.org/10.2307/2026523), and Alvin Goldman, [*Experts: Which Ones Should You Trust?*](https://doi.org/10.1111/j.1933-1592.2001.tb00093.x).

### Two levels of questions

The questionnaire includes two complementary types of questions.

**Fundamental preferences and trade-offs**

These measure relatively stable political priorities, such as:

- territorial compromise ↔ maintaining control;
- freedom of lifestyle ↔ uniform religious rules;
- parliamentary majority power ↔ independent limits on power;
- lower taxes ↔ more extensive public services;
- community autonomy ↔ common state standards.

We try to avoid questions such as “Is security important to you?” or “Is equality important?” Almost everyone finds such values appealing, so they do little to distinguish political preferences.

Where possible, a question instead presents a **conflict between two legitimate goals**. Users express which goal they prioritize when both cannot be fully achieved, rather than choosing between “good” and “bad.”

**Specific policy questions**

Abstract values are not enough. Two parties may declare the same goals while proposing fundamentally different ways of achieving them.

Kalpi therefore also asks about specific political decisions, such as civil marriage, conscription of Haredim, a Palestinian state, Supreme Court powers, and public transport on Shabbat.

A policy question belongs in the core questionnaire only if it:

- is understandable to a nonspecialist;
- represents a political choice in its own right, rather than a narrow technical detail;
- meaningfully distinguishes actual parties;
- is sufficiently important to contemporary Israeli political conflict;
- allows party positions to be established reliably from public sources.

Question selection is not neutral: the set of statements shapes the political space and creates implicit weights for different topics. The questionnaire is therefore not treated as an arbitrary collection of popular political issues.

VAA research also shows that a universal one-dimensional or predetermined two-dimensional model does not always capture actual differences between parties adequately. Kalpi therefore organizes questions into substantive thematic groups instead of reducing all politics to a single left–right scale. See [Otjes & Louwerse, *Spatial models in voting advice applications*](https://doi.org/10.1016/j.electstud.2014.04.004).

### The answer scale and “don't know”

Five substantive answers place the user between the left and right poles of each question:

```text
-1    fully aligned with the left pole
-0.5  leaning toward the left pole
 0    an intermediate position between the two poles
+0.5  leaning toward the right pole
+1    fully aligned with the right pole
```

Kalpi distinguishes between:

> **An intermediate position** — the user understands the question and deliberately takes a position between its two poles.

and:

> **Don't know / not enough information** — the user does not wish to state a position on this question.

The latter is stored as `null` and is excluded from comparison with parties. An absence of opinion is not interpreted as the middle of the scale. In the interface, this is a separate button with the keyboard shortcut `0`, whereas the intermediate substantive answer has the numerical value `0`.

This distinction matters in surveys: an intermediate position and “don't know” reflect different respondent states, and combining them can distort results. See [Pew Research Center — How “Don't know” response options affect cross-national surveys](https://www.pewresearch.org/decoded/2023/09/06/how-adding-a-dont-know-response-option-can-affect-cross-national-survey-results/).

### The thematic group model

Each question belongs to exactly one thematic group. Within a group, fundamental and policy questions are averaged separately. When both components are present, they are combined using weights from `data/scoring-config.json`, usually `0.6 / 0.4`. Group results are then combined using `family_weight`.

In the current dataset, `education_standards`, `immigration_identity`, `october_7_accountability`, and `government_coalition` are policy-only groups. They have no fundamental component, so policy questions are averaged with `policy_weight: 1`, while the group itself has `family_weight: 0.5`. These are separate component and group weights, not an individual question priority.

For a known party position, similarity on one question is calculated as:

```text
raw_similarity = 1 - abs(user_value - party_value) / 2
```

Every substantive position (`value` other than `null`) is counted at full weight. The JSON metadata field `confidence` does not affect ranking, coverage, or the release gate, and is not shown in the public interface. `insufficient_data` remains a missing position: the cell is excluded from the average `score`, but remains in the `coverage` calculation with zero coverage.

A user's `null` answer does not participate in the component and adds no information. A ranking requires at least eight substantive answers across six thematic groups; a party must have at least 50% coverage for that user's answers to qualify.

### Question importance

Political closeness and question importance are different things: agreement on a topic a person does not care about need not have the same influence as agreement on an issue that determines their vote.

The current `scoring-config.json` sets `"user_importance_enabled": true` and `"user_importance_family_multiplier": 2`. Users can mark a question with a substantive answer as important: the base `family_weight` of its entire thematic group is multiplied by `2` in the overall comparison. A weight of `1` becomes `2`, and `0.5` becomes `1`. Multiple important questions in the same group do not stack. Data coverage and within-group results are unaffected by importance.

### Wording requirements

Kalpi aims to follow standard survey design principles:

- each question should primarily measure one idea;
- wording should be simple and concrete;
- leading or emotionally asymmetric wording should be avoided where possible;
- both sides of a trade-off should be presented reasonably, not as caricatures;
- a disputed premise should not be silently embedded in a question;
- users should not be asked to choose a technical mechanism when they can meaningfully choose only a goal or principle.

Wording itself can affect answers, while questions containing two statements make results harder to interpret. See [Pew Research Center — Writing Survey Questions](https://www.pewresearch.org/writing-survey-questions/).

### What the result means

The result should be read as:

> **“Given these questions, your stated positions, and their importance to you, this party is closest to your stated political preferences.”**

It does not mean:

> “This party is objectively better than the others” or “You should vote for this party.”

Political choice also depends on trust, competence, the likelihood of promises being kept, candidate quality, corruption risks, potential coalitions, and a party's ability to implement its platform. Kalpi is intended to help users organize their own choice, not to make the decision for them.

## Limitations and potential sources of bias

Kalpi is not an objective measure of which party someone “should” vote for. Results depend on the questionnaire design, selected sources, party position coding, and matching algorithm, as well as on users' answers.

Treat the result as **an estimate of closeness under a specified model**, not a definitive recommendation.

### 1. Question selection already affects the result

A short questionnaire cannot cover every political issue. With a simple average across all questions, topics with more questions have more influence on the final match score. Kalpi's thematic groups reduce this effect, but their composition, base weights, and the questions selected within each group still affect the result.

When revising the questionnaire, it is therefore important to assess topic coverage, balance across major policy areas, near-duplicate questions, and each question's ability to distinguish actual parties. See König & Nyhuis, [*Assessing the applicability of vote advice applications for estimating party positions*](https://doi.org/10.1177/1354068818790111), and Garzia & Marschall, [*Research on Voting Advice Applications: State of the Art and Future Directions*](https://doi.org/10.1002/poi3.140).

### 2. Question wording can change answers

Even on the same topic, responses can depend on wording and presentation. “Should the Supreme Court's powers be strengthened?” and “Should the parliamentary majority's ability to implement its program be limited?” may concern the same institutional conflict but frame it differently.

Kalpi tries to reduce this effect through neutral language, reasonable presentations of both sides, avoidance of emotionally loaded terms, and separate questions for independent statements. Framing effects cannot be eliminated entirely.

### 3. Coding party positions involves uncertainty

A party's position is not always an unambiguous “fully support” or “fully oppose.” Sources may conflict: official platforms, statements by party leaders or individual members of the Knesset, parliamentary votes, coalition agreements, and government actions.

Positions therefore need provenance: a source, date, quotation or description of supporting evidence, and an explanation of disputed cases. A lack of reliable data must not automatically be interpreted as a centrist party position.

### 4. Party statements and actions are different

An election platform states intentions but does not guarantee future action. A party may change its position, compromise in coalition talks, abandon a promise, vote differently as part of another agreement, or lack the means to implement its program.

Kalpi therefore measures compatibility with stated and observed political positions, not the probability of a promise being fulfilled. Where sufficient data exists, platforms and official statements should be compared with legislative activity and actual votes.

### 5. Correlated questions can count the same position twice

Answers about civil marriage, Shabbat transport, Chief Rabbinate powers, and municipal autonomy may largely reflect the same underlying view of religion and state. If every question receives a full independent weight, the same value may be counted several times.

As the model develops, it is necessary to monitor thematic duplication, correlations, each area's total weight, and whether a large number of similar questions artificially amplifies one position. Kalpi's thematic group model makes this structure explicit, but does not automatically solve the problem.

### 6. “Don't know” reduces information

A `null` answer deliberately gives a party neither an advantage nor a penalty and does not turn uncertainty into the midpoint of the scale. Likewise, a missing party position adds no neutral score: it is excluded from the average `score` and reduces `coverage`. The more questions users leave unanswered or mark as unknown, the less information is available for comparison.

Results show the match score and party data coverage specifically for the user's substantive answers. `coverage` is the weighted share of available party positions, accounting for components and thematic groups; it is not the share of answered questions in the whole questionnaire. It uses base weights without the importance multiplier. Even high coverage based on few answers does not mean the comparison represents all of the user's views, which is why separate answer-count and thematic-group thresholds apply.

### 7. Small differences between parties may not be meaningful

If the algorithm shows:

```text
Party A — 78%
Party B — 77%
```

this does not prove that Party A is a substantially better match. The difference may change because of one disputed coding decision, a weight adjustment, another reasonable scoring formula, a new source, or one additional user answer.

Close results are better presented as a group of approximately similar matches than as a falsely precise ranking.

### 8. Results depend on the distance function

Every matching algorithm contains normative choices: how much worse total disagreement is than partial disagreement; whether the cost of disagreement grows linearly; how to normalize coverage; how to combine fundamental and policy questions; and how to handle missing party positions.

There is no single mathematically correct function. The formula should be simple, public, reproducible, and open to sensitivity analysis. The formula used here is published above.

### 9. Political positions change over time

Kalpi represents party positions as of a particular date. Positions can change especially quickly on war and security, coalitions, specific bills, and current institutional disputes.

Each data version should have a research date and, ideally, a change history. Old data must not silently be presented as a party's current position.

### 10. A party is not a single person

There can be serious disagreements within a party. The views of its leader, most of its parliamentary faction, an individual member of the Knesset, and its official platform do not always coincide.

Kalpi must aggregate this diversity into a single party position because users vote for a party list rather than a mathematically homogeneous political actor. This is an unavoidable simplification, so the data records `entity_scope` and source provenance.

### 11. Kalpi does not adequately measure politicians' quality

Agreement on political positions is only one part of a voting decision. The questionnaire has little ability to directly assess leadership competence, governance quality, corruption risks, honesty, ability to deliver a program, candidate quality, institutional culture, or the likelihood of joining a particular coalition.

Someone may reasonably prefer a party with a 75% match over one with an 85% match if they have much greater trust in its ability to govern. Kalpi should not conceal this limitation.

### 12. Israel's coalition system complicates interpretation

A vote for a party in a parliamentary system affects more than its own platform: it influences faction size, likely coalitions, ministerial allocations, bargaining power, government formation, and the ability to block other parties' decisions.

The closest party is therefore not always the optimal choice for strategic voting. Kalpi asks “Which parties are closest to my political preferences?”, not “Which vote maximizes the probability of my preferred next government?” The latter requires a separate model based on current polls, the electoral threshold, and possible coalitions.

### 13. The questionnaire does not replace the user's own decision

Kalpi's main purpose is to reduce the effort required to obtain political information. It helps users articulate their preferences, identify important issues, compare them with party positions, discover unexpected agreement, and decide which parties to investigate further.

The result should say “Based on your answers, X, Y, and Z are closest to your political preferences,” rather than “You should vote for X.” Users can then separately consider candidate quality, trust, coalition scenarios, and other factors outside the model.

### Transparency and reproducibility

To make these limitations open to scrutiny, the repository provides:

- the full question list and its poles;
- thematic group structure and component weights;
- party positions where supported by evidence;
- sources, dates, scope, and supporting evidence for each position;
- the scoring formula and handling of `null` answers and `insufficient_data` status;
- coverage and data status;
- questionnaire, position, scoring, and data versions.

Kalpi results should be auditable, reproducible, and open to challenge. Uncertainty is better shown to users than hidden behind a falsely precise number.

## Data and evidence boundaries

Canonical application data is stored in JSON files:

- `data/parties.json` — the 12 active parties/lists in the current matrix;
- `data/questions.json` — 26 questions, their types, order, and Russian wording;
- `data/scoring-config.json` — versions, answer scale, thematic groups, weights, and release readiness checks;
- `data/positions.json` — the complete `party × question` matrix: 292 of 312 cells contain a position, while 20 remain `insufficient_data`;
- `data/sources.json` — the source archive available for manual review.

New party positions must not enter canonical data solely on the basis of a party's general image, name, assumptions, or a leader's statement without an appropriate `entity_scope`. `known`, `mixed`, and `historical` require a source, date, supporting evidence, and explanation. `insufficient_data` means `value: null`, `confidence: 0`, and no supporting evidence; it is not a centrist position.

The current JSON files are the sole source of production data. After manual review, update `data/sources.json` and `data/positions.json` directly.

## Languages and translations

Russian wording is stored in the source HTML/JS files and canonical data. English and Hebrew translations are in `locales/`:

- `ui-en.json` / `ui-he.json` — shared interface text;
- `app-en.json` / `app-he.json` — questionnaire and result strings;
- `pages-en.json` / `pages-he.json` — page text;
- `data-en.json` / `data-he.json` — translations of text from the data.

Switching languages preserves the user's answers; party positions, formulas, and weights are shared across languages.

Documentation is available in English in [README.md](README.md), Russian in [README.ru.md](README.ru.md), and Hebrew in [README.he.md](README.he.md). Update all three when behavior or methodology changes. Do not translate identifiers, commands, paths, or formulas.

## Current versions and release readiness

Current values are in `data/scoring-config.json`:

```text
schema_version:             kalpi-questionnaire-schema-v2
questionnaire_version:      kalpi-ru-core-2026-08-31-v4
party_positions_version:    kalpi-positions-prototype-v2
position_matrix_version:    kalpi-position-matrix-2026-08-31-v3
scoring_version:            kalpi-family-score-v3
data_version:               kalpi-data-prototype-v5
recommendation_mode:        live
prototype_trust_policy:     all_value_positions_full_confidence
user_importance_enabled:    true
```

The configuration's `near_tie_points: 0.03` defines a computed flag for parties within 3 percentage points of the leader; the interface note about close top results uses a separate 5-point threshold.

`recommendation_mode: live` does not bypass the release readiness check: the application runs it when opening results and returns to `data_not_ready` if the data no longer passes.

Changes to the party matrix alone do not reset browser-saved answers: state is migrated to the new `position_matrix_version`, and results are recalculated from current positions. When question pole orientation changes, Kalpi migrates compatible state through a dedicated migration: it inverts numerical answers only for affected questions, preserving “don't know,” priorities, the current question, and completion status.

## Running locally

Local serving requires Python 3; JavaScript checks require Node.js.

On Windows, double-click `start.bat`, or run this from PowerShell:

```powershell
python tools/serve.py --no-browser
```

Open the address printed by the server. A local HTTP server is required to load `data/*.json`; opening `index.html` directly through `file://` is not supported.

## Validation

```powershell
node --test tests/*.test.js
python tests/bundle.test.py
python tests/sync_position_matrix.test.py
node tools/release-gate-report.js --check
```

Write the full gate report and synthetic fixtures with `node tools/release-gate-report.js --write docs/release-gate-report.md`.
