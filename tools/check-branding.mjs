import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(ROOT, 'dist');
if (!existsSync(dist)) {
  console.error('dist/ does not exist; run the build first.');
  process.exit(2);
}

const files = readdirSync(dist).filter((name) => name.endsWith('.html')).sort();
if (!files.length) {
  console.error('No generated HTML files found in dist/.');
  process.exit(1);
}

const failures = [];
for (const file of files) {
  const html = readFileSync(join(dist, file), 'utf8');
  const visibleMarkup = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  if (/qurix/i.test(visibleMarkup)) failures.push(`${file}: visible qurix branding`);
  if (!/FDB Apps/i.test(visibleMarkup)) failures.push(`${file}: FDB Apps branding missing`);
  if (!/<title>[^<]*FDB Apps[^<]*<\/title>/i.test(html)) failures.push(`${file}: FDB Apps title missing`);
}

if (failures.length) {
  console.error('Branding check failed:');
  failures.forEach((failure) => console.error(`  ${failure}`));
  process.exit(1);
}
console.log(`FDB branding verified in ${files.length} generated HTML file(s).`);

