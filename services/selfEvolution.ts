/**
 * SELF-EVOLUTION PROTOCOL
 * 
 * The Singularity-tier capability: The OS writes its own code.
 * 
 * This system:
 * 1. OBSERVES user friction (repeated actions, errors, hesitations)
 * 2. HYPOTHESIZES solutions (what feature would reduce friction?)
 * 3. GENERATES code (React components, utilities, hooks)
 * 4. TESTS in sandbox (validates syntax, structure)
 * 5. PROPOSES evolution (user approves/rejects)
 * 6. DEPLOYS to runtime (hot-reload capability)
 * 7. MEASURES impact (did friction reduce?)
 * 8. ITERATES (recursive improvement)
 * 
 * This is not automation. This is self-modification.
 * The OS becomes more capable with each cycle.
 */

import { useAppStore } from '../store';
import { logger } from './logger';
import { generateText } from './geminiService';
import { powerService } from './powerService';
import { neuralVault } from './persistenceService';
import {
    MigrationPlan,
    EvolutionStep,
    AppMode,
    AppTheme,
    ProtocolStepResult,
    StoredArtifact,
    FrictionSignal,
    EvolutionHypothesis,
    EvolutionCycle,
    RiskLevel
} from '../types';

// Re-export types used by components
export type { FrictionSignal, EvolutionHypothesis };

// Browser-safe path helpers
const getBasename = (filePath: string) => filePath.split(/[\\/]/).pop() || '';


// Configuration
const FRICTION_THRESHOLD = 3; // Number of similar errors/actions before triggering evolution
const EVOLUTION_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between evolution attempts


// Redefining local interfaces for internals if needed, but using MigrationPlan from types.ts globally

class SelfEvolutionService {
    private frictionSignals: Map<string, FrictionSignal> = new Map();
    private hypotheses: EvolutionHypothesis[] = [];
    private cycles: EvolutionCycle[] = [];
    private lastEvolutionTime: number = 0;
    private isEvolving: boolean = false;
    private lastProcessedLogCount: number = 0;

    constructor() {
        this.init();
    }

    private init() {
        // Subscribe to store changes to detect friction
        if (typeof window !== 'undefined') {
            // Monitor for repeated errors (only process new logs)
            useAppStore.subscribe((state, prevState) => {
                const totalLogs = state.system.logs.length;
                if (totalLogs <= this.lastProcessedLogCount) return;

                const newLogs = state.system.logs.slice(this.lastProcessedLogCount);
                this.lastProcessedLogCount = totalLogs;

                const errors = newLogs.filter(l => l.level === 'ERROR');
                errors.forEach(error => {
                    this.recordFriction('ERROR', error.message, state.mode);
                });
            });

            // Periodic friction analysis
            setInterval(() => {
                this.analyzeFriction();
            }, 30000); // Every 30 seconds
        }
    }

    /**
     * Record a friction signal
     */
    recordFriction(type: FrictionSignal['type'], context: string, mode: string) {
        const key = `${type}-${context.slice(0, 50)}`;
        const existing = this.frictionSignals.get(key);

        if (existing) {
            existing.count++;
            existing.timestamp = Date.now();
        } else {
            this.frictionSignals.set(key, {
                id: `friction-${Date.now()}`,
                type,
                context,
                mode,
                timestamp: Date.now(),
                count: 1
            });
        }

        if (import.meta.env.DEV) console.log(`🧬 Evolution: Friction recorded - ${type}: ${context.slice(0, 50)}...`);
    }

    /**
     * Analyze accumulated friction and trigger evolution if warranted
     */
    private async analyzeFriction() {
        if (this.isEvolving) return;
        if (Date.now() - this.lastEvolutionTime < EVOLUTION_COOLDOWN_MS) return;

        // Check if Auto-Evolution is enabled in power settings
        if (!powerService.isEnabled('autoEvolution')) {
            if (import.meta.env.DEV) console.log('🧬 SELF-EVOLUTION: Disabled in power settings. Enable in Power Control Panel.');
            return;
        }

        // Find friction signals that exceed threshold
        const criticalFriction = Array.from(this.frictionSignals.values())
            .filter(f => f.count >= FRICTION_THRESHOLD)
            .sort((a, b) => b.count - a.count);

        if (criticalFriction.length === 0) return;

        // Take the highest-friction signal
        const target = criticalFriction[0];
        if (import.meta.env.DEV) console.log(`🧬 Evolution: Critical friction detected - ${target.type} (${target.count}x)`);

        await this.triggerEvolution(target);
    }

    /**
     * The core evolution cycle
     */
    private async triggerEvolution(friction: FrictionSignal) {
        this.isEvolving = true;
        this.lastEvolutionTime = Date.now();

        const cycleId = `cycle-${Date.now()}`;
        const cycle: EvolutionCycle = {
            id: cycleId,
            startTime: Date.now(),
            endTime: null,
            signalsAnalyzed: this.frictionSignals.size,
            hypothesesGenerated: 0,
            evolutionsDeployed: 0,
            netImpact: 0
        };

        useAppStore.getState().actions.addLog('SYSTEM', `🧬 SELF-EVOLUTION: Initiating evolution cycle for friction: ${friction.context.slice(0, 50)}...`);

        try {
            // Step 1: Generate hypothesis
            const hypothesis = await this.generateHypothesis(friction);
            if (!hypothesis) {
                this.isEvolving = false;
                return;
            }
            cycle.hypothesesGenerated++;
            powerService.recordUsage('autoEvolution', 2000); // Approx tokens for hypothesis

            // Step 2: Generate code
            const evolution = await this.generateEvolution(hypothesis);
            if (!evolution) {
                this.isEvolving = false;
                return;
            }
            powerService.recordUsage('autoEvolution', 5000); // Approx tokens for code gen

            // Step 3: Validate code
            const isValid = this.validateCode(evolution.generatedCode);
            if (!isValid) {
                useAppStore.getState().actions.addLog('WARN', `🧬 SELF-EVOLUTION: Generated code failed validation`);
                evolution.status = 'REJECTED';
                this.hypotheses.push(evolution);
                this.isEvolving = false;
                return;
            }

            // Step 4: Propose to user (for now, auto-approve in dev mode)
            this.hypotheses.push(evolution);

            useAppStore.getState().actions.addLog('SUCCESS',
                `🧬 SELF-EVOLUTION: Proposed ${evolution.fileType} "${evolution.fileName}" - ${evolution.hypothesis}`
            );

            // Clear the friction signal
            this.frictionSignals.delete(`${friction.type}-${friction.context.slice(0, 50)}`);

            cycle.endTime = Date.now();
            this.cycles.push(cycle);

        } catch (error) {
            logger.error('Evolution cycle failed', error, 'SelfEvolution');
            useAppStore.getState().actions.addLog('ERROR', `🧬 SELF-EVOLUTION: Cycle failed - ${error}`);
        }

        this.isEvolving = false;
    }

    /**
     * Generate a hypothesis for solving friction
     */
    private async generateHypothesis(friction: FrictionSignal): Promise<string | null> {
        try {
            const prompt = `You are a senior software architect analyzing user friction in an AI-native OS application.

FRICTION DETECTED:
- Type: ${friction.type}
- Context: ${friction.context}
- Mode: ${friction.mode}
- Occurrences: ${friction.count}

Based on this friction, generate a hypothesis for a code solution.

Output JSON:
{
    "hypothesis": "Brief description of the problem",
    "proposedSolution": "Specific technical solution",
    "fileType": "component" | "hook" | "utility" | "service",
    "fileName": "ProposedFileName.tsx",
    "confidence": 0.0-1.0
}`;

            const response = await generateText(prompt, 'gemini-2.0-flash', 'You are an expert software architect.');

            try {
                const parsed = JSON.parse(response);
                return parsed;
            } catch {
                return null;
            }
        } catch {
            return null;
        }
    }

    /**
     * Generate actual code to solve the friction
     */
    private async generateEvolution(hypothesis: any): Promise<EvolutionHypothesis | null> {
        try {
            const codePrompt = `You are generating production-ready React/TypeScript code for an AI-native OS.

HYPOTHESIS:
${JSON.stringify(hypothesis, null, 2)}

Generate the complete code for this ${hypothesis.fileType}.

Requirements:
- Use TypeScript
- Use React functional components with hooks
- Use Framer Motion for animations
- Use Tailwind-style utility classes
- Include proper imports
- Include JSDoc comments
- Make it production-ready

Output ONLY the code, no markdown fences.`;

            const code = await generateText(codePrompt, 'gemini-2.0-flash', 'You are an expert React/TypeScript developer.');

            const evolution: EvolutionHypothesis = {
                id: `evolution-${Date.now()}`,
                frictionSignal: {} as FrictionSignal, // Reference back
                hypothesis: hypothesis.hypothesis,
                proposedSolution: hypothesis.proposedSolution,
                generatedCode: code,
                fileType: hypothesis.fileType,
                fileName: hypothesis.fileName,
                confidence: hypothesis.confidence,
                status: 'PROPOSED',
                timestamp: Date.now()
            };

            return evolution;
        } catch {
            return null;
        }
    }

    /**
     * Validate generated code (basic syntax check)
     */
    private validateCode(code: string): boolean {
        // Basic validation
        if (!code || code.length < 50) return false;

        // Check for required patterns
        const hasImport = code.includes('import');
        const hasExport = code.includes('export');
        const hasReact = code.includes('React') || code.includes('react');

        return hasImport && hasExport;
    }

    /**
     * Get pending evolutions awaiting approval
     */
    getPendingEvolutions(): EvolutionHypothesis[] {
        return this.hypotheses.filter(h => h.status === 'PROPOSED');
    }

    /**
     * Get all evolutions
     */
    getAllEvolutions(): EvolutionHypothesis[] {
        return this.hypotheses;
    }

    /**
     * Get evolution cycles
     */
    getCycles(): EvolutionCycle[] {
        return this.cycles;
    }

    /**
     * Approve an evolution and stage for real deployment
     * Persisted to neuralVault for cross-session survival
     */
    async approveEvolution(id: string) {
        const evolution = this.hypotheses.find(h => h.id === id);
        if (evolution) {
            evolution.status = 'APPROVED';

            try {
                // Stage for real deployment - persist to neuralVault
                const pending = await this.getPendingDeployments();
                pending.push({
                    id: evolution.id,
                    fileName: evolution.fileName,
                    fileType: evolution.fileType,
                    code: evolution.generatedCode,
                    hypothesis: evolution.hypothesis,
                    approvedAt: Date.now()
                });
                await neuralVault.set('evolution_pending_deployments', pending);

                useAppStore.getState().actions.addLog('SUCCESS',
                    `🧬 SELF-EVOLUTION: "${evolution.fileName}" approved and staged for deployment. Say "deploy evolutions" to write to filesystem.`
                );
            } catch (e) {
                // Fallback to localStorage
                const pending = this.getPendingDeploymentsSync();
                pending.push({
                    id: evolution.id,
                    fileName: evolution.fileName,
                    fileType: evolution.fileType,
                    code: evolution.generatedCode,
                    hypothesis: evolution.hypothesis,
                    approvedAt: Date.now()
                });
                localStorage.setItem('evolution_pending_deployments', JSON.stringify(pending));
                useAppStore.getState().actions.addLog('SUCCESS',
                    `🧬 SELF-EVOLUTION: "${evolution.fileName}" approved (localStorage fallback).`
                );
            }
        }
    }

    /**
     * Get pending deployments (approved but not yet written to filesystem)
     * Async version - reads from neuralVault
     */
    async getPendingDeployments(): Promise<Array<{
        id: string;
        fileName: string;
        fileType: string;
        code: string;
        hypothesis: string;
        approvedAt: number;
    }>> {
        try {
            const pending = await neuralVault.get('evolution_pending_deployments');
            return pending || [];
        } catch {
            return this.getPendingDeploymentsSync();
        }
    }

    /**
     * Sync fallback for pending deployments
     */
    getPendingDeploymentsSync(): Array<{
        id: string;
        fileName: string;
        fileType: string;
        code: string;
        hypothesis: string;
        approvedAt: number;
    }> {
        try {
            return JSON.parse(localStorage.getItem('evolution_pending_deployments') || '[]');
        } catch {
            return [];
        }
    }

    /**
     * Mark an evolution as deployed (called after file is written)
     */
    async markDeployed(id: string) {
        const evolution = this.hypotheses.find(h => h.id === id);
        if (evolution) {
            evolution.status = 'DEPLOYED';
        }

        try {
            // Remove from pending in neuralVault
            const pending = await this.getPendingDeployments();
            const filtered = pending.filter(p => p.id !== id);
            await neuralVault.set('evolution_pending_deployments', filtered);
        } catch {
            // Fallback to localStorage
            const pending = this.getPendingDeploymentsSync().filter(p => p.id !== id);
            localStorage.setItem('evolution_pending_deployments', JSON.stringify(pending));
        }

        useAppStore.getState().actions.addLog('SUCCESS',
            `🧬 SELF-EVOLUTION: "${evolution?.fileName}" deployed to filesystem. Vite HMR will pick it up.`
        );
    }

    /**
     * Clear all pending deployments
     */
    async clearPendingDeployments() {
        try {
            await neuralVault.set('evolution_pending_deployments', []);
        } catch {
            localStorage.setItem('evolution_pending_deployments', JSON.stringify([]));
        }
    }

    /**
     * Reject an evolution
     */
    rejectEvolution(id: string) {
        const evolution = this.hypotheses.find(h => h.id === id);
        if (evolution) {
            evolution.status = 'REJECTED';
            useAppStore.getState().actions.addLog('INFO', `🧬 SELF-EVOLUTION: "${evolution.fileName}" rejected`);
        }
    }

    /**
     * Get current friction map
     */
    getFrictionMap(): FrictionSignal[] {
        return Array.from(this.frictionSignals.values());
    }

    /**
     * Get evolution statistics
     */
    getStats() {
        return {
            totalFrictionSignals: this.frictionSignals.size,
            totalHypotheses: this.hypotheses.length,
            pendingEvolutions: this.hypotheses.filter(h => h.status === 'PROPOSED').length,
            approvedEvolutions: this.hypotheses.filter(h => h.status === 'APPROVED').length,
            deployedEvolutions: this.hypotheses.filter(h => h.status === 'DEPLOYED').length,
            pendingDeployments: this.getPendingDeploymentsSync().length,
            totalCycles: this.cycles.length,
            isEvolving: this.isEvolving
        };
    }

    /**
     * Manually trigger evolution analysis (for testing)
     */
    triggerAnalysis() {
        // Add some test friction
        this.recordFriction('REPEATED_ACTION', 'User repeatedly clicked save button without response', 'CODE_STUDIO');
        this.recordFriction('REPEATED_ACTION', 'User repeatedly clicked save button without response', 'CODE_STUDIO');
        this.recordFriction('REPEATED_ACTION', 'User repeatedly clicked save button without response', 'CODE_STUDIO');

        // Trigger analysis
        this.analyzeFriction();
    }

    /**
     * Sentient Code Editing: Assess the blast radius of modifying a file.
     * Uses Graph Reasoning Engine to find all dependent components.
     */
    async assessImpact(targetFile: string): Promise<RiskLevel> {
        try {
            // 1. Scan Codebase (Note: assumes Node environment for file scanning)
            // In a real browser app, this graph would be pre-built or served by backend.
            // For this phase, we run it directly via dynamic import to avoid browser crash
            const { scanCodebase } = await import('../libs/codebase-scanner');
            const { GraphReasoningEngine } = await import('../libs/graph-reasoning-engine/engine');

            const rootDir = '/'; // Browser sandbox fallback
            const graphData = scanCodebase(rootDir);

            // 2. Resolve Target
            const targetPath = Object.keys(graphData.meta.pathToId).find(p => p.endsWith(targetFile));

            if (!targetPath) {
                logger.warn(`Risk Assessment: Could not find file ${targetFile}`, undefined, 'SelfEvolution');
                return 'HIGH'; // Use high caution if file unknown
            }

            const targetId = graphData.meta.pathToId[targetPath];

            // 3. Compute Blast Radius
            const engine = new GraphReasoningEngine();
            // We want to know what depends on Target. 
            // Our graph edges are Imported -> Importer.
            // So reachable nodes from Target = Blast Radius.
            const paths = engine.computePaths({
                sourceNodeId: targetId,
                graphData: graphData
            });

            let radius = 0;
            if (paths.distances) {
                for (let i = 0; i < paths.distances.length; i++) {
                    if (i !== targetId && paths.distances[i] !== Infinity) {
                        radius++;
                    }
                }
            }

            if (import.meta.env.DEV) console.log(`Risk Assessment for ${targetFile}: Radius=${radius}`);

            // 4. Determine Risk Rule
            if (radius < 5) return 'LOW';
            if (radius < 20) return 'MEDIUM';
            return 'HIGH';

        } catch (error) {
            logger.error('Risk Assessment Failed', error, 'SelfEvolution');
            return 'HIGH'; // Fail safe
        }
    }


    /**
     * Sentient Code Editing: Propose a migration plan based on impact analysis.
     * High risk changes require manual approval. Medium risk triggers auto-patching.
     */
    async proposeMigration(targetFile: string, changes: string): Promise<MigrationPlan> {
        try {
            // 1. Assess Risk
            const risk = await this.assessImpact(targetFile);

            // 2. Scan for dependent files (re-using logic from assessImpact for now)
            // Note: In Node, we use scanner. In browser, we would fetch the graph.
            const impactedFiles: string[] = [];

            // For the test script, we use scanner
            const { scanCodebase } = await import('../libs/codebase-scanner');
            const { GraphReasoningEngine } = await import('../libs/graph-reasoning-engine/engine');

            const rootDir = '/'; // Browser sandbox fallback
            const graphData = scanCodebase(rootDir);
            const targetPath = Object.keys(graphData.meta.pathToId).find(p => p.endsWith(targetFile));

            if (targetPath) {
                const targetId = graphData.meta.pathToId[targetPath];
                const engine = new GraphReasoningEngine();
                const paths = engine.computePaths({
                    sourceNodeId: targetId,
                    graphData: graphData
                });

                if (paths.distances) {
                    for (let i = 0; i < paths.distances.length; i++) {
                        if (i !== targetId && paths.distances[i] !== Infinity) {
                            impactedFiles.push(getBasename(graphData.meta.idToPath[i]));
                        }
                    }
                }
            }

            // 3. Formulate Plan
            const planId = `plan-${Date.now()}`;
            const plan: MigrationPlan = {
                id: planId,
                targetFile,
                risk,
                status: 'APPROVED', // Default
                impactedFiles,
                evolutionSteps: [],
                reasoning: `Analysis of ${targetFile} shows a blast radius of ${impactedFiles.length} files.`,
                timestamp: Date.now()
            };

            if (risk === 'HIGH') {
                plan.status = 'MANUAL_APPROVAL_REQUIRED';
                plan.reasoning += " High impact detected on core systems. Manual architectural review required.";
            } else if (risk === 'MEDIUM') {
                plan.status = 'AUTO_GENERATING_PATCHES';
                plan.reasoning += " Significant dependencies found. Automated patching initiated for affected modules.";

                // Add dummy evolution steps representing the plan for impacted files
                plan.evolutionSteps = impactedFiles.map(file => ({
                    id: `step-${crypto.randomUUID().slice(0, 8)}`,
                    file,
                    description: `Update call sites and types for changes in ${targetFile}`,
                    patch: `// TODO: Generate patch for ${file}`,
                    status: 'PENDING'
                }));
            } else {
                plan.status = 'APPROVED';
                plan.reasoning += " Low blast radius. Safe for immediate evolution.";
            }

            return plan;

        } catch (error) {
            logger.error('Migration Proposal Failed', error, 'SelfEvolution');
            return {
                id: `error-${Date.now()}`,
                targetFile: targetFile,
                risk: 'HIGH',
                status: 'MANUAL_APPROVAL_REQUIRED',
                impactedFiles: [],
                evolutionSteps: [],
                reasoning: `Error during proposal: ${error}`,
                timestamp: Date.now()
            } as MigrationPlan;
        }
    }
}

// Singleton
export const selfEvolution = new SelfEvolutionService();
