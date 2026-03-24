[PRD]
# PRD: OS-App Iteration Cycle 8 — Service & Hook Test Coverage Expansion

## Overview
Expand test coverage to remaining untested service files and hook files. Targeting 10 service files and 9 hook files.

## Goals
- Add test coverage to 19 untested files (3,154+ lines)
- Reach 2400+ total tests
- All quality gates passing

## Quality Gates

These commands must pass for every user story:
- `npx tsc --noEmit` - Type checking
- `npx vitest run` - All tests pass
- `npm run lint` - Linting

## User Stories

### US-001: Test Coverage — agoraService.ts
**Description:** As a developer, I want test coverage for the Agora debate service (143 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/__tests__/agoraService.test.ts created
- [ ] Persona generation tested
- [ ] Debate turn execution tested
- [ ] At least 8 new tests added

### US-002: Test Coverage — elevenLabsService.ts
**Description:** As a developer, I want test coverage for the ElevenLabs TTS service (123 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/__tests__/elevenLabsService.test.ts created
- [ ] Speech generation tested
- [ ] Stream decoding tested
- [ ] At least 8 new tests added

### US-003: Test Coverage — bicameralService.ts
**Description:** As a developer, I want test coverage for the bicameral consensus service (122 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/__tests__/bicameralService.test.ts created
- [ ] Decomposition mapping tested
- [ ] Consensus engine tested
- [ ] At least 8 new tests added

### US-004: Test Coverage — audioService.ts
**Description:** As a developer, I want test coverage for the audio feedback service (100 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/__tests__/audioService.test.ts created
- [ ] Audio playback methods tested
- [ ] Mute behavior tested
- [ ] At least 8 new tests added

### US-005: Test Coverage — collabService.ts
**Description:** As a developer, I want test coverage for the collaboration service (91 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/__tests__/collabService.test.ts created
- [ ] Init/disconnect lifecycle tested
- [ ] Peer generation tested
- [ ] At least 8 new tests added

### US-006: Test Coverage — daemonService.ts
**Description:** As a developer, I want test coverage for the daemon service (75 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/__tests__/daemonService.test.ts created
- [ ] Mermaid repair tested
- [ ] Context snapshots tested
- [ ] At least 8 new tests added

### US-007: Test Coverage — autopoieticDaemon.ts
**Description:** As a developer, I want test coverage for the autopoietic daemon (73 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/__tests__/autopoieticDaemon.test.ts created
- [ ] Mode/cooldown guards tested
- [ ] Scan initiation tested
- [ ] At least 8 new tests added

### US-008: Test Coverage — metaventionService.ts
**Description:** As a developer, I want test coverage for the metavention service (66 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/__tests__/metaventionService.test.ts created
- [ ] Layer analysis tested
- [ ] Strategy generation tested
- [ ] At least 8 new tests added

### US-009: Test Coverage — ollamaService.ts
**Description:** As a developer, I want test coverage for the Ollama service (62 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/__tests__/ollamaService.test.ts created
- [ ] Availability detection tested
- [ ] Chat completion tested
- [ ] At least 8 new tests added

### US-010: Test Coverage — grokService.ts
**Description:** As a developer, I want test coverage for the Grok service (61 lines, 0 tests).

**Acceptance Criteria:**
- [ ] services/__tests__/grokService.test.ts created
- [ ] API key handling tested
- [ ] Response parsing tested
- [ ] At least 8 new tests added

### US-011: Test Coverage — useBiometricSensor.ts
**Description:** As a developer, I want test coverage for the biometric sensor hook (651 lines, 0 tests).

**Acceptance Criteria:**
- [ ] hooks/__tests__/useBiometricSensor.test.ts created
- [ ] Sensor lifecycle tested
- [ ] State management tested
- [ ] At least 10 new tests added

### US-012: Test Coverage — useProcessVisualizerLogic.ts
**Description:** As a developer, I want test coverage for the process visualizer logic hook (550 lines, 0 tests).

**Acceptance Criteria:**
- [ ] hooks/__tests__/useProcessVisualizerLogic.test.ts created
- [ ] Visualization state tested
- [ ] Process tracking tested
- [ ] At least 10 new tests added

### US-013: Test Coverage — useConversationalVoice.ts
**Description:** As a developer, I want test coverage for the conversational voice hook (536 lines, 0 tests).

**Acceptance Criteria:**
- [ ] hooks/__tests__/useConversationalVoice.test.ts created
- [ ] Voice session lifecycle tested
- [ ] Provider integration tested
- [ ] At least 10 new tests added

### US-014: Test Coverage — useStressDetector.ts
**Description:** As a developer, I want test coverage for the stress detector hook (383 lines, 0 tests).

**Acceptance Criteria:**
- [ ] hooks/__tests__/useStressDetector.test.ts created
- [ ] Stress level detection tested
- [ ] Adaptive UI integration tested
- [ ] At least 10 new tests added

### US-015: Test Coverage — useVisualCortex.ts
**Description:** As a developer, I want test coverage for the visual cortex hook (176 lines, 0 tests).

**Acceptance Criteria:**
- [ ] hooks/__tests__/useVisualCortex.test.ts created
- [ ] Drag/drop handling tested
- [ ] Visual input processing tested
- [ ] At least 8 new tests added

### US-016: Test Coverage — useFixationGlow.ts
**Description:** As a developer, I want test coverage for the fixation glow hook (117 lines, 0 tests).

**Acceptance Criteria:**
- [ ] hooks/__tests__/useFixationGlow.test.ts created
- [ ] Event listener lifecycle tested
- [ ] Intensity levels tested
- [ ] At least 8 new tests added

### US-017: Test Coverage — useApiKeyModal.ts
**Description:** As a developer, I want test coverage for the API key modal hook (72 lines, 0 tests).

**Acceptance Criteria:**
- [ ] hooks/__tests__/useApiKeyModal.test.ts created
- [ ] Modal state management tested
- [ ] Event handling tested
- [ ] At least 8 new tests added

### US-018: Test Coverage — useAuthPersistence.ts
**Description:** As a developer, I want test coverage for the auth persistence hook (61 lines, 0 tests).

**Acceptance Criteria:**
- [ ] hooks/__tests__/useAuthPersistence.test.ts created
- [ ] localStorage operations tested
- [ ] Error handling tested
- [ ] At least 8 new tests added

### US-019: Test Coverage — useAutoSave.ts
**Description:** As a developer, I want test coverage for the auto-save hook (52 lines, 0 tests).

**Acceptance Criteria:**
- [ ] hooks/__tests__/useAutoSave.test.ts created
- [ ] Mode-switch saves tested
- [ ] Periodic auto-save tested
- [ ] At least 8 new tests added
[/PRD]
