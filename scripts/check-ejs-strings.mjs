// Fails when an EJS template contains user-facing text outside `t(...)` (constitution, principle VIII).
// Checked: text between tags and the title/alt/placeholder/aria-label attributes.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const VIEWS_DIR = 'apps/server/src/views';
const LETTERS = /[A-Za-zА-Яа-яІіЇїЄєҐґ]/;
const ALLOWED_WORDS = new Set(['Learnly']);
const TEXT_ATTRIBUTE = /\b(?:title|alt|placeholder|aria-label)\s*=\s*"([^"]*)"/g;

function listTemplates(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return listTemplates(path);
    return path.endsWith('.ejs') ? [path] : [];
  });
}

/** Blanks out EJS tags, comments, scripts and styles but keeps line breaks for line numbers. */
function stripNonText(source) {
  const blank = (match) => match.replace(/[^\n]/g, ' ');
  return source
    .replace(/<%[\s\S]*?%>/g, blank)
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/<script[\s\S]*?<\/script>/gi, blank)
    .replace(/<style[\s\S]*?<\/style>/gi, blank);
}

function hasUserText(text) {
  const words = text.split(/[^\p{L}]+/u).filter(Boolean);
  return words.some((word) => LETTERS.test(word) && !ALLOWED_WORDS.has(word));
}

function lineOf(source, index) {
  return source.slice(0, index).split('\n').length;
}

function findProblems(file) {
  const source = stripNonText(readFileSync(file, 'utf8'));
  const problems = [];
  for (const match of source.matchAll(/>([^<]+)</g)) {
    if (hasUserText(match[1])) problems.push({ line: lineOf(source, match.index), text: match[1].trim() });
  }
  for (const match of source.matchAll(TEXT_ATTRIBUTE)) {
    if (hasUserText(match[1])) problems.push({ line: lineOf(source, match.index), text: match[0] });
  }
  return problems.map((problem) => `${relative('.', file)}:${problem.line}  ${problem.text}`);
}

let templates = [];
try {
  templates = listTemplates(VIEWS_DIR);
} catch {
  console.log(`No templates found in ${VIEWS_DIR}.`);
}

const problems = templates.flatMap(findProblems);
if (problems.length > 0) {
  console.error('Hard-coded text in EJS templates (use t()):');
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log(`check-ejs-strings: ${templates.length} templates OK`);
