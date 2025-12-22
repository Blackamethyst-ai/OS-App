
import { success, failure, Result } from '../utils/logic';

/**
 * SOVEREIGN DIAGNOSTIC SUITE
 * High-fidelity unit tests for critical logical sectors.
 */
export const diagnosticSuite = {
    // 1. ARCHITECTURAL PERSONA TEST
    verifyArchitectPersona: (instruction: string): Result<boolean> => {
        const requiredTerms = ['Senior System Architect', 'internalMonologue', 'DRY'];
        const missing = requiredTerms.filter(term => !instruction.includes(term));
        
        if (missing.length === 0) return success(true);
        return failure(new Error(`PERSONA_MISMATCH: Missing directives: ${missing.join(', ')}`));
    },

    // 2. CONSENSUS LOGIC TEST
    verifyConsensusThreshold: (votes: Record<string, number>, targetGap: number): Result<string | null> => {
        const sorted = Object.entries(votes).sort((a, b) => b[1] - a[1]);
        if (sorted.length === 0) return success(null);
        
        const leader = sorted[0];
        const runnerUp = sorted[1] || ["", 0];
        const currentGap = leader[1] - runnerUp[1];

        if (currentGap >= targetGap) return success(leader[0]);
        return success(null);
    },

    // 3. SEMANTIC DENSITY TEST
    verifyLatticeIntegrity: (nodes: any[], edges: any[]): Result<number> => {
        if (nodes.length === 0) return success(100);
        const orphaned = nodes.filter(n => 
            !edges.some(e => e.source === n.id || e.target === n.id)
        );
        const integrity = 100 - ((orphaned.length / nodes.length) * 100);
        return success(integrity);
    }
};
