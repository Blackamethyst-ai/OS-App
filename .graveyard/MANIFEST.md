# Code Graveyard — OS-App

Disconnected code archived here instead of deleted. These files were functional
but lost their wiring due to refactors or simplification. They serve as reference
implementations for capabilities that may need to be restored.

**Rule:** Never delete from the graveyard without checking if the capability
still exists elsewhere. If it doesn't, the graveyard copy IS the recovery path.

---

## useVoiceAction.ts
- **Original path:** `hooks/useVoiceAction.ts`
- **Archived:** 2026-03-14
- **Last connected:** Before capability registry migration
- **Capability:** Registered component functions as voice-callable actions via useSystemMind store. The AI could trigger any registered action using `execute_component_action` tool.
- **Why disconnected:** Capability registry (`services/capabilities/`) replaced individual voice action registration, but the per-component registration pattern was lost — components can no longer individually expose actions to voice.
- **Recovery:** Re-import in components that need voice-callable actions, or port the pattern into the capabilities adapter at `services/capabilities/adapters/voice.ts`

## voiceActionRegistry.ts
- **Original path:** `services/voiceActionRegistry.ts`
- **Archived:** 2026-03-14
- **Last connected:** Migrated to `services/capabilities/`
- **Capability:** Central registry for all voice actions with context generation
- **Why disconnected:** Explicitly deprecated — migration to capabilities/ was intentional
- **Recovery:** Not needed — `services/capabilities/` is the replacement. Kept for reference only.
- **Status:** SAFE TO DELETE (explicitly @deprecated with migration notes)

## useGazeTracking.ts
- **Original path:** `hooks/useGazeTracking.ts`
- **Archived:** 2026-03-14
- **Capability:** Eye/gaze tracking via TensorFlow.js face-landmarks-detection
- **Why disconnected:** Biometric panel refactored, gaze tracking hook no longer wired in
- **Recovery:** Re-import in `components/biometric/BiometricPanel.tsx` or wherever gaze data is needed

## useGpuCatalog.ts
- **Original path:** `hooks/useGpuCatalog.ts`
- **Archived:** 2026-03-14
- **Capability:** GPU catalog data fetching with filtering/sorting for hardware marketplace
- **Why disconnected:** Hardware engine components may have been simplified
- **Recovery:** Re-import in `components/hardware/` components

## openaiService.ts
- **Original path:** `services/openaiService.ts`
- **Archived:** 2026-03-14
- **Capability:** OpenAI API integration (chat completions, model listing)
- **Why disconnected:** modelRouter.ts handles provider selection but never imported this service directly
- **Recovery:** Wire into `modelRouter.ts` provider cascade if OpenAI support is re-enabled

## infracostService.ts
- **Original path:** `services/infracostService.ts`
- **Archived:** 2026-03-14
- **Capability:** Infrastructure cost estimation via Infracost API (542 lines — substantial)
- **Why disconnected:** Hardware/procurement features may have been simplified
- **Recovery:** Re-import in `components/hardware/` or procurement workflows

## SunMoonToggle.tsx
- **Original path:** `components/SunMoonToggle.tsx`
- **Archived:** 2026-03-14
- **Capability:** Animated sun/moon theme toggle component
- **Why disconnected:** Theme switching moved to different UI pattern
- **Recovery:** Drop into any component that needs a theme toggle

## NeuralHeader.tsx
- **Original path:** `components/NeuralHeader.tsx`
- **Archived:** 2026-03-14
- **Capability:** Animated neural-network header with SVG particle effects
- **Why disconnected:** Header redesigned
- **Recovery:** Import where a decorative neural header is needed

## LayerToggle.tsx
- **Original path:** `components/LayerToggle.tsx`
- **Archived:** 2026-03-14
- **Capability:** Stub component (was `() => null`)
- **Status:** SAFE TO DELETE — never had real functionality

## CPBMonitor.tsx
- **Original path:** `components/CPBMonitor.tsx`
- **Archived:** 2026-03-24
- **Capability:** Visual dashboard for Cognitive Precision Bridge — displays real-time execution status, path routing (direct/ace/hybrid/cascade), quality metrics, and CPBStatusBadge. 419 lines of substantial UI logic.
- **Why disconnected:** Only imported in test file (`components/__tests__/CPBTest.test.tsx`). No production component renders CPBMonitorPanel or CPBStatusBadge. Referenced as a string in `services/voiceUIContext.ts` and `data/cpbConfigs.ts` but never actually wired into the UI tree.
- **Recovery:** Import `CPBMonitorPanel` and/or `CPBStatusBadge` from `.graveyard/CPBMonitor.tsx` into a dashboard view or the NeuralDock. Requires `CPBStatus` and `CPBResult` types from `services/cognitivePrecisionBridge/types`.

## cpbConfigs.ts
- **Original path:** `data/cpbConfigs.ts`
- **Archived:** 2026-03-24
- **Capability:** Configuration data (path colors, phase labels, descriptions) for CPBMonitor component. 69 lines.
- **Why disconnected:** Never imported anywhere — was support data for CPBMonitor which was itself disconnected.
- **Recovery:** Move back to `data/cpbConfigs.ts` when CPBMonitor is reconnected.

## legacy-README.md
- **Original path:** `services/legacy/README.md`
- **Archived:** 2026-03-24
- **Capability:** Documentation for the deprecated unifiedActionRegistry → capabilities migration. Contains rollback procedures, function mapping, and migration timeline.
- **Why disconnected:** unifiedActionRegistry.ts was fully migrated to services/capabilities/ and deleted. The legacy/ directory contained only this README.
- **Recovery:** Reference only — the migration is complete. See services/capabilities/ for the current implementation.
