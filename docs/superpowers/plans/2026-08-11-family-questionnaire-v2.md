# Kalpi Family Questionnaire v2 Implementation Plan

Выполнено в ветке `codex/family-questionnaire-v1`.

- Зафиксирован checkpoint предыдущей data/UI работы в `master`.
- Введены v2 questions, family config, явная пустая позиционная матрица и bundle loading.
- Добавлены чистый family scoring engine, v2 validator, analytics и versioned local state.
- Старый all-questions ranking и priority UI отключены от runtime.
- Реализован русскоязычный one-question wizard, review и `data_not_ready` results.
- Покрыты unit tests, generated-bundle test и browser flow.

Следующая отдельная работа: evidence-gated заполнение `positions.json`, coverage gate, переход `recommendation_mode` в `live`, затем калибровка axes и вычитанные EN/HE переводы.
