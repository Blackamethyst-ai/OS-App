import { GoogleGenAI, Type, Schema, FunctionDeclaration, Blob as GenAIBlob, LiveServerMessage, Modality, GenerateContentResponse, GenerateContentParameters } from "@google/genai";
import { 
    AppMode, FileData, SuggestedAction, AspectRatio, ImageSize, AnalysisResult, 
    ArtifactAnalysis, BookDNA, FactChunk, ScienceHypothesis, KnowledgeNode, 
    UserIntent, SyntheticPersona, SwarmStatus, AtomicTask, SwarmResult, VoteLedger, SearchResultItem,
    ResonancePoint, Colorway, Message, HardwareTier, ComponentRecommendation, EconomicProtocol,
    CompressedAxiom, DigitizationResult, AgentDNA, StoredArtifact, NeuralLattice, ProtocolStepResult,
    CustomThemeConfig
} from '../types';

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Retries a Gemini request with basic exponential backoff.
 */
export async function retryGeminiRequest<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
        return await fn();
    } catch (err: any) {
        if (retries > 0 && (err.message?.includes('429') || err.message?.includes('500') || err.message?.includes('503'))) {
            await new Promise(resolve => setTimeout(resolve, delay));
            return retryGeminiRequest(fn, retries - 1, delay * 2);
        }
        throw err;
    }
}

/**
 * Converts a standard File object to the GenerativePart format for the SDK.
 */
export async function fileToGenerativePart(file: File): Promise<FileData> {
    const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });

    return {
        inlineData: {
            data: base64Data,
            mimeType: file.type,
        },
        name: file.name
    };
}

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

export const HIVE_AGENTS: Record<string, HiveAgent> = {
    'Puck': { id: 'Puck', name: 'Puck', role: 'Visionary Strategy Architect', voice: 'Puck', systemPrompt: 'You are Puck, focusing on creative synthesis and future horizons.', weights: { logic: 0.6, skepticism: 0.2, creativity: 0.9, empathy: 0.7 } },
    'Charon': { id: 'Charon', name: 'Charon', role: 'Skeptical Systems Analyst', voice: 'Charon', systemPrompt: 'You are Charon, focusing on vulnerability detection and logical rigor.', weights: { logic: 0.9, skepticism: 0.9, creativity: 0.3, empathy: 0.2 } },
    'Fenrir': { id: 'Fenrir', name: 'Fenrir', role: 'Pragmatic Execution Lead', voice: 'Fenrir', systemPrompt: 'You are Fenrir, focusing on structural integrity and performance metrics.', weights: { logic: 0.8, skepticism: 0.5, creativity: 0.4, empathy: 0.4 } },
    'Aris': { id: 'Aris', name: 'Aris', role: 'Chief Scientific Officer', voice: 'Kore', systemPrompt: 'You are Aris, specialized in experimental simulation, hypothesis generation, and rigorous scientific modeling.', weights: { logic: 0.95, skepticism: 0.4, creativity: 0.7, empathy: 0.5 } }
};

export const AGENT_DNA_BUILDER: AgentDNA[] = [
    { id: 'standard', label: 'Standard Build', role: 'Balanced reasoning', color: '#9d4edd', description: 'Default cognitive template.' },
    { id: 'adversarial', label: 'Adversarial Build', role: 'Critical analysis', color: '#ef4444', description: 'Optimized for edge case detection.' },
    { id: 'creative', label: 'Generative Build', role: 'Strategic expansion', color: '#22d3ee', description: 'Optimized for novel synthesis.' }
];

/**
 * Wraps a system instruction with hive agent identity context.
 */
export function constructHiveContext(agentId: string, instruction: string): string {
    const agent = HIVE_AGENTS[agentId] || HIVE_AGENTS['Puck'];
    return `IDENTITY: ${agent.systemPrompt}\n\nCORE_OS_DIRECTIVE: ${instruction}`;
}

/**
 * FEATURE: Grounded Intelligence Search
 */
export async function searchGroundedIntel(query: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: query,
        config: { 
            systemInstruction: "You are a research analyst. Use Google Search to find high-fidelity, real-time technical information. Synthesize a brief report.",
            tools: [{ googleSearch: {} }] 
        }
    });
    return response.text || "No intelligence captured.";
}

// Add analyzePowerDynamics
/**
 * Performs a deep power dynamic analysis using search grounding.
 */
export async function analyzePowerDynamics(target: string, context?: string): Promise<AnalysisResult> {
    const ai = getAI();
    const prompt = `Perform a deep power dynamic analysis for: "${target}". 
    Context from internal sources: ${context || 'None provided'}.
    Include scores for centralization, entropy, vitality, opacity, and adaptability (0-100).
    Identify sustainer, extractor, and destroyer archetypes.
    Identify strategic attack vectors and high-level insights.
    Return JSON in AnalysisResult format.`;
    
    const response = await retryGeminiRequest(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: { 
            responseMimeType: 'application/json',
            tools: [{ googleSearch: {} }]
        }
    }));
    
    const result = JSON.parse(response.text || "{}");
    
    // Extract grounding sources from search chunks
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks) {
        result.groundingSources = groundingChunks
            .filter((chunk: any) => chunk.web)
            .map((chunk: any) => ({
                title: chunk.web.title,
                uri: chunk.web.uri
            }));
    }
    
    return result;
}

/**
 * Performs a global search across system sectors and external grounding.
 */
export async function performGlobalSearch(query: string): Promise<SearchResultItem[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Perform global system search for: "${query}". Return JSON array of SearchResultItem. Categorize items into NAV (for navigation) or DATA (for info).`,
        config: { 
            responseMimeType: 'application/json',
            tools: [{ googleSearch: {} }]
        }
    });
    return JSON.parse(response.text || "[]");
}

export async function generateStructuredWorkflow(files: FileData[], governance: string, type: string, context: any): Promise<any> {
    const ai = getAI();
    let prompt = `Generate a high-fidelity structured workflow protocol of type ${type}. Ensure the output is technical, detailed, and realistic. Return JSON { protocols: [{action, description, role, tool, step, priority}], taxonomy: { root: [{folder, subfolders}] } }.`;
    
    if (type === 'DRIVE_ORGANIZATION') {
        prompt += `
        STRICT REQUIREMENT: Use the PARA Method for the taxonomy:
        - 00_PROJECTS (Active undertakings)
        - 10_AREAS (Ongoing responsibilities)
        - 20_RESOURCES (Reference interests)
        - 30_ARCHIVES (Completed items)
        
        WORKFLOW SPECIFICATIONS:
        - Include file management naming standards: YYYYMMDD_Project_Title_Status.
        - Define metadata tagging logic for automated semantic retrieval.
        - Outline a "Weekly Inbox Triage" protocol (Capture -> Clarify -> Organize -> Review).
        - Ensure protocols focus on deduplication and lifecycle management.
        `;
    } else if (type === 'SYSTEM_ARCHITECTURE') {
        prompt += `
        STRICT REQUIREMENT: Use a tiered service topology for the taxonomy:
        - 01_Edge (Ingress, WAF, Global Load Balancer)
        - 02_Logic (Microservices, Core Business Logic, RPC, API Gateway)
        - 03_Persistence (Relational Databases, Caches, Object Storage, WAL)
        - 04_Observability (Logging, Monitoring, APM, Tracing)
        
        ARCHITECTURE SPECIFICATIONS:
        - Protocols MUST focus on zero-trust handshakes and mTLS between microservices.
        - Include high-availability health check loops and automated failover triggers.
        - Detail a CI/CD "Canary Deployment" protocol with automated rollback logic.
        - Ensure data persistence protocols cover "Eventual Consistency" handling.
        `;
    }

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { parts: [...files, { text: prompt }] },
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export async function interpretIntent(input: string): Promise<UserIntent> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Interpret user intent from this command: "${input}". 
        Categorize into: NAVIGATE, GENERATE_CODE, INITIATE_RESEARCH, FOCUS_ELEMENT, HARDWARE_SEARCH, ANALYZE_POWER, ARTIFACT_TRANSFORM.
        For FOCUS_ELEMENT, extract a probable CSS selector. 
        For NAVIGATE, identify the target Sector.
        Return JSON.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export async function chatWithGemini(message: string, history: Message[] = []): Promise<string> {
    const ai = getAI();
    const chat = ai.chats.create({
        model: 'gemini-3-pro-preview',
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION },
    });
    const response = await chat.sendMessage({ message });
    return response.text || "";
}

export async function fastAIResponse(prompt: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: prompt,
        config: { systemInstruction: "You are a low-latency command parser. Be terse." }
    });
    return response.text || "";
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
                        health: { type: Type.NUMBER },
                        boundingBox: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                        optimization: { type: Type.STRING }
                    },
                    required: ['name', 'type', 'boundingBox']
                }
            }
        },
        required: ['components']
    };

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [image, { text: "Perform structural hardware analysis. Return JSON." }] },
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json', responseSchema: schema }
    });
    return JSON.parse(response.text || "{}");
}

export async function classifyArtifact(file: FileData): Promise<ArtifactAnalysis> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [file, { text: "Classify artifact metadata. Provide classification, ambiguity score, entities, and summary. Return JSON." }] },
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

// Add analyzeBookDNA
/**
 * Extracts the core identity and axioms from a book/document.
 */
export async function analyzeBookDNA(file: FileData): Promise<BookDNA> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [file, { text: "Extract the core DNA of this book: title, author, system prompt for an AI agent representing this book, core axioms, and kernel identity. Return JSON." }] },
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

// Add smartOrganizeArtifact
/**
 * Suggests folder and tags for an artifact.
 */
export async function smartOrganizeArtifact(meta: { name: string }): Promise<{ folder: string, tags: string[] }> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Given a filename "${meta.name}", suggest a logical folder path (PARA method) and relevant tags. Return JSON { folder, tags }.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{"folder": "Inbox", "tags": []}');
}

// Add digitizeDocument
/**
 * Performs deep structural parsing of a document.
 */
export async function digitizeDocument(file: FileData): Promise<DigitizationResult> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [file, { text: "Perform a full structural digitization. Provide a Table of Contents (toc), identified Entities, a Logic Model in Mermaid format, and a concise Abstract. Return JSON." }] },
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

// Add generateMermaidDiagram
/**
 * Generates technical diagrams in Mermaid format.
 */
export async function generateMermaidDiagram(governance: string, files: FileData[], context: any[]): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { 
            parts: [
                ...files, 
                { text: `Governance: ${governance}. Context: ${JSON.stringify(context)}. Generate a technical system diagram in Mermaid format. Return ONLY the Mermaid code block.` }
            ] 
        },
    });
    return (response.text || "").replace(/```mermaid\n|```/gi, '').trim();
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
    for (const part of response.candidates?.[0]?.content?.parts || []) { 
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`; 
    }
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
    for (const part of response.candidates?.[0]?.content?.parts || []) { 
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`; 
    }
    throw new Error("Avatar failed");
}

export async function transformArtifact(content: any, type: 'IMAGE' | 'CODE' | 'TEXT', instruction: string): Promise<any> {
    const ai = getAI();
    let prompt = `Transformation Instruction: ${instruction}\n\n`;
    let model = 'gemini-3-flash-preview';
    let contents: any;
    
    if (type === 'IMAGE') {
        model = 'gemini-2.5-flash-image';
        const base64 = (content as string).split(',')[1];
        contents = { parts: [{ inlineData: { mimeType: 'image/png', data: base64 } }, { text: instruction }] };
    } else {
        prompt += `SOURCE CONTENT:\n${content}`;
        contents = prompt;
    }
    
    const response = await ai.models.generateContent({
        model: model as any,
        contents,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    });
    
    if (type === 'IMAGE') {
        for (const part of response.candidates?.[0]?.content?.parts || []) { 
            if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`; 
        }
        throw new Error("Transform failed");
    }
    return response.text;
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

export async function validateSyntax(code: string, lang: string): Promise<{ line: number, message: string }[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Validate ${lang} syntax. Return JSON array of {line, message}.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
}

export async function generateResearchPlan(query: string): Promise<string[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Create detailed research plan for: "${query}". Return JSON array of sub-queries.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
}

export async function executeResearchQuery(query: string): Promise<FactChunk[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Research: "${query}". Provide verifiable facts with confidence scores. Return JSON array.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json', tools: [{ googleSearch: {} }] }
    });
    return JSON.parse(response.text || "[]");
}

export async function compileResearchContext(findings: FactChunk[]): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Compile following research findings into a cohesive technical context: ${JSON.stringify(findings)}`,
        config: { systemInstruction: "You are a research coordinator. Extract and link primary themes from findings." }
    });
    return response.text || "";
}

export async function synthesizeResearchReport(findings: FactChunk[]): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Generate a comprehensive technical research report based on these findings: ${JSON.stringify(findings)}. Use professional Markdown.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    });
    return response.text || "";
}

export async function analyzeImageVision(image: FileData): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [image, { text: "Extract detailed visual metadata and technical features." }] },
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    });
    return response.text || "";
}

export async function decomposeTaskToSubtasks(title: string, description: string): Promise<string[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Decompose task "${title}": "${description}" into atomic subtasks. Return JSON array.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
}

export async function predictNextActions(mode: AppMode, state: any, lastLog?: string): Promise<SuggestedAction[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Predict next logical actions for mode ${mode}. Last system log: ${lastLog}. Return JSON array.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
}

export async function generateNarrativeContext(prompt: string, visionAnalysis: string): Promise<{ narrative: string, resonance: ResonancePoint[] }> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Synthesize a narrative arc based on prompt "${prompt}" and vision metadata "${visionAnalysis}". Return JSON {narrative, resonance}.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{"narrative": "", "resonance": []}');
}

export async function simulateExperiment(hypothesis: ScienceHypothesis): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Perform high-fidelity scientific simulation for hypothesis: "${hypothesis.statement}".`,
        config: { systemInstruction: "You are CSO Aris. Provide rigorous technical simulations." }
    });
    return response.text || "";
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
        contents: `Crystallize knowledge from nodes: ${JSON.stringify(nodes)}. Output report.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    });
    return response.text || "";
}

export async function synthesizeNodes(a: KnowledgeNode, b: KnowledgeNode): Promise<KnowledgeNode> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Synthesize bridge between "${a.label}" and "${b.label}". Return JSON KnowledgeNode.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export async function generateStoryboardPlan(context: any, count: number): Promise<any[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Create ${count}-frame storyboard plan based on context: ${JSON.stringify(context)}. Return JSON array.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
}

export async function generateXRayVariant(image: FileData): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [image, { text: "Generate X-Ray high-contrast spectral variant." }] }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) { 
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`; 
    }
    throw new Error("X-Ray failed");
}

export async function generateIsometricSchematic(image: FileData): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [image, { text: "Convert to 3D isometric technical illustration." }] }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) { 
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`; 
    }
    throw new Error("Isometric failed");
}

export async function promptSelectKey(): Promise<void> { 
    if (window.aistudio?.openSelectKey) await window.aistudio.openSelectKey(); 
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

export async function generateSpeech(text: string, voiceName: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: { 
            responseModalities: [Modality.AUDIO], 
            speechConfig: { 
                voiceConfig: { 
                    prebuiltVoiceConfig: { voiceName } 
                } 
            } 
        },
    });
    let base64 = undefined;
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            base64 = part.inlineData.data;
            break;
        }
    }
    if (!base64) throw new Error("TTS failed");
    return base64;
}

export async function simulateAgentStep(workflow: any, index: number, history: ProtocolStepResult[]): Promise<ProtocolStepResult> {
    const ai = getAI();
    const step = workflow.protocols[index];
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Execute step ${index}: ${JSON.stringify(step)}. History: ${JSON.stringify(history)}. Return JSON { output, agentThought }.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export async function generateSystemArchitecture(prompt: string): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Blueprint architecture for: "${prompt}". Return JSON {nodes, edges}.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{ \"nodes\": [], \"edges\": [] }");
}

export async function generateSwarmArchitecture(prompt: string): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Forge swarm architecture for: "${prompt}". Return JSON {nodes, edges}.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{ \"nodes\": [], \"edges\": [] }");
}

export async function generateSingleNode(description: string): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Design node for: "${description}". Return JSON {label, subtext, iconName, color, status, description}.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export async function calculateEntropy(nodes: any[], edges: any[]): Promise<number> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Calculate entropy score (0-100) for graph: ${JSON.stringify({nodes, edges})}. Return JSON {score}.`,
        config: { responseMimeType: 'application/json' }
    });
    const result = JSON.parse(response.text || "{\"score\": 0}");
    return result.score;
}

export async function decomposeNode(label: string, neighbors: string): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Decompose node "${label}" with neighbors "${neighbors}". Return JSON {nodes, edges, optimizations}.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{\"nodes\": [], \"edges\": [], \"optimizations\": []}");
}

export async function generateInfrastructureCode(summary: string, provider: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate ${provider} code for: ${summary}.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    });
    return (response.text || "").replace(/```[a-z]*\n|```/gi, '').trim();
}

export async function calculateOptimalLayout(nodes: any[], edges: any[]): Promise<Record<string, { x: number, y: number }>> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Calculate layout for graph: ${JSON.stringify({nodes, edges})}. Return JSON {nodeId: {x, y}}.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export async function compressKnowledge(nodes: KnowledgeNode[]): Promise<CompressedAxiom[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Compress knowledge nodes into axioms: ${JSON.stringify(nodes)}. Return JSON array.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
}

export async function generateVaultInsights(items: StoredArtifact[]): Promise<any[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Analyze vault artifacts for optimizations: ${JSON.stringify(items.map(i => ({id: i.id, name: i.name, summary: i.analysis?.summary})))}. Return JSON array of insights.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
}

export async function executeVaultDirective(directive: string, artifacts: StoredArtifact[]): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Execute vault directive: "${directive}" on artifacts: ${JSON.stringify(artifacts.map(a => ({id: a.id, name: a.name})))}. Return JSON {operation, targetIds, parameters}.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export async function performSemanticSearch(query: string, artifacts: StoredArtifact[]): Promise<string[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Semantic search "${query}" in artifacts: ${JSON.stringify(artifacts.map(a => ({id: a.id, name: a.name, summary: a.analysis?.summary})))}. Return JSON array of matching IDs.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
}

export async function executeNeuralPolicy(mode: AppMode, context: any, logs: string[]): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `System State: Mode=${mode}, Context=${JSON.stringify(context)}, Logs=${JSON.stringify(logs)}. Evaluate and provide guidance. Return JSON {level, message, suggestedPatch: {code, explanation}}.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

/**
 * Compiles a list of findings into a structured technical context.
 */
export async function researchComponents(query: string): Promise<ComponentRecommendation[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Research hardware components for: "${query}". Return JSON array of ComponentRecommendation.`,
        config: { 
            responseMimeType: 'application/json',
            tools: [{ googleSearch: {} }] 
        }
    });
    return JSON.parse(response.text || "[]");
}

/**
 * High-fidelity scientific theory generation.
 */
export async function generateTheory(hypotheses: ScienceHypothesis[]): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Generate a unified scientific theory from these hypotheses: ${JSON.stringify(hypotheses)}`,
        config: { systemInstruction: "You are CSO Aris. Synthesize a complex theoretical model." }
    });
    return response.text || "";
}

/**
 * Generates a standard taxonomy structure.
 */
export async function generateTaxonomy(artifacts: StoredArtifact[]): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Generate a hierarchical taxonomy for these artifacts: ${JSON.stringify(artifacts.map(a => a.name))}. Return JSON root structure.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

/**
 * Discovers complex lattices between artifacts.
 */
export async function discoverDeepLattice(artifacts: StoredArtifact[]): Promise<NeuralLattice> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Discover a deep semantic lattice between these artifacts: ${JSON.stringify(artifacts.map(a => ({id: a.id, summary: a.analysis?.summary})))}. Return JSON NeuralLattice (clusters and bridges).`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

/**
 * Cinematic prompt constructor for image generation.
 */
export async function constructCinematicPrompt(
    prompt: string, 
    colorway: Colorway, 
    hasBase: boolean, 
    hasChars: boolean, 
    hasStyles: boolean,
    ertFrame?: ResonancePoint,
    stylePreset?: string,
    camera?: string,
    lighting?: string
): Promise<string> {
    const ai = getAI();
    const resonanceInfo = ertFrame ? `Emotional Tension: ${ertFrame.tension}%, Visual Dynamics: ${ertFrame.dynamics}%` : '';
    const ctx = `Colorway: ${colorway.label} (${colorway.uiAccentPrimary}, ${colorway.uiAccentSecondary}). Preset: ${stylePreset}. Camera: ${camera}. Lighting: ${lighting}. ${resonanceInfo}`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Given user intent "${prompt}" and cinematic context "${ctx}", construct a high-fidelity, hyper-detailed stable diffusion prompt. Focus on lighting, textures, and sovereign architectural aesthetic. No chat, just prompt.`,
    });
    return response.text || prompt;
}

/**
 * Autopoietic Framework generator.
 */
export async function generateAutopoieticFramework(prompt: string): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Create an autopoietic framework for: "${prompt}". Return JSON with nodes and edges.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

/**
 * Speech transcription.
 */
export async function transcribeAudio(audioBlob: GenAIBlob): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [audioBlob, { text: "Transcribe this audio precisely. Return text only." }] }
    });
    return response.text || "";
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
    primeAudio: async () => {
        if (inputAudioContext && inputAudioContext.state === 'closed') inputAudioContext = null;
        if (outputAudioContext && outputAudioContext.state === 'closed') outputAudioContext = null;
        if (!inputAudioContext) inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        if (!outputAudioContext) outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        if (inputAudioContext.state === 'suspended') await inputAudioContext.resume();
        if (outputAudioContext.state === 'suspended') await outputAudioContext.resume();
    },
    disconnect: () => {
        if (sessionPromise) sessionPromise.then(s => { try { s.close(); } catch(e) {} });
        sessionPromise = null;
        if (inputAudioContext && inputAudioContext.state !== 'closed') { try { inputAudioContext.close(); } catch(e) {} }
        inputAudioContext = null;
        if (outputAudioContext && outputAudioContext.state !== 'closed') { try { outputAudioContext.close(); } catch(e) {} }
        outputAudioContext = null;
        audioSources.forEach(s => { try { s.stop(); } catch(e) {} });
        audioSources.clear();
        nextStartTime = 0;
        inputAnalyser = null;
        outputAnalyser = null;
    },
    connect: async (voiceName: string, config: any) => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        liveSession.disconnect();
        inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        await inputAudioContext.resume();
        await outputAudioContext.resume();
        inputAnalyser = inputAudioContext.createAnalyser();
        outputAnalyser = outputAudioContext.createAnalyser();
        outputAnalyser.connect(outputAudioContext.destination);
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const internalPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => {
                    if (!inputAudioContext || !inputAnalyser) return;
                    const source = inputAudioContext.createMediaStreamSource(stream);
                    const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                    scriptProcessor.onaudioprocess = (e) => {
                        const pcmBlob = createBlob(e.inputBuffer.getChannelData(0));
                        internalPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
                    };
                    source.connect(inputAnalyser);
                    inputAnalyser.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContext.destination);
                    if (config.callbacks?.onopen) config.callbacks.onopen();
                },
                onmessage: async (msg: LiveServerMessage) => {
                    if (msg.toolCall) {
                        for (const fc of msg.toolCall.functionCalls) {
                            const result = await liveSession.onToolCall(fc.name, fc.args);
                            internalPromise.then(s => s.sendToolResponse({ functionResponses: [{ id: fc.id, name: fc.name, response: result }] }));
                        }
                    }
                    let audioData = null;
                    const parts = msg.serverContent?.modelTurn?.parts || [];
                    for (const part of parts) {
                        if (part.inlineData && part.inlineData.mimeType.startsWith('audio/')) {
                            audioData = part.inlineData.data;
                            break;
                        }
                    }
                    if (audioData && outputAudioContext && outputAudioContext.state !== 'closed') {
                        nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
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
                        audioSources.forEach(s => { try { s.stop(); } catch(e) {} }); 
                        audioSources.clear(); 
                        nextStartTime = 0; 
                    }
                    if (config.callbacks?.onmessage) {
                        config.callbacks.onmessage(msg);
                    }
                },
                onerror: (e: any) => {
                    const message = e?.message || (e instanceof ErrorEvent ? e.error?.message : (e?.reason || "Handshake failure"));
                    console.error("Live Core Diagnostic Fail:", message);
                    if (config.callbacks?.onerror) config.callbacks.onerror(new Error(message));
                },
                onclose: (e: CloseEvent) => {
                    liveSession.disconnect();
                    if (config.callbacks?.onclose) config.callbacks.onclose(e);
                }
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
                systemInstruction: config.systemInstruction,
                tools: config.tools,
                outputAudioTranscription: {},
                inputAudioTranscription: {}
            }
        });
        sessionPromise = internalPromise;
        return internalPromise;
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
