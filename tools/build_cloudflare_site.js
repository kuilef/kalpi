'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const RUNTIME_FILES = Object.freeze([
  'index.html',
  'analytics.html',
  'methodology.html',
  'styles.css',
  'data-loader.js',
  'data-validation.js',
  'scoring.js',
  'analytics.js',
  'analytics-page.js',
  'questionnaire-state.js',
  'questionnaire-ui.js',
  'results-ui.js',
  'debug-fixture.js',
  'app.js',
]);

const DATA_FILES = Object.freeze([
  'data/parties.json',
  'data/questions.json',
  'data/positions.json',
  'data/sources.json',
  'data/scoring-config.json',
]);

const SERVICE_FILES = Object.freeze([
  'cloudflare/_headers',
  'cloudflare/_redirects',
]);

function allSourceFiles() {
  return [...RUNTIME_FILES, ...DATA_FILES, ...SERVICE_FILES];
}

function assertSourcesExist(rootDir) {
  const missing = allSourceFiles().filter((relativePath) => !fs.existsSync(path.join(rootDir, relativePath)));
  if (missing.length > 0) {
    throw new Error(`Cloudflare build is missing required files: ${missing.join(', ')}`);
  }
}

function copyFile(rootDir, outputDir, sourceRelativePath, destinationRelativePath = sourceRelativePath) {
  const sourcePath = path.join(rootDir, sourceRelativePath);
  const destinationPath = path.join(outputDir, destinationRelativePath);
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.copyFileSync(sourcePath, destinationPath);
}

function isWithinDirectory(parentDir, candidateDir) {
  const relativePath = path.relative(path.resolve(parentDir), path.resolve(candidateDir));
  return relativePath === '' || (!relativePath.startsWith(`..${path.sep}`) && relativePath !== '..' && !path.isAbsolute(relativePath));
}

function isSafeOutputDirectory(rootDir, outputDir) {
  const resolvedRootDir = path.resolve(rootDir);
  const resolvedOutputDir = path.resolve(outputDir);
  const filesystemRoot = path.parse(resolvedOutputDir).root;
  if (resolvedOutputDir === filesystemRoot || resolvedOutputDir === path.dirname(resolvedRootDir)) return false;
  return isWithinDirectory(resolvedRootDir, resolvedOutputDir) || isWithinDirectory(os.tmpdir(), resolvedOutputDir);
}

function buildCloudflareSite({ rootDir, outputDir }) {
  const resolvedRootDir = path.resolve(rootDir);
  const resolvedOutputDir = path.resolve(outputDir);
  if (!isSafeOutputDirectory(resolvedRootDir, resolvedOutputDir)) {
    throw new Error('Cloudflare output directory must be inside the repository or the system temporary directory');
  }

  assertSourcesExist(resolvedRootDir);
  fs.rmSync(resolvedOutputDir, { recursive: true, force: true });
  fs.mkdirSync(resolvedOutputDir, { recursive: true });

  for (const relativePath of RUNTIME_FILES) copyFile(resolvedRootDir, resolvedOutputDir, relativePath);
  for (const relativePath of DATA_FILES) copyFile(resolvedRootDir, resolvedOutputDir, relativePath);
  copyFile(resolvedRootDir, resolvedOutputDir, SERVICE_FILES[0], '_headers');
  copyFile(resolvedRootDir, resolvedOutputDir, SERVICE_FILES[1], '_redirects');

  const files = [
    ...RUNTIME_FILES,
    ...DATA_FILES,
    '_headers',
    '_redirects',
  ].sort();
  return { outputDir: resolvedOutputDir, files };
}

function parseArgs(argv) {
  const rootDir = path.resolve(__dirname, '..');
  let outputDir = path.join(rootDir, 'dist');
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--output-dir') {
      if (!argv[index + 1]) throw new Error('--output-dir requires a path');
      outputDir = path.resolve(argv[index + 1]);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argv[index]}`);
    }
  }
  return { rootDir, outputDir };
}

if (require.main === module) {
  try {
    const result = buildCloudflareSite(parseArgs(process.argv.slice(2)));
    process.stdout.write(`Cloudflare Pages artifact: ${result.outputDir}${os.EOL}`);
    process.stdout.write(`Files: ${result.files.length}${os.EOL}`);
    process.stdout.write(`${result.files.join(os.EOL)}${os.EOL}`);
  } catch (error) {
    process.stderr.write(`${error.message}${os.EOL}`);
    process.exitCode = 1;
  }
}

module.exports = { DATA_FILES, RUNTIME_FILES, buildCloudflareSite, isSafeOutputDirectory };
