# @metaventionsai/cpb-core

Cognitive Precision Bridge - Unified AI orchestration with precision-aware routing through RLM, ACE, and DQ scoring.

## Quick Start

```bash
npm install @metaventionsai/cpb-core

# Install the SDK for your provider(s)
npm install @anthropic-ai/sdk  # for Claude
npm install @google/genai      # for Gemini
npm install openai             # for Grok
```

Set your API keys:
```bash
export ANTHROPIC_API_KEY=sk-...
export GOOGLE_GENERATIVE_AI_API_KEY=AIza...
export XAI_API_KEY=xai-...
```

```typescript
import { createCPB } from '@metaventionsai/cpb-core';
import { createClaudeProvider } from '@metaventionsai/cpb-core/providers/anthropic';
import { createGeminiProvider } from '@metaventionsai/cpb-core/providers/google';

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

- **Auto-routing**: Automatically selects optimal execution path based on query complexity
- **Multi-provider**: Works with Claude, Gemini, Grok, or any custom provider
- **DQ Scoring**: Built-in quality measurement (validity + specificity + correctness)
- **RLM Engine**: Recursive Language Model for context compression
- **ACE Engine**: Adaptive Consensus Engine for multi-perspective reasoning

## Provider Configuration

### Claude (Anthropic)

```typescript
import { createClaudeProvider, CLAUDE_MODELS } from '@metaventionsai/cpb-core/providers/anthropic';

// Uses ANTHROPIC_API_KEY from environment
const claude = createClaudeProvider();

// Or provide key explicitly
const claude = createClaudeProvider({
    apiKey: 'sk-...',
    defaultModel: CLAUDE_MODELS.deep,
    baseURL: 'https://your-proxy.com'  // optional
});
```

### Gemini (Google)

```typescript
import { createGeminiProvider, createGroundedGeminiProvider } from '@metaventionsai/cpb-core/providers/google';

// Uses GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY from environment
const gemini = createGeminiProvider();

// With Google Search grounding for real-time data
const groundedGemini = createGroundedGeminiProvider();
```

### Grok (xAI)

```typescript
import { createGrokProvider } from '@metaventionsai/cpb-core/providers/grok';

// Uses XAI_API_KEY from environment
const grok = createGrokProvider();
```

### Auto-detection

```typescript
import { createDefaultProviders } from '@metaventionsai/cpb-core/providers';

// Automatically creates providers based on available API keys
const providers = createDefaultProviders();
const cpb = createCPB(providers);
```

## Execution Paths

| Path | Use Case | Engines |
|------|----------|---------|
| `direct` | Simple queries | Fast provider only |
| `rlm` | Long context (>50k chars) | RLM compression |
| `ace` | Complex decisions | Multi-agent consensus |
| `hybrid` | Context + complexity | RLM + ACE |
| `cascade` | Expert-level | Full pipeline + verification |

## Custom Providers

```typescript
import type { CPBProvider } from '@metaventionsai/cpb-core';

const myProvider: CPBProvider = {
    name: 'custom',
    isConfigured: () => true,
    async generate(prompt, options) {
        // Your LLM call here
        return response;
    },
    async generateWithVision(prompt, images, options) {
        // Optional: multimodal support
        return response;
    }
};
```

## Configuration Options

```typescript
import { createCPB, STANDARD_CPB_CONFIG, DEFAULT_CPB_CONFIG } from '@metaventionsai/cpb-core';

// Use standard tier (more cost-conscious)
const cpb = createCPB(providers, STANDARD_CPB_CONFIG);

// Or elite tier (higher quality, more resources)
const cpb = createCPB(providers, DEFAULT_CPB_CONFIG);

// Or custom config
const cpb = createCPB(providers, {
    ...STANDARD_CPB_CONFIG,
    dqThreshold: 0.8,
    enableVerification: true
});
```

## Status Updates

```typescript
const result = await cpb.execute(
    { query: 'Complex analysis task' },
    (status) => {
        console.log(`Phase: ${status.phase}, Progress: ${status.progress}%`);
    }
);
```

## License

MIT
