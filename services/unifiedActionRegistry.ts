/**
 * UNIFIED ACTION REGISTRY
 *
 * Single source of truth for ALL voice-controllable actions.
 * Merges: componentActionRegistry + voiceActionRegistry + universalVoiceHooks
 *
 * Each action knows:
 * - WHAT it does (description, handler)
 * - WHERE it applies (sectors)
 * - HOW to execute it (CPB execution path)
 * - WHEN to use it (complexity signals)
 *
 * SYNCHRONIZED CLOCK: All actions flow through SystemMind's epoch system.
 * CPB ROUTING: Actions are tagged with their optimal execution path.
 */

import { useSystemMind } from '../stores/useSystemMind';
import { useAppStore } from '../store';
import { cpbExecute, cpbExecutePath, extractPathSignals, selectPath } from './cognitivePrecisionBridge';
import type { CPBPath, CPBResult, CPBStatus } from './cognitivePrecisionBridge/types';

// =============================================================================
// Types
// =============================================================================

export type ActionComplexity = 'simple' | 'navigation' | 'analysis' | 'architecture' | 'critical';
export type ActionSource = 'component' | 'voice' | 'dom' | 'sovereign' | 'cpb';

export interface UnifiedAction {
    id: string;
    description: string;
    handler: (args: any) => Promise<any>;

    // Synchronized clock (sectors + priority)
    sectors: string[];
    priority: number;

    // CPB execution routing
    executionPath: CPBPath | 'auto';
    complexity: ActionComplexity;

    // Metadata
    source: ActionSource;
    examples?: string[];
    requiresContext?: boolean;
}

export interface ExecutionResult {
    success: boolean;
    actionId: string;
    output: any;
    executionPath: CPBPath;
    dqScore?: number;
    executionTimeMs?: number;
}

// =============================================================================
// Complexity to CPB Path Mapping
// =============================================================================

const COMPLEXITY_TO_PATH: Record<ActionComplexity, CPBPath | 'auto'> = {
    simple: 'direct',
    navigation: 'direct',
    analysis: 'ace',
    architecture: 'hybrid',
    critical: 'cascade'
};

// =============================================================================
// Unified Registry State
// =============================================================================

interface UnifiedRegistryState {
    actions: Map<string, UnifiedAction>;
    initialized: boolean;
    lastUpdate: number;
}

const registryState: UnifiedRegistryState = {
    actions: new Map(),
    initialized: false,
    lastUpdate: 0
};

// =============================================================================
// Registration Functions
// =============================================================================

/**
 * Register a single action with full metadata
 */
export function registerUnifiedAction(action: UnifiedAction): void {
    registryState.actions.set(action.id, action);
    registryState.lastUpdate = Date.now();

    // Also register with SystemMind for epoch tracking
    const systemMind = useSystemMind.getState();
    systemMind.registerAction(
        action.id,
        `[${action.source.toUpperCase()}:${action.complexity}] ${action.description}`,
        action.handler,
        { sectors: action.sectors, priority: action.priority }
    );
}

/**
 * Register multiple actions efficiently (single epoch increment)
 */
export function registerUnifiedActions(actions: UnifiedAction[]): void {
    for (const action of actions) {
        registryState.actions.set(action.id, action);
    }
    registryState.lastUpdate = Date.now();

    // Bulk register with SystemMind
    const systemMind = useSystemMind.getState();
    systemMind.registerActions(actions.map(action => ({
        id: action.id,
        description: `[${action.source.toUpperCase()}:${action.complexity}] ${action.description}`,
        callback: action.handler,
        sectors: action.sectors,
        priority: action.priority
    })));
}

/**
 * Unregister an action
 */
export function unregisterUnifiedAction(actionId: string): void {
    registryState.actions.delete(actionId);
    useSystemMind.getState().unregisterAction(actionId);
}

// =============================================================================
// Query & Execution Functions
// =============================================================================

/**
 * Get all actions, optionally filtered by sector
 */
export function getActions(sector?: string): UnifiedAction[] {
    const actions = Array.from(registryState.actions.values());

    if (!sector) return actions;

    // Filter and sort by relevance to sector
    return actions
        .map(action => {
            let relevance = action.priority;

            if (action.sectors.length === 0) {
                // Global action
                relevance += 5;
            } else if (action.sectors.some(s =>
                s.toUpperCase() === sector.toUpperCase() ||
                sector.toUpperCase().includes(s.toUpperCase())
            )) {
                // Sector-specific action
                relevance += 30;
            } else {
                // Non-relevant sectored action
                relevance -= 20;
            }

            return { action, relevance };
        })
        .sort((a, b) => b.relevance - a.relevance)
        .map(item => item.action);
}

/**
 * Get action by ID
 */
export function getAction(actionId: string): UnifiedAction | undefined {
    return registryState.actions.get(actionId);
}

/**
 * Find actions matching a query (fuzzy search)
 */
export function findActions(query: string, limit = 10): UnifiedAction[] {
    const normalized = query.toLowerCase();
    const words = normalized.split(/\s+/);

    return Array.from(registryState.actions.values())
        .map(action => {
            const text = `${action.id} ${action.description} ${action.examples?.join(' ') || ''}`.toLowerCase();

            // Score based on word matches
            let score = 0;
            for (const word of words) {
                if (text.includes(word)) score += 10;
                if (action.id.toLowerCase().includes(word)) score += 20;
            }

            // Boost by priority
            score += action.priority / 10;

            return { action, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.action);
}

/**
 * Determine the optimal CPB execution path for a query
 */
export function routeQuery(query: string, context?: string): {
    path: CPBPath;
    reasoning: string;
    confidence: number;
    matchedActions: UnifiedAction[];
} {
    // Find matching actions
    const matchedActions = findActions(query, 5);

    // If we have a direct action match with known complexity, use its path
    if (matchedActions.length > 0 && matchedActions[0].executionPath !== 'auto') {
        const topAction = matchedActions[0];
        return {
            path: topAction.executionPath as CPBPath,
            reasoning: `Matched action "${topAction.id}" with complexity "${topAction.complexity}"`,
            confidence: 0.85,
            matchedActions
        };
    }

    // Otherwise, use CPB's path selection
    const signals = extractPathSignals({ query, context });
    const decision = selectPath(signals);

    return {
        path: decision.path,
        reasoning: decision.reasoning,
        confidence: decision.confidence,
        matchedActions
    };
}

/**
 * Execute a query through CPB with optimal routing
 */
export async function executeQuery(
    query: string,
    context?: string,
    onStatus?: (status: CPBStatus) => void
): Promise<ExecutionResult> {
    const routing = routeQuery(query, context);
    const startTime = Date.now();

    try {
        // If we matched a specific action, execute it directly
        if (routing.matchedActions.length > 0 && routing.confidence > 0.8) {
            const action = routing.matchedActions[0];

            // For simple/navigation actions, execute directly
            if (action.complexity === 'simple' || action.complexity === 'navigation') {
                const result = await action.handler({ query, context });
                return {
                    success: true,
                    actionId: action.id,
                    output: result,
                    executionPath: 'direct',
                    executionTimeMs: Date.now() - startTime
                };
            }
        }

        // Route through CPB for complex queries
        let cpbResult: CPBResult;
        if (routing.path === 'direct') {
            cpbResult = await cpbExecutePath('direct', query, context, onStatus);
        } else {
            cpbResult = await cpbExecutePath(routing.path, query, context, onStatus);
        }

        return {
            success: true,
            actionId: routing.matchedActions[0]?.id || 'cpb_query',
            output: cpbResult.output,
            executionPath: cpbResult.path,
            dqScore: cpbResult.dqScore.score,
            executionTimeMs: cpbResult.executionTimeMs
        };
    } catch (error: any) {
        return {
            success: false,
            actionId: routing.matchedActions[0]?.id || 'cpb_query',
            output: { error: error.message },
            executionPath: routing.path,
            executionTimeMs: Date.now() - startTime
        };
    }
}

/**
 * Execute a specific action by ID with CPB routing
 */
export async function executeAction(
    actionId: string,
    args: any = {},
    onStatus?: (status: CPBStatus) => void
): Promise<ExecutionResult> {
    const action = getAction(actionId);
    const startTime = Date.now();

    if (!action) {
        return {
            success: false,
            actionId,
            output: { error: `Action "${actionId}" not found` },
            executionPath: 'direct',
            executionTimeMs: Date.now() - startTime
        };
    }

    try {
        // For simple actions, execute directly
        if (action.complexity === 'simple' || action.complexity === 'navigation' || action.executionPath === 'direct') {
            const result = await action.handler(args);
            return {
                success: true,
                actionId,
                output: result,
                executionPath: 'direct',
                executionTimeMs: Date.now() - startTime
            };
        }

        // For complex actions, wrap in CPB for quality scoring
        const path = action.executionPath === 'auto'
            ? COMPLEXITY_TO_PATH[action.complexity]
            : action.executionPath;

        // Execute through CPB
        const cpbResult = await cpbExecutePath(
            path as CPBPath,
            `Execute action: ${action.description}`,
            JSON.stringify(args),
            onStatus
        );

        // Also execute the actual action handler
        const actionResult = await action.handler(args);

        return {
            success: true,
            actionId,
            output: { actionResult, cpbOutput: cpbResult.output },
            executionPath: cpbResult.path,
            dqScore: cpbResult.dqScore.score,
            executionTimeMs: Date.now() - startTime
        };
    } catch (error: any) {
        return {
            success: false,
            actionId,
            output: { error: error.message },
            executionPath: action.executionPath === 'auto' ? 'direct' : action.executionPath as CPBPath,
            executionTimeMs: Date.now() - startTime
        };
    }
}

// =============================================================================
// Context Generation for Voice
// =============================================================================

/**
 * Generate context string for voice AI with CPB routing info
 */
export function generateVoiceContext(sector?: string): string {
    const actions = getActions(sector).slice(0, 50);
    const currentMode = useAppStore.getState().mode;

    let context = `
=== UNIFIED ACTION REGISTRY ===
Current Sector: ${sector || currentMode || 'GLOBAL'}
Total Actions: ${registryState.actions.size}
Relevant Actions: ${actions.length}

EXECUTION PATHS:
- direct: Fast, simple queries (navigation, status, simple facts)
- rlm: Long context requiring compression (document analysis, large codebases)
- ace: Multi-agent consensus (architecture decisions, trade-off evaluation)
- hybrid: RLM + ACE (complex analysis with long context)
- cascade: Full verification (critical decisions, production code)

AVAILABLE ACTIONS (sorted by relevance):
`;

    // Group by complexity
    const byComplexity: Record<ActionComplexity, UnifiedAction[]> = {
        simple: [],
        navigation: [],
        analysis: [],
        architecture: [],
        critical: []
    };

    for (const action of actions) {
        byComplexity[action.complexity].push(action);
    }

    for (const [complexity, complexityActions] of Object.entries(byComplexity)) {
        if (complexityActions.length === 0) continue;

        context += `\n[${complexity.toUpperCase()}] (→ ${COMPLEXITY_TO_PATH[complexity as ActionComplexity]})\n`;
        for (const action of complexityActions.slice(0, 10)) {
            context += `  • ${action.id}: ${action.description}\n`;
        }
    }

    return context;
}

// =============================================================================
// Initialization
// =============================================================================

let isInitialized = false;

/**
 * Initialize the unified registry by importing from all sources
 */
export async function initializeUnifiedRegistry(): Promise<void> {
    if (isInitialized) return;

    console.log('[UnifiedRegistry] Initializing...');

    // Import existing registries
    const { getAllComponentActions } = await import('./componentActionRegistry');
    const { getVoiceActions } = await import('./voiceActionRegistry');

    // Convert component actions
    const componentActions = getAllComponentActions();
    const unifiedComponentActions: UnifiedAction[] = componentActions.map(action => ({
        id: action.id,
        description: action.description,
        handler: action.handler,
        sectors: getSectorsForComponent(action.component),
        priority: action.priority || getPriorityForCategory(action.category),
        executionPath: getPathForCategory(action.category),
        complexity: getComplexityForCategory(action.category),
        source: 'component' as ActionSource
    }));

    // Convert voice actions
    const voiceActions = getVoiceActions();
    const unifiedVoiceActions: UnifiedAction[] = voiceActions.map(action => ({
        id: action.id,
        description: action.description,
        handler: action.handler,
        sectors: action.sector ? [action.sector] : [],
        priority: action.priority || 70,
        executionPath: getPathForVoiceCategory(action.category),
        complexity: getComplexityForVoiceCategory(action.category),
        source: 'voice' as ActionSource,
        examples: action.examples
    }));

    // Register all
    registerUnifiedActions([...unifiedComponentActions, ...unifiedVoiceActions]);

    isInitialized = true;
    registryState.initialized = true;

    console.log(`[UnifiedRegistry] Initialized with ${registryState.actions.size} actions`);
}

// =============================================================================
// Helper Functions
// =============================================================================

function getSectorsForComponent(component: string): string[] {
    const COMPONENT_TO_SECTORS: Record<string, string[]> = {
        'ImageGen': ['IMAGE_GEN', 'ASSETS'],
        'CodeStudio': ['CODE_STUDIO', 'CODE'],
        'ArchonDashboard': ['ARCHON'],
        'MemoryCore': ['MEMORY_CORE', 'MEMORY'],
        'AgentControlCenter': ['AGENT_CONTROL', 'AGENTS'],
        'BicameralEngine': ['BICAMERAL', 'BIBLIOMORPHIC'],
        'AutonomousFinance': ['AUTONOMOUS_FINANCE', 'FINANCE'],
        'HardwareEngine': ['HARDWARE_ENGINEER', 'HARDWARE'],
        'ProcessVisualizer': ['PROCESS_MAP', 'PROCESS'],
        'Dashboard': ['DASHBOARD'],
        'CommandPalette': [],
        'Search': [],
        'VoiceMode': ['VOICE_MODE', 'VOICE'],
        'DiscoveryLab': ['BIBLIOMORPHIC', 'DISCOVERY'],
        'Evolution': ['BIBLIOMORPHIC', 'EVOLUTION'],
        'Agora': ['BIBLIOMORPHIC', 'AGORA'],
        'CPB': ['CPB_TEST', 'CPB'],
        'UI': [],
        'KnowledgeGraph': ['PROCESS_MAP', 'KNOWLEDGE'],
        'Hub': ['METAVENTIONS_HUB', 'HUB'],
        'SynthesisBridge': ['SYNTHESIS_BRIDGE', 'BRIDGE'],
        'BibliomorphicEngine': ['BIBLIOMORPHIC'],
    };
    return COMPONENT_TO_SECTORS[component] || [];
}

function getPriorityForCategory(category: string): number {
    const priorities: Record<string, number> = {
        generate: 80,
        execute: 75,
        analyze: 70,
        manage: 60,
        navigate: 55,
        ui: 40
    };
    return priorities[category] || 50;
}

function getPathForCategory(category: string): CPBPath | 'auto' {
    const paths: Record<string, CPBPath | 'auto'> = {
        generate: 'ace',
        execute: 'direct',
        analyze: 'ace',
        manage: 'direct',
        navigate: 'direct',
        ui: 'direct'
    };
    return paths[category] || 'auto';
}

function getComplexityForCategory(category: string): ActionComplexity {
    const complexities: Record<string, ActionComplexity> = {
        generate: 'architecture',
        execute: 'simple',
        analyze: 'analysis',
        manage: 'simple',
        navigate: 'navigation',
        ui: 'simple'
    };
    return complexities[category] || 'simple';
}

function getPathForVoiceCategory(category: string): CPBPath | 'auto' {
    const paths: Record<string, CPBPath | 'auto'> = {
        generate: 'hybrid',
        execute: 'direct',
        deploy: 'cascade',
        analyze: 'ace',
        search: 'rlm',
        manage: 'direct',
        navigate: 'direct'
    };
    return paths[category] || 'auto';
}

function getComplexityForVoiceCategory(category: string): ActionComplexity {
    const complexities: Record<string, ActionComplexity> = {
        generate: 'architecture',
        execute: 'simple',
        deploy: 'critical',
        analyze: 'analysis',
        search: 'analysis',
        manage: 'simple',
        navigate: 'navigation'
    };
    return complexities[category] || 'simple';
}

// =============================================================================
// Exports
// =============================================================================

export {
    registryState,
    isInitialized
};
