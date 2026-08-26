import {
  copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync,
  statSync, writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueOf = (flag) => {
  const index = args.indexOf(flag);
  if (index < 0) return null;
  if (!args[index + 1] || args[index + 1].startsWith('--')) {
    throw new Error(`${flag} requires a value`);
  }
  return args[index + 1];
};

const selectedModes = ['--check', '--apply', '--verify'].filter(has);
const mode = selectedModes.length === 1 ? selectedModes[0].slice(2) : null;
if (!mode) {
  console.error('Usage: node tools/sync-upstream.mjs (--check|--apply|--verify) [--remove] [--source PATH]');
  process.exit(2);
}
if (has('--remove') && mode !== 'apply') {
  console.error('--remove is valid only together with --apply');
  process.exit(2);
}

let ROOT;
let MANIFEST_PATH;
let sourceRoot;
try {
  ROOT = resolve(valueOf('--root') || SCRIPT_ROOT);
  MANIFEST_PATH = resolve(valueOf('--manifest') || join(ROOT, 'upstream', 'manifest.json'));
  const initialManifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  sourceRoot = mode === 'verify' ? null : resolve(valueOf('--source') || initialManifest.sourcePath);
} catch (error) {
  console.error(error.message);
  process.exit(2);
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
const reportPath = resolve(valueOf('--report') || join(ROOT, '_work', 'upstream-sync-report.md'));
const posix = (value) => value.split(sep).join('/');
const hashFile = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const within = (base, path) => {
  const rel = relative(base, path);
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
};
const safeRelative = (path) => {
  if (!path || isAbsolute(path) || path.split(/[\\/]/).includes('..')) {
    throw new Error(`Unsafe manifest path: ${path}`);
  }
  return posix(path);
};

if (mode !== 'verify' && !existsSync(sourceRoot)) {
  console.error(`Upstream source does not exist: ${sourceRoot}`);
  process.exit(2);
}
if (!within(ROOT, reportPath)) {
  console.error(`Report path must stay inside the target root: ${reportPath}`);
  process.exit(2);
}

function listFiles(path) {
  const relPath = safeRelative(path);
  const absolute = resolve(sourceRoot, relPath);
  if (!within(sourceRoot, absolute)) throw new Error(`Path escapes upstream root: ${path}`);
  if (!existsSync(absolute)) throw new Error(`Allowlisted upstream path is missing: ${path}`);
  if (statSync(absolute).isFile()) return [relPath];
  const result = [];
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const child = join(dir, entry.name);
      if (entry.isDirectory()) visit(child);
      else if (entry.isFile()) result.push(posix(relative(sourceRoot, child)));
    }
  };
  visit(absolute);
  return result;
}

function listTargetFiles(path) {
  const relPath = safeRelative(path);
  const absolute = resolve(ROOT, relPath);
  if (!within(ROOT, absolute)) throw new Error(`Path escapes target root: ${path}`);
  if (!existsSync(absolute)) return [];
  if (statSync(absolute).isFile()) return [relPath];
  const result = [];
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const child = join(dir, entry.name);
      if (entry.isDirectory()) visit(child);
      else if (entry.isFile()) result.push(posix(relative(ROOT, child)));
    }
  };
  visit(absolute);
  return result;
}

function revisionOf(path) {
  try {
    return execFileSync(
      'git', ['-c', `safe.directory=${posix(path)}`, '-C', path, 'rev-parse', 'HEAD'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim();
  } catch {
    return 'unknown';
  }
}

function writeReport({ revision, updates, conflicts, removals, outcome }) {
  const section = (title, items) => [
    `## ${title} (${items.length})`, '',
    ...(items.length ? items.map((item) => `- \`${item}\``) : ['Keine.']), '',
  ].join('\n');
  const report = [
    '# Upstream-Sync-Bericht', '',
    `- Zeitpunkt: ${new Date().toISOString()}`,
    `- Modus: ${mode}${has('--remove') ? ' mit expliziter Removal-Freigabe' : ''}`,
    `- Ergebnis: ${outcome}`,
    `- Quelle: \`${posix(sourceRoot)}\``,
    `- Manifest-Revision vorher: \`${manifest.revision || 'unknown'}\``,
    `- Upstream-Revision aktuell: \`${revision}\``, '',
    section('Updates', updates),
    section('Lokale Konflikte', conflicts),
    section('Im Upstream entfernte Dateien', removals),
  ].join('\n');
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${report.trimEnd()}\n`);
}

if (mode === 'verify') {
  let actualFiles;
  try {
    actualFiles = [...new Set(manifest.paths.flatMap(listTargetFiles))].sort();
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
  const expectedFiles = Object.keys(manifest.files).sort();
  const expectedSet = new Set(expectedFiles);
  const actualSet = new Set(actualFiles);
  const missing = expectedFiles.filter((rel) => !actualSet.has(rel));
  const unexpected = actualFiles.filter((rel) => !expectedSet.has(rel));
  const modified = expectedFiles.filter((rel) => {
    const target = resolve(ROOT, safeRelative(rel));
    return existsSync(target) && hashFile(target) !== manifest.files[rel];
  });
  if (missing.length || unexpected.length || modified.length) {
    console.error('Upstream snapshot integrity check failed.');
    missing.forEach((rel) => console.error(`  missing: ${rel}`));
    unexpected.forEach((rel) => console.error(`  unexpected: ${rel}`));
    modified.forEach((rel) => console.error(`  modified: ${rel}`));
    process.exit(1);
  }
  console.log(`Upstream snapshot integrity verified (${expectedFiles.length} files at ${manifest.revision}).`);
  process.exit(0);
}

let files;
try {
  files = [...new Set(manifest.paths.flatMap(listFiles))].sort();
} catch (error) {
  console.error(error.message);
  process.exit(2);
}

const currentRevision = revisionOf(sourceRoot);
const updates = [];
const conflicts = [];
for (const rel of files) {
  const source = resolve(sourceRoot, rel);
  const target = resolve(ROOT, rel);
  if (!within(sourceRoot, source) || !within(ROOT, target)) {
    console.error(`Resolved path escapes an allowed root: ${rel}`);
    process.exit(2);
  }
  const sourceHash = hashFile(source);
  const targetHash = existsSync(target) ? hashFile(target) : null;
  const baselineHash = manifest.files[rel] || null;
  if (targetHash === sourceHash) continue;
  if (baselineHash && targetHash !== baselineHash) conflicts.push(rel);
  else updates.push(rel);
}

const tracked = new Set(files);
const removals = Object.keys(manifest.files).filter((rel) => !tracked.has(rel)).sort();

if (mode === 'check') {
  const outcome = conflicts.length ? 'blockiert' : updates.length || removals.length ? 'Aenderungen gefunden' : 'aktuell';
  writeReport({ revision: currentRevision, updates, conflicts, removals, outcome });
  if (conflicts.length) {
    console.error(`Local conflicts detected (${conflicts.length}); see ${posix(relative(ROOT, reportPath))}.`);
    process.exit(2);
  }
  if (updates.length || removals.length) {
    console.log(`Upstream changes detected: ${updates.length} update(s), ${removals.length} removal(s).`);
    console.log(`Report: ${posix(relative(ROOT, reportPath))}`);
    process.exit(1);
  }
  console.log(`Upstream snapshot is current (${files.length} files).`);
  console.log(`Report: ${posix(relative(ROOT, reportPath))}`);
  process.exit(0);
}

if (conflicts.length) {
  writeReport({ revision: currentRevision, updates, conflicts, removals, outcome: 'blockiert durch lokale Konflikte' });
  console.error(`Sync blocked by ${conflicts.length} local conflict(s); see ${posix(relative(ROOT, reportPath))}.`);
  process.exit(2);
}
if (removals.length && !has('--remove')) {
  writeReport({ revision: currentRevision, updates, conflicts, removals, outcome: 'Removal-Freigabe erforderlich' });
  console.error(`${removals.length} upstream removal(s) require an explicit --remove after report review.`);
  process.exit(2);
}

for (const rel of updates) {
  const source = resolve(sourceRoot, rel);
  const target = resolve(ROOT, rel);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
  console.log(`updated ${rel}`);
}
for (const rel of removals) {
  const target = resolve(ROOT, safeRelative(rel));
  const baselineHash = manifest.files[rel];
  if (existsSync(target) && hashFile(target) !== baselineHash) {
    writeReport({ revision: currentRevision, updates, conflicts: [rel], removals, outcome: 'blockiert durch Removal-Konflikt' });
    console.error(`Refusing to remove locally modified file: ${rel}`);
    process.exit(2);
  }
  if (existsSync(target)) rmSync(target);
  console.log(`removed ${rel}`);
}

const manifestChanged = updates.length || removals.length || manifest.revision !== currentRevision;
if (manifestChanged) {
  manifest.sourcePath = posix(sourceRoot);
  manifest.revision = currentRevision;
  manifest.syncedAt = new Date().toISOString();
  manifest.files = Object.fromEntries(files.map((rel) => [rel, hashFile(resolve(sourceRoot, rel))]));
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
}
writeReport({ revision: currentRevision, updates, conflicts, removals, outcome: 'angewendet' });
console.log(`Applied ${updates.length} update(s) and ${removals.length} removal(s); snapshot tracks ${files.length} files at ${currentRevision}.`);
