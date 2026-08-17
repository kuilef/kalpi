# Публикация Kalpi на Cloudflare Pages

Kalpi — статический сайт. Cloudflare Pages получает не весь GitHub-репозиторий, а только папку `dist/`, которую собирает команда:

```powershell
node tools/build_cloudflare_site.js
```

В `dist/` находятся три HTML-страницы, runtime JavaScript, `styles.css`, пять канонических JSON-файлов, `_headers` и `_redirects`. Тесты, документация, `.git`, исследовательские архивы и инструменты туда не попадают.

Cloudflare Pages сам обслуживает HTML-файлы по коротким путям: `analytics.html` доступен как `/analytics`, а `methodology.html` — как `/methodology`. Не добавляйте для них rewrite в `_redirects`: Pages сначала канонизирует `*.html` в короткий путь, и такой rewrite создаёт бесконечный цикл редиректов.

Официальные инструкции: [Cloudflare Pages Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/), [custom headers](https://developers.cloudflare.com/pages/configuration/headers/), [redirects](https://developers.cloudflare.com/pages/configuration/redirects/) и [кэширование Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/).

## 1. Подготовить репозиторий

Перед первым подключением проверьте локальный артефакт:

```powershell
node tools/build_cloudflare_site.js
node --test tests/cloudflare-build.test.js
```

В результате появится `dist/`. Он генерируется заново и не редактируется вручную. В Git он не добавляется.

Перед публикацией желательно выполнить полный набор:

```powershell
node --test tests/*.test.js
python tests/bundle.test.py
python tests/sync_position_matrix.test.py
node tools/release-gate-report.js --check
git diff --check
```

После этого закоммитьте нужные изменения и отправьте их в GitHub:

```powershell
git add .
git commit -m "chore: prepare Cloudflare Pages deployment"
git push origin master
```

Если в рабочем дереве есть отдельные изменения, которые не должны попасть в deploy, не используйте `git add .`; добавьте только нужные файлы.

## 2. Создать Pages project

В Cloudflare Dashboard:

1. Откройте **Workers & Pages**.
2. Выберите **Create application** → **Pages** → подключение Git-репозитория.
3. Авторизуйте Cloudflare GitHub App.
4. Выберите репозиторий `kuilef/kalpi`.
5. Укажите настройки сборки:

| Поле | Значение |
|---|---|
| Project name | `kalpi` или выбранное имя проекта |
| Production branch | `master` |
| Framework preset | `None` / `No framework` |
| Root directory | `/` |
| Build command | `node tools/build_cloudflare_site.js` |
| Build output directory | `dist` |

Не добавляйте API-токен Cloudflare: Git integration сама получает доступ к репозиторию и запускает сборку. Не выбирайте Direct Upload для этого проекта — Cloudflare предупреждает, что Git-integrated project нельзя позднее просто переключить на Direct Upload.

После создания проекта Cloudflare выполнит первый build. Production URL появится в разделе Deployments. Ветки кроме `master` можно использовать для preview deployment, если это включено в настройках проекта.

## 3. Подключить домен

В Pages project откройте **Custom domains** → **Set up a custom domain** и введите домен.

Если DNS-зона уже находится в Cloudflare, Dashboard покажет нужную DNS-запись и предложит добавить её автоматически. Если DNS находится у другого провайдера, добавьте показанную Cloudflare запись вручную. Дождитесь статуса активного сертификата и проверьте HTTPS.

После подключения проверьте оба адреса:

```text
https://<pages-project>.pages.dev/
https://<ваш-домен>/
```

## 4. Как обновлять позиции партий

Канонический файл — `data/positions.json`. Процесс обновления:

```powershell
node tools/build_cloudflare_site.js
node --test tests/cloudflare-build.test.js
node tools/release-gate-report.js --check

git add data/positions.json
git commit -m "data: update party positions"
git push origin master
```

После push Cloudflare автоматически:

1. увидит новый commit в production-ветке;
2. запустит `node tools/build_cloudflare_site.js`;
3. соберёт новый `dist/` с обновлённым `positions.json`;
4. опубликует новый deployment;
5. переключит production URL на него.

Для небольшого проекта ориентируйтесь на несколько минут, но окончательным сигналом считается зелёный статус deployment в Cloudflare, а не прошедшее время.

Новые пользователи после успешного deployment получат новую матрицу при открытии сайта. Пользователь с уже открытой страницей продолжит видеть загруженную ранее матрицу до перезагрузки страницы. В Kalpi нет service worker, который мог бы удерживать старую копию офлайн.

Не добавляйте на custom domain агрессивное cache-правило для `data/*.json`. Cloudflare Pages сам управляет кэшем статических файлов и использует ETag; отдельный долгий кэш может задержать обновление данных.

## 5. Проверить опубликованный сайт

Проверьте production URL:

```text
/
/questionnaire
/analytics
/methodology
/index.html
/analytics.html
/methodology.html
/data/positions.json
/data/scoring-config.json
```

В DevTools проверьте:

- `positions.json` содержит ожидаемое число записей и новую дату проверки;
- нет `404` для JS, CSS и JSON;
- нет ошибок CSP в Console;
- ответ содержит `X-Content-Type-Options: nosniff`;
- на ширине 390 px нет горизонтального scroll страницы;
- analytics показывает актуальный release gate и матрицу.

Короткий путь `/questionnaire` задаётся в `_redirects`, а `/analytics` и `/methodology` предоставляются встроенным маршрутизатором Cloudflare Pages. Security-заголовки задаются в `_headers`.

## 6. Если build не проходит

Проверьте лог deployment в Cloudflare:

- `node` не найден — выбран неподходящий build image или команда запускается не из root directory;
- отсутствует обязательный файл — проверьте имена в `data/` и не удалён ли runtime-файл;
- Cloudflare публикует не те файлы — проверьте `Build output directory: dist`, а не `/`;
- изменения видны локально, но не на сайте — убедитесь, что commit отправлен именно в `master` и production deployment зелёный;
- старый JSON остаётся после зелёного deployment — сначала обновите страницу и проверьте ETag; если на custom domain настроено собственное кэширование, отключите его или очистите кэш зоны.

## 7. Откат

Если новый deployment оказался некорректным, откройте **Deployments**, выберите предыдущий успешный deployment и используйте действие rollback/redeploy, доступное в Dashboard. После отката проверьте production URL и версию `positions.json`.

Откат сайта не меняет GitHub-файл. Если исправленная версия должна остаться production-источником, внесите исправление в репозиторий и создайте новый commit.
