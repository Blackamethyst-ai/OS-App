/**
 * Cognitive Precision Bridge - Orchestrator
 *
 * Main coordinator that routes queries through optimal paths
 * and manages the precision-aware execution pipeline.
 *
 * The CPB pattern: COMPRESS → PRE-COMPUTE → PARALLEL EXPLORE → ACCUMULATE → RECONSTRUCT → VERIFY
 */

import type {
    CPBPath,
    CPBPhase,
    CPBConfig,
    CPBRequest,
    CPBResult,
    CPBStatus,
    CPBProvider,
    DQScore,
    RLMResult,
    ACEResult,
    ImageInput,
    CPBStatusCallback,
    PathSignals,
    RoutingDecision
} from './types';
import { DEFAULT_CPB_CONFIG } from './types';
import { extractPathSignals, selectPath } from './router';
import { getLearnedRoutingFromFeedback } from './feedbackAdapter';

// ============================================================================
// ORCHESTRATOR CLASS
// ============================================================================

export class CognitivePrecisionBridge {
    private config: CPBConfig;
    private providers: CPBConfig['providers'];
    private startTime: number = 0;

    constructor(config: Partial<CPBConfig> & { providers: CPBConfig['providers'] }) {
        this.config = { ...DEFAULT_CPB_CONFIG, ...config, providers: config.providers };
        this.providers = config.providers;
    }

    /**
     * Main execution entry point
     */
    async execute(
        request: CPBRequest,
        onStatusUpdate?: CPBStatusCallback
    ): Promise<CPBResult> {
        this.startTime = Date.now();

        const updateStatus = (status: Partial<CPBStatus>) => {
            if (onStatusUpdate) {
                onStatusUpdate({
                    phase: 'analyzing',
                    path: 'direct',
                    progress: 0,
                    currentEngine: null,
                    elapsedMs: Date.now() - this.startTime,
                    estimatedRemainingMs: 0,
                    ...status
                });
            }
        };

        try {
            // Phase 1: Analyze and select path
            updateStatus({
                phase: 'analyzing',
                progress: 5,
                message: 'Analyzing query complexity...'
            });

            const signals = extractPathSignals(request.query, request.context, this.config);
            const learnedRouting = getLearnedRoutingFromFeedback();
            const routing = selectPath(signals, this.config, learnedRouting);
            const selectedPath = request.forcePath || routing.path;

            updateStatus({
                phase: 'analyzing',
                path: selectedPath,
                progress: 10,
                message: `Selected path: ${selectedPath} (${Math.round(routing.confidence * 100)}% confidence)`
            });

            // Phase 2: Execute selected path
            let result: CPBResult;

            switch (selectedPath) {
                case 'direct':
                    result = await this.executeDirect(request, signals, routing, updateStatus);
                    break;
                case 'rlm':
                    result = await this.executeRLM(request, signals, routing, updateStatus);
                    break;
                case 'ace':
                    result = await this.executeACE(request, signals, routing, updateStatus);
                    break;
                case 'hybrid':
                    result = await this.executeHybrid(request, signals, routing, updateStatus);
                    break;
                case 'cascade':
                    result = await this.executeCascade(request, signals, routing, updateStatus);
                    break;
                default:
                    result = await this.executeDirect(request, signals, routing, updateStatus);
            }

            // Phase 3: Verify if enabled
            if (this.config.enableVerification && !result.verified) {
                updateStatus({
                    phase: 'verifying',
                    path: selectedPath,
                    progress: 90,
                    currentEngine: 'dq',
                    message: 'Running DQ verification...'
                });

                result = await this.verifyResult(result, request);
            }

            updateStatus({
                phase: 'complete',
                path: selectedPath,
                progress: 100,
                message: `Complete. DQ Score: ${result.dqScore.overall}%`
            });

            return result;

        } catch (error) {
            updateStatus({
                phase: 'error',
                progress: 0,
                message: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    // ============================================================================
    // PATH EXECUTORS
    // ============================================================================

    /**
     * Direct path - simple LLM call
     */
    private async executeDirect(
        request: CPBRequest,
        signals: PathSignals,
        routing: RoutingDecision,
        updateStatus: (s: Partial<CPBStatus>) => void
    ): Promise<CPBResult> {
        updateStatus({
            phase: 'exploring',
            path: 'direct',
            progress: 30,
            message: 'Executing direct query...'
        });

        const provider = this.getProvider('fast');
        const output = await this.generateWithProvider(provider, request);

        return this.buildResult(output, 'direct', signals, routing, {
            tokensUsed: Math.ceil(output.length / 4)
        });
    }

    /**
     * RLM path - Recursive Language Model for long context
     */
    private async executeRLM(
        request: CPBRequest,
        signals: PathSignals,
        routing: RoutingDecision,
        updateStatus: (s: Partial<CPBStatus>) => void
    ): Promise<CPBResult> {
        updateStatus({
            phase: 'compressing',
            path: 'rlm',
            progress: 20,
            currentEngine: 'rlm',
            message: 'Compressing context with RLM...'
        });

        const provider = this.getProvider('balanced');

        // Simulate RLM compression by chunking
        const chunks = this.chunkContext(request.context || '', 4000);
        const summaries: string[] = [];

        for (let i = 0; i < chunks.length; i++) {
            updateStatus({
                phase: 'compressing',
                progress: 20 + Math.round((i / chunks.length) * 40),
                engineStatus: {
                    phase: 'processing',
                    currentIteration: i + 1,
                    totalIterations: chunks.length,
                    nodesProcessed: i + 1,
                    compressionRatio: i > 0 ? chunks.length / (i + 1) : 1
                },
                message: `Processing chunk ${i + 1}/${chunks.length}...`
            });

            const summary = await provider.generate(
                `Summarize the key points from this context:\n\n${chunks[i]}\n\nProvide a concise summary focusing on information relevant to: ${request.query}`,
                { temperature: 0.3 }
            );
            summaries.push(summary);
        }

        // Synthesize
        updateStatus({
            phase: 'reconstructing',
            progress: 70,
            message: 'Synthesizing compressed context...'
        });

        const compressedContext = summaries.join('\n\n---\n\n');
        const output = await provider.generate(
            `Based on this compressed context:\n\n${compressedContext}\n\nAnswer the following query:\n${request.query}`,
            { temperature: 0.5 }
        );

        const rlmResult: RLMResult = {
            output,
            compressionRatio: (request.context?.length || 0) / compressedContext.length,
            iterations: chunks.length,
            tokensProcessed: Math.ceil((request.context?.length || 0) / 4),
            executionTimeMs: Date.now() - this.startTime
        };

        return this.buildResult(output, 'rlm', signals, routing, {
            rlmResult,
            tokensUsed: rlmResult.tokensProcessed
        });
    }

    /**
     * ACE path - Adaptive Consensus Engine
     */
    private async executeACE(
        request: CPBRequest,
        signals: PathSignals,
        routing: RoutingDecision,
        updateStatus: (s: Partial<CPBStatus>) => void
    ): Promise<CPBResult> {
        updateStatus({
            phase: 'exploring',
            path: 'ace',
            progress: 20,
            currentEngine: 'ace',
            message: 'Gathering multi-agent perspectives...'
        });

        const provider = this.getProvider('balanced');
        const agentCount = this.config.aceConfig.agentCount;
        const perspectives: string[] = [];
        const agentVotes: Record<string, number> = {};

        // ELITE: 5-agent ensemble with diverse cognitive profiles
        const agentPersonas = [
            { name: 'Analyst', prompt: 'You are a rigorous analyst. Examine this objectively, focusing on data, evidence, and logical consistency. Identify patterns and draw measured conclusions:' },
            { name: 'Skeptic', prompt: 'You are a critical skeptic. Challenge every assumption, identify potential failure modes, edge cases, and risks. Play devil\'s advocate:' },
            { name: 'Synthesizer', prompt: 'You are a systems thinker. Find deep connections, identify emergent patterns, and propose unified frameworks that integrate multiple perspectives:' },
            { name: 'Pragmatist', prompt: 'You are a practical implementer. Focus on actionability, resource constraints, timelines, and real-world feasibility. What actually works?:' },
            { name: 'Visionary', prompt: 'You are a strategic visionary. Think long-term, consider second-order effects, identify opportunities others miss, and propose innovative directions:' }
        ];

        for (let i = 0; i < Math.min(agentCount, agentPersonas.length); i++) {
            const agent = agentPersonas[i];

            updateStatus({
                phase: 'exploring',
                progress: 20 + Math.round((i / agentCount) * 40),
                engineStatus: {
                    phase: 'gathering',
                    votes: agentVotes,
                    currentGap: 0
                },
                message: `Agent ${agent.name} analyzing...`
            });

            const perspective = await provider.generate(
                `${agent.prompt}\n\nContext: ${request.context || 'None provided'}\n\nQuery: ${request.query}`,
                { temperature: 0.7 }
            );
            perspectives.push(`[${agent.name}]: ${perspective}`);
            agentVotes[agent.name] = 1;
        }

        // ELITE: Multi-round convergence for deeper consensus
        updateStatus({
            phase: 'converging',
            progress: 65,
            message: 'Building consensus from perspectives...'
        });

        // Use deep provider for synthesis
        const deepProvider = this.getProvider('deep');

        const consensus = await deepProvider.generate(
            `You are an expert consensus builder synthesizing insights from a diverse panel of experts.

## Expert Perspectives:
${perspectives.join('\n\n')}

## Your Task:
Synthesize a comprehensive, authoritative answer to: ${request.query}

Structure your response:
1. **Core Consensus**: What all experts agree on
2. **Key Insights**: Unique valuable contributions from each perspective
3. **Resolved Tensions**: How conflicting views can be reconciled
4. **Final Synthesis**: The integrated, definitive answer
5. **Confidence Assessment**: How certain is this conclusion?

Be thorough, precise, and intellectually rigorous.`,
            { temperature: 0.3 }
        );

        // Calculate agreement level based on perspective overlap
        const agreementLevel = this.calculateAgreement(perspectives);

        const aceResult: ACEResult = {
            consensus,
            confidence: Math.min(0.95, 0.7 + agreementLevel * 0.25),
            agreementLevel,
            rounds: 1,
            agentVotes
        };

        return this.buildResult(consensus, 'ace', signals, routing, {
            aceResult,
            tokensUsed: Math.ceil((perspectives.join('').length + consensus.length) / 4)
        });
    }

    /**
     * Hybrid path - RLM + ACE combined
     */
    private async executeHybrid(
        request: CPBRequest,
        signals: PathSignals,
        routing: RoutingDecision,
        updateStatus: (s: Partial<CPBStatus>) => void
    ): Promise<CPBResult> {
        // First compress with RLM
        updateStatus({
            phase: 'compressing',
            path: 'hybrid',
            progress: 10,
            currentEngine: 'rlm',
            message: 'Starting hybrid: RLM compression...'
        });

        const rlmResult = await this.executeRLM(
            request,
            signals,
            routing,
            (s) => updateStatus({ ...s, progress: Math.min(s.progress || 0, 50), path: 'hybrid' })
        );

        // Then run ACE on compressed result
        updateStatus({
            phase: 'converging',
            progress: 55,
            currentEngine: 'ace',
            message: 'Hybrid: Running ACE consensus...'
        });

        const aceRequest: CPBRequest = {
            ...request,
            context: rlmResult.rlmResult?.output || rlmResult.output
        };

        const aceResult = await this.executeACE(
            aceRequest,
            signals,
            routing,
            (s) => updateStatus({ ...s, progress: 55 + Math.round((s.progress || 0) * 0.4), path: 'hybrid' })
        );

        return {
            ...aceResult,
            path: 'hybrid',
            rlmResult: rlmResult.rlmResult,
            tokensUsed: rlmResult.tokensUsed + aceResult.tokensUsed
        };
    }

    /**
     * Cascade path - full pipeline with verification
     */
    private async executeCascade(
        request: CPBRequest,
        signals: PathSignals,
        routing: RoutingDecision,
        updateStatus: (s: Partial<CPBStatus>) => void
    ): Promise<CPBResult> {
        updateStatus({
            phase: 'analyzing',
            path: 'cascade',
            progress: 5,
            message: 'Starting cascade: full pipeline...'
        });

        // Use the most powerful provider available
        const provider = this.getProvider('deep');

        // Step 1: Deep analysis
        updateStatus({
            phase: 'exploring',
            progress: 15,
            message: 'Cascade: Deep analysis...'
        });

        const analysis = await provider.generate(
            `Perform a deep analysis of this query and context.\n\nContext: ${request.context || 'None'}\n\nQuery: ${request.query}\n\nProvide:\n1. Key considerations\n2. Potential approaches\n3. Trade-offs\n4. Recommended approach with reasoning`,
            { temperature: 0.5 }
        );

        // Step 2: Generate solution
        updateStatus({
            phase: 'reconstructing',
            progress: 50,
            message: 'Cascade: Generating solution...'
        });

        const solution = await provider.generate(
            `Based on this analysis:\n\n${analysis}\n\nProvide a comprehensive answer to: ${request.query}\n\nBe thorough, precise, and include relevant details.`,
            { temperature: 0.4 }
        );

        // Step 3: Self-verify
        updateStatus({
            phase: 'verifying',
            progress: 75,
            currentEngine: 'dq',
            message: 'Cascade: Self-verification...'
        });

        const verification = await provider.generate(
            `Review this answer for accuracy, completeness, and quality:\n\nOriginal Query: ${request.query}\n\nAnswer: ${solution}\n\nProvide:\n1. Accuracy assessment (0-100)\n2. Completeness assessment (0-100)\n3. Any corrections or additions needed\n4. Final improved answer if needed`,
            { temperature: 0.3 }
        );

        // Extract final answer (use verification if it provides improvements)
        const output = verification.includes('Final improved answer')
            ? verification.split('Final improved answer')[1].trim()
            : solution;

        return this.buildResult(output, 'cascade', signals, routing, {
            verified: true,
            tokensUsed: Math.ceil((analysis.length + solution.length + verification.length) / 4)
        });
    }

    // ============================================================================
    // HELPER METHODS
    // ============================================================================

    private getProvider(tier: 'fast' | 'balanced' | 'deep'): CPBProvider {
        const provider = this.providers[tier] || this.providers.balanced || this.providers.fast;
        if (!provider) {
            throw new Error(`No provider configured for tier: ${tier}`);
        }
        return provider;
    }

    /**
     * Calculate agreement level between agent perspectives
     * Uses simple keyword overlap as a heuristic
     */
    private calculateAgreement(perspectives: string[]): number {
        if (perspectives.length < 2) return 1.0;

        // Extract key terms from each perspective
        const termSets = perspectives.map(p => {
            const words = p.toLowerCase()
                .replace(/[^\w\s]/g, '')
                .split(/\s+/)
                .filter(w => w.length > 4); // Only meaningful words
            return new Set(words);
        });

        // Calculate pairwise overlap
        let totalOverlap = 0;
        let comparisons = 0;

        for (let i = 0; i < termSets.length; i++) {
            for (let j = i + 1; j < termSets.length; j++) {
                const intersection = [...termSets[i]].filter(t => termSets[j].has(t));
                const union = new Set([...termSets[i], ...termSets[j]]);
                totalOverlap += intersection.length / union.size;
                comparisons++;
            }
        }

        return comparisons > 0 ? totalOverlap / comparisons : 0.5;
    }

    private async generateWithProvider(
        provider: CPBProvider,
        request: CPBRequest
    ): Promise<string> {
        const prompt = request.context
            ? `Context:\n${request.context}\n\nQuery: ${request.query}`
            : request.query;

        if (request.multimodal?.images?.length && provider.generateWithVision) {
            return provider.generateWithVision(prompt, request.multimodal.images);
        }

        return provider.generate(prompt);
    }

    private chunkContext(context: string, chunkSize: number): string[] {
        const chunks: string[] = [];
        for (let i = 0; i < context.length; i += chunkSize) {
            chunks.push(context.slice(i, i + chunkSize));
        }
        return chunks.length > 0 ? chunks : [''];
    }

    private async verifyResult(
        result: CPBResult,
        request: CPBRequest
    ): Promise<CPBResult> {
        const provider = this.getProvider('balanced');

        const verification = await provider.generate(
            `Evaluate this response for quality:\n\nQuery: ${request.query}\nResponse: ${result.output}\n\nRate from 0-100:\n1. Validity (logical soundness)\n2. Specificity (actionability)\n3. Correctness (accuracy)\n\nFormat: VALIDITY:XX SPECIFICITY:XX CORRECTNESS:XX`,
            { temperature: 0.2 }
        );

        // Parse scores
        const validityMatch = verification.match(/VALIDITY:\s*(\d+)/i);
        const specificityMatch = verification.match(/SPECIFICITY:\s*(\d+)/i);
        const correctnessMatch = verification.match(/CORRECTNESS:\s*(\d+)/i);

        const validity = validityMatch ? parseInt(validityMatch[1], 10) : 70;
        const specificity = specificityMatch ? parseInt(specificityMatch[1], 10) : 60;
        const correctness = correctnessMatch ? parseInt(correctnessMatch[1], 10) : 70;

        const overall = Math.round(validity * 0.4 + specificity * 0.3 + correctness * 0.3);

        return {
            ...result,
            verified: true,
            dqScore: {
                overall,
                validity,
                specificity,
                correctness
            }
        };
    }

    private buildResult(
        output: string,
        path: CPBPath,
        signals: PathSignals,
        routing: RoutingDecision,
        extras: Partial<CPBResult> = {}
    ): CPBResult {
        return {
            output,
            confidence: Math.round(routing.confidence * 100),
            path,
            executionTimeMs: Date.now() - this.startTime,
            tokensUsed: extras.tokensUsed || Math.ceil(output.length / 4),
            dqScore: extras.dqScore || {
                overall: 70,
                validity: 70,
                specificity: 70,
                correctness: 70
            },
            verified: extras.verified || false,
            retryCount: 0,
            rlmResult: extras.rlmResult,
            aceResult: extras.aceResult,
            pathSignals: signals,
            pathReasoning: routing.reasoning,
            patternStored: false
        };
    }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Create a CPB instance with providers
 */
export function createCPB(
    providers: CPBConfig['providers'],
    config?: Partial<Omit<CPBConfig, 'providers'>>
): CognitivePrecisionBridge {
    return new CognitivePrecisionBridge({ ...config, providers });
}

/**
 * Quick execute with minimal configuration
 */
export async function cpbExecute(
    providers: CPBConfig['providers'],
    query: string,
    context?: string,
    onStatus?: CPBStatusCallback
): Promise<CPBResult> {
    const cpb = createCPB(providers);
    return cpb.execute({ query, context }, onStatus);
}

export default CognitivePrecisionBridge;
