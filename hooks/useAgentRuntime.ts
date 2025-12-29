import { useState, useCallback } from 'react';
import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";
import { dynamicRegistry } from '../services/DynamicToolRegistry';
import { AgenticState, ToolResult } from '../types';
import { useAppStore } from '../store';
import { SOVEREIGN_SYSTEM_INSTRUCTION } from '../services/geminiService';

/**
 * SOVEREIGN AGENTIC RUNTIME V3
 * Orchestrates evolutionary recursive tool loops.
 */
export const useAgentRuntime = () => {
    const [state, setState] = useState<AgenticState>({
        isThinking: false,
        activeTool: null,
        lastResult: null,
        history: []
    });

    const addLog = useAppStore(s => s.addLog);

    const getActiveToolsManifest = useCallback(async (): Promise<FunctionDeclaration[]> => {
        const declarations: FunctionDeclaration[] = [];

        // 1. Static Kernel Capabilities
        declarations.push({
            name: 'system_navigate',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    target: { type: Type.STRING, description: 'Target sector (DASHBOARD, CODE_STUDIO, etc)' }
                },
                required: ['target']
            },
            description: 'Navigate the OS to a specific functional sector.'
        });

        // 2. Evolutionary Tools (Nexus Forge)
        const dynamicManifests = dynamicRegistry.getDynamicManifests();
        dynamicManifests.forEach(manifest => declarations.push(manifest));

        return declarations;
    }, []);

    const execute = useCallback(async (userPrompt: string) => {
        setState(prev => ({ 
            ...prev, 
            isThinking: true, 
            lastResult: null, 
            history: [{ role: 'user', content: userPrompt }] 
        }));
        
        addLog('SYSTEM', 'AGENT_RUNTIME: Synchronizing capabilities...');

        try {
            // Injection 2: Initialize Registry before execution
            await dynamicRegistry.initialize();
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const tools = await getActiveToolsManifest();
            const combinedRegistry = dynamicRegistry.getCombinedRegistry();

            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: userPrompt,
                config: { 
                    systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION,
                    tools: tools.length > 0 ? [{ functionDeclarations: tools }] : undefined,
                    thinkingConfig: { thinkingBudget: 16000 } 
                }
            });

            if (response.functionCalls && response.functionCalls.length > 0) {
                const call = response.functionCalls[0];
                const toolName = call.name;
                
                setState(prev => ({ 
                    ...prev, 
                    activeTool: toolName,
                    history: [...prev.history, { role: 'model', content: `NEURAL_BRIDGE: Accessing [${toolName}]` }]
                }));

                const toolLogic = combinedRegistry[toolName];
                if (!toolLogic) throw new Error(`Capability [${toolName}] unreachable.`);

                const result: ToolResult = await (toolLogic as any)(call.args);
                
                setState(prev => ({ 
                    ...prev, 
                    history: [...prev.history, { role: 'tool', content: `SIGNAL_OK: Captured result from [${toolName}].`, toolName }]
                }));

                const finalResponse = await ai.models.generateContent({
                    model: 'gemini-3-pro-preview',
                    contents: [
                        { role: 'user', parts: [{ text: userPrompt }] },
                        { role: 'model', parts: [{ functionCall: call }] },
                        { role: 'user', parts: [{ functionResponse: { name: toolName, response: result.data } }] }
                    ],
                    config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION }
                });

                setState(prev => ({ 
                    ...prev, 
                    isThinking: false, 
                    lastResult: result,
                    activeTool: null,
                    history: [...prev.history, { role: 'model', content: finalResponse.text || 'Directive finalized.' }] 
                }));
                
                addLog('SUCCESS', `AGENT_RUNTIME: [${toolName}] execution loop stabilized.`);
                return finalResponse.text;

            } else {
                setState(prev => ({ 
                    ...prev, 
                    isThinking: false, 
                    history: [...prev.history, { role: 'model', content: response.text || 'Analysis stabilized.' }] 
                }));
                return response.text;
            }

        } catch (err: any) {
            setState(prev => ({ ...prev, isThinking: false }));
            addLog('ERROR', `AGENT_RUNTIME_FAIL: ${err.message}`);
            throw err;
        }
    }, [getActiveToolsManifest, addLog]);

    return { execute, state };
};