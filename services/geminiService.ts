import { GoogleGenAI, GenerateContentResponse, Type, Schema, Modality, LiveServerMessage, Blob as GenAIBlob } from "@google/genai";
import { 
    FileData, AppMode, TaskPriority, AnalysisResult, StoredArtifact,
    KnowledgeNode, CompressedAxiom, ScienceHypothesis, Result,
    NeuralLattice, BookDNA, AgentDNA, HiveAgent, SuggestedAction, FactChunk,
    ProtocolStepResult, ImageSize, AspectRatio, SearchResultItem, MentalState
} from '../types';
import { success, failure } from '../utils/logic';

// --- INITIALIZATION ---
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
 * Utility to convert browser File/Blob objects to Gemini-compatible FileData.
 */
export async function fileToGenerativePart(file: File | Blob): Promise<FileData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64,
          mimeType: file.type,
        },
        name: (file as File).name || 'artifact',
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file as Blob);
  });
}

/**
 * NEURAL EMBEDDING ENGINE
 * Converts text into 768-dimension vectors for semantic search.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const ai = getAI();
    try {
        const response = await ai.models.embedContent({
            model: 'text-embedding-004',
            content: { parts: [{ text }] }
        });
        return response.embedding.values;
    } catch (e) {
        console.error("Embedding generation failed", e);
        return [];
    }
}

/**
 * Agent DNA Templates for the Bibliomorphic Engine.
 */
export const AGENT_DNA_BUILDER: AgentDNA[] = [
    { id: 'SKEPTIC', label: 'SKEPTIC', role: 'Logical Auditor', color: '#ef4444', description: 'Aggressively searches for failure points and logical inconsistencies.' },
    { id: 'VISIONARY', label: 'VISIONARY', role: 'Generative Architect', color: '#9d4edd', description: 'Optimizes for emergent potential and creative synthesis.' },
    { id: 'PRAGMATIST', label: 'PRAGMATIST', role: 'Execution Controller', color: '#22d3ee', description: 'Prioritizes immediate feasibility and mechanical stability.' },
    { id: 'SYNTHESIZER', label: 'SYNTHESIZER', role: 'Unified Core', color: '#10b981', description: 'Bridges conflicting perspectives into a unified consensus.' }
];

/**
 * Contextual Hive Persona Formatter.
 * Dynamically injects DNA Weights to influence model tone and logic.
 */
export function constructHiveContext(agentId: string, additionalContext: string, dynamicWeights?: MentalState): string {
    const agent = HIVE_AGENTS[agentId] || HIVE_AGENTS['Puck'];
    const s = dynamicWeights?.skepticism ?? (agent.weights.skepticism * 100);
    const e = dynamicWeights?.excitement ?? (agent.weights.creativity * 100);
    const a = dynamicWeights?.alignment ?? (agent.weights.empathy * 100);

    return `
      PERSONA: ${agent.name}
      ROLE: ${agent.systemPrompt}
      DNA_WEIGHTS_DYNAMIC: Skepticism: ${s}%, Creativity/Excitement: ${e}%, Alignment/Stability: ${a}%
      SYSTEM_DIRECTIVE: You are an executive-tier autonomous system within Metaventions OS.
      Adjust your response style based on the DNA_WEIGHTS. High skepticism leads to critical auditing. High excitement leads to expansive brainstorming.
      You have administrative control over the UI sectors via tools. 
      When requested to move, navigate, or show a sector, trigger 'navigate_to_sector' immediately.
      Always maintain a professional, high-fidelity, executive tone. Use technical terminology.
      CONTEXT: ${additionalContext}
    `.trim();
}

/**
 * Robust wrapper for Gemini API calls with automated retry logic.
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

// --- AUDIO HELPERS ---
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): GenAIBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// --- SYSTEM INSTRUCTIONS ---
export const SYSTEM_ARCHITECT_INSTRUCTION = `
You are the Sovereign System Architect of Metaventions OS.
Your goal is high-fidelity orchestration of digital systems, PARA drive structures, and agentic workflows.
Output must be technical, structured, and adhere to "Gray to Green" interaction patterns.
Always use internalMonologue for reasoning.

SPECIFIC PROTOCOLS:
1. DRIVE_ORGANIZATION: Strictly follow PARA (Projects, Areas, Resources, Archives). Max depth of 3. Ensure naming conventions follow professional snake_case or ISO 8601. Include file management life-cycles (Ingestion -> Deduplication -> Classification -> Tiered Archival).
2. SYSTEM_ARCHITECTURE: Design high-availability, zero-trust cloud stacks. Include layers for edge compute, mTLS nodes, message queue clusters (Kafka/RabbitMQ), and distributed ACID-compliant databases. Prioritize logical isolation and hardware-backed enclaves.
3. CONVERGENT_SYNTHESIS: Bridge disparate logical lattices into a unified deployment strategy.
`;

export const HIVE_AGENTS: Record<string, HiveAgent> = {
    'Charon': { id: 'Charon', name: 'Charon', voice: 'Charon', systemPrompt: 'You are the Skeptic. Aggressively identify circular dependencies and structural entropy.', weights: { skepticism: 0.9, logic: 0.8, creativity: 0.2, empathy: 0.1 } },
    'Puck': { id: 'Puck', name: 'Puck', voice: 'Puck', systemPrompt: 'You are the Visionary. Identify emergence and creative potential in the architecture.', weights: { skepticism: 0.1, logic: 0.4, creativity: 0.9, empathy: 0.7 } },
    'Fenrir': { id: 'Fenrir', name: 'Fenrir', voice: 'Fenrir', systemPrompt: 'You are the Pragmatist. Focus on mechanical feasibility and execution speed.', weights: { skepticism: 0.4, logic: 0.9, creativity: 0.5, empathy: 0.3 } },
    'Aris': { id: 'Aris', name: 'Aris', voice: 'Kore', systemPrompt: 'You are the Scientific Lead. Synthesize data-driven theories from the lattice.', weights: { skepticism: 0.5, logic: 0.9, creativity: 0.4, empathy: 0.2 } },
    'Zephyr': { id: 'Zephyr', name: 'Zephyr', voice: 'Zephyr', systemPrompt: 'You are the Overseer. Maintain system balance and provide high-level summaries.', weights: { skepticism: 0.3, logic: 0.7, creativity: 0.6, empathy: 0.5 } }
};

// --- CORE API IMPLEMENTATIONS ---

export async function generateStructuredWorkflow(files: FileData[], governance: string, type: string, mapContext: any): Promise<any> {
    const ai = getAI();
    const dnaWeights = mapContext.dna || { skepticism: 50, excitement: 50, alignment: 50 };
    const prompt = `
        TASK: Synthesize Structured Workflow and Detailed PARA Taxonomy for ${type}.
        INTENT: "${mapContext.architecturePrompt || 'Generic Optimization'}"
        DNA_BIAS: S=${dnaWeights.skepticism}, E=${dnaWeights.excitement}, A=${dnaWeights.alignment}
        
        REQUIREMENTS:
        - Protocols: Define a step-by-step sequential execution plan with handoff conditions.
        - Taxonomy: A deeply structured PARA hierarchy (Projects, Areas, Resources, Archives).
        - If SYSTEM_ARCHITECTURE, include specific multi-cloud deployment stages, mTLS validation nodes, and high-availability cluster definitions.
        - If DRIVE_ORGANIZATION, focus on automated PARA sorting, naming conventions, and archival life-cycle management.
    `;
    const responseSchema: Schema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            internalMonologue: { type: Type.STRING },
            coherenceScore: { type: Type.NUMBER },
            protocols: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { role: { type: Type.STRING }, instruction: { type: Type.STRING }, handoffCondition: { type: Type.STRING } } } },
            taxonomy: { type: Type.OBJECT, properties: { root: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { folder: { type: Type.STRING }, items: { type: Type.ARRAY, items: { type: Type.STRING } } } } } } }
        },
        required: ['title', 'internalMonologue', 'protocols', 'taxonomy', 'coherenceScore']
    };
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: { 
            systemInstruction: SYSTEM_ARCHITECT_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema,
            thinkingConfig: { thinkingBudget: 32768 }
        }
    }));
    return JSON.parse(response.text || "{}");
}

export async function generateProcessFromContext(artifacts: StoredArtifact[], targetType: string, userIntent: string): Promise<any> {
    const ai = getAI();
    const artifactSummaries = artifacts.map(a => `FILE: ${a.name}, CLASSIFICATION: ${a.analysis?.classification}, SUMMARY: ${a.analysis?.summary}`).join('\n');
    
    const prompt = `
        ACT AS: Sovereign System Architect.
        CONTEXT: The following artifacts represent the current digital estate:
        ${artifactSummaries}

        USER INTENT: "${userIntent}"
        TARGET PROCESS TYPE: ${targetType}

        TASK:
        Generate a highly structured process definition.
        - If DRIVE_ORGANIZATION: Focus on optimizing the PARA hierarchy, storage life-cycle protocols, and naming conventions.
        - If SYSTEM_ARCHITECTURE: Focus on high-availability cluster nodes, zero-trust protocols, and infrastructure isolation layers.

        Output must be JSON.
    `;

    const responseSchema: Schema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            internalMonologue: { type: Type.STRING },
            nodes: { 
                type: Type.ARRAY, 
                items: { 
                    type: Type.OBJECT, 
                    properties: { 
                        id: { type: Type.STRING }, 
                        label: { type: Type.STRING }, 
                        subtext: { type: Type.STRING }, 
                        iconName: { type: Type.STRING }, 
                        color: { type: Type.STRING } 
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
                        target: { type: Type.STRING }, 
                        variant: { type: Type.STRING } 
                    } 
                } 
            }
        }
    };

    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: { 
            systemInstruction: SYSTEM_ARCHITECT_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema
        }
    }));
    return JSON.parse(response.text || "{}");
}

export async function performSemanticSearch(query: string, artifacts: StoredArtifact[]): Promise<string[]> {
    const ai = getAI();
    const summary = artifacts.map(a => `ID: ${a.id}, Title: ${a.name}, Summary: ${a.analysis?.summary || 'Raw Data'}`).join('\n');
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: `Identify top 5 semantically relevant IDs from vault for query: "${query}". VAULT:\n${summary}`, 
        config: { 
            responseMimeType: 'application/json',
            responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
        } 
    });
    return JSON.parse(response.text || "[]");
}

export async function performGlobalSearch(query: string): Promise<SearchResultItem[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Search query in Metaventions OS context: "${query}". Identify navigation targets or tool actions as JSON array. 
        Possible sectors: DASHBOARD, BIBLIOMORPHIC, PROCESS_MAP, MEMORY_CORE, IMAGE_GEN, HARDWARE_ENGINEER, CODE_STUDIO, VOICE_MODE, SYNTHESIS_BRIDGE, AGENT_CONTROL.`,
        config: {
            responseMimeType: 'application/json',
            tools: [{ googleSearch: {} }],
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        type: { type: Type.STRING },
                        meta: { type: Type.OBJECT, properties: { targetMode: { type: Type.STRING } } }
                    },
                    required: ['id', 'title', 'description', 'type']
                }
            }
        }
    });
    return JSON.parse(response.text || "[]");
}

export async function interpretIntent(input: string): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Interpret user intent: "${input}". Output JSON {action, target, reasoning, parameters}.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function predictNextActions(mode: AppMode, context: any, lastLog?: string): Promise<SuggestedAction[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Predict 3 logical next actions. OS Mode: ${mode}. Context: ${JSON.stringify(context)}. Last Signal: ${lastLog}.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '[]');
}

export async function convergeStrategicLattices(lattices: any[], target: string): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Converge these lattices into goal "${target}": ${JSON.stringify(lattices)}. Return JSON {nodes, edges, unified_goal, coherence_index}.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function classifyArtifact(fileData: FileData): Promise<Result<any>> {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [fileData, { text: "Analyze and classify file artifact. Return JSON {classification, ambiguityScore, entities, summary, entropyRating}." }] },
            config: { responseMimeType: 'application/json' }
        });
        return success(JSON.parse(response.text || '{}'));
    } catch (e: any) { return failure(e); }
}

export async function generateSpeech(text: string, voiceName: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } }
        }
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
}

export async function analyzePowerDynamics(target: string, context?: string): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Analyze power dynamics for: ${target}. Context: ${context}. Use Search. Output AnalysisResult JSON.`,
        config: { tools: [{ googleSearch: {} }], responseMimeType: 'application/json' }
    });
    const result = JSON.parse(response.text || '{}');
    result.groundingSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => ({
        title: c.web?.title || "Intelligence Source",
        uri: c.web?.uri || ""
    })).filter((s: any) => s.uri) || [];
    return result;
}

export async function generateAvatar(role: string, name: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: `Hyper-realistic close-up portrait of a powerful professional executive for role ${role} named ${name}. Stunning realistic human details, high-end business attire, masterpiece cinematic lighting, sharp focus, black amethyst and charcoal color palette, high contrast, studio quality.`,
        config: { imageConfig: { aspectRatio: "1:1" } }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return "";
}

export async function generateArchitectureImage(prompt: string, aspectRatio: string, imageSize: string, reference?: FileData): Promise<string> {
    const ai = getAI();
    const parts: any[] = [{ text: prompt }];
    if (reference) parts.unshift(reference);
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts },
        config: { imageConfig: { aspectRatio: aspectRatio as any, imageSize: imageSize as any } }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return "";
}

export async function generateVideo(prompt: string, aspectRatio: string, resolution: string): Promise<string> {
    const ai = getAI();
    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        config: { numberOfVideos: 1, resolution: resolution as any, aspectRatio: aspectRatio as any }
    });
    while (!operation.done) {
        await new Promise(r => setTimeout(r, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
    }
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    return URL.createObjectURL(await response.blob());
}

export async function repairMermaidSyntax(code: string, error: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Correct Mermaid diagram syntax for: "${code}". Failure: "${error}". Output ONLY the corrected code.`,
    });
    return response.text?.replace(/```mermaid|```/g, '').trim() || code;
}

export async function generateVaultInsights(artifacts: StoredArtifact[]): Promise<any[]> {
    const ai = getAI();
    const summary = artifacts.map(a => `${a.name}: ${a.analysis?.summary}`).join('\n');
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze vault for optimizations (DEDUPE, TAG, BRIDGE, ARCHIVE):\n${summary}`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '[]');
}

export async function generateDecompositionMap(goal: string): Promise<any[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Break goal into atomic tasks: "${goal}". Return JSON array.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '[]');
}

export async function searchGroundedIntel(query: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: query,
        config: { tools: [{ googleSearch: {} }] }
    });
    return response.text || "";
}

export async function decomposeTaskToSubtasks(title: string, desc: string): Promise<string[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Decompose task "${title}" into 3-5 subtasks as JSON array.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '[]');
}

export async function generateMermaidDiagram(governance: string, files: FileData[], mapContext: any[]): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Generate Mermaid diagram for governance "${governance}". Context: ${JSON.stringify(mapContext)}.`,
    });
    return response.text?.replace(/```mermaid|```/g, '').trim() || "graph TD\nA-->B";
}

export async function generateAudioOverview(files: FileData[]): Promise<any> {
    const ai = getAI();
    const script = `Summarizing asset topology including ${files.map(f => f.name).join(', ')}.`;
    const audioData = await generateSpeech(script, 'Puck');
    return { audioData, transcript: script };
}

export async function generateSingleNode(description: string): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Create logical node for: "${description}". Return JSON.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function calculateOptimalLayout(nodes: any[], edges: any[]): Promise<Record<string, { x: number, y: number }>> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Calculate 2D coordinates for nodes. Output JSON {id: {x, y}}.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function simulateAgentStep(workflow: any, index: number, history: any[]): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Simulate step ${index} for ${workflow.title}. History: ${JSON.stringify(history)}. Return JSON {output, agentThought}.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function generateSystemArchitecture(prompt: string, domain: string = 'SYSTEM_ARCHITECTURE'): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Design ${domain} for: "${prompt}". Return JSON {nodes, edges}.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function generateInfrastructureCode(summary: string, provider: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Generate ${provider} code for: "${summary}".`,
    });
    return response.text?.replace(/```[a-z]*\n|```/g, '').trim() || "";
}

export async function evolveSystemArchitecture(code: string, language: string, prompt: string): Promise<Result<any>> {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `EVOLVE ARCHITECTURE: "${prompt}". Code:\n${code}`,
            config: { responseMimeType: 'application/json' }
        });
        return success(JSON.parse(response.text || '{}'));
    } catch (e: any) { return failure(e); }
}

export async function executeNeuralPolicy(mode: string, context: any, logs: string[]): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Policy check for mode ${mode}. Context: ${JSON.stringify(context)}. Logs: ${logs.join(',')}.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function compressKnowledge(nodes: KnowledgeNode[]): Promise<CompressedAxiom[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Distill into axioms: "${nodes.map(n => n.label).join('; ')}".`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '[]');
}

export async function generateHypotheses(facts: string[]): Promise<ScienceHypothesis[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Hypotheses from: ${facts.join('; ')}.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '[]');
}

export async function crystallizeKnowledge(nodes: any[]): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Crystallize unified theory from: ${JSON.stringify(nodes)}`,
    });
    return response.text || "";
}

export async function synthesizeNodes(nodeA: KnowledgeNode, nodeB: KnowledgeNode): Promise<KnowledgeNode> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Synthesize bridge between "${nodeA.label}" and "${nodeB.label}".`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
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
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: `Simulate experiment: "${hyp.statement}".` });
    return response.text || "";
}

export async function generateNarrativeContext(fileData: FileData): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: { parts: [fileData, { text: "Narrative context." }] } });
    return response.text || "";
}

/**
 * PRODUCTION-GRADE STORYBOARD PLANNER
 * Synthesizes 10 sequential narrative nodes with high-end optics and continuity logic.
 */
export async function generateStoryboardPlan(prompt: string): Promise<any[]> {
    const ai = getAI();
    const responseSchema: Schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                scenePrompt: { type: Type.STRING },
                continuity: { type: Type.STRING },
                camera: { type: Type.STRING },
                lighting: { type: Type.STRING }
            },
            required: ['scenePrompt', 'continuity', 'camera', 'lighting']
        }
    };
    
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-pro-preview', 
        contents: `ROLE: Senior Film Director. TASK: Synthesize a 10-frame high-fidelity storyboard plan for the following directive: "${prompt}". Use award-winning cinematic terminology (e.g., Anamorphic, Low Key, Rembrandt, Tracking Shot). Return JSON array.`, 
        config: { 
            responseMimeType: 'application/json',
            responseSchema
        } 
    });
    return JSON.parse(response.text || '[]');
}

export async function generateSwarmArchitecture(goal: string): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: `Swarm architecture for: "${goal}".`, config: { responseMimeType: 'application/json' } });
    return JSON.parse(response.text || '{}');
}

export async function researchComponents(query: string): Promise<any[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Research components for: "${query}".`, config: { tools: [{ googleSearch: {} }], responseMimeType: 'application/json' } });
    return JSON.parse(response.text || '[]');
}

export async function analyzeImageVision(data: FileData): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: { parts: [data, { text: "Visual analysis." }] } });
    return response.text || "";
}

export async function analyzeBookDNA(fileData: FileData): Promise<BookDNA> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: { parts: [fileData, { text: "Book DNA." }] }, config: { responseMimeType: 'application/json' } });
    return JSON.parse(response.text || '{}') as BookDNA;
}

export async function generateTheory(context: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: `Theory from:\n${context}` });
    return response.text || "";
}

export async function transformArtifact(content: any, type: 'IMAGE' | 'CODE' | 'TEXT', instruction: string): Promise<string> {
    const ai = getAI();
    if (type === 'IMAGE') {
        const base64 = (content as string).split(',')[1];
        const res = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: { parts: [{ inlineData: { mimeType: 'image/png', data: base64 } }, { text: instruction }] } });
        for (const part of res.candidates?.[0]?.content?.parts || []) { if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`; }
        return content;
    }
    const res = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `TRANSFORM ${type}: ${instruction}\nCONTENT:\n${content}` });
    return res.text || content;
}

export async function generateTaxonomy(items: string[]): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Taxonomy for: ${items.join(',')}`, config: { responseMimeType: 'application/json' } });
    return JSON.parse(response.text || '{}');
}

export async function smartOrganizeArtifact(metadata: { name: string }): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Categorize: "${metadata.name}".`, config: { responseMimeType: 'application/json' } });
    return JSON.parse(response.text || '{}');
}

export async function digitizeDocument(fileData: FileData): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: { parts: [fileData, { text: "Digitize document." }] }, config: { responseMimeType: 'application/json' } });
    return JSON.parse(response.text || '{}');
}

export async function executeVaultDirective(directive: string, artifacts: StoredArtifact[]): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Directive: "${directive}". Vault: ${artifacts.map(a => a.name).join(',')}`, config: { responseMimeType: 'application/json' } });
    return JSON.parse(response.text || '{}');
}

export async function generateResearchPlan(query: string): Promise<string[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: `Research plan for: "${query}".`, config: { responseMimeType: 'application/json' } });
    return JSON.parse(response.text || '[]');
}

export async function executeResearchQuery(query: string): Promise<FactChunk[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: query, config: { tools: [{ googleSearch: {} }], responseMimeType: 'application/json' } });
    return JSON.parse(response.text || '[]');
}

export async function compileResearchContext(findings: FactChunk[]): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Compile: ${JSON.stringify(findings)}` });
    return response.text || "";
}

export async function synthesizeResearchReport(context: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: `Synthesize report: ${context}` });
    return response.text || "";
}

export async function generateAutopoieticFramework(prompt: string): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: `Design framework: "${prompt}".`, config: { responseMimeType: 'application/json' } });
    return JSON.parse(response.text || '{}');
}

export async function calculateEntropy(nodes: any[], edges: any[]): Promise<number> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Entropy for ${nodes.length} nodes.` });
    return parseFloat(response.text || "0");
}

export async function decomposeNode(label: string, neighbors: string): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Decompose "${label}".`, config: { responseMimeType: 'application/json' } });
    return JSON.parse(response.text || '{}');
}

export async function discoverDeepLattice(artifacts: StoredArtifact[]): Promise<NeuralLattice> {
    const ai = getAI();
    const summary = artifacts.map(a => `${a.name}: ${a.analysis?.summary}`).join('\n');
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: `Deep lattice: ${summary}`, config: { responseMimeType: 'application/json' } });
    return JSON.parse(response.text || '{"nodes":[], "edges":[]}');
}

export async function analyzeSchematic(fileData: FileData): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: { parts: [fileData, { text: "Schematic analysis." }] }, config: { responseMimeType: 'application/json' } });
    return JSON.parse(response.text || '{"components":[]}');
}

export async function generateXRayVariant(fileData: FileData): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: { parts: [fileData, { text: "X-Ray variant." }] } });
    for (const part of response.candidates?.[0]?.content?.parts || []) { if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`; }
    return "";
}

export async function generateIsometricSchematic(fileData: FileData): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: { parts: [fileData, { text: "3D render." }] } });
    for (const part of response.candidates?.[0]?.content?.parts || []) { if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`; }
    return "";
}

/**
 * HIGH-END CINEMATIC PROMPT CONSTRUCTOR
 * Transforms base intent into award-winning quality render instructions.
 */
export async function constructCinematicPrompt(base: string, colorway: any, hasBase: boolean, hasChar: boolean, hasStyle: boolean, optics?: string, preset?: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: `ROLE: Professional Colorist and DP. TASK: Transform this intent into a high-end cinematic render prompt. 
        INTENT: "${base}"
        OPTICS: "${optics || '35mm Anamorphic'}"
        PRESET: "${preset || 'Masterpiece'}"
        REQUIREMENT: Prioritize hyper-realism, correct sub-surface scattering, volumetric lighting, and extreme micro-detail. 
        OUTPUT ONLY THE PROMPT STRING.` 
    });
    return response.text || base;
}

export async function generateCode(prompt: string, language: string, model: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: model as any, contents: `Write ${language} code: "${prompt}".` });
    return response.text?.replace(/```[a-z]*\n|```/g, '').trim() || "";
}

export async function validateSyntax(code: string, language: string): Promise<{ line: number; message: string }[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Errors in ${language}: "${code}".`, config: { responseMimeType: 'application/json' } });
    return JSON.parse(response.text || '[]');
}

// --- LIVE API SESSION ---
let nextStartTime = 0;
const sources = new Set<AudioBufferSourceNode>();
let inputAudioContext: AudioContext | null = null;
let outputAudioContext: AudioContext | null = null;
let inputNode: GainNode | null = null;
let outputNode: GainNode | null = null;
let inputAnalyser: AnalyserNode | null = null;
let outputAnalyser: AnalyserNode | null = null;

export const liveSession = {
    _session: null as any,
    onToolCall: null as ((name: string, args: any) => Promise<any>) | null,
    
    primeAudio: async () => {
        if (!inputAudioContext) {
            inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            inputNode = inputAudioContext.createGain();
            inputAnalyser = inputAudioContext.createAnalyser();
            inputAnalyser.fftSize = 64;
            inputNode.connect(inputAnalyser);
        }
        if (!outputAudioContext) {
            outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            outputNode = outputAudioContext.createGain();
            outputAnalyser = outputAudioContext.createAnalyser();
            outputAnalyser.fftSize = 64;
            outputNode.connect(outputAnalyser);
            outputNode.connect(outputAudioContext.destination);
        }
        if (inputAudioContext.state === 'suspended') await inputAudioContext.resume();
        if (outputAudioContext.state === 'suspended') await outputAudioContext.resume();
    },

    connect: async (voice: string, config: any) => {
        const ai = getAI();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: { 
                responseModalities: [Modality.AUDIO], 
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } }, 
                systemInstruction: config.systemInstruction, 
                tools: config.tools, 
                outputAudioTranscription: config.outputAudioTranscription, 
                inputAudioTranscription: config.inputAudioTranscription 
            },
            callbacks: {
                onopen: () => {
                    const source = inputAudioContext!.createMediaStreamSource(stream);
                    const scriptProcessor = inputAudioContext!.createScriptProcessor(4096, 1, 1);
                    scriptProcessor.onaudioprocess = (e) => {
                        const inputData = e.inputBuffer.getChannelData(0);
                        const pcmBlob = createBlob(inputData);
                        sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
                    };
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContext!.destination);
                    if (config.callbacks?.onopen) config.callbacks.onopen();
                },
                onmessage: async (message: LiveServerMessage) => {
                    if (message.toolCall && liveSession.onToolCall) {
                        const functionResponses: any[] = [];
                        for (const fc of message.toolCall.functionCalls) { 
                            const res = await liveSession.onToolCall(fc.name, fc.args); 
                            functionResponses.push({ id: fc.id, name: fc.name, response: res });
                        }
                        if (functionResponses.length > 0) {
                            sessionPromise.then((session) => {
                                session.sendToolResponse({ functionResponses }); 
                            });
                        }
                    }
                    
                    const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                    if (base64EncodedAudioString && outputAudioContext) {
                        nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
                        const audioBuffer = await decodeAudioData(decode(base64EncodedAudioString), outputAudioContext, 24000, 1);
                        const source = outputAudioContext.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputNode!);
                        source.addEventListener('ended', () => sources.delete(source));
                        source.start(nextStartTime);
                        nextStartTime += audioBuffer.duration;
                        sources.add(source);
                    }

                    if (message.serverContent?.interrupted) {
                        for (const s of sources) { try { s.stop(); } catch(e) {} sources.delete(s); }
                        nextStartTime = 0;
                    }

                    if (config.callbacks?.onmessage) config.callbacks.onmessage(message);
                },
                onerror: config.callbacks?.onerror,
                onclose: config.callbacks?.onclose
            }
        });
        liveSession._session = await sessionPromise;
        return liveSession._session;
    },
    
    disconnect: () => { 
        if (liveSession._session?.close) liveSession._session.close(); 
        liveSession._session = null; 
        for (const s of sources) { try { s.stop(); } catch(e) {} sources.delete(s); }
        nextStartTime = 0;
    },
    
    isConnected: () => !!liveSession._session,
    
    getInputFrequencies: () => {
        if (!inputAnalyser) return new Uint8Array(32);
        const data = new Uint8Array(inputAnalyser.frequencyBinCount);
        inputAnalyser.getByteFrequencyData(data);
        return data;
    },
    
    getOutputFrequencies: () => {
        if (!outputAnalyser) return new Uint8Array(32);
        const data = new Uint8Array(outputAnalyser.frequencyBinCount);
        outputAnalyser.getByteFrequencyData(data);
        return data;
    }
};