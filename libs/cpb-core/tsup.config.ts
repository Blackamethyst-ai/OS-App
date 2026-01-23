import { defineConfig } from 'tsup';

export default defineConfig({
    entry: {
        index: 'index.ts',
        router: 'router.ts',
        types: 'types.ts',
        'providers/index': 'providers/index.ts',
        'providers/anthropic': 'providers/anthropic.ts',
        'providers/google': 'providers/google.ts',
        'providers/grok': 'providers/grok.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: true,
    external: [
        '@anthropic-ai/sdk',
        '@google/genai',
        'openai',
    ],
});
