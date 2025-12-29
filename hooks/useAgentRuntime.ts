import { useState, useCallback } from 'react';
import { GoogleGenAI, FunctionDeclaration } from "@google/genai";
import { dynamicRegistry } from '../services/DynamicToolRegistry';
import { AgenticState, ToolResult } from '../types';
import { useAppStore } from '../store';
import { SOVEREIGN_SYSTEM_INSTRUCTION } from '../services/geminiService';

/**
 * SOVEREIGN AGENTIC RUNTIME V3
 * Orchestrates evolutionary recursive tool loops using dynamic capability injection.
 */
export const useAgentRuntime = () => {
    const [state, setState] = useState<AgenticState>({
        isThinking: false,
        activeTool: null,
        lastResult: null,
        history: []
    });

    const addLog = useAppStore(s => s.addLog);

    const execute = useCallback(async (userPrompt: string) => {
        setState(prev => ({ 
            ...prev, 
            isThinking: true, 
            lastResult: null, 
            history: [...prev.history, { role: 'user', content: userPrompt }] 
        }));
        
        addLog('SYSTEM', 'AGENT_RUNTIME: Synchronizing evolutionary toolkit...');

        try {
            // 1. Initialise Registry
            await dynamicRegistry.initialize();
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const toolManifests = dynamicRegistry.getCombinedManifests();

            // 2. Initial Thought Generation
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: userPrompt,
                config: { 
                    systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION,
                    tools: toolManifests.length > 0 ? [{ functionDeclarations: toolManifests }] : undefined,
                    thinkingConfig: { thinkingBudget: 16000 } 
                }
            });

            // 3. Tool Loop Execution
            if (response.functionCalls && response.functionCalls.length > 0) {
                const call = response.functionCalls[0];
                const toolName = call.name;
                
                setState(prev => ({ 
                    ...prev, 
                    activeTool: toolName,
                    history: [...prev.history, { role: 'model', content: `NEURAL_BRIDGE: Accessing [${toolName}]` }]
                }));

                const result: ToolResult = await dynamicRegistry.execute(toolName, call.args);
                
                setState(prev => ({ 
                    ...prev, 
                    history: [...prev.history, { role: 'tool', content: `SIGNAL_OK: Captured result from [${toolName}].`, toolName }]
                }));

                // 4. Final Synthesis with Tool Result
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
    }, [addLog]);

    return { execute, state };
};