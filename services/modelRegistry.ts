/**
 * MODEL REGISTRY — Single source of truth for all AI model IDs.
 * Update here when models are deprecated or new ones release.
 */

export const MODEL_REGISTRY = {
    gemini: {
        fast: 'gemini-2.5-flash',
        deep: 'gemini-2.5-pro',
        live: 'gemini-2.5-flash-preview-native-audio-dialog',
    },
    claude: {
        fast: 'claude-haiku-4-5-20251001',
        standard: 'claude-sonnet-4-6',
        deep: 'claude-opus-4-6',
    },
    grok: {
        fast: 'grok-3-mini',
        standard: 'grok-3',
    },
} as const;

export type GeminiModel = typeof MODEL_REGISTRY.gemini[keyof typeof MODEL_REGISTRY.gemini];
export type ClaudeModel = typeof MODEL_REGISTRY.claude[keyof typeof MODEL_REGISTRY.claude];
export type GrokModel = typeof MODEL_REGISTRY.grok[keyof typeof MODEL_REGISTRY.grok];
