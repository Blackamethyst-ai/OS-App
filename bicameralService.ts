import { GoogleGenAI, Schema, Type, GenerateContentResponse } from "@google/genai";
import { AtomicTask, SwarmResult, SwarmStatus, VoteLedger } from '../types';
import { retryGeminiRequest } from './geminiService';

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateDecompositionMap(goal: string): Promise<AtomicTask[]> {
    const ai = getAI();
    
    const schema: Schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING },
                description: { type: Type.STRING },
                isolated_input: { type: Type.STRING },
                instruction: { type: Type.STRING },
                weight: { type: Type.NUMBER }
            },
            required: ['id', 'description', 'isolated_input', 'instruction', 'weight']
        }
    };

    const response: GenerateContentResponse = await retryGeminiRequest(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Decompose this directive into atomic tasks: "${goal}". Return JSON.`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema
        }
    }));

    const tasks = JSON.parse(response.text || "[]");
    return tasks.map((t: any, i: number) => ({ ...t, id: `ATOM_${Date.now()}_${i}` }));
}

export async function consensusEngine(
    task: AtomicTask, 
    onStatusUpdate: (status: SwarmStatus) => void
): Promise<SwarmResult> {
    const ai = getAI();
    const TARGET_GAP = 3; 
    const MAX_ROUNDS = 15;
    const MODEL = 'gemini-3-flash-preview';

    let votes: Record<string, number> = {}; 
    let answerMap: Record<string, string> = {}; 
    let killedAgents = 0;
    let rounds = 0;

    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            output: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            reasoning: { type: Type.STRING }
        },
        required: ['output', 'confidence', 'reasoning']
    };

    while (rounds < MAX_ROUNDS) {
        rounds++;
        try {
            const response: GenerateContentResponse = await retryGeminiRequest(() => ai.models.generateContent({
                model: MODEL,
                contents: `Task: ${task.instruction}. Input: ${task.isolated_input}.`,
                config: {
                    temperature: 0.7 + (rounds * 0.05),
                    responseMimeType: 'application/json',
                    responseSchema: schema
                }
            }));

            const result = JSON.parse(response.text || "{}");
            let rawOutput = result.output?.trim() || "";
            rawOutput = rawOutput.replace(/^```[a-z]*\n/i, '').replace(/\n```$/, '').trim();
            
            if (!rawOutput) throw new Error("Empty output");
            const key = rawOutput.toLowerCase().replace(/\s+/g, ' ').substring(0, 200);
            if (!answerMap[key]) answerMap[key] = rawOutput;

            votes[key] = (votes[key] || 0) + 1;

            const sortedCandidates = Object.entries(votes).sort((a, b) => b[1] - a[1]);
            const leaderCount = sortedCandidates[0][1];
            const runnerUpCount = sortedCandidates.length > 1 ? (sortedCandidates[1][1] as number) : 0;
            const currentGap = leaderCount - runnerUpCount;

            onStatusUpdate({ taskId: task.id, votes, killedAgents, currentGap, targetGap: TARGET_GAP, totalAttempts: rounds });

            if (currentGap >= TARGET_GAP) {
                return {
                    taskId: task.id,
                    output: answerMap[sortedCandidates[0][0]],
                    confidence: Math.min(99, 80 + (currentGap * 5)),
                    agentId: `SWARM_${rounds}`,
                    executionTime: Date.now(),
                    voteLedger: { winner: sortedCandidates[0][0], count: leaderCount, runnerUp: sortedCandidates[1]?.[0] || "", runnerUpCount, totalRounds: rounds, killedAgents }
                };
            }
        } catch (e) {
            killedAgents++;
        }
        await new Promise(r => setTimeout(r, 200));
    }

    const sorted = Object.entries(votes).sort((a, b) => b[1] - a[1]);
    return {
        taskId: task.id,
        output: answerMap[sorted[0]?.[0]] || "Consensus failed",
        confidence: 50,
        agentId: "TIMEOUT",
        executionTime: Date.now(),
        voteLedger: { winner: sorted[0]?.[0] || "", count: votes[sorted[0]?.[0]] || 0, runnerUp: "", runnerUpCount: 0, totalRounds: rounds, killedAgents }
    };
}
