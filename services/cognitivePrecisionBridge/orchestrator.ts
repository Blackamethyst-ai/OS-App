/**
 * Cognitive Precision Bridge - Orchestrator
 *
 * Main entry point for the CPB system.
 * Coordinates RLM, ACE, and DQ scoring into unified execution paths.
 *
 * CPB Pattern Flow:
 * 1. ANALYZE: Extract signals, select path
 * 2. COMPRESS: RLM context externalization (if needed)
 * 3. EXPLORE: Parallel LLM exploration
 * 4. CONVERGE: ACE consensus (if needed)
 * 5. VERIFY: DQ scoring
 * 6. RECONSTRUCT: Final synthesis
 */

import type {
    CPBConfig,
    CPBRequest,
    CPBResult,
    CPBStatus,
    CPBPath,
    CPBPhase,
    CPBPattern,
    ReasoningModel,
    ImageInput
} from './types';
import { DEFAULT_CPB_CONFIG } from './types';
import { selectPath, extractPathSignals, canUseDirectPath } from './router';
import { recursiveLLMQuery, rlmEnhancedQuery, RLMResult, RLMStatus } from '../recursiveLanguageModel';
import { adaptiveConsensusEngine, quickConsensus } from '../adaptiveConsensus';
import { scoreDQHeuristic, scoreDQWithLLM, DQScore } from '../dqScoring';
import { convergenceMemory } from '../convergenceMemory';
import { retryGeminiRequest, getAI } from '../geminiService';
import { claudeService } from '../claudeService';
import type { AtomicTask } from '../../types';
import { logger } from '../logger';

// ============================================================================
// MODEL ROUTING
// ============================================================================

/**
 * Map reasoning tier to actual model
 */
function getModelForPath(path: CPBPath, forceModel?: ReasoningModel): { provider: 'gemini' | 'claude'; model: string } {
    if (forceModel && forceModel !== 'auto') {
        switch (forceModel) {
            case 'gemini-flash':
                return { provider: 'gemini', model: 'gemini-2.0-flash' };
            case 'gemini-pro':
                return { provider: 'gemini', model: 'gemini-1.5-pro' };
            case 'claude-haiku':
                return { provider: 'claude', model: 'claude-3-haiku-20240307' };
            case 'claude-sonnet':
                return { provider: 'claude', model: 'claude-sonnet-4-20250514' };
            case 'claude-opus':
                return { provider: 'claude', model: 'claude-opus-4-20250514' };
        }
    }

    // ELITE TIER: Auto-route based on path with Opus-first preference
    switch (path) {
        case 'direct':
            // ELITE: Even direct uses Sonnet for quality
            return claudeService.isConfigured()
                ? { provider: 'claude', model: 'claude-sonnet-4-20250514' }
                : { provider: 'gemini', model: 'gemini-2.0-flash' };
        case 'rlm':
            // ELITE: RLM uses Sonnet for better compression quality
            return claudeService.isConfigured()
                ? { provider: 'claude', model: 'claude-sonnet-4-20250514' }
                : { provider: 'gemini', model: 'gemini-2.0-flash' };
        case 'ace':
            // ELITE: ACE uses Opus for maximum reasoning depth
            return claudeService.isConfigured()
                ? { provider: 'claude', model: 'claude-opus-4-20250514' }
                : { provider: 'gemini', model: 'gemini-1.5-pro' };
        case 'hybrid':
            // ELITE: Hybrid uses Opus for final synthesis
            return claudeService.isConfigured()
                ? { provider: 'claude', model: 'claude-opus-4-20250514' }
                : { provider: 'gemini', model: 'gemini-1.5-pro' };
        case 'cascade':
            // ELITE: Cascade uses Opus with extended context
            return claudeService.isConfigured()
                ? { provider: 'claude', model: 'claude-opus-4-20250514' }
                : { provider: 'gemini', model: 'gemini-1.5-pro' };
        default:
            return claudeService.isConfigured()
                ? { provider: 'claude', model: 'claude-sonnet-4-20250514' }
                : { provider: 'gemini', model: 'gemini-2.0-flash' };
    }
}

// ============================================================================
// CPB ORCHESTRATOR CLASS
// ============================================================================

class CognitivePrecisionBridgeOrchestrator {
    private config: CPBConfig;
    private statusCallback?: (status: CPBStatus) => void;
    private startTime: number = 0;
    private currentPhase: CPBPhase = 'idle';
    private currentPath: CPBPath = 'direct';

    constructor(config: Partial<CPBConfig> = {}) {
        this.config = { ...DEFAULT_CPB_CONFIG, ...config };
    }

    // ========================================================================
    // MAIN EXECUTION
    // ========================================================================

    /**
     * Execute a request through the CPB pipeline
     */
    async execute(
        request: CPBRequest,
        onStatusUpdate?: (status: CPBStatus) => void
    ): Promise<CPBResult> {
        this.startTime = Date.now();
        this.statusCallback = onStatusUpdate;
        let retryCount = 0;

        try {
            // ================================================================
            // PHASE 1: ANALYZE & ROUTE
            // ================================================================
            this.updateStatus('analyzing', 'Analyzing request...');

            const routingDecision = selectPath(request, this.config);
            this.currentPath = routingDecision.selectedPath;

            logger.debug(`Selected path: ${this.currentPath} (confidence: ${routingDecision.confidence.toFixed(2)})`, undefined, 'CPBOrchestrator');
            logger.debug(`Reasoning: ${routingDecision.reasoning}`, undefined, 'CPBOrchestrator');

            // ================================================================
            // PHASE 2-5: EXECUTE PATH
            // ================================================================
            let result = await this.executePath(request, routingDecision.selectedPath);

            // ================================================================
            // PHASE 6: VERIFY & RETRY
            // ================================================================
            if (this.config.enableVerification) {
                this.updateStatus('verifying', 'Verifying output quality...');

                if (result.dqScore.score < this.config.dqThreshold && this.config.retryOnLowDQ && retryCount < 2) {
                    logger.debug(`DQ score ${result.dqScore.score.toFixed(2)} below threshold ${this.config.dqThreshold}, retrying...`, undefined, 'CPBOrchestrator');
                    retryCount++;

                    // Escalate path for retry
                    const escalatedPath = this.escalatePath(routingDecision.selectedPath);
                    result = await this.executePath(request, escalatedPath);
                    result.retryCount = retryCount;
                }
            }

            // ================================================================
            // PHASE 7: STORE PATTERN
            // ================================================================
            let patternStored = false;
            if (this.config.enableLearning && result.dqScore.isActionable) {
                try {
                    await this.storePattern(request, result);
                    patternStored = true;
                } catch (e) {
                    logger.warn('Failed to store pattern', e, 'CPBOrchestrator');
                }
            }

            this.updateStatus('complete', 'Execution complete');

            return {
                ...result,
                path: this.currentPath,
                pathSignals: routingDecision.signals,
                pathReasoning: routingDecision.reasoning,
                retryCount,
                patternStored
            };

        } catch (error) {
            this.updateStatus('error', `Error: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    // ========================================================================
    // PATH EXECUTION
    // ========================================================================

    /**
     * Execute the selected path
     */
    private async executePath(request: CPBRequest, path: CPBPath): Promise<Omit<CPBResult, 'path' | 'pathSignals' | 'pathReasoning' | 'patternStored'>> {
        switch (path) {
            case 'direct':
                return this.executeDirectPath(request);
            case 'rlm':
                return this.executeRLMPath(request);
            case 'ace':
                return this.executeACEPath(request);
            case 'hybrid':
                return this.executeHybridPath(request);
            case 'cascade':
                return this.executeCascadePath(request);
            default:
                return this.executeDirectPath(request);
        }
    }

    /**
     * Generate with appropriate model (Gemini or Claude)
     */
    private async generateWithModel(
        prompt: string,
        modelConfig: { provider: 'gemini' | 'claude'; model: string },
        images?: ImageInput[]
    ): Promise<string> {
        if (modelConfig.provider === 'claude') {
            // Use Claude
            if (images && images.length > 0) {
                // Claude Vision for multimodal
                const image = images[0]; // Claude vision takes one image at a time
                return claudeService.generateVision(
                    prompt,
                    image.base64,
                    image.mediaType,
                    modelConfig.model
                );
            }
            return claudeService.generateContent(
                [{ role: 'user', content: prompt }],
                undefined,
                modelConfig.model
            );
        } else {
            // Use Gemini
            const ai = getAI();

            if (images && images.length > 0) {
                // Gemini Vision for multimodal
                const contents: any[] = [{ text: prompt }];
                for (const img of images) {
                    contents.push({
                        inlineData: {
                            mimeType: img.mediaType,
                            data: img.base64
                        }
                    });
                }

                const response = await retryGeminiRequest(() =>
                    ai.models.generateContent({
                        model: 'gemini-2.0-flash', // Flash supports vision
                        contents: contents,
                        config: { temperature: 0.7 }
                    })
                );
                return response.text || '';
            }

            const response = await retryGeminiRequest(() =>
                ai.models.generateContent({
                    model: modelConfig.model,
                    contents: prompt,
                    config: { temperature: 0.7 }
                })
            );
            return response.text || '';
        }
    }

    /**
     * DIRECT PATH: Simple query → Direct LLM response
     */
    private async executeDirectPath(request: CPBRequest): Promise<Omit<CPBResult, 'path' | 'pathSignals' | 'pathReasoning' | 'patternStored'>> {
        this.updateStatus('exploring', 'Direct path execution...');

        const startTime = Date.now();
        const modelConfig = getModelForPath('direct', request.forceModel);

        const prompt = request.context
            ? `${request.query}\n\nContext:\n${request.context}`
            : request.query;

        const output = await this.generateWithModel(
            prompt,
            modelConfig,
            request.multimodal?.images
        );

        const task = this.createTask(request);
        const dqScore = scoreDQHeuristic(output, task);

        logger.debug(`Direct path complete: ${modelConfig.provider}/${modelConfig.model}`, undefined, 'CPBOrchestrator');

        return {
            output,
            confidence: dqScore.score * 100,
            executionTimeMs: Date.now() - startTime,
            tokensUsed: Math.ceil((prompt.length + output.length) / 4),
            dqScore,
            verified: true,
            retryCount: 0
        };
    }

    /**
     * RLM PATH: Long context → Recursive Language Model
     */
    private async executeRLMPath(request: CPBRequest): Promise<Omit<CPBResult, 'path' | 'pathSignals' | 'pathReasoning' | 'patternStored'>> {
        this.updateStatus('compressing', 'RLM context processing...');

        const context = request.context || '';
        const rlmResult = await rlmEnhancedQuery(
            context,
            request.query,
            (status) => {
                this.updateStatus('exploring', `RLM iteration ${status.iteration}/${status.maxIterations}`, status);
            },
            {
                maxIterations: this.config.rlmConfig.maxIterations,
                rootModel: this.config.rlmConfig.rootModel,
                subModel: this.config.rlmConfig.subModel,
                enableDQScoring: true
            }
        );

        return {
            output: rlmResult.answer,
            confidence: rlmResult.dqScore ? rlmResult.dqScore.score * 100 : 70,
            executionTimeMs: rlmResult.executionTime,
            tokensUsed: rlmResult.totalTokens,
            dqScore: rlmResult.dqScore || scoreDQHeuristic(rlmResult.answer, this.createTask(request)),
            verified: !!rlmResult.dqScore,
            retryCount: 0,
            rlmResult
        };
    }

    /**
     * ACE PATH: Complex query → Adaptive Consensus Engine
     */
    private async executeACEPath(request: CPBRequest): Promise<Omit<CPBResult, 'path' | 'pathSignals' | 'pathReasoning' | 'patternStored'>> {
        this.updateStatus('converging', 'ACE consensus...');

        const task = this.createTask(request);
        const aceResult = await adaptiveConsensusEngine(
            task,
            (status) => {
                const progress = Math.round((status.totalAttempts / (this.config.aceConfig.maxRounds || 15)) * 100);
                this.updateStatus('converging', `ACE round ${status.totalAttempts}, gap: ${status.currentGap}/${status.targetGap}`, undefined);
            },
            {
                enableAuction: this.config.aceConfig.enableAuction,
                enableHopGrouping: this.config.aceConfig.enableHopGrouping,
                enableDQScoring: true,
                enableLearning: this.config.enableLearning
            }
        );

        return {
            output: aceResult.output,
            confidence: aceResult.confidence,
            executionTimeMs: aceResult.executionTime,
            tokensUsed: aceResult.complexity?.tokenEstimate ? aceResult.complexity.tokenEstimate * (aceResult.voteLedger?.totalRounds || 1) : 0,
            dqScore: aceResult.dqScore || scoreDQHeuristic(aceResult.output, task),
            verified: !!aceResult.dqScore,
            retryCount: 0,
            aceResult
        };
    }

    /**
     * HYBRID PATH: RLM compression → ACE consensus
     */
    private async executeHybridPath(request: CPBRequest): Promise<Omit<CPBResult, 'path' | 'pathSignals' | 'pathReasoning' | 'patternStored'>> {
        const startTime = Date.now();
        let totalTokens = 0;

        // Step 1: RLM for context compression (if needed)
        let processedContext = request.context || '';
        let rlmResult: RLMResult | undefined;

        if (processedContext.length > this.config.contextThreshold) {
            this.updateStatus('compressing', 'Compressing context with RLM...');

            rlmResult = await recursiveLLMQuery(
                processedContext,
                `Extract and summarize the key information relevant to: ${request.query}`,
                (status) => {
                    this.updateStatus('compressing', `RLM extraction: iteration ${status.iteration}`, status);
                },
                {
                    maxIterations: 10,
                    enableDQScoring: false
                }
            );

            processedContext = rlmResult.answer;
            totalTokens += rlmResult.totalTokens;
        }

        // Step 2: ACE consensus on compressed context
        this.updateStatus('converging', 'Running ACE consensus...');

        const task: AtomicTask = {
            id: `cpb-hybrid-${Date.now()}`,
            description: request.query,
            instruction: request.query,
            isolated_input: processedContext,
            weight: 1,
            status: 'PENDING'
        };

        const aceResult = await adaptiveConsensusEngine(
            task,
            (status) => {
                this.updateStatus('converging', `ACE: gap ${status.currentGap}/${status.targetGap}`);
            },
            {
                enableAuction: true,
                enableHopGrouping: true,
                enableDQScoring: true
            }
        );

        totalTokens += aceResult.complexity?.tokenEstimate ? aceResult.complexity.tokenEstimate * (aceResult.voteLedger?.totalRounds || 1) : 0;

        return {
            output: aceResult.output,
            confidence: aceResult.confidence,
            executionTimeMs: Date.now() - startTime,
            tokensUsed: totalTokens,
            dqScore: aceResult.dqScore || scoreDQHeuristic(aceResult.output, task),
            verified: !!aceResult.dqScore,
            retryCount: 0,
            rlmResult,
            aceResult
        };
    }

    /**
     * CASCADE PATH: Full pipeline with multiple verification passes
     */
    private async executeCascadePath(request: CPBRequest): Promise<Omit<CPBResult, 'path' | 'pathSignals' | 'pathReasoning' | 'patternStored'>> {
        const startTime = Date.now();
        let totalTokens = 0;

        // Step 1: Execute hybrid path
        const hybridResult = await this.executeHybridPath(request);
        totalTokens += hybridResult.tokensUsed;

        // Step 2: LLM-based DQ verification
        this.updateStatus('verifying', 'Deep verification with LLM scoring...');

        const task = this.createTask(request);
        const deepDQScore = await scoreDQWithLLM(hybridResult.output, task);

        // Step 3: If DQ is low, synthesize alternative
        if (deepDQScore.score < this.config.dqThreshold) {
            this.updateStatus('reconstructing', 'Synthesizing improved response...');

            const ai = getAI();
            const synthesisPrompt = `
The following response has quality issues. Please improve it while preserving accurate information.

Original Query: ${request.query}

Original Response:
${hybridResult.output}

Quality Assessment:
- Validity: ${deepDQScore.components.validity.toFixed(2)} (technical soundness)
- Specificity: ${deepDQScore.components.specificity.toFixed(2)} (concrete details)
- Correctness: ${deepDQScore.components.correctness.toFixed(2)} (task alignment)

Please provide an improved response that addresses any quality gaps.`;

            const synthesisResponse = await retryGeminiRequest(() =>
                ai.models.generateContent({
                    model: 'gemini-2.0-flash',
                    contents: synthesisPrompt,
                    config: { temperature: 0.5 }
                })
            );

            const improvedOutput = synthesisResponse.text || hybridResult.output;
            const improvedDQ = await scoreDQWithLLM(improvedOutput, task);

            // Use improved if better
            if (improvedDQ.score > deepDQScore.score) {
                return {
                    output: improvedOutput,
                    confidence: improvedDQ.score * 100,
                    executionTimeMs: Date.now() - startTime,
                    tokensUsed: totalTokens + Math.ceil(synthesisPrompt.length / 4),
                    dqScore: improvedDQ,
                    verified: true,
                    retryCount: 1,
                    rlmResult: hybridResult.rlmResult,
                    aceResult: hybridResult.aceResult
                };
            }
        }

        return {
            ...hybridResult,
            executionTimeMs: Date.now() - startTime,
            dqScore: deepDQScore,
            verified: true
        };
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    /**
     * Escalate path for retry
     */
    private escalatePath(currentPath: CPBPath): CPBPath {
        const escalation: Record<CPBPath, CPBPath> = {
            direct: 'ace',
            rlm: 'hybrid',
            ace: 'hybrid',
            hybrid: 'cascade',
            cascade: 'cascade'
        };
        return escalation[currentPath];
    }

    /**
     * Create task from request
     */
    private createTask(request: CPBRequest): AtomicTask {
        return request.task || {
            id: `cpb-${Date.now()}`,
            description: request.query,
            instruction: request.query,
            isolated_input: request.context || '',
            weight: 1,
            status: 'PENDING'
        };
    }

    /**
     * Store execution pattern for learning
     */
    private async storePattern(request: CPBRequest, result: Omit<CPBResult, 'path' | 'pathSignals' | 'pathReasoning' | 'patternStored'>): Promise<void> {
        const pattern = convergenceMemory.createPattern(
            this.createTask(request),
            result.dqScore.score > 0.7 ? 'expert' : result.dqScore.score > 0.4 ? 'moderate' : 'simple',
            'cpb',
            result.aceResult?.voteLedger?.totalRounds || 1,
            result.aceResult?.voteLedger?.count || 1,
            result.dqScore.score,
            result.aceResult?.voteLedger?.participatingAgents || [],
            result.tokensUsed
        );
        await convergenceMemory.storePattern(pattern);
    }

    /**
     * Update status callback
     */
    private updateStatus(phase: CPBPhase, message: string, engineStatus?: RLMStatus): void {
        this.currentPhase = phase;
        const elapsed = Date.now() - this.startTime;

        const status: CPBStatus = {
            phase,
            path: this.currentPath,
            progress: this.calculateProgress(phase),
            currentEngine: this.getActiveEngine(phase),
            engineStatus,
            elapsedMs: elapsed,
            estimatedRemainingMs: this.estimateRemaining(phase, elapsed),
            message
        };

        this.statusCallback?.(status);
    }

    /**
     * Calculate progress percentage
     */
    private calculateProgress(phase: CPBPhase): number {
        const phaseProgress: Record<CPBPhase, number> = {
            idle: 0,
            analyzing: 10,
            compressing: 30,
            exploring: 50,
            converging: 70,
            verifying: 85,
            reconstructing: 95,
            complete: 100,
            error: 100
        };
        return phaseProgress[phase];
    }

    /**
     * Get active engine name
     */
    private getActiveEngine(phase: CPBPhase): 'rlm' | 'ace' | 'dq' | null {
        switch (phase) {
            case 'compressing':
            case 'exploring':
                return 'rlm';
            case 'converging':
                return 'ace';
            case 'verifying':
                return 'dq';
            default:
                return null;
        }
    }

    /**
     * Estimate remaining time
     */
    private estimateRemaining(phase: CPBPhase, elapsed: number): number {
        const progress = this.calculateProgress(phase);
        if (progress === 0 || progress === 100) return 0;
        return Math.round((elapsed / progress) * (100 - progress));
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<CPBConfig>): void {
        this.config = { ...this.config, ...config };
    }
}

// ============================================================================
// SINGLETON & CONVENIENCE EXPORTS
// ============================================================================

/**
 * Default CPB instance
 */
export const cognitivePrecisionBridge = new CognitivePrecisionBridgeOrchestrator();

/**
 * Quick execution shorthand
 */
export async function cpbExecute(
    query: string,
    context?: string,
    onStatus?: (status: CPBStatus) => void
): Promise<CPBResult> {
    return cognitivePrecisionBridge.execute({ query, context }, onStatus);
}

/**
 * Force specific path
 */
export async function cpbExecutePath(
    path: CPBPath,
    query: string,
    context?: string,
    onStatus?: (status: CPBStatus) => void
): Promise<CPBResult> {
    return cognitivePrecisionBridge.execute({ query, context, forcePath: path }, onStatus);
}

export default cognitivePrecisionBridge;
