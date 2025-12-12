
import { GoogleGenAI, Schema, Type } from "@google/genai";
import { FileData, SyntheticPersona, DebateTurn, SimulationReport } from '../types';

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// 1. GENESIS: Spawn Personas based on the content
export async function generatePersonas(file: FileData): Promise<SyntheticPersona[]> {
    const ai = getAI();
    
    const schema: Schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                role: { type: Type.STRING, enum: ['SKEPTIC', 'VISIONARY', 'PRAGMATIST', 'SECURITY_HAWK'] },
                bias: { type: Type.STRING },
                systemPrompt: { type: Type.STRING, description: "A instruction set for an LLM to act as this person." }
            },
            required: ['name', 'role', 'bias', 'systemPrompt']
        }
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                file,
                { text: "Analyze this document. Generate 3 distinct, conflicting user personas who would review this. Include a 'Skeptic', a 'Visionary', and a 'Pragmatist'. Define their hidden biases and system prompts." }
            ]
        },
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema
        }
    });

    const raw = JSON.parse(response.text || "[]");
    
    // Map to full type with colors
    const colors: Record<string, string> = {
        'SKEPTIC': '#ef4444', // Red
        'VISIONARY': '#9d4edd', // Purple
        'PRAGMATIST': '#22d3ee', // Cyan
        'SECURITY_HAWK': '#f59e0b' // Amber
    };

    return raw.map((p: any, i: number) => ({
        ...p,
        id: `persona_${i}`,
        avatar_color: colors[p.role as string] || '#fff'
    }));
}

// 2. THE TURN: Execute one round of debate
export async function runDebateTurn(
    activePersona: SyntheticPersona, 
    history: DebateTurn[], 
    contextFile: FileData
): Promise<DebateTurn> {
    const ai = getAI();
    
    // Construct the "Script" so far
    const script = history.map(h => `${h.personaId === activePersona.id ? 'YOU' : 'OTHER'}: ${h.text}`).join('\n');

    const prompt = `
        ${activePersona.systemPrompt}
        
        CONTEXT DOCUMENT IS ATTACHED.
        
        CURRENT CONVERSATION:
        ${script}
        
        TASK:
        Respond to the last point. Stay entirely in character. 
        If you are a Skeptic, doubt the claims. If Pragmatist, ask about cost/implementation.
        Keep it under 40 words. Punchy and realistic.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [contextFile, { text: prompt }]
        }
    });

    return {
        id: crypto.randomUUID(),
        personaId: activePersona.id,
        text: response.text || "...",
        timestamp: Date.now(),
        sentiment: 'NEUTRAL' // Simplified for now
    };
}

// 3. SYNTHESIS: Generate the Friction Report
export async function synthesizeReport(history: DebateTurn[]): Promise<SimulationReport> {
    const ai = getAI();
    const script = history.map(h => `[${h.personaId}]: ${h.text}`).join('\n');
    
    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            viabilityScore: { type: Type.NUMBER },
            consensus: { type: Type.STRING },
            majorFrictionPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            actionableFixes: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Analyze this focus group transcript. Extract a viability score (0-100), friction points, and fixes.\n\n${script}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema
        }
    });

    return JSON.parse(response.text || "{}");
}
