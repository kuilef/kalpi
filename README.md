# Kalpi

Kalpi — русскоязычный опросник о политических компромиссах и конкретных решениях в Израиле. Эта ветка готовит новый опросник и расчёт; она пока намеренно не публикует рекомендации партий.

## Что работает сейчас

- 23 core-вопроса, показанные по одному;
- пять позиций между двумя содержательными полюсами: `-1`, `-0.5`, `0`, `+0.5`, `+1`;
- отдельный ответ «Не знаю / недостаточно информации», который хранится как `null` и не равен центру шкалы;
- обзор ответов перед завершением, возврат к любому вопросу и сохранение состояния в браузере;
- честный экран `data_not_ready`: текущая матрица содержит 276 явных пустых ячеек, поэтому сайт не имитирует партийный ranking;
- debug-страница по адресу `/?debug=1` с покрытием по партиям, вопросам и families.

## Модель расчёта

Новый engine находится в `scoring.js`. Он уже готов к появлению проверенных партийных данных, но не вызывается для публичной рекомендации, пока `data/scoring-config.json` содержит `"recommendation_mode": "data_not_ready"`.

Для каждого отвеченного вопроса:

```text
raw = 1 - abs(user - party) / 2
adjusted = 0.5 + confidence × (raw - 0.5)
```

Сначала engine усредняет fundamental и policy-вопросы внутри family, затем применяет веса family. Число policy-вопросов не меняет политический вес family.

Подробный контракт и порядок наполнения находятся в [docs/party-position-json-workflow.md](docs/party-position-json-workflow.md).

## Данные

- `data/questions.json` — 23 русских вопроса, полюса, порядок и статус;
- `data/scoring-config.json` — families, веса `0.6 / 0.4`, версии и release gate;
- `data/positions.json` — полная матрица `party × question`; в этом релизе все записи `insufficient_data`;
- `data/sources.json` — архив существующих источников; позиции из него в v2 ещё не перенесены;
- `data/default-data.js` — сгенерированная копия runtime JSON для открытия через `file://`.

Старые axes, baseline и прежний scoring не подключаются в v2 runtime. Они оставлены в репозитории как legacy-материалы для отдельной будущей калибровки.

## Запуск и проверка

```text
python tools/serve.py --no-browser
node --test tests/*.test.js
python tests/bundle.test.py
python tools/build_data_bundle.py --check
```

После изменения JSON пересоберите bundle:

```text
python tools/build_data_bundle.py
```
