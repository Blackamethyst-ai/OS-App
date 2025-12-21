
import { AppMode, ToolResult } from '../types';
import { useAppStore } from '../store';
import { generateStructuredWorkflow } from './geminiService';

/**
 * SOVEREIGN TOOL REGISTRY
 * Maps MCP Manifest Identifiers to actual executable code.
 */
export const OS_TOOLS = {
    // 1. ARCHITECTURAL PROTOCOLS
    architect_generate_process: async (args: { description: string; type: 'DRIVE_ORGANIZATION' | 'SYSTEM_ARCHITECTURE' | 'AGENTIC_ORCHESTRATION' }): Promise<ToolResult> => {
        const { setProcessState, addLog } = useAppStore.getState();
        console.log(`[Architect] Designing ${args.type}: ${args.description}`);
        
        addLog('SYSTEM', `ARCHITECT: Synthesizing ${args.type} topology...`);
        
        try {
            // Enhanced prompt instruction for specialized domains
            const domainContext = args.type === 'DRIVE_ORGANIZATION' 
                ? "Focus on file management workflows, naming conventions, and PARA-based directory structures." 
                : args.type === 'SYSTEM_ARCHITECTURE'
                ? "Focus on high-availability, low-latency, and zero-trust security layers."
                : "Focus on swarm consensus and autonomous agency.";

            const workflow = await generateStructuredWorkflow([], 'SOVEREIGN_CORE', args.type, { 
                prompt: `${args.description} | CONTEXT: ${domainContext}` 
            });
            
            setProcessState({ 
                generatedWorkflow: workflow, 
                activeTab: 'workflow',
                workflowType: args.type 
            });

            return {
                toolName: 'architect_generate_process',
                status: 'SUCCESS',
                data: { 
                    message: `Lattice for ${args.type} crystallized. Transitioning to Protocol Loom.`,
                    folders: workflow.taxonomy?.root?.map((r: any) => r.folder)
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

    // 2. DATA TOOLS (BIGQUERY / ANALYTICS)
    bigquery_query: async (args: { query: string; projectId?: string }): Promise<ToolResult> => {
        console.log(`[BigQuery] Executing: ${args.query}`);
        const mockData = [
            { id: 1, user: 'Aris_01', plan: 'Architect', status: 'Active', sign_up: '2023-11-20' },
            { id: 2, user: 'Nova_Edge', plan: 'Operator', status: 'Pending', sign_up: '2023-11-21' },
            { id: 3, user: 'Cypher_PK', plan: 'Architect', status: 'Active', sign_up: '2023-11-22' }
        ];
        return {
            toolName: 'bigquery_query',
            status: 'SUCCESS',
            data: mockData,
            uiHint: 'TABLE'
        };
    },

    // 3. SYSTEM NAVIGATION
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

    // 4. CRYPTO CONTEXT TOOLS
    ethers_balance_check: async (args: { address: string }): Promise<ToolResult> => {
        return {
            toolName: 'ethers_balance_check',
            status: 'SUCCESS',
            data: { address: args.address, eth: '124.52', usd: '$254,120.00' },
            uiHint: 'STAT'
        };
    },

    // 5. CODE & REPO SCANNING
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
