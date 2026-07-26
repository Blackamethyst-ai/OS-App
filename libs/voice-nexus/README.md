# @metaventionsai/voice-nexus

Universal multi-provider voice architecture - seamless routing between STT, reasoning, and TTS providers.

[![npm version](https://img.shields.io/npm/v/@metaventionsai/voice-nexus.svg)](https://www.npmjs.com/package/@metaventionsai/voice-nexus)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
npm install @metaventionsai/voice-nexus

# Install SDKs for your provider(s)
npm install @anthropic-ai/sdk  # for Claude reasoning
npm install @google/genai      # for Gemini reasoning
```

## Quick Start

```typescript
import { createVoiceNexus } from '@metaventionsai/voice-nexus';
import { createGeminiReasoning } from '@metaventionsai/voice-nexus/providers/reasoning/google';
import { createElevenLabsTTS } from '@metaventionsai/voice-nexus/providers/tts/elevenlabs';
import { createBrowserSTT } from '@metaventionsai/voice-nexus/providers/stt/browser';

const nexus = createVoiceNexus({
    config: {
        mode: 'turn-based',
        knowledgeInjection: false,
        providers: {
            stt: createBrowserSTT(),
            reasoning: createGeminiReasoning(),
            tts: createElevenLabsTTS()
        }
    },
    events: {
        onTranscriptUpdate: (t) => console.log(`[${t.role}] ${t.text}`)
    }
});

const response = await nexus.processTextInput('How do I implement authentication?');
console.log(response?.text);
```

## Features

- **Multi-provider** - Mix and match STT, reasoning, and TTS providers
- **Complexity routing** - Auto-selects fast/balanced/deep tier
- **Knowledge injection** - Optional external knowledge integration
- **Browser support** - Zero-dependency Web Speech API providers
- **TypeScript** - Full type definitions included

## Architecture

```
┌─────────────┐    ┌──────────────────┐    ┌─────────────┐
│ Audio Input │───▶│   STT Provider   │───▶│    Text     │
└─────────────┘    └──────────────────┘    └──────┬──────┘
                                                   │
                                                   ▼
                                          ┌───────────────┐
                                          │  Complexity   │
                                          │    Router     │
                                          └───────┬───────┘
                              ┌───────────────────┼───────────────────┐
                              ▼                   ▼                   ▼
                        ┌──────────┐        ┌──────────┐        ┌──────────┐
                        │   Fast   │        │ Balanced │        │   Deep   │
                        │  Tier    │        │   Tier   │        │   Tier   │
                        └────┬─────┘        └────┬─────┘        └────┬─────┘
                              └───────────────────┼───────────────────┘
                                                  ▼
                                          ┌──────────────┐
                                          │  Reasoning   │
                                          │   Provider   │
                                          └──────┬───────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐    ┌──────────────┐
                                          │ TTS Provider │───▶│ Audio Output │
                                          └──────────────┘    └──────────────┘
```

## Providers

### Reasoning

```typescript
import {
    createGeminiReasoning,
    createClaudeReasoning,
    createGroundedGeminiReasoning
} from '@metaventionsai/voice-nexus/providers/reasoning';

// Gemini - fast responses
const gemini = createGeminiReasoning();

// Claude - deep reasoning
const claude = createClaudeReasoning();

// Gemini with Google Search grounding
const grounded = createGroundedGeminiReasoning();
```

**Models:**
- Gemini: `gemini-2.5-flash-image` (fast), `gemini-2.5-pro` (balanced/deep)
- Claude: `claude-3-5-haiku-20241022` (fast), `claude-sonnet-5` (balanced/deep)

### Text-to-Speech (TTS)

```typescript
import { createElevenLabsTTS, createBrowserTTS } from '@metaventionsai/voice-nexus/providers/tts';

// ElevenLabs - premium quality
const elevenLabs = createElevenLabsTTS();

// Browser - free fallback
const browser = createBrowserTTS();
```

**ElevenLabs Voices:**
| ID | Name | Gender | Style |
|----|------|--------|-------|
| `DR_IRA` | Dr. Ira | Male | Deep, authoritative |
| `MIKE` | Mike | Male | Narrative, American |
| `CALEB` | Caleb | Male | News anchor |
| `PARAMDEEP` | Paramdeep | Male | Casual |
| `BILAL` | Bilal | Male | Energetic |
| `PERRI` | Perri | Female | Clear, American |
| `HELEN` | Helen | Female | Strong, expressive |
| `NOAH` | Noah | Female | Gentle, narrative |

### Speech-to-Text (STT)

```typescript
import { createBrowserSTT } from '@metaventionsai/voice-nexus/providers/stt';

const stt = createBrowserSTT();

// Start streaming transcription
await stt.startStreaming((partialText) => {
    console.log('Hearing:', partialText);
});

// Stop and get final text
const finalText = await stt.stopStreaming();
```

### Auto-detection

```typescript
import { createDefaultProviders } from '@metaventionsai/voice-nexus/providers';

const providers = createDefaultProviders();
// Returns { stt, reasoning, tts } based on available API keys
```

## API Reference

### createVoiceNexus(options)

```typescript
const nexus = createVoiceNexus({
    config: VoiceNexusConfig,
    events?: VoiceNexusEvents,
    tools?: VoiceToolCall[],
    knowledgeInjector?: KnowledgeInjector
});
```

### VoiceNexusConfig

```typescript
interface VoiceNexusConfig {
    mode: 'realtime' | 'turn-based' | 'hybrid';
    knowledgeInjection: boolean;
    agent?: {
        id: string;
        name: string;
        expertise?: string[];
    };
    providers?: {
        stt?: STTProvider;
        reasoning?: ReasoningProvider;
        tts?: TTSProvider;
    };
    complexity?: {
        balancedThreshold?: number;  // default: 0.3
        deepThreshold?: number;      // default: 0.7
    };
}
```

### VoiceNexusEvents

```typescript
interface VoiceNexusEvents {
    onTranscriptUpdate?: (transcript: Transcript) => void;
    onPartialTranscript?: (partial: PartialTranscript) => void;
    onProcessingStart?: () => void;
    onProcessingEnd?: () => void;
    onProviderSwitch?: (providers: { stt?: string; reasoning?: string; tts?: string }) => void;
    onComplexityAnalyzed?: (result: ComplexityResult) => void;
    onError?: (error: Error) => void;
    onKnowledgeInjected?: (context: KnowledgeContext) => void;
    onToolCall?: VoiceToolHandler;
    onStateChange?: (state: VoiceNexusState) => void;
}
```

### Provider Interfaces

```typescript
interface ReasoningProvider {
    readonly name: string;
    readonly models: { fast: string; balanced: string; deep: string };
    generate(prompt: string, config: ReasoningConfig): Promise<ReasoningResult>;
    isAvailable(): boolean;
}

interface TTSProvider {
    readonly name: string;
    readonly supportsStreaming: boolean;
    readonly voices: VoiceConfig[];
    synthesize(text: string, voice: string, settings?: TTSSettings): Promise<ArrayBuffer>;
    synthesizeStream?(text: string, voice: string, onChunk: (chunk: ArrayBuffer) => void): Promise<void>;
    getVoiceForAgent(agentName: string): string;
    isAvailable(): boolean;
}

interface STTProvider {
    readonly name: string;
    readonly supportsStreaming: boolean;
    transcribe(audio: Blob): Promise<string>;
    startStreaming?(onPartial: (text: string) => void): Promise<void>;
    stopStreaming?(): Promise<string>;
    isAvailable(): boolean;
}
```

## Complexity Routing

Voice Nexus analyzes queries and routes to appropriate tiers:

| Tier | Score Range | Use Case |
|------|-------------|----------|
| Fast | 0.0 - 0.3 | Simple questions, navigation |
| Balanced | 0.3 - 0.7 | Standard conversations |
| Deep | 0.7 - 1.0 | Complex reasoning, code |

**Signals analyzed:**
- Token count
- Code indicators (`function`, `class`, `import`)
- Reasoning words (`why`, `explain`, `compare`)
- Creative words (`write`, `create`, `design`)
- Navigation words (`go to`, `open`, `show`)
- Question indicators (`?`, `what`, `how`)
- Domain complexity

## Voice Modes

| Mode | Description |
|------|-------------|
| `turn-based` | User speaks, wait for complete response |
| `realtime` | Continuous back-and-forth |
| `hybrid` | Adaptive based on context |

## Custom Providers

```typescript
import type { ReasoningProvider, TTSProvider, STTProvider } from '@metaventionsai/voice-nexus';

const customReasoning: ReasoningProvider = {
    name: 'custom',
    models: { fast: 'model-a', balanced: 'model-b', deep: 'model-c' },
    isAvailable: () => true,
    async generate(prompt, config) {
        const result = await myLLM(prompt, config.tier);
        return { text: result, model: config.model || 'model-a' };
    }
};

const customTTS: TTSProvider = {
    name: 'custom-tts',
    supportsStreaming: false,
    voices: [{ id: 'v1', name: 'Voice 1', gender: 'neutral' }],
    isAvailable: () => true,
    getVoiceForAgent: () => 'v1',
    async synthesize(text, voice) {
        return await myTTSService(text, voice);
    }
};
```

## Environment Variables

| Variable | Provider | Required |
|----------|----------|----------|
| `ANTHROPIC_API_KEY` | Claude Reasoning | If using Claude |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini Reasoning | If using Gemini |
| `GEMINI_API_KEY` | Gemini Reasoning | Alternative |
| `ELEVENLABS_API_KEY` | ElevenLabs TTS | If using ElevenLabs |

## Examples

See the [examples/](./examples) directory:
- `basic-voice.ts` - Node.js usage with Gemini + ElevenLabs
- `browser-voice.html` - Browser demo with Web Speech API

## Browser Compatibility

| Provider | Chrome | Firefox | Safari | Edge |
|----------|--------|---------|--------|------|
| Browser STT | ✅ Full | ⚠️ Limited | ⚠️ Limited | ✅ Full |
| Browser TTS | ✅ | ✅ | ✅ | ✅ |
| ElevenLabs | ✅ | ✅ | ✅ | ✅ |

## License

MIT
