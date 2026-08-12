# Questionnaire response controls

## Goal

Make the five-point questionnaire response control immediately understandable and make keyboard answering discoverable, while preserving the existing answer values, shortcuts, auto-advance behaviour, and distinct `unknown` response.

## Interface

- Keep the two answer poles above the scale as the semantic endpoints.
- Render five adjacent, equal-width response segments between them. Each segment visibly shows its keyboard key (`1` through `5`) and a concise intensity label: `Полностью`, `Скорее`, `Посередине`, `Скорее`, `Полностью`.
- The selected segment uses the existing ink fill and paper-coloured text. Unselected segments remain paper with an ink border. Remove the radio-circle-only presentation and corner-positioned shortcut number.
- Directly below the five choices, add the concise instruction: `Можно отвечать клавишами 1–5; 0 — «Не знаю».`
- Retain `Не знаю / недостаточно информации` as a separate full-width choice with a clear `0` keycap. It remains semantically distinct from the scale’s centre answer.

## Behaviour and accessibility

- Clicking a segment or pressing its displayed numeric key selects the same existing radio input and preserves automatic advance.
- Keyboard shortcuts remain unavailable while the user is typing in a form field, matching existing behaviour.
- Radio inputs, labels, group labelling, checked state, focus visibility, and touch targets remain accessible.
- At 390px, segments stay readable and the instruction can wrap without horizontal scrolling.

## Validation

- Extend the focused UI structure/rendering tests to cover visible intensity labels and keyboard hint text.
- Run the JavaScript test suite and perform a manual browser check of mouse, keys `0–5`, selected styling, final-question result transition, and a 390px viewport.
