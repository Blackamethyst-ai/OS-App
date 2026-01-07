/**
 * MODEL ROUTER
 * Intelligent routing layer that selects the best AI model for the task.
 * Optimizes for cost, speed, and capability capabilities.
 */
import * as geminiService from './geminiService';
import { claudeService } from './claudeService';
import { apiKeyService } from './apiKeyService';
import { ollamaService } from './ollamaService';
import { grokService } from './grokService';
import { ModelTier } from '../types';

export interface RouterConfig {
    tier: ModelTier;
    preferredProvider?: 'gemini' | 'claude' | 'grok';
    requireVision?: boolean;
}

class ModelRouter {
    /**
     * Determines the best available model for the task
     */
    async generateContent(
        prompt: string,
        config: RouterConfig = { tier: 'balanced' },
        systemPrompt?: string
    ): Promise<string> {

        const hasGemini = apiKeyService.hasGeminiKey();
        const hasClaude = apiKeyService.getKey('claude');
        const hasGrok = apiKeyService.getKey('grok');

        // 0. CHECK FOR LOCAL (Offline/Privacy)
        if (config.tier === 'local') {
            const isLocalAvailable = await ollamaService.isAvailable();
            if (isLocalAvailable) {
                return this.callOllama(prompt, systemPrompt);
            }
            // Fallback if local requested but not available?
            console.warn("ROUTER: Local AI requested but failed check. Falling back to Cloud.");
        }

        // 1. DEFAULT TO GEMINI FLASH (Fastest/Cheapest) for "Fast" tier
        if (config.tier === 'fast') {
            if (hasGemini) {
                // Using Flash via Gemini Service (defaults in service might need tuning)
                // For now, assume Gemini Service maps 'fast' needs appropriately
                return this.callGemini(prompt, systemPrompt, 'gemini-1.5-flash');
            }
        }

        // 2. USE CLAUDE FOR CODING / COMPLEX REASONING ("Powerful" tier)
        if (config.tier === 'powerful') {
            if (hasClaude) return this.callClaude(prompt, systemPrompt, 'claude-3-5-sonnet-20240620');
            // Fallback to Grok or Gemini Pro if Claude missing
            if (hasGrok) return this.callGrok(prompt, systemPrompt);
            if (hasGemini) return this.callGemini(prompt, systemPrompt, 'gemini-1.5-pro');
        }

        // 3. USE GROK FOR CREATIVE / CHAT ("Creative" tier)
        if (config.tier === 'creative') {
            if (hasGrok) return this.callGrok(prompt, systemPrompt);
            // Fallback to Opus or Gemini Pro
            if (hasClaude) return this.callClaude(prompt, systemPrompt, 'claude-3-opus-20240229');
            if (hasGemini) return this.callGemini(prompt, systemPrompt, 'gemini-1.5-pro');
        }

        // 4. FALLBACK CASCADE & PREFERENCES
        // If preferred provider request matches available key
        if (config.preferredProvider === 'claude' && hasClaude) return this.callClaude(prompt, systemPrompt);
        if (config.preferredProvider === 'grok' && hasGrok) return this.callGrok(prompt, systemPrompt);
        if (config.preferredProvider === 'gemini' && hasGemini) return this.callGemini(prompt, systemPrompt);

        // Ultimate Catch-all: Try largest available model
        if (hasClaude) return this.callClaude(prompt, systemPrompt);
        if (hasGrok) return this.callGrok(prompt, systemPrompt);
        if (hasGemini) {
            // Default to Gemini Pro/Flash based on complexity
            const model = config.tier === 'powerful' ? 'gemini-1.5-pro' : 'gemini-1.5-flash';
            return this.callGemini(prompt, systemPrompt, model);
        }

        throw new Error('No capable AI models configured. Please add an API Key in settings.');
    }

    /**
     * Helper to call Gemini routing through existing service
     */
    private async callGemini(prompt: string, systemPrompt?: string, modelId?: string): Promise<string> {
        try {
            // Use the generic generation function we added to the service
            const result = await geminiService.generateText(prompt, modelId, systemPrompt);
            return result;
        } catch (e) {
            console.error('Gemini Router Error:', e);
            throw e;
        }
    }

    /**
     * Helper to call Claude
     */
    private async callClaude(prompt: string, systemPrompt?: string, modelId?: string): Promise<string> {
        return claudeService.generateContent(
            [{ role: 'user', content: prompt }],
            systemPrompt,
            modelId
        );
    }

    private async callOllama(prompt: string, systemPrompt?: string): Promise<string> {
        // Prepare messages provided system prompt if needed
        const messages: any[] = [];
        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
        messages.push({ role: 'user', content: prompt });

        return ollamaService.generateChatCompletion(messages);
    }

    private async callGrok(prompt: string, systemPrompt?: string): Promise<string> {
        return grokService.generateContent(
            [{ role: 'user', content: prompt }],
            systemPrompt
        );
    }
}

export const modelRouter = new ModelRouter();
