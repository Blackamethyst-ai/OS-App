# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

OS-App (Metaventions AI) is a React 19 + Vite application featuring an Agentic Kernel with 3D visualizations, biometric sensing, and multi-agent orchestration.

## Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # Production build
npm run lint         # ESLint check
npm run lint:fix     # ESLint with auto-fix
npm run format       # Prettier formatting
npm test             # Vitest watch mode
npm run test:run     # Vitest single run
npm run test:coverage # Coverage report
npm run api          # Start Express API server (tsx watch)
npm run api:start    # Start API server (production)
```

## Architecture

### Core Files

- `App.tsx` — Main application (~30K lines). **Read sections, not the entire file.**
- `store.ts` — Zustand state management
- `index.tsx` — Entry point with providers

### Key Directories

```
components/       # 75 UI components
├── AgentControlCenter.tsx  # Multi-agent orchestration
├── BiometricPanel.tsx      # Face detection, stress sensing
├── Dashboard.tsx           # Main dashboard view
├── CommandPalette.tsx      # Keyboard command interface
└── ...

services/         # 30 service modules
├── geminiService.ts        # Primary LLM integration (largest)
├── agents.ts               # Agent definitions
├── faceDetectionService.ts # Biometric processing
├── dreamProtocol.ts        # Agentic memory system
└── ...

hooks/            # 20 custom hooks
├── useBiometricSensor.ts   # Biometric data hook
├── useGazeTracking.ts      # Eye tracking
├── useAgentRuntime.ts      # Agent execution
└── ...

api/              # Express backend
libs/             # Agentic Kernel libraries (npm packages)
```

### Agentic Kernel Libraries

Published npm packages in `libs/`:

| Package | Version | Description |
|---------|---------|-------------|
| `@metaventionsai/cpb-core` | 1.1.0 | Cognitive Precision Bridge - AI orchestration with DQ scoring |
| `@metaventionsai/voice-nexus` | 1.1.0 | Multi-provider voice architecture (STT/reasoning/TTS) |

```bash
# Build packages
cd libs/cpb-core && npm run build
cd libs/voice-nexus && npm run build
```

See `libs/README.md` for architecture details.

### State Management

Uses Zustand with slices pattern. Global state in `store.ts`.

### AI Services

- Primary: Gemini (`geminiService.ts`)
- Secondary: Claude (`claudeService.ts`), Grok (`grokService.ts`)
- Voice: ElevenLabs (`elevenLabsService.ts`)

## Testing

```bash
npm test                    # Watch mode
npm run test:run            # Single run
npm run test:run -- <file>  # Run specific test file
```

Tests use Vitest with React Testing Library and happy-dom.

## Linting

ESLint is configured with relaxed rules for the existing codebase:

- `@typescript-eslint/no-explicit-any`: off
- `@typescript-eslint/no-unused-vars`: off
- `react-hooks/exhaustive-deps`: warn

## Capabilities Registry

Unified registry for voice commands, navigation, and UI actions.

```typescript
import { executeCapability, getCapability } from '@/services/capabilities';

// Execute a capability
await executeCapability('ui_toggle_theme', { theme: 'MIDNIGHT' });

// Get capability info
const cap = getCapability('navigate_sector');
```

**Key Files:**
- `services/capabilities/` — Registry, types, providers
- `services/capabilities/README.md` — Full documentation

**Adding Capabilities:** See `services/capabilities/README.md`

**Deprecated:** `unifiedActionRegistry.ts` → Use `capabilities` instead

## Session Context

Check these files before starting work:

- `.agent/memory.md` — Agent memory state
- `~/.antigravity/research/os_app_master_proposal` — Master research proposal

## Cost Awareness

Prefer targeted file reads over broad exploration. App.tsx is large—read specific line ranges when needed.
