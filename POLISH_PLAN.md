# OS-App Polish Plan

> **Goal:** Zero `console.*` in production code, zero dead code, zero TS errors.
> **Baseline:** 847 tests passing, 0 TS errors, 0 warnings.
> **Logger:** `services/logger.ts` — all production code should use this instead of raw `console.*`.

---

## Completed

### Batch 1 — TS errors, accessibility, env migration
**Commit:** `8e3683d` (part of combined commit)

- Fixed production TS errors
- Replaced native `alert()`/`confirm()` with proper dialogs
- Migrated `process.env` to `import.meta.env`
- Added `console.log` guards (dev-only)
- Added aria labels, roles, keyboard navigation

### Batch 2 — Test hygiene
**Commit:** `8e3683d` (part of combined commit)

- Fixed test TS errors
- Plugged `setTimeout` leaks in tests
- Resolved ESLint warnings
- Moved test files into `__tests__/` directories

### Batch 3 — Security, env vars, logger migration round 1
**Commit:** `8e3683d` (part of combined commit)

- Externalized hardcoded `localhost` URLs to env vars (`.env.example`)
- Implemented security audit logging (ring buffer, replaced 6 TODOs)
- Migrated top 14 service files from `console.*` to logger
- Hardened vitest config with timeouts and retry

### Batch 4 — Dead code, logger migration round 2
**Commit:** `a6310cd`

- Deleted `unitTestingService.ts`, `componentActionRegistry.ts`
- Removed unused `html-to-image` dependency
- Migrated 9 more service files to logger
- Updated test spy from `console.warn` to `logger.warn`
- Cleaned stale comments referencing deleted code

**Running totals after Batch 4:**
- Files touched: 91
- Logger migration: 23 / ~110 production files
- Dead code: 2 files deleted, 1 dep removed
- Tests: 847 passing | TS errors: 0 | Warnings: 0

---

## Remaining — 594 `console.*` calls across 134 files

### Skip list (legitimate usage)
| File | Reason |
|------|--------|
| `services/logger.ts` | Logger itself — wraps console internally |
| `scripts/*.ts` (5 files) | Dev tooling, not production |
| `libs/*/examples/*.ts` (4 files) | Example/demo code |
| `libs/graph-reasoning-engine/*.ts` (4 files) | Benchmarks/simulations |
| `vite.config.ts` | Build config |
| `*/__tests__/*.test.tsx` | Test files |

**After skips:** ~110 production files, ~450 calls to migrate.

---

## Batch 5 — Kernel + Memory (9 files, ~42 calls)

Core brain of the app. Highest impact.

| File | Calls | Notes |
|------|-------|-------|
| `services/kernel/AgentKernel.ts` | 18 | Heaviest file |
| `services/kernel/mcpContextBridge.ts` | 12 | |
| `services/kernel/KernelScheduler.ts` | 2 | |
| `services/kernel/IntentResolver.ts` | 1 | |
| `services/memory/SemanticPager.ts` | 4 | |
| `services/memory/Processor.ts` | 2 | |
| `services/memory/ContextCompiler.ts` | 1 | |
| `services/memory/AgenticFileSystem.ts` | 1 | |
| `services/memory/ArtifactStore.ts` | 1 | |

**Also in this batch:** Scan for dead exports/imports in kernel + memory dirs.

---

## Batch 6 — Organisms (13 files, ~56 calls)

Organism layer and all sub-modules.

| File | Calls | Notes |
|------|-------|-------|
| `services/organisms/OrganismLayer.ts` | 5 | |
| `services/organisms/GenomeLayer.ts` | 6 | |
| `services/organisms/SwarmLayer.ts` | 2 | |
| `services/organisms/CognitiveLayer.ts` | 2 | |
| `services/organisms/index.ts` | 4 | |
| `services/organisms/integration/biometricHooks.ts` | 13 | Heavy |
| `services/organisms/cognitive/storageIntegration.ts` | 11 | Heavy |
| `services/organisms/cognitive/wakeSleep.ts` | 4 | |
| `services/organisms/swarm/aceIntegration.ts` | 3 | |
| `services/organisms/swarm/adaptiveMoE.ts` | 2 | |
| `services/organisms/swarm/stigmergy.ts` | 1 | |
| `services/organisms/genome/mcpServer.ts` | 2 | |
| `services/organisms/genome/supabaseSkillRegistry.ts` | 1 | |

---

## Batch 7 — VoiceNexus + Voice + CPB (18 files, ~68 calls)

All voice-related services.

| File | Calls | Notes |
|------|-------|-------|
| `services/voiceNexus/orchestrator.ts` | 12 | Heavy |
| `services/voiceNexus/knowledgeInjector.ts` | 5 | |
| `services/voiceNexus/modes/browserMode.ts` | 3 | |
| `services/voiceNexus/modes/hybridMode.ts` | 2 | |
| `services/voiceNexus/modes/realtimeMode.ts` | 2 | |
| `services/voiceNexus/preflightCheck.ts` | 2 | |
| `services/voiceNexus/index.ts` | 1 | |
| `services/voiceNexus/providers/stt/browserSTT.ts` | 1 | |
| `services/voiceNexus/providers/stt/geminiLive.ts` | 1 | |
| `services/voiceNexus/providers/tts/elevenLabsTTS.ts` | 1 | |
| `services/voiceNexus/providers/reasoning/claudeReasoning.ts` | 1 | |
| `services/voiceCoreIntegration.ts` | 5 | |
| `services/voice/service.ts` | 2 | |
| `services/cognitivePrecisionBridge/orchestrator.ts` | 5 | |
| `services/cognitivePrecisionBridge/index.ts` | 1 | |
| `services/capabilities/registry.ts` | 8 | |
| `services/capabilities/providers/dynamic.ts` | 5 | |
| `services/capabilities/providers/ui.ts` | 1 | |
| `services/capabilities/providers/tabs.ts` | 1 | |
| `services/capabilities/providers/actions.ts` | 1 | |

---

## Batch 8 — Remaining services (22 files, ~79 calls)

All standalone service files not yet migrated.

| File | Calls | Notes |
|------|-------|-------|
| `services/priceApiService.ts` | 8 | |
| `services/dreamProtocol.ts` | 8 | |
| `services/minerstatService.ts` | 8 | |
| `services/gpuPricingService.ts` | 6 | |
| `services/recursiveLanguageModel.ts` | 6 | |
| `services/liveSession.ts` | 6 | |
| `services/ui/AUIEngine.ts` | 6 | |
| `services/faceDetectionService.ts` | 5 | |
| `services/selfEvolution.ts` | 4 | |
| `services/powerService.ts` | 4 | |
| `services/ui/ComponentRegistry.ts` | 3 | |
| `services/codebaseAwareness.ts` | 3 | |
| `services/openaiService.ts` | 2 | |
| `services/claudeService.ts` | 2 | |
| `services/modelRouter.ts` | 2 | |
| `services/archon/state.ts` | 2 | |
| `services/archon/utils.ts` | 2 | |
| `services/daemonService.ts` | 2 | |
| `services/vendorService.ts` | 2 | |
| `services/agoraService.ts` | 2 | |
| `services/metaventionService.ts` | 2 | |
| `services/collabService.ts` | 1 | |
| `services/grokService.ts` | 1 | |
| `services/ollamaService.ts` | 1 | |
| `services/elevenLabsService.ts` | 1 | |
| `services/autopoieticDaemon.ts` | 1 | |
| `services/dqScoring.ts` | 1 | |

---

## Batch 9 — Components (23 files, ~49 calls)

| File | Calls | Notes |
|------|-------|-------|
| `components/voice/VoiceManager/index.tsx` | 16 | Heaviest component |
| `components/MasterStabilizationProtocol.tsx` | 5 | |
| `components/hardware/HardwareEngine/index.tsx` | 3 | |
| `components/AgoraPanel.tsx` | 2 | |
| `components/UserProfileOverlay.tsx` | 2 | |
| `components/agents/ArchonDashboard/index.tsx` | 2 | |
| `components/voice/VoiceMode/index.tsx` | 2 | |
| `components/voice/VoiceCoreManager.tsx` | 2 | |
| `components/biometric/BiometricErrorBoundary.tsx` | 2 | |
| `components/ZenithDisplay.tsx` | 1 | |
| `components/MemoryCore.tsx` | 1 | |
| `components/core/GlobalSearchBar.tsx` | 1 | |
| `components/generation/ImageGen/index.tsx` | 1 | |
| `components/agents/AgentControlCenter/index.tsx` | 1 | |
| `components/hardware/PowerXRay.tsx` | 1 | |
| `components/hardware/ProcurementModal.tsx` | 1 | |
| `components/MermaidDiagram.tsx` | 1 | |
| `components/HoloProjector.tsx` | 1 | |
| `components/BicameralEngine.tsx` | 1 | |
| `components/TacticalScanner.tsx` | 1 | |
| `components/GlobalErrorBoundary.tsx` | 1 | |
| `components/voice/VoiceSystem.tsx` | 1 | |
| `components/voice/ConversationalVoiceOrb.tsx` | 1 | |

---

## Batch 10 — Hooks, libs, stores, misc (20 files, ~55 calls)

| File | Calls | Notes |
|------|-------|-------|
| `hooks/useConversationalVoice.ts` | 7 | |
| `hooks/useAuthPersistence.ts` | 2 | |
| `hooks/useGpuCatalog.ts` | 2 | |
| `hooks/useAgentRuntime.ts` | 1 | |
| `hooks/useResearchAgent.ts` | 1 | |
| `hooks/useBiometricSensor.ts` | 1 | |
| `stores/useSystemMind.ts` | 3 | |
| `libs/agent-core-sdk/src/provider.tsx` | 1 | |
| `libs/voice-nexus/index.ts` | 3 | |
| `libs/voice-nexus/audio/streamingPlayer.ts` | 4 | |
| `libs/voice-nexus/providers/stt/deepgram.ts` | 8 | |
| `libs/voice-nexus/providers/stt/browser.ts` | 2 | |
| `libs/voice-nexus/providers/stt/index.ts` | 1 | |
| `libs/voice-nexus/providers/vad/silero.ts` | 7 | |
| `libs/voice-nexus/providers/vad/index.ts` | 1 | |
| `libs/cpb-core/index.ts` | 3 | |
| `utils/validateToolCode.ts` | 2 | |
| `config/navigation.ts` | 1 | |
| `index.tsx` | 2 | |

---

## Per-batch checklist

For every batch:
1. Migrate `console.*` → `logger.*` (import from `services/logger`)
2. Scan for dead code / unused exports in touched files
3. Run `npx tsc --noEmit` — must be 0 errors
4. Run `npx vitest run` — must be 847+ tests passing
5. Commit with message: `fix: polish batch N — [summary]`

---

## Summary

| Batch | Scope | Files | Calls | Status |
|-------|-------|-------|-------|--------|
| 1 | TS errors, a11y, env | ~30 | ~50 | Done |
| 2 | Test hygiene | ~15 | ~20 | Done |
| 3 | Security, env vars, logger r1 | ~25 | ~60 | Done |
| 4 | Dead code, logger r2 | 18 | ~30 | Done |
| 5 | Kernel + Memory | 9 | ~42 | Done |
| 6 | Organisms | 13 | ~56 | Done |
| 7 | VoiceNexus + Voice + CPB | 20 | ~68 | Pending |
| 8 | Remaining services | 27 | ~79 | Pending |
| 9 | Components | 23 | ~49 | Pending |
| 10 | Hooks + libs + stores + misc | 20 | ~55 | Pending |
| **Total** | | **~200** | **~509** | **4/10 done** |

---

## How to continue in a new session

```
Open this file: ~/OS-App/POLISH_PLAN.md
Then say: "Continue with Batch 5" (or whichever batch is next)
```

The pattern for each file is:
```ts
// Before
console.warn('something failed', err);

// After
import { logger } from '../logger';  // adjust path
logger.warn('something failed', err);
```
