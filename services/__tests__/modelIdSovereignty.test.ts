import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

/**
 * MODEL-ID SOVEREIGNTY RATCHET (NON-NEGOTIABLE rule enforcement)
 *
 * Rule: never hardcode model IDs — all code that calls an AI API must read
 * them from services/modelRegistry.ts (the single source of truth). A
 * hallucinated or stale literal breaks silently in production until a user
 * hits it.
 *
 * Two independent guards live here:
 *
 *  1. RETIRED (hard ban, zero tolerance) — a literal naming a superseded
 *     model ID is not debt, it is a live bug: that string 404s the moment
 *     the provider drops the alias. Never allowed, in any file, including
 *     tests, which is deliberate: a test asserting on a dead ID passes for
 *     the wrong reason and pins the dead ID in place.
 *
 *  2. RATCHET (per provider) — the count of hardcoded literals may only go
 *     down. Any new one pushes a provider above its baseline and fails CI.
 *     When you migrate a file to MODEL_REGISTRY, lower that baseline so the
 *     ratchet tightens. Goal: every baseline at 0.
 *
 * The original version of this file scanned `gemini-*` only. That gap is
 * exactly how a batch of stale `claude-sonnet-4-6` / `claude-opus-4-8`
 * literals reached main unnoticed — the ratchet was green the whole time
 * because it was not looking at Anthropic. Every provider is covered now.
 */

/**
 * Superseded IDs, mirroring the `deprecated` block of
 * ~/.claude/config/pricing.json. Duplicated here on purpose: this suite has
 * to run in CI, which has no access to that file, and a guard that silently
 * no-ops when its data source is missing is worse than no guard.
 *
 * When pricing.json gains a deprecation, add it here too.
 */
const RETIRED_IDS = [
  'claude-opus-4-8',
  'claude-opus-4-7',
  'claude-opus-4-6',
  'claude-opus-4-5-20251101',
  'claude-opus-4-1-20250805',
  'claude-opus-4-20250514',
  'claude-sonnet-4-6',
  'claude-sonnet-4-5-20250929',
  'claude-sonnet-4-20250514',
  'claude-3-7-sonnet-20250219',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
  'claude-3-haiku-20240307',
  // Never existed — model-sweep catalogues these because they are the IDs
  // LLMs most often invent. One of them took down the JD Analyzer.
  'claude-sonnet-4-5-20251001',
  'claude-opus-4-5-20251001',
];

/** Per-provider debt ceilings. These may only ever be lowered. */
const BASELINES: Record<string, number> = {
  gemini: 65,
  claude: 68,
  openai: 28,
  grok: 6,
};

const PATTERNS: Record<string, RegExp> = {
  gemini: /['"]gemini-[0-9][0-9a-z.-]*['"]/g,
  claude: /['"]claude-[a-z0-9][0-9a-z.-]*['"]/g,
  openai: /['"](?:gpt-[0-9][0-9a-z.-]*|o[13](?:-[a-z0-9-]+)?)['"]/g,
  grok: /['"]grok-[0-9][0-9a-z.-]*['"]/g,
};

// Source roots that ship to the runtime.
const SCAN_ROOTS = ['components', 'services', 'hooks', 'libs', 'data'];

/** Exempt from the *ratchet*. The retired-ID ban ignores this entirely. */
function isRatchetExempt(path: string): boolean {
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

function walk(dir: string, out: string[], opts: { skipTests: boolean }): void {
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
      if (entry === 'node_modules' || entry === 'dist') continue;
      if (opts.skipTests && entry === '__tests__') continue;
      walk(full, out, opts);
    } else if (['.ts', '.tsx'].includes(extname(full))) {
      out.push(full);
    }
  }
}

const ROOT = join(__dirname, '..', '..');

function collect(opts: { skipTests: boolean }): string[] {
  const files: string[] = [];
  for (const r of SCAN_ROOTS) walk(join(ROOT, r), files, opts);
  return files;
}

const rel = (f: string) => f.replace(ROOT + '/', '');

describe('model-ID sovereignty', () => {
  it('contains no retired or hallucinated model IDs anywhere', () => {
    // Tests included: a stale ID asserted in a test is still a stale ID.
    // This file is the one exception — RETIRED_IDS is the ban list itself.
    const files = collect({ skipTests: false }).filter(
      f => !f.includes('node_modules') && f !== __filename
    );

    const hits: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      for (const dead of RETIRED_IDS) {
        // Quoted so claude-opus-4-5-20251101 cannot match inside a longer ID.
        const re = new RegExp(`['"]${dead.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
        const n = src.match(re)?.length ?? 0;
        if (n) hits.push(`  ${n}x  ${dead}  in  ${rel(f)}`);
      }
    }

    expect(
      hits,
      `Retired/hallucinated model IDs found. These 404 as soon as the provider ` +
        `drops the alias. Replace with the current ID from ` +
        `services/modelRegistry.ts (see the deprecated block of ` +
        `~/.claude/config/pricing.json for the mapping):\n${hits.join('\n')}`
    ).toEqual([]);
  });

  for (const [provider, baseline] of Object.entries(BASELINES)) {
    it(`has no more than ${baseline} hardcoded ${provider} literals`, () => {
      const files = collect({ skipTests: true }).filter(f => !isRatchetExempt(f));

      const offenders: { file: string; count: number }[] = [];
      let total = 0;
      for (const f of files) {
        const matches = readFileSync(f, 'utf8').match(PATTERNS[provider]);
        if (matches?.length) {
          total += matches.length;
          offenders.push({ file: rel(f), count: matches.length });
        }
      }

      if (total > baseline) {
        offenders.sort((a, b) => b.count - a.count);
        const top = offenders
          .slice(0, 10)
          .map(o => `  ${o.count}  ${o.file}`)
          .join('\n');
        throw new Error(
          `Model-ID sovereignty regression for ${provider}: ${total} hardcoded ` +
            `literals (baseline ${baseline}). New code must import from ` +
            `services/modelRegistry.ts, not embed the string.\nTop offenders:\n${top}`
        );
      }

      // Ratchet hygiene: if debt dropped, the baseline is stale — tighten it.
      expect(
        total,
        `${provider} debt dropped to ${total}. Lower BASELINES.${provider} in ` +
          `this file to ${total} so the ratchet holds.`
      ).toBe(baseline);
    });
  }
});
