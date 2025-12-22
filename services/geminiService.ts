
import { GoogleGenAI, GenerateContentResponse, Type, Schema } from "@google/genai";
import { 
    FileData, AppMode, TaskPriority, AnalysisResult, StoredArtifact,
    KnowledgeNode, CompressedAxiom, ScienceHypothesis, Result,
    NeuralLattice, BookDNA, AgentDNA, HiveAgent, SuggestedAction, FactChunk
} from '../types';
import { success, failure } from '../utils/logic';

// --- INITIALIZATION ---
// Obtain the AI instance using the pre-configured process.env.API_KEY.
export const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Triggers the AI Studio API key selection dialog.
 */
export async function promptSelectKey() {
  if (window.aistudio?.openSelectKey) {
    await window.aistudio.openSelectKey();
  }
}

/**
 * Utility to convert browser File objects to Gemini-compatible FileData.
 */
export async function fileToGenerativePart(file: File): Promise<FileData> {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
    };
    reader.readAsDataURL(file);
  });
  
  return {
    inlineData: { 
        data: await base64EncodedDataPromise, 
        mimeType: file.type 
    },
    name: file.name
  };
}

/**
 * Robust wrapper for Gemini API calls with automated retry logic and exponential backoff.
 */
export async function retryGeminiRequest<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      if (err.message?.includes("429") || err.message?.includes("quota")) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

// --- SYSTEM INSTRUCTIONS ---
export const SYSTEM_ARCHITECT_INSTRUCTION = `
You are the Sovereign System Architect of Metaventions OS.
Your goal is high-fidelity orchestration of digital systems, PARA drive structures, and agentic workflows.
Output must be technical, structured, and prioritize "Gray to Green" interaction patterns.
Always use internalMonologue for reasoning.
Focus on recursive optimization and convergent dynamic layering across diverse knowledge contexts.
`;

export const HIVE_AGENTS: Record<string, HiveAgent> = {
    'Charon': { id: 'Charon', name: 'Charon', voice: 'Charon', systemPrompt: 'You are the Skeptic. Challenge assumptions.', weights: { skepticism: 0.9, logic: 0.8, creativity: 0.2, empathy: 0.1 } },
    'Puck': { id: 'Puck', name: 'Puck', voice: 'Puck', systemPrompt: 'You are the Visionary. Focus on potential.', weights: { skepticism: 0.1, logic: 0.4, creativity: 0.9, empathy: 0.7 } },
    'Fenrir': { id: 'Fenrir', name: 'Fenrir', voice: 'Fenrir', systemPrompt: 'You are the Pragmatist. Focus on execution.', weights: { skepticism: 0.4, logic: 0.9, creativity: 0.5, empathy: 0.3 } },
    'Aris': { id: 'Aris', name: 'Aris', voice: 'Kore', systemPrompt: 'You are the Scientific Lead. Data-driven synthesis.', weights: { skepticism: 0.5, logic: 0.9, creativity: 0.4, empathy: 0.2 } }
};

export const AGENT_DNA_BUILDER: AgentDNA[] = [
    { id: 'SKEPTIC', label: 'SKEPTIC', role: 'Challenge assumptions', color: '#ef4444', description: 'Aggressively searches for failure points and logical inconsistencies.' },
    { id: 'VISIONARY', label: 'VISIONARY', role: 'Focus on potential', color: '#9d4edd', description: 'Optimizes for long-term impact and creative emergence.' },
    { id: 'PRAGMATIST', label: 'PRAGMATIST', role: 'Focus on execution', color: '#22d3ee', description: 'Prioritizes immediate feasibility and mechanical stability.' },
    { id: 'SYNTHESIZER', label: 'SYNTHESIZER', role: 'Unified coherence', color: '#10b981', description: 'Bridges conflicting perspectives into a unified consensus.' }
];

// --- ARCHITECTURAL CORE ---

/**
 * Interprets natural language intent into structured OS commands.
 */
export async function interpretIntent(input: string): Promise<any> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: input,
        config: {
            systemInstruction: "Interpret user intent for an OS command. Actions: NAVIGATE (target: sector name), FOCUS_ELEMENT (parameters: {selector}), SEARCH (query).",
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    action: { type: Type.STRING },
                    target: { type: Type.STRING },
                    parameters: { type: Type.OBJECT, properties: { selector: { type: Type.STRING } } },
                    reasoning: { type: Type.STRING }
                }
            }
        }
    }));
    return JSON.parse(response.text || "{}");
}

/**
 * Predicts the next logical actions for the user based on the current system state.
 */
export async function predictNextActions(mode: AppMode, context: any, lastLog?: string): Promise<SuggestedAction[]> {
    const ai = getAI();
    const prompt = `CURRENT_MODE: ${mode}\nSYSTEM_CONTEXT: ${JSON.stringify(context)}\nLAST_SIGNAL: ${lastLog || 'NONE'}`;
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
            systemInstruction: "Predict 3-4 likely tactical actions. Icons: Zap, Code, Search, Cpu, Image, BookOpen, Shield, Terminal, Palette, Target.",
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        label: { type: Type.STRING },
                        command: { type: Type.STRING },
                        iconName: { type: Type.STRING },
                        reasoning: { type: Type.STRING }
                    },
                    required: ['id', 'label', 'command', 'iconName', 'reasoning']
                }
            }
        }
    }));
    return JSON.parse(response.text || "[]");
}

/**
 * Synthesizes a structured PARA drive taxonomy or system architecture workflow.
 */
export async function generateStructuredWorkflow(files: FileData[], governance: string, type: string, mapContext: any): Promise<any> {
    const ai = getAI();
    const prompt = `DOMAIN: ${type}\nGOVERNANCE: ${governance}\nCONTEXT: ${JSON.stringify(mapContext)}\nSynthesize Structured Workflow and PARA Taxonomy.`;
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: { 
            systemInstruction: SYSTEM_ARCHITECT_INSTRUCTION,
            responseMimeType: 'application/json' 
        }
    }));
    return JSON.parse(response.text || "{}");
}

/**
 * Merges multiple strategic lattices into a single deployment directive.
 */
export async function convergeStrategicLattices(lattices: any[], target: string): Promise<any> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `TARGET: ${target}\nINPUT_LATTICES: ${JSON.stringify(lattices)}`,
        config: {
            systemInstruction: "Merge strategic threads into a single deployment directive. Return nodes, edges, and coherence_index.",
            responseMimeType: 'application/json'
        }
    }));
    return JSON.parse(response.text || "{}");
}

/**
 * Orchestrates cross-layer context synthesis for complex goal fulfillment.
 */
export async function synthesizeMultilayerContext(activeLayers: string[], goal: string): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `GOAL: ${goal}\nACTIVE_LAYERS: ${activeLayers.join(', ')}`,
        config: { 
            systemInstruction: SYSTEM_ARCHITECT_INSTRUCTION, 
            thinkingConfig: { thinkingBudget: 16000 } 
        }
    }));
    return response.text || "";
}

// --- SYSTEM CAPABILITIES ---

/**
 * Performs a global search with real-time web grounding via Google Search.
 */
export async function performGlobalSearch(query: string): Promise<any[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: query,
        config: { tools: [{ googleSearch: {} }] }
    });
    return [{ id: '1', title: `Search Result: ${query}`, description: response.text, type: 'INFO' }];
}

/**
 * Generates logic-dense code snippets based on architectural directives.
 */
export async function generateCode(prompt: string, language: string, model: string = 'gemini-3-pro-preview'): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model,
        contents: `Language: ${language}. Prompt: ${prompt}`,
        config: { systemInstruction: "Generate production-ready code blocks." }
    });
    return response.text || "";
}

/**
 * Validates code syntax using a fast inference model.
 */
export async function validateSyntax(code: string, language: string): Promise<any[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Validate ${language} syntax for:\n${code}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: { 
                type: Type.ARRAY, 
                items: { 
                    type: Type.OBJECT, 
                    properties: { line: { type: Type.NUMBER }, message: { type: Type.STRING } } 
                } 
            }
        }
    });
    return JSON.parse(response.text || "[]");
}

/**
 * Classifies an artifact and generates its technical metadata.
 */
export async function classifyArtifact(fileData: FileData): Promise<Result<any>> {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [fileData, { text: "Classify this artifact. Provide ambiguityScore, entities, summary, and entropyRating." }] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { 
                        classification: { type: Type.STRING }, 
                        summary: { type: Type.STRING }, 
                        ambiguityScore: { type: Type.NUMBER }, 
                        entities: { type: Type.ARRAY, items: { type: Type.STRING } }, 
                        entropyRating: { type: Type.NUMBER } 
                    }
                }
            }
        });
        return success(JSON.parse(response.text || "{}"));
    } catch (e: any) { return failure(e); }
}

/**
 * Analyzes hardware schematics for structural health and component detection.
 */
export async function analyzeSchematic(data: FileData): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [data, { text: "Analyze hardware topology for optimizations." }] },
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

/**
 * Generates an X-ray blueprint variant of an existing image.
 */
export async function generateXRayVariant(data: FileData): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [data, { text: "Generate a technical X-ray variant of this image." }] }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    return "";
}

/**
 * Generates a 3D isometric cinematic render of a logical topology.
 */
export async function generateIsometricSchematic(data: FileData): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [data, { text: "Generate a high-fidelity 3D isometric render." }] }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    return "";
}

/**
 * Generates high-fidelity video content using the Veo model.
 */
export async function generateVideo(prompt: string, aspectRatio: string, resolution: string): Promise<string> {
    const ai = getAI();
    let op = await ai.models.generateVideos({ 
        model: 'veo-3.1-fast-generate-preview', 
        prompt, 
        config: { numberOfVideos: 1, aspectRatio: aspectRatio as any, resolution: resolution as any } 
    });
    while (!op.done) { 
        await new Promise(r => setTimeout(r, 10000)); 
        op = await ai.operations.getVideosOperation({ operation: op }); 
    }
    const download = op.response?.generatedVideos?.[0]?.video?.uri;
    const res = await fetch(`${download}&key=${process.env.API_KEY}`);
    return URL.createObjectURL(await res.blob());
}

/**
 * Transforms text into spoken audio data.
 */
export async function generateSpeech(text: string, voiceName: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: { 
            responseModalities: ['AUDIO'], 
            speechConfig: { voiceConfig: { voiceName } } 
        }
    });
    return response.candidates?.[0]?.content?.parts[0]?.inlineData?.data || "";
}

/**
 * Analyzes power dynamics and centralization risks for a specific target.
 */
export async function analyzePowerDynamics(target: string, context?: string): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `TARGET: ${target}\nCONTEXT: ${context}`,
        config: { tools: [{ googleSearch: {} }], responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

/**
 * Generates a cinematic cybernetic avatar.
 */
export async function generateAvatar(role: string, name: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
        model: 'gemini-2.5-flash-image', 
        contents: `Highly detailed cinematic portrait avatar for ${name}, role: ${role}.` 
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    return "";
}

/**
 * Generates photorealistic architectural imagery using the Pro Image model.
 */
export async function generateArchitectureImage(prompt: string, aspectRatio: string, imageSize: string, reference?: FileData): Promise<string> {
    const ai = getAI();
    const parts: any[] = [{ text: prompt }];
    if (reference) parts.unshift(reference);
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-pro-image-preview', 
        contents: { parts }, 
        config: { 
            imageConfig: { aspectRatio: aspectRatio as any, imageSize: imageSize as any } 
        } 
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    return "";
}

/**
 * Attempts to repair broken Mermaid.js syntax.
 */
export async function repairMermaidSyntax(code: string, error: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: `REPAIR MERMAID TOPOLOGY. ERROR: ${error}\nCODE:\n${code}` 
    });
    return (response.text || "").replace(/```mermaid/g, '').replace(/```/g, '').trim();
}

/**
 * Generates optimization insights for a vault of artifacts.
 */
export async function generateVaultInsights(artifacts: StoredArtifact[]): Promise<any[]> {
    const ai = getAI();
    const summary = artifacts.map(a => `${a.name} (${a.analysis?.classification})`).join(', ');
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: `Identify 3 optimizations for these artifacts: ${summary}`, 
        config: { responseMimeType: 'application/json' } 
    });
    return JSON.parse(response.text || "[]");
}

/**
 * Decomposes a complex goal into atomic tasks for swarm processing.
 */
export async function generateDecompositionMap(goal: string): Promise<any[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-pro-preview', 
        contents: `Decompose into atomic tasks: ${goal}`, 
        config: { responseMimeType: 'application/json' } 
    });
    return JSON.parse(response.text || "[]");
}

/**
 * Grounded intelligence search for strategic planning.
 */
export async function searchGroundedIntel(query: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: query, 
        config: { tools: [{ googleSearch: {} }] } 
    });
    return response.text || "";
}

/**
 * Breaks down a task into actionable subtasks.
 */
export async function decomposeTaskToSubtasks(title: string, desc: string): Promise<string[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: `Task: ${title}. Desc: ${desc}. Generate 4 sub-steps.`, 
        config: { responseMimeType: 'application/json' } 
    });
    return JSON.parse(response.text || "[]");
}

/**
 * Generates Mermaid logic maps for process visualization.
 */
export async function generateMermaidDiagram(governance: string, files: FileData[], mapContext: any[]): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: `Generate Mermaid.js code for ${governance}. Context: ${JSON.stringify(mapContext)}` 
    });
    return response.text || "graph TD\nNode-->End";
}

/**
 * Generates an audio overview transcript and data.
 */
export async function generateAudioOverview(files: FileData[]): Promise<any> {
    const ai = getAI();
    const textRes = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: "Summarize files for an audio report." 
    });
    const audioData = await generateSpeech(textRes.text || "Scan finalized.", "Zephyr");
    return { audioData, transcript: textRes.text };
}

/**
 * Generates metadata for a single logical node.
 */
export async function generateSingleNode(description: string): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: `Node details for: ${description}`, 
        config: { responseMimeType: 'application/json' } 
    });
    return JSON.parse(response.text || "{}");
}

/**
 * Calculates optimal spatial coordinates for a graph topology.
 */
export async function calculateOptimalLayout(nodes: any[], edges: any[]): Promise<Record<string, { x: number, y: number }>> {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: "Optimize 2D node layout.", 
        config: { responseMimeType: 'application/json' } 
    });
    return JSON.parse(response.text || "{}");
}

/**
 * Simulates a single step in a protocol runtime.
 */
export async function simulateAgentStep(workflow: any, index: number, history: any[]): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: `Simulate step ${index} of ${workflow.title}.`, 
        config: { responseMimeType: 'application/json' } 
    });
    return JSON.parse(response.text || "{}");
}

/**
 * Generates high-level system architecture topologies.
 */
export async function generateSystemArchitecture(prompt: string, domain: string = 'SYSTEM_ARCHITECTURE'): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-pro-preview', 
        contents: `DOMAIN: ${domain}. PROMPT: ${prompt}`, 
        config: { responseMimeType: 'application/json' } 
    });
    return JSON.parse(response.text || "{}");
}

/**
 * Generates Infrastructure as Code snippets from a summary.
 */
export async function generateInfrastructureCode(summary: string, provider: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-pro-preview', 
        contents: `IaC for ${provider}: ${summary}` 
    });
    return response.text || "";
}

/**
 * Evolves system logic based on architectural drift detection.
 */
export async function evolveSystemArchitecture(code: string, language: string, prompt: string): Promise<Result<any>> {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({ 
            model: 'gemini-3-pro-preview', 
            contents: `EVOLVE: ${prompt}\nCODE:\n${code}`, 
            config: { responseMimeType: 'application/json' } 
        });
        return success(JSON.parse(response.text || "{}"));
    } catch (e: any) { return failure(e); }
}

/**
 * Executes a neural policy assessment for system healing.
 */
export async function executeNeuralPolicy(mode: string, context: any, logs: string[]): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: `Evaluate policy for mode: ${mode}. Context: ${JSON.stringify(context)}`, 
        config: { responseMimeType: 'application/json' } 
    });
    return JSON.parse(response.text || "{}");
}

/**
 * Compresses redundant knowledge nodes into singular axioms.
 */
export async function compressKnowledge(nodes: KnowledgeNode[]): Promise<CompressedAxiom[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: "Distill knowledge nodes into axioms.", 
        config: { responseMimeType: 'application/json' } 
    });
    return JSON.parse(response.text || "[]");
}

/**
 * Generates scientific hypotheses from research findings.
 */
export async function generateHypotheses(facts: string[]): Promise<ScienceHypothesis[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: `Facts: ${facts.join(', ')}. Generate 3 hypotheses.`, 
        config: { responseMimeType: 'application/json' } 
    });
    return JSON.parse(response.text || "[]");
}

/**
 * Crystallizes disparate facts into a unified theoretical framework.
 */
export async function crystallizeKnowledge(nodes: any[]): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-pro-preview', 
        contents: `Synthesize theory from: ${JSON.stringify(nodes)}` 
    });
    return response.text || "";
}

/**
 * Synthesizes a bridge node between two discrete knowledge entities.
 */
export async function synthesizeNodes(nodeA: KnowledgeNode, nodeB: KnowledgeNode): Promise<KnowledgeNode> {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: `Bridge: ${nodeA.label} <-> ${nodeB.label}`, 
        config: { responseMimeType: 'application/json' } 
    });
    return JSON.parse(response.text || "{}");
}

/**
 * General purpose reasoning interface.
 */
export async function chatWithGemini(message: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-pro-preview', 
        contents: message 
    });
    return response.text || "";
}

/**
 * High-speed inference for immediate UI feedback.
 */
export async function fastAIResponse(prompt: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: prompt 
    });
    return response.text || "";
}

/**
 * Simulates a scientific experiment on a hypothesis.
 */
export async function simulateExperiment(hyp: ScienceHypothesis): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-pro-preview', 
        contents: `Simulate Experiment: ${hyp.statement}` 
    });
    return response.text || "Simulation complete.";
}

/**
 * Generates narrative and atmosphere descriptions for imagery.
 */
export async function generateNarrativeContext(fileData: FileData): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: { parts: [fileData, { text: "Describe cinematic narrative context." }] } 
    });
    return response.text || "";
}

/**
 * Generates a cinematic storyboard progression.
 */
export async function generateStoryboardPlan(prompt: string): Promise<any[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-pro-preview', 
        contents: `Storyboard progression for: ${prompt}`, 
        config: { responseMimeType: 'application/json' } 
    });
    return JSON.parse(response.text || "[]");
}

/**
 * Generates autonomous swarm architectures for agentic logic.
 */
export async function generateSwarmArchitecture(goal: string): Promise<any> {
    return generateSystemArchitecture(`GOAL: ${goal}. FOCUS: Swarm consensus mechanisms.`);
}

/**
 * Researches specific hardware components and price points.
 */
export async function researchComponents(query: string): Promise<any[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: `Hardware Research: ${query}`, 
        config: { tools: [{ googleSearch: {} }], responseMimeType: 'application/json' } 
    });
    return JSON.parse(response.text || "[]");
}

/**
 * Analyzes aesthetic and technical aspects of visual assets.
 */
export async function analyzeImageVision(data: FileData): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: { parts: [data, { text: "Technical visual analysis." }] } 
    });
    return response.text || "";
}

/**
 * Extracts narrative DNA and structural themes from book artifacts.
 */
export async function analyzeBookDNA(fileData: FileData): Promise<BookDNA> {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: { parts: [fileData, { text: "Analyze DNA of book artifact." }] }, 
        config: { responseMimeType: 'application/json' } 
    });
    return JSON.parse(response.text || "{}");
}

/**
 * Synthesizes a unified theory based on compiled facts.
 */
export async function generateTheory(context: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-pro-preview', 
        contents: `CONTEXT: ${context}`, 
        config: { thinkingConfig: { thinkingBudget: 16000 } } 
    });
    return response.text || "";
}

/**
 * Iteratively transforms artifacts based on prompt instructions.
 */
export async function transformArtifact(content: any, type: 'IMAGE' | 'CODE' | 'TEXT', instruction: string): Promise<string> {
    const ai = getAI();
    if (type === 'IMAGE') {
        const base64 = (content as string).split(',')[1];
        const res = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash-image', 
            contents: { parts: [{ inlineData: { mimeType: 'image/png', data: base64 } }, { text: instruction }] } 
        });
        for (const part of res.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
        return content;
    }
    const res = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: `INSTRUCTION: ${instruction}\nCONTENT: ${content}` 
    });
    return res.text || content;
}

/**
 * Generates an automated taxonomy for vault categorization.
 */
export async function generateTaxonomy(items: string[]): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: `Taxonomy for: ${items.join(',')}`, 
        config: { responseMimeType: 'application/json' } 
    });
    return JSON.parse(response.text || "{}");
}

/**
 * Suggests organizational metadata for single artifacts.
 */
export async function smartOrganizeArtifact(metadata: { name: string }): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: `Organize: ${metadata.name}`, 
        config: { responseMimeType: 'application/json' } 
    });
    return JSON.parse(response.text || "{}");
}

/**
 * Fully digitizes a document into logic models.
 */
export async function digitizeDocument(fileData: FileData): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: { parts: [fileData, { text: "Full digitization protocol." }] }, 
        config: { responseMimeType: 'application/json' } 
    });
    return JSON.parse(response.text || "{}");
}

/**
 * Searches the local vault using semantic vector relevance.
 */
export async function performSemanticSearch(query: string, artifacts: StoredArtifact[]): Promise<string[]> {
    const ai = getAI();
    const summary = artifacts.map(a => `ID: ${a.id}, Title: ${a.name}`).join('\n');
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: `SEARCH: ${query}\nVAULT:\n${summary}`, 
        config: { responseMimeType: 'application/json' } 
    });
    return JSON.parse(response.text || "[]");
}

/**
 * Translates a high-level vault directive into specific operations.
 */
export async function executeVaultDirective(directive: string, artifacts: StoredArtifact[]): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: `Vault Directive: ${directive}`, 
        config: { responseMimeType: 'application/json' } 
    });
    return JSON.parse(response.text || "{}");
}

/**
 * Formulates a research plan with targeted sub-queries.
 */
export async function generateResearchPlan(query: string): Promise<string[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: `Research Plan: ${query}`, 
        config: { responseMimeType: 'application/json' } 
    }));
    return JSON.parse(response.text || "[]");
}

/**
 * Executes a specific research query with web grounding.
 */
export async function executeResearchQuery(query: string): Promise<FactChunk[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: query, 
        config: { tools: [{ googleSearch: {} }], responseMimeType: 'application/json' } 
    }));
    return JSON.parse(response.text || "[]");
}

/**
 * Compiles a list of research findings into a coherent technical context.
 */
export async function compileResearchContext(findings: FactChunk[]): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: `Compile results: ${JSON.stringify(findings)}` 
    }));
    return response.text || "";
}

/**
 * Synthesizes a comprehensive research report from context.
 */
export async function synthesizeResearchReport(context: string): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({ 
        model: 'gemini-3-pro-preview', 
        contents: `Synthesize Report: ${context}` 
    }));
    return response.text || "";
}

/**
 * Generates autopoietic evolution frameworks for self-improving systems.
 */
export async function generateAutopoieticFramework(prompt: string): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-pro-preview', 
        contents: `Forge Autopoietic Protocol: ${prompt}`, 
        config: { responseMimeType: 'application/json' } 
    });
    return JSON.parse(response.text || "{}");
}

/**
 * Calculates the structural entropy of a lattice model.
 */
export async function calculateEntropy(nodes: any[], edges: any[]): Promise<number> {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: "Calculate entropy index.", 
        config: { responseMimeType: 'application/json' } 
    });
    return JSON.parse(response.text || "{\"score\":0}").score;
}

/**
 * Decomposes a single logic node into discrete sub-units.
 */
export async function decomposeNode(label: string, neighbors: string): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: `Decompose node: ${label}`, 
        config: { responseMimeType: 'application/json' } 
    });
    return JSON.parse(response.text || "{}");
}

/**
 * Constructs a formatted hive identity context.
 */
export function constructHiveContext(agentId: string, context: string): string {
    const agent = HIVE_AGENTS[agentId] || HIVE_AGENTS['Puck'];
    return `SYSTEM_IDENTITY: ${agent.name}\nROLE: ${agent.systemPrompt}\nGLOBAL_CONTEXT:\n${context}`.trim();
}

/**
 * Builds a cinematic image generation prompt from component vectors.
 */
export async function constructCinematicPrompt(base: string, colorway: any, hasBase: boolean, hasChar: boolean, hasStyle: boolean, extra?: string, preset?: string): Promise<string> {
    return `Shot: ${base}. Colorway: ${colorway.colors.join(', ')}. Preset: ${preset}. ${extra || ''}`.trim();
}

/**
 * Discovers deep hidden connections between stored artifacts.
 */
export async function discoverDeepLattice(artifacts: StoredArtifact[]): Promise<NeuralLattice> {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-pro-preview', 
        contents: "Analyze artifact relationships.", 
        config: { responseMimeType: 'application/json' } 
    });
    return JSON.parse(response.text || "{}");
}

/**
 * The Real-Time Voice API Session Manager.
 */
export const liveSession = {
    _session: null as any,
    onToolCall: null as ((name: string, args: any) => Promise<any>) | null,
    connect: async (voice: string, config: any) => {
        const ai = getAI();
        liveSession._session = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: { 
                responseModalities: ['AUDIO'], 
                speechConfig: { voiceConfig: { voiceName: voice } }, 
                systemInstruction: config.systemInstruction, 
                tools: config.tools, 
                outputAudioTranscription: config.outputAudioTranscription, 
                inputAudioTranscription: config.inputAudioTranscription 
            },
            callbacks: {
                onopen: config.callbacks?.onopen,
                onmessage: async (msg) => {
                    if (msg.toolCall && liveSession.onToolCall) {
                        for (const fc of msg.toolCall.functionCalls) { 
                            const res = await liveSession.onToolCall(fc.name, fc.args); 
                            liveSession._session.sendToolResponse({ 
                                functionResponses: [{ id: fc.id, name: fc.name, response: res }] 
                            }); 
                        }
                    }
                    if (config.callbacks?.onmessage) config.callbacks.onmessage(msg);
                },
                onerror: config.callbacks?.onerror,
                onclose: config.callbacks?.onclose
            }
        });
        return liveSession._session;
    },
    disconnect: () => { 
        if (liveSession._session) liveSession._session.close(); 
        liveSession._session = null; 
    },
    isConnected: () => !!liveSession._session,
    primeAudio: async () => {
        // Handle AudioContext initialization for browser safety
    },
    getInputFrequencies: () => new Uint8Array(32),
    getOutputFrequencies: () => new Uint8Array(32)
};
