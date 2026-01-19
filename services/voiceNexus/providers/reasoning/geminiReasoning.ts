/**
 * VOICE NEXUS - Gemini Reasoning Provider
 *
 * Wraps geminiService for fast responses and grounded queries.
 * Optimal for navigation, quick facts, and real-time interactions.
 */

import type { ReasoningProvider, ReasoningConfig, ReasoningResult } from '../../types';
import { getAI, SOVEREIGN_SYSTEM_INSTRUCTION } from '../../../geminiService';
import { apiKeyService } from '../../../apiKeyService';

// Model mappings for each tier
const GEMINI_MODELS = {
    fast: 'gemini-2.0-flash-exp',
    balanced: 'gemini-1.5-pro',
    deep: 'gemini-1.5-pro',
} as const;

// Voice-optimized system prompt
const VOICE_SYSTEM_PROMPT = `You are an AI assistant in a voice conversation. Be concise, natural, and conversational.
Avoid bullet points and formatting - speak naturally as responses will be converted to speech.`;

class GeminiReasoningProvider implements ReasoningProvider {
    readonly name = 'gemini';
    readonly models = GEMINI_MODELS;

    /**
     * Check if Gemini API key is configured
     */
    isAvailable(): boolean {
        return !!apiKeyService.getKey('gemini');
    }

    /**
     * Generate a response using Gemini
     */
    async generate(prompt: string, config: ReasoningConfig): Promise<ReasoningResult> {
        if (!this.isAvailable()) {
            throw new Error('Gemini API key not configured');
        }

        const startTime = Date.now();

        // Select model based on tier or explicit override
        const modelName = config.model || this.models[config.tier];

        try {
            const ai = getAI();

            // Build system instruction
            const systemInstruction = config.systemPrompt
                ? `${VOICE_SYSTEM_PROMPT}\n\n${config.systemPrompt}`
                : VOICE_SYSTEM_PROMPT;

            // For voice, we use a simpler prompt without the full SOVEREIGN instruction
            // unless explicitly needed for complex tasks
            const useFullInstruction = config.tier === 'deep';

            const model = ai.models.generateContent({
                model: modelName,
                contents: prompt,
                config: {
                    systemInstruction: useFullInstruction
                        ? SOVEREIGN_SYSTEM_INSTRUCTION + '\n\n' + systemInstruction
                        : systemInstruction,
                    maxOutputTokens: config.maxTokens || 1024,
                    temperature: config.temperature ?? 0.7,
                },
            });

            const response = await model;
            const text = response.text || '';

            const latencyMs = Date.now() - startTime;

            return {
                text,
                model: modelName,
                latencyMs,
                inputTokens: response.usageMetadata?.promptTokenCount,
                outputTokens: response.usageMetadata?.candidatesTokenCount,
            };
        } catch (error) {
            console.error('Gemini reasoning failed:', error);
            throw error;
        }
    }

    /**
     * Generate with Google Search grounding enabled
     */
    async generateWithGrounding(prompt: string, config: ReasoningConfig): Promise<ReasoningResult> {
        if (!this.isAvailable()) {
            throw new Error('Gemini API key not configured');
        }

        const startTime = Date.now();
        const modelName = config.model || this.models[config.tier];

        try {
            const ai = getAI();

            const response = await ai.models.generateContent({
                model: modelName,
                contents: prompt,
                config: {
                    systemInstruction: config.systemPrompt || VOICE_SYSTEM_PROMPT,
                    maxOutputTokens: config.maxTokens || 1024,
                    temperature: config.temperature ?? 0.7,
                    tools: [{ googleSearch: {} }],
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
        } catch (error) {
            console.error('Gemini grounded generation failed:', error);
            throw error;
        }
    }

    /**
     * Get the appropriate model for a tier
     */
    getModelForTier(tier: 'fast' | 'balanced' | 'deep'): string {
        return this.models[tier];
    }
}

// Singleton export
export const geminiReasoning = new GeminiReasoningProvider();
