# PRD: OS-App Iteration Cycle — Polish, Harden, Test, Optimize

## Overview
Complete the OS-App polish plan (batches 9-10), then harden UI/UX, expand test coverage on critical paths, and optimize bundle performance. This is designed as an infinite iteration loop — each cycle improves the app and feeds the next cycle's backlog.

## Goals
- Complete logger migration across all 43 remaining production files (batches 9-10)
- Achieve 90%+ test coverage on critical service paths (kernel, organisms, voice, capabilities)
- Lazy-load heavy dependencies (Three.js, face-api.js, mermaid, d3) to reduce initial bundle
- Pass WCAG AA accessibility audit on all interactive components
- Zero `console.*` calls in production code outside logger.ts and skip-list

## Quality Gates

These commands must pass for every user story:
- `npx tsc --noEmit` — Zero TypeScript errors
- `npx vitest run` — All tests passing (847+ baseline)
- `npm run lint` — Zero lint errors

## User Stories

### US-001: Polish Batch 9 — Component Logger Migration
**Description:** As a developer, I want all 23 component files migrated from `console.*` to `logger.*` so that production logging is consistent and controllable.

**Acceptance Criteria:**
- [ ] All 23 files listed in POLISH_PLAN.md Batch 9 use `import { logger } from '@/services/logger'`
- [ ] Zero `console.log/warn/error` calls remain in those files
- [ ] `components/voice/VoiceManager/index.tsx` (16 calls) fully migrated
- [ ] `components/MasterStabilizationProtocol.tsx` (5 calls) fully migrated
- [ ] No behavioral changes — logger calls match original severity levels

### US-002: Polish Batch 10 — Hooks, Libs, Stores Logger Migration
**Description:** As a developer, I want all 20 remaining files migrated to the logger so the polish plan is 100% complete.

**Acceptance Criteria:**
- [ ] All 20 files listed in POLISH_PLAN.md Batch 10 use `logger.*` instead of `console.*`
- [ ] `hooks/useConversationalVoice.ts` (7 calls) fully migrated
- [ ] `libs/voice-nexus/providers/stt/deepgram.ts` (8 calls) fully migrated
- [ ] POLISH_PLAN.md updated to mark batches 9 and 10 as Done
- [ ] Grep confirms zero `console.*` in production files outside skip list

### US-003: Dead Code Sweep — Components and Hooks
**Description:** As a developer, I want unused components and hooks identified and archived to `.graveyard/`.

**Acceptance Criteria:**
- [ ] Import analysis across all 75+ components — unreferenced ones identified
- [ ] Import analysis across all 28+ hooks — unreferenced ones identified
- [ ] Disconnected code archived to `.graveyard/` with MANIFEST.md entries
- [ ] Empty stubs deleted outright
- [ ] No build or test regressions

### US-004: Accessibility Audit — Interactive Components
**Description:** As a user, I want all interactive components keyboard-navigable and screen-reader accessible (WCAG AA).

**Acceptance Criteria:**
- [ ] All buttons/links/controls have `aria-label` or visible text
- [ ] All modals trap focus and support Escape to close
- [ ] Tab order is logical across main views
- [ ] Color contrast meets WCAG AA (4.5:1 text, 3:1 large text)
- [ ] Form inputs have associated labels
- [ ] No interactive div/span without role and tabIndex

### US-005: Error Boundary Coverage
**Description:** As a user, I want graceful error handling across all major views.

**Acceptance Criteria:**
- [ ] GlobalErrorBoundary wraps app root in index.tsx
- [ ] Each major panel has a local error boundary
- [ ] Error boundaries show recovery UI with Retry
- [ ] Error boundaries log to logger.error with component stack

### US-006: Test Coverage — Kernel Services
**Description:** As a developer, I want 90%+ test coverage on `services/kernel/`.

**Acceptance Criteria:**
- [ ] AgentKernel.ts: init, dispatch, error handling, shutdown
- [ ] mcpContextBridge.ts: context injection, bridge protocol, error paths
- [ ] KernelScheduler.ts: task scheduling, cancellation, priority ordering
- [ ] IntentResolver.ts: intent matching, ambiguity resolution, fallback
- [ ] 90%+ line coverage for services/kernel/

### US-007: Test Coverage — Capabilities Registry
**Description:** As a developer, I want the capabilities registry thoroughly tested.

**Acceptance Criteria:**
- [ ] registry.ts: registration, lookup, execution, error for unknown
- [ ] providers/dynamic.ts: dynamic capability creation, validation
- [ ] UI/tabs/actions providers: basic smoke tests
- [ ] CPB routing: query routing, confidence, path selection
- [ ] 90%+ line coverage for services/capabilities/

### US-008: Test Coverage — Voice Pipeline
**Description:** As a developer, I want the voice pipeline tested end-to-end.

**Acceptance Criteria:**
- [ ] orchestrator.ts: mode switching, provider fallback, error recovery
- [ ] preflightCheck.ts: all check paths
- [ ] voiceCoreIntegration.ts: core integration hooks
- [ ] STT/TTS provider mocks established
- [ ] 85%+ line coverage for services/voiceNexus/

### US-009: Lazy Loading — Heavy Dependencies
**Description:** As a user, I want the app to load fast by deferring heavy libraries.

**Acceptance Criteria:**
- [ ] Three.js loaded only when 3D viz opened
- [ ] face-api.js loaded only when BiometricPanel activated
- [ ] mermaid loaded only when MermaidDiagram renders
- [ ] d3 loaded only when chart components render
- [ ] Initial bundle reduced by at least 30%
- [ ] Loading states shown during chunk download

### US-010: Code Splitting — Route-Level
**Description:** As a developer, I want route-level code splitting per major view.

**Acceptance Criteria:**
- [ ] Dashboard, AgentControlCenter, BiometricPanel, HardwareEngine lazy-loaded
- [ ] Suspense boundaries with fallback UI
- [ ] Vite build shows separate chunks per view
- [ ] No FOUC during loading
- [ ] Navigation works without full page reload

### US-011: Bundle Analysis and Size Budget
**Description:** As a developer, I want bundle size tracked and budgeted.

**Acceptance Criteria:**
- [ ] rollup-plugin-visualizer added as devDependency
- [ ] Configured in vite.config.ts
- [ ] Baseline size documented
- [ ] Target: under 500KB gzipped initial load

### US-012: Responsive Design Audit
**Description:** As a user, I want OS-App usable on tablet screens (1024px+).

**Acceptance Criteria:**
- [ ] Dashboard adapts at 1024px breakpoint
- [ ] No horizontal scrollbars at 1024px
- [ ] Modals fit within viewport
- [ ] Text readable, no critical truncation
- [ ] Navigation accessible at 1024px

## Non-Goals
- Mobile-first responsive design (tablet 1024px+ only)
- SSR/SSG migration
- Replacing Zustand
- Full e2e testing
- WCAG AAA compliance

## Success Metrics
- POLISH_PLAN.md: 10/10 batches complete
- Zero console.* in production files
- 90%+ coverage on kernel, capabilities, voice
- Initial bundle < 500KB gzipped
- Zero WCAG AA violations on interactive components
