import { AppMode, ToolResult, TaskPriority, MentalState } from '../types';
import { useAppStore } from '../store';
import { generateStructuredWorkflow, searchGroundedIntel, convergeStrategicLattices } from './geminiService';

/**
 * SOVEREIGN TOOL REGISTRY
 * Maps MCP Manifest Identifiers to actual executable code.
 */
export const OS_TOOLS = {
    // 1. ARCHITECTURAL PROTOCOLS (Enhanced with RAG-Anything Multi-modal Logic)
    architect_generate_process: async (args: { 
        description: string; 
        type: 'DRIVE_ORGANIZATION' | 'SYSTEM_ARCHITECTURE' | 'AGENTIC_ORCHESTRATION' | 'CONVERGENT_SYNTHESIS';
        custom_directive?: string;
        dna_profile?: Partial<MentalState>;
    }): Promise<ToolResult> => {
        const { setProcessState, addLog } = useAppStore.getState();
        
        addLog('SYSTEM', `ARCHITECT: Synthesizing ${args.type} topology with Multi-modal Parsing protocols...`);
        
        try {
            const domainContext = args.type === 'DRIVE_ORGANIZATION' 
                ? "Generate a high-fidelity PARA structure. Include Multi-modal Parsing stages: 1. Hierarchical Text Extraction, 2. Image Captioning/OCR, 3. Table Content Parsing, 4. Equation Recognition. Map these to root directories." 
                : args.type === 'SYSTEM_ARCHITECTURE'
                ? "Generate a cloud architecture with a dedicated Deep Ingestion Layer. Stages: Structured Content Listing -> Recursive Knowledge Grounding -> Hybrid Retrieval Bridge (Vector + Graph)."
                : "Focus on swarm consensus and autonomous agentic delegation.";

            const fullPrompt = `${args.description} | DOMAIN_GUIDANCE: ${domainContext} | DIRECTIVE: ${args.custom_directive || 'Standard Optimization'}`;

            const workflow = await generateStructuredWorkflow([], 'SOVEREIGN_CORE', args.type, { 
                prompt: fullPrompt,
                dna: args.dna_profile
            });
            
            setProcessState({ 
                generatedWorkflow: workflow, 
                activeTab: 'workflow',
                workflowType: args.type,
                coherenceScore: workflow.coherenceScore || 85
            });

            return {
                toolName: 'architect_generate_process',
                status: 'SUCCESS',
                data: { 
                    message: `Lattice for ${args.type} crystallized. Multi-modal parsing nodes verified.`,
                    coherence: workflow.coherenceScore,
                    sectors: workflow.taxonomy?.root?.length || 0
                },
                uiHint: 'MESSAGE'
            };
        } catch (error: any) {
            return { toolName: 'architect_generate_process', status: 'ERROR', data: { error: error.message } };
        }
    },

    // 2. DNA RECALIBRATION
    adjust_agent_dna: async (args: { 
        agentId: string; 
        weights: Partial<MentalState>;
        reasoning?: string;
    }): Promise<ToolResult> => {
        const { setVoiceState, addLog } = useAppStore.getState();
        
        setVoiceState(prev => ({
            mentalState: { ...prev.mentalState, ...args.weights }
        }));

        addLog('SUCCESS', `DNA_RECUT: Agent ${args.agentId} weights adjusted. Reasoning: ${args.reasoning || 'System optimization'}`);

        return {
            toolName: 'adjust_agent_dna',
            status: 'SUCCESS',
            data: { 
                agentId: args.agentId, 
                new_weights: args.weights,
                status: 'SYNAPTIC_BOND_STABLE' 
            },
            uiHint: 'STAT'
        };
    },

    // 3. LATTICE CONVERGENCE
    converge_strategic_lattices: async (args: { targetGoal: string }): Promise<ToolResult> => {
        const { addLog, setProcessState, process } = useAppStore.getState();
        addLog('SYSTEM', `CONVERGENCE: Orchestrating multi-lattice synthesis for "${args.targetGoal}"...`);
        
        try {
            const contextNodes = process.nodes.slice(-3);
            const result = await convergeStrategicLattices(contextNodes, args.targetGoal);
            
            setProcessState({ 
                nodes: result.nodes.map((n: any, i: number) => ({
                    id: n.id,
                    type: 'holographic',
                    position: { x: 500 + i * 100, y: 300 + i * 50 },
                    data: { label: n.label, subtext: 'CONVERGED_AXIOM', status: 'SYNTHESIZED', color: '#10b981' }
                })),
                coherenceScore: Math.round(result.coherence_index * 100)
            });

            return {
                toolName: 'converge_strategic_lattices',
                status: 'SUCCESS',
                data: { goal: result.unified_goal, coherence: result.coherence_index },
                uiHint: 'STAT'
            };
        } catch (error: any) {
            return { toolName: 'converge_strategic_lattices', status: 'ERROR', data: { error: error.message } };
        }
    },

    // 4. UI CONTEXT FOCUS
    focus_element: async (args: { selector: string }): Promise<ToolResult> => {
        const { setFocusedSelector, addLog } = useAppStore.getState();
        setFocusedSelector(args.selector);
        addLog('SUCCESS', `UI_FOCUS: Targeted element context [${args.selector}]`);
        return {
            toolName: 'focus_element',
            status: 'SUCCESS',
            data: { message: `Context focus shifted to ${args.selector}` },
            uiHint: 'NAV'
        };
    },

    // 5. TASK MANAGEMENT
    update_task_priority: async (args: { taskId: string, priority: TaskPriority }): Promise<ToolResult> => {
        const { updateTask, addLog } = useAppStore.getState();
        updateTask(args.taskId, { priority: args.priority });
        addLog('SUCCESS', `TASK_UPDATE: Prioritized task ${args.taskId} to ${args.priority}`);
        return {
            toolName: 'update_task_priority',
            status: 'SUCCESS',
            data: { message: `Priority adjusted.` },
            uiHint: 'MESSAGE'
        };
    },

    // 6. SYSTEM NAVIGATION
    system_navigate: async (args: { target: string }): Promise<ToolResult> => {
        const { setMode } = useAppStore.getState();
        const targetMode = AppMode[args.target.toUpperCase() as keyof typeof AppMode];
        
        if (targetMode) {
            setMode(targetMode);
            return { toolName: 'system_navigate', status: 'SUCCESS', data: { message: `Redirected to ${args.target} sector.` }, uiHint: 'NAV' };
        }
        return { toolName: 'system_navigate', status: 'ERROR', data: { error: `Sector ${args.target} not found.` } };
    },

    // 7. SEARCH INTELLIGENCE
    search_intel: async (args: { query: string }): Promise<ToolResult> => {
        const { addLog } = useAppStore.getState();
        addLog('SYSTEM', `SEARCH_INTEL: Grounding intelligence for "${args.query}"...`);
        
        try {
            const result = await searchGroundedIntel(args.query);
            return {
                toolName: 'search_intel',
                status: 'SUCCESS',
                data: { message: result },
                uiHint: 'MESSAGE'
            };
        } catch (error: any) {
            return { toolName: 'search_intel', status: 'ERROR', data: { error: error.message } };
        }
    }
};

export type ToolName = keyof typeof OS_TOOLS;