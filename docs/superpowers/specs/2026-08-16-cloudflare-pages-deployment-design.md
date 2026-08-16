# Cloudflare Pages deployment design

**Дата:** 2026-08-16

## Цель

Подготовить Kalpi к публикации на Cloudflare Pages без загрузки в production служебных файлов репозитория. GitHub остаётся полным исходным проектом, а Cloudflare получает только проверенный статический runtime-артефакт `dist/`.

## Утверждённый подход

Используется Cloudflare Pages Git integration для репозитория `kuilef/kalpi` и ветки `master`.

Cloudflare запускает:

```text
node tools/build_cloudflare_site.js
```

Результат публикации:

```text
dist/
```

В `dist/` попадают только страницы, runtime JavaScript, stylesheet и пять канонических JSON-файлов данных. Тесты, документация, исследовательские архивы, исходные инструменты, `.git` и локальный сервер туда не копируются.

## Runtime-граница

Публикуемые страницы:

- `index.html`;
- `analytics.html`;
- `methodology.html`.

Публикуемые runtime-ресурсы:

- `styles.css`;
- `data-loader.js`;
- `data-validation.js`;
- `scoring.js`;
- `analytics.js`;
- `analytics-page.js`;
- `questionnaire-state.js`;
- `questionnaire-ui.js`;
- `results-ui.js`;
- `debug-fixture.js`;
- `app.js`.

Публикуемые канонические данные:

- `data/parties.json`;
- `data/questions.json`;
- `data/positions.json`;
- `data/sources.json`;
- `data/scoring-config.json`.

## Cloudflare-служебные файлы

Генератор добавляет в `dist/`:

- `_headers` — базовые security-заголовки, включая `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` и CSP, ограниченную собственными статическими ресурсами;
- `_redirects` — понятные короткие пути `/questionnaire`, `/analytics` и `/methodology`, переписываемые на соответствующие HTML-страницы с кодом `200`.

Заголовки и маршруты должны проверяться smoke-тестом после публикации, потому что локальный Python-сервер их не применяет.

## Обновление данных

Канонические JSON остаются единственным источником production-данных. При изменении вопросов, позиций или конфигурации повторный запуск генератора создаёт новый `dist/` из текущего checkout; вручную редактировать копии внутри `dist/` нельзя.

## Проверки

До публикации выполняются:

1. генерация `dist/`;
2. проверка allowlist: присутствуют все обязательные файлы и отсутствуют запрещённые каталоги/файлы;
3. `node --test tests/*.test.js`;
4. Python-тесты bundle и matrix;
5. `node tools/release-gate-report.js --check`;
6. HTTP smoke test страниц и пяти JSON-файлов;
7. после deploy — проверка реального `*.pages.dev` или custom domain, включая короткие пути и security headers.

## Ограничения

Текущий проект остаётся prototype-релизом: release gate проходит, но политика `all_value_positions_full_confidence` и неполные/исторические позиции должны быть явно отражены в публичной методологии. Cloudflare-подготовка не заменяет дальнейшую проверку политических источников.

## Не входит в эту работу

- автоматическая регистрация Cloudflare account или domain;
- хранение API-токена в репозитории;
- изменение scoring/data policy;
- перенос тестов и исследовательских документов в публичный runtime.
