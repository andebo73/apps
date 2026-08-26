import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('FDB snapshot builds without the qurix working directory', () => {
  execFileSync(process.execPath, ['tools/build-fdb.mjs'], { cwd: ROOT, stdio: 'pipe' });
  const portal = readFileSync(join(ROOT, 'dist', 'index.html'), 'utf8');
  assert.match(portal, /<!DOCTYPE html>/);
  assert.match(portal, /<title>FDB Apps<\/title>/);
  assert.match(portal, />FDB Apps</);
  assert.doesNotMatch(portal, /<!--SLOT:cards-->/);
  const visibleMarkup = portal
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  assert.doesNotMatch(visibleMarkup, /qurix/i);
});

test('upstream manifest has revision and hashes', () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'upstream', 'manifest.json'), 'utf8'));
  assert.match(manifest.revision, /^[0-9a-f]{40}$/);
  assert.ok(manifest.syncedAt);
  assert.ok(Object.keys(manifest.files).length > 0);
});

test('checklist is emitted as a branded self-contained app', () => {
  const app = readFileSync(join(ROOT, 'dist', 'checklist.html'), 'utf8');
  assert.match(app, /<title>Checkliste – FDB Apps<\/title>/);
  assert.match(app, /window\.qurixApp\.serializeState/);
  assert.match(app, /window\.qurixApp\.hydrateState/);
  assert.match(app, /id="importDialog"/);
  assert.match(app, /id="editDialog"/);
  assert.match(app, /id="editText"/);
  assert.match(app, /id="editTags"/);
  assert.match(app, /id="newBlankList"/);
  assert.match(app, />Aus Profil erstellen</);
  assert.match(app, /Kein Profil · freie Liste/);
  assert.doesNotMatch(app, /<!--SLOT:/);
});
