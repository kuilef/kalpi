# Candidate research packages

Сюда копируются JSON-результаты исследования по одной партии:

```text
data/candidates/<party_id>/sources.json
data/candidates/<party_id>/positions.json
```

Это входные research-пакеты, а не runtime-файлы: браузер загружает только canonical `data/sources.json` и `data/positions.json`. Для prototype import используйте:

```powershell
python tools/sync_position_matrix.py --import-candidates --check
python tools/sync_position_matrix.py --import-candidates
python tools/build_data_bundle.py
```

Импорт детерминированно проверяет дубликаты позиций, коллизии source ID и отсутствие evidence. Он сохраняет исходные status, confidence, entity scope и verification status. Кандидатский источник, в том числе `candidate_unverified`, не становится верифицированным от самого факта импорта.
