[PRD]
# PRD: OS-App Iteration Cycle 12 — Organisms & Services Deep Test Coverage

## Overview
Complete test coverage for untested organisms framework layers, genome subsystem, and remaining service gaps.

## Goals
- Add test coverage to organisms core layers (5 files, 1832 lines)
- Add test coverage to genome subsystem (5 files, 3550 lines)
- Add test coverage to organisms cognitive & swarm subsystems (3 files, 3233 lines)
- Add test coverage to remaining services (capabilities index, security)
- Reach 3200+ total tests
- All quality gates passing

## Quality Gates

These commands must pass for every user story:
- `npx tsc --noEmit` - Type checking
- `npx vitest run` - All tests pass
- `npm run lint` - Linting

## User Stories

### US-001: Test Coverage — OrganismLayer.ts
**Description:** As a developer, I want test coverage for the abstract organism layer base class (286 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/organisms/__tests__/OrganismLayer.test.ts created
- [ ] Layer registration tested
- [ ] Dispatch mechanism tested
- [ ] At least 8 new tests added

### US-002: Test Coverage — GenomeLayer.ts
**Description:** As a developer, I want test coverage for the genome layer (512 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/organisms/__tests__/GenomeLayer.test.ts created
- [ ] Skill management tested
- [ ] Layer operations tested
- [ ] At least 8 new tests added

### US-003: Test Coverage — SwarmLayer.ts
**Description:** As a developer, I want test coverage for the swarm layer (361 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/organisms/__tests__/SwarmLayer.test.ts created
- [ ] Team routing tested
- [ ] Stigmergy signals tested
- [ ] At least 8 new tests added

### US-004: Test Coverage — CognitiveLayer.ts
**Description:** As a developer, I want test coverage for the cognitive layer (300 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/organisms/__tests__/CognitiveLayer.test.ts created
- [ ] Memory consolidation tested
- [ ] Wake/sleep cycles tested
- [ ] At least 8 new tests added

### US-005: Test Coverage — organisms/index.ts
**Description:** As a developer, I want test coverage for the organisms index/factory (373 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/organisms/__tests__/index.test.ts created
- [ ] LayerFactory tested
- [ ] Exports verified
- [ ] At least 6 new tests added

### US-006: Test Coverage — genome/types.ts
**Description:** As a developer, I want test coverage for genome type definitions and utilities (420 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/organisms/__tests__/genomeTypes.test.ts created
- [ ] Type guards tested
- [ ] Utility functions tested
- [ ] At least 6 new tests added

### US-007: Test Coverage — genome/seedSkills.ts
**Description:** As a developer, I want test coverage for bootstrap seed skills (451 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/organisms/__tests__/seedSkills.test.ts created
- [ ] Seed skill creation tested
- [ ] Skill validation tested
- [ ] At least 6 new tests added

### US-008: Test Coverage — genome/portableTransfer.ts
**Description:** As a developer, I want test coverage for portable skill transfer (741 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/organisms/__tests__/portableTransfer.test.ts created
- [ ] Transfer protocol tested
- [ ] Serialization tested
- [ ] At least 8 new tests added

### US-009: Test Coverage — capabilities/index.ts
**Description:** As a developer, I want test coverage for the capabilities registry (283 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/capabilities/__tests__/index.test.ts created
- [ ] Registry operations tested
- [ ] Capability execution tested
- [ ] At least 8 new tests added

### US-010: Test Coverage — security/auditLog.ts
**Description:** As a developer, I want test coverage for the security audit log (42 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/security/__tests__/auditLog.test.ts created
- [ ] Logging operations tested
- [ ] At least 4 new tests added

### US-011: Test Coverage — cognitive/goldilocksBuffer.ts
**Description:** As a developer, I want test coverage for the Goldilocks replay buffer (967 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/organisms/__tests__/goldilocksBuffer.test.ts created
- [ ] Buffer operations tested
- [ ] Replay mechanism tested
- [ ] At least 8 new tests added

### US-012: Test Coverage — swarm/aceIntegration.ts
**Description:** As a developer, I want test coverage for ACE consensus bridge integration (964 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/organisms/__tests__/aceIntegration.test.ts created
- [ ] Consensus bridge tested
- [ ] Integration points tested
- [ ] At least 8 new tests added
[/PRD]
