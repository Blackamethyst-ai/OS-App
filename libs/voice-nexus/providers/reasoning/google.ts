/**
 * Gemini (Google) Reasoning Provider for Voice Nexus
 *
 * Provides fast responses and grounded queries for voice interactions.
 * Optimal for navigation, quick facts, and real-time interactions.
 *
 * @example
 * ```typescript
 * import { createGeminiReasoning } from '@metaventionsai/voice-nexus/providers/reasoning/google';
 *
 * const gemini = createGeminiReasoning();
 *
 * const nexus = createVoiceNexus({
 *     config: {
 *         mode: 'turn-based',
 *         knowledgeInjection: false,
 *         providers: {
 *             reasoning: gemini
 *         }
 *     }
 * });
 * ```
 */

import type { ReasoningProvider, ReasoningConfig, ReasoningResult } from '../../types';

export interface GeminiReasoningOptions {
    /** API key - defaults to GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY env var */
    apiKey?: string;
    /** Custom model mappings */
    models?: { fast?: string; balanced?: string; deep?: string };
    /** Enable Google Search grounding for deep tier */
    enableGrounding?: boolean;
}

/** Default model mappings for each tier */
export const GEMINI_REASONING_MODELS = {
    fast: 'gemini-2.0-flash-exp',
    balanced: 'gemini-1.5-pro',
    deep: 'gemini-1.5-pro',
} as const;

/** Voice-optimized system prompt */
const VOICE_SYSTEM_PROMPT = `You are an AI assistant in a voice conversation. Be concise, natural, and conversational.
Avoid bullet points and formatting - speak naturally as responses will be converted to speech.`;

/**
 * Create a Gemini reasoning provider for Voice Nexus
 *
 * Requires @google/genai peer dependency:
 * ```bash
 * npm install @google/genai
 * ```
 */
export function createGeminiReasoning(options?: GeminiReasoningOptions): ReasoningProvider {
    const apiKey = options?.apiKey ||
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
        process.env.GEMINI_API_KEY;
    const models = {
        ...GEMINI_REASONING_MODELS,
        ...options?.models,
    };
    const enableGrounding = options?.enableGrounding ?? false;

    return {
        name: 'gemini',
        models,

        isAvailable(): boolean {
            return !!apiKey;
        },

        async generate(prompt: string, config: ReasoningConfig): Promise<ReasoningResult> {
            if (!apiKey) {
                throw new Error(
                    'Gemini API key not configured. ' +
                    'Set GOOGLE_GENERATIVE_AI_API_KEY environment variable or pass apiKey option.'
                );
            }

            const startTime = Date.now();

            // Dynamic import to avoid requiring SDK at load time
            const { GoogleGenAI } = await import('@google/genai');

            const ai = new GoogleGenAI({ apiKey });

            // Select model based on tier or explicit override
            const modelName = config.model || models[config.tier];

            // Build system instruction
            const systemInstruction = config.systemPrompt
                ? `${VOICE_SYSTEM_PROMPT}\n\n${config.systemPrompt}`
                : VOICE_SYSTEM_PROMPT;

            // Use grounding for deep tier if enabled
            const useGrounding = enableGrounding && config.tier === 'deep';

            const response = await ai.models.generateContent({
                model: modelName,
                contents: prompt,
                config: {
                    systemInstruction,
                    maxOutputTokens: config.maxTokens || 1024,
                    temperature: config.temperature ?? 0.7,
                    ...(useGrounding && { tools: [{ googleSearch: {} }] }),
                },
            });

            const text = response.text || '';
            const latencyMs = Date.now() - startTime;

            return {
                text,
                model: modelName,
                latencyMs,
                inputTokens: response.usageMetadata?.promptTokenCount,
                outputTokens: response.usageMetadata?.candidatesTokenCount,
            };
        },
    };
}

/**
 * Create a Gemini reasoning provider with Google Search grounding always enabled
 */
export function createGroundedGeminiReasoning(options?: Omit<GeminiReasoningOptions, 'enableGrounding'>): ReasoningProvider {
    return createGeminiReasoning({ ...options, enableGrounding: true });
}

// Default export for convenience
export default createGeminiReasoning;
