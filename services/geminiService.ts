
import { GoogleGenAI, Type, Schema, FunctionDeclaration, Blob as GenAIBlob, LiveServerMessage, Modality, GenerateContentResponse, GenerateContentParameters } from "@google/genai";
import { 
    AppMode, FileData, SuggestedAction, AspectRatio, ImageSize, AnalysisResult, 
    ArtifactAnalysis, BookDNA, FactChunk, ScienceHypothesis, KnowledgeNode, 
    UserIntent, SyntheticPersona, SwarmStatus, AtomicTask, SwarmResult, VoteLedger, SearchResultItem,
    ResonancePoint, Colorway, Message, HardwareTier, ComponentRecommendation, EconomicProtocol,
    CompressedAxiom, DigitizationResult, AgentDNA, StoredArtifact, NeuralLattice, ProtocolStepResult
} from '../types';

export type HiveAgent = {
    id: string;
    name: string;
    role: string;
    voice: string;
    systemPrompt: string;
    weights: { logic: number; skepticism: number; creativity: number; empathy: number };
};

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

export const AGENT_DNA_BUILDER: AgentDNA[] = [
    {
        id: 'RIGOR',
        label: 'Rigor Build',
        role: 'SKEPTIC',
        color: '#ef4444',
        description: 'Focuses on finding flaws, edge cases, and logical inconsistencies.'
    },
    {
        id: 'SYNTHESIS',
        label: 'Synthesis Build',
        role: 'VISIONARY',
        color: '#9d4edd',
        description: 'Focuses on creative expansion, pattern recognition, and novel solutions.'
    },
    {
        id: 'UTILITY',
        label: 'Utility Build',
        role: 'PRAGMATIST',
        color: '#22d3ee',
        description: 'Focuses on immediate viability, performance, and physical constraints.'
    }
];

export async function analyzeSchematic(image: FileData): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [image, { text: "Perform a structural analysis of this hardware schematic for Metaventions OS. Identify components, thermal risk zones, and signal paths. Return JSON." }] },
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION,
            responseMimeType: 'application/json'
        }
    });
    return JSON.parse(response.text || "{}");
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
                    properties: { 
                        title: { type: Type.STRING }, 
                        page: { type: Type.NUMBER } 
                    }, 
                    required: ['title', 'page'] 
                } 
            },
            entities: { 
                type: Type.ARRAY, 
                items: { 
                    type: Type.OBJECT, 
                    properties: { 
                        name: { type: Type.STRING }, 
                        type: { type: Type.STRING }, 
                        significance: { type: Type.STRING } 
                    }, 
                    required: ['name', 'type', 'significance'] 
                } 
            },
            logicModel: { type: Type.STRING, description: "Mermaid.js code block representing logic flow." },
            abstract: { type: Type.STRING }
        },
        required: ['toc', 'entities', 'logicModel', 'abstract']
    };

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [file, { text: "Fully digitize and analyze this document. Extract table of contents, named entities, a summary abstract, and generate a Mermaid.js diagram of its internal systems or logic flow. Return JSON." }] },
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json', responseSchema: schema }
    });
    return JSON.parse(response.text || "{}");
}

export async function performSemanticSearch(query: string, artifacts: StoredArtifact[]): Promise<string[]> {
    const ai = getAI();
    const context = artifacts.map(a => ({ id: a.id, name: a.name, summary: a.analysis?.summary || '', tags: a.tags }));
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Identify the top 5 artifact IDs from this list that most closely match the semantic intent of the query: "${query}". Context: ${JSON.stringify(context)}. Return JSON array of strings.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
}

export async function discoverDeepLattice(artifacts: StoredArtifact[]): Promise<NeuralLattice> {
    const ai = getAI();
    const context = artifacts.map(a => ({ id: a.id, name: a.name, type: a.analysis?.classification, summary: a.analysis?.summary }));
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Discover a deep neural lattice of semantic clusters and relational bridges between these artifacts: ${JSON.stringify(context)}. Cluster nodes into groups by topic and define reasoning for bridges. Return JSON adhering to NeuralLattice schema.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{ \"clusters\": [], \"bridges\": [] }");
}

export async function generateVaultInsights(artifacts: StoredArtifact[]): Promise<any[]> {
    const ai = getAI();
    const context = artifacts.map(a => ({ id: a.id, name: a.name, classification: a.analysis?.classification, tags: a.tags, summary: a.analysis?.summary }));
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze these vault artifacts for organizational optimizations: ${JSON.stringify(context)}. Identify duplicates (DEDUPE), tagging opportunities (TAG), semantic links (BRIDGE), or obsolete data (ARCHIVE). Return JSON array of objects: { id, type, message, action, targetIds }.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
}

export async function performCognitiveMaintenance(artifacts: StoredArtifact[]): Promise<any> {
    const ai = getAI();
    const context = artifacts.map(a => ({ id: a.id, name: a.name, summary: a.analysis?.summary }));
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `SCAN DIRECTIVE: Analyze persistent memory vault.
        Context: ${JSON.stringify(context)}
        
        TASK:
        1. Distill 3 "Deep Axioms": High-level universal truths recurring across multiple artifacts.
        2. Identify "Resonance Pairs": Specific artifacts that have hidden logical dependencies.
        3. Calculate "Vault Entropy": Overall clarity vs noise score (0-100).
        
        Return JSON { axioms: [{ statement, reductionFactor, sourceNodes }], resonancePairs: [{ aId, bId, reasoning }], vaultEntropy: number }.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export async function executeVaultDirective(query: string, artifacts: StoredArtifact[]): Promise<any> {
    const ai = getAI();
    const context = artifacts.map(a => ({ id: a.id, name: a.name, tags: a.tags }));
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Translate user directive into a system operation: "${query}". Available Artifacts: ${JSON.stringify(context)}. Operations: BATCH_TAG, ARCHIVE, RENAME. Return JSON { operation, targetIds, parameters: { value } }.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export async function retryGeminiRequest<T>(operation: () => Promise<T>, retries: number = 3, baseDelay: number = 2000): Promise<T> {
    try { return await operation(); } catch (error: any) {
        const status = error.status || error.response?.status || error.statusCode;
        const isRetryable = status === 503 || status === 429 || status === 500;
        if (retries > 0 && isRetryable) { await new Promise(resolve => setTimeout(resolve, baseDelay)); return retryGeminiRequest(operation, retries - 1, baseDelay * 2); }
        throw error;
    }
}

export async function promptSelectKey(): Promise<void> { if (window.aistudio?.openSelectKey) await window.aistudio.openSelectKey(); }

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

export function constructHiveContext(agentId: string, additionalContext: string): string { const agent = HIVE_AGENTS[agentId] || HIVE_AGENTS['Puck']; return `${SYSTEM_COMMANDER_INSTRUCTION}\n\nAGENT_SPEC: ${agent.systemPrompt}\n\nRUNTIME_CONTEXT:\n${additionalContext}`; }

export async function interpretIntent(input: string): Promise<UserIntent> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Interpret intent: "${input}". Return JSON {action, target, reasoning}.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export async function predictNextActions(mode: AppMode, context: any, lastLog?: string): Promise<SuggestedAction[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Predict 3 next actions for mode ${mode}. Context: ${JSON.stringify(context)}. Last Log: ${lastLog}. Return JSON array of SuggestedAction.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
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

export async function researchComponents(query: string): Promise<ComponentRecommendation[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Research component recommendations for query: "${query}". Return JSON array of ComponentRecommendation.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json', tools: [{ googleSearch: {} }] }
    });
    return JSON.parse(response.text || "[]");
}

export async function analyzePowerDynamics(input: string): Promise<AnalysisResult> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Perform a power X-ray analysis for the system/entity: "${input}". 
        Requirement: Provide a comprehensive JSON response adhering to the AnalysisResult schema.
        Ensure 'scores' object is populated with values for centralization, entropy, vitality, opacity, and adaptability (0-100).`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    const raw = response.text || "{}"; let parsed: any; try { parsed = JSON.parse(raw); } catch (e) { parsed = {}; }
    return {
        scores: {
            centralization: parsed.scores?.centralization ?? 50,
            entropy: parsed.scores?.entropy ?? 50,
            vitality: parsed.scores?.vitality ?? 50,
            opacity: parsed.scores?.opacity ?? 50,
            adaptability: parsed.scores?.adaptability ?? 50,
        },
        sustainer: parsed.sustainer || "Awaiting Data",
        extractor: parsed.extractor || "Awaiting Data",
        destroyer: parsed.destroyer || "Awaiting Data",
        vectors: Array.isArray(parsed.vectors) ? parsed.vectors : [],
        insight: parsed.insight || "No strategic insight generated."
    };
}

export async function analyzeBookDNA(file: FileData): Promise<BookDNA> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [file, { text: "Analyze this document and extract its DNA profile: title, author, systemPrompt, axioms, kernelIdentity. Return JSON." }] },
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export async function performGlobalSearch(query: string): Promise<SearchResultItem[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Perform global cross-index search for: "${query}". Return JSON array of SearchResultItem.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json', tools: [{ googleSearch: {} }] }
    });
    return JSON.parse(response.text || "[]");
}

export async function generateAvatar(role: string, name: string): Promise<string> {
    const ai = getAI();
    const prompt = `Hyper-realistic AI agent avatar for role: "${role}", designation: "${name}". Cyber-noir, technical aesthetic.`;
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

export async function executeNeuralPolicy(mode: AppMode, context: any, logs: string[]): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Evaluate system policy for mode ${mode}. Context: ${JSON.stringify(context)}. Logs: ${logs.join('\n')}. Return JSON {level, message, suggestedPatch}.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "null");
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

export async function generateInfrastructureCode(summary: string, provider: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate ${provider} IaC for: "${summary}". Return ONLY code block.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    });
    return (response.text || "").replace(/```[a-z]*\n|```/gi, '').trim();
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
    const directives = [];
    if (hasBasePlate) directives.push("SPATIAL BLUEPRINT: Follow the geometric layout and object placement of the BASE PLATE reference exactly. Do not shift perspectives.");
    if (hasCharacterLock) directives.push("IMMUTABLE IDENTITY: The subject must be an identical match to the CHARACTER LOCK reference. Maintain face structure, clothing details, and unique identifiers without variation.");
    if (hasStyleRef) directives.push("AESTHETIC SYNC: Apply the exact lighting, texture density, and color grading found in the STYLE REFERENCE.");
    const compositeDirective = directives.length > 0 ? `STRICT COMPOSITE PROTOCOL ACTIVE:\n${directives.join('\n')}\nYOUR TASK: Merge these disparate anchors into a single hyper-realistic high-fidelity cinematic frame. DO NOT invent new elements that conflict with the references.` : "Generate a best-in-class cinematic asset.";
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Optimize cinematic prompt. DIRECTIVE: ${compositeDirective} BASE_VISION_COMMAND: "${base}". COLOR_SYSTEM: ${JSON.stringify(color)}. RESONANCE: ${JSON.stringify(ert)}. PRESET: ${preset}. CAMERA: ${cam}. LIGHTING: ${light}. Return ONLY final optimized string that emphasizes structural adherence to refs.`,
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

export async function compileResearchContext(findings: FactChunk[]): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Optimize research findings into a context block:\n${JSON.stringify(findings)}.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    });
    return response.text || "";
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

export async function generateNarrativeContext(prompt: string, analysis: string): Promise<{ narrative: string, resonance: ResonancePoint[] }> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Expand seed: "${prompt}" based on vision analysis: "${analysis}". Return JSON {narrative, resonance}.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{ \"narrative\": \"\", \"resonance\": [] }");
}

export async function decomposeTaskToSubtasks(title: string, description: string): Promise<string[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze objective: "${title}". Context: "${description}". Break this down into 3-6 atomic, actionable sub-tasks. Return ONLY a JSON array of strings.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
}

export async function generateXRayVariant(image: FileData): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [image, { text: "Transform this schematic into a high-contrast X-ray style visualization with glowing traces." }] }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) { if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`; }
    throw new Error("X-Ray generation failed");
}

export async function generateIsometricSchematic(image: FileData): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [image, { text: "Convert this 2D schematic into a hyper-realistic 3D isometric technical illustration." }] }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) { if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`; }
    throw new Error("Isometric generation failed");
}

export async function simulateExperiment(hypothesis: ScienceHypothesis): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Simulate a rigorous scientific experiment testing this hypothesis: "${hypothesis.statement}". Describe methodology, expected results, and potential pitfalls.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    });
    return response.text || "";
}

export async function simulateCodeExecution(code: string, language: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Simulate the execution of this ${language} code and provide the console output. If there are errors, show them clearly.\n\nCode:\n${code}`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    });
    return response.text || "";
}

export async function formatCode(code: string, language: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Reformat this ${language} code for maximum readability and idiomatic style. Return ONLY the formatted code.\n\nCode:\n${code}`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    });
    return (response.text || "").replace(/```[a-z]*\n|```/gi, '').trim();
}

export async function fixCode(code: string, error: string, language: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Fix the following ${language} code which failed with error: "${error}".\n\nCode:\n${code}\n\nReturn ONLY the fixed code block.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    });
    return (response.text || "").replace(/```[a-z]*\n|```/gi, '').trim();
}

export async function applyCodeSuggestion(code: string, suggestion: string, language: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Apply this improvement suggestion to the ${language} code:\nSuggestion: "${suggestion}"\n\nOriginal Code:\n${code}\n\nReturn ONLY the modified code block.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    });
    return (response.text || "").replace(/```[a-z]*\n|```/gi, '').trim();
}

export async function generateTaxonomy(artifacts: any[]): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate a logical taxonomy for these artifacts: ${JSON.stringify(artifacts.map((a: any) => a.name))}. Return JSON structure.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export async function smartOrganizeArtifact(file: { name: string }): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Suggest a storage location (folder) and relevant tags for artifact: "${file.name}". Return JSON {folder, tags}.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{"folder": "unsorted", "tags": []}');
}

export async function synthesizeResearchReport(findings: FactChunk[]): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Synthesize a comprehensive research report from these findings:\n${JSON.stringify(findings)}. Output structured Markdown.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    });
    return response.text || "";
}

export async function generateTheory(hypotheses: ScienceHypothesis[]): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Generate a unified scientific theory based on these hypotheses: ${JSON.stringify(hypotheses)}. Output Markdown.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    });
    return response.text || "";
}

export async function compressKnowledge(nodes: KnowledgeNode[]): Promise<CompressedAxiom[]> {
    const ai = getAI();
    const schema: Schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING },
                statement: { type: Type.STRING },
                reductionFactor: { type: Type.NUMBER },
                sourceNodes: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['id', 'statement', 'reductionFactor', 'sourceNodes']
        }
    };

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Distill these knowledge nodes into a few compressed axioms: ${JSON.stringify(nodes)}. Return JSON array of CompressedAxiom.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json', responseSchema: schema }
    });
    return JSON.parse(response.text || "[]");
}

export async function generateAudioOverview(files: FileData[]): Promise<{ audioData: string, transcript: string }> {
    const ai = getAI();
    const overviewResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [...files, { text: "Provide a 30-second technical audio overview script for these system artifacts. Keep it high-level and professional." }] },
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    });
    const transcript = overviewResponse.text || "Audio overview generation complete.";
    const audioBase64 = await generateSpeech(transcript, 'Kore');
    return { audioData: audioBase64, transcript };
}

export async function generateAutopoieticFramework(context: any): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Design an autopoietic (self-maintaining) framework for this system context: ${JSON.stringify(context)}. Return JSON structure.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export async function calculateEntropy(mapContext: any): Promise<number> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Calculate the system entropy score (0-100) for this topology context: ${JSON.stringify(mapContext)}. Return ONLY the number.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    });
    return parseFloat((response.text || "").trim() || "50");
}

export async function decomposeNode(nodeLabel: string, neighbors: string): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Decompose this system node "${nodeLabel}" (neighbors: ${neighbors}) into its constituent sub-nodes and edges. Return JSON {nodes: [], edges: [], optimizations: []}.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{ \"nodes\": [], \"edges\": [], \"optimizations\": [] }");
}

export async function generateStructuredWorkflow(files: FileData[], governance: string, type: string, context: any): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { parts: [...files, { text: `Generate a structured workflow protocol of type ${type} under ${governance} governance. Map context: ${JSON.stringify(context)}. Return JSON { protocols: [{step, action, description, role, tool, priority, perception_gate, handoff_protocol}], taxonomy: { root: [{folder, subfolders}] } }.` }] },
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export async function calculateOptimalLayout(nodes: any[], edges: any[]): Promise<Record<string, { x: number, y: number }>> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Calculate optimal 2D layout positions (x, y) for the following nodes and edges to minimize crossing and maximize readability. Nodes: ${JSON.stringify(nodes.map(n => ({ id: n.id, label: n.data.label })))}. Edges: ${JSON.stringify(edges.map(e => ({ source: e.source, target: e.target })))}. Return JSON { nodeId: { x, y } }.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
}

export async function generateSwarmArchitecture(prompt: string): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Blueprint a multi-agent swarm architecture for: "${prompt}". Return JSON {nodes: [{id, label, role, modelType, tools, activeState, thinkingBudget, iconName, color}], edges: [{id, source, target, color, variant, handoffCondition}]}.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{ \"nodes\": [], \"edges\": [] }");
}

export async function simulateAgentStep(workflow: any, index: number, history: ProtocolStepResult[]): Promise<ProtocolStepResult> {
    const ai = getAI();
    const step = workflow.protocols[index];
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Execute workflow step: ${JSON.stringify(step)}. Previous results: ${JSON.stringify(history)}. Return JSON { output, agentThought }.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    });
    const data = JSON.parse(response.text || "{}");
    return {
        output: data.output || "Step completed.",
        agentThought: data.agentThought || "No reasoning provided.",
        timestamp: Date.now()
    };
}

class LiveSessionService {
    private session: any = null; private inputAudioCtx: AudioContext | null = null; private outputAudioCtx: AudioContext | null = null; private nextStartTime = 0; private sources = new Set<AudioBufferSourceNode>(); private analyzer: AnalyserNode | null = null; private outputAnalyzer: AnalyserNode | null = null;
    public onCommand: (intent: UserIntent) => void = () => {}; public onToolCall: (name: string, args: any) => Promise<any> = async () => ({});
    public isConnected(): boolean { return !!this.session; }
    public async connect(voiceName: string, options?: { systemInstruction?: string, tools?: any[] }): Promise<void> {
        if (this.session) return; const ai = getAI(); const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        this.inputAudioCtx = new AudioCtx({ sampleRate: 16000 }); this.outputAudioCtx = new AudioCtx({ sampleRate: 24000 });
        this.analyzer = this.inputAudioCtx.createAnalyser(); this.outputAnalyzer = this.outputAudioCtx.createAnalyser();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const researchTool: FunctionDeclaration = { name: 'initiate_background_research', description: 'Trigger an autonomous research task on a specific topic.', parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING, description: "The research topic or question." } }, required: ['query'] } };
        const combinedTools = [...(options?.tools || []), { functionDeclarations: [researchTool] }];
        this.session = await ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => {
                    if (!this.inputAudioCtx) return; const source = this.inputAudioCtx.createMediaStreamSource(stream); const processor = this.inputAudioCtx.createScriptProcessor(4096, 1, 1);
                    processor.onaudioprocess = (e) => {
                        const data = e.inputBuffer.getChannelData(0); const pcm16 = new Int16Array(data.length); for (let i = 0; i < data.length; i++) pcm16[i] = data[i] * 32768;
                        let binary = ''; const bytes = new Uint8Array(pcm16.buffer); for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
                        this.session?.sendRealtimeInput({ media: { data: btoa(binary), mimeType: 'audio/pcm;rate=16000' } });
                    };
                    source.connect(this.analyzer!); this.analyzer!.connect(processor); processor.connect(this.inputAudioCtx.destination);
                },
                onmessage: async (msg: LiveServerMessage) => {
                    if (msg.toolCall) { for (const fc of msg.toolCall.functionCalls) { const result = await this.onToolCall(fc.name, fc.args); this.session?.sendToolResponse({ functionResponses: [{ id: fc.id, name: fc.name, response: result }] }); } }
                    const base64Audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                    if (base64Audio && this.outputAudioCtx) {
                        const binaryString = atob(base64Audio); const bytes = new Uint8Array(binaryString.length); for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
                        const pcm16 = new Int16Array(bytes.buffer); const buffer = this.outputAudioCtx.createBuffer(1, pcm16.length, 24000); const channel = buffer.getChannelData(0); for (let i = 0; i < pcm16.length; i++) channel[i] = pcm16[i] / 32768;
                        const source = this.outputAudioCtx.createBufferSource(); source.buffer = buffer; source.connect(this.outputAnalyzer!); this.outputAnalyzer!.connect(this.outputAudioCtx.destination);
                        this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioCtx.currentTime); source.start(this.nextStartTime); this.nextStartTime += buffer.duration; this.sources.add(source); source.onended = () => this.sources.delete(source);
                    }
                    if (msg.serverContent?.interrupted) { this.sources.forEach(s => { try { s.stop(); } catch(e) {} }); this.sources.clear(); this.nextStartTime = 0; }
                },
                onerror: (e) => console.error("[LiveSession] Error:", e), onclose: () => this.disconnect()
            },
            config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } }, systemInstruction: options?.systemInstruction || SYSTEM_COMMANDER_INSTRUCTION, tools: combinedTools }
        });
    }
    public disconnect() {
        if (!this.session && !this.inputAudioCtx && !this.outputAudioCtx) return;
        if (this.session) { try { this.session.close(); } catch(e) {} this.session = null; }
        this.sources.forEach(s => { try { s.stop(); } catch(e) {} }); this.sources.clear();
        const inCtx = this.inputAudioCtx; this.inputAudioCtx = null; if (inCtx && inCtx.state !== 'closed') { inCtx.close().catch(() => {}); }
        const outCtx = this.outputAudioCtx; this.outputAudioCtx = null; if (outCtx && outCtx.state !== 'closed') { outCtx.close().catch(() => {}); }
        this.nextStartTime = 0;
    }
    public getInputFrequencies(): Uint8Array { if (!this.analyzer) return new Uint8Array(0); const data = new Uint8Array(this.analyzer.frequencyBinCount); this.analyzer.getByteFrequencyData(data); return data; }
    public getOutputFrequencies(): Uint8Array { if (!this.outputAnalyzer) return new Uint8Array(0); const data = new Uint8Array(this.outputAnalyzer.frequencyBinCount); this.analyzer.getByteFrequencyData(data); return data; }
}
export const liveSession = new LiveSessionService();
import { consensusEngine, generateDecompositionMap } from './bicameralService';
