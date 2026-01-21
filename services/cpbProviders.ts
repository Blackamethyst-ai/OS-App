/**
 * CPB Provider Adapters
 *
 * Wraps existing LLM services (Gemini, Claude) to conform to the
 * @metaventionsai/cpb-core CPBProvider interface.
 */

import type { CPBProvider, GenerateOptions, ImageInput } from '@metaventionsai/cpb-core';
import { generateText } from './geminiService';
import { claudeService, type ClaudeContentBlock } from './claudeService';
import { apiKeyService } from './apiKeyService';

/**
 * Gemini Provider - Fast path (Flash) and balanced (Pro)
 */
export const geminiProvider: CPBProvider = {
    name: 'gemini',

    isConfigured(): boolean {
        return !!apiKeyService.getKey('gemini');
    },

    async generate(prompt: string, options?: GenerateOptions): Promise<string> {
        const model = options?.model || 'gemini-2.0-flash';
        const systemPrompt = options?.systemPrompt;

        // Prepend system prompt if provided
        const fullPrompt = systemPrompt
            ? `${systemPrompt}\n\n${prompt}`
            : prompt;

        return generateText(fullPrompt, model);
    },

    async generateWithVision(
        prompt: string,
        images: ImageInput[],
        options?: GenerateOptions
    ): Promise<string> {
        // For now, use text-only generation
        // TODO: Implement multimodal generation with Gemini
        return this.generate(prompt, options);
    }
};

/**
 * Claude Provider - Deep reasoning (Opus/Sonnet)
 */
export const claudeProvider: CPBProvider = {
    name: 'claude',

    isConfigured(): boolean {
        return !!apiKeyService.getKey('claude');
    },

    async generate(prompt: string, options?: GenerateOptions): Promise<string> {
        const model = options?.model || 'claude-sonnet-4-20250514';

        return claudeService.generateContent(
            [{ role: 'user', content: prompt }],
            options?.systemPrompt,
            model
        );
    },

    async generateWithVision(
        prompt: string,
        images: ImageInput[],
        options?: GenerateOptions
    ): Promise<string> {
        const model = options?.model || 'claude-sonnet-4-20250514';

        // Build content array with images
        const content: ClaudeContentBlock[] = [];

        // Add images first
        for (const img of images) {
            content.push({
                type: 'image' as const,
                source: {
                    type: 'base64' as const,
                    media_type: img.mediaType as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp',
                    data: img.base64
                }
            });
        }

        // Add text prompt
        content.push({
            type: 'text' as const,
            text: prompt
        });

        // Use generateContent with multimodal message format
        return claudeService.generateContent(
            [{ role: 'user', content }],
            options?.systemPrompt,
            model
        );
    }
};

/**
 * Get the best available provider for a tier
 */
export function getProviderForTier(tier: 'fast' | 'balanced' | 'deep'): CPBProvider {
    // Prefer Claude for deep reasoning
    if (tier === 'deep' && claudeProvider.isConfigured()) {
        return claudeProvider;
    }

    // Prefer Gemini for fast/balanced
    if (geminiProvider.isConfigured()) {
        return geminiProvider;
    }

    // Fallback to Claude if Gemini not configured
    if (claudeProvider.isConfigured()) {
        return claudeProvider;
    }

    // Return Gemini anyway (will error when used if not configured)
    return geminiProvider;
}

/**
 * Default provider configuration for CPB
 */
export const defaultProviders = {
    fast: geminiProvider,      // Gemini Flash for quick queries
    balanced: geminiProvider,  // Gemini Pro for standard queries
    deep: claudeProvider       // Claude Opus for deep reasoning
};
