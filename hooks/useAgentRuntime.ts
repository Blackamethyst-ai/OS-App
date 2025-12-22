import { useState, useCallback } from 'react';
import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";
import { OS_TOOLS, ToolName } from '../services/toolRegistry';
import { AgenticState, ToolResult } from '../types';
import { useAppStore } from '../store';

/**
 * SOVEREIGN AGENTIC RUNTIME V3
 * Orchestrates the recursive function calling loops with mechanical pacing and 
 * architectural synthesis capabilities.
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

    const getActiveToolsManifest = useCallback((): FunctionDeclaration[] => {
        const activeLayers = knowledge.activeLayers || [];
        const declarations: FunctionDeclaration[] = [];

        // Global System Capabilities
        declarations.push({
            name: 'system_navigate',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    target: { type: Type.STRING, description: 'Target OS sector (e.g., DASHBOARD, CODE_STUDIO, PROCESS_MAP, MEMORY_CORE)' }
                },
                required: ['target']
            },
            description: 'Navigate the Metaventions OS infrastructure to a specific functional sector.'
        });

        declarations.push({
            name: 'focus_element',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    selector: { type: Type.STRING, description: 'CSS selector of the UI element to highlight and focus context.' }
                },
                required: ['selector']
            },
            description: 'Focus the visual interface on a specific element for contextual reasoning.'
        });

        declarations.push({
            name: 'search_intel',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    query: { type: Type.STRING, description: 'The search query for grounded real-time information.' }
                },
                required: ['query']
            },
            description: 'Use Google Search grounding to retrieve real-time technical or strategic intelligence.'
        });

        declarations.push({
            name: 'update_task_priority',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    taskId: { type: Type.STRING, description: 'Unique ID of the task.' },
                    priority: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'], description: 'The priority level to assign.' }
                },
                required: ['taskId', 'priority']
            },
            description: 'Adjust the priority hierarchy of a system task.'
        });

        declarations.push({
            name: 'architect_generate_process',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    description: { type: Type.STRING, description: 'Natural language description of the process or organization needed.' },
                    type: { type: Type.STRING, enum: ['DRIVE_ORGANIZATION', 'SYSTEM_ARCHITECTURE', 'AGENTIC_ORCHESTRATION'], description: 'The domain of the generated process.' }
                },
                required: ['description', 'type']
            },
            description: 'Generate a structured workflow or PARA drive organization system based on a directive.'
        });

        if (activeLayers.includes('BUILDER_PROTOCOL')) {
            declarations.push({
                name: 'github_repo_scan',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        repo: { type: Type.STRING, description: 'Path to target repository.' }
                    },
                    required: ['repo']
                },
                description: 'Perform a recursive vulnerability and dependency scan on a code repository.'
            });
        }

        return declarations;
    }, [knowledge.activeLayers]);

    const execute = useCallback(async (userPrompt: string) => {
        setState(prev => ({ 
            ...prev, 
            isThinking: true, 
            lastResult: null, 
            history: [{ role: 'user', content: userPrompt }] 
        }));
        
        addLog('SYSTEM', 'AGENT_RUNTIME: Vectorizing intent...');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const tools = getActiveToolsManifest();

            // STEP 1: INITIAL ANALYSIS
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: userPrompt,
                config: { 
                    tools: [{ functionDeclarations: tools }],
                    thinkingConfig: { thinkingBudget: 16000 } 
                }
            });

            // STEP 2: TOOL NEGOTIATION
            if (response.functionCalls && response.functionCalls.length > 0) {
                const call = response.functionCalls[0];
                const toolName = call.name as ToolName;
                
                setState(prev => ({ 
                    ...prev, 
                    activeTool: toolName,
                    history: [...prev.history, { role: 'model', content: `AUTHORIZATION_REQUIRED: Negotiating tool [${toolName}]` }]
                }));

                await new Promise(r => setTimeout(r, 1200));

                const toolLogic = OS_TOOLS[toolName];
                if (!toolLogic) throw new Error(`Capability [${toolName}] not found in registry.`);

                // STEP 3: LOCAL EXECUTION
                const result: ToolResult = await (toolLogic as any)(call.args);
                
                setState(prev => ({ 
                    ...prev, 
                    history: [...prev.history, { role: 'tool', content: `SIGNAL_STABLE: Result captured from [${toolName}]. Synchronizing state...`, toolName }]
                }));

                await new Promise(r => setTimeout(r, 800));

                // STEP 4: SYNTHESIS & REPORTING
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
                    lastResult: result,
                    activeTool: null,
                    history: [...prev.history, { role: 'model', content: finalResponse.text || 'Directive synthesized.' }] 
                }));
                
                addLog('SUCCESS', `AGENT_RUNTIME: [${toolName}] execution loop stabilized.`);
                return finalResponse.text;

            } else {
                setState(prev => ({ 
                    ...prev, 
                    isThinking: false, 
                    history: [...prev.history, { role: 'model', content: response.text || 'Directive finalized.' }] 
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