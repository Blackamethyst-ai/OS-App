# Project Memory

- Connected to Antigravity Global Core
- Last Synced: Sat  1 Feb 2026 12:50:00 EST

## Capabilities Registry Consolidation (2026-02-01)

### ✅ Phase 1: Core Migration (PR #1)
- Added SystemMind epoch integration to registry.ts
- VoiceManager migrated to executeCapability()
- DynamicToolRegistry migrated to capabilities
- Added ui_toggle_theme and voice_toggle capabilities
- CommandPalette uses executeCapability for theme
- Manifest caching (16x faster: ~50ms → ~3ms)
- 31 new integration tests added
- Documentation: services/capabilities/README.md

### ✅ Phase 2: CPB Routing (PR #2)
- Created services/capabilities/cpb.ts with:
  - routeQueryToCPB() - Route queries to optimal CPB path
  - executeQueryWithCPB() - Execute with status callbacks
  - executeCapabilityWithCPB() - Execute capability with CPB
- VoiceManager THINK handler migrated to capabilities CPB
- unifiedActionRegistry.ts now FULLY DEPRECATED

### Architecture
- Single source of truth: services/capabilities/
- 110+ capabilities (57 actions + 48 tabs + dynamic tools)
- CPB paths: direct, rlm, ace, hybrid, cascade
- Complexity auto-derives execution path

## Completed Type Fixes (2026-01-26)

### ✅ VoiceNexus Orchestrator
- Added `get()`/`set()` KV methods to `NeuralVaultService` (uses profile store)
- All 8 type errors resolved

### ✅ SovereignMemory
- Added `search()` method as alias for `query()`

### ✅ Supabase Integration
- Created `voice_sessions` and `voice_transcripts` tables
- Full-text search with tsvector
- Session lifecycle wired in orchestrator

### ✅ Tool Unification (2026-01-26)
- Created `services/actions/handlers/sovereign.ts` with 8 migrated tools
- Updated `handlers/index.ts` to export SOVEREIGN_ACTIONS
- Updated `VoiceManager/index.tsx` to use `executeAction()` instead of OS_TOOLS
- Updated `DynamicToolRegistry.ts` with deprecation warning on fallback
- Deprecated `toolRegistry.ts` (legacy fallback only)

**Unified Registry Stats:** 50+ actions across 6 categories
(navigation, generation, execution, analysis, ui, sovereign)

### ✅ Test Coverage (2026-01-26)
- Created `services/actions/__tests__/sovereign.test.ts` with 22 tests
- Full test suite: 264 tests passing
- Covers: action registration, validation, error handling, success cases

### Architecture Notes
- `components/voice/VoiceManager/parts/tools.ts` = Gemini API schemas (FunctionDeclarations)
- `services/actions/handlers/sovereign.ts` = Handler implementations (UnifiedAction)
- These are complementary layers, not duplicates

### ✅ Archon Improvements (2026-01-26)
- Implemented retry logic for escalation decisions (line 760)
- Added token tracking to recordSuccess() with actual usage
- Coverage: 69.67% statements, 60.6% branches, 60.48% functions

### ✅ Supabase RLS Hardening (2026-01-26)
- Replaced permissive "Allow public access" policies on voice tables
- Added rate-limited anon policies (100 sessions/hr, 1000 transcripts/hr)
- Separate authenticated vs anon access policies

### ✅ Tooling (2026-01-26)
- Installed @vitest/coverage-v8 for coverage reports
- Added coverage/ to .gitignore
