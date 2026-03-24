# PRD: OS-App Iteration Cycle 3 — Logger Cleanup, Test Expansion, Vendor Shrink

## Overview
Migrate remaining 113 console.* calls to logger, expand test coverage to untested service directories, and reduce heavy vendor chunks (recharts 89KB, vendor-react 65KB, motion 41KB).

## Goals
- Zero console.* in production code (libs/examples/ exempt)
- Test coverage added for CPB, UI services, memory services
- VoiceManager refactored from 5272 lines to < 2000
- Recharts vendor chunk reduced via tree-shaking or lazy-loading
- All quality gates passing

## Quality Gates

These commands must pass for every user story:
- `npx tsc --noEmit` — Zero TypeScript errors
- `npx vitest run` — All tests passing
- `npm run lint` — Zero lint errors

## User Stories

### US-001: Logger Migration — Services and UI Services
**Description:** As a developer, I want remaining console.* calls in services/ migrated to logger.

**Acceptance Criteria:**
- [ ] services/capabilities/registry.ts: 7 console calls migrated
- [ ] services/ui/SemanticGaze.ts: 5 console calls migrated
- [ ] services/ui/JudgeAgent.ts: 2 console calls migrated
- [ ] services/ui/DOMRegenerator.ts: 2 console calls migrated
- [ ] components/ApiKeyModal.tsx: 3 console calls migrated
- [ ] utils/validateToolCode.ts: 2 console calls migrated
- [ ] Zero console.* in production code (libs/examples/ and libs/graph-reasoning-engine/ exempt)

### US-002: Logger Migration — Library Core Files
**Description:** As a developer, I want console.* in lib core files (not examples) migrated to logger.

**Acceptance Criteria:**
- [ ] libs/voice-nexus/index.ts: 3 console calls migrated
- [ ] libs/cpb-core/index.ts: 3 console calls migrated
- [ ] No regressions in lib builds (cd libs/cpb-core && npm run build, cd libs/voice-nexus && npm run build)

### US-003: Test Coverage — CPB and UI Services
**Description:** As a developer, I want test coverage for the CPB orchestrator and UI services.

**Acceptance Criteria:**
- [ ] services/cognitivePrecisionBridge/orchestrator.ts tested: routing, execution, error paths
- [ ] services/ui/AUIEngine.ts tested: layout generation, evaluation
- [ ] services/ui/SemanticGaze.ts tested: gaze pattern detection
- [ ] Tests go in services/cognitivePrecisionBridge/__tests__/ and services/ui/__tests__/
- [ ] At least 10 new tests added

### US-004: Test Coverage — Memory and Persistence
**Description:** As a developer, I want test coverage for memory and persistence services.

**Acceptance Criteria:**
- [ ] services/memory/MemoryStore.ts tested: store, retrieve, search, clear
- [ ] services/persistence/ tested: save, load, migration
- [ ] Tests go in services/memory/__tests__/ and services/persistence/__tests__/
- [ ] At least 8 new tests added

### US-005: VoiceManager Refactor — Extract Tools
**Description:** As a developer, I want VoiceManager (5272 lines) split into focused modules.

**Acceptance Criteria:**
- [ ] Voice tools logic (parts/tools.ts 2612 lines) stays separate
- [ ] Core VoiceManager extracted into: state management, command processing, UI rendering
- [ ] VoiceManager/index.tsx under 2000 lines after extraction
- [ ] No behavioral changes — all existing voice features work identically
- [ ] Existing VoiceManager tests still pass

### US-006: Recharts Lazy Loading
**Description:** As a developer, I want recharts (89KB gzip) lazy-loaded since charts aren't shown on first paint.

**Acceptance Criteria:**
- [ ] Components using recharts wrapped in React.lazy() or dynamic import
- [ ] Recharts chunk no longer loaded on initial page load
- [ ] Charts render correctly when their views are opened
- [ ] Loading state shown while chart chunk downloads

### US-007: Vendor-React Chunk Audit
**Description:** As a developer, I want the vendor-react chunk (65KB gzip) audited for unnecessary inclusions.

**Acceptance Criteria:**
- [ ] Audit what's in vendor-react beyond react + react-dom + zustand
- [ ] Remove any unnecessary packages bundled into vendor-react
- [ ] Document final vendor-react composition if it can't be reduced

## Non-Goals
- Replacing recharts with another charting library
- Rewriting VoiceManager from scratch
- Adding new features

## Success Metrics
- Zero console.* in production code
- 1560+ tests passing (18+ new tests)
- VoiceManager under 2000 lines
- Recharts lazy-loaded (not in initial bundle)
