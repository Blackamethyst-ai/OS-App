
import { GoogleGenAI, Schema, Type } from "@google/genai";
import { AtomicTask, SwarmResult, SwarmStatus, VoteLedger } from '../types';

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- PHASE 1: THE ARCHITECT (Gemini 3.0 Pro) ---
// Breaks complex goals into atomic, verifiable tasks.

export async function generateDecompositionMap(goal: string): Promise<AtomicTask[]> {
    const ai = getAI();
    
    const schema: Schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING },
                description: { type: Type.STRING },
                isolated_input: { type: Type.STRING, description: "The specific data string this task needs to process." },
                instruction: { type: Type.STRING, description: "Exact prompt for the worker agent." },
                weight: { type: Type.NUMBER, description: "1-10 priority." }
            },
            required: ['id', 'description', 'isolated_input', 'instruction', 'weight']
        }
    };

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `
        ROLE: System Architect.
        GOAL: Decompose the following user directive into a linear series of atomic, isolated tasks.
        
        DIRECTIVE: "${goal}"
        
        CONSTRAINTS:
        1. Create 3 to 5 tasks maximum.
        2. Tasks must be strictly sequential (Task N relies on Task N-1 conceptually, but inputs should be isolated if possible).
        3. 'isolated_input' should be a mock string or placeholder if real data isn't available.
        4. 'instruction' must be a prompt suitable for a dumb worker AI.
        
        OUTPUT: JSON Array of AtomicTasks.
        `,
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema
        }
    });

    const tasks = JSON.parse(response.text || "[]");
    return tasks.map((t: any, i: number) => ({ ...t, id: `ATOM_${Date.now()}_${i}` }));
}

// --- PHASE 2: THE SWARM (Gemini 2.5 Flash) ---
// High-velocity consensus engine.

export async function consensusEngine(
    task: AtomicTask, 
    onStatusUpdate: (status: SwarmStatus) => void
): Promise<SwarmResult> {
    const ai = getAI();
    
    // Configuration
    const TARGET_GAP = 3; // Leader must be ahead by 3 votes
    const MAX_ROUNDS = 15;
    const MODEL = 'gemini-2.5-flash';

    let votes: Record<string, number> = {}; // Answer -> Count
    let bestOutput = "";
    let leader = "";
    let runnerUp = "";
    let killedAgents = 0;
    let rounds = 0;

    // Schema for Agent Response
    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            output: { type: Type.STRING, description: "The result of the task." },
            confidence: { type: Type.NUMBER, description: "0-100 self-assessment." },
            reasoning: { type: Type.STRING, description: "Why is this correct?" }
        },
        required: ['output', 'confidence', 'reasoning']
    };

    // The Loop
    while (rounds < MAX_ROUNDS) {
        rounds++;
        const agentId = `AGENT_${rounds}`;

        try {
            // 1. Spawn Agent
            const response = await ai.models.generateContent({
                model: MODEL,
                contents: `
                TASK: ${task.instruction}
                INPUT: ${task.isolated_input}
                
                INSTRUCTION: Execute the task. Be precise.
                `,
                config: {
                    temperature: 0.7 + (rounds * 0.05), // Increase entropy if stuck
                    responseMimeType: 'application/json',
                    responseSchema: schema
                }
            });

            const result = JSON.parse(response.text || "{}");
            
            // 2. Normalize Output (Simple hashing for grouping)
            // In a real system, we'd use embedding similarity. Here we use exact string matching for simplicity,
            // or very simple normalization.
            const rawOutput = result.output?.trim();
            if (!rawOutput) throw new Error("Empty output");

            const key = rawOutput.length > 50 ? rawOutput.substring(0, 50) + "..." : rawOutput;

            // 3. Cast Vote
            votes[key] = (votes[key] || 0) + 1;
            
            // Update Best Output if high confidence
            if (!bestOutput || (result.confidence > 80)) {
                bestOutput = rawOutput;
            }

            // 4. Calculate Gap
            const sortedCandidates = Object.entries(votes).sort((a, b) => b[1] - a[1]);
            leader = sortedCandidates[0][0];
            const leaderCount = sortedCandidates[0][1];
            runnerUp = sortedCandidates.length > 1 ? sortedCandidates[1][0] : "";
            const runnerUpCount = sortedCandidates.length > 1 ? sortedCandidates[1][1] : 0;
            
            const currentGap = leaderCount - runnerUpCount;

            // 5. Broadcast Status
            onStatusUpdate({
                taskId: task.id,
                votes,
                killedAgents,
                currentGap,
                targetGap: TARGET_GAP,
                totalAttempts: rounds
            });

            // 6. Check Convergence
            if (currentGap >= TARGET_GAP) {
                // VICTORY
                return {
                    taskId: task.id,
                    output: leader === key ? rawOutput : leader, // Return full text of winner
                    confidence: 100,
                    agentId,
                    executionTime: Date.now(),
                    voteLedger: {
                        winner: leader,
                        count: leaderCount,
                        runnerUp,
                        runnerUpCount,
                        totalRounds: rounds,
                        killedAgents
                    }
                };
            }

        } catch (e) {
            killedAgents++;
            // Broadcast kill
            onStatusUpdate({
                taskId: task.id,
                votes,
                killedAgents,
                currentGap: 0, // Recalculate if needed
                targetGap: TARGET_GAP,
                totalAttempts: rounds
            });
        }
        
        // Rate limit protection / Visual pacing
        await new Promise(r => setTimeout(r, 200));
    }

    // Force resolve if max rounds reached
    return {
        taskId: task.id,
        output: bestOutput || "Consensus Failed",
        confidence: 0,
        agentId: "TIMEOUT",
        executionTime: Date.now(),
        voteLedger: {
            winner: leader || "None",
            count: 0,
            runnerUp: "",
            runnerUpCount: 0,
            totalRounds: rounds,
            killedAgents
        }
    };
}
