/**
 * MODEL ROUTER
 * Intelligent routing layer that selects the best AI model for the task.
 * Optimizes for cost, speed, and capability capabilities.
 *
 * Now integrated with CPB (Cognitive Precision Bridge) for precision-aware
 * routing on complex queries. Use `generateWithPrecision()` for automatic
 * path selection based on query complexity.
 */
import * as geminiService from './geminiService';
import { logger } from './logger';
import { claudeService } from './claudeService';
import { apiKeyService } from './apiKeyService';
import { ollamaService } from './ollamaService';
import { grokService } from './grokService';
import { deepseekGenerate, hasDeepSeekKey } from './deepseekService';
import { cpb, type CPBStatus, type CPBResult } from './cpbService';
import { MODEL_REGISTRY } from './modelRegistry';
import { ModelTier } from '../types';

export interface RouterConfig {
    tier: ModelTier;
    preferredProvider?: 'deepseek' | 'gemini' | 'claude' | 'grok';
    requireVision?: boolean;
    /** Enable CPB orchestration for complex queries */
    useCPB?: boolean;
}

export interface PrecisionConfig {
    context?: string;
    onStatus?: (status: CPBStatus) => void;
    /** Force specific CPB path instead of auto-routing */
    forcePath?: 'direct' | 'rlm' | 'ace' | 'hybrid' | 'cascade';
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

        const hasDeepSeek = hasDeepSeekKey();
        const hasGemini = apiKeyService.hasGeminiKey();
        const hasClaude = apiKeyService.getKey('claude');
        const hasGrok = apiKeyService.getKey('grok');

        // 0. CHECK FOR LOCAL (Offline/Privacy)
        if (config.tier === 'local') {
            const isLocalAvailable = await ollamaService.isAvailable();
            if (isLocalAvailable) {
                return this.callOllama(prompt, systemPrompt);
            }
            logger.warn('Local AI requested but failed check, falling back to cloud', undefined, 'ModelRouter');
        }

        // VISION REQUIRED: skip DeepSeek (no vision support); use Gemini/Claude.
        if (config.requireVision) {
            if (hasGemini) return this.callGemini(prompt, systemPrompt, MODEL_REGISTRY.gemini.fast);
            if (hasClaude) return this.callClaude(prompt, systemPrompt, MODEL_REGISTRY.claude.deep);
        }

        // EXPLICIT preferredProvider wins over DeepSeek-first default.
        if (config.preferredProvider === 'gemini' && hasGemini) {
            return this.callGemini(prompt, systemPrompt, MODEL_REGISTRY.gemini.fast);
        }
        if (config.preferredProvider === 'claude' && hasClaude) {
            return this.callClaude(prompt, systemPrompt, MODEL_REGISTRY.claude.deep);
        }
        if (config.preferredProvider === 'grok' && hasGrok) {
            return this.callGrok(prompt, systemPrompt);
        }

        // PRIMARY: DeepSeek V4 first across every tier (cheapest + capable).
        if (hasDeepSeek) {
            return this.callDeepSeek(prompt, systemPrompt);
        }

        // FALLBACK CASCADE — preserved legacy behavior when DeepSeek key absent.

        if (config.tier === 'fast') {
            if (hasClaude) return this.callClaude(prompt, systemPrompt, MODEL_REGISTRY.claude.standard);
            if (hasGemini) return this.callGemini(prompt, systemPrompt, MODEL_REGISTRY.gemini.fast);
        }

        if (config.tier === 'powerful') {
            if (hasClaude) return this.callClaude(prompt, systemPrompt, MODEL_REGISTRY.claude.deep);
            if (hasGrok) return this.callGrok(prompt, systemPrompt);
            if (hasGemini) return this.callGemini(prompt, systemPrompt, MODEL_REGISTRY.gemini.fast);
        }

        if (config.tier === 'creative') {
            if (hasClaude) return this.callClaude(prompt, systemPrompt, MODEL_REGISTRY.claude.deep);
            if (hasGrok) return this.callGrok(prompt, systemPrompt);
            if (hasGemini) return this.callGemini(prompt, systemPrompt, MODEL_REGISTRY.gemini.fast);
        }

        if (config.tier === 'balanced') {
            if (hasClaude) return this.callClaude(prompt, systemPrompt, MODEL_REGISTRY.claude.standard);
            if (hasGemini) return this.callGemini(prompt, systemPrompt, MODEL_REGISTRY.gemini.fast);
        }

        // Preferred-provider overrides (only reached if DeepSeek absent and tier didn't return)
        if (config.preferredProvider === 'claude' && hasClaude) {
            return this.callClaude(prompt, systemPrompt, MODEL_REGISTRY.claude.deep);
        }
        if (config.preferredProvider === 'grok' && hasGrok) return this.callGrok(prompt, systemPrompt);
        if (config.preferredProvider === 'gemini' && hasGemini) {
            return this.callGemini(prompt, systemPrompt, MODEL_REGISTRY.gemini.fast);
        }

        // Ultimate catch-all
        if (hasClaude) return this.callClaude(prompt, systemPrompt, MODEL_REGISTRY.claude.deep);
        if (hasGrok) return this.callGrok(prompt, systemPrompt);
        if (hasGemini) return this.callGemini(prompt, systemPrompt, MODEL_REGISTRY.gemini.fast);

        throw new Error('No capable AI models configured. Please add an API Key in settings.');
    }

    /**
     * Call DeepSeek V4 via OpenAI-compatible chat completions.
     */
    private async callDeepSeek(prompt: string, systemPrompt?: string): Promise<string> {
        try {
            return await deepseekGenerate(prompt, systemPrompt, {
                model: MODEL_REGISTRY.deepseek.standard,
            });
        } catch (e) {
            logger.error('DeepSeek router error', e, 'ModelRouter');
            throw e;
        }
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
            logger.error('Gemini router error', e, 'ModelRouter');
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

    /**
     * Generate with CPB precision routing
     * Automatically selects the best execution path based on query complexity.
     *
     * @example
     * // Auto-routed based on complexity
     * const result = await modelRouter.generateWithPrecision('Analyze this architecture...');
     *
     * // With context and status updates
     * const result = await modelRouter.generateWithPrecision(
     *     'Compare REST vs GraphQL',
     *     { context: apiSpec, onStatus: (s) => setProgress(s.progress) }
     * );
     *
     * // Force consensus path for critical decisions
     * const result = await modelRouter.generateWithPrecision(
     *     'Design the database schema',
     *     { forcePath: 'ace' }
     * );
     */
    async generateWithPrecision(
        prompt: string,
        config: PrecisionConfig = {}
    ): Promise<CPBResult> {
        return cpb.query(prompt, {
            context: config.context,
            onStatus: config.onStatus,
            forcePath: config.forcePath
        });
    }

    /**
     * Check if a query would benefit from CPB orchestration
     */
    shouldUseCPB(prompt: string, context?: string): boolean {
        return cpb.shouldOrchestrate(prompt, context);
    }

    /**
     * Analyze a query without executing
     */
    analyzeQuery(prompt: string, context?: string) {
        return cpb.analyze(prompt, context);
    }
}

export const modelRouter = new ModelRouter();
