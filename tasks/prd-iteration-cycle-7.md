[PRD]
# PRD: OS-App Iteration Cycle 7 — Voice, Pricing & Core Service Test Coverage

## Overview
Expand test coverage to voice integration, pricing services, persistence, and CPB-related service files. Targeting 11 untested service files.

## Goals
- Add test coverage to 11 untested service areas (3400+ lines)
- Reach 2200+ total tests
- All quality gates passing

## Quality Gates

These commands must pass for every user story:
- `npx tsc --noEmit` - Type checking
- `npx vitest run` - All tests pass
- `npm run lint` - Linting

## User Stories

### US-001: Test Coverage — voiceCoreIntegration.ts
**Description:** As a developer, I want test coverage for the voice core integration service (747 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/__tests__/voiceCoreIntegration.test.ts created
- [ ] Voice pipeline integration tested
- [ ] State management tested
- [ ] At least 10 new tests added

### US-002: Test Coverage — voiceUIContext.ts
**Description:** As a developer, I want test coverage for the voice UI context service (515 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/__tests__/voiceUIContext.test.ts created
- [ ] UI context state tested
- [ ] Voice command routing tested
- [ ] At least 10 new tests added

### US-003: Test Coverage — faceDetectionService.ts
**Description:** As a developer, I want test coverage for the face detection service (456 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/__tests__/faceDetectionService.test.ts created
- [ ] Detection logic tested
- [ ] State management tested
- [ ] At least 8 new tests added

### US-004: Test Coverage — priceApiService.ts
**Description:** As a developer, I want test coverage for the price API service (309 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/__tests__/priceApiService.test.ts created
- [ ] API fetching tested
- [ ] Error handling tested
- [ ] At least 8 new tests added

### US-005: Test Coverage — minerstatService.ts
**Description:** As a developer, I want test coverage for the minerstat service (261 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/__tests__/minerstatService.test.ts created
- [ ] Mining data fetching tested
- [ ] Cache behavior tested
- [ ] At least 8 new tests added

### US-006: Test Coverage — persistenceService.ts
**Description:** As a developer, I want test coverage for the persistence service (266 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/__tests__/persistenceService.test.ts created
- [ ] Storage operations tested
- [ ] Fallback behavior tested
- [ ] At least 10 new tests added

### US-007: Test Coverage — cpbService.ts
**Description:** As a developer, I want test coverage for the CPB service (185 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/__tests__/cpbService.test.ts created
- [ ] CPB routing tested
- [ ] Path selection tested
- [ ] At least 8 new tests added

### US-008: Test Coverage — DynamicToolRegistry.ts
**Description:** As a developer, I want test coverage for the dynamic tool registry (158 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/__tests__/DynamicToolRegistry.test.ts created
- [ ] Tool registration tested
- [ ] Tool execution tested
- [ ] At least 8 new tests added

### US-009: Test Coverage — supabaseService.ts
**Description:** As a developer, I want test coverage for the Supabase service (212 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/__tests__/supabaseService.test.ts created
- [ ] Voice storage operations tested
- [ ] Configuration detection tested
- [ ] At least 10 new tests added

### US-010: Test Coverage — claudeService.ts
**Description:** As a developer, I want test coverage for the Claude service (174 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/__tests__/claudeService.test.ts created
- [ ] API integration tested
- [ ] Error handling tested
- [ ] At least 8 new tests added

### US-011: Test Coverage — cpbProviders.ts
**Description:** As a developer, I want test coverage for the CPB providers (144 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/__tests__/cpbProviders.test.ts created
- [ ] Provider definitions tested
- [ ] Provider lookup tested
- [ ] At least 8 new tests added
[/PRD]
