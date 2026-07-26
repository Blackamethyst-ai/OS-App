/**
 * Convergence Memory Module
 *
 * Stores and retrieves convergence patterns to learn optimal thresholds.
 * Uses IndexedDB for persistence, separate from main NeuralVault.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
    ConvergencePattern,
    OptimalThresholds,
    TaskComplexity
} from '../types/domain/convergence';
import { AtomicTask } from '../types';

// ============================================================================
// SCHEMA DEFINITION
// ============================================================================

interface ThresholdRecord {
    id: string; // domain:taskType composite key
    domain: string;
    taskType: TaskComplexity;
    avgGap: number;
    avgRounds: number;
    avgDQ: number;
    sampleCount: number;
    lastUpdated: number;
}

interface ConvergenceMemorySchema extends DBSchema {
    patterns: {
        key: string;
        value: ConvergencePattern;
        indexes: {
            'by-domain': string;
            'by-type': TaskComplexity;
            'by-timestamp': number;
        };
    };
    thresholds: {
        key: string; // id = domain:taskType
        value: ThresholdRecord;
    };
}

// ============================================================================
// HASH FUNCTION
// ============================================================================

/**
 * Create a hash of task instruction for deduplication
 */
function hashTask(task: AtomicTask): string {
    // Simple hash using instruction content
    const text = task.instruction.toLowerCase().trim();
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return `task_${Math.abs(hash).toString(16)}`;
}

// ============================================================================
// CONVERGENCE MEMORY SERVICE
// ============================================================================

class ConvergenceMemoryService {
    private dbName = 'os_app_convergence_memory_v1';
    private dbPromise: Promise<IDBPDatabase<ConvergenceMemorySchema>> | null = null;

    /**
     * Opened lazily on first use, never in the constructor — see the matching
     * note in services/persistenceService.ts. Opening during module evaluation
     * turned a missing indexedDB into an unhandled rejection at import time.
     */
    private get db(): Promise<IDBPDatabase<ConvergenceMemorySchema>> {
        if (!this.dbPromise) {
            this.dbPromise = this.initDB().catch(err => {
                // Drop the cached rejection so a later call can retry.
                this.dbPromise = null;
                throw new Error(
                    `ConvergenceMemory: could not open IndexedDB ("${this.dbName}"). Pattern ` +
                        `memory is unavailable — this is expected in private browsing, SSR, or a ` +
                        `sandboxed context. Cause: ${err instanceof Error ? err.message : String(err)}`,
                    { cause: err }
                );
            });
        }
        return this.dbPromise;
    }

    private async initDB() {
        return openDB<ConvergenceMemorySchema>(this.dbName, 1, {
            upgrade(db) {
                // Patterns store
                if (!db.objectStoreNames.contains('patterns')) {
                    const store = db.createObjectStore('patterns', { keyPath: 'taskHash' });
                    store.createIndex('by-domain', 'domain');
                    store.createIndex('by-type', 'taskType');
                    store.createIndex('by-timestamp', 'timestamp');
                }

                // Aggregated thresholds store
                if (!db.objectStoreNames.contains('thresholds')) {
                    db.createObjectStore('thresholds', { keyPath: 'id' });
                }
            }
        });
    }

    // ========================================================================
    // PATTERN STORAGE
    // ========================================================================

    /**
     * Store a convergence pattern after successful consensus
     */
    async storePattern(pattern: ConvergencePattern): Promise<void> {
        const db = await this.db;
        await db.put('patterns', pattern);

        // Update aggregated thresholds
        await this.updateThresholds(pattern.domain, pattern.taskType);
    }

    /**
     * Create a pattern from consensus results
     */
    createPattern(
        task: AtomicTask,
        taskType: TaskComplexity,
        domain: string,
        roundsUsed: number,
        gapAchieved: number,
        dqScore: number,
        winningAgents: string[],
        tokensUsed: number
    ): ConvergencePattern {
        return {
            taskHash: hashTask(task),
            taskType,
            domain,
            roundsUsed,
            gapAchieved,
            dqScore,
            winningAgents,
            tokensUsed,
            timestamp: Date.now()
        };
    }

    /**
     * Get pattern by task hash (for exact match)
     */
    async getPattern(taskHash: string): Promise<ConvergencePattern | undefined> {
        const db = await this.db;
        return db.get('patterns', taskHash);
    }

    /**
     * Get patterns by domain
     */
    async getPatternsByDomain(domain: string, limit = 100): Promise<ConvergencePattern[]> {
        const db = await this.db;
        const all = await db.getAllFromIndex('patterns', 'by-domain', domain);
        return all.slice(-limit); // Most recent
    }

    /**
     * Get patterns by complexity type
     */
    async getPatternsByType(taskType: TaskComplexity, limit = 100): Promise<ConvergencePattern[]> {
        const db = await this.db;
        const all = await db.getAllFromIndex('patterns', 'by-type', taskType);
        return all.slice(-limit);
    }

    // ========================================================================
    // THRESHOLD AGGREGATION
    // ========================================================================

    /**
     * Create composite key for thresholds
     */
    private makeThresholdKey(domain: string, taskType: TaskComplexity): string {
        return `${domain}:${taskType}`;
    }

    /**
     * Update aggregated thresholds after storing a pattern
     */
    private async updateThresholds(domain: string, taskType: TaskComplexity): Promise<void> {
        const db = await this.db;

        // Get all patterns for this domain+type
        const patterns = await this.getPatternsByDomainAndType(domain, taskType);

        if (patterns.length === 0) return;

        // Calculate averages
        const avgGap = patterns.reduce((sum, p) => sum + p.gapAchieved, 0) / patterns.length;
        const avgRounds = patterns.reduce((sum, p) => sum + p.roundsUsed, 0) / patterns.length;
        const avgDQ = patterns.reduce((sum, p) => sum + p.dqScore, 0) / patterns.length;

        await db.put('thresholds', {
            id: this.makeThresholdKey(domain, taskType),
            domain,
            taskType,
            avgGap: Math.round(avgGap * 10) / 10,
            avgRounds: Math.round(avgRounds * 10) / 10,
            avgDQ: Math.round(avgDQ * 100) / 100,
            sampleCount: patterns.length,
            lastUpdated: Date.now()
        });
    }

    /**
     * Get patterns by both domain and type
     */
    async getPatternsByDomainAndType(
        domain: string,
        taskType: TaskComplexity
    ): Promise<ConvergencePattern[]> {
        const db = await this.db;
        const byDomain = await db.getAllFromIndex('patterns', 'by-domain', domain);
        return byDomain.filter(p => p.taskType === taskType);
    }

    /**
     * Get optimal thresholds for a domain+type combination
     */
    async getOptimalThresholds(
        domain: string,
        taskType: TaskComplexity
    ): Promise<OptimalThresholds | null> {
        const db = await this.db;

        try {
            const key = this.makeThresholdKey(domain, taskType);
            const threshold = await db.get('thresholds', key);

            if (!threshold || threshold.sampleCount < 3) {
                // Not enough data, try fallback to general domain
                const generalKey = this.makeThresholdKey('general', taskType);
                const generalThreshold = await db.get('thresholds', generalKey);
                if (generalThreshold && generalThreshold.sampleCount >= 3) {
                    return {
                        gap: Math.round(generalThreshold.avgGap),
                        rounds: Math.round(generalThreshold.avgRounds),
                        confidence: Math.min(0.7, generalThreshold.sampleCount / 20),
                        sampleCount: generalThreshold.sampleCount
                    };
                }
                return null;
            }

            return {
                gap: Math.round(threshold.avgGap),
                rounds: Math.round(threshold.avgRounds),
                confidence: Math.min(0.95, threshold.sampleCount / 20),
                sampleCount: threshold.sampleCount
            };
        } catch {
            return null;
        }
    }

    // ========================================================================
    // ANALYTICS
    // ========================================================================

    /**
     * Get overall statistics
     */
    async getStats(): Promise<{
        totalPatterns: number;
        avgDQScore: number;
        avgRoundsToConverge: number;
        topDomains: { domain: string; count: number }[];
        topAgents: { agentId: string; winCount: number }[];
    }> {
        const db = await this.db;
        const allPatterns = await db.getAll('patterns');

        if (allPatterns.length === 0) {
            return {
                totalPatterns: 0,
                avgDQScore: 0,
                avgRoundsToConverge: 0,
                topDomains: [],
                topAgents: []
            };
        }

        // Calculate averages
        const avgDQScore = allPatterns.reduce((sum, p) => sum + p.dqScore, 0) / allPatterns.length;
        const avgRoundsToConverge = allPatterns.reduce((sum, p) => sum + p.roundsUsed, 0) / allPatterns.length;

        // Count domains
        const domainCounts: Record<string, number> = {};
        for (const p of allPatterns) {
            domainCounts[p.domain] = (domainCounts[p.domain] || 0) + 1;
        }
        const topDomains = Object.entries(domainCounts)
            .map(([domain, count]) => ({ domain, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Count winning agents
        const agentCounts: Record<string, number> = {};
        for (const p of allPatterns) {
            for (const agent of p.winningAgents) {
                agentCounts[agent] = (agentCounts[agent] || 0) + 1;
            }
        }
        const topAgents = Object.entries(agentCounts)
            .map(([agentId, winCount]) => ({ agentId, winCount }))
            .sort((a, b) => b.winCount - a.winCount)
            .slice(0, 5);

        return {
            totalPatterns: allPatterns.length,
            avgDQScore: Math.round(avgDQScore * 100) / 100,
            avgRoundsToConverge: Math.round(avgRoundsToConverge * 10) / 10,
            topDomains,
            topAgents
        };
    }

    /**
     * Clear old patterns (older than N days)
     */
    async pruneOldPatterns(daysOld = 30): Promise<number> {
        const db = await this.db;
        const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

        const allPatterns = await db.getAll('patterns');
        let pruned = 0;

        for (const pattern of allPatterns) {
            if (pattern.timestamp < cutoff) {
                await db.delete('patterns', pattern.taskHash);
                pruned++;
            }
        }

        return pruned;
    }

    /**
     * Clear all convergence memory
     */
    async clear(): Promise<void> {
        const db = await this.db;
        await db.clear('patterns');
        await db.clear('thresholds');
    }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const convergenceMemory = new ConvergenceMemoryService();

export default convergenceMemory;
