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
        Ensure protocols focus on metadata tagging, file naming standards, and lifecycle management.
        `;
    } else if (type === 'SYSTEM_ARCHITECTURE') {
        prompt += `
        STRICT REQUIREMENT: Use a tiered service topology for the taxonomy:
        - 01_Edge (Ingress, WAF, Global Load Balancer)
        - 02_Logic (Microservices, Core Business Logic, RPC)
        - 03_Persistence (Relational Databases, Caches, Object Storage)
        - 04_Observability (Logging, Monitoring, APM)
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
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Research detailed component recommendations for: "${query}". Include manufacturer, part number, technical specs, and approximate current market price. Return JSON array.`,
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, 
            responseMimeType: 'application/json',
            tools: [{ googleSearch: {} }] 
        }
    });
    return JSON.parse(response.text || "[]");
}

export async function classifyArtifact(file: FileData): Promise<ArtifactAnalysis> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [file, { text: "Classify artifact metadata within Metaventions OS context. Provide classification (e.g., HARDWARE, RESEARCH, CODE), ambiguity score (0-100), entities, entropy rating (0-100), and a technical summary. Return JSON." }] },
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION,
            responseMimeType: 'application/json' 
        }
    });
    return JSON.parse(response.text || "{}");
}

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
            logicModel: { type: Type.STRING, description: "Mermaid code block." },
            abstract: { type: Type.STRING }
        },
        required: ['toc', 'entities', 'logicModel', 'abstract']
    };

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { parts: [file, { text: "Fully digitize and analyze this document. Return JSON." }] },
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json', responseSchema: schema }
    });
    return JSON.parse(response.text || "{}");
}

export async function generateIsometricSchematic(image: FileData): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [image, { text: "Convert this flat 2D schematic into a hyper-realistic 3D isometric illustration." }] }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) { if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`; }
    throw new Error("Isometric generation failed");
}

export async function generateXRayVariant(image: FileData): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [image, { text: "Transform into X-ray view with glowing PCB traces." }] }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) { if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`; }
    throw new Error("X-Ray generation failed");
}

export async function promptSelectKey(): Promise<void> { if (window.aistudio?.openSelectKey) await window.aistudio.openSelectKey(); }

export async function retryGeminiRequest<T>(operation: () => Promise<T>, retries: number = 3, baseDelay: number = 2000): Promise<T> {
    try { return await operation(); } catch (error: any) {
        const status = error.status || error.response?.status || error.statusCode;
        if (retries > 0 && (status === 503 || status === 429 || status === 500)) { 
            await new Promise(resolve => setTimeout(resolve, baseDelay)); 
            return retryGeminiRequest(operation, retries - 1, baseDelay * 2); 
        }
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
        contents: `Interpret intent: "${input}". Return JSON.`,
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
        contents: { parts: [...files, { text: `Generate Mermaid diagram code for system topology under ${governance}. Return Mermaid code block.` }] },
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    });
    return (response.text || "").replace(/```mermaid\n|```/gi, '').trim();
}

export async function repairMermaidSyntax(code: string, error: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Fix Mermaid syntax error: "${error}". Original Code:\n${code}. Return fixed code block.`,
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
        contents: `Generate hypotheses from facts: ${facts.join('; ')}. Return JSON array.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
}

export async function crystallizeKnowledge(nodes: KnowledgeNode[]): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Crystallize knowledge report: ${JSON.stringify(nodes)}. Output Markdown.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    });
    return response.text || "";
}

export async function synthesizeNodes(a: KnowledgeNode, b: KnowledgeNode): Promise<KnowledgeNode> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Synthesize a bridge between: "${a.label}" and "${b.label}". Return JSON KnowledgeNode.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export async function generateStoryboardPlan(context: any, count: number): Promise<any[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Create ${count}-frame cinematic storyboard plan. Return JSON array.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
}

export async function constructCinematicPrompt(base: string, color: Colorway, hasBasePlate: boolean, hasCharacterLock: boolean, hasStyleRef: boolean, ert?: ResonancePoint, preset?: string, cam?: string, light?: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Optimize cinematic prompt: "${base}". Color system: ${JSON.stringify(color)}.`,
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
        contents: `Validate ${lang} syntax. Return JSON array of {line, message}.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
}

export async function generateCodeSuggestions(code: string, lang: string): Promise<string[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Suggest code improvements. Return JSON array.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
}

export async function generateResearchPlan(query: string): Promise<string[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Create research plan. Return JSON array.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
}

export async function executeResearchQuery(query: string): Promise<FactChunk[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Research: "${query}". Return JSON array.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json', tools: [{ googleSearch: {} }] }
    });
    return JSON.parse(response.text || "[]");
}

export async function analyzeImageVision(image: FileData): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [image, { text: "Extract metadata." }] },
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    });
    return response.text || "";
}

export async function decomposeTaskToSubtasks(title: string, description: string): Promise<string[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Break task into subtasks. Return JSON array.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
}

export async function generateSwarmArchitecture(prompt: string): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Blueprint swarm: "${prompt}". Return JSON {nodes, edges}.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{ \"nodes\": [], \"edges\": [] }");
}

export async function simulateAgentStep(workflow: any, index: number, history: ProtocolStepResult[]): Promise<ProtocolStepResult> {
    const ai = getAI();
    const step = workflow.protocols[index];
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Execute step: ${JSON.stringify(step)}. Return JSON { output, agentThought }.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    const data = JSON.parse(response.text || "{}");
    return {
        output: data.output || "Step completed.",
        agentThought: data.agentThought || "No thought.",
        timestamp: Date.now()
    };
}

export async function predictNextActions(mode: AppMode, state: any, lastLog?: string): Promise<SuggestedAction[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Predict next actions for ${mode}. Return JSON array.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
}

export async function generateNarrativeContext(prompt: string, visionAnalysis: string): Promise<{ narrative: string, resonance: ResonancePoint[] }> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate narrative for: "${prompt}". Return JSON {narrative, resonance}.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export async function analyzePowerDynamics(input: string, internalContext?: string): Promise<AnalysisResult> {
    const ai = getAI();
    
    let userPrompt = `Perform a deep sovereign diagnostic on the entity/system: "${input}".`;
    
    if (internalContext) {
        userPrompt = `
        INTERNAL_KNOWLEDGE_BASE:
        ${internalContext}

        EXTERNAL_MARKET_DATA:
        Use live Google Search to fetch real-time information for "${input}".

        DIRECTIVE:
        Synthesize the answer by validating the INTERNAL_KNOWLEDGE_BASE against the EXTERNAL_MARKET_DATA. If the user asks about a specific project found in the internal files, prioritize that data for specifications, but use the external search for market sentiment/validation.

        Categorize findings into:
        - SUSTAINER: Positive news, growth, philanthropy, or constructive contributions.
        - EXTRACTOR: Resource usage, core business operations, neutral facts.
        - DESTROYER: Controversy, risk, threats, or destructive elements.
        
        Return the result as a JSON object matching this structure:
        {
          "scores": { "centralization": 0-100, "entropy": 0-100, "vitality": 0-100, "opacity": 0-100, "adaptability": 0-100 },
          "sustainer": "summary text",
          "extractor": "summary text",
          "destroyer": "summary text",
          "vectors": [ { "mechanism": "string", "vulnerability": "string", "severity": "CRITICAL|HIGH|MEDIUM|LOW" } ],
          "insight": "high-level sovereign take"
        }`;
    } else {
        userPrompt += `
        Use real-time search data to categorize findings:
        - SUSTAINER: Positive news, growth, philanthropy, or constructive contributions.
        - EXTRACTOR: Resource usage, core business operations, neutral facts.
        - DESTROYER: Controversy, risk, threats, or destructive elements.
        
        Return the result as a JSON object matching this structure:
        {
          "scores": { "centralization": 0-100, "entropy": 0-100, "vitality": 0-100, "opacity": 0-100, "adaptability": 0-100 },
          "sustainer": "summary text",
          "extractor": "summary text",
          "destroyer": "summary text",
          "vectors": [ { "mechanism": "string", "vulnerability": "string", "severity": "CRITICAL|HIGH|MEDIUM|LOW" } ],
          "insight": "high-level sovereign take"
        }`;
    }

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userPrompt,
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION,
            responseMimeType: 'application/json',
            tools: [{ googleSearch: {} }] 
        }
    });

    const data = JSON.parse(response.text || "{}");
    
    // Extract grounding sources
    const groundingSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.filter((chunk: any) => chunk.web)
        ?.map((chunk: any) => ({
            title: chunk.web.title,
            uri: chunk.web.uri
        }));

    return { ...data, groundingSources };
}

export async function analyzeBookDNA(file: FileData): Promise<BookDNA> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [file, { text: "Extract DNA." }] },
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export async function simulateExperiment(hypothesis: ScienceHypothesis): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Simulate: "${hypothesis.statement}".`,
    });
    return response.text || "";
}

export async function generateTheory(hypotheses: ScienceHypothesis[]): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Synthesize theory: ${JSON.stringify(hypotheses)}.`,
    });
    return response.text || "";
}

export async function compressKnowledge(nodes: KnowledgeNode[]): Promise<CompressedAxiom[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Distill axioms. Return JSON array.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
}

export async function simulateCodeExecution(code: string, lang: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Simulate execution of ${lang}:\n${code}`,
    });
    return response.text || "";
}

export async function formatCode(code: string, lang: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Format ${lang}:\n${code}`,
    });
    return response.text || code;
}

export async function fixCode(code: string, error: string, lang: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Fix error ${error} in ${lang}:\n${code}`,
    });
    return response.text || code;
}

export async function applyCodeSuggestion(code: string, suggestion: string, lang: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Apply ${suggestion} to ${lang}:\n${code}`,
    });
    return response.text || code;
}

export async function performGlobalSearch(query: string): Promise<SearchResultItem[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Search: "${query}". Return JSON array.`,
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
        contents: `Generate taxonomy. Return JSON.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export async function smartOrganizeArtifact(file: { name: string }): Promise<{ folder: string, tags: string[] }> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Organize: "${file.name}". Return JSON {folder, tags}.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export async function performSemanticSearch(query: string, artifacts: StoredArtifact[]): Promise<string[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Semantic search for "${query}". Return JSON array.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
}

export async function discoverDeepLattice(artifacts: StoredArtifact[]): Promise<NeuralLattice> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Discover lattice. Return JSON.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{ \"clusters\": [], \"bridges\": [] }");
}

export async function generateVaultInsights(items: StoredArtifact[]): Promise<any[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Analyze vault. Return JSON array.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
}

export async function executeVaultDirective(directive: string, artifacts: StoredArtifact[]): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Interpret vault directive: "${directive}". Return JSON.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export async function executeNeuralPolicy(mode: AppMode, context: any, logs: string[]): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Evaluate system state. Mode: ${mode}. Return JSON.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export function constructHiveContext(agentId: string, sharedContext: string): string {
    const agent = HIVE_AGENTS[agentId] || HIVE_AGENTS['Puck'];
    return `IDENTITY: ${agent.name}. CONTEXT: ${sharedContext}`;
}

export async function compileResearchContext(findings: FactChunk[]): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Compile research findings.`,
    });
    return response.text || "";
}

export async function synthesizeResearchReport(context: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Synthesize research report.`,
    });
    return response.text || "";
}

export async function generateAudioOverview(files: FileData[]): Promise<{ audioData: string, transcript: string }> {
    const ai = getAI();
    const summaryResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [...files, { text: "Generate briefing summary." }] }
    });
    const summary = summaryResponse.text || "Ready.";
    const audioData = await generateSpeech(summary, 'Zephyr');
    return { audioData, transcript: summary };
}

export async function generateAutopoieticFramework(context: any): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Generate autopoietic protocol. Return JSON.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export async function calculateEntropy(nodes: any[], edges: any[]): Promise<number> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Calculate entropy. Return JSON {score}.`,
        config: { responseMimeType: 'application/json' }
    });
    const result = JSON.parse(response.text || "{\"score\": 0}");
    return result.score;
}

export async function decomposeNode(label: string, neighbors: string): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Decompose node: "${label}". Return JSON.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{\"nodes\": [], \"edges\": [], \"optimizations\": []}");
}

export async function generateInfrastructureCode(summary: string, provider: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate IaC for ${provider}.`,
    });
    return (response.text || "").replace(/```[a-z]*\n|```/gi, '').trim();
}

export async function calculateOptimalLayout(nodes: any[], edges: any[]): Promise<Record<string, { x: number, y: number }>> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Calculate 2D layout. Return JSON.`,
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
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}

function decode(base64: string) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
}

function createBlob(data: Float32Array): GenAIBlob {
    const int16 = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
    return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
}

export const liveSession = {
    onCommand: (intent: UserIntent) => {},
    onToolCall: async (name: string, args: any) => ({}),
    isConnected: () => !!sessionPromise,
    disconnect: () => {
        if (sessionPromise) sessionPromise.then(s => s.close());
        sessionPromise = null;
        if (inputAudioContext) inputAudioContext.close();
        if (outputAudioContext) outputAudioContext.close();
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
                        const pcmBlob = createBlob(e.inputBuffer.getChannelData(0));
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
                            sessionPromise?.then(s => s.sendToolResponse({ functionResponses: [{ id: fc.id, name: fc.name, response: result }] }));
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
                    if (msg.serverContent?.interrupted) { audioSources.forEach(s => s.stop()); audioSources.clear(); nextStartTime = 0; }
                },
                onerror: (e) => console.error("Live Error:", e),
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
