import { GoogleGenAI, Schema, Type, GenerateContentResponse } from "@google/genai";
import { AtomicTask, SwarmResult, SwarmStatus, VoteLedger } from '../types';
import { retryGeminiRequest } from './geminiService';

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
                isolated_input: { type: Type.STRING, description: "The specific data string, mock data, or variable context this task needs to process." },
                instruction: { type: Type.STRING, description: "Precise, imperative prompt for the worker agent." },
                weight: { type: Type.NUMBER, description: "1-10 priority." }
            },
            required: ['id', 'description', 'isolated_input', 'instruction', 'weight']
        }
    };

    const response: GenerateContentResponse = await retryGeminiRequest(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `
        ROLE: Senior System Architect (Bicameral Engine).
        OBJECTIVE: Decompose the complex user directive into a linear execution chain of 3 to 5 distinct, atomic tasks.
        
        DIRECTIVE: "${goal}"
        
        GUIDELINES FOR ATOMIC TASKS:
        1. **Linearity**: Task N logically follows Task N-1.
        2. **Isolation**: 'isolated_input' must be a concrete string (mock data, code snippet, or variable placeholder) that the worker needs to process. Do not leave it empty.
        3. **Instruction Quality**: The 'instruction' field is the PROMPT for a specialized worker AI. It must be imperative, precise, and self-contained. Avoid vague language like "Analyze this". Use "Extract the top 3 entities from the input string".
        
        EXAMPLE DECOMPOSITION:
        Directive: "Write a Python script to scrape stock prices and save to CSV."
        Task 1:
          - Description: "Generate the web scraping logic."
          - Isolated Input: "Target: Stock Prices. Library: BeautifulSoup. URL: example.com/stocks"
          - Instruction: "Write a Python function using BeautifulSoup to parse HTML and extract price data from a standard table structure."
        Task 2:
          - Description: "Generate CSV storage logic."
          - Isolated Input: "Columns: Symbol, Price, Time. Data: [{'Symbol': 'AAPL', 'Price': 150}]"
          - Instruction: "Write a Python function to accept a list of dictionaries and write them to a CSV file named 'stocks.csv'."
        
        OUTPUT: JSON Array of AtomicTasks.
        `,
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema
        }
    }));

    const tasks = JSON.parse(response.text || "[]");
    return tasks.map((t: any, i: number) => ({ ...t, id: `ATOM_${Date.now()}_${i}` }));
}

// --- PHASE 2: THE SWARM (Gemini 3.0 Flash) ---
// High-velocity consensus engine. Updated to use correct model naming.

export async function consensusEngine(
    task: AtomicTask, 
    onStatusUpdate: (status: SwarmStatus) => void
): Promise<SwarmResult> {
    const ai = getAI();
    
    // Configuration
    const TARGET_GAP = 3; // Leader must be ahead by 3 votes
    const MAX_ROUNDS = 15;
    const MODEL = 'gemini-3-flash-preview';

    let votes: Record<string, number> = {}; // Answer Key -> Count
    let answerMap: Record<string, string> = {}; // Answer Key -> Full Output
    let bestOutput = "";
    let leaderKey = "";
    let runnerUpKey = "";
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
            // 1. Spawn Agent with Retry Logic (Crucial for high concurrency swarm)
            const response: GenerateContentResponse = await retryGeminiRequest(() => ai.models.generateContent({
                model: MODEL,
                contents: `
                ROLE: Specialized Execution Unit (Swarm Node).
                OBJECTIVE: Perform the requested task with absolute precision. You are part of a swarm; deviation suggests error.
                
                CONTEXT/INPUT DATA:
                """
                ${task.isolated_input}
                """
                
                TASK INSTRUCTION:
                ${task.instruction}
                
                REQUIREMENTS:
                1. **Output Format**: Provide the raw result directly in the 'output' field. Do not wrap in markdown unless requested.
                2. **Reasoning**: Briefly justify your result.
                3. **Confidence**: Assess your own certainty (0-100).
                `,
                config: {
                    temperature: 0.7 + (rounds * 0.05), // Increase entropy slightly if stuck to break deadlocks
                    responseMimeType: 'application/json',
                    responseSchema: schema
                }
            }));

            const result = JSON.parse(response.text || "{}");
            
            // 2. Normalize Output
            let rawOutput = result.output?.trim() || "";
            // Strip markdown code block wrappers for consistency in voting
            rawOutput = rawOutput.replace(/^```[a-z]*\n/i, '').replace(/\n```$/, '').trim();
            
            if (!rawOutput) throw new Error("Empty output");

            // Create a normalized key for voting (lowercase + collapsed whitespace)
            // This ensures "function foo() {}" and "function foo() { }" count as the same vote.
            const key = rawOutput.toLowerCase().replace(/\s+/g, ' ').substring(0, 200);
            
            // Store the full, clean output for retrieval later
            if (!answerMap[key]) answerMap[key] = rawOutput;

            // 3. Cast Vote
            votes[key] = (votes[key] || 0) + 1;
            
            // Update Best Output if high confidence
            if (!bestOutput || (result.confidence > 80)) {
                bestOutput = rawOutput;
            }

            // 4. Calculate Gap
            const sortedCandidates = Object.entries(votes).sort((a, b) => b[1] - a[1]);
            leaderKey = sortedCandidates[0][0];
            const leaderCount = sortedCandidates[0][1];
            
            runnerUpKey = sortedCandidates.length > 1 ? sortedCandidates[1][0] : "";
            const runnerUpCount = sortedCandidates.length > 1 ? (sortedCandidates[1][1] as number) : 0;
            
            const currentGap = leaderCount - runnerUpCount;

            // 5. Broadcast Status
            onStatusUpdate({
                taskId: task.id,
                votes, // This sends keys, UI might need mapping but mostly shows counts/keys
                killedAgents,
                currentGap,
                targetGap: TARGET_GAP,
                totalAttempts: rounds
            });

            // 6. Check Convergence
            if (currentGap >= TARGET_GAP) {
                // VICTORY
                const derivedConfidence = Math.min(99, 80 + (currentGap * 5));

                return {
                    taskId: task.id,
                    output: answerMap[leaderKey] || rawOutput, // Return the full preserved output
                    confidence: derivedConfidence,
                    agentId,
                    executionTime: Date.now(),
                    voteLedger: {
                        winner: leaderKey.substring(0, 20) + "...", // Shorten for UI ledger
                        count: leaderCount,
                        runnerUp: runnerUpKey ? runnerUpKey.substring(0, 20) + "..." : "",
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
                currentGap: 0, 
                targetGap: TARGET_GAP,
                totalAttempts: rounds
            });
        }
        
        // Rate limit protection / Visual pacing
        await new Promise(r => setTimeout(r, 200));
    }

    // Force resolve if max rounds reached
    const totalVotes = Object.values(votes).reduce((a, b) => (a as number) + (b as number), 0);
    const leaderVotes = votes[leaderKey] || 0;
    const partialConfidence = totalVotes > 0 ? Math.round((leaderVotes / totalVotes) * 100) : 0;

    return {
        taskId: task.id,
        output: answerMap[leaderKey] || bestOutput || "Consensus Failed",
        confidence: Math.max(10, partialConfidence - 20), // Penalize for timeout
        agentId: "TIMEOUT",
        executionTime: Date.now(),
        voteLedger: {
            winner: leaderKey ? leaderKey.substring(0, 20) + "..." : "None",
            count: leaderVotes,
            runnerUp: "",
            runnerUpCount: 0,
            totalRounds: rounds,
            killedAgents
        }
    };
}
