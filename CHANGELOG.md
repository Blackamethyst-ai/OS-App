# Changelog

All notable changes to OS-App are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [2026-03-17]
### Fixed
- Remove ajv override that broke ESLint (ajv v8 incompatible with ESLint's v6 dependency)
- Regenerate lockfiles with fully resolved security overrides
- Patch security vulnerabilities via npm overrides
- Resolve cpb-core and voice-nexus imports in test environment

### Changed
- Upgrade GitHub Actions for Node.js 24 compatibility

## [2026-03-14]
### Added
- Code graveyard — archive disconnected code instead of deleting
- Quality-sweep interactive guide

## [2026-03-13]
### Added
- 42 new tests for apiUsageService, vendorService, and TaskStatus/TaskPriority enums
- Test coverage for apiKeyService, modelRouter, hooks, and services

### Fixed
- Replace string literals with TaskStatus/TaskPriority enums
- Resolve 7 npm vulnerabilities (0 remaining)

### Changed
- Remove dead code — 6 unused components, hooks, and 3 dead service files (-893 lines)

## [2026-03-06]
### Added
- Header nav pills, Archon design system upgrade, footer separator
- V1.0 branding, utility CSS classes, MetricCard glow

### Changed
- Design system consolidation — 603 hardcoded colors migrated to CSS vars
- Design system polish — 192 more colors tokenized

### Fixed
- Black screen in production — strip importmap + Recharts 3 compat

## [2026-03-04]
### Added
- Demo mode tab filtering + model ID updates

### Fixed
- Model IDs via model-sweep + demo mode defaults to Archon
- Add .npmrc with legacy-peer-deps for ESLint 10 compat

## [2026-02-25]
### Changed
- Upgrade Vite 6 to 7 and migrate to Rolldown/Oxc
- Migrate framer-motion 11 to motion 12
- Upgrade Recharts 2 to 3, Three.js 0.170 to 0.183, lucide-react 0.475 to 0.575
- Upgrade ESLint 9 to 10

### Fixed
- Voice: fall back to env var for Gemini API key when vault is locked

### Changed
- Fix chunk splitting — rolldownOptions to rollupOptions

## [2026-02-19]
### Added
- Ecosystem hardening — SovereignGallery, voice context expansion, CI/CD

## [2026-02-14]
### Changed
- Strengthen voice tool input contracts and coverage
- Harden VoiceManager tool handling and expand regression tests

## [2026-02-09]
### Changed
- Migrate all services to structured logger (batches 1-8)
- Update Metaventions AI URLs to metaventionsai.com

## [2026-02-08]
### Added
- Genome: MCP external client, skill execution runtime, seed skills library
- Persistent skill storage with SupabaseSkillRegistry

### Fixed
- Demo: remove console.log spam, alert() calls, hardcoded localhost
- UI: resolve 8 UI/UX bugs across dashboard, voice, and memory pages
- Add demo bypass, service health, fix missing tabs

### Changed
- Polish batches 1-4: TS errors, accessibility, logger migration, security audit, dead code removal

## [2026-02-07]
### Added
- Prompt isolation layer to mitigate extraction attacks

## [2026-02-01]
### Added
- CPB Routing Migration (Phase 2)
- Capabilities Registry Consolidation
- Wire up previously placeholder UI features

### Fixed
- Extensive TypeScript type errors across action handlers, stores, and services
- Dependencies: vitest, diff updated for security

### Changed
- Add ESLint v9 with flat config
- Batch Zustand selectors, Gemini caching, memoize telemetry

## [2026-01-31]
### Added
- Agentic Organism Framework with concrete layer classes, factory, and UI panel

### Fixed
- TypeScript errors across action handlers, slices, and type definitions

## [2026-01-29]
### Added
- Real-time conversational voice with VAD and streaming STT
- Deepgram and OpenAI added to API key vault

## [2026-01-26]
### Added
- Meta-Learning prediction system for session optimization
- Voice system: Supabase persistence, automation handlers, biometrics, code analysis, consensus
- 139 voice commands wired to real services
- Sovereign Capability Matrix unifying tool registries
- Multimodal and video generation

### Changed
- Test coverage improved from 89.75% to 95.09%

## [2026-01-24]
### Added
- VoiceNexus: intent analysis connecting voice to app state execution
- CONTINUITY_PROTOCOL_V4 forensic identity system for ImageGen

### Changed
- Switch to Gemini Live as primary voice system
- Consolidate tool registries into UnifiedRegistry

### Fixed
- Echo prevention — mute mic while AI speaks
- Session persistence for API Vault
- Gemini reasoning with retries and Flash fallback

## [2026-01-23]
### Added
- GPU catalog and live pricing service
- Hardware procurement workflow with vendor quotes
- Libraries configured for npm publish (cpb-core, voice-nexus)

### Changed
- Major refactoring: component directory organization (Phases 1-6)
- Extract state slices, lazy loading, auth persistence
- Lazy load three.js, face-api, and tensorflow

## [2026-01-22]
### Added
- Voice Core Integration: browser STT, codebase awareness, UI interaction tools
- Complete component action registry with 100+ actions
- Tab navigation registry for precise voice navigation

## [2026-01-21]
### Added
- ARCHON meta-orchestrator (Phases 1-6) with god-mode Command Center UI
- Comprehensive test suite (49 tests)

## [2026-01-19]
### Added
- Cognitive Precision Bridge unified orchestration layer
- Voice Nexus multi-provider architecture
- Elite Tier Activation across all orchestrators

## [2026-01-17]
### Added
- Recursive Language Model (RLM) service
- HRPO, RLM docs, and ACE enhancements
- Unit tests for ACE, RLM, and DQ scoring services

## [2026-01-16]
### Changed
- Identity Unveiling: Rebrand to Dicoangelo

## [2026-01-13]
### Added
- Adaptive Convergence Engine (ACE) for enhanced consensus
- Statistical analysis script and ExperimentLogger UI

## [2026-01-11]
### Added
- Graph Reasoning Engine integration and Safe Evolution Workflow
- Decentralized Type Architecture for Lattice Softening

## [2026-01-09]
### Added
- Agentic Kernel with Biometric UI
- Phase 1-3 AUI enhancements: biometric sensors, self-synthesizing adaptive UI, VLM/LLM integration
- System Kernel Stabilization with Watchdog and Error Boundary

## [2026-01-08]
### Added
- Neural Dock layout with clean top bar and footer
- Power Management System: ECO/BALANCED/OVERDRIVE modes, budget tracking
- Dream Protocol and Self-Evolution wired to power management

## [2026-01-07]
### Added
- Self-Evolution Protocol — recursive self-improvement, friction detection, code generation
- Dream Protocol — autonomous background intelligence, idle-triggered research
- AGI-tier cognitive architecture — elite prompting, chain-of-thought, agent archetypes
- Voice Polish and ElevenLabs Integration
- AES-256 encryption for API key storage
- Multi-tier AI routing with model toggle and Grok integration

## [2026-01-06]
### Added
- Sovereign Gate Authentication and BYOK Flow
- Neural Debugger with manual demo mode
- Emotive UI system

### Fixed
- Model ID corrections (replace invalid gemini-3 names with valid models)

## [2026-01-01]
### Added
- HolographicCommandDeck and ProceduralHologram components
- Search filter and history persistence
- Systems Integrity metrics

## [2025-12-28]
### Added
- Visual Cortex analysis integration
- Autonomous finance mode and market intelligence
- Nexus integration and enhanced navigation

## [2025-12-24]
### Added
- NeuralMomentumPulse and PARAHub components
- VoiceMode and Synthesis Bridge integrated into main layout
- Dynamic DNA calibration for agent personas

## [2025-12-22]
### Added
- Video generation and SPA routing
- Knowledge Layer support
- Code evolution capabilities in Code Studio
