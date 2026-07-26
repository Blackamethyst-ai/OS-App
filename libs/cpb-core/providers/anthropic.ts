/**
 * Claude (Anthropic) Provider for CPB
 *
 * Provides deep reasoning capabilities through Claude models.
 * Optimal for architecture decisions, code generation, and complex analysis.
 *
 * @example
 * ```typescript
 * import { createClaudeProvider } from '@metaventionsai/cpb-core/providers/anthropic';
 *
 * // Uses ANTHROPIC_API_KEY from environment
 * const claude = createClaudeProvider();
 *
 * // Or provide key explicitly
 * const claude = createClaudeProvider({ apiKey: 'sk-...' });
 *
 * const cpb = createCPB({
 *     deep: claude
 * });
 * ```
 */

import type { CPBProvider, GenerateOptions, ImageInput } from '../types';

export interface ClaudeProviderOptions {
    /** API key - defaults to ANTHROPIC_API_KEY env var */
    apiKey?: string;
    /** Default model to use */
    defaultModel?: string;
    /** Base URL for API (for proxies) */
    baseURL?: string;
}

/** Model mappings for each tier */
export const CLAUDE_MODELS = {
    fast: 'claude-haiku-4-5-20251001',
    balanced: 'claude-sonnet-5',
    deep: 'claude-sonnet-5', // Sonnet for deep; use opus for most complex
} as const;

/**
 * Create a Claude provider for CPB
 *
 * Requires @anthropic-ai/sdk peer dependency:
 * ```bash
 * npm install @anthropic-ai/sdk
 * ```
 */
export function createClaudeProvider(options?: ClaudeProviderOptions): CPBProvider {
    const apiKey = options?.apiKey || import.meta.env.VITE_ANTHROPIC_API_KEY;
    const defaultModel = options?.defaultModel || CLAUDE_MODELS.balanced;
    const baseURL = options?.baseURL;

    return {
        name: 'claude',

        isConfigured(): boolean {
            return !!apiKey;
        },

        async generate(prompt: string, opts?: GenerateOptions): Promise<string> {
            if (!apiKey) {
                throw new Error(
                    'Claude API key not configured. ' +
                    'Set ANTHROPIC_API_KEY environment variable or pass apiKey option.'
                );
            }

            // Dynamic import to avoid requiring SDK at load time
            // @ts-ignore - SDK is a peer dependency
            const { default: Anthropic } = await import('@anthropic-ai/sdk');

            const client = new Anthropic({
                apiKey,
                ...(baseURL && { baseURL }),
            });

            const model = opts?.model || defaultModel;
            const messages: { role: 'user' | 'assistant'; content: string }[] = [
                { role: 'user', content: prompt }
            ];

            const response = await client.messages.create({
                model,
                max_tokens: opts?.maxTokens || 4096,
                ...(opts?.temperature !== undefined && { temperature: opts.temperature }),
                ...(opts?.systemPrompt && { system: opts.systemPrompt }),
                messages,
            });

            // Extract text from response
            const textBlock = response.content.find((block: any) => block.type === 'text');
            if (!textBlock || textBlock.type !== 'text') {
                throw new Error('No text response from Claude');
            }

            return textBlock.text;
        },

        async generateWithVision(
            prompt: string,
            images: ImageInput[],
            opts?: GenerateOptions
        ): Promise<string> {
            if (!apiKey) {
                throw new Error(
                    'Claude API key not configured. ' +
                    'Set ANTHROPIC_API_KEY environment variable or pass apiKey option.'
                );
            }

            // @ts-ignore - SDK is a peer dependency
            const { default: Anthropic } = await import('@anthropic-ai/sdk');

            const client = new Anthropic({
                apiKey,
                ...(baseURL && { baseURL }),
            });

            const model = opts?.model || defaultModel;

            // Build content array with images
            type ContentBlock =
                | { type: 'text'; text: string }
                | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

            const content: ContentBlock[] = [];

            // Add images first
            for (const img of images) {
                content.push({
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: img.mediaType ?? '',
                        data: img.base64 ?? '',
                    },
                });
            }

            // Add text prompt
            content.push({
                type: 'text',
                text: prompt,
            });

            const response = await client.messages.create({
                model,
                max_tokens: opts?.maxTokens || 4096,
                ...(opts?.temperature !== undefined && { temperature: opts.temperature }),
                ...(opts?.systemPrompt && { system: opts.systemPrompt }),
                messages: [{ role: 'user', content }],
            });

            const textBlock = response.content.find((block: any) => block.type === 'text');
            if (!textBlock || textBlock.type !== 'text') {
                throw new Error('No text response from Claude');
            }

            return textBlock.text;
        },
    };
}

/**
 * Get a Claude model by tier
 */
export function getClaudeModel(tier: 'fast' | 'balanced' | 'deep'): string {
    return CLAUDE_MODELS[tier];
}

// Default export for convenience
export default createClaudeProvider;
