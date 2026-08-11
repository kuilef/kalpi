# Kalpi family questionnaire v2

Русский релиз v2 заменяет старые proposition-based вопросы на 23 фиксированных trade-off и policy-вопроса. Ответы лежат на шкале `[-1,+1]`; `null` — отдельный ответ «Не знаю».

`scoring-config.json` — единственный источник family relationships и structural weights. Ranking строится только через `question → A/B component → family → overall`; количество вопросов в family не добавляет ей веса.

В canonical data нет перенесённых партийных позиций. Runtime остаётся в `data_not_ready`, но engine, results renderer и debug покрыты fixtures. EN/HE, axes и реальный ranking намеренно отложены.
