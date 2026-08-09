# Kalpi Party Questionnaire Prototype — Design Specification

Date: 2026-08-08
Status: Approved design, pending implementation review

## 1. Goal

Build a standalone, backend-free prototype that lets a user answer political-policy questions and then:

1. recommends the closest Israeli political party;
2. shows recommendation confidence and data coverage separately;
3. plots the user and parties on a selectable 2D political map;
4. shows all parties across five accepted political axes;
5. keeps missing party positions as `insufficient_data` rather than inventing neutral values;
6. allows party positions and sources to be expanded later via deep research without changing application logic.

The prototype must be usable by opening `index.html` locally.

## 2. Accepted multidimensional model

The prototype uses the later accepted five-axis model rather than the earlier eight thematic blocks.

Axes:

1. `economy_redistribution`
   - negative pole: stronger redistribution / larger state role
   - positive pole: more market competition / less state intervention

2. `security_territories`
   - negative pole: territorial compromise / diplomatic resolution
   - positive pole: territorial control / harder security posture

3. `religion_state`
   - negative pole: more secular / pluralistic state
   - positive pole: stronger institutional role for religion

4. `civil_social_rights`
   - negative pole: more restrictive / communitarian model
   - positive pole: broader individual equality and civil rights

5. `institutions_rule_of_law`
   - negative pole: more authority concentrated in elected political majority
   - positive pole: stronger independent institutions, judiciary and checks-and-balances

Axis labels and pole descriptions are data, not hard-coded UI constants.

## 3. Project structure

```text
kalpi-prototype/
├── index.html
├── app.js
├── styles.css
└── data/
    ├── parties.json
    ├── questions.json
    ├── positions.json
    └── sources.json
```

No build step and no backend are required for the MVP.

## 4. Data model

### 4.1 `parties.json`

Stores only party metadata.

Required fields:

```json
{
  "id": "yisrael_beytenu",
  "name_ru": "Наш дом Израиль",
  "name_he": "ישראל ביתנו",
  "leader": "Авигдор Либерман",
  "active": true
}
```

Optional fields may later include color, logo, aliases, or list composition.

### 4.2 `questions.json`

Each questionnaire item is independent of party data.

Required structure:

```json
{
  "id": "civil_marriage",
  "text_ru": "Следует ли разрешить гражданский брак в Израиле?",
  "importance_default": 1.0,
  "axis_weights": {
    "religion_state": -1.0,
    "civil_social_rights": 0.4
  },
  "enabled": true
}
```

Rules:

- one question may affect multiple axes;
- each axis coefficient has direction and magnitude;
- zero or omitted axis means no influence;
- question wording must be answerable on the shared five-point scale;
- axis mapping must be explicit and inspectable.

### 4.3 `positions.json`

Party positions are stored independently from questions and UI logic.

Known position:

```json
{
  "party": "yisrael_beytenu",
  "question": "civil_marriage",
  "value": 2,
  "status": "known",
  "confidence": 1.0,
  "entity_scope": "PARTY",
  "evidence": ["src_ndi_platform_civil_marriage"]
}
```

Unknown position:

```json
{
  "party": "likud",
  "question": "civil_marriage",
  "value": null,
  "status": "insufficient_data",
  "confidence": 0,
  "entity_scope": "PARTY",
  "evidence": []
}
```

Allowed `status` values for the prototype:

- `known`
- `mixed`
- `historical`
- `insufficient_data`

Allowed `entity_scope` values:

- `CURRENT_LIST`
- `PARTY`
- `FACTION`
- `COMPONENT_PARTY`
- `LEADER`
- `INDIVIDUAL_MK`

`COMPONENT_PARTY` and `LEADER` evidence must not be silently promoted to a current-list position. Such entries may be included with lower effective confidence or shown as contextual evidence.

### 4.4 `sources.json`

Stores provenance separately.

Example:

```json
{
  "id": "src_ndi_platform_civil_marriage",
  "title": "Israel Beytenu party platform",
  "url": "https://...",
  "source_type": "party_platform",
  "date": "2026-08-08",
  "notes_ru": "Актуальная программная позиция партии."
}
```

Suggested `source_type` values:

- `party_platform`
- `party_charter`
- `party_ideology`
- `official_statement`
- `parliamentary_vote`
- `component_party_platform`
- `leader_vote_history`
- `secondary_research`

## 5. User answer model

All substantive questions use the same five-point scale:

- `-2` — категорически против
- `-1` — скорее против
- `0` — нейтрально / не уверен
- `+1` — скорее за
- `+2` — полностью за

There is also a separate `skip` action.

`skip` differs from `0`:

- `0` is a substantive centrist/uncertain answer and participates in scoring;
- `skip` means no user evidence and the question is excluded from all calculations.

## 6. Recommendation scoring

### 6.1 Per-question agreement

For a user answer `u` and known party position `p`, both in `[-2, +2]`:

```text
distance = abs(u - p) / 4
agreement_q = 1 - distance
```

Thus:

- exact match => `1.0`
- maximum opposition => `0.0`

Party position confidence scales its contribution.

### 6.2 Known-position agreement

For all answered questions with known usable party positions:

```text
agreement = weighted_mean(agreement_q, question_importance × position_confidence)
```

Questions with `insufficient_data` are excluded from the agreement numerator and denominator.

### 6.3 Coverage

Coverage measures how much of the user's answered questionnaire is supported by usable party data:

```text
coverage = known_effective_weight / total_answered_weight
```

A low-confidence or contextual source contributes less effective coverage than a high-confidence current-party source.

### 6.4 Final score

Use conservative shrinkage toward 50%:

```text
final_score = agreement × coverage + 0.5 × (1 - coverage)
```

Interpretation:

- unknown evidence is neither agreement nor disagreement;
- sparse evidence cannot generate an extreme recommendation;
- a well-covered party can outrank a party with a superficially perfect match on very few known positions.

The UI must display all three values separately:

- final score;
- agreement on known positions;
- coverage.

## 7. Axis calculation

Party and user coordinates are derived from question mappings, never entered manually.

For axis `a`:

```text
axis_raw = weighted_mean(answer_or_position × axis_weight,
                         abs(axis_weight) × importance × confidence)
```

The result is normalized from the native `[-2, +2]` range to `[-100, +100]`.

### Missing-data rule

For each party/axis, calculate axis coverage.

If axis coverage is below a configurable minimum threshold, return:

```text
insufficient_data
```

Do not substitute `0`.

The exact MVP threshold should be a named configuration constant so it can be tuned after inspecting real data.

## 8. Questionnaire content

Target approximately 25 questions, preserving the previously proposed diagnostic questions and adding enough items to avoid poorly measured axes.

Core subjects include:

### Security and territories
- independent Palestinian state;
- Israeli sovereignty in Judea and Samaria;
- annexation / long-term Israeli control of parts of Gaza;
- death penalty for terrorist murder;
- balance between military control and diplomatic compromise.

### Religion and state
- civil marriage;
- public transportation on Shabbat;
- municipal autonomy on religion-state matters;
- Chief Rabbinate monopoly / religious pluralism.

### Service and equality
- Haredi military draft;
- Arab military or civil service;
- material benefits for serving citizens;
- sanctions or reduced benefits for non-serving citizens.

### Education
- mandatory core curriculum as a condition for state funding;
- unified state educational standards;
- role of religious/national identity versus civic-democratic education.

### Institutions
- term limits for prime minister;
- state commission of inquiry into October 7;
- political influence over judicial appointments;
- Supreme Court review powers;
- Basic Law: Legislation / constitutional settlement;
- independence of watchdog institutions.

### Economy and social policy
- redistribution versus lower taxation;
- expansion of public services versus smaller government;
- anti-monopoly regulation / competition;
- state housing and social support versus market allocation.

### Civil rights and identity
- equality principle in the Nation-State Law;
- minority rights and equal public participation;
- immigration / aliyah incentives where diagnostically useful.

Questions must be phrased as policy propositions, not party labels or left/right abstractions.

## 9. Results UI

### 9.1 Recommendation card

Show:

- top recommended party;
- final score;
- agreement on known positions;
- data coverage;
- number of unknown party positions among answered questions.

Then show ranked alternatives.

### 9.2 Explanation panel

For the recommended party, categorize answered questions into:

- strong matches;
- near matches;
- disagreements;
- unknown / insufficient-data positions.

Every party claim must be inspectable back to evidence/source entries.

### 9.3 2D political map

Display the user and parties on a square scatter plot.

Controls:

```text
X axis: [select one of five axes]
Y axis: [select a different axis]
```

Requirements:

- user marker visually distinct from parties;
- all visible parties use computed coordinates;
- parties with insufficient data on either selected axis are omitted from the plot;
- omitted parties are listed below as “not shown due to insufficient data”;
- no party is placed at the center solely because its data is missing.

### 9.4 Five-axis profile

Show a compact party/user comparison across all five axes.

A table is sufficient for MVP; a radar chart is optional and not required.

Unknown axis coordinates are rendered as `?` / `insufficient_data`.

## 10. Data inspection UI

Provide a “Показать все ответы и данные партий” section.

For each answered question show:

- user response;
- each party's value/status;
- evidence type;
- confidence;
- source link(s);
- contextual marker if evidence is from a component party or leader rather than the current list.

The intent is methodological transparency rather than a black-box political recommendation.

## 11. Extensibility after deep research

The prototype must require no JavaScript changes when:

- a missing party position becomes known;
- an existing position gains a stronger source;
- confidence changes;
- a new source is added;
- a new question is enabled;
- axis mappings are refined;
- a new party/list is added.

Normal update workflow:

1. add/update entry in `sources.json`;
2. add/update entry in `positions.json`;
3. optionally add/refine question in `questions.json`;
4. reload page;
5. recommendations and coordinates recompute automatically.

## 12. Error handling and validation

At startup the app validates:

- unique party IDs;
- unique question IDs;
- all position references resolve to an existing party/question;
- all evidence IDs resolve to sources;
- all axis names are recognized;
- values are in `[-2, 2]` or `null` for insufficient data;
- confidence is in `[0, 1]`.

Invalid records are skipped and displayed in a developer warning panel rather than crashing the questionnaire.

## 13. Testing

Minimum tests for the implementation:

1. exact user/party answer match => agreement `1.0`;
2. opposite answers => agreement `0.0`;
3. insufficient party position does not affect agreement;
4. insufficient position lowers coverage;
5. low coverage shrinks final score toward `0.5`;
6. skipped user question affects neither score nor axes;
7. user answer `0` is not treated as skipped;
8. party with insufficient axis coverage receives no coordinate;
9. adding a previously missing position changes results without code modification;
10. component-party evidence is visually distinguishable from current-list evidence.

## 14. Deliberate MVP exclusions

Not required initially:

- backend or database;
- login/accounts;
- persistent server-side profiles;
- automatic web research;
- automatic ingestion of Knesset votes;
- machine-learned axis weights;
- geographic maps;
- one-dimensional “left-right” final label.

These can be layered later without changing the normalized policy-data model.

## 15. Success criteria

The prototype is successful when:

1. it opens locally and runs without a server;
2. the user can complete or partially complete the questionnaire;
3. it produces ranked party recommendations with agreement and coverage separated;
4. it plots the user and parties on any selected pair of the five axes;
5. missing party information remains visibly missing;
6. all displayed party positions are traceable to source records;
7. editing JSON data alone is sufficient to change future recommendations and maps.
