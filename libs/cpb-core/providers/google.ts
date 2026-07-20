/**
 * Gemini (Google) Provider for CPB
 *
 * Provides fast and balanced reasoning through Gemini models.
 * Optimal for quick queries, grounded search, and general reasoning.
 *
 * @example
 * ```typescript
 * import { createGeminiProvider } from '@metaventionsai/cpb-core/providers/google';
 *
 * // Uses GOOGLE_GENERATIVE_AI_API_KEY from environment
 * const gemini = createGeminiProvider();
 *
 * // Or provide key explicitly
 * const gemini = createGeminiProvider({ apiKey: 'AIza...' });
 *
 * const cpb = createCPB({
 *     fast: gemini,
 *     balanced: gemini
 * });
 * ```
 */

import type { CPBProvider, GenerateOptions, ImageInput } from '../types';

export interface GeminiProviderOptions {
    /** API key - defaults to GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY env var */
    apiKey?: string;
    /** Default model to use */
    defaultModel?: string;
}

/** Model mappings for each tier */
export const GEMINI_MODELS = {
    fast: 'gemini-2.5-flash-preview-05-20',
    balanced: 'gemini-2.5-flash',
    deep: 'gemini-2.5-flash',
} as const;

/**
 * Create a Gemini provider for CPB
 *
 * Requires @google/genai peer dependency:
 * ```bash
 * npm install @google/genai
 * ```
 */
export function createGeminiProvider(options?: GeminiProviderOptions): CPBProvider {
    // BYO-key only: the caller supplies the key. No VITE_ env fallback — Vite inlines
    // those into the public bundle, which published an operator key and got the GCP
    // project suspended (INC-2026-07-20-01).
    const apiKey = options?.apiKey;
    const defaultModel = options?.defaultModel || GEMINI_MODELS.fast;

    return {
        name: 'gemini',

        isConfigured(): boolean {
            return !!apiKey;
        },

        async generate(prompt: string, opts?: GenerateOptions): Promise<string> {
            if (!apiKey) {
                throw new Error(
                    'Gemini API key not configured. ' +
                    'Set GOOGLE_GENERATIVE_AI_API_KEY environment variable or pass apiKey option.'
                );
            }

            // Dynamic import to avoid requiring SDK at load time
            // @ts-ignore - SDK is a peer dependency
            const { GoogleGenAI } = await import('@google/genai');

            const ai = new GoogleGenAI({ apiKey });
            const model = opts?.model || defaultModel;

            // Build system instruction
            const systemInstruction = opts?.systemPrompt;

            const response = await ai.models.generateContent({
                model,
                contents: prompt,
                config: {
                    ...(systemInstruction && { systemInstruction }),
                    maxOutputTokens: opts?.maxTokens || 4096,
                    temperature: opts?.temperature ?? 0.7,
                },
            });

            return response.text || '';
        },

        async generateWithVision(
            prompt: string,
            images: ImageInput[],
            opts?: GenerateOptions
        ): Promise<string> {
            if (!apiKey) {
                throw new Error(
                    'Gemini API key not configured. ' +
                    'Set GOOGLE_GENERATIVE_AI_API_KEY environment variable or pass apiKey option.'
                );
            }

            // @ts-ignore - SDK is a peer dependency
            const { GoogleGenAI } = await import('@google/genai');

            const ai = new GoogleGenAI({ apiKey });
            const model = opts?.model || defaultModel;

            // Build content parts with images
            const contents: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

            // Add images
            for (const img of images) {
                contents.push({
                    inlineData: {
                        mimeType: img.mediaType ?? '',
                        data: img.base64 ?? '',
                    },
                });
            }

            // Add text prompt
            contents.push({ text: prompt });

            const response = await ai.models.generateContent({
                model,
                contents,
                config: {
                    ...(opts?.systemPrompt && { systemInstruction: opts.systemPrompt }),
                    maxOutputTokens: opts?.maxTokens || 4096,
                    temperature: opts?.temperature ?? 0.7,
                },
            });

            return response.text || '';
        },
    };
}

/**
 * Create a Gemini provider with Google Search grounding enabled
 */
export function createGroundedGeminiProvider(options?: GeminiProviderOptions): CPBProvider {
    const baseProvider = createGeminiProvider(options);
    // BYO-key only: the caller supplies the key. No VITE_ env fallback — Vite inlines
    // those into the public bundle, which published an operator key and got the GCP
    // project suspended (INC-2026-07-20-01).
    const apiKey = options?.apiKey;

    return {
        ...baseProvider,
        name: 'gemini-grounded',

        async generate(prompt: string, opts?: GenerateOptions): Promise<string> {
            if (!apiKey) {
                throw new Error('Gemini API key not configured.');
            }

            // @ts-ignore - SDK is a peer dependency
            const { GoogleGenAI } = await import('@google/genai');

            const ai = new GoogleGenAI({ apiKey });
            const model = opts?.model || GEMINI_MODELS.fast;

            const response = await ai.models.generateContent({
                model,
                contents: prompt,
                config: {
                    ...(opts?.systemPrompt && { systemInstruction: opts.systemPrompt }),
                    maxOutputTokens: opts?.maxTokens || 4096,
                    temperature: opts?.temperature ?? 0.7,
                    tools: [{ googleSearch: {} }],
                },
            });

            return response.text || '';
        },
    };
}

/**
 * Get a Gemini model by tier
 */
export function getGeminiModel(tier: 'fast' | 'balanced' | 'deep'): string {
    return GEMINI_MODELS[tier];
}

// Default export for convenience
export default createGeminiProvider;
