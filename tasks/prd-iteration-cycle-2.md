# PRD: OS-App Iteration Cycle 2 — TypeScript Zero, Bundle Shrink, Test Harden

## Overview
Eliminate all 91 TypeScript errors, shrink the lucide-react vendor chunk (159KB gzipped), optimize the main index bundle (300KB gzipped), and fix test timeouts. This cycle targets the technical debt exposed by Cycle 1.

## Goals
- Zero TypeScript errors (`npx tsc --noEmit` clean)
- Lucide-react vendor chunk reduced by 80%+ via individual icon imports
- Main index chunk split below 200KB gzipped
- All tests passing with zero timeout errors
- Test count maintained or increased from 1542 baseline

## Quality Gates

These commands must pass for every user story:
- `npx tsc --noEmit` — Zero TypeScript errors
- `npx vitest run` — All tests passing
- `npm run lint` — Zero lint errors

## User Stories

### US-001: Fix ErrorBoundary TypeScript Errors
**Description:** As a developer, I want BiometricErrorBoundary and GlobalErrorBoundary to have proper TypeScript class component types so they don't produce TS errors.

**Acceptance Criteria:**
- [ ] BiometricErrorBoundary.tsx: all 11 TS errors fixed (add proper state/props generic types to class)
- [ ] GlobalErrorBoundary.tsx: 2 setState errors fixed
- [ ] Both components extend React.Component<Props, State> with explicit generics
- [ ] No behavioral changes — rendering and error catching unchanged

### US-002: Fix Component TypeScript Errors
**Description:** As a developer, I want all component-level type errors fixed so the codebase is type-safe.

**Acceptance Criteria:**
- [ ] DynamicVisuals.tsx: 12 errors fixed (type `unknown` arrays — add proper GraphNode typing)
- [ ] ArchonDashboard/parts/panels.tsx: 3 errors fixed (unknown type)
- [ ] graph/RelatedConcepts.tsx: 2 errors fixed (unknown type)
- [ ] ZenithDisplay.tsx: 1 error fixed (className on Canvas — use style or correct prop)
- [ ] autogen/index.ts: 1 error fixed (React namespace)

### US-003: Fix Test File TypeScript Errors
**Description:** As a developer, I want all test file type errors fixed.

**Acceptance Criteria:**
- [ ] complexityEstimator.test.ts: 18 errors fixed (add `description` and `weight` to AtomicTask test objects)
- [ ] CPBTest.test.tsx: 2 errors fixed (unknown/Blob casting)
- [ ] vendorService.test.ts: 1 error fixed (add `limit` property)
- [ ] VoiceManager/index.test.ts: 2 errors fixed (error property, missing allElements)

### US-004: Fix Hooks and Voice TypeScript Errors
**Description:** As a developer, I want hooks and voice component type errors fixed.

**Acceptance Criteria:**
- [ ] useNavigation.ts: 6 errors fixed (React namespace — add `import React from 'react'` or use explicit types)
- [ ] VoiceCoreManager.tsx: 2 errors fixed (string → union type casting)
- [ ] VoiceManager/index.tsx: 3 errors fixed (ScanInteractiveElements type, VoiceMode casting)

### US-005: Lucide-React Icon Optimization
**Description:** As a developer, I want lucide-react imports optimized to reduce the 159KB gzipped vendor chunk.

**Acceptance Criteria:**
- [ ] All 93 files using `from 'lucide-react'` switched to individual icon imports: `import { X } from 'lucide-react'` stays (Vite tree-shakes these), but verify tree-shaking works
- [ ] If barrel imports prevent tree-shaking, switch to `import { Icon } from 'lucide-react/dist/esm/icons/icon'` pattern
- [ ] vendor-lucide chunk reduced by at least 50% (from 159KB gzipped)
- [ ] All icons still render correctly

### US-006: Fix Test Timeout — skillExecution.test.ts
**Description:** As a developer, I want the skillExecution test timeout fixed so test runs are clean.

**Acceptance Criteria:**
- [ ] skillExecution.test.ts timeout error resolved
- [ ] Test either has proper async cleanup or increased timeout for legitimate long-running operations
- [ ] `npx vitest run` shows 0 errors (not just 0 failures)

### US-007: Main Index Chunk Splitting
**Description:** As a developer, I want the main index.js chunk (300KB gzipped) split into smaller pieces.

**Acceptance Criteria:**
- [ ] App.tsx code-split from services code
- [ ] Heavy service modules (geminiService.ts, organisms/) split into separate chunks
- [ ] Main entry chunk under 200KB gzipped
- [ ] No runtime errors — all dynamic imports resolve correctly

## Non-Goals
- Replacing lucide-react with another icon library
- Removing Three.js or TensorFlow (already lazy-loaded)
- Adding new features
- Mobile responsive (tablet 1024px+ already done)

## Success Metrics
- `npx tsc --noEmit`: 0 errors (from 91)
- `npx vitest run`: 0 errors, 1542+ tests passing
- vendor-lucide chunk: < 80KB gzipped (from 159KB)
- Main index chunk: < 200KB gzipped (from 300KB)
