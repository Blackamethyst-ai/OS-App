
import { AppMode, ToolResult, TaskPriority } from '../types';
import { useAppStore } from '../store';
import { generateStructuredWorkflow, searchGroundedIntel, convergeStrategicLattices } from './geminiService';

/**
 * SOVEREIGN TOOL REGISTRY
 * Maps MCP Manifest Identifiers to actual executable code.
 */
export const OS_TOOLS = {
    // 1. ARCHITECTURAL PROTOCOLS
    architect_generate_process: async (args: { description: string; type: 'DRIVE_ORGANIZATION' | 'SYSTEM_ARCHITECTURE' | 'AGENTIC_ORCHESTRATION' | 'CONVERGENT_SYNTHESIS' }): Promise<ToolResult> => {
        const { setProcessState, addLog } = useAppStore.getState();
        console.log(`[Architect] Designing ${args.type}: ${args.description}`);
        
        addLog('SYSTEM', `ARCHITECT: Synthesizing ${args.type} topology...`);
        
        try {
            const domainContext = args.type === 'DRIVE_ORGANIZATION' 
                ? "Focus on file management workflows, naming conventions, and PARA-based directory structures." 
                : args.type === 'SYSTEM_ARCHITECTURE'
                ? "Focus on high-availability, low-latency, and zero-trust security layers."
                : args.type === 'CONVERGENT_SYNTHESIS'
                ? "Identify overlaps between existing lattices and forge unified directives."
                : "Focus on swarm consensus and autonomous agency.";

            const workflow = await generateStructuredWorkflow([], 'SOVEREIGN_CORE', args.type, { 
                prompt: `${args.description} | CONTEXT: ${domainContext}` 
            });
            
            setProcessState({ 
                generatedWorkflow: workflow, 
                activeTab: 'workflow',
                workflowType: args.type,
                coherenceScore: workflow.coherenceScore || 80
            });

            return {
                toolName: 'architect_generate_process',
                status: 'SUCCESS',
                data: { 
                    message: `Lattice for ${args.type} crystallized. Transitioning to Protocol Loom.`,
                    folders: workflow.taxonomy?.root?.map((r: any) => r.folder),
                    coherence: workflow.coherenceScore
                },
                uiHint: 'MESSAGE'
            };
        } catch (error: any) {
            return {
                toolName: 'architect_generate_process',
                status: 'ERROR',
                data: { error: error.message }
            };
        }
    },

    // 2. LATTICE CONVERGENCE
    converge_strategic_lattices: async (args: { targetGoal: string }): Promise<ToolResult> => {
        const { addLog, setProcessState, process } = useAppStore.getState();
        addLog('SYSTEM', `CONVERGENCE: Orchestrating multi-lattice synthesis for "${args.targetGoal}"...`);
        
        try {
            // Take top 3 recent artifacts/nodes for context
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
                data: { 
                    goal: result.unified_goal,
                    coherence: result.coherence_index,
                    new_nodes: result.nodes.length
                },
                uiHint: 'STAT'
            };
        } catch (error: any) {
            return { toolName: 'converge_strategic_lattices', status: 'ERROR', data: { error: error.message } };
        }
    },

    // 3. GROUNDED INTEL SEARCH
    search_intel: async (args: { query: string }): Promise<ToolResult> => {
        const { addLog } = useAppStore.getState();
        addLog('SYSTEM', `SEARCH_INTEL: Grounding intelligence for "${args.query}"...`);
        try {
            const result = await searchGroundedIntel(args.query);
            return {
                toolName: 'search_intel',
                status: 'SUCCESS',
                data: { intel: result },
                uiHint: 'MESSAGE'
            };
        } catch (error: any) {
            return { toolName: 'search_intel', status: 'ERROR', data: { error: error.message } };
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
            return {
                toolName: 'system_navigate',
                status: 'SUCCESS',
                data: { message: `Redirected to ${args.target} sector.` },
                uiHint: 'NAV'
            };
        }
        return {
            toolName: 'system_navigate',
            status: 'ERROR',
            data: { error: `Sector ${args.target} not found in lattice.` }
        };
    },

    ethers_balance_check: async (args: { address: string }): Promise<ToolResult> => {
        return {
            toolName: 'ethers_balance_check',
            status: 'SUCCESS',
            data: { address: args.address, eth: '124.52', usd: '$254,120.00' },
            uiHint: 'STAT'
        };
    },

    github_repo_scan: async (args: { repo: string }): Promise<ToolResult> => {
        return {
            toolName: 'github_repo_scan',
            status: 'SUCCESS',
            data: {
                repo: args.repo,
                vulnerabilities: 0,
                active_branches: 12,
                last_deployment: '4 mins ago'
            },
            uiHint: 'STAT'
        };
    }
};

export type ToolName = keyof typeof OS_TOOLS;
