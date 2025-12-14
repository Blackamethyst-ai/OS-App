
import { GoogleGenAI, Schema, Type } from "@google/genai";
import { FileData, SyntheticPersona, DebateTurn, SimulationReport, MentalState } from '../types';

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
    
    // Map to full type with colors and Initial Mental States
    const colors: Record<string, string> = {
        'SKEPTIC': '#ef4444', // Red
        'VISIONARY': '#9d4edd', // Purple
        'PRAGMATIST': '#22d3ee', // Cyan
        'SECURITY_HAWK': '#f59e0b' // Amber
    };

    // Voice Map based on Archetype
    const voiceMap: Record<string, 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr'> = {
        'SKEPTIC': 'Fenrir',   // Rough, critical
        'VISIONARY': 'Zephyr', // Airy, forward looking
        'PRAGMATIST': 'Kore',  // Balanced
        'SECURITY_HAWK': 'Charon' // Deep, serious
    };

    return raw.map((p: any, i: number) => {
        let mindset: MentalState = { skepticism: 50, excitement: 50, alignment: 50 };
        if (p.role === 'SKEPTIC') mindset = { skepticism: 90, excitement: 20, alignment: 10 };
        if (p.role === 'VISIONARY') mindset = { skepticism: 20, excitement: 90, alignment: 80 };
        if (p.role === 'PRAGMATIST') mindset = { skepticism: 60, excitement: 40, alignment: 50 };
        if (p.role === 'SECURITY_HAWK') mindset = { skepticism: 80, excitement: 30, alignment: 30 };

        return {
            ...p,
            id: `persona_${i}`,
            avatar_color: colors[p.role as string] || '#fff',
            currentMindset: mindset,
            voiceName: voiceMap[p.role as string] || 'Puck' // Fallback to Puck (Chair's voice) if undefined
        };
    });
}

// 2. THE TURN: Execute one round of debate with Mental State Update
export async function runDebateTurn(
    activePersona: SyntheticPersona, 
    history: DebateTurn[], 
    contextFile: FileData,
    godModeDirective?: string
): Promise<DebateTurn> {
    const ai = getAI();
    
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

    let prompt = `
        ${activePersona.systemPrompt}
        
        CURRENT MENTAL STATE:
        Skepticism: ${activePersona.currentMindset.skepticism}
        Excitement: ${activePersona.currentMindset.excitement}
        Alignment: ${activePersona.currentMindset.alignment}

        RECENT CONVERSATION:
        ${script}
        
        CONTEXT DOCUMENT IS ATTACHED.
    `;

    if (godModeDirective) {
        prompt += `\n\n*** SYSTEM OVERRIDE INSTRUCTION (SECRET WHISPER): ${godModeDirective} ***\nThis directive takes priority over your previous bias. Act on it immediately but subtly.`;
    }

    prompt += `\nTASK:
    1. Read the recent points.
    2. Respond to the group (keep it under 40 words, punchy and realistic).
    3. Output your NEW mental state scores (0-100) based on this interaction. Did the others convince you? Or annoy you?`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [contextFile, { text: prompt }]
        },
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema
        }
    });

    const data = JSON.parse(response.text || "{}");

    return {
        id: crypto.randomUUID(),
        personaId: activePersona.id,
        text: data.response_text || "...",
        timestamp: Date.now(),
        sentiment: 'NEUTRAL', // Placeholder
        newMindset: data.mindset_shift
    };
}

// 3. SYNTHESIS: Generate the Friction Report with Action Learning
export async function synthesizeReport(history: DebateTurn[]): Promise<SimulationReport> {
    const ai = getAI();
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

    const response = await ai.models.generateContent({
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
    });

    return JSON.parse(response.text || "{}");
}
