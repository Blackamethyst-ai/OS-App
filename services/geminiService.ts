
import { GoogleGenAI, Type, Schema, FunctionDeclaration, Blob as GenAIBlob, LiveServerMessage, Modality, GenerateContentResponse, GenerateContentParameters } from "@google/genai";
import { 
    AppMode, FileData, SuggestedAction, AspectRatio, ImageSize, AnalysisResult, 
    ArtifactAnalysis, BookDNA, FactChunk, ScienceHypothesis, KnowledgeNode, 
    UserIntent, SyntheticPersona, SwarmStatus, AtomicTask, SwarmResult, VoteLedger, SearchResultItem,
    ResonancePoint, Colorway, Message, HardwareTier, ComponentRecommendation, EconomicProtocol,
    CompressedAxiom, DigitizationResult, AgentDNA, StoredArtifact, NeuralLattice, ProtocolStepResult
} from '../types';

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const SYSTEM_COMMANDER_INSTRUCTION = `
ROLE: You are the Central Architectural Intelligence (Voice Core) for Metaventions OS.
TONE: Technical, precise, helpful, and highly competent.
OBJECTIVE: Assist the Architect in managing systems, generating assets, and researching complex data.
TERMINOLOGY:
- User is "Architect".
- System modules are "Sectors".
- Actions are "Protocols".
DIRECTIVE: Provide high-fidelity technical support. Orchestrate OS operations via available tools.
`.trim();

export interface HiveAgent {
    id: string;
    name: string;
    role: string;
    voice: string;
    systemPrompt: string;
    weights: {
        logic: number;
        skepticism: number;
        creativity: number;
        empathy: number;
    };
}

export const AGENT_DNA_BUILDER: AgentDNA[] = [
    { id: 'BUILDER_1', label: 'Lattice Architect', role: 'Structural Logic', color: '#9d4edd', description: 'Optimized for topological integrity and system scalability.' },
    { id: 'BUILDER_2', label: 'Entropy Sentinel', role: 'Risk Mitigation', color: '#ef4444', description: 'Optimized for finding vulnerabilities and edge cases.' },
    { id: 'BUILDER_3', label: 'Flux Operator', role: 'Dynamic Execution', color: '#22d3ee', description: 'Optimized for high-velocity iteration and deployment.' }
];

export async function analyzeSchematic(image: FileData): Promise<any> {
    const ai = getAI();
    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            components: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        type: { type: Type.STRING },
                        health: { type: Type.NUMBER, description: "0-100" },
                        boundingBox: { 
                            type: Type.ARRAY, 
                            items: { type: Type.NUMBER }, 
                            description: "[ymin, xmin, ymax, xmax] in normalized 0-1000 coordinates"
                        },
                        optimization: { type: Type.STRING }
                    },
                    required: ['name', 'type', 'boundingBox']
                }
            },
            thermalRisks: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        zone: { type: Type.STRING },
                        severity: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
                        description: { type: Type.STRING }
                    }
                }
            }
        },
        required: ['components']
    };

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [image, { text: "Perform a structural analysis of this hardware schematic. Identify all sub-components with their precise bounding boxes for an interactive overlay. Return JSON." }] },
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: schema
        }
    });
    return JSON.parse(response.text || "{}");
}

export async function researchComponents(query: string): Promise<ComponentRecommendation[]> {
    const ai = getAI();
    // TECHNICAL IMPROVEMENT: Add Google Search grounding for real-world parity
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Research current hardware component recommendations for: "${query}". Provide real-world manufacturer data, approximate current market price, and technical suitability for enterprise AI clusters. Return JSON array.`,
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, 
            responseMimeType: 'application/json',
            tools: [{ googleSearch: {} }] 
        }
    });
    return JSON.parse(response.text || "[]");
}

// Fix: Added missing classifyArtifact export
export async function classifyArtifact(file: FileData): Promise<ArtifactAnalysis> {
    const ai = getAI();
    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            classification: { type: Type.STRING },
            ambiguityScore: { type: Type.NUMBER },
            entities: { type: Type.ARRAY, items: { type: Type.STRING } },
            summary: { type: Type.STRING },
            entropyRating: { type: Type.NUMBER }
        },
        required: ['classification', 'ambiguityScore', 'entities', 'summary']
    };

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [file, { text: "Analyze and classify this artifact. Identify key entities, provide a technical summary, and estimate the ambiguity and entropy of the data. Return JSON." }] },
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: schema
        }
    });
    return JSON.parse(response.text || "{}");
}

// Fix: Added missing digitizeDocument export
export async function digitizeDocument(file: FileData): Promise<DigitizationResult> {
    const ai = getAI();
    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            toc: { 
                type: Type.ARRAY, 
                items: { 
                    type: Type.OBJECT, 
                    properties: { title: { type: Type.STRING }, page: { type: Type.NUMBER } } 
                } 
            },
            entities: { 
                type: Type.ARRAY, 
                items: { 
                    type: Type.OBJECT, 
                    properties: { name: { type: Type.STRING }, type: { type: Type.STRING }, significance: { type: Type.STRING } } 
                } 
            },
            logicModel: { type: Type.STRING, description: "Mermaid code representing the logic flow" },
            abstract: { type: Type.STRING }
        },
        required: ['toc', 'entities', 'logicModel', 'abstract']
    };

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview', 
        contents: { parts: [file, { text: "Perform a deep digitization of this document. Extract the table of contents, key entities with their significance, a high-level abstract, and generate a Mermaid diagram of the internal logic. Return JSON." }] },
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: schema
        }
    });
    return JSON.parse(response.text || "{}");
}

export async function generateStructuredWorkflow(files: FileData[], governance: string, type: string, context: any): Promise<any> {
    const ai = getAI();
    let prompt = `Generate a high-fidelity structured workflow protocol of type ${type}. Return JSON { protocols: [{action, description, role, tool, step, priority}], taxonomy: { root: [{folder, subfolders}] } }.`;
    
    if (type === 'DRIVE_ORGANIZATION') {
        prompt += `
        STRICT REQUIREMENT: Use the PARA Method for the taxonomy:
        - 00_PROJECTS (Active undertakings)
        - 10_AREAS (Ongoing responsibilities)
        - 20_RESOURCES (Reference interests)
        - 30_ARCHIVES (Completed items)
        Ensure protocols focus on metadata tagging and file lifecycle management.
        `;
    } else if (type === 'SYSTEM_ARCHITECTURE') {
        prompt += `
        STRICT REQUIREMENT: Use a tiered service topology for the taxonomy:
        - 01_Edge (Ingress/WAF)
        - 02_Logic (Microservices)
        - 03_Persistence (Databases/Caches)
        - 04_Ops (Monitoring/Logging)
        Ensure protocols focus on zero-trust handshakes and high-availability health checks.
        `;
    }

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { parts: [...files, { text: prompt }] },
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export async function generateIsometricSchematic(image: FileData): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [image, { text: "Convert this flat 2D schematic into a hyper-realistic 3D isometric technical illustration with orthographic shadows and clear technical labeling." }] }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) { if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`; }
    throw new Error("Isometric generation failed");
}

export async function generateXRayVariant(image: FileData): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [image, { text: "Transform this schematic into an internal X-ray view showing glowing PCB traces, internal component dies, and thermal conduits in high-contrast neon cyan." }] }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) { if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`; }
    throw new Error("X-Ray generation failed");
}

export async function promptSelectKey(): Promise<void> { if (window.aistudio?.openSelectKey) await window.aistudio.openSelectKey(); }

export async function retryGeminiRequest<T>(operation: () => Promise<T>, retries: number = 3, baseDelay: number = 2000): Promise<T> {
    try { return await operation(); } catch (error: any) {
        const status = error.status || error.response?.status || error.statusCode;
        const isRetryable = status === 503 || status === 429 || status === 500;
        if (retries > 0 && isRetryable) { await new Promise(resolve => setTimeout(resolve, baseDelay)); return retryGeminiRequest(operation, retries - 1, baseDelay * 2); }
        throw error;
    }
}

export async function fileToGenerativePart(file: File): Promise<FileData> {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
        const reader = new FileReader(); reader.onloadend = () => resolve((reader.result as string).split(',')[1]); reader.readAsDataURL(file);
    });
    return { inlineData: { data: await base64EncodedDataPromise, mimeType: file.type }, name: file.name };
}

export const HIVE_AGENTS: Record<string, HiveAgent> = {
    'Puck': { id: 'Puck', name: 'Puck', role: 'Visionary Strategy Architect', voice: 'Puck', systemPrompt: 'You are Puck, focusing on creative synthesis and future horizons.', weights: { logic: 0.6, skepticism: 0.2, creativity: 0.9, empathy: 0.7 } },
    'Charon': { id: 'Charon', name: 'Charon', role: 'Skeptical Systems Analyst', voice: 'Charon', systemPrompt: 'You are Charon, focusing on vulnerability detection and logical rigor.', weights: { logic: 0.9, skepticism: 0.9, creativity: 0.3, empathy: 0.2 } },
    'Fenrir': { id: 'Fenrir', name: 'Fenrir', role: 'Pragmatic Execution Lead', voice: 'Fenrir', systemPrompt: 'You are Fenrir, focusing on structural integrity and performance metrics.', weights: { logic: 0.8, skepticism: 0.5, creativity: 0.4, empathy: 0.4 } }
};

export async function interpretIntent(input: string): Promise<UserIntent> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Interpret intent: "${input}". Provide structure for system execution. Return JSON {action, target, reasoning}.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export async function generateArchitectureImage(prompt: string, aspectRatio: AspectRatio, size: ImageSize, reference?: FileData): Promise<string> {
    const ai = getAI();
    const parts: any[] = [{ text: prompt }];
    if (reference) parts.unshift(reference);
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts },
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, imageConfig: { aspectRatio: aspectRatio as any, imageSize: size as any } }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) { if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`; }
    throw new Error("Generation failed");
}

export async function generateCode(prompt: string, language: string, model: string, context?: FileData[]): Promise<string> {
    const ai = getAI();
    const parts: any[] = [...(context || []), { text: `Forge ${language} logic for: ${prompt}` }];
    const response = await ai.models.generateContent({
        model: model as any,
        contents: { parts },
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    });
    return (response.text || "").replace(/```[a-z]*\n|```/gi, '').trim();
}

export async function generateAvatar(role: string, name: string): Promise<string> {
    const ai = getAI();
    const prompt = `AI agent avatar for role: "${role}", designation: "${name}". Technical aesthetic.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: prompt,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, imageConfig: { aspectRatio: "1:1" } }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) { if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`; }
    throw new Error("Avatar failed");
}

export async function transformArtifact(content: any, type: 'IMAGE' | 'CODE' | 'TEXT', instruction: string): Promise<any> {
    const ai = getAI(); let prompt = `Transformation Instruction: ${instruction}\n\n`; let model = 'gemini-3-flash-preview'; let contents: any;
    if (type === 'IMAGE') {
        model = 'gemini-2.5-flash-image';
        const base64 = (content as string).split(',')[1];
        contents = { parts: [{ inlineData: { mimeType: 'image/png', data: base64 } }, { text: instruction }] };
    } else { prompt += `SOURCE CONTENT:\n${content}`; contents = prompt; }
    const response = await ai.models.generateContent({
        model: model as any,
        contents,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    });
    if (type === 'IMAGE') {
        for (const part of response.candidates?.[0]?.content?.parts || []) { if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`; }
        throw new Error("Transform failed");
    }
    return response.text;
}

export async function generateMermaidDiagram(governance: string, files: FileData[], context: any[]): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [...files, { text: `Generate Mermaid diagram code for system topology under ${governance}. Map context: ${JSON.stringify(context)}. Return ONLY Mermaid code block.` }] },
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    });
    return (response.text || "").replace(/```mermaid\n|```/gi, '').trim();
}

export async function repairMermaidSyntax(code: string, error: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Fix Mermaid syntax error: "${error}". Original Code:\n${code}. Return ONLY the fixed code block.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    });
    return (response.text || "").replace(/```mermaid\n|```/gi, '').trim();
}

export async function generateSystemArchitecture(prompt: string): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Blueprint system architecture for: "${prompt}". Return JSON {nodes, edges}.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{ \"nodes\": [], \"edges\": [] }");
}

export async function generateSingleNode(description: string): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Design a system node for: "${description}". Return JSON {label, subtext, iconName, color, description}.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export async function generateHypotheses(facts: string[]): Promise<ScienceHypothesis[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate 3 scientific hypotheses from facts: ${facts.join('; ')}. Return JSON array of ScienceHypothesis.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
}

export async function crystallizeKnowledge(nodes: KnowledgeNode[]): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Crystallize unified knowledge report from lattice nodes: ${JSON.stringify(nodes)}. Output Markdown.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    });
    return response.text || "";
}

export async function synthesizeNodes(a: KnowledgeNode, b: KnowledgeNode): Promise<KnowledgeNode> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Synthesize a bridge concept between: "${a.label}" and "${b.label}". Return JSON KnowledgeNode.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export async function generateStoryboardPlan(context: any, count: number): Promise<any[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Create ${count}-frame cinematic storyboard plan for: ${JSON.stringify(context)}. Return JSON array of frames.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
}

export async function constructCinematicPrompt(base: string, color: Colorway, hasBasePlate: boolean, hasCharacterLock: boolean, hasStyleRef: boolean, ert?: ResonancePoint, preset?: string, cam?: string, light?: string): Promise<string> {
    const ai = getAI();
    const directive = "Generate a best-in-class cinematic asset.";
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Optimize cinematic prompt. DIRECTIVE: ${directive} BASE_VISION_COMMAND: "${base}". COLOR_SYSTEM: ${JSON.stringify(color)}. RESONANCE: ${JSON.stringify(ert)}. PRESET: ${preset}. CAMERA: ${cam}. LIGHTING: ${light}.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    });
    return response.text || base;
}

export async function generateSpeech(text: string, voiceName: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } },
    });
    const base64 = response.candidates?.[0]?.content?.parts[0]?.inlineData?.data;
    if (!base64) throw new Error("TTS failed");
    return base64;
}

export async function validateSyntax(code: string, lang: string): Promise<{ line: number, message: string }[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Validate ${lang} syntax for:\n${code}\nReturn JSON array of {line, message} if errors.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
}

export async function generateCodeSuggestions(code: string, lang: string): Promise<string[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Suggest improvements for this ${lang} code:\n${code}\nReturn JSON array of strings.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
}

export async function generateResearchPlan(query: string): Promise<string[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Create research plan with sub-queries for: "${query}". Return JSON array of strings.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
}

export async function executeResearchQuery(query: string): Promise<FactChunk[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Research this vector: "${query}". Return JSON array of FactChunk.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json', tools: [{ googleSearch: {} }] }
    });
    return JSON.parse(response.text || "[]");
}

export async function analyzeImageVision(image: FileData): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [image, { text: "Extract cinematic metadata, lighting, and composition from this source." }] },
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    });
    return response.text || "";
}

export async function decomposeTaskToSubtasks(title: string, description: string): Promise<string[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze objective: "${title}". Context: "${description}". Break this down into atomic, actionable sub-tasks. Return JSON array.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
}

export async function generateSwarmArchitecture(prompt: string): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Blueprint a multi-agent swarm architecture for: "${prompt}". Return JSON {nodes, edges}.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{ \"nodes\": [], \"edges\": [] }");
}

export async function simulateAgentStep(workflow: any, index: number, history: ProtocolStepResult[]): Promise<ProtocolStepResult> {
    const ai = getAI();
    const step = workflow.protocols[index];
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Execute workflow step: ${JSON.stringify(step)}. Return JSON { output, agentThought }.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    const data = JSON.parse(response.text || "{}");
    return {
        output: data.output || "Step completed.",
        agentThought: data.agentThought || "No reasoning provided.",
        timestamp: Date.now()
    };
}

export async function predictNextActions(mode: AppMode, state: any, lastLog?: string): Promise<SuggestedAction[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Predict next suggested actions for the Architect in ${mode} mode. Context: ${JSON.stringify(state)}. Last Log: ${lastLog}. Return JSON array of SuggestedAction {id, label, command, reasoning, iconName}.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
}

export async function generateNarrativeContext(prompt: string, visionAnalysis: string): Promise<{ narrative: string, resonance: ResonancePoint[] }> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate narrative expansion and emotional resonance curve for: "${prompt}". Vision Analysis: ${visionAnalysis}. Return JSON {narrative, resonance: [{frame, tension, dynamics}]}.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export async function analyzePowerDynamics(input: string): Promise<AnalysisResult> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze power dynamics for: "${input}". Return JSON AnalysisResult.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export async function analyzeBookDNA(file: FileData): Promise<BookDNA> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [file, { text: "Extract core Axioms and Kernel Identity for this primary source. Return JSON BookDNA." }] },
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export async function simulateExperiment(hypothesis: ScienceHypothesis): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Simulate experiment for hypothesis: "${hypothesis.statement}". Return summary of findings.`,
    });
    return response.text || "";
}

export async function generateTheory(hypotheses: ScienceHypothesis[]): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Synthesize a unified theory from these hypotheses: ${JSON.stringify(hypotheses)}. Output Markdown.`,
    });
    return response.text || "";
}

export async function compressKnowledge(nodes: KnowledgeNode[]): Promise<CompressedAxiom[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Distill these knowledge nodes into high-density axioms: ${JSON.stringify(nodes)}. Return JSON array of CompressedAxiom.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
}

export async function simulateCodeExecution(code: string, lang: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Simulate execution of this ${lang} code and return terminal output: \n${code}`,
    });
    return response.text || "";
}

export async function formatCode(code: string, lang: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Auto-format this ${lang} code for production quality:\n${code}`,
    });
    return response.text || code;
}

export async function fixCode(code: string, error: string, lang: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Fix this ${lang} code based on error output:\nERROR: ${error}\nCODE:\n${code}`,
    });
    return response.text || code;
}

export async function applyCodeSuggestion(code: string, suggestion: string, lang: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Apply this suggestion to the ${lang} code:\nSUGGESTION: ${suggestion}\nCODE:\n${code}`,
    });
    return response.text || code;
}

export async function performGlobalSearch(query: string): Promise<SearchResultItem[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Global system search for: "${query}". Include navigation routes and vault items. Return JSON array of SearchResultItem.`,
        config: { 
            responseMimeType: 'application/json',
            tools: [{ googleSearch: {} }] 
        }
    });
    return JSON.parse(response.text || "[]");
}

export async function generateTaxonomy(items: StoredArtifact[]): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate a logical taxonomy for these artifacts: ${JSON.stringify(items.map(i => i.name))}. Return JSON structure.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export async function smartOrganizeArtifact(file: { name: string }): Promise<{ folder: string, tags: string[] }> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Suggest folder and tags for artifact: "${file.name}". Return JSON {folder, tags}.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export async function performSemanticSearch(query: string, artifacts: StoredArtifact[]): Promise<string[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Semantic lookup for: "${query}" in artifacts: ${JSON.stringify(artifacts.map(a => ({id: a.id, summary: a.analysis?.summary})))}. Return JSON array of top item IDs.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
}

export async function discoverDeepLattice(artifacts: StoredArtifact[]): Promise<NeuralLattice> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Discover a deep semantic lattice between these artifacts: ${JSON.stringify(artifacts.map(a => ({id: a.id, summary: a.analysis?.summary})))}. Return JSON NeuralLattice.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{ \"clusters\": [], \"bridges\": [] }");
}

export async function generateVaultInsights(items: StoredArtifact[]): Promise<any[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Analyze vault artifacts and generate optimization insights: ${JSON.stringify(items.map(i => ({id: i.id, name: i.name, type: i.type, summary: i.analysis?.summary})))}. Return JSON array of {id, type: 'DEDUPE'|'TAG'|'BRIDGE'|'ARCHIVE', message, action, targetIds}.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
}

export async function executeVaultDirective(directive: string, artifacts: StoredArtifact[]): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Interpret vault directive: "${directive}" for artifacts: ${JSON.stringify(artifacts.map(a => a.id))}. Return JSON {operation, targetIds, parameters}.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export async function executeNeuralPolicy(mode: AppMode, context: any, logs: string[]): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Evaluate system state. Mode: ${mode}. Context: ${JSON.stringify(context)}. Recent Logs: ${logs.join('\n')}. Return JSON decision {level: 'INFO'|'WARN'|'SUCCESS'|'ERROR', message, suggestedPatch: {code, explanation}}`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export function constructHiveContext(agentId: string, sharedContext: string): string {
    const agent = HIVE_AGENTS[agentId] || HIVE_AGENTS['Puck'];
    return `
        IDENTITY: You are ${agent.name}, ${agent.role}.
        PERSONALITY: ${agent.systemPrompt}
        WEIGHTS: Logic=${agent.weights.logic}, Skepticism=${agent.weights.skepticism}, Creativity=${agent.weights.creativity}, Empathy=${agent.weights.empathy}
        SHARED_CONTEXT: ${sharedContext}
        DIRECTIVE: Maintain identity while collaborating in the hive.
    `.trim();
}

export async function compileResearchContext(findings: FactChunk[]): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Compile these research findings into a structured context for report synthesis: ${JSON.stringify(findings)}`,
    });
    return response.text || "";
}

export async function synthesizeResearchReport(context: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Synthesize a comprehensive, verified research report from the provided context:\n\n${context}\n\nOutput clean Markdown.`,
    });
    return response.text || "";
}

export async function generateAudioOverview(files: FileData[]): Promise<{ audioData: string, transcript: string }> {
    const ai = getAI();
    const summaryResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [...files, { text: "Generate a technical briefing summary for an audio overview of these system components." }] }
    });
    const summary = summaryResponse.text || "Overview sequence ready.";
    const audioData = await generateSpeech(summary, 'Zephyr');
    return { audioData, transcript: summary };
}

export async function generateAutopoieticFramework(context: any): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Generate an autopoietic framework protocol based on context: ${JSON.stringify(context)}. Return JSON.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export async function calculateEntropy(nodes: any[], edges: any[]): Promise<number> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Calculate system entropy score (0-100) for topology: ${nodes.length} nodes, ${edges.length} edges. Return JSON {score}.`,
        config: { responseMimeType: 'application/json' }
    });
    const result = JSON.parse(response.text || "{\"score\": 0}");
    return result.score;
}

export async function decomposeNode(label: string, neighbors: string): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Decompose system node "${label}" considering neighbors: "${neighbors}". Return JSON {nodes: [{id, label, subtext, iconName, color}], edges: [{id, source, target}], optimizations: [string]}.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{\"nodes\": [], \"edges\": [], \"optimizations\": []}");
}

export async function generateInfrastructureCode(summary: string, provider: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate IaC code for provider ${provider} based on architecture: ${summary}.`,
    });
    return (response.text || "").replace(/```[a-z]*\n|```/gi, '').trim();
}

export async function calculateOptimalLayout(nodes: any[], edges: any[]): Promise<Record<string, { x: number, y: number }>> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Calculate optimal 2D layout positions for system topology nodes: ${JSON.stringify(nodes.map(n => ({id: n.id, label: n.data.label})))}. Return JSON Record<string, {x, y}>.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

let sessionPromise: Promise<any> | null = null;
let inputAudioContext: AudioContext | null = null;
let outputAudioContext: AudioContext | null = null;
let inputAnalyser: AnalyserNode | null = null;
let outputAnalyser: AnalyserNode | null = null;
let nextStartTime = 0;
const audioSources = new Set<AudioBufferSourceNode>();

function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); }
    return btoa(binary);
}

function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }
    return bytes;
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
    for (let i = 0; i < l; i++) { int16[i] = data[i] * 32768; }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}

export const liveSession = {
    onCommand: (intent: UserIntent) => {},
    onToolCall: async (name: string, args: any) => ({}),
    
    isConnected: () => !!sessionPromise,
    
    disconnect: () => {
        if (sessionPromise) {
            sessionPromise.then(s => s.close());
            sessionPromise = null;
        }
        if (inputAudioContext) { inputAudioContext.close(); inputAudioContext = null; }
        if (outputAudioContext) { outputAudioContext.close(); outputAudioContext = null; }
        inputAnalyser = null;
        outputAnalyser = null;
        nextStartTime = 0;
        audioSources.forEach(s => s.stop());
        audioSources.clear();
    },

    connect: async (voiceName: string, config: any) => {
        const ai = getAI();
        inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        inputAnalyser = inputAudioContext.createAnalyser();
        outputAnalyser = outputAudioContext.createAnalyser();
        outputAnalyser.connect(outputAudioContext.destination);

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => {
                    const source = inputAudioContext!.createMediaStreamSource(stream);
                    const scriptProcessor = inputAudioContext!.createScriptProcessor(4096, 1, 1);
                    scriptProcessor.onaudioprocess = (e) => {
                        const inputData = e.inputBuffer.getChannelData(0);
                        const pcmBlob = createBlob(inputData);
                        sessionPromise?.then(s => s.sendRealtimeInput({ media: pcmBlob }));
                    };
                    source.connect(inputAnalyser!);
                    inputAnalyser!.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContext!.destination);
                },
                onmessage: async (msg: LiveServerMessage) => {
                    if (msg.toolCall) {
                        for (const fc of msg.toolCall.functionCalls) {
                            const result = await liveSession.onToolCall(fc.name, fc.args);
                            sessionPromise?.then(s => s.sendToolResponse({
                                functionResponses: [{ id: fc.id, name: fc.name, response: result }]
                            }));
                        }
                    }
                    
                    const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                    if (audioData) {
                        nextStartTime = Math.max(nextStartTime, outputAudioContext!.currentTime);
                        const buffer = await decodeAudioData(decode(audioData), outputAudioContext!, 24000, 1);
                        const source = outputAudioContext!.createBufferSource();
                        source.buffer = buffer;
                        source.connect(outputAnalyser!);
                        source.addEventListener('ended', () => audioSources.delete(source));
                        source.start(nextStartTime);
                        nextStartTime += buffer.duration;
                        audioSources.add(source);
                    }

                    if (msg.serverContent?.interrupted) {
                        audioSources.forEach(s => s.stop());
                        audioSources.clear();
                        nextStartTime = 0;
                    }
                },
                onerror: (e) => console.error("Live API Error:", e),
                onclose: () => liveSession.disconnect()
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
                systemInstruction: config.systemInstruction,
                tools: config.tools
            }
        });
        return sessionPromise;
    },
    
    getInputFrequencies: () => {
        if (!inputAnalyser) return null;
        const data = new Uint8Array(inputAnalyser.frequencyBinCount);
        inputAnalyser.getByteFrequencyData(data);
        return data;
    },
    
    getOutputFrequencies: () => {
        if (!outputAnalyser) return null;
        const data = new Uint8Array(outputAnalyser.frequencyBinCount);
        outputAnalyser.getByteFrequencyData(data);
        return data;
    }
};
