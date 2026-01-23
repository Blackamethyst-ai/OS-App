# Agentic Kernel Libraries

Standalone npm packages extracted from OS-App for reuse in other projects.

## Packages

| Package | npm | Description |
|---------|-----|-------------|
| [@metaventionsai/cpb-core](./cpb-core) | `npm i @metaventionsai/cpb-core` | Cognitive Precision Bridge |
| [@metaventionsai/voice-nexus](./voice-nexus) | `npm i @metaventionsai/voice-nexus` | Voice orchestration |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         OS-App                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Application Layer                      │   │
│  │  App.tsx │ Components │ Hooks │ Services                 │   │
│  └─────────────────────────┬───────────────────────────────┘   │
│                            │                                     │
│  ┌─────────────────────────┴───────────────────────────────┐   │
│  │                   Agentic Kernel                          │   │
│  │  ┌───────────────────┐  ┌───────────────────────────┐   │   │
│  │  │    cpb-core       │  │      voice-nexus          │   │   │
│  │  │  ┌─────────────┐  │  │  ┌─────────┬─────────┐   │   │   │
│  │  │  │ Orchestrator│  │  │  │Reasoning│   TTS   │   │   │   │
│  │  │  │   Router    │  │  │  │   STT   │ Router  │   │   │   │
│  │  │  │   Types     │  │  │  │  Types  │         │   │   │   │
│  │  │  └─────────────┘  │  │  └─────────┴─────────┘   │   │   │
│  │  │  ┌─────────────┐  │  │  ┌─────────────────────┐ │   │   │
│  │  │  │  Providers  │  │  │  │     Providers       │ │   │   │
│  │  │  │ Claude│Gemini│  │  │ │Claude│Gemini│11Labs│ │   │   │
│  │  │  │ Grok        │  │  │  │Browser STT/TTS     │ │   │   │
│  │  │  └─────────────┘  │  │  └─────────────────────┘ │   │   │
│  │  └───────────────────┘  └───────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## CPB-Core Deep Dive

### Execution Paths

```
Query → Path Router → [direct|rlm|ace|hybrid|cascade]
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
    ┌───────┐           ┌─────────┐           ┌─────────┐
    │Direct │           │   RLM   │           │   ACE   │
    │ Path  │           │ Engine  │           │ Engine  │
    └───┬───┘           └────┬────┘           └────┬────┘
        │                    │                     │
        └────────────────────┼─────────────────────┘
                             ▼
                      ┌─────────────┐
                      │ DQ Scoring  │
                      │ Verification│
                      └──────┬──────┘
                             ▼
                         Response
```

**Path Selection Logic:**

| Signal | Threshold | Path |
|--------|-----------|------|
| Context length | < 50K chars | direct |
| Context length | > 50K chars | rlm |
| Query complexity | > 0.5 | ace |
| Both high | - | hybrid |
| Quality target | > 0.8 | cascade |

### DQ (Decisional Quality) Scoring

Based on arXiv:2511.15755:

```
DQ Score = (Validity × 0.4) + (Specificity × 0.3) + (Correctness × 0.3)

Validity:    Is the response logically sound?
Specificity: Is it actionable and concrete?
Correctness: Is it factually accurate?
```

### Provider Interface

```typescript
interface CPBProvider {
    name: string;
    isConfigured(): boolean;
    generate(prompt: string, options?: GenerateOptions): Promise<string>;
    generateWithVision?(prompt: string, images: ImageInput[], options?: GenerateOptions): Promise<string>;
}
```

## Voice-Nexus Deep Dive

### Pipeline

```
Audio Input → STT Provider → Complexity Router → Reasoning Provider → TTS Provider → Audio Output
                                    │
                            ┌───────┴───────┐
                            ▼               ▼
                      Fast Tier      Deep Tier
                      (Gemini)       (Claude)
```

### Complexity Signals

```typescript
interface ComplexitySignals {
    tokenCount: number;           // Length of input
    hasCodeIndicators: boolean;   // Contains code patterns
    hasReasoningIndicators: boolean; // "why", "explain", "compare"
    hasCreativeIndicators: boolean;  // "write", "create", "design"
    hasNavigationIndicators: boolean; // "go to", "open", "show"
    hasQuestionIndicators: boolean;   // "?", "what", "how"
    domainComplexity: number;     // Technical domain detection
}

// Score calculation
score = weighted_sum(signals) → tier (fast|balanced|deep)
```

### Provider Interfaces

```typescript
interface ReasoningProvider {
    name: string;
    models: { fast: string; balanced: string; deep: string };
    isAvailable(): boolean;
    generate(prompt: string, config: ReasoningConfig): Promise<ReasoningResult>;
}

interface TTSProvider {
    name: string;
    supportsStreaming: boolean;
    voices: VoiceConfig[];
    isAvailable(): boolean;
    synthesize(text: string, voice: string, settings?: TTSSettings): Promise<ArrayBuffer>;
    getVoiceForAgent(agentName: string): string;
}

interface STTProvider {
    name: string;
    supportsStreaming: boolean;
    isAvailable(): boolean;
    transcribe(audio: Blob): Promise<string>;
    startStreaming?(onPartial: (text: string) => void): Promise<void>;
    stopStreaming?(): Promise<string>;
}
```

## Research Foundations

These libraries implement concepts from:

| Paper | Contribution |
|-------|--------------|
| arXiv:2512.24601 | RLM - Recursive context compression |
| arXiv:2511.15755 | DQ Scoring - Quality measurement |
| arXiv:2508.17536 | Voting vs Debate - Consensus strategies |

## Development

```bash
# Build both packages
cd libs/cpb-core && npm run build
cd libs/voice-nexus && npm run build

# Run tests
cd libs/cpb-core && npm test
cd libs/voice-nexus && npm test

# Type check
cd libs/cpb-core && npm run typecheck
cd libs/voice-nexus && npm run typecheck
```

## Usage in OS-App

The packages are used internally via workspace references:

```typescript
// services/cpbProviders.ts
import type { CPBProvider } from '@metaventionsai/cpb-core';
import { geminiProvider, claudeProvider } from './cpbProviders';

// services/voiceNexus/providers/
import type { ReasoningProvider } from '@metaventionsai/voice-nexus';
```

## Publishing

```bash
# Bump version
cd libs/cpb-core && npm version patch  # or minor/major

# Publish to npm
npm publish --access public
```

## License

MIT - See individual package LICENSE files.
