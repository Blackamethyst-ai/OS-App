import { defineConfig } from 'tsup';

export default defineConfig({
    entry: {
        index: 'index.ts',
        types: 'types.ts',
        router: 'router.ts',
        'providers/index': 'providers/index.ts',
        'providers/reasoning/index': 'providers/reasoning/index.ts',
        'providers/reasoning/anthropic': 'providers/reasoning/anthropic.ts',
        'providers/reasoning/google': 'providers/reasoning/google.ts',
        'providers/tts/index': 'providers/tts/index.ts',
        'providers/tts/elevenlabs': 'providers/tts/elevenlabs.ts',
        'providers/tts/browser': 'providers/tts/browser.ts',
        'providers/stt/index': 'providers/stt/index.ts',
        'providers/stt/browser': 'providers/stt/browser.ts',
        'providers/stt/deepgram': 'providers/stt/deepgram.ts',
        'providers/vad/index': 'providers/vad/index.ts',
        'providers/vad/silero': 'providers/vad/silero.ts',
        'audio/index': 'audio/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: true,
    external: [
        '@anthropic-ai/sdk',
        '@google/genai',
        '@ricky0123/vad-web',
    ],
});
