/**
 * CODEBASE AWARENESS SERVICE
 *
 * Provides intelligent awareness of the OS-App codebase structure
 * for voice-controlled navigation and context-aware interactions.
 *
 * Features:
 * - Reads and indexes codebase_graph.json
 * - Maps natural language commands to UI destinations
 * - Generates tool definitions for AI providers
 * - Supports alias matching ("logic studio" → CODE_STUDIO)
 * - Tracks component capabilities and routes
 */

import { AppMode } from '../types';

// =============================================================================
// Types
// =============================================================================

export interface CodebaseNode {
    id: string;
    label: string;
    type: 'file' | 'folder';
    path?: string;
    relPath?: string;
    parentId?: string;
    radius?: number;
    risk?: string;
    tier?: number;
    isArchitectural?: boolean;
}

export interface CodebaseEdge {
    source: string;
    target: string;
    type?: string;
}

export interface CodebaseGraph {
    nodes: CodebaseNode[];
    edges: CodebaseEdge[];
}

export interface ComponentDefinition {
    id: string;
    mode: AppMode;
    route: string;
    displayName: string;
    aliases: string[];
    capabilities: string[];
    subtabs?: string[];
    description: string;
}

export interface NavigationMatch {
    component: ComponentDefinition;
    confidence: number;
    matchedAlias?: string;
    matchedCapability?: string;
}

export interface ToolDefinition {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: Record<string, { type: string; description: string; enum?: string[] }>;
        required: string[];
    };
}

// =============================================================================
// Component Registry
// =============================================================================

/**
 * Comprehensive registry of all UI components/modes with aliases and capabilities.
 * This enables natural language navigation like "go to logic studio" or "open agents".
 */
const COMPONENT_REGISTRY: ComponentDefinition[] = [
    {
        id: 'dashboard',
        mode: AppMode.DASHBOARD,
        route: '/dashboard',
        displayName: 'Dashboard',
        aliases: ['dashboard', 'home', 'main', 'ecosystem', 'hub', 'overview', 'start'],
        capabilities: ['overview', 'metrics', 'status', 'quick actions'],
        description: 'Main dashboard with system overview and metrics'
    },
    {
        id: 'metaventions-hub',
        mode: AppMode.METAVENTIONS_HUB,
        route: '/metaventions-hub',
        displayName: 'Metaventions Hub',
        aliases: ['metaventions', 'hub', 'inventions', 'ideas', 'innovation'],
        capabilities: ['ideation', 'invention tracking', 'project management'],
        description: 'Innovation and invention management hub'
    },
    {
        id: 'bibliomorphic',
        mode: AppMode.BIBLIOMORPHIC,
        route: '/bibliomorphic',
        displayName: 'Discovery Lab',
        aliases: ['discovery', 'lab', 'research', 'bibliomorphic', 'discovery lab', 'explore'],
        capabilities: ['research', 'discovery', 'knowledge exploration', 'semantic search'],
        description: 'Research and discovery interface'
    },
    {
        id: 'bicameral',
        mode: AppMode.BICAMERAL,
        route: '/bibliomorphic/bicameral',
        displayName: 'Bicameral',
        aliases: ['bicameral', 'dual mind', 'two minds', 'debate'],
        capabilities: ['dual reasoning', 'debate', 'dialectic analysis'],
        description: 'Bicameral reasoning and dual-agent dialogue'
    },
    {
        id: 'process-map',
        mode: AppMode.PROCESS_MAP,
        route: '/process',
        displayName: 'Process Map',
        aliases: ['process', 'topology', 'workflow', 'map', 'flow', 'processes'],
        capabilities: ['workflow visualization', 'process modeling', 'topology'],
        description: 'Process and workflow visualization'
    },
    {
        id: 'memory-core',
        mode: AppMode.MEMORY_CORE,
        route: '/memory',
        displayName: 'Memory Core',
        aliases: ['memory', 'vault', 'storage', 'archive', 'recall', 'memories'],
        capabilities: ['memory storage', 'recall', 'context management', 'search'],
        description: 'Memory management and retrieval system'
    },
    {
        id: 'image-gen',
        mode: AppMode.IMAGE_GEN,
        route: '/assets',
        displayName: 'Image Generation',
        aliases: ['image', 'images', 'assets', 'cinema', 'visual', 'generate image', 'art', 'pictures'],
        capabilities: ['image generation', 'asset management', 'visual creation'],
        description: 'AI image generation and asset management'
    },
    {
        id: 'hardware-engineer',
        mode: AppMode.HARDWARE_ENGINEER,
        route: '/hardware',
        displayName: 'Hardware Engineer',
        aliases: ['hardware', 'infra', 'infrastructure', 'systems', 'engineering'],
        capabilities: ['hardware design', 'infrastructure', 'system engineering'],
        description: 'Hardware and infrastructure engineering'
    },
    {
        id: 'code-studio',
        mode: AppMode.CODE_STUDIO,
        route: '/code',
        displayName: 'Code Studio',
        aliases: ['code', 'logic', 'logic studio', 'coding', 'programming', 'code studio', 'develop', 'editor'],
        capabilities: ['code generation', 'programming', 'development', 'code review'],
        description: 'AI-powered code generation and development environment'
    },
    {
        id: 'voice-mode',
        mode: AppMode.VOICE_MODE,
        route: '/voice',
        displayName: 'Voice Mode',
        aliases: ['voice', 'voice core', 'speak', 'audio', 'conversation'],
        capabilities: ['voice interaction', 'speech', 'audio control'],
        description: 'Voice-controlled interaction mode'
    },
    {
        id: 'synthesis-bridge',
        mode: AppMode.SYNTHESIS_BRIDGE,
        route: '/bridge',
        displayName: 'Synthesis Bridge',
        aliases: ['synthesis', 'bridge', 'connect', 'integrate', 'nexus'],
        capabilities: ['system integration', 'synthesis', 'bridging'],
        description: 'Cross-system synthesis and integration'
    },
    {
        id: 'agent-control',
        mode: AppMode.AGENT_CONTROL,
        route: '/agents',
        displayName: 'Agent Control',
        aliases: ['agents', 'swarm', 'agent control', 'ai agents', 'bots', 'orchestration'],
        capabilities: ['agent management', 'orchestration', 'multi-agent control'],
        description: 'Multi-agent orchestration and control center'
    },
    {
        id: 'autonomous-finance',
        mode: AppMode.AUTONOMOUS_FINANCE,
        route: '/finance',
        displayName: 'Autonomous Finance',
        aliases: ['finance', 'treasury', 'money', 'financial', 'budget', 'accounting'],
        capabilities: ['financial analysis', 'treasury management', 'budgeting'],
        description: 'Autonomous financial management system'
    },
    {
        id: 'agent-core-test',
        mode: AppMode.AGENT_CORE_TEST,
        route: '/agent-core-test',
        displayName: 'Agent Core Test',
        aliases: ['agent core', 'agent test', 'core test', 'testing'],
        capabilities: ['agent testing', 'core diagnostics'],
        description: 'Agent core testing and diagnostics'
    },
    {
        id: 'cpb-test',
        mode: AppMode.CPB_TEST,
        route: '/cpb-test',
        displayName: 'CPB Test',
        aliases: ['cpb', 'cascade', 'cpb test', 'cascade test'],
        subtabs: ['cascade', 'parallel', 'branch', 'sequence'],
        capabilities: ['CPB testing', 'cascade operations', 'parallel processing'],
        description: 'Cascade/Parallel/Branch testing interface'
    },
    {
        id: 'archon',
        mode: AppMode.ARCHON,
        route: '/archon',
        displayName: 'Archon',
        aliases: ['archon', 'architect', 'system architect', 'master'],
        capabilities: ['system architecture', 'high-level control', 'oversight'],
        description: 'System architecture and oversight'
    }
];

// =============================================================================
// Codebase Awareness Service
// =============================================================================

class CodebaseAwarenessService {
    private graph: CodebaseGraph | null = null;
    private componentIndex: Map<string, ComponentDefinition> = new Map();
    private aliasIndex: Map<string, ComponentDefinition> = new Map();
    private capabilityIndex: Map<string, ComponentDefinition[]> = new Map();
    private isInitialized = false;

    constructor() {
        this.buildIndices();
    }

    /**
     * Build lookup indices for fast matching
     */
    private buildIndices(): void {
        // Index by ID
        for (const component of COMPONENT_REGISTRY) {
            this.componentIndex.set(component.id, component);
            this.componentIndex.set(component.mode, component);

            // Index by aliases (lowercase)
            for (const alias of component.aliases) {
                this.aliasIndex.set(alias.toLowerCase(), component);
            }

            // Index by capabilities
            for (const capability of component.capabilities) {
                const capLower = capability.toLowerCase();
                const existing = this.capabilityIndex.get(capLower) || [];
                existing.push(component);
                this.capabilityIndex.set(capLower, existing);
            }
        }

        this.isInitialized = true;
    }

    /**
     * Load codebase graph from JSON file
     */
    async loadGraph(): Promise<void> {
        try {
            const response = await fetch('/codebase_graph.json');
            if (response.ok) {
                this.graph = await response.json();
                if (import.meta.env.DEV) console.log('CodebaseAwareness: Loaded graph with', this.graph?.nodes.length, 'nodes');
            }
        } catch (error) {
            console.warn('CodebaseAwareness: Could not load codebase_graph.json:', error);
            // Service still works without graph - just uses component registry
        }
    }

    /**
     * Find a component by natural language query
     * Returns the best match with confidence score
     */
    findComponent(query: string): NavigationMatch | null {
        if (!query) return null;

        const queryLower = query.toLowerCase().trim();
        const queryWords = queryLower.split(/\s+/);

        // 1. Exact alias match (highest confidence)
        const exactMatch = this.aliasIndex.get(queryLower);
        if (exactMatch) {
            return {
                component: exactMatch,
                confidence: 1.0,
                matchedAlias: queryLower
            };
        }

        // 2. Multi-word alias match
        for (const [alias, component] of this.aliasIndex.entries()) {
            if (queryLower.includes(alias) || alias.includes(queryLower)) {
                return {
                    component,
                    confidence: 0.9,
                    matchedAlias: alias
                };
            }
        }

        // 3. Single word match against aliases
        let bestMatch: NavigationMatch | null = null;
        let bestScore = 0;

        for (const word of queryWords) {
            if (word.length < 3) continue; // Skip short words

            for (const [alias, component] of this.aliasIndex.entries()) {
                if (alias.includes(word) || word.includes(alias)) {
                    const score = Math.min(word.length, alias.length) / Math.max(word.length, alias.length);
                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = {
                            component,
                            confidence: 0.7 * score,
                            matchedAlias: alias
                        };
                    }
                }
            }
        }

        if (bestMatch && bestMatch.confidence > 0.5) {
            return bestMatch;
        }

        // 4. Capability match
        for (const word of queryWords) {
            if (word.length < 4) continue;

            for (const [capability, components] of this.capabilityIndex.entries()) {
                if (capability.includes(word)) {
                    return {
                        component: components[0],
                        confidence: 0.6,
                        matchedCapability: capability
                    };
                }
            }
        }

        return null;
    }

    /**
     * Get component by mode
     */
    getByMode(mode: AppMode): ComponentDefinition | undefined {
        return this.componentIndex.get(mode);
    }

    /**
     * Get component by ID
     */
    getById(id: string): ComponentDefinition | undefined {
        return this.componentIndex.get(id);
    }

    /**
     * Get all components
     */
    getAllComponents(): ComponentDefinition[] {
        return [...COMPONENT_REGISTRY];
    }

    /**
     * Get navigation route for a mode
     */
    getRoute(mode: AppMode): string | undefined {
        return this.componentIndex.get(mode)?.route;
    }

    /**
     * Build context string for AI prompts
     */
    buildContext(currentMode?: AppMode): string {
        const modeList = COMPONENT_REGISTRY.map(c =>
            `- ${c.displayName} (${c.mode}): ${c.description}. Aliases: ${c.aliases.join(', ')}`
        ).join('\n');

        let context = `## Available UI Destinations\n${modeList}`;

        if (currentMode) {
            const current = this.componentIndex.get(currentMode);
            if (current) {
                context += `\n\n## Current Location\n${current.displayName} (${currentMode})\nCapabilities: ${current.capabilities.join(', ')}`;
                if (current.subtabs) {
                    context += `\nSubtabs: ${current.subtabs.join(', ')}`;
                }
            }
        }

        return context;
    }

    /**
     * Generate tool definitions for AI function calling
     */
    generateToolDefinitions(): ToolDefinition[] {
        return [
            {
                name: 'navigate_to_mode',
                description: 'Navigate to a specific mode/section of the application. Use this when the user wants to go somewhere.',
                parameters: {
                    type: 'OBJECT',
                    properties: {
                        target: {
                            type: 'STRING',
                            description: 'The target mode to navigate to',
                            enum: Object.values(AppMode)
                        },
                        subtab: {
                            type: 'STRING',
                            description: 'Optional subtab within the mode'
                        }
                    },
                    required: ['target']
                }
            },
            {
                name: 'search_codebase',
                description: 'Search the codebase for files, components, or code patterns.',
                parameters: {
                    type: 'OBJECT',
                    properties: {
                        query: {
                            type: 'STRING',
                            description: 'Search query for finding files or code'
                        },
                        type: {
                            type: 'STRING',
                            description: 'Type of search: file, component, or code',
                            enum: ['file', 'component', 'code']
                        }
                    },
                    required: ['query']
                }
            },
            {
                name: 'get_component_info',
                description: 'Get information about a UI component or mode.',
                parameters: {
                    type: 'OBJECT',
                    properties: {
                        component: {
                            type: 'STRING',
                            description: 'Name or mode of the component'
                        }
                    },
                    required: ['component']
                }
            }
        ];
    }

    /**
     * Parse navigation intent from text
     * Returns the intended mode and any subtab
     */
    parseNavigationIntent(text: string): { mode: AppMode; subtab?: string } | null {
        // Remove common navigation phrases
        const cleanText = text
            .toLowerCase()
            .replace(/^(go to|navigate to|open|show|take me to|switch to|head to)\s+/i, '')
            .replace(/\s+(please|now|quickly)$/i, '')
            .trim();

        const match = this.findComponent(cleanText);
        if (!match || match.confidence < 0.5) {
            return null;
        }

        // Check for subtab mentions
        let subtab: string | undefined;
        if (match.component.subtabs) {
            for (const tab of match.component.subtabs) {
                if (cleanText.includes(tab.toLowerCase())) {
                    subtab = tab;
                    break;
                }
            }
        }

        return {
            mode: match.component.mode,
            subtab
        };
    }

    /**
     * Get files from codebase graph
     */
    getFiles(filter?: { folder?: string; type?: string }): CodebaseNode[] {
        if (!this.graph) return [];

        return this.graph.nodes.filter(node => {
            if (node.type !== 'file') return false;
            if (filter?.folder && !node.path?.includes(filter.folder)) return false;
            if (filter?.type && !node.label.endsWith(filter.type)) return false;
            return true;
        });
    }

    /**
     * Get folder structure
     */
    getFolders(): CodebaseNode[] {
        if (!this.graph) return [];
        return this.graph.nodes.filter(node => node.type === 'folder');
    }

    /**
     * Check if service is ready
     */
    isReady(): boolean {
        return this.isInitialized;
    }

    /**
     * Get graph statistics
     */
    getStats(): { nodes: number; edges: number; components: number } {
        return {
            nodes: this.graph?.nodes.length || 0,
            edges: this.graph?.edges.length || 0,
            components: COMPONENT_REGISTRY.length
        };
    }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const codebaseAwareness = new CodebaseAwarenessService();

// Initialize graph loading (non-blocking)
if (typeof window !== 'undefined') {
    codebaseAwareness.loadGraph().catch(console.error);
}
