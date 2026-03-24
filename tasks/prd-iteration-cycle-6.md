[PRD]
# PRD: OS-App Iteration Cycle 6 — Service & Hook Test Coverage Expansion

## Overview
Expand test coverage to the next tier of untested service files and hooks, targeting 8 files across 4 parallel tracks.

## Goals
- Add test coverage to 6 untested service areas
- Add test coverage to 2 untested hooks
- Reach 2000+ total tests
- All quality gates passing

## Quality Gates

These commands must pass for every user story:
- `npx tsc --noEmit` - Type checking
- `npx vitest run` - All tests pass
- `npm run lint` - Linting

## User Stories

### US-001: Test Coverage — codebaseAwareness.ts
**Description:** As a developer, I want test coverage for the codebase awareness service (557 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/__tests__/codebaseAwareness.test.ts created
- [ ] Codebase scanning logic tested
- [ ] Awareness state management tested
- [ ] At least 8 new tests added

### US-002: Test Coverage — gpuPricingService.ts
**Description:** As a developer, I want test coverage for the GPU pricing service (339 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/__tests__/gpuPricingService.test.ts created
- [ ] Price fetching fallback chain tested
- [ ] Cache behavior tested
- [ ] At least 8 new tests added

### US-003: Test Coverage — powerService.ts
**Description:** As a developer, I want test coverage for the power management service (282 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/__tests__/powerService.test.ts created
- [ ] Power mode switching tested
- [ ] Budget tracking tested
- [ ] At least 8 new tests added

### US-004: Test Coverage — liveSession.ts
**Description:** As a developer, I want test coverage for the live session service (292 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/__tests__/liveSession.test.ts created
- [ ] Session lifecycle tested
- [ ] Tool call handling tested
- [ ] At least 6 new tests added

### US-005: Test Coverage — toolRegistry.ts
**Description:** As a developer, I want test coverage for the legacy tool registry (221 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/__tests__/toolRegistry.test.ts created
- [ ] All tool functions tested
- [ ] Error handling tested
- [ ] At least 8 new tests added

### US-006: Test Coverage — agents.ts
**Description:** As a developer, I want test coverage for the agents service (245 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/__tests__/agents.test.ts created
- [ ] Agent definitions tested
- [ ] Agent lookup tested
- [ ] At least 6 new tests added

### US-007: Test Coverage — useNavigation hook
**Description:** As a developer, I want test coverage for the navigation hook (82 lines, 0 tests).

**Acceptance Criteria:**
- [ ] hooks/__tests__/useNavigation.test.ts created
- [ ] Navigation state tested
- [ ] Drag-and-drop reorder tested
- [ ] At least 6 new tests added

### US-008: Test Coverage — useThemeVariables hook
**Description:** As a developer, I want test coverage for the theme variables hook (106 lines, 0 tests).

**Acceptance Criteria:**
- [ ] hooks/__tests__/useThemeVariables.test.ts created
- [ ] Theme switching tested
- [ ] CSS variable output tested
- [ ] At least 6 new tests added
[/PRD]
