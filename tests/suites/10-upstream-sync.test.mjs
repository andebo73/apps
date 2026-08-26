import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(ROOT, 'tools', 'sync-upstream.mjs');
const CACHE = join(ROOT, 'tests', '.cache');

function fixture() {
  mkdirSync(CACHE, { recursive: true });
  const base = mkdtempSync(join(CACHE, 'sync-'));
  const source = join(base, 'source');
  const target = join(base, 'target');
  mkdirSync(join(source, 'framework'), { recursive: true });
  mkdirSync(join(target, 'upstream'), { recursive: true });
  writeFileSync(join(source, 'framework', 'keep.txt'), 'keep-v1\n');
  writeFileSync(join(source, 'framework', 'remove.txt'), 'remove-v1\n');
  writeFileSync(join(target, 'upstream', 'manifest.json'), `${JSON.stringify({
    schemaVersion: 1,
    name: 'fixture',
    sourcePath: source,
    revision: 'unknown',
    syncedAt: null,
    paths: ['framework'],
    files: {},
  }, null, 2)}\n`);
  return { base, source, target };
}

function run({ source, target }, ...args) {
  return execFileSync(process.execPath, [
    SCRIPT, ...args, '--root', target, '--source', source,
  ], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function runFailure(paths, ...args) {
  try {
    run(paths, ...args);
    assert.fail('sync command unexpectedly succeeded');
  } catch (error) {
    return error;
  }
}

test('apply is idempotent and writes a report', () => {
  const paths = fixture();
  try {
    run(paths, '--apply');
    const manifestPath = join(paths.target, 'upstream', 'manifest.json');
    const firstManifest = readFileSync(manifestPath, 'utf8');
    const output = run(paths, '--apply');
    assert.match(output, /Applied 0 update\(s\) and 0 removal\(s\)/);
    assert.equal(readFileSync(manifestPath, 'utf8'), firstManifest);
    const report = readFileSync(join(paths.target, '_work', 'upstream-sync-report.md'), 'utf8');
    assert.match(report, /Ergebnis: angewendet/);
    assert.match(report, /Updates \(0\)/);
  } finally {
    rmSync(paths.base, { recursive: true, force: true });
  }
});

test('local edits block an upstream update and are reported', () => {
  const paths = fixture();
  try {
    run(paths, '--apply');
    writeFileSync(join(paths.target, 'framework', 'keep.txt'), 'local-edit\n');
    writeFileSync(join(paths.source, 'framework', 'keep.txt'), 'upstream-v2\n');
    const error = runFailure(paths, '--apply');
    assert.equal(error.status, 2);
    assert.equal(readFileSync(join(paths.target, 'framework', 'keep.txt'), 'utf8'), 'local-edit\n');
    const report = readFileSync(join(paths.target, '_work', 'upstream-sync-report.md'), 'utf8');
    assert.match(report, /Lokale Konflikte \(1\)/);
    assert.match(report, /framework\/keep\.txt/);
  } finally {
    rmSync(paths.base, { recursive: true, force: true });
  }
});

test('upstream removals require explicit approval', () => {
  const paths = fixture();
  try {
    run(paths, '--apply');
    unlinkSync(join(paths.source, 'framework', 'remove.txt'));
    const blocked = runFailure(paths, '--apply');
    assert.equal(blocked.status, 2);
    assert.ok(existsSync(join(paths.target, 'framework', 'remove.txt')));
    const report = readFileSync(join(paths.target, '_work', 'upstream-sync-report.md'), 'utf8');
    assert.match(report, /Im Upstream entfernte Dateien \(1\)/);
    run(paths, '--apply', '--remove');
    assert.equal(existsSync(join(paths.target, 'framework', 'remove.txt')), false);
  } finally {
    rmSync(paths.base, { recursive: true, force: true });
  }
});

