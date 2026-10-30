// Bundle budget of the SPA (SC-003): the JavaScript a first visit downloads (the entry script and every chunk
// index.html preloads) stays within 250 KB gzip, and the English dictionary is a chunk of its own outside it.
// Runs on an existing build: `npm run build -w @learnly/web` first.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { ROOT } from './lib/seeded-server.mjs';

const BUDGET_KB = 250;
const DIST = resolve(ROOT, 'apps/web/dist');
const INDEX = resolve(DIST, 'index.html');

if (!existsSync(INDEX)) {
  console.error('apps/web/dist/index.html is missing: run `npm run build -w @learnly/web` first.');
  process.exit(1);
}

const html = readFileSync(INDEX, 'utf8');
const initial = [...html.matchAll(/<(?:script type="module"[^>]*src|link rel="modulepreload"[^>]*href)="\/app\/([^"]+\.js)"/g)].map(
  (match) => match[1],
);
const gzipKb = (path) => gzipSync(readFileSync(resolve(DIST, path))).length / 1024;
const sizes = initial.map((path) => ({ path, kb: gzipKb(path) })).sort((a, b) => b.kb - a.kb);
const total = sizes.reduce((sum, { kb }) => sum + kb, 0);

console.log(`Initial JavaScript: ${initial.length} files, ${total.toFixed(1)} KB gzip (budget ${BUDGET_KB} KB)`);
for (const { path, kb } of sizes.slice(0, 5)) console.log(`  ${kb.toFixed(1).padStart(6)} KB  ${path}`);

const problems = [];
if (total > BUDGET_KB) problems.push(`the initial JavaScript is ${total.toFixed(1)} KB gzip, over ${BUDGET_KB} KB`);
const englishChunks = initial.filter((path) => readFileSync(resolve(DIST, path), 'utf8').includes('Browse the catalog'));
if (englishChunks.length > 0) problems.push(`the English dictionary is in the initial load: ${englishChunks.join(', ')}`);

if (problems.length > 0) {
  for (const problem of problems) console.error(`FAIL: ${problem}`);
  process.exit(1);
}
console.log('Bundle budget OK; the English dictionary loads on demand.');
