/**
 * Grok (xAI) Provider for CPB
 *
 * Provides access to xAI's Grok model for balanced reasoning.
 * Uses OpenAI-compatible API format.
 *
 * @example
 * ```typescript
 * import { createGrokProvider } from '@metaventionsai/cpb-core/providers/grok';
 *
 * // Uses XAI_API_KEY from environment
 * const grok = createGrokProvider();
 *
 * // Or provide key explicitly
 * const grok = createGrokProvider({ apiKey: 'xai-...' });
 *
 * const cpb = createCPB({
 *     balanced: grok
 * });
 * ```
 */

import type { CPBProvider, GenerateOptions, ImageInput } from '../types';

export interface GrokProviderOptions {
    /** API key - defaults to XAI_API_KEY env var */
    apiKey?: string;
    /** Default model to use */
    defaultModel?: string;
    /** Base URL for API */
    baseURL?: string;
}

/** Model mappings for each tier */
export const GROK_MODELS = {
    fast: 'grok-beta',
    balanced: 'grok-beta',
    deep: 'grok-beta',
} as const;

const DEFAULT_BASE_URL = 'https://api.x.ai/v1';

/**
 * Create a Grok provider for CPB
 *
 * Requires openai peer dependency (uses OpenAI-compatible API):
 * ```bash
 * npm install openai
 * ```
 */
export function createGrokProvider(options?: GrokProviderOptions): CPBProvider {
    const apiKey = options?.apiKey || process.env.XAI_API_KEY;
    const defaultModel = options?.defaultModel || GROK_MODELS.balanced;
    const baseURL = options?.baseURL || DEFAULT_BASE_URL;

    return {
        name: 'grok',

        isConfigured(): boolean {
            return !!apiKey;
        },

        async generate(prompt: string, opts?: GenerateOptions): Promise<string> {
            if (!apiKey) {
                throw new Error(
                    'Grok API key not configured. ' +
                    'Set XAI_API_KEY environment variable or pass apiKey option.'
                );
            }

            // Dynamic import to avoid requiring SDK at load time
            // @ts-ignore - SDK is a peer dependency
            const { default: OpenAI } = await import('openai');

            const client = new OpenAI({
                apiKey,
                baseURL,
            });

            const model = opts?.model || defaultModel;

            // Build messages array
            const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

            if (opts?.systemPrompt) {
                messages.push({ role: 'system', content: opts.systemPrompt });
            }

            messages.push({ role: 'user', content: prompt });

            const response = await client.chat.completions.create({
                model,
                messages,
                max_tokens: opts?.maxTokens || 4096,
                temperature: opts?.temperature ?? 0.7,
            });

            return response.choices[0]?.message?.content || '';
        },

        async generateWithVision(
            prompt: string,
            images: ImageInput[],
            opts?: GenerateOptions
        ): Promise<string> {
            if (!apiKey) {
                throw new Error(
                    'Grok API key not configured. ' +
                    'Set XAI_API_KEY environment variable or pass apiKey option.'
                );
            }

            // @ts-ignore - SDK is a peer dependency
            const { default: OpenAI } = await import('openai');

            const client = new OpenAI({
                apiKey,
                baseURL,
            });

            const model = opts?.model || defaultModel;

            // Build content array with images
            const content: Array<
                | { type: 'text'; text: string }
                | { type: 'image_url'; image_url: { url: string } }
            > = [];

            // Add images as base64 data URLs
            for (const img of images) {
                content.push({
                    type: 'image_url',
                    image_url: {
                        url: `data:${img.mediaType};base64,${img.base64}`,
                    },
                });
            }

            // Add text prompt
            content.push({ type: 'text', text: prompt });

            const messages: Array<{
                role: 'system' | 'user' | 'assistant';
                content: string | typeof content;
            }> = [];

            if (opts?.systemPrompt) {
                messages.push({ role: 'system', content: opts.systemPrompt });
            }

            messages.push({ role: 'user', content });

            const response = await client.chat.completions.create({
                model,
                messages,
                max_tokens: opts?.maxTokens || 4096,
                temperature: opts?.temperature ?? 0.7,
            });

            return response.choices[0]?.message?.content || '';
        },
    };
}

/**
 * Get a Grok model by tier
 */
export function getGrokModel(tier: 'fast' | 'balanced' | 'deep'): string {
    return GROK_MODELS[tier];
}

// Default export for convenience
export default createGrokProvider;
