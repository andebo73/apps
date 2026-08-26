import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
await import('./build.mjs');

const brand = JSON.parse(readFileSync(join(ROOT, 'brand.config.json'), 'utf8'));
const esc = (value) => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const appsRoot = join(ROOT, 'src', 'apps');

const header = `<a class="qrx-header-home" href="${esc(brand.homeHref)}" aria-label="${esc(brand.name)} Startseite">
      <span class="fdb-shell-mark" aria-hidden="true">FDB</span>
      <span class="fdb-shell-name">${esc(brand.name)}</span>
    </a>`;
const legal = brand.legalLabel && brand.legalHref
  ? `\n    &middot; <a href="${esc(brand.legalHref)}" target="_blank" rel="noopener">${esc(brand.legalLabel)}</a>`
  : '';
const footer = `<div class="qrx-footer-brand">
    <strong>${esc(brand.name)}</strong>
    &middot; <a href="${esc(brand.homeHref)}">${esc(brand.storeLabel)}</a>${legal}
  </div>`;
const brandingCss = `.fdb-shell-mark{display:inline-grid;place-items:center;min-width:2.5rem;height:2.5rem;padding:0 .5rem;border-radius:var(--qrx-radius);background:var(--qrx-gradient);color:var(--qrx-text-on-brand);font-weight:800;letter-spacing:.04em}.fdb-shell-name{font-weight:700}`;

let count = 0;
for (const entry of readdirSync(appsRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const configPath = join(appsRoot, entry.name, 'app.config.json');
  if (!existsSync(configPath)) continue;
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const outputPath = join(ROOT, 'dist', config.output);
  let html = readFileSync(outputPath, 'utf8');
  html = html.replace(/<a class="qrx-header-home"[\s\S]*?<\/a>/, header);
  html = html.replace(/<div class="qrx-footer-brand">[\s\S]*?<\/div>/, footer);
  html = html.replace(/<title>([\s\S]*?)\s[–-]\squrix<\/title>/i, `<title>$1 – ${esc(brand.name)}</title>`);
  html = html.replace('</style>', `${brandingCss}\n</style>`);
  writeFileSync(outputPath, html);
  count++;
}

console.log(`FDB branding applied to ${count} app(s).`);

