
import { useState, useCallback } from 'react';
import { logger } from '../services/logger';
// Fixed: Added GenerateContentResponse to imports from @google/genai
import { GoogleGenAI, FunctionDeclaration, GenerateContentResponse } from "@google/genai";
import { dynamicRegistry } from '../services/DynamicToolRegistry';
import { AgenticState, ToolResult } from '../types';
import { useAppStore } from '../store';
import { SOVEREIGN_SYSTEM_INSTRUCTION, retryGeminiRequest, getAI } from '../services/geminiService';

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

    const addLog = useAppStore(s => s.actions.addLog);

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

            const ai = getAI();
            const toolManifests = dynamicRegistry.getCombinedManifests();

            // 2. Initial Thought Generation
            // Fixed: Explicitly typed retryGeminiRequest as GenerateContentResponse to resolve "unknown" type errors
            const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: userPrompt,
                config: {
                    systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION,
                    tools: toolManifests.length > 0 ? [{ functionDeclarations: toolManifests }] : undefined
                }
            }));

            // 3. Tool Loop Execution
            // Fixed: Typed response allows access to functionCalls property
            if (response.functionCalls && response.functionCalls.length > 0) {
                const call = response.functionCalls[0];
                const toolName = call.name;

                setState(prev => ({
                    ...prev,
                    activeTool: toolName ?? null,
                    history: [...prev.history, { role: 'model', content: `NEURAL_BRIDGE: Accessing [${toolName}]` }]
                }));

                const result: ToolResult = await dynamicRegistry.execute(toolName ?? '', call.args);

                setState(prev => ({
                    ...prev,
                    history: [...prev.history, { role: 'tool', content: `SIGNAL_OK: Captured result from [${toolName}].`, toolName }]
                }));

                // 4. Final Synthesis with Tool Result
                // Fixed: Explicitly typed retryGeminiRequest as GenerateContentResponse to resolve "unknown" type errors
                const finalResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: [
                        { role: 'user', parts: [{ text: userPrompt }] },
                        { role: 'model', parts: [{ functionCall: call }] },
                        { role: 'user', parts: [{ functionResponse: { name: toolName, response: result.data } }] }
                    ],
                    config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION }
                }));

                // Fixed: Typed finalResponse allows access to text property
                const text = finalResponse.text || 'Directive finalized.';
                setState(prev => ({
                    ...prev,
                    isThinking: false,
                    lastResult: result,
                    activeTool: null,
                    history: [...prev.history, { role: 'model', content: text }]
                }));

                addLog('SUCCESS', `AGENT_RUNTIME: [${toolName}] execution loop stabilized.`);
                return text;
            } else {
                // Fixed: Typed response allows access to text property
                const text = response.text || 'Directive finalized.';
                setState(prev => ({
                    ...prev,
                    isThinking: false,
                    history: [...prev.history, { role: 'model', content: text }]
                }));
                return text;
            }

        } catch (e: any) {
            logger.error("Agent Runtime Error:", e);
            const errorMsg = `ERROR: Cognitive failure. ${e.message}`;
            setState(prev => ({
                ...prev,
                isThinking: false,
                history: [...prev.history, { role: 'model', content: errorMsg }]
            }));
            addLog('ERROR', `AGENT_RUNTIME_FAIL: ${e.message}`);
            return null;
        }
    }, [addLog]);

    return { state, execute };
};
