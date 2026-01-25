/**
 * VOICE NEXUS - Claude Reasoning Provider
 *
 * Wraps claudeService for deep reasoning tasks.
 * Optimal for architecture, code generation, and complex analysis.
 */

import type { ReasoningProvider, ReasoningConfig, ReasoningResult } from '../../types';
import { claudeService } from '../../../claudeService';
import { apiKeyService } from '../../../apiKeyService';

// Model mappings for each tier
const CLAUDE_MODELS = {
    fast: 'claude-3-5-haiku-20241022',
    balanced: 'claude-3-5-sonnet-20241022', // The New SOTA 3.5 Sonnet
    deep: 'claude-3-opus-20240229',      // Legacy SOTA Opus (good for creative writing)
} as const;

// System prompt for voice interactions
const VOICE_SYSTEM_PROMPT = `You are an AI assistant engaged in a voice conversation. Keep your responses:
- Concise and conversational (this will be spoken aloud)
- Natural and flowing (avoid bullet points, numbered lists, or formatting)
- Direct and helpful (answer first, then elaborate if needed)

You have access to the user's research context and knowledge base when provided.
Acknowledge when you're using injected knowledge to answer questions.`;

class ClaudeReasoningProvider implements ReasoningProvider {
    readonly name = 'claude';
    readonly models = CLAUDE_MODELS;

    /**
     * Check if Claude API key is configured
     */
    isAvailable(): boolean {
        return claudeService.isConfigured();
    }

    /**
     * Generate a response using Claude
     */
    async generate(prompt: string, config: ReasoningConfig): Promise<ReasoningResult> {
        if (!this.isAvailable()) {
            throw new Error('Claude API key not configured');
        }

        const startTime = Date.now();

        // Select model based on tier or explicit override
        const model = config.model || this.models[config.tier];

        // Build system prompt
        const systemPrompt = config.systemPrompt
            ? `${VOICE_SYSTEM_PROMPT}\n\n${config.systemPrompt}`
            : VOICE_SYSTEM_PROMPT;

        try {
            const response = await claudeService.generateContent(
                [{ role: 'user', content: prompt }],
                systemPrompt,
                model
            );

            const latencyMs = Date.now() - startTime;

            return {
                text: response,
                model,
                latencyMs,
                // Note: claudeService doesn't expose token counts in current implementation
                // Would need to modify claudeService to return full response for this
            };
        } catch (error) {
            console.error('Claude reasoning failed:', error);
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
export const claudeReasoning = new ClaudeReasoningProvider();
