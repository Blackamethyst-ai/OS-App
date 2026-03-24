[PRD]
# PRD: OS-App Iteration Cycle 4 — Test Coverage Expansion & Service Hardening

## Overview
Expand test coverage to untested service directories (biometric, voice, geminiService, tabNavigationRegistry), add error boundary tests, and clean up dead code in legacy/.

## Goals
- Add test coverage to 4 untested service areas
- Reach 1700+ total tests
- Remove dead legacy directory
- Improve error handling coverage

## Quality Gates

These commands must pass for every user story:
- `npx tsc --noEmit` - Type checking
- `npx vitest run` - All tests pass
- `npm run lint` - Linting

## User Stories

### US-001: Test Coverage — Biometric Services
**Description:** As a developer, I want test coverage for biometric processor and stress analysis.

**Acceptance Criteria:**
- [ ] services/biometric/__tests__/ directory created
- [ ] processor.ts tested: biometric data processing pipeline
- [ ] stressAnalysis.ts tested: stress level calculation, trend detection
- [ ] At least 8 new tests added
- [ ] All tests pass in full suite (not just isolation)

### US-002: Test Coverage — Voice Services
**Description:** As a developer, I want test coverage for voice action discovery and service.

**Acceptance Criteria:**
- [ ] services/voice/__tests__/ directory created
- [ ] actions.ts tested: action registration, execution
- [ ] discovery.ts tested: voice command discovery, matching
- [ ] service.ts tested: voice service lifecycle
- [ ] At least 10 new tests added

### US-003: Test Coverage — Tab Navigation Registry
**Description:** As a developer, I want test coverage for tabNavigationRegistry (800 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/__tests__/tabNavigationRegistry.test.ts created
- [ ] Tab registration tested
- [ ] Navigation state management tested
- [ ] Keyboard navigation tested
- [ ] At least 6 new tests added

### US-004: Test Coverage — GeminiService Core
**Description:** As a developer, I want test coverage for geminiService core functions.

**Acceptance Criteria:**
- [ ] services/__tests__/geminiService.test.ts created
- [ ] retryGeminiRequest tested: retry logic, backoff, error handling
- [ ] safeParseJson tested: valid JSON, malformed input, edge cases
- [ ] getAI tested: initialization, caching
- [ ] At least 8 new tests added

### US-005: Remove Legacy Directory
**Description:** As a developer, I want the empty legacy/ directory cleaned up.

**Acceptance Criteria:**
- [ ] Verify no files import from services/legacy/
- [ ] Archive README.md context to .graveyard/ per dead-code policy
- [ ] Remove services/legacy/ directory
- [ ] No build or test regressions

[/PRD]
