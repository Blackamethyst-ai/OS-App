# @metaventionsai/cpb-core

Cognitive Precision Bridge - Unified AI orchestration with precision-aware routing through RLM, ACE, and DQ scoring.

[![npm version](https://img.shields.io/npm/v/@metaventionsai/cpb-core.svg)](https://www.npmjs.com/package/@metaventionsai/cpb-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
npm install @metaventionsai/cpb-core

# Install the SDK for your provider(s)
npm install @anthropic-ai/sdk  # for Claude
npm install @google/genai      # for Gemini
npm install openai             # for Grok
```

## Quick Start

```typescript
import { createCPB } from '@metaventionsai/cpb-core';
import { createClaudeProvider } from '@metaventionsai/cpb-core/providers/anthropic';
import { createGeminiProvider } from '@metaventionsai/cpb-core/providers/google';

// Set env vars: ANTHROPIC_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY

const cpb = createCPB({
    fast: createGeminiProvider(),
    balanced: createGeminiProvider(),
    deep: createClaudeProvider()
});

const result = await cpb.execute({
    query: 'Design a microservices architecture for an e-commerce platform'
});

console.log(result.output);
console.log(`Path: ${result.path}, DQ Score: ${result.dqScore.overall}%`);
```

## Features

- **Auto-routing** - Automatically selects optimal execution path based on query complexity
- **Multi-provider** - Works with Claude, Gemini, Grok, or any custom provider
- **DQ Scoring** - Built-in quality measurement (validity + specificity + correctness)
- **RLM Engine** - Recursive Language Model for context compression
- **ACE Engine** - Adaptive Consensus Engine for multi-perspective reasoning
- **TypeScript** - Full type definitions included

## Architecture

```
Query → Path Router → [direct|rlm|ace|hybrid|cascade]
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
    Direct Path          RLM Engine           ACE Engine
    (fast queries)    (long context)      (complex decisions)
        │                    │                     │
        └────────────────────┼─────────────────────┘
                             ▼
                      DQ Verification
                             ▼
                         Response
```

## Execution Paths

| Path | Use Case | When Selected |
|------|----------|---------------|
| `direct` | Simple queries | Context < 50K, complexity < 0.3 |
| `rlm` | Long context | Context > 50K chars |
| `ace` | Complex decisions | Complexity > 0.5 |
| `hybrid` | Context + complexity | Both thresholds exceeded |
| `cascade` | Expert-level | Quality target > 0.8 |

## Providers

### Claude (Anthropic)

```typescript
import { createClaudeProvider, CLAUDE_MODELS } from '@metaventionsai/cpb-core/providers/anthropic';

const claude = createClaudeProvider();

// With options
const claude = createClaudeProvider({
    apiKey: 'sk-...',           // default: ANTHROPIC_API_KEY env
    defaultModel: CLAUDE_MODELS.deep,
    baseURL: 'https://proxy.com' // optional
});
```

Models: `claude-3-5-haiku-20241022` (fast), `claude-sonnet-5` (balanced/deep)

### Gemini (Google)

```typescript
import { createGeminiProvider, createGroundedGeminiProvider } from '@metaventionsai/cpb-core/providers/google';

const gemini = createGeminiProvider();

// With Google Search grounding
const grounded = createGroundedGeminiProvider();
```

Models: `gemini-2.5-flash-image` (fast), `gemini-2.5-pro` (balanced/deep)

### Grok (xAI)

```typescript
import { createGrokProvider } from '@metaventionsai/cpb-core/providers/grok';

const grok = createGrokProvider();
```

Model: `grok-beta`

### Auto-detection

```typescript
import { createDefaultProviders } from '@metaventionsai/cpb-core/providers';

const providers = createDefaultProviders();
// Detects available API keys and creates appropriate providers
```

## API Reference

### createCPB(providers, config?)

Creates a CPB orchestrator instance.

```typescript
const cpb = createCPB(
    { fast?: CPBProvider, balanced?: CPBProvider, deep?: CPBProvider },
    config?: Partial<CPBConfig>
);
```

### cpb.execute(request, onStatus?)

Executes a query through the CPB pipeline.

```typescript
const result = await cpb.execute(
    {
        query: string,
        context?: string,
        multimodal?: { images?: ImageInput[] },
        forcePath?: CPBPath,
        forceTier?: 'fast' | 'balanced' | 'deep' | 'auto',
        timeBudgetMs?: number,
        qualityTarget?: number  // 0-1
    },
    (status: CPBStatus) => void  // optional callback
);
```

### CPBResult

```typescript
interface CPBResult {
    output: string;
    confidence: number;        // 0-100
    path: CPBPath;
    executionTimeMs: number;
    tokensUsed: number;
    dqScore: {
        overall: number;       // 0-100
        validity: number;
        specificity: number;
        correctness: number;
    };
    verified: boolean;
    pathSignals: PathSignals;
    pathReasoning: string;
}
```

### CPBProvider Interface

```typescript
interface CPBProvider {
    name: string;
    isConfigured(): boolean;
    generate(prompt: string, options?: GenerateOptions): Promise<string>;
    generateWithVision?(
        prompt: string,
        images: ImageInput[],
        options?: GenerateOptions
    ): Promise<string>;
}

interface GenerateOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
}

interface ImageInput {
    base64: string;
    mediaType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
    description?: string;
}
```

## Configuration

### Standard Tier (cost-conscious)

```typescript
import { createCPB, STANDARD_CPB_CONFIG } from '@metaventionsai/cpb-core';

const cpb = createCPB(providers, STANDARD_CPB_CONFIG);
```

### Elite Tier (quality-focused)

```typescript
import { createCPB, DEFAULT_CPB_CONFIG } from '@metaventionsai/cpb-core';

const cpb = createCPB(providers, DEFAULT_CPB_CONFIG);
```

### Custom Config

```typescript
const cpb = createCPB(providers, {
    autoRoute: true,
    defaultPath: 'hybrid',
    contextThreshold: 50000,
    complexityThreshold: 0.5,
    dqThreshold: 0.7,
    enableVerification: true,
    enableLearning: true,
    retryOnLowDQ: true,
});
```

## Custom Providers

```typescript
import type { CPBProvider } from '@metaventionsai/cpb-core';

const myProvider: CPBProvider = {
    name: 'my-llm',
    isConfigured: () => !!process.env.MY_API_KEY,
    async generate(prompt, options) {
        const response = await myLLMCall(prompt, options);
        return response.text;
    },
    async generateWithVision(prompt, images, options) {
        const response = await myLLMVisionCall(prompt, images, options);
        return response.text;
    }
};
```

## Research Foundations

| Paper | Contribution |
|-------|--------------|
| [arXiv:2512.24601](https://arxiv.org/abs/2512.24601) | RLM - Recursive context externalization |
| [arXiv:2511.15755](https://arxiv.org/abs/2511.15755) | DQ Scoring - Quality measurement |
| [arXiv:2508.17536](https://arxiv.org/abs/2508.17536) | Voting vs Debate - Consensus strategies |

## Environment Variables

| Variable | Provider | Required |
|----------|----------|----------|
| `ANTHROPIC_API_KEY` | Claude | If using Claude |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini | If using Gemini |
| `GEMINI_API_KEY` | Gemini | Alternative |
| `XAI_API_KEY` | Grok | If using Grok |

## Examples

See the [examples/](./examples) directory:
- `basic-usage.ts` - Setting up CPB with providers
- `auto-providers.ts` - Auto-detecting available API keys

## License

MIT
