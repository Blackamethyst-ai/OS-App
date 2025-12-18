import { GoogleGenAI, Schema, Type, GenerateContentResponse } from "@google/genai";
import { FileData, SyntheticPersona, DebateTurn, SimulationReport, MentalState } from '../types';
import { HIVE_AGENTS, constructHiveContext, retryGeminiRequest } from './geminiService';

// 1. GENESIS: Select Hive Agents relevant to the content
// Instead of random generation, we pick from the Hive Registry and contextualize them.
export async function generatePersonas(file: FileData): Promise<SyntheticPersona[]> {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // We select 3 archetypes from the Hive that best fit a debate
        const selection = [
            HIVE_AGENTS['Charon'], // Skeptic
            HIVE_AGENTS['Puck'],   // Visionary
            HIVE_AGENTS['Fenrir']  // Pragmatist
        ];

        // Map to SyntheticPersona format
        const colors: Record<string, string> = {
            'Charon': '#ef4444', // Red
            'Puck': '#9d4edd',   // Purple
            'Fenrir': '#22d3ee', // Cyan
        };

        const roleMap: Record<string, string> = {
            'Charon': 'SKEPTIC',
            'Puck': 'VISIONARY',
            'Fenrir': 'PRAGMATIST'
        };

        return selection.map((agent, i) => {
            let mindset: MentalState = { skepticism: 50, excitement: 50, alignment: 50 };
            
            // Initial mindset based on weights
            if (agent.weights.skepticism > 0.7) mindset.skepticism = 90;
            if (agent.weights.creativity > 0.7) mindset.excitement = 90;
            if (agent.weights.empathy > 0.7) mindset.alignment = 80;

            // Construct the Hive-Aware System Prompt
            // We strip the "You are X" part from the helper because we'll inject context later per turn
            // But here we need to store the base identity
            
            return {
                id: agent.id,
                name: agent.name,
                role: roleMap[agent.id] || 'AGENT',
                bias: `Weights: Logic ${agent.weights.logic}, Skepticism ${agent.weights.skepticism}`,
                systemPrompt: agent.systemPrompt, // Base prompt
                avatar_color: colors[agent.id] || '#fff',
                currentMindset: mindset,
                voiceName: agent.voice
            };
        });
    } catch (error: any) {
        console.error("Agora Service Error in generatePersonas:", error);
        throw new Error(error.message || "Failed to generate personas.");
    }
}

// 2. THE TURN: Execute one round of debate with Mental State Update
export async function runDebateTurn(
    activePersona: SyntheticPersona, 
    history: DebateTurn[], 
    contextFile: FileData,
    godModeDirective?: string
): Promise<DebateTurn> {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Construct the "Script" so far
        const script = history.slice(-5).map(h => `${h.personaId === activePersona.id ? 'YOU' : 'OTHER'}: ${h.text}`).join('\n');

        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                response_text: { type: Type.STRING },
                mindset_shift: {
                    type: Type.OBJECT,
                    properties: {
                        skepticism: { type: Type.NUMBER, description: "0-100" },
                        excitement: { type: Type.NUMBER, description: "0-100" },
                        alignment: { type: Type.NUMBER, description: "0-100" }
                    }
                }
            },
            required: ['response_text', 'mindset_shift']
        };

        // --- HIVE MIND INJECTION ---
        // We use the helper to ensure this agent shares the collective context but speaks with their own weights.
        const hiveContext = constructHiveContext(activePersona.id, `
            CURRENT MENTAL STATE:
            Skepticism: ${activePersona.currentMindset.skepticism}
            Excitement: ${activePersona.currentMindset.excitement}
            Alignment: ${activePersona.currentMindset.alignment}

            RECENT CONVERSATION:
            ${script}
            
            CONTEXT DOCUMENT IS ATTACHED.
        `);

        let prompt = `
            ${hiveContext}

            TASK:
            1. Read the recent points.
            2. Respond to the group (keep it under 40 words, punchy and realistic).
            3. Output your NEW mental state scores (0-100) based on this interaction.
        `;

        if (godModeDirective) {
            prompt += `\n\n*** SYSTEM OVERRIDE INSTRUCTION (SECRET WHISPER): ${godModeDirective} ***\nThis directive takes priority over your previous bias. Act on it immediately but subtly.`;
        }

        const response: GenerateContentResponse = await retryGeminiRequest(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [contextFile, { text: prompt }]
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: schema
            }
        }));

        const data = JSON.parse(response.text || "{}");

        return {
            id: crypto.randomUUID(),
            personaId: activePersona.id,
            text: data.response_text || "...",
            timestamp: Date.now(),
            sentiment: 'NEUTRAL', // Placeholder
            newMindset: data.mindset_shift
        };
    } catch (error: any) {
        console.error("Agora Service Error in runDebateTurn:", error);
        throw new Error(error.message || "Debate turn failed.");
    }
}

// 3. SYNTHESIS: Generate the Friction Report with Action Learning
export async function synthesizeReport(history: DebateTurn[]): Promise<SimulationReport> {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const script = history.map(h => `[${h.personaId}]: ${h.text}`).join('\n');
        
        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                viabilityScore: { type: Type.NUMBER },
                projectedUpside: { type: Type.NUMBER, description: "Potential score increase if fixes are applied" },
                consensus: { type: Type.STRING },
                majorFrictionPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                actionableFixes: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
        };

        const response: GenerateContentResponse = await retryGeminiRequest(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `
            Analyze this debate transcript.
            
            1. CALCULATE VIABILITY: 0-100 score based on agent consensus.
            2. EXTRACT FRICTION: What specifically did the Skeptics hate?
            3. PROPOSE ACTION LEARNING: Identify specific "Experiments" or "Fixes" to resolve the conflict.
            4. ESTIMATE UPSIDE: If these fixes works, how much would the score improve (0-50)?
            
            Transcript:
            ${script}`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: schema
            }
        }));

        return JSON.parse(response.text || "{}");
    } catch (error: any) {
        console.error("Agora Service Error in synthesizeReport:", error);
        throw new Error(error.message || "Report synthesis failed.");
    }
}