
import { GoogleGenAI, Schema, Type } from "@google/genai";
import { AtomicTask, SwarmResult, SwarmStatus } from '../types';

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- HEMISPHERE 1: THE ARCHITECT (Stateful / High IQ) ---
// "Centralized orchestration minimizes coordination tax (O(rnk))" 

export async function generateDecompositionMap(userGoal: string): Promise<AtomicTask[]> {
    const ai = getAI();
    
    // The Architect sees EVERYTHING (Global State)
    const prompt = `
    You are the STATE ARCHITECT. You DO NOT execute tasks.
    Your job is to DECOMPOSE this goal into atomic, stateless units.
    
    GOAL: "${userGoal}"
    
    RULES:
    1. Each task must be solvable by a "dumb" agent with ZERO context of the larger plan.
    2. Input data must be self-contained in the 'isolated_input' field.
    3. Break complex logic into single-step verification or transformation.
    
    Return a JSON array of AtomicTasks.
    `;

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

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview', // High IQ Model
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: schema }
    });

    return JSON.parse(response.text || "[]");
}

// --- HEMISPHERE 2: THE SWARM (Stateless / Low IQ / High Velocity) ---
// Constraints Implemented: Strict Statelessness, Red Flag Watchdog, One-Strike Kill

interface AgentOutput {
    result: string;
    agentId: string;
}

/**
 * Executes a single atomic task with ZERO context.
 * Implements "Red Flag Watchdog":
 * 1. If response length > 3000 chars (approx 750 tokens), KILL immediately.
 * 2. If JSON parse fails, KILL immediately (No repairs).
 */
export async function executeAtomicTask(task: AtomicTask): Promise<AgentOutput> {
    const ai = getAI();
    
    // STRICT STATELESSNESS: Payload contains NO history. Only input.
    const prompt = `
    INSTRUCTION: ${task.instruction}
    INPUT_DATA: ${task.isolated_input}
    
    OUTPUT FORMAT: JSON Object with a single key "output" containing the result string.
    CRITICAL: Be concise. Do not hallucinate.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Low IQ / Fast Model
            contents: prompt,
            config: {
                temperature: 0.1, // Near deterministic but allowing slight variance for voting
                responseMimeType: 'application/json' 
            }
        });

        const text = response.text || "";

        // RED FLAG 1: Verbosity Limit (Hallucination Proxy)
        if (text.length > 3000) {
            throw new Error("RED_FLAG: Agent exceeded token limit (Verbose Hallucination). Process Terminated.");
        }

        // RED FLAG 2: Malformed Output (Twisted Reasoning Proxy)
        // We use JSON.parse inside a try/catch as a validator. 
        // If it fails, we do NOT repair. We throw.
        const json = JSON.parse(text);
        
        if (!json.output) {
             throw new Error("RED_FLAG: JSON schema violation. Missing 'output' key.");
        }

        return {
            result: typeof json.output === 'string' ? json.output : JSON.stringify(json.output),
            agentId: `nano-${Math.floor(Math.random() * 100000)}`
        };

    } catch (err: any) {
        // Re-throw as a specific "Agent Death" error to be handled by the consensus engine
        throw new Error(`AGENT_DEATH: ${err.message}`);
    }
}

/**
 * Implements "Gambler's Ruin" Consensus Algorithm (Sequential Probability Ratio Test).
 * Instead of simple majority, we race until one answer leads by K votes.
 */
export async function consensusEngine(task: AtomicTask, onUpdate?: (status: SwarmStatus) => void): Promise<SwarmResult> {
    const K_THRESHOLD = 3; // Confidence Gap required
    const MAX_ROUNDS = 15; // Safety valve
    
    const votes: Record<string, number> = {};
    let rounds = 0;
    let killedAgents = 0;
    const startTime = performance.now();

    // The Casino Loop
    while (rounds < MAX_ROUNDS) {
        rounds++;
        
        // Helper to trigger updates
        const triggerUpdate = () => {
            if (onUpdate) {
                const sorted = Object.entries(votes).sort((a, b) => b[1] - a[1]);
                const leaderCount = sorted[0]?.[1] || 0;
                const runnerUpCount = sorted[1]?.[1] || 0;
                
                onUpdate({
                    taskId: task.id,
                    votes: { ...votes },
                    killedAgents,
                    currentGap: leaderCount - runnerUpCount,
                    targetGap: K_THRESHOLD,
                    totalAttempts: rounds
                });
            }
        };

        triggerUpdate(); // Initial update for this round start

        try {
            // Spawn a fresh, stateless agent
            const { result, agentId } = await executeAtomicTask(task);
            
            // Tally Vote
            votes[result] = (votes[result] || 0) + 1;
            
            // Check Scoreboard
            const sortedResults = Object.entries(votes).sort((a, b) => b[1] - a[1]);
            const leader = sortedResults[0];
            const runnerUp = sortedResults[1] || ["", 0]; // If only one result, runner up is 0
            
            const gap = leader[1] - runnerUp[1];
            
            triggerUpdate(); // Update with new vote

            // GAMBLER'S RUIN WIN CONDITION
            if (gap >= K_THRESHOLD) {
                return {
                    taskId: task.id,
                    output: leader[0],
                    confidence: 1.0, // Mathematical certainty based on K
                    agentId: "SWARM_CONSENSUS",
                    executionTime: performance.now() - startTime,
                    voteLedger: {
                        winner: leader[0],
                        count: leader[1],
                        runnerUp: runnerUp[0] || "None",
                        runnerUpCount: runnerUp[1],
                        totalRounds: rounds,
                        killedAgents: killedAgents
                    }
                };
            }
            
        } catch (err: any) {
            // Agent died (Red Flag). Do not count vote. Just increment killed counter.
            if (err.message.includes("AGENT_DEATH") || err.message.includes("RED_FLAG")) {
                killedAgents++;
                triggerUpdate(); // Update kill count
            } else {
                console.warn("Unexpected swarm error:", err);
            }
        }
        
        // Anti-Loop Safety (if we hit max rounds without consensus, take leader)
        if (rounds >= MAX_ROUNDS) {
             const sortedResults = Object.entries(votes).sort((a, b) => b[1] - a[1]);
             const leader = sortedResults[0];
             if (!leader) return { 
                 taskId: task.id, output: "FAILURE: NO CONSENSUS", confidence: 0, 
                 agentId: "FAIL", executionTime: 0, 
                 voteLedger: { winner: "None", count: 0, runnerUp: "", runnerUpCount: 0, totalRounds: rounds, killedAgents } 
             };

             return {
                taskId: task.id,
                output: leader[0],
                confidence: leader[1] / rounds, // Low confidence
                agentId: "SWARM_TIMEOUT",
                executionTime: performance.now() - startTime,
                voteLedger: {
                    winner: leader[0],
                    count: leader[1],
                    runnerUp: sortedResults[1]?.[0] || "None",
                    runnerUpCount: sortedResults[1]?.[1] || 0,
                    totalRounds: rounds,
                    killedAgents: killedAgents
                }
            };
        }
    }
    
    throw new Error("Swarm collapsed.");
}
