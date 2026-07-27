#!/usr/bin/env node
/**
 * TYPE-SAFETY RATCHET
 *
 * eslint.config.js turns `@typescript-eslint/no-explicit-any` and
 * `ban-ts-comment` off globally. That was the pragmatic call for a codebase
 * this size — switching them on produces four figures of errors, which is
 * noise nobody reads, and noise nobody reads is indistinguishable from no
 * rule at all.
 *
 * So instead of a big-bang cleanup, the same shape that already works for
 * model IDs (services/__tests__/modelIdSovereignty.test.ts): count the
 * violations, pin the count, and let it only ever go down. New code cannot
 * add `any`; existing debt gets paid off whenever someone is in the area.
 *
 * When you reduce the count, lower the baseline in lint-ratchet.json so the
 * ratchet tightens behind you. Goal: 0, at which point the rules move to
 * 'error' in eslint.config.js and this script is deleted.
 *
 * Kept out of `npm run lint` deliberately: it re-lints with different rules,
 * which roughly doubles lint time. CI runs it as its own step.
 */
import { ESLint } from 'eslint';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE_PATH = join(ROOT, 'scripts', 'lint-ratchet.json');

/** Rules held at a ceiling rather than enforced outright. */
const RATCHETED = ['@typescript-eslint/no-explicit-any', '@typescript-eslint/ban-ts-comment'];

/**
 * Production code only. `any` in a test mock is idiomatic and carries none
 * of the risk this rule exists to catch — counting it would put test doubles
 * at the top of the offender list and bury the real debt, which is `any` on
 * the boundaries of shipped code.
 */
const TARGETS = [
  'components/**/*.{ts,tsx}',
  'services/**/*.{ts,tsx}',
  'hooks/**/*.{ts,tsx}',
  'stores/**/*.ts',
  'utils/**/*.ts',
  'store.ts',
  'App.tsx',
];

/** Excluded at count time — ESLint's lintFiles rejects negated globs. */
const isTest = (p) =>
  p.includes('/__tests__/') || /\.(test|spec)\.tsx?$/.test(p);

const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));

const eslint = new ESLint({
  overrideConfigFile: join(ROOT, 'eslint.config.js'),
  overrideConfig: {
    files: ['**/*.{ts,tsx}'],
    rules: Object.fromEntries(RATCHETED.map(r => [r, 'error'])),
  },
});

const results = await eslint.lintFiles(TARGETS);

const counts = Object.fromEntries(RATCHETED.map(r => [r, 0]));
/** @type {Record<string, Record<string, number>>} */
const byFile = Object.fromEntries(RATCHETED.map(r => [r, {}]));

for (const result of results) {
  if (isTest(result.filePath)) continue;
  for (const m of result.messages) {
    if (!m.ruleId || !(m.ruleId in counts)) continue;
    counts[m.ruleId]++;
    const rel = result.filePath.replace(ROOT + '/', '');
    byFile[m.ruleId][rel] = (byFile[m.ruleId][rel] ?? 0) + 1;
  }
}

let failed = false;
let loosened = false;

for (const rule of RATCHETED) {
  const now = counts[rule];
  const max = baseline[rule];

  if (typeof max !== 'number') {
    console.error(`✗ ${rule}: no baseline recorded. Add one to scripts/lint-ratchet.json.`);
    failed = true;
    continue;
  }

  if (now > max) {
    failed = true;
    const worst = Object.entries(byFile[rule])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([f, c]) => `      ${String(c).padStart(4)}  ${f}`)
      .join('\n');
    console.error(
      `\n✗ ${rule}\n` +
        `    ${now} violations, ceiling is ${max} (+${now - max}).\n` +
        `    New code must not add these. Top files:\n${worst}\n`
    );
  } else if (now < max) {
    loosened = true;
    console.warn(
      `\n! ${rule}\n` +
        `    Down to ${now} from a ceiling of ${max}. Lower it in\n` +
        `    scripts/lint-ratchet.json so the ratchet holds.\n`
    );
  } else {
    console.log(`✓ ${rule}: ${now} (at ceiling)`);
  }
}

if (failed || loosened) process.exit(1);
console.log('\nType-safety ratchet holding.');
