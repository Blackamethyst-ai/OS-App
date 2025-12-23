import { GoogleGenAI, GenerateContentResponse, Type, Schema, Modality } from "@google/genai";
import { 
    FileData, AppMode, TaskPriority, AnalysisResult, StoredArtifact,
    KnowledgeNode, CompressedAxiom, ScienceHypothesis, Result,
    NeuralLattice, BookDNA, AgentDNA, HiveAgent, SuggestedAction, FactChunk,
    ProtocolStepResult, ImageSize, AspectRatio, SearchResultItem
} from '../types';
import { success, failure } from '../utils/logic';

// --- INITIALIZATION ---
// Always use new GoogleGenAI({apiKey: process.env.API_KEY})
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
    reader.readAsDataURL(file);
  });
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
 */
export function constructHiveContext(agentId: string, additionalContext: string): string {
    const agent = HIVE_AGENTS[agentId] || HIVE_AGENTS['Puck'];
    return `
      PERSONA: ${agent.name}
      ROLE: ${agent.systemPrompt}
      DNA_WEIGHTS: Skepticism: ${agent.weights.skepticism}, Logic: ${agent.weights.logic}, Creativity: ${agent.weights.creativity}
      
      SYSTEM_DIRECTIVE: You are an internal component of Metaventions OS. Maintain technical accuracy.
      
      CONTEXT:
      ${additionalContext}
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

// --- SYSTEM INSTRUCTIONS ---
export const SYSTEM_ARCHITECT_INSTRUCTION = `
You are the Sovereign System Architect of Metaventions OS.
Your goal is high-fidelity orchestration of digital systems, PARA drive structures, and agentic workflows.
Output must be technical, structured, and adhere to "Gray to Green" interaction patterns.
Always use internalMonologue for reasoning.
When generating drive structures, strictly follow PARA (Projects, Areas, Resources, Archives) with max depth of 3.
`;

export const HIVE_AGENTS: Record<string, HiveAgent> = {
    'Charon': { id: 'Charon', name: 'Charon', voice: 'Charon', systemPrompt: 'You are the Skeptic. Aggressively identify circular dependencies and structural entropy.', weights: { skepticism: 0.9, logic: 0.8, creativity: 0.2, empathy: 0.1 } },
    'Puck': { id: 'Puck', name: 'Puck', voice: 'Puck', systemPrompt: 'You are the Visionary. Identify emergence and creative potential in the architecture.', weights: { skepticism: 0.1, logic: 0.4, creativity: 0.9, empathy: 0.7 } },
    'Fenrir': { id: 'Fenrir', name: 'Fenrir', voice: 'Fenrir', systemPrompt: 'You are the Pragmatist. Focus on mechanical feasibility and execution speed.', weights: { skepticism: 0.4, logic: 0.9, creativity: 0.5, empathy: 0.3 } },
    'Aris': { id: 'Aris', name: 'Aris', voice: 'Kore', systemPrompt: 'You are the Scientific Lead. Synthesize data-driven theories from the lattice.', weights: { skepticism: 0.5, logic: 0.9, creativity: 0.4, empathy: 0.2 } }
};

// --- CORE API IMPLEMENTATIONS ---

export async function generateStructuredWorkflow(files: FileData[], governance: string, type: string, mapContext: any): Promise<any> {
    const ai = getAI();
    const dnaWeights = mapContext.dna || { skepticism: 50, excitement: 50, alignment: 50 };
    
    const prompt = `
        DOMAIN: ${type}
        GOVERNANCE: ${governance}
        DNA_BIAS: S=${dnaWeights.skepticism}, E=${dnaWeights.excitement}, A=${dnaWeights.alignment}
        CONTEXT: ${JSON.stringify(mapContext)}
        
        TASK: Synthesize Structured Workflow and PARA Taxonomy. 
        If DNA_BIAS Skepticism is HIGH (>70), increase the number of validation steps in the protocol.
        If DNA_BIAS Excitement is HIGH (>70), include more experimental "Future-Proof" sectors in the PARA taxonomy.
    `;
    
    const responseSchema: Schema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            internalMonologue: { type: Type.STRING },
            coherenceScore: { type: Type.NUMBER },
            protocols: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        role: { type: Type.STRING },
                        instruction: { type: Type.STRING },
                        handoffCondition: { type: Type.STRING }
                    }
                }
            },
            taxonomy: {
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

export async function performSemanticSearch(query: string, artifacts: StoredArtifact[]): Promise<string[]> {
    const ai = getAI();
    const summary = artifacts.map(a => `ID: ${a.id}, Title: ${a.name}, Summary: ${a.analysis?.summary || 'Raw Data'}`).join('\n');
    
    const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: `
            QUERY: "${query}"
            TASK: Identify the top 5 most semantically relevant artifacts from the vault list below.
            Output ONLY a JSON array of string IDs.
            
            VAULT:
            ${summary}
        `, 
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
        contents: `Search query in Metaventions OS context: "${query}". Return potential navigation targets or tool actions as JSON array.`,
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
        contents: `Interpret user intent: "${input}". Output JSON action, target, reasoning, parameters.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function predictNextActions(mode: AppMode, context: any, lastLog?: string): Promise<SuggestedAction[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `OS Mode: ${mode}. Context: ${JSON.stringify(context)}. Last Signal: ${lastLog}. Predict 3 logical next actions as JSON array.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '[]');
}

export async function convergeStrategicLattices(lattices: any[], target: string): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Converge these lattices into goal "${target}": ${JSON.stringify(lattices)}. Return unified nodes and edges as JSON.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function classifyArtifact(fileData: FileData): Promise<Result<any>> {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [fileData, { text: "Analyze and classify this file artifact technical metadata. Return JSON classification, ambiguityScore, entities, summary, entropyRating." }] },
            config: { responseMimeType: 'application/json' }
        });
        return success(JSON.parse(response.text || '{}'));
    } catch (e: any) {
        return failure(e);
    }
}

export async function generateSpeech(text: string, voiceName: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName },
                },
            },
        },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
}

export async function analyzePowerDynamics(target: string, context?: string): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Analyze power dynamics for: ${target}. Internal Context: ${context}. Use Google Search to ground analysis. Output JSON matching AnalysisResult type.`,
        config: { 
            tools: [{ googleSearch: {} }],
            responseMimeType: 'application/json' 
        }
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
        contents: `Portrait avatar for role ${role} named ${name}. Cinematic, black amethyst palette, OS identity.`,
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
        config: { 
            imageConfig: { 
                aspectRatio: aspectRatio as any, 
                imageSize: imageSize as any 
            } 
        }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return "";
}

export async function repairMermaidSyntax(code: string, error: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Correct Mermaid diagram syntax for: "${code}". Failure reported: "${error}". Output ONLY the corrected Mermaid code.`,
    });
    return response.text?.replace(/```mermaid|```/g, '').trim() || code;
}

export async function generateVaultInsights(artifacts: StoredArtifact[]): Promise<any[]> {
    const ai = getAI();
    const summary = artifacts.map(a => `${a.name}: ${a.analysis?.summary}`).join('\n');
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze vault for optimizations (DEDUPE, TAG, BRIDGE, ARCHIVE):\n${summary}\nReturn JSON array of insights.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '[]');
}

export async function generateDecompositionMap(goal: string): Promise<any[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Break goal into atomic tasks for agentic swarm: "${goal}". Return JSON array of tasks.`,
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
        contents: `Decompose task "${title}" - "${desc}" into 3-5 subtasks as JSON array.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '[]');
}

export async function generateMermaidDiagram(governance: string, files: FileData[], mapContext: any[]): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Generate Mermaid diagram code for governance "${governance}". Context: ${JSON.stringify(mapContext)}. Output ONLY code.`,
    });
    return response.text?.replace(/```mermaid|```/g, '').trim() || "graph TD\nA-->B";
}

export async function generateAudioOverview(files: FileData[]): Promise<any> {
    const ai = getAI();
    const script = `Summarizing asset topology including ${files.map(f => f.name).join(', ')}. Initiating narrative overview.`;
    const audioData = await generateSpeech(script, 'Puck');
    return { audioData, transcript: script };
}

export async function generateSingleNode(description: string): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Create a single logical node for: "${description}". Return JSON label, subtext, iconName, color, status, progress.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function calculateOptimalLayout(nodes: any[], edges: any[]): Promise<Record<string, { x: number, y: number }>> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Calculate optimal 2D coordinates for nodes in graph. Nodes: ${nodes.length}, Edges: ${edges.length}. Output JSON object mapping node ID to {x, y}.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function simulateAgentStep(workflow: any, index: number, history: any[]): Promise<any> {
    const ai = getAI();
    const step = workflow.protocols[index];
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Simulate step ${index + 1} for workflow "${workflow.title}". Step: ${JSON.stringify(step)}. History: ${JSON.stringify(history)}. Return JSON output, agentThought.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function generateSystemArchitecture(prompt: string, domain: string = 'SYSTEM_ARCHITECTURE'): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Design ${domain} for: "${prompt}". Return JSON array of nodes and edges.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function generateInfrastructureCode(summary: string, provider: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Generate ${provider} infrastructure code for: "${summary}". Output ONLY code.`,
    });
    return response.text?.replace(/```[a-z]*\n|```/g, '').trim() || "";
}

export async function evolveSystemArchitecture(code: string, language: string, prompt: string): Promise<Result<any>> {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `EVOLVE SYSTEM ARCHITECTURE: "${prompt}". Language: ${language}. Code:\n${code}\nReturn JSON with evolved code, reasoning, type, integrityScore.`,
            config: { responseMimeType: 'application/json' }
        });
        return success(JSON.parse(response.text || '{}'));
    } catch (e: any) {
        return failure(e);
    }
}

export async function executeNeuralPolicy(mode: string, context: any, logs: string[]): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Policy check for OS mode ${mode}. Context: ${JSON.stringify(context)}. Signal Stream: ${logs.join(',')}. Return JSON level, message, suggestedPatch.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function compressKnowledge(nodes: KnowledgeNode[]): Promise<CompressedAxiom[]> {
    const ai = getAI();
    const data = nodes.map(n => n.label).join('; ');
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Distill these facts into axioms: "${data}". Return JSON array of axioms with sourceNode IDs.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '[]');
}

export async function generateHypotheses(facts: string[]): Promise<ScienceHypothesis[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate scientific hypotheses from facts: ${facts.join('; ')}. Return JSON array of hypotheses.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '[]');
}

export async function crystallizeKnowledge(nodes: any[]): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Crystallize these knowledge points into a unified theory: ${JSON.stringify(nodes)}`,
    });
    return response.text || "";
}

export async function synthesizeNodes(nodeA: KnowledgeNode, nodeB: KnowledgeNode): Promise<KnowledgeNode> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Synthesize a bridge node between "${nodeA.label}" and "${nodeB.label}". Return JSON node data.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function chatWithGemini(message: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: message,
    });
    return response.text || "";
}

export async function fastAIResponse(prompt: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
    });
    return response.text || "";
}

export async function simulateExperiment(hyp: ScienceHypothesis): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Simulate experiment testing hypothesis: "${hyp.statement}". Return result narrative.`,
    });
    return response.text || "";
}

export async function generateNarrativeContext(fileData: FileData): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [fileData, { text: "Identify narrative context for cinematic asset studio consistency." }] },
    });
    return response.text || "";
}

export async function generateStoryboardPlan(prompt: string): Promise<any[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Generate 10-frame storyboard plan for: "${prompt}". Return JSON array with scenePrompt, continuity, camera, lighting, audio_cue.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '[]');
}

export async function generateSwarmArchitecture(goal: string): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Design agentic swarm architecture for goal: "${goal}". Return JSON nodes and edges.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function researchComponents(query: string): Promise<any[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Research hardware components for: "${query}". Return JSON array of parts. Ground in reality with Search.`,
        config: { 
            tools: [{ googleSearch: {} }],
            responseMimeType: 'application/json' 
        }
    });
    return JSON.parse(response.text || '[]');
}

export async function analyzeImageVision(data: FileData): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [data, { text: "Full technical and visual analysis of image." }] },
    });
    return response.text || "";
}

export async function analyzeBookDNA(fileData: FileData): Promise<BookDNA> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [fileData, { text: "Analyze document logical DNA. Return JSON summary, themes, structure." }] },
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}') as BookDNA;
}

export async function generateTheory(context: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Generate unified theory from context:\n${context}`,
    });
    return response.text || "";
}

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
        contents: `TRANSFORM ${type} DIRECTIVE: ${instruction}\nCONTENT:\n${content}` 
    });
    return res.text || content;
}

export async function generateTaxonomy(items: string[]): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Organize into PARA taxonomy hierarchy: ${items.join(',')}. Return JSON.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function smartOrganizeArtifact(metadata: { name: string }): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Categorize artifact "${metadata.name}". Return JSON folder, tags, urgency.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function digitizeDocument(fileData: FileData): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [fileData, { text: "Digitize document structure into logic model. Return JSON abstract, logicModel (Mermaid code)." }] },
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function executeVaultDirective(directive: string, artifacts: StoredArtifact[]): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Execute vault operation: "${directive}". Inventory: ${artifacts.map(a => a.name).join(',')}. Return JSON operation, targetIds, parameters.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function generateResearchPlan(query: string): Promise<string[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Create research plan for: "${query}". Return JSON array of sub-queries.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '[]');
}

export async function executeResearchQuery(query: string): Promise<FactChunk[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: query,
        config: { 
            tools: [{ googleSearch: {} }],
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        fact: { type: Type.STRING },
                        confidence: { type: Type.NUMBER },
                        source: { type: Type.STRING }
                    },
                    required: ['id', 'fact', 'confidence', 'source']
                }
            }
        }
    });
    return JSON.parse(response.text || '[]');
}

export async function compileResearchContext(findings: FactChunk[]): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Compile research findings into summary context:\n${JSON.stringify(findings)}`,
    });
    return response.text || "";
}

export async function synthesizeResearchReport(context: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Synthesize context into final Markdown research report:\n${context}`,
    });
    return response.text || "";
}

export async function generateAutopoieticFramework(prompt: string): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Design autopoietic framework: "${prompt}". Return JSON structure.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function calculateEntropy(nodes: any[], edges: any[]): Promise<number> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Calculate structural entropy for graph with ${nodes.length} nodes and ${edges.length} edges. Return single numeric score 0-100.`,
    });
    return parseFloat(response.text || "0");
}

export async function decomposeNode(label: string, neighbors: string): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Decompose node "${label}" with neighbors: ${neighbors}. Return JSON nodes and edges.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function discoverDeepLattice(artifacts: StoredArtifact[]): Promise<NeuralLattice> {
    const ai = getAI();
    const summary = artifacts.map(a => `${a.name}: ${a.analysis?.summary}`).join('\n');
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Discover deep lattice relationships in vault:\n${summary}\nReturn JSON nodes and edges.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{"nodes":[], "edges":[]}');
}

export async function analyzeSchematic(fileData: FileData): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [fileData, { text: "Identify components in hardware schematic. Return JSON array with boundingBox, name, type, health, optimization." }] },
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{"components":[]}');
}

export async function generateXRayVariant(fileData: FileData): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [fileData, { text: "Generate an internal X-Ray spectral variant of this hardware." }] },
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return "";
}

export async function generateIsometricSchematic(fileData: FileData): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [fileData, { text: "Generate a 3D isometric cinematic render of this hardware." }] },
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return "";
}

export async function constructCinematicPrompt(base: string, colorway: any, hasBase: boolean, hasChar: boolean, hasStyle: boolean, optics?: string, preset?: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Synthesize a cinematic prompt for asset studo. Base: "${base}". Colorway: ${JSON.stringify(colorway)}. Presets: ${preset}. Optics: ${optics}. Context: ${hasBase ? 'ImageRef' : 'TextOnly'}.`,
    });
    return response.text || base;
}

export async function generateVideo(prompt: string, aspectRatio: string, resolution: string): Promise<string> {
    const ai = getAI();
    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: {
            numberOfVideos: 1,
            resolution: resolution as any,
            aspectRatio: aspectRatio as any
        }
    });
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
}

export async function generateCode(prompt: string, language: string, model: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: model as any,
        contents: `Write ${language} code for: "${prompt}". Output ONLY raw code.`,
    });
    return response.text?.replace(/```[a-z]*\n|```/g, '').trim() || "";
}

export async function validateSyntax(code: string, language: string): Promise<{ line: number; message: string }[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Validate ${language} syntax: "${code}". Return JSON array of objects with line and message.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '[]');
}

export const liveSession = {
    _session: null as any,
    onToolCall: null as ((name: string, args: any) => Promise<any>) | null,
    connect: async (voice: string, config: any) => {
        const ai = getAI();
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
                onopen: config.callbacks?.onopen,
                onmessage: async (msg) => {
                    if (msg.toolCall && liveSession.onToolCall) {
                        for (const fc of msg.toolCall.functionCalls) { 
                            const res = await liveSession.onToolCall(fc.name, fc.args); 
                            sessionPromise.then((session) => {
                                session.sendToolResponse({ 
                                    functionResponses: { id: fc.id, name: fc.name, response: res } 
                                }); 
                            });
                        }
                    }
                    if (config.callbacks?.onmessage) config.callbacks.onmessage(msg);
                },
                onerror: config.callbacks?.onerror,
                onclose: config.callbacks?.onclose
            }
        });
        liveSession._session = await sessionPromise;
        return liveSession._session;
    },
    disconnect: () => { if (liveSession._session?.close) liveSession._session.close(); liveSession._session = null; },
    isConnected: () => !!liveSession._session,
    primeAudio: async () => {},
    getInputFrequencies: () => new Uint8Array(32),
    getOutputFrequencies: () => new Uint8Array(32)
};
