import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

/**
 * MODEL-ID SOVEREIGNTY RATCHET (NON-NEGOTIABLE rule enforcement)
 *
 * Rule: never hardcode model IDs — all code that calls an AI API must
 * read them from services/modelRegistry.ts (the single source of truth).
 * A hallucinated/stale literal breaks silently in production until a
 * user hits it.
 *
 * This is a ratchet, not a hard ban: there is pre-existing debt. The
 * count may ONLY go down. Any new hardcoded `gemini-*` literal pushes
 * the count above BASELINE and fails CI. When you migrate a file to
 * MODEL_REGISTRY, lower BASELINE to the new (smaller) number so the
 * ratchet tightens. Goal: BASELINE === 0.
 */
const BASELINE = 65;

// Source roots that ship to the runtime. Tests, type decls, the
// registry itself, and node_modules are exempt.
const SCAN_ROOTS = ['components', 'services', 'hooks', 'libs', 'data'];
const LITERAL = /['"]gemini-[0-9][0-9a-z.-]*['"]/g;

function isExempt(path: string): boolean {
  return (
    path.includes('node_modules') ||
    path.includes('__tests__') ||
    path.endsWith('.test.ts') ||
    path.endsWith('.test.tsx') ||
    path.endsWith('.spec.ts') ||
    path.endsWith('.d.ts') ||
    path.endsWith('services/modelRegistry.ts')
  );
}

function walk(dir: string, out: string[]): void {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let s;
    try {
      s = statSync(full);
    } catch {
      continue;
    }
    if (s.isDirectory()) {
      if (entry === 'node_modules' || entry === '__tests__') continue;
      walk(full, out);
    } else if (['.ts', '.tsx'].includes(extname(full)) && !isExempt(full)) {
      out.push(full);
    }
  }
}

describe('model-ID sovereignty (ratchet)', () => {
  it(`has no more than ${BASELINE} hardcoded gemini literals; new ones must use MODEL_REGISTRY`, () => {
    const root = join(__dirname, '..', '..');
    const files: string[] = [];
    for (const r of SCAN_ROOTS) walk(join(root, r), files);

    const offenders: { file: string; count: number }[] = [];
    let total = 0;
    for (const f of files) {
      const matches = readFileSync(f, 'utf8').match(LITERAL);
      if (matches?.length) {
        total += matches.length;
        offenders.push({ file: f.replace(root + '/', ''), count: matches.length });
      }
    }

    if (total > BASELINE) {
      offenders.sort((a, b) => b.count - a.count);
      const top = offenders.slice(0, 10).map(o => `  ${o.count}  ${o.file}`).join('\n');
      throw new Error(
        `Model-ID sovereignty regression: ${total} hardcoded gemini literals ` +
          `(baseline ${BASELINE}). New code must import from services/modelRegistry.ts ` +
          `(MODEL_REGISTRY.gemini.*), not embed the string.\nTop offenders:\n${top}`
      );
    }

    // Ratchet hygiene: if debt dropped, the baseline is stale — tighten it.
    expect(
      total,
      `Debt dropped to ${total}. Lower BASELINE in this file to ${total} so the ratchet holds.`
    ).toBe(BASELINE);
  });
});
