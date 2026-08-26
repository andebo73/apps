import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_PATH = join(ROOT, 'upstream', 'manifest.json');
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
const args = process.argv.slice(2);
const mode = args.includes('--apply') ? 'apply' : args.includes('--check') ? 'check' : null;
if (!mode || (args.includes('--apply') && args.includes('--check'))) {
  console.error('Usage: node tools/sync-upstream.mjs (--check|--apply) [--source PATH]');
  process.exit(2);
}

const sourceIndex = args.indexOf('--source');
if (sourceIndex >= 0 && !args[sourceIndex + 1]) {
  console.error('--source requires a path');
  process.exit(2);
}
const sourceRoot = resolve(sourceIndex >= 0 ? args[sourceIndex + 1] : manifest.sourcePath);
if (!existsSync(sourceRoot)) {
  console.error(`Upstream source does not exist: ${sourceRoot}`);
  process.exit(2);
}

const posix = (value) => value.split(sep).join('/');
const hashFile = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

function listFiles(path) {
  const absolute = join(sourceRoot, path);
  if (!existsSync(absolute)) throw new Error(`Allowlisted upstream path is missing: ${path}`);
  if (statSync(absolute).isFile()) return [path];
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

const files = manifest.paths.flatMap(listFiles).sort();
const changes = [];
const conflicts = [];

for (const rel of files) {
  const source = join(sourceRoot, rel);
  const target = join(ROOT, rel);
  const sourceHash = hashFile(source);
  const targetHash = existsSync(target) ? hashFile(target) : null;
  const baselineHash = manifest.files[rel] || null;
  if (targetHash !== sourceHash) changes.push({ rel, source, target, sourceHash });
  if (mode === 'apply' && baselineHash && targetHash !== baselineHash && targetHash !== sourceHash) {
    conflicts.push(rel);
  }
}

const tracked = new Set(files);
for (const rel of Object.keys(manifest.files)) {
  if (!tracked.has(rel)) conflicts.push(`${rel} (removed upstream; delete manually after review)`);
}

if (conflicts.length) {
  console.error('Sync blocked by local changes or upstream removals:');
  conflicts.forEach((rel) => console.error(`  ${rel}`));
  process.exit(2);
}

if (mode === 'check') {
  if (!changes.length) {
    console.log(`Upstream snapshot is current (${files.length} files).`);
    process.exit(0);
  }
  console.log(`Upstream changes detected (${changes.length} of ${files.length} files):`);
  changes.forEach(({ rel }) => console.log(`  ${rel}`));
  process.exit(1);
}

for (const change of changes) {
  mkdirSync(dirname(change.target), { recursive: true });
  copyFileSync(change.source, change.target);
  console.log(`updated ${change.rel}`);
}

let revision = 'unknown';
try {
  revision = execFileSync(
    'git',
    ['-c', `safe.directory=${posix(sourceRoot)}`, '-C', sourceRoot, 'rev-parse', 'HEAD'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
  ).trim();
} catch {
  console.warn('Warning: upstream Git revision could not be determined.');
}

manifest.sourcePath = posix(sourceRoot);
manifest.revision = revision;
manifest.syncedAt = new Date().toISOString();
manifest.files = Object.fromEntries(files.map((rel) => [rel, hashFile(join(sourceRoot, rel))]));
writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Applied ${changes.length} change(s); snapshot now tracks ${files.length} files at ${revision}.`);

