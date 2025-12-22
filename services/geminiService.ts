import { GoogleGenAI, GenerateContentResponse, Type, Schema } from "@google/genai";
import { 
    FileData, AppMode, TaskPriority, AnalysisResult, StoredArtifact,
    KnowledgeNode, CompressedAxiom, ScienceHypothesis, Result,
    NeuralLattice, BookDNA, AgentDNA, HiveAgent, SuggestedAction, FactChunk
} from '../types';
import { success, failure } from '../utils/logic';

// --- INITIALIZATION ---
export const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    name: file.name
  };
}

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

export async function synthesizeMultilayerContext(activeLayers: string[], goal: string): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `GOAL: ${goal}\nACTIVE_LAYERS: ${activeLayers.join(', ')}`,
        config: { systemInstruction: SYSTEM_ARCHITECT_INSTRUCTION, thinkingConfig: { thinkingBudget: 16000 } }
    }));
    return response.text || "";
}

// --- SYSTEM CAPABILITIES ---

export async function performGlobalSearch(query: string): Promise<any[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: query,
        config: { tools: [{ googleSearch: {} }] }
    });
    return [{ id: '1', title: `Search: ${query}`, description: response.text, type: 'INFO' }];
}

export async function generateCode(prompt: string, language: string, model: string = 'gemini-3-pro-preview'): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model,
        contents: `Language: ${language}. Prompt: ${prompt}`,
        config: { systemInstruction: "Generate production-ready code." }
    });
    return response.text || "";
}

export async function validateSyntax(code: string, language: string): Promise<any[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Validate ${language} code:\n${code}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { line: { type: Type.NUMBER }, message: { type: Type.STRING } } } }
        }
    });
    return JSON.parse(response.text || "[]");
}

export async function classifyArtifact(fileData: FileData): Promise<Result<any>> {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [fileData, { text: "Classify artifact metadata." }] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { classification: { type: Type.STRING }, summary: { type: Type.STRING }, ambiguityScore: { type: Type.NUMBER }, entities: { type: Type.ARRAY, items: { type: Type.STRING } }, entropyRating: { type: Type.NUMBER } }
                }
            }
        });
        return success(JSON.parse(response.text || "{}"));
    } catch (e: any) { return failure(e); }
}

export async function analyzeSchematic(data: FileData): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [data, { text: "Analyze hardware topology." }] },
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export async function generateXRayVariant(data: FileData): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [data, { text: "X-ray style blueprint." }] }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    return "";
}

export async function generateIsometricSchematic(data: FileData): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [data, { text: "3D isometric render." }] }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    return "";
}

export async function generateVideo(prompt: string, aspectRatio: string, resolution: string): Promise<string> {
    const ai = getAI();
    let op = await ai.models.generateVideos({ model: 'veo-3.1-fast-generate-preview', prompt, config: { numberOfVideos: 1, aspectRatio: aspectRatio as any, resolution: resolution as any } });
    while (!op.done) { await new Promise(r => setTimeout(r, 10000)); op = await ai.operations.getVideosOperation({ operation: op }); }
    const download = op.response?.generatedVideos?.[0]?.video?.uri;
    const res = await fetch(`${download}&key=${process.env.API_KEY}`);
    return URL.createObjectURL(await res.blob());
}

export async function generateSpeech(text: string, voiceName: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { voiceName } } }
    });
    return response.candidates?.[0]?.content?.parts[0]?.inlineData?.data || "";
}

export async function analyzePowerDynamics(target: string, context?: string): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `TARGET: ${target}\nCONTEXT: ${context}`,
        config: { tools: [{ googleSearch: {} }], responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export async function generateAvatar(role: string, name: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: `Avatar for ${name}, ${role}.` });
    for (const part of response.candidates?.[0]?.content?.parts || []) if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    return "";
}

export async function generateArchitectureImage(prompt: string, aspectRatio: string, imageSize: string, reference?: FileData): Promise<string> {
    const ai = getAI();
    const parts: any[] = [{ text: prompt }];
    if (reference) parts.unshift(reference);
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-image-preview', contents: { parts }, config: { imageConfig: { aspectRatio: aspectRatio as any, imageSize: imageSize as any } } });
    for (const part of response.candidates?.[0]?.content?.parts || []) if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    return "";
}

export async function repairMermaidSyntax(code: string, error: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `FIX MERMAID: ${error}\nCODE:\n${code}` });
    return (response.text || "").replace(/```mermaid/g, '').replace(/```/g, '').trim();
}

export async function generateVaultInsights(artifacts: StoredArtifact[]): Promise<any[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Analyze ${artifacts.length} items.`, config: { responseMimeType: 'application/json' } });
    return JSON.parse(response.text || "[]");
}

export async function generateDecompositionMap(goal: string): Promise<any[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: `Decompose ${goal}`, config: { responseMimeType: 'application/json' } });
    return JSON.parse(response.text || "[]");
}

export async function searchGroundedIntel(query: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: query, config: { tools: [{ googleSearch: {} }] } });
    return response.text || "";
}

export async function decomposeTaskToSubtasks(title: string, desc: string): Promise<string[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Decompose ${title}`, config: { responseMimeType: 'application/json' } });
    return JSON.parse(response.text || "[]");
}

export async function generateMermaidDiagram(governance: string, files: FileData[], mapContext: any[]): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Mermaid for ${governance}` });
    return response.text || "graph TD\nNode-->End";
}

export async function generateAudioOverview(files: FileData[]): Promise<any> {
    const ai = getAI();
    const textRes = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: "Summarize files for audio." });
    const audioData = await generateSpeech(textRes.text || "Scan complete.", "Zephyr");
    return { audioData, transcript: textRes.text };
}

export async function generateSingleNode(description: string): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Node: ${description}`, config: { responseMimeType: 'application/json' } });
    return JSON.parse(response.text || "{}");
}

export async function calculateOptimalLayout(nodes: any[], edges: any[]): Promise<Record<string, { x: number, y: number }>> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: "Calculate 2D coordinates.", config: { responseMimeType: 'application/json' } });
    return JSON.parse(response.text || "{}");
}

export async function simulateAgentStep(workflow: any, index: number, history: any[]): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Step ${index}`, config: { responseMimeType: 'application/json' } });
    return JSON.parse(response.text || "{}");
}

export async function generateSystemArchitecture(prompt: string, domain: string = 'SYSTEM_ARCHITECTURE'): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: `PROMPT: ${prompt}\nDOMAIN: ${domain}`, config: { responseMimeType: 'application/json' } });
    return JSON.parse(response.text || "{}");
}

export async function generateInfrastructureCode(summary: string, provider: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: `IaC for ${provider}: ${summary}` });
    return response.text || "";
}

export async function evolveSystemArchitecture(code: string, language: string, prompt: string): Promise<Result<any>> {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: `EVOLVE: ${prompt}\nCODE: ${code}`, config: { responseMimeType: 'application/json' } });
        return success(JSON.parse(response.text || "{}"));
    } catch (e: any) { return failure(e); }
}

export async function executeNeuralPolicy(mode: string, context: any, logs: string[]): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `MODE: ${mode}`, config: { responseMimeType: 'application/json' } });
    return JSON.parse(response.text || "{}");
}

export async function compressKnowledge(nodes: KnowledgeNode[]): Promise<CompressedAxiom[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: "Compress knowledge.", config: { responseMimeType: 'application/json' } });
    return JSON.parse(response.text || "[]");
}

export async function generateHypotheses(facts: string[]): Promise<ScienceHypothesis[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `FACTS: ${facts.join(',')}`, config: { responseMimeType: 'application/json' } });
    return JSON.parse(response.text || "[]");
}

export async function crystallizeKnowledge(nodes: any[]): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: "Unified theory synthesis." });
    return response.text || "";
}

export async function synthesizeNodes(nodeA: KnowledgeNode, nodeB: KnowledgeNode): Promise<KnowledgeNode> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Bridge ${nodeA.label} and ${nodeB.label}`, config: { responseMimeType: 'application/json' } });
    return JSON.parse(response.text || "{}");
}

export async function chatWithGemini(message: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: message });
    return response.text || "";
}

export async function fastAIResponse(prompt: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    return response.text || "";
}

export async function simulateExperiment(hyp: ScienceHypothesis): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: `Simulate: ${hyp.statement}` });
    return response.text || "Simulation complete.";
}

export async function generateNarrativeContext(fileData: FileData): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: { parts: [fileData, { text: "Narrative context." }] } });
    return response.text || "";
}

export async function generateStoryboardPlan(prompt: string): Promise<any[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: `Storyboard: ${prompt}`, config: { responseMimeType: 'application/json' } });
    return JSON.parse(response.text || "[]");
}

export async function generateSwarmArchitecture(goal: string): Promise<any> {
    return generateSystemArchitecture(`GOAL: ${goal}. FOCUS: Swarm patterns.`);
}

export async function researchComponents(query: string): Promise<any[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Research hardware: ${query}`, config: { tools: [{ googleSearch: {} }], responseMimeType: 'application/json' } });
    return JSON.parse(response.text || "[]");
}

export async function analyzeImageVision(data: FileData): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: { parts: [data, { text: "Technical visual analysis." }] } });
    return response.text || "";
}

export async function analyzeBookDNA(fileData: FileData): Promise<BookDNA> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: { parts: [fileData, { text: "Book DNA analysis." }] }, config: { responseMimeType: 'application/json' } });
    return JSON.parse(response.text || "{}");
}

export async function generateTheory(context: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: `CONTEXT: ${context}`, config: { thinkingConfig: { thinkingBudget: 16000 } } });
    return response.text || "";
}

export async function transformArtifact(content: any, type: 'IMAGE' | 'CODE' | 'TEXT', instruction: string): Promise<string> {
    const ai = getAI();
    if (type === 'IMAGE') {
        const base64 = (content as string).split(',')[1];
        const res = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: { parts: [{ inlineData: { mimeType: 'image/png', data: base64 } }, { text: instruction }] } });
        for (const part of res.candidates?.[0]?.content?.parts || []) if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        return content;
    }
    const res = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `INSTRUCTION: ${instruction}\nCONTENT: ${content}` });
    return res.text || content;
}

export async function generateTaxonomy(items: string[]): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `ITEMS: ${items.join(',')}`, config: { responseMimeType: 'application/json' } });
    return JSON.parse(response.text || "{}");
}

export async function smartOrganizeArtifact(metadata: { name: string }): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `ORGANIZE: ${metadata.name}`, config: { responseMimeType: 'application/json' } });
    return JSON.parse(response.text || "{}");
}

export async function digitizeDocument(fileData: FileData): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: { parts: [fileData, { text: "Digitize document." }] }, config: { responseMimeType: 'application/json' } });
    return JSON.parse(response.text || "{}");
}

export async function performSemanticSearch(query: string, artifacts: StoredArtifact[]): Promise<string[]> {
    const ai = getAI();
    const summary = artifacts.map(a => `ID: ${a.id}, Title: ${a.name}`).join('\n');
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `SEARCH: ${query}\nVAULT:\n${summary}`, config: { responseMimeType: 'application/json' } });
    return JSON.parse(response.text || "[]");
}

export async function executeVaultDirective(directive: string, artifacts: StoredArtifact[]): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `DIRECTIVE: ${directive}`, config: { responseMimeType: 'application/json' } });
    return JSON.parse(response.text || "{}");
}

export async function generateResearchPlan(query: string): Promise<string[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `PLAN: ${query}`, config: { responseMimeType: 'application/json' } }));
    return JSON.parse(response.text || "[]");
}

export async function executeResearchQuery(query: string): Promise<FactChunk[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: query, config: { tools: [{ googleSearch: {} }], responseMimeType: 'application/json' } }));
    return JSON.parse(response.text || "[]");
}

export async function compileResearchContext(findings: FactChunk[]): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `COMPILE: ${JSON.stringify(findings)}` }));
    return response.text || "";
}

export async function synthesizeResearchReport(context: string): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: `SYNTHESIZE REPORT: ${context}` }));
    return response.text || "";
}

export async function generateAutopoieticFramework(prompt: string): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: `AUTOPOIETIC: ${prompt}`, config: { responseMimeType: 'application/json' } });
    return JSON.parse(response.text || "{}");
}

export async function calculateEntropy(nodes: any[], edges: any[]): Promise<number> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: "Calculate entropy.", config: { responseMimeType: 'application/json' } });
    return JSON.parse(response.text || "{\"score\":0}").score;
}

export async function decomposeNode(label: string, neighbors: string): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `DECOMPOSE NODE: ${label}`, config: { responseMimeType: 'application/json' } });
    return JSON.parse(response.text || "{}");
}

export function constructHiveContext(agentId: string, context: string): string {
    const agent = HIVE_AGENTS[agentId] || HIVE_AGENTS['Puck'];
    return `SYSTEM_IDENTITY: ${agent.name}\nROLE: ${agent.systemPrompt}\nCONTEXT:\n${context}`.trim();
}

export async function constructCinematicPrompt(base: string, colorway: any, hasBase: boolean, hasChar: boolean, hasStyle: boolean, extra?: string, preset?: string): Promise<string> {
    return `Shot: ${base}. Palette: ${colorway.colors.join(', ')}. Style: ${preset}. ${extra || ''}`.trim();
}

export async function discoverDeepLattice(artifacts: StoredArtifact[]): Promise<NeuralLattice> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: "Discover lattice.", config: { responseMimeType: 'application/json' } });
    return JSON.parse(response.text || "{}");
}

export const liveSession = {
    _session: null as any,
    onToolCall: null as ((name: string, args: any) => Promise<any>) | null,
    connect: async (voice: string, config: any) => {
        const ai = getAI();
        liveSession._session = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { voiceName: voice } }, systemInstruction: config.systemInstruction, tools: config.tools, outputAudioTranscription: config.outputAudioTranscription, inputAudioTranscription: config.inputAudioTranscription },
            callbacks: {
                onopen: config.callbacks?.onopen,
                onmessage: async (msg) => {
                    if (msg.toolCall && liveSession.onToolCall) for (const fc of msg.toolCall.functionCalls) { const res = await liveSession.onToolCall(fc.name, fc.args); liveSession._session.sendToolResponse({ functionResponses: [{ id: fc.id, name: fc.name, response: res }] }); }
                    if (config.callbacks?.onmessage) config.callbacks.onmessage(msg);
                },
                onerror: config.callbacks?.onerror,
                onclose: config.callbacks?.onclose
            }
        });
        return liveSession._session;
    },
    disconnect: () => { if (liveSession._session) liveSession._session.close(); liveSession._session = null; },
    isConnected: () => !!liveSession._session,
    primeAudio: async () => {},
    getInputFrequencies: () => new Uint8Array(32),
    getOutputFrequencies: () => new Uint8Array(32)
};