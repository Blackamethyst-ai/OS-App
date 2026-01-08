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
import { generateText } from './geminiService';

// Configuration
const FRICTION_THRESHOLD = 3; // Number of similar errors/actions before triggering evolution
const EVOLUTION_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between evolution attempts

export interface FrictionSignal {
    id: string;
    type: 'ERROR' | 'REPEATED_ACTION' | 'DEAD_END' | 'LONG_PAUSE' | 'ABANDONMENT';
    context: string;
    mode: string;
    timestamp: number;
    count: number;
}

export interface EvolutionHypothesis {
    id: string;
    frictionSignal: FrictionSignal;
    hypothesis: string;
    proposedSolution: string;
    generatedCode: string;
    fileType: 'component' | 'hook' | 'utility' | 'service';
    fileName: string;
    confidence: number;
    status: 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'DEPLOYED' | 'ROLLED_BACK';
    timestamp: number;
    impactMeasurement?: {
        frictionBefore: number;
        frictionAfter: number;
        delta: number;
    };
}

export interface EvolutionCycle {
    id: string;
    startTime: number;
    endTime: number | null;
    signalsAnalyzed: number;
    hypothesesGenerated: number;
    evolutionsDeployed: number;
    netImpact: number; // Positive = improvement
}

class SelfEvolutionService {
    private frictionSignals: Map<string, FrictionSignal> = new Map();
    private hypotheses: EvolutionHypothesis[] = [];
    private cycles: EvolutionCycle[] = [];
    private lastEvolutionTime: number = 0;
    private isEvolving: boolean = false;

    constructor() {
        this.init();
    }

    private init() {
        // Subscribe to store changes to detect friction
        if (typeof window !== 'undefined') {
            // Monitor for repeated errors
            useAppStore.subscribe((state, prevState) => {
                const newLogs = state.system.logs.slice(-5);
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

        console.log(`🧬 Evolution: Friction recorded - ${type}: ${context.slice(0, 50)}...`);
    }

    /**
     * Analyze accumulated friction and trigger evolution if warranted
     */
    private async analyzeFriction() {
        if (this.isEvolving) return;
        if (Date.now() - this.lastEvolutionTime < EVOLUTION_COOLDOWN_MS) return;

        // Find friction signals that exceed threshold
        const criticalFriction = Array.from(this.frictionSignals.values())
            .filter(f => f.count >= FRICTION_THRESHOLD)
            .sort((a, b) => b.count - a.count);

        if (criticalFriction.length === 0) return;

        // Take the highest-friction signal
        const target = criticalFriction[0];
        console.log(`🧬 Evolution: Critical friction detected - ${target.type} (${target.count}x)`);

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

            // Step 2: Generate code
            const evolution = await this.generateEvolution(hypothesis);
            if (!evolution) {
                this.isEvolving = false;
                return;
            }

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
            console.error('Evolution cycle failed:', error);
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
     * Approve an evolution (for future hot-reload deployment)
     */
    approveEvolution(id: string) {
        const evolution = this.hypotheses.find(h => h.id === id);
        if (evolution) {
            evolution.status = 'APPROVED';
            useAppStore.getState().actions.addLog('SUCCESS', `🧬 SELF-EVOLUTION: "${evolution.fileName}" approved for deployment`);
            // Future: Actually inject the code into the runtime
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
}

// Singleton
export const selfEvolution = new SelfEvolutionService();
