/**
 * Recursive Language Model (RLM) Service
 *
 * Based on arXiv:2512.24601 "Recursive Language Models" (Zhang, Kraska, Khattab)
 *
 * Implements the Cognitive Precision Bridge pattern:
 * - Context externalization (compress before transport)
 * - REPL environment (pre-computed patterns)
 * - Sub-LLM calls (cheap parallel exploration)
 * - Variable buffering (accumulate without loss)
 * - Final synthesis (precision recovery)
 * - DQ verification (output validation)
 *
 * Key insight from Tesla US20260017019A1: Separate transport from compute.
 * RLM applies this to context: don't tokenize everything—externalize.
 */

import { Schema, Type, GenerateContentResponse } from "@google/genai";
import { retryGeminiRequest, getAI } from './geminiService';
import { logger } from './logger';
import { scoreDQHeuristic, scoreDQWithLLM, DQScore } from './dqScoring';
import { AtomicTask } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface RLMConfig {
    /** Maximum iterations before timeout */
    maxIterations: number;
    /** Maximum output length in characters */
    maxOutputLength: number;
    /** Model for root LLM (expensive, smart) */
    rootModel: string;
    /** Model for sub-LLM calls (cheap, fast) */
    subModel: string;
    /** Enable DQ scoring of final output */
    enableDQScoring: boolean;
    /** Verbose logging */
    verbose: boolean;
    /** Temperature for root model */
    rootTemperature: number;
    /** Temperature for sub-model */
    subTemperature: number;
}

export interface RLMStatus {
    phase: 'initializing' | 'executing' | 'synthesizing' | 'complete' | 'error';
    iteration: number;
    maxIterations: number;
    subCalls: number;
    totalTokens: number;
    currentAction?: string;
}

export interface RLMResult {
    answer: string;
    iterations: number;
    subCalls: number;
    totalTokens: number;
    executionTime: number;
    dqScore?: DQScore;
    trajectory: TrajectoryStep[];
    cost?: {
        rootTokens: number;
        subTokens: number;
        estimatedCost: number;
    };
}

export interface TrajectoryStep {
    iteration: number;
    code: string;
    output: string;
    subCallsMade: number;
    timestamp: number;
}

export interface REPLNamespace {
    context: string;
    context_length: number;
    variables: Record<string, any>;
    subCallCount: number;
    outputs: string[];
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_RLM_CONFIG: RLMConfig = {
    maxIterations: 20,
    maxOutputLength: 500000,
    rootModel: 'gemini-2.5-flash',      // Smart root model
    subModel: 'gemini-2.5-flash',        // Same for now, could use cheaper
    enableDQScoring: true,
    verbose: true,
    rootTemperature: 0.7,
    subTemperature: 0.3
};

// ============================================================================
// SYSTEM PROMPTS
// ============================================================================

const RLM_SYSTEM_PROMPT = `You are a Recursive Language Model (RLM). You can answer queries by programmatically exploring and processing context that is too large to fit in your context window.

## Environment

You have access to a REPL environment with these variables and functions:

- \`context\`: The full input text stored as a string (may be very large)
- \`context_length\`: Number of characters in context
- \`llm_query(prompt, context=None)\`: Call a sub-LLM with a prompt and optional context snippet
- \`llm_batch(prompts)\`: Call sub-LLM on multiple prompts in parallel
- \`store(key, value)\`: Store a value for later use
- \`retrieve(key)\`: Retrieve a stored value
- \`FINAL(answer)\`: Return your final answer
- \`FINAL_VAR(variable_name)\`: Return a stored variable as the answer

## Instructions

1. Think step by step about how to answer the query
2. Write Python code in \`\`\`repl blocks to explore and process the context
3. Use llm_query() for sub-tasks that need reasoning (costs tokens - batch when possible)
4. Store intermediate results with store()
5. Call FINAL() or FINAL_VAR() when you have your answer

## Important Guidelines

- Batch sub-LLM calls when possible (aim for ~50-100k chars per call)
- Don't try to read the entire context at once if it's large
- Use slicing, regex, and string operations to find relevant parts
- Store intermediate results to avoid re-computation
- Be explicit in your final answer

## Code Block Format

\`\`\`repl
# Your Python code here
chunk = context[:5000]
result = llm_query("Summarize this:", chunk)
store("summary", result)
\`\`\``;

// ============================================================================
// REPL EXECUTION ENGINE
// ============================================================================

/**
 * Safe REPL execution with sandboxed functions
 */
class REPLEngine {
    private namespace: REPLNamespace;
    private ai: ReturnType<typeof getAI>;
    private config: RLMConfig;
    private finalAnswer: string | null = null;
    private finalVariable: string | null = null;

    constructor(context: string, config: RLMConfig) {
        this.namespace = {
            context,
            context_length: context.length,
            variables: {},
            subCallCount: 0,
            outputs: []
        };
        this.ai = getAI();
        this.config = config;
    }

    /**
     * Execute a code block and return the output
     */
    async execute(code: string): Promise<{ output: string; subCalls: number }> {
        const startSubCalls = this.namespace.subCallCount;
        const outputs: string[] = [];

        // Create sandboxed execution context
        const sandbox = this.createSandbox(outputs);

        try {
            // Parse and execute each statement
            const statements = this.parseStatements(code);

            for (const stmt of statements) {
                const result = await this.executeStatement(stmt, sandbox);
                if (result !== undefined && result !== null) {
                    outputs.push(String(result));
                }
            }
        } catch (error) {
            outputs.push(`Error: ${error instanceof Error ? error.message : String(error)}`);
        }

        return {
            output: outputs.join('\n'),
            subCalls: this.namespace.subCallCount - startSubCalls
        };
    }

    /**
     * Check if execution has finished
     */
    isComplete(): boolean {
        return this.finalAnswer !== null || this.finalVariable !== null;
    }

    /**
     * Get the final answer
     */
    getFinalAnswer(): string | null {
        if (this.finalAnswer !== null) {
            return this.finalAnswer;
        }
        if (this.finalVariable !== null) {
            return String(this.namespace.variables[this.finalVariable] || '');
        }
        return null;
    }

    /**
     * Get total sub-calls made
     */
    getSubCallCount(): number {
        return this.namespace.subCallCount;
    }

    /**
     * Create sandboxed execution functions
     */
    private createSandbox(outputs: string[]) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        return {
            // Context access
            context: this.namespace.context,
            context_length: this.namespace.context_length,

            // Print function
            print: (...args: any[]) => {
                const output = args.map(a => String(a)).join(' ');
                outputs.push(output);
                return output;
            },

            // Sub-LLM query
            llm_query: async (prompt: string, context?: string): Promise<string> => {
                return self.subLLMQuery(prompt, context);
            },

            // Batch sub-LLM queries
            llm_batch: async (prompts: string[]): Promise<string[]> => {
                return Promise.all(prompts.map(p => self.subLLMQuery(p)));
            },

            // Variable storage
            store: (key: string, value: any) => {
                self.namespace.variables[key] = value;
                outputs.push(`Stored: ${key}`);
            },

            retrieve: (key: string) => {
                return self.namespace.variables[key];
            },

            // Final answer
            FINAL: (answer: string) => {
                self.finalAnswer = answer;
                outputs.push(`FINAL ANSWER SET`);
            },

            FINAL_VAR: (varName: string) => {
                self.finalVariable = varName;
                outputs.push(`FINAL VAR SET: ${varName}`);
            },

            // Utility functions
            len: (x: any) => x?.length || 0,
            str: (x: any) => String(x),
            int: (x: any) => parseInt(x),
            float: (x: any) => parseFloat(x),

            // String methods exposed
            slice: (s: string, start: number, end?: number) => s.slice(start, end),
            split: (s: string, sep: string) => s.split(sep),
            join: (arr: string[], sep: string) => arr.join(sep),
            find: (s: string, sub: string) => s.indexOf(sub),
            lower: (s: string) => s.toLowerCase(),
            upper: (s: string) => s.toUpperCase(),
            strip: (s: string) => s.trim(),
            replace: (s: string, old: string, new_: string) => s.replace(new RegExp(old, 'g'), new_),

            // Regex
            regex_findall: (pattern: string, s: string) => {
                const regex = new RegExp(pattern, 'g');
                return [...s.matchAll(regex)].map(m => m[0]);
            },
            regex_search: (pattern: string, s: string) => {
                const match = s.match(new RegExp(pattern));
                return match ? match[0] : null;
            }
        };
    }

    /**
     * Parse code into executable statements
     */
    private parseStatements(code: string): string[] {
        // Simple line-by-line parsing (could be enhanced)
        return code.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));
    }

    /**
     * Execute a single statement
     */
    private async executeStatement(stmt: string, sandbox: Record<string, any>): Promise<any> {
        // Handle assignments
        const assignMatch = stmt.match(/^(\w+)\s*=\s*(.+)$/);
        if (assignMatch) {
            const [, varName, expr] = assignMatch;
            const value = await this.evaluateExpression(expr, sandbox);
            sandbox[varName] = value;
            this.namespace.variables[varName] = value;
            return undefined;
        }

        // Handle function calls and expressions
        return this.evaluateExpression(stmt, sandbox);
    }

    /**
     * Evaluate an expression in the sandbox
     */
    private async evaluateExpression(expr: string, sandbox: Record<string, any>): Promise<any> {
        // Handle llm_query calls specially (async)
        const llmMatch = expr.match(/llm_query\s*\(\s*["'](.+?)["']\s*(?:,\s*(.+))?\s*\)/);
        if (llmMatch) {
            const [, prompt, contextExpr] = llmMatch;
            let context: string | undefined;
            if (contextExpr) {
                context = await this.evaluateExpression(contextExpr.trim(), sandbox);
            }
            return sandbox.llm_query(prompt, context);
        }

        // Handle print
        const printMatch = expr.match(/print\s*\((.+)\)/);
        if (printMatch) {
            const arg = await this.evaluateExpression(printMatch[1], sandbox);
            return sandbox.print(arg);
        }

        // Handle store
        const storeMatch = expr.match(/store\s*\(\s*["'](\w+)["']\s*,\s*(.+)\s*\)/);
        if (storeMatch) {
            const [, key, valueExpr] = storeMatch;
            const value = await this.evaluateExpression(valueExpr.trim(), sandbox);
            sandbox.store(key, value);
            return undefined;
        }

        // Handle retrieve
        const retrieveMatch = expr.match(/retrieve\s*\(\s*["'](\w+)["']\s*\)/);
        if (retrieveMatch) {
            return sandbox.retrieve(retrieveMatch[1]);
        }

        // Handle FINAL
        const finalMatch = expr.match(/FINAL\s*\(\s*(.+)\s*\)/);
        if (finalMatch) {
            const answer = await this.evaluateExpression(finalMatch[1].trim(), sandbox);
            sandbox.FINAL(String(answer));
            return undefined;
        }

        // Handle FINAL_VAR
        const finalVarMatch = expr.match(/FINAL_VAR\s*\(\s*["']?(\w+)["']?\s*\)/);
        if (finalVarMatch) {
            sandbox.FINAL_VAR(finalVarMatch[1]);
            return undefined;
        }

        // Handle slicing: context[:5000] or var[0:100]
        const sliceMatch = expr.match(/(\w+)\s*\[\s*(-?\d*)?\s*:\s*(-?\d*)?\s*\]/);
        if (sliceMatch) {
            const [, varName, startStr, endStr] = sliceMatch;
            const arr = sandbox[varName] || this.namespace.variables[varName] || '';
            const start = startStr ? parseInt(startStr, 10) : 0;
            const end = endStr ? parseInt(endStr, 10) : undefined;
            return typeof arr === 'string' ? arr.slice(start, end) : arr;
        }

        // Handle len()
        const lenMatch = expr.match(/len\s*\(\s*(\w+)\s*\)/);
        if (lenMatch) {
            const value = sandbox[lenMatch[1]] || this.namespace.variables[lenMatch[1]] || '';
            return sandbox.len(value);
        }

        // Handle string literals
        if ((expr.startsWith('"') && expr.endsWith('"')) ||
            (expr.startsWith("'") && expr.endsWith("'"))) {
            return expr.slice(1, -1);
        }

        // Handle numbers
        if (/^-?\d+(\.\d+)?$/.test(expr)) {
            return parseFloat(expr);
        }

        // Handle variable references
        if (/^\w+$/.test(expr)) {
            return sandbox[expr] ?? this.namespace.variables[expr];
        }

        // Handle split
        const splitMatch = expr.match(/(\w+)\.split\s*\(\s*["'](.+?)["']\s*\)/);
        if (splitMatch) {
            const [, varName, sep] = splitMatch;
            const value = sandbox[varName] || this.namespace.variables[varName] || '';
            return value.split(sep);
        }

        // Fallback: return the expression as-is
        return expr;
    }

    /**
     * Make a sub-LLM query
     */
    private async subLLMQuery(prompt: string, context?: string): Promise<string> {
        this.namespace.subCallCount++;

        const fullPrompt = context
            ? `${prompt}\n\nContext:\n${context.slice(0, 100000)}` // Limit context to 100k chars
            : prompt;

        try {
            const response: GenerateContentResponse = await retryGeminiRequest(() =>
                this.ai.models.generateContent({
                    model: this.config.subModel,
                    contents: fullPrompt,
                    config: {
                        temperature: this.config.subTemperature,
                        maxOutputTokens: 4096
                    }
                })
            );

            return response.text || '';
        } catch (error) {
            logger.error('Sub-query failed', error, 'RLM');
            return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
}

// ============================================================================
// MAIN RLM FUNCTION
// ============================================================================

/**
 * Execute a Recursive Language Model query
 *
 * @param context - The full context (can be arbitrarily large)
 * @param query - The query to answer
 * @param onStatusUpdate - Callback for status updates
 * @param config - Configuration options
 */
export async function recursiveLLMQuery(
    context: string,
    query: string,
    onStatusUpdate?: (status: RLMStatus) => void,
    config: Partial<RLMConfig> = {}
): Promise<RLMResult> {
    const fullConfig: RLMConfig = { ...DEFAULT_RLM_CONFIG, ...config };
    const ai = getAI();
    const startTime = Date.now();

    // Initialize REPL engine
    const repl = new REPLEngine(context, fullConfig);
    const trajectory: TrajectoryStep[] = [];
    const totalTokens = 0;

    // Schema for code generation
    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            thinking: {
                type: Type.STRING,
                description: "Your step-by-step reasoning about how to approach this"
            },
            code: {
                type: Type.STRING,
                description: "Python code to execute in the REPL environment"
            }
        },
        required: ['thinking', 'code']
    };

    onStatusUpdate?.({
        phase: 'initializing',
        iteration: 0,
        maxIterations: fullConfig.maxIterations,
        subCalls: 0,
        totalTokens: 0
    });

    // Build initial prompt
    const contextMetadata = `Context length: ${context.length} characters (~${Math.ceil(context.length / 4)} tokens)`;

    const history: Array<{ code: string; output: string }> = [];

    for (let iteration = 1; iteration <= fullConfig.maxIterations; iteration++) {
        onStatusUpdate?.({
            phase: 'executing',
            iteration,
            maxIterations: fullConfig.maxIterations,
            subCalls: repl.getSubCallCount(),
            totalTokens,
            currentAction: 'Generating code...'
        });

        // Build conversation with history
        const historyText = history.length > 0
            ? '\n\nPrevious actions:\n' + history.map((h, i) =>
                `--- Iteration ${i + 1} ---\nCode:\n${h.code}\nOutput:\n${h.output}`
              ).join('\n\n')
            : '';

        const userPrompt = `Query: ${query}

${contextMetadata}

${historyText}

Now write Python code to continue working toward the answer. Use the REPL functions available to you.`;

        try {
            const response: GenerateContentResponse = await retryGeminiRequest(() =>
                ai.models.generateContent({
                    model: fullConfig.rootModel,
                    contents: userPrompt,
                    config: {
                        temperature: fullConfig.rootTemperature,
                        responseMimeType: 'application/json',
                        responseSchema: schema,
                        systemInstruction: RLM_SYSTEM_PROMPT
                    }
                })
            );

            const result = JSON.parse(response.text || '{}');
            const code = result.code || '';

            if (!code.trim()) {
                if (fullConfig.verbose) logger.debug(`Iteration ${iteration}: Empty code block`, undefined, 'RLM');
                continue;
            }

            // Extract code from markdown if wrapped
            let cleanCode = code;
            const codeBlockMatch = code.match(/```(?:repl|python)?\n?([\s\S]*?)```/);
            if (codeBlockMatch) {
                cleanCode = codeBlockMatch[1];
            }

            if (fullConfig.verbose) {
                logger.debug(`Iteration ${iteration}: Executing code`, undefined, 'RLM');
                logger.debug(cleanCode, undefined, 'RLM');
            }

            // Execute the code
            const { output, subCalls } = await repl.execute(cleanCode);

            if (fullConfig.verbose) {
                logger.debug(`Output: ${output.slice(0, 200)}...`, undefined, 'RLM');
            }

            // Record trajectory
            trajectory.push({
                iteration,
                code: cleanCode,
                output,
                subCallsMade: subCalls,
                timestamp: Date.now()
            });

            history.push({ code: cleanCode, output });

            // Check if complete
            if (repl.isComplete()) {
                const answer = repl.getFinalAnswer() || '';

                onStatusUpdate?.({
                    phase: 'synthesizing',
                    iteration,
                    maxIterations: fullConfig.maxIterations,
                    subCalls: repl.getSubCallCount(),
                    totalTokens,
                    currentAction: 'Scoring result...'
                });

                // Score the final answer
                let dqScore: DQScore | undefined;
                if (fullConfig.enableDQScoring) {
                    const task: AtomicTask = {
                        id: `rlm-${Date.now()}`,
                        description: query,
                        instruction: query,
                        isolated_input: context.slice(0, 1000), // Sample for scoring
                        weight: 1,
                        status: 'COMPLETED'
                    };
                    dqScore = scoreDQHeuristic(answer, task);
                }

                onStatusUpdate?.({
                    phase: 'complete',
                    iteration,
                    maxIterations: fullConfig.maxIterations,
                    subCalls: repl.getSubCallCount(),
                    totalTokens
                });

                return {
                    answer,
                    iterations: iteration,
                    subCalls: repl.getSubCallCount(),
                    totalTokens,
                    executionTime: Date.now() - startTime,
                    dqScore,
                    trajectory,
                    cost: {
                        rootTokens: iteration * 2000, // Rough estimate
                        subTokens: repl.getSubCallCount() * 1000,
                        estimatedCost: (iteration * 0.01) + (repl.getSubCallCount() * 0.005)
                    }
                };
            }

        } catch (error) {
            logger.error(`Iteration ${iteration} error`, error, 'RLM');
            trajectory.push({
                iteration,
                code: 'ERROR',
                output: String(error),
                subCallsMade: 0,
                timestamp: Date.now()
            });
        }

        // Small delay between iterations
        await new Promise(r => setTimeout(r, 100));
    }

    // Timeout - return best available answer
    onStatusUpdate?.({
        phase: 'complete',
        iteration: fullConfig.maxIterations,
        maxIterations: fullConfig.maxIterations,
        subCalls: repl.getSubCallCount(),
        totalTokens
    });

    // Try to synthesize from history
    const lastOutput = history[history.length - 1]?.output || 'No answer found';

    return {
        answer: lastOutput,
        iterations: fullConfig.maxIterations,
        subCalls: repl.getSubCallCount(),
        totalTokens,
        executionTime: Date.now() - startTime,
        trajectory,
        cost: {
            rootTokens: fullConfig.maxIterations * 2000,
            subTokens: repl.getSubCallCount() * 1000,
            estimatedCost: (fullConfig.maxIterations * 0.01) + (repl.getSubCallCount() * 0.005)
        }
    };
}

// ============================================================================
// INTEGRATION WITH ACE
// ============================================================================

/**
 * RLM-enhanced consensus: Use RLM for long-context tasks, fall back to ACE for short
 */
export async function rlmEnhancedQuery(
    context: string,
    query: string,
    onStatusUpdate?: (status: RLMStatus) => void,
    config: Partial<RLMConfig> = {}
): Promise<RLMResult> {
    // Threshold: If context fits in normal window, use direct query
    const CONTEXT_THRESHOLD = 100000; // ~25k tokens

    if (context.length < CONTEXT_THRESHOLD) {
        // Direct query for short contexts
        const ai = getAI();
        const startTime = Date.now();

        const response = await retryGeminiRequest(() =>
            ai.models.generateContent({
                model: config.rootModel || DEFAULT_RLM_CONFIG.rootModel,
                contents: `${query}\n\nContext:\n${context}`,
                config: { temperature: 0.7 }
            })
        );

        return {
            answer: response.text || '',
            iterations: 1,
            subCalls: 0,
            totalTokens: Math.ceil(context.length / 4),
            executionTime: Date.now() - startTime,
            trajectory: []
        };
    }

    // Use full RLM for long contexts
    return recursiveLLMQuery(context, query, onStatusUpdate, config);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    recursiveLLMQuery,
    rlmEnhancedQuery,
    DEFAULT_RLM_CONFIG
};
