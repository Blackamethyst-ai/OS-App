[PRD]
# PRD: OS-App Iteration Cycle 5 — Deep Service & Hook Test Coverage

## Overview
Expand test coverage to the largest untested service files and hooks. Target the highest-LOC untested files for maximum coverage ROI.

## Goals
- Add test coverage to 5 untested service areas (3000+ lines)
- Add test coverage to 2 untested hooks (1200+ lines)
- Reach 1850+ total tests
- All quality gates passing

## Quality Gates

These commands must pass for every user story:
- `npx tsc --noEmit` - Type checking
- `npx vitest run` - All tests pass
- `npm run lint` - Linting

## User Stories

### US-001: Test Coverage — selfEvolution.ts
**Description:** As a developer, I want test coverage for the self-evolution service (638 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/__tests__/selfEvolution.test.ts created
- [ ] Evolution cycle logic tested
- [ ] Pattern detection tested
- [ ] State mutation safety tested
- [ ] At least 8 new tests added

### US-002: Test Coverage — dreamProtocol.ts
**Description:** As a developer, I want test coverage for the dream protocol service (400 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/__tests__/dreamProtocol.test.ts created
- [ ] Dream state transitions tested
- [ ] Memory consolidation logic tested
- [ ] Protocol lifecycle tested
- [ ] At least 8 new tests added

### US-003: Test Coverage — convergenceMemory.ts
**Description:** As a developer, I want test coverage for convergence memory (352 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/__tests__/convergenceMemory.test.ts created
- [ ] Memory storage and retrieval tested
- [ ] Convergence detection tested
- [ ] Edge cases (empty state, overflow) tested
- [ ] At least 6 new tests added

### US-004: Test Coverage — hopGrouping.ts
**Description:** As a developer, I want test coverage for hop grouping service (285 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/__tests__/hopGrouping.test.ts created
- [ ] Grouping algorithm tested
- [ ] Hop chain construction tested
- [ ] At least 6 new tests added

### US-005: Test Coverage — agentAuction.ts
**Description:** As a developer, I want test coverage for agent auction service (266 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/__tests__/agentAuction.test.ts created
- [ ] Auction creation and bidding tested
- [ ] Winner selection logic tested
- [ ] At least 6 new tests added

### US-006: Test Coverage — useAdaptiveUI hook
**Description:** As a developer, I want test coverage for the adaptive UI hook (262 lines, 0 tests).

**Acceptance Criteria:**
- [ ] hooks/__tests__/useAdaptiveUI.test.ts created
- [ ] UI adaptation logic tested
- [ ] State transitions tested
- [ ] At least 6 new tests added

### US-007: Test Coverage — useResearchAgent hook
**Description:** As a developer, I want test coverage for the research agent hook (232 lines, 0 tests).

**Acceptance Criteria:**
- [ ] hooks/__tests__/useResearchAgent.test.ts created
- [ ] Agent initialization tested
- [ ] Research query handling tested
- [ ] At least 6 new tests added
[/PRD]
