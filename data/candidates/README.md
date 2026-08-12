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

Импорт детерминированно проверяет дубликаты позиций и отсутствие evidence. Если candidate source использует уже существующий ID с другим payload, canonical-источник не перезаписывается: candidate-копия получает ID вида `candidate_<party_id>_<source_id>`, а evidence позиции перепривязывается к ней. Так сохраняются все материалы, включая несколько независимых подтверждений одной позиции. Импорт сохраняет исходные status, confidence, entity scope и verification status; `candidate_unverified` не становится верифицированным от самого факта импорта.
