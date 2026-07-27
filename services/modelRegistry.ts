/**
 * MODEL REGISTRY — Single source of truth for all AI model IDs.
 * Update here when models are deprecated or new ones release.
 */

export const MODEL_REGISTRY = {
    deepseek: {
        fast: 'deepseek-v4-flash',
        standard: 'DeepSeekMetaventionsAI',
        deep: 'DeepSeekMetaventionsAI',
    },
    gemini: {
        fast: 'gemini-2.5-flash',
        deep: 'gemini-2.5-pro',
        live: 'gemini-2.5-flash-preview-native-audio-dialog',
        image: 'gemini-2.5-flash-image',
    },
    claude: {
        fast: 'claude-haiku-4-5-20251001',
        standard: 'claude-sonnet-5',
        deep: 'claude-opus-5',
    },
    grok: {
        fast: 'grok-3-mini',
        standard: 'grok-3',
    },
    openai: {
        fast: 'gpt-4o-mini',
        standard: 'gpt-4o',
        // o-series reasoning models. Kept as their own tiers rather than
        // folded into deep/standard because callers pick them for the
        // reasoning behaviour specifically, not for being "the big one".
        reasoning: 'o1',
        reasoningFast: 'o3-mini',
    },
} as const;

export type DeepSeekModel = typeof MODEL_REGISTRY.deepseek[keyof typeof MODEL_REGISTRY.deepseek];
export type GeminiModel = typeof MODEL_REGISTRY.gemini[keyof typeof MODEL_REGISTRY.gemini];
export type ClaudeModel = typeof MODEL_REGISTRY.claude[keyof typeof MODEL_REGISTRY.claude];
export type GrokModel = typeof MODEL_REGISTRY.grok[keyof typeof MODEL_REGISTRY.grok];
export type OpenAIModel = typeof MODEL_REGISTRY.openai[keyof typeof MODEL_REGISTRY.openai];
