# OS-App Technical Roadmap

Written 2026-07-27 after a full review of the repo. Every number here was
measured, not estimated — commands to reproduce are inline so this can be
re-grounded rather than trusted.

## Baseline

| Signal | State |
|---|---|
| `tsc --noEmit` | clean |
| `eslint .` | clean |
| Tests | 211 files / 3497 passing, 0 unhandled errors |
| `npm audit` (root + 3 lib lockfiles) | 4 low, 0 high, 0 critical |
| `vite build` | succeeds, ~3s |
| Eager first-paint JS | ~1.4 MB across 10 chunks |
| Total built JS | 5.5 MB (heavy ML/3D correctly lazy) |

**The most important thing about that table: before this pass, tsc, eslint and
3492 tests were *also* all green — and the build was broken, a live API key was
being written into `dist/`, and the router was pricing Opus at 3× reality.**
Green checks measured the things that were easy to measure. Most of the work
below is about making the checks watch what actually breaks.

## Shipped this pass

Nine commits, `fcba1d3..cd37493`.

- **Local build was dead.** Three dangling symlinks into a deleted Google Drive
  folder under gitignored `public/anchor-library/` made `vite build` abort with
  a bare ENOENT. CI and Vercel never saw it because the path is gitignored — so
  only local builds broke, disabling the loop you verify changes in. Pruned,
  plus `scripts/preflight-public.mjs` wired into `prebuild`/`predev`.
- **Whole-env serialization leak.** `const env = import.meta.env` in
  `CinemaStudio` made Vite inline *every* `VITE_` var into the ImageGen chunk,
  including a live `VITE_DEEPSEEK_API_KEY` — silently undoing the BYO-key-only
  lockdown five weeks after it landed. Production was checked directly (fetched
  the live chunk) and held no real secrets, only the public Supabase anon key
  and Vercel build metadata. Guarded by `services/__tests__/envExposure.test.ts`.
- **Auth theater removed.** The login form compared against credentials
  compiled into the public bundle, while "Enter as Observer" bypassed it
  entirely. Now an honest profile chooser. See "The entry screen is not
  authentication" in `CLAUDE.md`.
- **Model IDs and costs.** 18 call sites pointed at deprecated
  `claude-opus-4-8`; registry entries were self-contradictory (`claude-opus-5`
  labelled "Opus 4.7") and priced Opus at 15/75 against a real 5/25, feeding
  cost-based routing with a 3× error.
- **Sovereignty ratchet widened** from `gemini-*` only to all four providers,
  plus a zero-tolerance ban on retired IDs — the gap that let the stale Claude
  literals through with CI green.
- **IndexedDB opened lazily** instead of during module evaluation, removing two
  unhandled rejections that fired at import time wherever `indexedDB` is absent.
- **38 dependency advisories cleared** (2 critical, 20 high) across the root and
  three `libs/*` lockfiles.

## Next, in priority order

### P1 — Pay down model-ID debt where it is densest

167 hardcoded model literals remain (`gemini` 65, `claude` 68, `openai` 28,
`grok` 6). The ratchet stops growth but does not shrink it.

`services/archon/resources/router.ts` alone holds **39** (23 claude, 13 openai,
3 grok) — roughly a quarter of all debt in one file, and it is the file whose
correctness matters most, since it decides which model serves a request.

```bash
npx vitest run services/__tests__/modelIdSovereignty.test.ts   # current counts
```

Migrate it to `MODEL_REGISTRY`, then lower `BASELINES` in the ratchet. Repeat
for `archon/metacognition/engine.ts` (19) and `metacognition/modelRegistry.ts`
(14). Effort: ~half a day for the top three files, which clears ~43% of debt.

### P2 — Reconcile the three state stores

State is split across `store.ts` (~60 importers), `stores/useSystemMind.ts`
(~20) and `store/` (`flywheelStore`, `systemMind`). Two directories differing
only by an `s` is a trap — `store/systemMind.ts` and `stores/useSystemMind.ts`
are different files with near-identical names.

Nothing is broken today, so this is a correctness *risk*, not a defect: the
next person to add a slice has a coin-flip chance of putting it in the wrong
place. Decide one owner per domain, move the rest, leave re-export shims.
Effort: ~1 day. Do it before the next feature that touches global state.

### P3 — Trim the eager first-paint bundle

~1.4 MB loads before first paint, of which **760 KB is application logic** —
`app-kernel` (396 KB) and `app-cpb` (364 KB). The heavy vendor libs (three
860 KB, face-api 652 KB, onnx 396 KB) are already correctly lazy, so the win
here is in our own code, not dependencies.

```bash
npx vite build && grep -oE '(src|href)="/assets/[^"]+\.js"' dist/index.html
```

The kernel and CPB orchestrator are unlikely to all be needed at first paint.
Route-split them behind the first interaction that actually needs them.

### P4 — Decide the mermaid CDN dependency

`vite.config.ts` externalizes `mermaid` and `index.html` loads it from
`https://esm.sh/mermaid@^11.12.2` via importmap. Two consequences worth an
explicit decision rather than drift:

- **Offline/PWA:** the service worker precaches 91 local entries, but mermaid
  is not one of them. Diagrams break offline — in an app that markets itself as
  local-first.
- **Supply chain:** a floating `^11.12.2` range from a third-party CDN executes
  in the app's origin. This is the one runtime dependency not pinned by the
  lockfile.

Either bundle it (adds ~500 KB to a lazy chunk, keeps the offline story) or
keep the CDN and pin an exact version with SRI. Bundling is the recommendation
given the local-first positioning.

### P5 — Ratchet the disabled lint rules

`eslint.config.js` turns off `@typescript-eslint/no-explicit-any` and
`no-unused-vars` wholesale, which is why 401 `as any` casts and 14
`@ts-ignore`/`@ts-expect-error` sit unflagged. Flipping them on now would
produce noise nobody reads.

Apply the pattern that already works here: a counting ratchet like
`modelIdSovereignty.test.ts`, baselined at today's numbers, that may only go
down. Same shape, same enforcement, no big-bang cleanup.

## Conventions worth keeping

Three guards now exist, and they share a design worth reusing:

- `services/__tests__/modelIdSovereignty.test.ts` — per-provider ratchets
- `services/__tests__/envExposure.test.ts` — source-level ban
- `scripts/preflight-public.mjs` — self-healing build preflight

Each **runs in CI without needing a build**, each **fails with the offending
file and line named**, and each was **verified by reintroducing the bug it
guards against**. A guard nobody has seen fail is a guard nobody knows works —
the sovereignty ratchet was green for weeks while the bug it existed to catch
sat in `main`, because it was only ever looking at one provider.
