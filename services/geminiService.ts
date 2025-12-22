
import { GoogleGenAI, GenerateContentResponse, Type, Schema } from "@google/genai";
import { 
    FileData, AppMode, TaskPriority, AnalysisResult, StoredArtifact,
    KnowledgeNode, CompressedAxiom, ScienceHypothesis, Result,
    NeuralLattice, BookDNA, AgentDNA, HiveAgent
} from '../types';
import { success, failure } from '../utils/logic';

// --- INITIALIZATION ---
// Initialize the GoogleGenAI client with the mandatory API key from process.env.API_KEY.
export const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function promptSelectKey() {
  if (window.aistudio?.openSelectKey) {
    await window.aistudio.openSelectKey();
  }
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

// --- CORE EXPORTS ---

/**
 * Interprets user intent for an OS command using gemini-3-flash-preview.
 */
export async function interpretIntent(input: string): Promise<any> {
    const ai = getAI();
    // Fix: Pass explicit GenerateContentResponse type to retryGeminiRequest to ensure response.text is accessible.
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
 * Predicts the next 3 logical actions for a given application mode.
 */
export async function predictNextActions(mode: AppMode, context: any, lastLog?: string): Promise<any[]> {
    const ai = getAI();
    // Fix: response.text is a property, not a method. Ensuring GenerateContentResponse typing.
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Predict 3 next actions for mode ${mode}. Context: ${JSON.stringify(context)}. Last log: ${lastLog}`,
        config: {
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
                    }
                }
            }
        }
    });
    return JSON.parse(response.text || "[]");
}

/**
 * Synthesizes a structured workflow and PARA drive taxonomy.
 */
export async function generateStructuredWorkflow(files: FileData[], governance: string, type: string, mapContext: any): Promise<any> {
    const ai = getAI();
    const prompt = `
        TASK: Synthesize Structured Workflow and Drive Taxonomy.
        DOMAIN: ${type}
        GOVERNANCE: ${governance}
        CONTEXT: ${JSON.stringify(mapContext)}
        
        RETURN JSON: { 
            "title": "...", 
            "internalMonologue": "...", 
            "protocols": [{ "role": "...", "instruction": "..." }], 
            "taxonomy": { "root": [{ "folder": "...", "items": ["..."] }] },
            "status": "DONE" 
        }
    `;
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
 * Performs a global search with Google Search grounding.
 */
export async function performGlobalSearch(query: string): Promise<any[]> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: query,
        config: {
            tools: [{ googleSearch: {} }],
            systemInstruction: "Search system and web for relevant info. Return list of results."
        }
    });
    return [{ id: '1', title: `Search result for ${query}`, description: response.text, type: 'INFO' }];
}

/**
 * Generates logic code based on a prompt.
 */
export async function generateCode(prompt: string, language: string, model: string = 'gemini-3-pro-preview'): Promise<string> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model,
        contents: `Language: ${language}. Prompt: ${prompt}`,
        config: { systemInstruction: "Generate clean, production-ready code snippets." }
    });
    return response.text || "";
}

/**
 * Validates code syntax using gemini-3-flash-preview.
 */
export async function validateSyntax(code: string, language: string): Promise<any[]> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Validate this ${language} code:\n${code}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.OBJECT, properties: { line: { type: Type.NUMBER }, message: { type: Type.STRING } } }
            }
        }
    });
    return JSON.parse(response.text || "[]");
}

export async function fileToGenerativePart(file: File): Promise<FileData> {
    const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
    return { inlineData: { data: base64, mimeType: file.type }, name: file.name };
}

export async function classifyArtifact(fileData: FileData): Promise<Result<any>> {
    try {
        const ai = getAI();
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [fileData, { text: "Classify this artifact. Identify classification, ambiguityScore, entities, summary, and entropyRating." }] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        classification: { type: Type.STRING },
                        ambiguityScore: { type: Type.NUMBER },
                        entities: { type: Type.ARRAY, items: { type: Type.STRING } },
                        summary: { type: Type.STRING },
                        entropyRating: { type: Type.NUMBER }
                    }
                }
            }
        });
        return success(JSON.parse(response.text || "{}"));
    } catch (e: any) { return failure(e); }
}

export async function analyzeSchematic(data: FileData): Promise<any> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [data, { text: "Analyze this hardware schematic. Detect components and their health." }] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    components: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                type: { type: Type.STRING },
                                boundingBox: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                                health: { type: Type.NUMBER },
                                optimization: { type: Type.STRING }
                            }
                        }
                    }
                }
            }
        }
    });
    return JSON.parse(response.text || "{}");
}

export async function generateXRayVariant(data: FileData): Promise<string> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [data, { text: "Generate an X-ray style blueprint variant of this image. Technical, blueprint aesthetic." }] }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    return "";
}

export async function generateIsometricSchematic(data: FileData): Promise<string> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [data, { text: "Generate a 3D isometric cinematic render of this hardware topology." }] }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    return "";
}

export async function generateVideo(prompt: string, aspectRatio: string, resolution: string): Promise<string> {
    const ai = getAI();
    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        config: { numberOfVideos: 1, aspectRatio: aspectRatio as any, resolution: resolution as any }
    });
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
    }
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
}

export async function generateSpeech(text: string, voiceName: string): Promise<string> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { voiceName } }
        }
    });
    return response.candidates?.[0]?.content?.parts[0]?.inlineData?.data || "";
}

export async function analyzePowerDynamics(target: string, context?: string): Promise<any> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Target: ${target}. Context: ${context}. Analyze power dynamics, sustainability, and vitality.`,
        config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    sustainer: { type: Type.STRING },
                    extractor: { type: Type.STRING },
                    destroyer: { type: Type.STRING },
                    scores: {
                        type: Type.OBJECT,
                        properties: {
                            centralization: { type: Type.NUMBER },
                            entropy: { type: Type.NUMBER },
                            vitality: { type: Type.NUMBER },
                            opacity: { type: Type.NUMBER },
                            adaptability: { type: Type.NUMBER }
                        }
                    },
                    vectors: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                mechanism: { type: Type.STRING },
                                vulnerability: { type: Type.STRING },
                                severity: { type: Type.STRING }
                            }
                        }
                    },
                    insight: { type: Type.STRING }
                }
            }
        }
    });
    return JSON.parse(response.text || "{}");
}

export async function generateAvatar(role: string, name: string): Promise<string> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: `Cybernetic avatar for ${name}, role: ${role}. Highly detailed, futuristic, portrait.`,
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    return "";
}

export async function generateArchitectureImage(prompt: string, aspectRatio: string, imageSize: string, reference?: FileData): Promise<string> {
    const ai = getAI();
    const parts: any[] = [{ text: prompt }];
    if (reference) parts.unshift(reference);
    
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts },
        config: { imageConfig: { aspectRatio: aspectRatio as any, imageSize: imageSize as any } }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    return "";
}

export async function repairMermaidSyntax(code: string, error: string): Promise<string> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Repair Mermaid code. Error: ${error}. Code:\n${code}`,
        config: { systemInstruction: "Fix mermaid syntax errors. Return only the valid code block." }
    });
    return (response.text || "").replace(/```mermaid/g, '').replace(/```/g, '').trim();
}

export async function generateVaultInsights(artifacts: StoredArtifact[]): Promise<any[]> {
    const ai = getAI();
    const summary = artifacts.map(a => `${a.name} (${a.analysis?.classification})`).join(', ');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze vault artifacts for optimizations: ${summary}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        type: { type: Type.STRING },
                        message: { type: Type.STRING },
                        action: { type: Type.STRING }
                    }
                }
            }
        }
    });
    return JSON.parse(response.text || "[]");
}

export async function generateDecompositionMap(goal: string): Promise<any[]> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Decompose this goal: ${goal}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        description: { type: Type.STRING },
                        instruction: { type: Type.STRING },
                        isolated_input: { type: Type.STRING },
                        weight: { type: Type.NUMBER }
                    }
                }
            }
        }
    });
    return JSON.parse(response.text || "[]");
}

export async function searchGroundedIntel(query: string): Promise<string> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: query,
        config: { tools: [{ googleSearch: {} }] }
    });
    return response.text || "";
}

export async function decomposeTaskToSubtasks(title: string, desc: string): Promise<string[]> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Decompose task "${title}": ${desc}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
    });
    return JSON.parse(response.text || "[]");
}

export async function generateMermaidDiagram(governance: string, files: FileData[], mapContext: any[]): Promise<string> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate Mermaid graph for ${governance}. Context: ${JSON.stringify(mapContext)}`,
        config: { systemInstruction: "Return only raw Mermaid.js syntax." }
    });
    return response.text || "graph TD\nNode-->End";
}

export async function generateAudioOverview(files: FileData[]): Promise<any> {
    const ai = getAI();
    const textRes: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: "Summarize these files for audio overview."
    });
    const audioData = await generateSpeech(textRes.text || "Scanning complete.", "Zephyr");
    return { audioData, transcript: textRes.text };
}

export async function generateSingleNode(description: string): Promise<any> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate node details for: ${description}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    label: { type: Type.STRING },
                    subtext: { type: Type.STRING },
                    iconName: { type: Type.STRING },
                    color: { type: Type.STRING }
                }
            }
        }
    });
    return JSON.parse(response.text || "{}");
}

export async function calculateOptimalLayout(nodes: any[], edges: any[]): Promise<Record<string, { x: number, y: number }>> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Nodes: ${nodes.length}, Edges: ${edges.length}. Calculate 2D coordinates.`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                additionalProperties: {
                    type: Type.OBJECT,
                    properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } }
                }
            }
        }
    });
    return JSON.parse(response.text || "{}");
}

export async function simulateAgentStep(workflow: any, index: number, history: any[]): Promise<any> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Execute step ${index} in workflow ${workflow.title}. History: ${JSON.stringify(history)}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    output: { type: Type.STRING },
                    agentThought: { type: Type.STRING }
                }
            }
        }
    });
    return JSON.parse(response.text || "{}");
}

export async function generateSystemArchitecture(prompt: string): Promise<any> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    nodes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, label: { type: Type.STRING }, subtext: { type: Type.STRING }, iconName: { type: Type.STRING }, color: { type: Type.STRING } } } },
                    edges: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, source: { type: Type.STRING }, target: { type: Type.STRING }, variant: { type: Type.STRING }, color: { type: Type.STRING } } } }
                }
            }
        }
    });
    return JSON.parse(response.text || "{}");
}

export async function generateInfrastructureCode(summary: string, provider: string): Promise<string> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Provider: ${provider}. Summary: ${summary}. Generate IaC manifest.`,
    });
    return response.text || "";
}

export async function evolveSystemArchitecture(code: string, language: string, prompt: string): Promise<Result<any>> {
    try {
        const ai = getAI();
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Code: ${code}. Language: ${language}. Intent: ${prompt}. Evolve this architecture.`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        code: { type: Type.STRING },
                        reasoning: { type: Type.STRING },
                        type: { type: Type.STRING },
                        integrityScore: { type: Type.NUMBER }
                    }
                }
            }
        });
        return success(JSON.parse(response.text || "{}"));
    } catch (e: any) { return failure(e); }
}

export async function executeNeuralPolicy(mode: string, context: any, logs: string[]): Promise<any> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Mode: ${mode}. Context: ${JSON.stringify(context)}. Logs: ${JSON.stringify(logs)}. Decide next policy action.`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    level: { type: Type.STRING },
                    message: { type: Type.STRING },
                    suggestedPatch: { type: Type.OBJECT, properties: { code: { type: Type.STRING }, explanation: { type: Type.STRING } } }
                }
            }
        }
    });
    return JSON.parse(response.text || "{}");
}

export async function compressKnowledge(nodes: KnowledgeNode[]): Promise<CompressedAxiom[]> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Compress these knowledge points: ${JSON.stringify(nodes)}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        statement: { type: Type.STRING },
                        sourceNodes: { type: Type.ARRAY, items: { type: Type.STRING } },
                        reductionFactor: { type: Type.NUMBER }
                    }
                }
            }
        }
    });
    return JSON.parse(response.text || "[]");
}

export async function generateHypotheses(facts: string[]): Promise<ScienceHypothesis[]> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Based on these facts, generate 3 hypotheses: ${facts.join(', ')}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        statement: { type: Type.STRING },
                        confidence: { type: Type.NUMBER },
                        status: { type: Type.STRING }
                    }
                }
            }
        }
    });
    return JSON.parse(response.text || "[]");
}

export async function crystallizeKnowledge(nodes: any[]): Promise<string> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Synthesize a unified theory from: ${JSON.stringify(nodes)}`
    });
    return response.text || "";
}

export async function synthesizeNodes(nodeA: KnowledgeNode, nodeB: KnowledgeNode): Promise<KnowledgeNode> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Synthesize a bridge between "${nodeA.label}" and "${nodeB.label}".`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    label: { type: Type.STRING },
                    type: { type: Type.STRING },
                    connections: { type: Type.ARRAY, items: { type: Type.STRING } },
                    strength: { type: Type.NUMBER }
                }
            }
        }
    });
    return JSON.parse(response.text || "{}");
}

export async function digitizeDocument(fileData: FileData): Promise<any> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { parts: [fileData, { text: "Fully digitize this document. Provide an abstract and a Mermaid logic model." }] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    abstract: { type: Type.STRING },
                    logicModel: { type: Type.STRING }
                }
            }
        }
    });
    return JSON.parse(response.text || "{}");
}

export async function performSemanticSearch(query: string, artifacts: StoredArtifact[]): Promise<string[]> {
    const ai = getAI();
    const summary = artifacts.map(a => `ID:${a.id} Name:${a.name}`).join('\n');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Find top IDs matching "${query}" from:\n${summary}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
    });
    return JSON.parse(response.text || "[]");
}

export async function executeVaultDirective(directive: string, artifacts: StoredArtifact[]): Promise<any> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Directive: ${directive}. Artifacts: ${artifacts.length}. Decide operation, targetIds, and parameters.`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    operation: { type: Type.STRING },
                    targetIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                    parameters: { type: Type.OBJECT, properties: { value: { type: Type.STRING } } }
                }
            }
        }
    });
    return JSON.parse(response.text || "{}");
}

// --- MISSING FUNCTIONS FIXES ---

/**
 * Constructs a system instruction block contextualized for a specific hive agent.
 */
export function constructHiveContext(agentId: string, context: string): string {
    const agent = HIVE_AGENTS[agentId] || HIVE_AGENTS['Puck'];
    return `
        SYSTEM_IDENTITY: ${agent.name}
        ROLE: ${agent.systemPrompt}
        BIAS_WEIGHTS: Skepticism=${agent.weights.skepticism}, Logic=${agent.weights.logic}, Creativity=${agent.weights.creativity}
        
        GLOBAL_CONTEXT:
        ${context}
        
        INSTRUCTION: Maintain this identity strictly while processing the request.
    `;
}

/**
 * Returns a high-velocity response using gemini-3-flash-preview.
 */
export async function fastAIResponse(prompt: string): Promise<string> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
    });
    return response.text || "";
}

/**
 * Researches technical hardware components using Google Search grounding.
 */
export async function researchComponents(query: string): Promise<any[]> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Research hardware components for: ${query}`,
        config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        partNumber: { type: Type.STRING },
                        manufacturer: { type: Type.STRING },
                        price: { type: Type.NUMBER },
                        description: { type: Type.STRING }
                    }
                }
            }
        }
    });
    return JSON.parse(response.text || "[]");
}

/**
 * Generates a multi-frame storyboard plan for cinematic asset generation.
 */
export async function generateStoryboardPlan(prompt: string): Promise<any[]> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Create a 10-frame storyboard for: ${prompt}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        index: { type: Type.NUMBER },
                        scenePrompt: { type: Type.STRING },
                        continuity: { type: Type.STRING },
                        camera: { type: Type.STRING },
                        lighting: { type: Type.STRING },
                        audio_cue: { type: Type.STRING }
                    }
                }
            }
        }
    });
    return JSON.parse(response.text || "[]");
}

/**
 * Constructs a final prompt for cinematic image generation.
 */
export async function constructCinematicPrompt(
    base: string, 
    colorway: any, 
    hasBase: boolean, 
    hasChar: boolean, 
    hasStyle: boolean, 
    extra?: string,
    preset?: string
): Promise<string> {
    return `Cinematic shot: ${base}. Style: ${preset}. Color Palette: ${colorway.colors.join(', ')}. ${extra || ''}`;
}

/**
 * Analyzes an image's technical visual signature.
 */
export async function analyzeImageVision(fileData: FileData): Promise<string> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [fileData, { text: "Provide a detailed technical analysis of this image." }] }
    });
    return response.text || "";
}

/**
 * Generates high-level narrative context for a visual asset.
 */
export async function generateNarrativeContext(fileData: FileData): Promise<string> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [fileData, { text: "Describe the narrative context and atmosphere of this image." }] }
    });
    return response.text || "";
}

/**
 * Analyzes the metadata and structural DNA of a book or document.
 */
export async function analyzeBookDNA(fileData: FileData): Promise<BookDNA> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { parts: [fileData, { text: "Analyze the DNA of this document: summary, themes, and structure." }] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING },
                    themes: { type: Type.ARRAY, items: { type: Type.STRING } },
                    structure: { type: Type.OBJECT, additionalProperties: { type: Type.STRING } }
                }
            }
        }
    });
    return JSON.parse(response.text || "{}");
}

/**
 * Alias for crystallizeKnowledge, synthesizes a theory from knowledge nodes.
 */
export async function generateTheory(nodes: any[]): Promise<string> {
    return crystallizeKnowledge(nodes);
}

/**
 * Generates a PARA-based taxonomy for file organization.
 */
export async function generateTaxonomy(files: FileData[]): Promise<any> {
    const ai = getAI();
    const summary = files.map(f => f.name).join(', ');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate a PARA taxonomy for these files: ${summary}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    root: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                folder: { type: Type.STRING },
                                items: { type: Type.ARRAY, items: { type: Type.STRING } }
                            }
                        }
                    }
                }
            }
        }
    });
    return JSON.parse(response.text || "{}");
}

/**
 * Discovers hidden patterns in artifacts and returns a graph lattice.
 */
export async function discoverDeepLattice(artifacts: StoredArtifact[]): Promise<NeuralLattice> {
    const ai = getAI();
    const summary = artifacts.map(a => `${a.name}: ${a.analysis?.summary}`).join('\n');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Discover hidden connections and patterns in these artifacts to form a neural lattice:\n${summary}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    nodes: { 
                        type: Type.ARRAY, 
                        items: { 
                            type: Type.OBJECT, 
                            properties: { 
                                id: { type: Type.STRING }, 
                                label: { type: Type.STRING }, 
                                type: { type: Type.STRING } 
                            } 
                        } 
                    },
                    edges: { 
                        type: Type.ARRAY, 
                        items: { 
                            type: Type.OBJECT, 
                            properties: { 
                                id: { type: Type.STRING }, 
                                source: { type: Type.STRING }, 
                                target: { type: Type.STRING } 
                            } 
                        } 
                    }
                }
            }
        }
    });
    return JSON.parse(response.text || "{}");
}

/**
 * Synthesizes research findings into a markdown report.
 */
export async function synthesizeResearchReport(findings: any[]): Promise<string> {
    const ai = getAI();
    const context = findings.map((f: any) => f.fact).join('\n');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Synthesize this research findings into a comprehensive report:\n${context}`
    });
    return response.text || "";
}

/**
 * Generates an autopoietic system framework from a prompt.
 */
export async function generateAutopoieticFramework(prompt: string): Promise<any> {
    return generateSystemArchitecture(`Goal: ${prompt}. Build an autopoietic (self-maintaining) system framework.`);
}

/**
 * Calculates the entropy score of a graph topology.
 */
export async function calculateEntropy(nodes: any[], edges: any[]): Promise<number> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Calculate the architectural entropy of a system with ${nodes.length} nodes and ${edges.length} edges. Return only a number between 0 and 100.`,
    });
    const match = response.text?.match(/\d+/);
    return match ? parseInt(match[0]) : 15;
}

// Live Session Wrapper
export const liveSession = {
    _session: null as any,
    _callbacks: {} as any,
    onToolCall: null as ((name: string, args: any) => Promise<any>) | null,
    connect: async (voice: string, config: any) => {
        const ai = getAI();
        liveSession._session = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: {
                responseModalities: ['AUDIO'],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
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
                            const result = await liveSession.onToolCall(fc.name, fc.args);
                            liveSession._session.sendToolResponse({
                                functionResponses: [{ id: fc.id, name: fc.name, response: result }]
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
    disconnect: () => { if (liveSession._session) liveSession._session.close(); liveSession._session = null; },
    isConnected: () => !!liveSession._session,
    primeAudio: async () => { /* Web Audio API init */ },
    getInputFrequencies: () => new Uint8Array(32),
    getOutputFrequencies: () => new Uint8Array(32)
};

// --- ADDITIONAL EXPORTS FOR RESEARCH AGENT ---

export async function generateResearchPlan(query: string): Promise<string[]> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Create research plan for: ${query}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
    });
    return JSON.parse(response.text || "[]");
}

export async function executeResearchQuery(query: string): Promise<any[]> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: query,
        config: {
            tools: [{ googleSearch: {} }],
            systemInstruction: "Extract factual bits. Return JSON list of {id, fact, confidence, source}."
        }
    });
    // Simplified parsing of factual output
    return [{ id: Math.random().toString(), fact: response.text?.substring(0, 100), confidence: 0.9, source: "Google Search" }];
}

export async function compileResearchContext(findings: any[]): Promise<string> {
    return findings.map((f: any) => f.fact).join('\n---\n');
}

export async function simulateExperiment(hyp: ScienceHypothesis): Promise<string> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Simulate hypothesis: ${hyp.statement}`,
    });
    return response.text || "Simulation complete.";
}

export async function chatWithGemini(message: string): Promise<string> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: message
    });
    return response.text || "";
}

export async function transformArtifact(content: any, type: 'TEXT' | 'IMAGE' | 'CODE', instruction: string): Promise<any> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Instruction: ${instruction}. Context type: ${type}. Content: ${content}`,
    });
    return response.text || content;
}

export async function smartOrganizeArtifact(meta: { name: string }): Promise<any> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Organize artifact: ${meta.name}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    folder: { type: Type.STRING },
                    tags: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            }
        }
    });
    return JSON.parse(response.text || "{}");
}

export async function decomposeNode(label: string, neighbors: string): Promise<any> {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Node: ${label}. Neighbors: ${neighbors}. Decompose or optimize.`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    nodes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, label: { type: Type.STRING }, color: { type: Type.STRING } } } },
                    edges: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { source: { type: Type.STRING }, target: { type: Type.STRING } } } },
                    optimizations: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            }
        }
    });
    return JSON.parse(response.text || "{}");
}

export async function generateSwarmArchitecture(goal: string): Promise<any> {
    return generateSystemArchitecture(`Goal: ${goal}. Focus on autonomous swarm patterns.`);
}
