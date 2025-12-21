
import { useState, useCallback } from 'react';
import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";
import { OS_TOOLS, ToolName } from '../services/toolRegistry';
import { AgenticState, ToolResult } from '../types';
import { useAppStore } from '../store';
import { KNOWLEDGE_LAYERS } from '../data/knowledgeLayers';

/**
 * SOVEREIGN AGENTIC RUNTIME
 * Hook to manage complex tool-calling loops with Metaventions OS.
 */
export const useAgentRuntime = () => {
    const [state, setState] = useState<AgenticState>({
        isThinking: false,
        activeTool: null,
        lastResult: null,
        history: []
    });

    const addLog = useAppStore(s => s.addLog);
    const knowledge = useAppStore(s => s.knowledge);

    // 1. Gather active tools based on Knowledge Layers
    const getActiveToolsManifest = useCallback((): FunctionDeclaration[] => {
        const activeLayers = knowledge.activeLayers || [];
        const declarations: FunctionDeclaration[] = [];

        // System Default Tools
        declarations.push({
            name: 'system_navigate',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    target: { type: Type.STRING, description: 'The target OS sector (e.g., DASHBOARD, CODE_STUDIO, HARDWARE_ENGINEER)' }
                },
                required: ['target']
            },
            description: 'Navigate the Metaventions OS to a different sector.'
        });

        // Builder Protocol Specifics
        if (activeLayers.includes('BUILDER_PROTOCOL')) {
            declarations.push({
                name: 'bigquery_query',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        query: { type: Type.STRING, description: 'SQL query for BigQuery environment.' }
                    },
                    required: ['query']
                },
                description: 'Execute a SQL query against the system BigQuery data warehouse.'
            });
            declarations.push({
                name: 'github_repo_scan',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        repo: { type: Type.STRING, description: 'GitHub repository path.' }
                    },
                    required: ['repo']
                },
                description: 'Scan a repository for active branches and deployment status.'
            });
        }

        // Crypto Context Specifics
        if (activeLayers.includes('CRYPTO_CONTEXT')) {
            declarations.push({
                name: 'ethers_balance_check',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        address: { type: Type.STRING, description: 'Ethereum wallet address.' }
                    },
                    required: ['address']
                },
                description: 'Check the on-chain balance and valuation of a specified wallet.'
            });
        }

        return declarations;
    }, [knowledge.activeLayers]);

    // 2. THE RUNTIME LOOP
    const execute = useCallback(async (userPrompt: string) => {
        setState(prev => ({ ...prev, isThinking: true, history: [...prev.history, { role: 'user', content: userPrompt }] }));
        addLog('SYSTEM', 'AGENT_RUNTIME: Evaluating intent vectors...');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const tools = getActiveToolsManifest();

            // STEP A: Initial Model Call
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: userPrompt,
                config: {
                    tools: [{ functionDeclarations: tools }]
                }
            });

            // STEP B: Check for Tool Request
            if (response.functionCalls && response.functionCalls.length > 0) {
                const call = response.functionCalls[0];
                const toolName = call.name as ToolName;
                
                setState(prev => ({ ...prev, activeTool: toolName }));
                addLog('INFO', `AGENT_RUNTIME: Engaging tool [${toolName}]...`);

                // STEP C: Execute local logic
                const toolLogic = OS_TOOLS[toolName];
                if (!toolLogic) throw new Error(`Capability ${toolName} not found in motor cortex.`);

                const result: ToolResult = await (toolLogic as any)(call.args);
                
                setState(prev => ({ 
                    ...prev, 
                    lastResult: result, 
                    activeTool: null,
                    history: [...prev.history, { role: 'tool', content: JSON.stringify(result.data), toolName }]
                }));

                // STEP D: Synthesis Call (Feed back to Gemini)
                const finalResponse = await ai.models.generateContent({
                    model: 'gemini-3-pro-preview',
                    contents: [
                        { role: 'user', parts: [{ text: userPrompt }] },
                        { role: 'model', parts: [{ functionCall: call }] },
                        { role: 'user', parts: [{ functionResponse: { name: toolName, response: result.data } }] }
                    ]
                });

                setState(prev => ({ 
                    ...prev, 
                    isThinking: false, 
                    history: [...prev.history, { role: 'model', content: finalResponse.text || 'Process synthesized.' }] 
                }));
                addLog('SUCCESS', 'AGENT_RUNTIME: Operation finalized.');
                return finalResponse.text;

            } else {
                // No tool needed
                setState(prev => ({ 
                    ...prev, 
                    isThinking: false, 
                    history: [...prev.history, { role: 'model', content: response.text || '' }] 
                }));
                return response.text;
            }

        } catch (err: any) {
            console.error("Runtime Exception:", err);
            setState(prev => ({ ...prev, isThinking: false }));
            addLog('ERROR', `AGENT_RUNTIME_FAIL: ${err.message}`);
            throw err;
        }
    }, [getActiveToolsManifest, addLog]);

    return { execute, state };
};
