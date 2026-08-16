# Cloudflare Pages Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reproducible Cloudflare Pages artifact containing only Kalpi's public runtime, configure Pages headers/routes, and document GitHub-to-production deployment and data updates.

**Architecture:** The repository remains the source checkout. `tools/build_cloudflare_site.js` copies an explicit runtime allowlist and canonical JSON data into `dist/`; Cloudflare Pages publishes only `dist/` after a push to `master`. `cloudflare/_headers` and `cloudflare/_redirects` are source-controlled service files copied into the artifact.

**Tech Stack:** Node.js built-in `fs`/`path`, static HTML/CSS/JavaScript, Cloudflare Pages Git integration, Node built-in test runner, Python existing checks.

## Global Constraints

- Do not modify application scoring, questionnaire behavior, or canonical data.
- Do not copy `.git`, `tests/`, `docs/`, `audit/`, `tools/`, README files, or local-server files into `dist/`.
- The five canonical runtime JSON files remain the only production data source.
- `dist/` is generated output and must be ignored by Git.
- The existing unstaged `README.md` change must remain untouched and must not be included in any new commit.
- The artifact must work at `/`, with relative asset and data URLs.
- Do not add API tokens, account IDs, or domain credentials to the repository.
- Use Cloudflare Pages' default asset caching; do not add an aggressive custom cache rule for `positions.json`.

---

### Task 1: Define and prove the deployment artifact contract

**Files:**
- Create: `tests/cloudflare-build.test.js`
- Read: `index.html`, `analytics.html`, `methodology.html`, `data-loader.js`

**Interfaces:**
- The future module `tools/build_cloudflare_site.js` exports `RUNTIME_FILES`, `DATA_FILES`, and `buildCloudflareSite({ rootDir, outputDir })`.
- `buildCloudflareSite` returns `{ outputDir, files }`, where `files` is the sorted list of relative artifact paths.

- [ ] **Step 1: Write the failing test**

Create a Node test that makes a temporary output directory, calls `buildCloudflareSite`, and asserts:

```js
assert.deepEqual(result.files, expectedFiles.sort());
assert.equal(fs.existsSync(path.join(outputDir, 'index.html')), true);
assert.equal(fs.existsSync(path.join(outputDir, 'data', 'positions.json')), true);
assert.equal(fs.existsSync(path.join(outputDir, 'tests')), false);
assert.equal(fs.existsSync(path.join(outputDir, 'README.md')), false);
assert.match(fs.readFileSync(path.join(outputDir, '_headers'), 'utf8'), /X-Content-Type-Options: nosniff/);
assert.match(fs.readFileSync(path.join(outputDir, '_redirects'), 'utf8'), /^\/analytics \/analytics\.html 200$/m);
```

The expected list must contain the three HTML pages, `styles.css`, the ten JavaScript runtime files, five files under `data/`, `_headers`, and `_redirects` — 21 artifact files in total.

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run:

```powershell
node --test tests/cloudflare-build.test.js
```

Expected: the test fails because `tools/build_cloudflare_site.js` does not exist yet.

- [ ] **Step 3: Keep the test isolated and safe**

Use `fs.mkdtempSync(path.join(os.tmpdir(), 'kalpi-pages-'))` for the output directory and remove it in `finally`, so the test never deletes or overwrites the repository `dist/` directory.

### Task 2: Implement the allowlisted Cloudflare build

**Files:**
- Create: `tools/build_cloudflare_site.js`
- Create: `cloudflare/_headers`
- Create: `cloudflare/_redirects`
- Create: `wrangler.toml`
- Modify: `.gitignore`
- Test: `tests/cloudflare-build.test.js`

**Interfaces:**
- `RUNTIME_FILES` is the explicit list of public HTML/CSS/JavaScript files.
- `DATA_FILES` is the explicit list of five `data/*.json` files.
- `buildCloudflareSite({ rootDir, outputDir })` removes only the selected output directory, recreates it, validates every source file, copies the allowlist, copies Cloudflare service files, and returns the sorted artifact list.
- CLI usage is `node tools/build_cloudflare_site.js [--output-dir <path>]`; default output is `<repo>/dist`.

- [ ] **Step 1: Add the Cloudflare service source files**

Create `cloudflare/_headers` with security headers only:

```text
/*
	X-Content-Type-Options: nosniff
	Referrer-Policy: strict-origin-when-cross-origin
	Permissions-Policy: camera=(), microphone=(), geolocation=()
	Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'self'; frame-ancestors 'none'; form-action 'self'
```

Create `cloudflare/_redirects`:

```text
/questionnaire /index.html 200
/analytics /analytics.html 200
/methodology /methodology.html 200
```

Do not add `Cache-Control` here; Cloudflare Pages' default caching is preferred for this static site.

- [ ] **Step 2: Implement the minimal copy-and-validate builder**

Use only Node built-ins. Validate source paths before deleting the output directory. Copy each allowlisted file with `fs.copyFileSync`, create parent directories with `fs.mkdirSync({ recursive: true })`, and fail with the missing relative paths if any source is absent. Never scan and copy the whole repository.

- [ ] **Step 3: Add Pages metadata and ignore generated output**

Create `wrangler.toml`:

```toml
name = "kalpi"
pages_build_output_dir = "./dist"
```

Add `dist/` to `.gitignore` and leave all existing ignore rules unchanged.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```powershell
node --test tests/cloudflare-build.test.js
```

Expected: all artifact allowlist, data-copy, service-file, and exclusion assertions pass.

### Task 3: Document operation and run the full release checks

**Files:**
- Create: `docs/DEPLOY-CLOUDFLARE.md`
- Test: `tests/cloudflare-build.test.js`
- Read: `docs/superpowers/specs/2026-08-16-cloudflare-pages-deployment-design.md`

**Interfaces:**
- The manual documents the exact Cloudflare Pages dashboard values: GitHub repository `kuilef/kalpi`, production branch `master`, no framework preset, build command `node tools/build_cloudflare_site.js`, output directory `dist`, and root directory `/`.
- The manual documents the update cycle for `data/positions.json`, preview deployments, custom domains, and post-deploy checks.

- [ ] **Step 1: Write the Russian Cloudflare manual**

Include prerequisites, first-time Pages setup, exact build settings, local artifact commands, custom-domain setup, data-update workflow, expected deployment timing, cache/reload behavior, rollback through a previous Pages deployment, and a short troubleshooting section. Link to official Cloudflare Pages Git integration, headers, redirects, and caching documentation.

- [ ] **Step 2: Add an artifact command check to the manual**

Document:

```powershell
node tools/build_cloudflare_site.js
node --test tests/cloudflare-build.test.js
node --test tests/*.test.js
python tests/bundle.test.py
python tests/sync_position_matrix.test.py
node tools/release-gate-report.js --check
```

Explain that `dist/` is generated, should not be edited manually, and is not committed.

- [ ] **Step 3: Generate the real artifact**

Run `node tools/build_cloudflare_site.js` and inspect the resulting file list. Confirm it contains exactly the 21 expected files and no repository-only content.

- [ ] **Step 4: Run the complete verification set**

Run the focused artifact test, all JavaScript tests, both Python tests, release gate, `git diff --check`, and an HTTP smoke test for the three HTML pages and five JSON files served from `dist/`. Record exit codes and counts before claiming completion.

- [ ] **Step 5: Check repository scope**

Run `git status --short` and `git diff --stat`. Confirm the existing `README.md` change remains present and that no generated `dist/` files are tracked or included in the task's source changes.
