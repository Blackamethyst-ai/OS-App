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
libs/             # Agentic Kernel libraries
```

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

## Session Context

Check these files before starting work:

- `.agent/memory.md` — Agent memory state
- `~/.antigravity/research/os_app_master_proposal` — Master research proposal

## Cost Awareness

Prefer targeted file reads over broad exploration. App.tsx is large—read specific line ranges when needed.
