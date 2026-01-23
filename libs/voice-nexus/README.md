# @metaventionsai/voice-nexus

Universal multi-provider voice architecture - seamless routing between STT, reasoning, and TTS providers.

## Quick Start

```bash
npm install @metaventionsai/voice-nexus

# Install SDKs for your provider(s)
npm install @anthropic-ai/sdk  # for Claude reasoning
npm install @google/genai      # for Gemini reasoning
```

Set your API keys:
```bash
export ANTHROPIC_API_KEY=sk-...
export GOOGLE_GENERATIVE_AI_API_KEY=AIza...
export ELEVENLABS_API_KEY=...
```

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
        onTranscriptUpdate: (t) => console.log(`[${t.role}] ${t.text}`),
        onComplexityAnalyzed: (c) => console.log(`Complexity: ${c.score.toFixed(2)}`)
    }
});

// Process text input
const response = await nexus.processTextInput('How do I implement authentication?');
console.log(response?.text);
```

## Features

- **Multi-provider**: Works with any combination of STT, reasoning, and TTS providers
- **Complexity routing**: Automatically selects fast/balanced/deep tier based on query complexity
- **Knowledge injection**: Optional integration with external knowledge bases
- **Browser support**: Built-in Web Speech API providers for zero-dependency voice

## Providers

### Reasoning

```typescript
import { createGeminiReasoning, createClaudeReasoning } from '@metaventionsai/voice-nexus/providers/reasoning';

// Fast responses with Gemini
const gemini = createGeminiReasoning();

// Deep reasoning with Claude
const claude = createClaudeReasoning();

// With Google Search grounding
const grounded = createGroundedGeminiReasoning();
```

### Text-to-Speech (TTS)

```typescript
import { createElevenLabsTTS, createBrowserTTS } from '@metaventionsai/voice-nexus/providers/tts';

// Premium quality with ElevenLabs
const elevenLabs = createElevenLabsTTS();

// Free fallback with browser Web Speech API
const browser = createBrowserTTS();
```

### Speech-to-Text (STT)

```typescript
import { createBrowserSTT } from '@metaventionsai/voice-nexus/providers/stt';

// Browser Web Speech API (Chrome has best support)
const stt = createBrowserSTT();

// Start streaming
await stt.startStreaming((text) => {
    console.log('Partial:', text);
});

// Stop and get final text
const final = await stt.stopStreaming();
```

### Auto-detection

```typescript
import { createDefaultProviders } from '@metaventionsai/voice-nexus/providers';

// Creates providers based on available API keys
const providers = createDefaultProviders();
const nexus = createVoiceNexus({
    config: { mode: 'turn-based', knowledgeInjection: false, providers }
});
```

## Voice Modes

| Mode | Description |
|------|-------------|
| `turn-based` | User speaks, model responds (like a conversation) |
| `realtime` | Continuous back-and-forth (more interactive) |
| `hybrid` | Adaptive based on context |

## Complexity Routing

Voice Nexus automatically analyzes query complexity and routes to the appropriate tier:

- **Fast tier**: Simple questions, navigation commands
- **Balanced tier**: Standard conversations, moderate analysis
- **Deep tier**: Complex reasoning, code generation, architecture

```typescript
const nexus = createVoiceNexus({
    config: {
        mode: 'turn-based',
        knowledgeInjection: false,
        complexity: {
            balancedThreshold: 0.3,  // Score above this uses balanced
            deepThreshold: 0.7       // Score above this uses deep
        }
    }
});
```

## ElevenLabs Voice Configuration

```typescript
import { createElevenLabsTTS, ELEVENLABS_VOICE_IDS } from '@metaventionsai/voice-nexus/providers/tts';

const tts = createElevenLabsTTS({
    apiKey: 'your-key',  // or use ELEVENLABS_API_KEY env var
    modelId: 'eleven_turbo_v2_5',
    agentVoiceMap: {
        'assistant': ELEVENLABS_VOICE_IDS.MIKE,
        'narrator': ELEVENLABS_VOICE_IDS.DR_IRA,
    }
});
```

Available voices:
- `DR_IRA` - Deep, authoritative (male)
- `MIKE` - Narrative, American (male)
- `CALEB` - News anchor, professional (male)
- `PARAMDEEP` - Casual, conversational (male)
- `BILAL` - Energetic, gaming (male)
- `PERRI` - Clear, American (female)
- `HELEN` - Strong, expressive (female)
- `NOAH` - Gentle, narrative (female)

## Custom Providers

```typescript
import type { ReasoningProvider, TTSProvider, STTProvider } from '@metaventionsai/voice-nexus';

const customReasoning: ReasoningProvider = {
    name: 'custom',
    models: { fast: 'model-a', balanced: 'model-b', deep: 'model-c' },
    isAvailable: () => true,
    async generate(prompt, config) {
        // Your LLM call
        return { text: response, model: config.model || 'model-a' };
    }
};

const customTTS: TTSProvider = {
    name: 'custom',
    supportsStreaming: false,
    voices: [{ id: 'default', name: 'Default', gender: 'neutral' }],
    isAvailable: () => true,
    getVoiceForAgent: (agent) => 'default',
    async synthesize(text, voice) {
        // Your TTS call
        return audioBuffer;
    }
};
```

## Events

```typescript
const nexus = createVoiceNexus({
    config: { /* ... */ },
    events: {
        onTranscriptUpdate: (transcript) => { /* new message */ },
        onPartialTranscript: (partial) => { /* streaming update */ },
        onProcessingStart: () => { /* thinking started */ },
        onProcessingEnd: () => { /* thinking complete */ },
        onProviderSwitch: ({ reasoning, tts }) => { /* tier changed */ },
        onComplexityAnalyzed: (result) => { /* complexity scored */ },
        onError: (error) => { /* error occurred */ },
        onKnowledgeInjected: (context) => { /* knowledge used */ },
        onToolCall: async (name, args) => { /* tool called */ }
    }
});
```

## License

MIT
