/**
 * ACTION PRIORITY SYSTEM
 *
 * Centralized priority scoring for the synchronized clock.
 * Actions are prioritized by category to surface the most relevant actions.
 */

import type { ActionCategory, ActionComplexity } from './types';
import type { CPBPath } from '../cognitivePrecisionBridge/types';

// =============================================================================
// Category Priority Scores
// =============================================================================

/**
 * Base priority scores by action category.
 * Generate/Execute actions are more prominent than UI toggles.
 */
const CATEGORY_PRIORITY: Record<ActionCategory, number> = {
    generate: 85,
    execute: 80,
    deploy: 75,
    analyze: 70,
    search: 65,
    manage: 60,
    navigate: 55,
    ui: 40,
};

/**
 * Get priority score for an action category.
 * Used by both component and voice action registries.
 */
export function getCategoryPriority(category: ActionCategory): number {
    return CATEGORY_PRIORITY[category] ?? 50;
}

// =============================================================================
// Complexity to CPB Path Mapping
// =============================================================================

/**
 * Maps action complexity levels to optimal CPB execution paths.
 */
const COMPLEXITY_TO_PATH: Record<ActionComplexity, CPBPath | 'auto'> = {
    simple: 'direct',
    navigation: 'direct',
    analysis: 'ace',
    architecture: 'hybrid',
    critical: 'cascade',
};

/**
 * Get the optimal CPB execution path for a complexity level.
 */
export function getPathForComplexity(complexity: ActionComplexity): CPBPath | 'auto' {
    return COMPLEXITY_TO_PATH[complexity] ?? 'auto';
}

// =============================================================================
// Sector Relevance Scoring
// =============================================================================

/**
 * Calculate relevance score for an action in a given sector.
 * Actions directly in the sector get full priority, related sectors get reduced.
 *
 * @param actionSectors - Sectors the action is relevant to
 * @param currentSector - The current active sector
 * @param basePriority - The action's base priority score
 * @returns Adjusted priority score (0-100)
 */
export function calculateSectorRelevance(
    actionSectors: string[],
    currentSector: string,
    basePriority: number
): number {
    // Global actions (empty sectors) are always relevant at full priority
    if (actionSectors.length === 0) {
        return basePriority;
    }

    // Direct match - full priority
    if (actionSectors.includes(currentSector)) {
        return basePriority;
    }

    // Check for partial matches (e.g., 'MEMORY' matches 'MEMORY_CORE')
    const hasPartialMatch = actionSectors.some(
        sector => currentSector.includes(sector) || sector.includes(currentSector)
    );

    if (hasPartialMatch) {
        return Math.floor(basePriority * 0.7); // 70% priority for related sectors
    }

    // No match - deprioritize significantly
    return Math.floor(basePriority * 0.3);
}

// =============================================================================
// Priority Modifiers
// =============================================================================

/**
 * Apply modifiers to base priority.
 * Used for context-aware prioritization.
 */
export interface PriorityModifiers {
    /** Boost if user recently used similar actions */
    recentUsageBoost?: number;
    /** Boost if biometrics indicate stress (simpler actions surface) */
    stressSimplificationBoost?: number;
    /** Boost based on time of day patterns */
    temporalBoost?: number;
}

/**
 * Calculate final priority with modifiers applied.
 */
export function applyPriorityModifiers(
    basePriority: number,
    modifiers: PriorityModifiers
): number {
    let priority = basePriority;

    if (modifiers.recentUsageBoost) {
        priority += modifiers.recentUsageBoost;
    }

    if (modifiers.stressSimplificationBoost) {
        priority += modifiers.stressSimplificationBoost;
    }

    if (modifiers.temporalBoost) {
        priority += modifiers.temporalBoost;
    }

    // Clamp to valid range
    return Math.max(0, Math.min(100, priority));
}
