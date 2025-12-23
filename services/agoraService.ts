import { GoogleGenAI, Schema, Type, GenerateContentResponse } from "@google/genai";
import { FileData, SyntheticPersona, DebateTurn, SimulationReport, MentalState } from '../types';
import { HIVE_AGENTS, constructHiveContext, retryGeminiRequest } from './geminiService';

// 1. GENESIS: Select Hive Agents relevant to the content
export async function generatePersonas(file: FileData): Promise<SyntheticPersona[]> {
    try {
        const selection = [
            HIVE_AGENTS['Charon'], // Skeptic
            HIVE_AGENTS['Puck'],   // Visionary
            HIVE_AGENTS['Fenrir']  // Pragmatist
        ];

        const colors: Record<string, string> = {
            'Charon': '#ef4444',
            'Puck': '#9d4edd',
            'Fenrir': '#22d3ee',
        };

        return selection.map((agent) => {
            let mindset: MentalState = { skepticism: 50, excitement: 50, alignment: 50 };
            if (agent.weights.skepticism > 0.7) mindset.skepticism = 90;
            if (agent.weights.creativity > 0.7) mindset.excitement = 90;
            if (agent.weights.empathy > 0.7) mindset.alignment = 80;

            return {
                id: agent.id,
                name: agent.name,
                role: agent.id.toUpperCase(),
                bias: `Weights: Logic ${agent.weights.logic}, Skepticism ${agent.weights.skepticism}`,
                systemPrompt: agent.systemPrompt,
                avatar_color: colors[agent.id] || '#fff',
                currentMindset: mindset,
                voiceName: agent.voice
            };
        });
    } catch (error: any) {
        console.error("Agora Service GENESIS Error:", error);
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
        const script = history.slice(-5).map(h => `${h.personaId === activePersona.id ? 'YOU' : 'OTHER'}: ${h.text}`).join('\n');

        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                response_text: { type: Type.STRING },
                mindset_shift: {
                    type: Type.OBJECT,
                    properties: {
                        skepticism: { type: Type.NUMBER },
                        excitement: { type: Type.NUMBER },
                        alignment: { type: Type.NUMBER }
                    }
                }
            },
            required: ['response_text', 'mindset_shift']
        };

        const hiveContext = constructHiveContext(activePersona.id, `
            CURRENT MENTAL STATE: S=${activePersona.currentMindset.skepticism}, E=${activePersona.currentMindset.excitement}, A=${activePersona.currentMindset.alignment}
            CONTEXT DOCUMENT ATTACHED.
            TASK: Evaluate the architectural integrity of the proposal. If it involves drive organization, look for PARA depth violations. If system arch, look for centralization risks.
            CONVERSATION HISTORY:
            ${script}
        `);

        let prompt = `${hiveContext}\nKeep response under 40 words.`;
        if (godModeDirective) prompt += `\n\nDIRECTIVE OVERRIDE: ${godModeDirective}`;

        const response: GenerateContentResponse = await retryGeminiRequest(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [{ inlineData: contextFile.inlineData }, { text: prompt }]
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
            sentiment: 'NEUTRAL',
            newMindset: data.mindset_shift
        };
    } catch (error: any) {
        console.error("Agora Service TURN Error:", error);
        throw new Error(error.message || "Debate turn failed.");
    }
}

// 3. SYNTHESIS: Generate the Friction Report
export async function synthesizeReport(history: DebateTurn[]): Promise<SimulationReport> {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const script = history.map(h => `[${h.personaId}]: ${h.text}`).join('\n');
        
        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                viabilityScore: { type: Type.NUMBER },
                projectedUpside: { type: Type.NUMBER },
                consensus: { type: Type.STRING },
                majorFrictionPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                actionableFixes: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
        };

        const response: GenerateContentResponse = await retryGeminiRequest(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Synthesize report from this debate transcript. Focus on structural friction.\n\nTranscript:\n${script}`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: schema
            }
        }));

        return JSON.parse(response.text || "{}");
    } catch (error: any) {
        console.error("Agora Service SYNTHESIS Error:", error);
        throw new Error(error.message || "Report synthesis failed.");
    }
}
