import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

/**
 * CLIENT BUNDLE ENV-EXPOSURE GUARD
 *
 * Vite inlines `import.meta.env.VITE_FOO` by static text substitution: it
 * swaps that exact expression for the literal value at build time. Anything
 * that touches the env object *without* naming a property in that exact
 * shape — aliasing it, destructuring it, optional-chaining through it —
 * cannot be substituted per-property, so Vite serialises the WHOLE env
 * object into the chunk instead.
 *
 * That is how `components/CinemaStudio/index.tsx` leaked. One line:
 *
 *     const env = import.meta.env as Record<string, string | undefined>;
 *
 * shipped every VITE_ var present at build time into
 * dist/assets/ImageGen-*.js — including a live VITE_DEEPSEEK_API_KEY and a
 * VITE_FAL_API_KEY that the file never even referenced, plus
 * VITE_ACCESS_PASSPHRASE. It silently undid the "BYO-key only" lockdown,
 * and nothing caught it because the source looked like ordinary env access
 * and the values only appear in the built output.
 *
 * So: read one named property at a time, always. This guard enforces that
 * at the source level, where it runs in CI without needing a build.
 *
 * Note this is a defence-in-depth guard, not a licence to put secrets in
 * VITE_ vars. Every VITE_ var is public by design — it reaches the browser
 * whether or not the whole object is serialised. Operator API keys belong
 * in the in-app encrypted vault (apiKeyService), never in the environment.
 */

const SCAN_ROOTS = ['components', 'services', 'hooks', 'libs', 'data', 'store', 'stores', 'utils'];

/**
 * The build-time keys Vite defines. Reading any of these by name is fine —
 * they are substituted individually and none of them is a secret.
 */
const SAFE_PROPERTY = /^(?:VITE_[A-Z0-9_]+|DEV|PROD|MODE|SSR|BASE_URL|LEGACY)\b/;

function isExempt(path: string): boolean {
  return (
    path.includes('node_modules') ||
    path.includes('/dist/') ||
    path.includes('__tests__') ||
    path.endsWith('.test.ts') ||
    path.endsWith('.test.tsx') ||
    path.endsWith('.spec.ts') ||
    path.endsWith('.d.ts')
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
      if (entry === 'node_modules' || entry === 'dist') continue;
      walk(full, out);
    } else if (['.ts', '.tsx'].includes(extname(full)) && !isExempt(full)) {
      out.push(full);
    }
  }
}

const ROOT = join(__dirname, '..', '..');

describe('client bundle env exposure', () => {
  it('never aliases or destructures import.meta.env', () => {
    const files: string[] = [];
    for (const r of SCAN_ROOTS) walk(join(ROOT, r), files);

    const offenders: string[] = [];

    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      const lines = src.split('\n');

      lines.forEach((line, i) => {
        // Skip comments — this very rule is documented in prose elsewhere.
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;

        // Every occurrence of the env object, with whatever follows it.
        const re = /import\.meta\.env\s*(.{0,24})/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(line)) !== null) {
          const after = m[1];
          // Safe: the access names a property, via `.` or `?.`. Optional
          // chaining was verified empirically against this Vite version —
          // building with `import.meta.env?.VITE_X` produced no serialised
          // env object and leaked no values. What matters is that a property
          // is named at all; it is the unqualified object that gets inlined.
          const prop = after.startsWith('?.')
            ? after.slice(2)
            : after.startsWith('.')
              ? after.slice(1)
              : null;
          if (prop !== null && SAFE_PROPERTY.test(prop)) continue;

          offenders.push(
            `  ${file.replace(ROOT + '/', '')}:${i + 1}\n      ${trimmed.slice(0, 110)}`
          );
        }
      });
    }

    expect(
      offenders,
      `import.meta.env must be read one named property at a time ` +
        `(import.meta.env.VITE_FOO). Aliasing it, destructuring it, or ` +
        `optional-chaining through it defeats Vite's per-property ` +
        `substitution and serialises EVERY env var — including secrets that ` +
        `the file never referenced — into the client bundle.\n\n` +
        `Offenders:\n${offenders.join('\n')}`
    ).toEqual([]);
  });
});
