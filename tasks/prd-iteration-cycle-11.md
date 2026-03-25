[PRD]
# PRD: OS-App Iteration Cycle 11 — Predictions & Hooks Test Coverage

## Overview
Complete test coverage for 8 untested predictions components and 9 untested hooks.

## Goals
- Add test coverage to all remaining untested predictions components
- Add test coverage to all remaining untested hooks
- Reach 3000+ total tests
- All quality gates passing

## Quality Gates

These commands must pass for every user story:
- `npx tsc --noEmit` - Type checking
- `npx vitest run` - All tests pass
- `npm run lint` - Linting

## User Stories

### US-001: Test Coverage — MetaLearningDashboard.tsx
**Description:** As a developer, I want test coverage for the meta-learning dashboard (284 lines, 0 tests).

**Acceptance Criteria:**
- [ ] components/predictions/__tests__/MetaLearningDashboard.test.tsx created
- [ ] Dashboard rendering tested
- [ ] Data display tested
- [ ] At least 8 new tests added

### US-002: Test Coverage — PredictionDemo.tsx
**Description:** As a developer, I want test coverage for the prediction demo (285 lines, 0 tests).

**Acceptance Criteria:**
- [ ] components/predictions/__tests__/PredictionDemo.test.tsx created
- [ ] Demo rendering tested
- [ ] Interaction tested
- [ ] At least 8 new tests added

### US-003: Test Coverage — SignalBreakdown.tsx
**Description:** As a developer, I want test coverage for signal breakdown (215 lines, 0 tests).

**Acceptance Criteria:**
- [ ] components/predictions/__tests__/SignalBreakdown.test.tsx created
- [ ] Signal display tested
- [ ] Breakdown rendering tested
- [ ] At least 8 new tests added

### US-004: Test Coverage — PredictionPanel.tsx
**Description:** As a developer, I want test coverage for the prediction panel (214 lines, 0 tests).

**Acceptance Criteria:**
- [ ] components/predictions/__tests__/PredictionPanel.test.tsx created
- [ ] Panel rendering tested
- [ ] Prediction display tested
- [ ] At least 8 new tests added

### US-005: Test Coverage — ErrorWarningPanel.tsx
**Description:** As a developer, I want test coverage for the error warning panel (123 lines, 0 tests).

**Acceptance Criteria:**
- [ ] components/predictions/__tests__/ErrorWarningPanel.test.tsx created
- [ ] Warning display tested
- [ ] Error states tested
- [ ] At least 6 new tests added

### US-006: Test Coverage — OptimalTimeIndicator.tsx
**Description:** As a developer, I want test coverage for the optimal time indicator (117 lines, 0 tests).

**Acceptance Criteria:**
- [ ] components/predictions/__tests__/OptimalTimeIndicator.test.tsx created
- [ ] Indicator rendering tested
- [ ] Time display tested
- [ ] At least 6 new tests added

### US-007: Test Coverage — ResearchChips.tsx
**Description:** As a developer, I want test coverage for research chips (117 lines, 0 tests).

**Acceptance Criteria:**
- [ ] components/predictions/__tests__/ResearchChips.test.tsx created
- [ ] Chip rendering tested
- [ ] Interaction tested
- [ ] At least 6 new tests added

### US-008: Test Coverage — PredictionBadge.tsx
**Description:** As a developer, I want test coverage for the prediction badge (93 lines, 0 tests).

**Acceptance Criteria:**
- [ ] components/predictions/__tests__/PredictionBadge.test.tsx created
- [ ] Badge rendering tested
- [ ] Variants tested
- [ ] At least 6 new tests added

### US-009: Test Coverage — Small Hooks Batch
**Description:** As a developer, I want test coverage for 9 small untested hooks (230 total lines).

**Acceptance Criteria:**
- [ ] hooks/__tests__/useApiUsage.test.ts created
- [ ] hooks/__tests__/useDaemonSwarm.test.ts created
- [ ] hooks/__tests__/useFlywheel.test.ts created
- [ ] hooks/__tests__/useKernelLifecycle.test.ts created
- [ ] hooks/__tests__/useKernelUptime.test.ts created
- [ ] hooks/__tests__/usePerspectiveRefraction.test.ts created
- [ ] hooks/__tests__/useTimeTravel.test.ts created
- [ ] hooks/__tests__/useVoiceControl.test.ts created
- [ ] hooks/__tests__/useVoiceExpose.test.ts created
- [ ] At least 4 tests per hook
[/PRD]
