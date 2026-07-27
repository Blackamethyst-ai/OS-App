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

## Roadmap P1-P5: done

All five items below were completed in the follow-up pass. Commits
`c29a3d6..892dda5`.

**P1 — Model-ID debt, where it was densest.** `archon/resources/router.ts`
(39 literals) and `archon/metacognition/engine.ts` (19) now read
`MODEL_REGISTRY`. Required adding an `openai` block, whose absence was why
gpt-4o/o1/o3-mini were hardcoded everywhere. Verified behaviour-preserving
rather than assumed: all 10 tier->ID mappings resolve to the exact strings
they replaced, and all 17 routing tables rebuild byte-identical.
Debt **167 -> 110 (-34%)**; ratchet baselines tightened to the new floor.

**P2 — State sprawl.** `store/` (singular) is gone. It held a
DEPRECATED re-export shim with zero importers — migration already complete,
so it met the bar for deletion rather than the graveyard — plus
`flywheelStore`, which moved to `stores/`. Two locations remain with a clear
rule: `store.ts` owns app-wide slices, `stores/` holds satellite stores.

**P3 — First paint.** Deferring `app-kernel`/`app-cpb` turned out to be a
genuine architecture change, not a config tweak: both are entry-graph
dependencies shared by ~30 chunks, so it means booting the shell and
hydrating the kernel after. Deliberately not rushed. The bigger win was
adjacent and safe — see PWA below.

**P4 — CDN dependencies: eliminated.** Production HTML now references zero
external hosts.
- mermaid was `external` and loaded from esm.sh at a floating `^11.12.2`
  while the app was built against the installed 11.16.0 — the one runtime
  dependency the lockfile did not pin. Now bundled behind the already-lazy
  MermaidDiagram route, with its transitive deps (langium, chevrotain,
  dagre, roughjs) routed into the same chunk. Matching only `mermaid` left
  them to automatic splitting, which put ~500KB back into the precache.
- `@xyflow/react`'s stylesheet came from jsdelivr with **no version in the
  URL at all**, render-blocking on every page load. It ships inside the
  installed package; now imported there.

**P5 — Lint ratchet.** `no-explicit-any` (609) and `ban-ts-comment` (5) are
still off in eslint.config.js but now held at a ceiling by
`npm run lint:ratchet`, a separate CI step. Production code only — counting
tests put mock doubles at the top (1328 vs 609) and buried the real debt.

## Also fixed, found along the way

**`dist/stats.html` was live on production.** rollup-plugin-visualizer ran on
every build and shipped a 2MB interactive map of the internal module graph —
every source file path, every dependency, all sizes — publicly readable at
`/stats.html` (confirmed HTTP 200, 1.5MB). It was precached too, so every PWA
install downloaded it. Now opt-in behind `ANALYZE=1`.

**The service worker was undoing the code splitting.** VitePWA had no
workbox block, so the default glob precached every chunk: 7.2MB on install,
including three (860KB), face-api (652KB) and onnx (396KB) for users who
never opened 3D or biometrics. The build was already curating a lazy-chunk
list for `modulePreload` while the SW quietly ignored it; both now read one
hoisted `LAZY_CHUNK_PATTERNS`. Those chunks moved to CacheFirst runtime
caching, which is safe because chunk filenames are content-hashed.

Precache **7270 KiB -> 3371 KiB (-54%)**.

## Next

**Route-split the kernel and CPB** (the real P3). ~760KB of application logic
still loads before first paint. This needs a boot sequence — render the
shell, hydrate the kernel after — not a chunking change. Size it properly
before starting.

**Keep lowering the ratchets.** Four model-ID baselines (gemini 60, claude
37, openai 11, grok 2) and two lint ceilings (609, 5). Both fail when a count
*drops* without the baseline following, so they surface their own progress.
Remaining model-ID debt is concentrated in `geminiService.ts`,
`apiUsageService.ts` and `components/generation/ImageGen/`.

**Decide on `libs/graph-reasoning-engine`.** It has a tracked lockfile and
its own node_modules but nothing in the app imports it. Either it is a
product or it is dead weight carrying its own vulnerability surface.

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
