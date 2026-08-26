import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const suites = join(ROOT, 'tests', 'suites');
const files = readdirSync(suites)
  .filter((name) => name.endsWith('.test.mjs'))
  .sort()
  .map((name) => join(suites, name));

if (!files.length) {
  console.error('No test suites found in tests/suites/.');
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  ['--test', '--test-concurrency=1', ...files],
  { cwd: ROOT, stdio: 'inherit' },
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);

