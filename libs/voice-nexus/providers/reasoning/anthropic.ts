/**
 * Claude (Anthropic) Reasoning Provider for Voice Nexus
 *
 * Provides deep reasoning capabilities for voice interactions.
 * Optimal for architecture discussions, code generation, and complex analysis.
 *
 * @example
 * ```typescript
 * import { createClaudeReasoning } from '@metaventionsai/voice-nexus/providers/reasoning/anthropic';
 *
 * const claude = createClaudeReasoning();
 *
 * const nexus = createVoiceNexus({
 *     config: {
 *         mode: 'turn-based',
 *         knowledgeInjection: false,
 *         providers: {
 *             reasoning: claude
 *         }
 *     }
 * });
 * ```
 */

import type { ReasoningProvider, ReasoningConfig, ReasoningResult } from '../../types';

export interface ClaudeReasoningOptions {
    /** API key - defaults to ANTHROPIC_API_KEY env var */
    apiKey?: string;
    /** Custom model mappings */
    models?: { fast?: string; balanced?: string; deep?: string };
    /** Base URL for API (for proxies) */
    baseURL?: string;
}

/** Default model mappings for each tier */
export const CLAUDE_REASONING_MODELS = {
    fast: 'claude-3-5-haiku-20241022',
    balanced: 'claude-sonnet-4-20250514',
    deep: 'claude-sonnet-4-20250514', // Use Sonnet for deep; Opus when needed
} as const;

/** Voice-optimized system prompt */
const VOICE_SYSTEM_PROMPT = `You are an AI assistant engaged in a voice conversation. Keep your responses:
- Concise and conversational (this will be spoken aloud)
- Natural and flowing (avoid bullet points, numbered lists, or formatting)
- Direct and helpful (answer first, then elaborate if needed)

You have access to the user's research context and knowledge base when provided.
Acknowledge when you're using injected knowledge to answer questions.`;

/**
 * Create a Claude reasoning provider for Voice Nexus
 *
 * Requires @anthropic-ai/sdk peer dependency:
 * ```bash
 * npm install @anthropic-ai/sdk
 * ```
 */
export function createClaudeReasoning(options?: ClaudeReasoningOptions): ReasoningProvider {
    const apiKey = options?.apiKey || process.env.ANTHROPIC_API_KEY;
    const models = {
        ...CLAUDE_REASONING_MODELS,
        ...options?.models,
    };
    const baseURL = options?.baseURL;

    return {
        name: 'claude',
        models,

        isAvailable(): boolean {
            return !!apiKey;
        },

        async generate(prompt: string, config: ReasoningConfig): Promise<ReasoningResult> {
            if (!apiKey) {
                throw new Error(
                    'Claude API key not configured. ' +
                    'Set ANTHROPIC_API_KEY environment variable or pass apiKey option.'
                );
            }

            const startTime = Date.now();

            // Dynamic import to avoid requiring SDK at load time
            // @ts-ignore - SDK is a peer dependency
            const { default: Anthropic } = await import('@anthropic-ai/sdk');

            const client = new Anthropic({
                apiKey,
                ...(baseURL && { baseURL }),
            });

            // Select model based on tier or explicit override
            const model = config.model || models[config.tier];

            // Build system prompt
            const systemPrompt = config.systemPrompt
                ? `${VOICE_SYSTEM_PROMPT}\n\n${config.systemPrompt}`
                : VOICE_SYSTEM_PROMPT;

            const response = await client.messages.create({
                model,
                max_tokens: config.maxTokens || 1024,
                ...(config.temperature !== undefined && { temperature: config.temperature }),
                system: systemPrompt,
                messages: [{ role: 'user', content: prompt }],
            });

            const latencyMs = Date.now() - startTime;

            // Extract text from response
            const textBlock = response.content.find(block => block.type === 'text');
            if (!textBlock || textBlock.type !== 'text') {
                throw new Error('No text response from Claude');
            }

            return {
                text: textBlock.text,
                model,
                latencyMs,
                inputTokens: response.usage?.input_tokens,
                outputTokens: response.usage?.output_tokens,
            };
        },
    };
}

// Default export for convenience
export default createClaudeReasoning;
