
import { AppMode, ToolResult } from '../types';
import { useAppStore } from '../store';

/**
 * SOVEREIGN TOOL REGISTRY
 * Maps MCP Manifest Identifiers to actual executable code.
 */
export const OS_TOOLS = {
    // 1. DATA TOOLS (BIGQUERY / ANALYTICS)
    bigquery_query: async (args: { query: string; projectId?: string }): Promise<ToolResult> => {
        console.log(`[BigQuery] Executing: ${args.query}`);
        // Simulation of data return
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

    // 2. SYSTEM NAVIGATION
    system_navigate: async (args: { target: string }): Promise<ToolResult> => {
        const setMode = useAppStore.getState().setMode;
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

    // 3. CRYPTO CONTEXT TOOLS
    ethers_balance_check: async (args: { address: string }): Promise<ToolResult> => {
        // Mocking balance
        return {
            toolName: 'ethers_balance_check',
            status: 'SUCCESS',
            data: { address: args.address, eth: '124.52', usd: '$254,120.00' },
            uiHint: 'STAT'
        };
    },

    // 4. CODE & REPO SCANNING
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
