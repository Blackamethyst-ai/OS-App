import { GoogleGenAI, Type, Schema, FunctionDeclaration, Blob as GenAIBlob, LiveServerMessage, Modality, GenerateContentResponse, GenerateContentParameters } from "@google/genai";
import { 
    AppMode, FileData, SuggestedAction, AspectRatio, ImageSize, AnalysisResult, 
    ArtifactAnalysis, BookDNA, FactChunk, ScienceHypothesis, KnowledgeNode, 
    UserIntent, SyntheticPersona, SwarmStatus, AtomicTask, SwarmResult, VoteLedger, SearchResultItem,
    ResonancePoint, Colorway, Message, HardwareTier, ComponentRecommendation, EconomicProtocol,
    CompressedAxiom, DigitizationResult, AgentDNA
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

// --- NEW: KNOWLEDGE COMPRESSION AGENT ---
export async function compressKnowledge(nodes: KnowledgeNode[]): Promise<CompressedAxiom[]> {
    const ai = getAI();
    const nodeText = nodes.map(n => `[${n.type}] ${n.label}`).join('\n');
    
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

    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `TASK: Lossy Knowledge Compression.\nINPUT: Knowledge Lattice Fragment:\n${nodeText}\nGOAL: Distill these points into high-density "Axioms" that preserve semantic logic while reducing token footprint. Return JSON.`,
        config: { 
            responseMimeType: 'application/json',
            responseSchema: schema
        }
    }));

    return JSON.parse(response.text || "[]");
}

// --- NEW: PDF DIGITIZATION ---
export async function digitizeDocument(file: FileData): Promise<DigitizationResult> {
    const ai = getAI();
    
    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            toc: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, page: { type: Type.NUMBER } } } },
            entities: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, type: { type: Type.STRING }, significance: { type: Type.STRING } } } },
            logicModel: { type: Type.STRING },
            abstract: { type: Type.STRING }
        },
        required: ['toc', 'entities', 'logicModel', 'abstract']
    };

    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-image', // Efficient for document parsing
        contents: {
            parts: [file, { text: "DIGITIZE_PROTOCOL: Perform structural parsing. Extract TOC, key entities with significance, an abstract, and generate a Mermaid.js logic model of the document's core thesis. Output JSON." }]
        },
        config: { 
            responseMimeType: 'application/json',
            responseSchema: schema
        }
    }));

    return JSON.parse(response.text || "{}");
}

// --- AGENT DNA TEMPLATES ---
export const AGENT_DNA_BUILDER: AgentDNA[] = [
    { id: 'adversarial', label: 'Red Team', role: 'SKEPTIC', color: '#ef4444', description: 'Focuses on vulnerability, edge cases, and logical breakage.' },
    { id: 'synthesist', label: 'Neural Web', role: 'VISIONARY', color: '#9d4edd', description: 'Explores creative leaps, pattern bridges, and future horizons.' },
    { id: 'pragmatist', label: 'Steel Bridge', role: 'PRAGMATIST', color: '#22d3ee', description: 'Prioritizes feasibility, cost, and physical implementation.' },
    { id: 'operator', label: 'Root Shell', role: 'OPERATOR', color: '#10b981', description: 'Optimizes for system integration, syntax, and execution flow.' }
];

export async function retryGeminiRequest<T>(
    operation: () => Promise<T>, 
    retries: number = 3, 
    baseDelay: number = 2000
): Promise<T> {
    try {
        return await operation();
    } catch (error: any) {
        const status = error.status || error.response?.status || error.statusCode;
        const isRetryable = status === 503 || status === 429 || status === 500;
        if (retries > 0 && isRetryable) {
            await new Promise(resolve => setTimeout(resolve, baseDelay));
            return retryGeminiRequest(operation, retries - 1, baseDelay * 2); 
        }
        throw error;
    }
}

export async function promptSelectKey(): Promise<void> {
    if (window.aistudio?.openSelectKey) await window.aistudio.openSelectKey();
}

export async function fileToGenerativePart(file: File): Promise<FileData> {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
    return { inlineData: { data: await base64EncodedDataPromise, mimeType: file.type }, name: file.name };
}

export const HIVE_AGENTS: Record<string, HiveAgent> = {
    'Puck': { id: 'Puck', name: 'Puck', role: 'Visionary Strategy Architect', voice: 'Puck', systemPrompt: 'You are Puck, focusing on creative synthesis and future horizons.', weights: { logic: 0.6, skepticism: 0.2, creativity: 0.9, empathy: 0.7 } },
    'Charon': { id: 'Charon', name: 'Charon', role: 'Skeptical Systems Analyst', voice: 'Charon', systemPrompt: 'You are Charon, focusing on vulnerability detection and logical rigor.', weights: { logic: 0.9, skepticism: 0.9, creativity: 0.3, empathy: 0.2 } },
    'Fenrir': { id: 'Fenrir', name: 'Fenrir', role: 'Pragmatic Execution Lead', voice: 'Fenrir', systemPrompt: 'You are Fenrir, focusing on structural integrity and performance metrics.', weights: { logic: 0.8, skepticism: 0.5, creativity: 0.4, empathy: 0.4 } }
};

export function constructHiveContext(agentId: string, additionalContext: string): string {
    const agent = HIVE_AGENTS[agentId] || HIVE_AGENTS['Puck'];
    return `${SYSTEM_COMMANDER_INSTRUCTION}\n\nAGENT_SPEC: ${agent.systemPrompt}\n\nRUNTIME_CONTEXT:\n${additionalContext}`;
}

export async function interpretIntent(input: string): Promise<UserIntent> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Interpret intent: "${input}". Return JSON {action, target, reasoning}.`,
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION,
            responseMimeType: 'application/json' 
        }
    }));
    return JSON.parse(response.text || "{}");
}

export async function predictNextActions(mode: AppMode, context: any, lastLog?: string): Promise<SuggestedAction[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Predict 3 next actions for mode ${mode}. Context: ${JSON.stringify(context)}. Last Log: ${lastLog}. Return JSON array of SuggestedAction.`,
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION,
            responseMimeType: 'application/json' 
        }
    }));
    return JSON.parse(response.text || "[]");
}

export async function generateArchitectureImage(prompt: string, aspectRatio: AspectRatio, size: ImageSize, reference?: FileData): Promise<string> {
    const ai = getAI();
    const parts: any[] = [{ text: prompt }];
    if (reference) parts.unshift(reference);
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts },
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION,
            imageConfig: { aspectRatio, imageSize: size } 
        }
    }));
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    throw new Error("Generation failed");
}

export async function generateStructuredWorkflow(files: FileData[], governance: string, type: string, mapContext?: any): Promise<any> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [...files, { text: `Generate structured workflow for ${type} under ${governance}. Map context: ${JSON.stringify(mapContext)}.` }] },
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION,
            responseMimeType: 'application/json' 
        }
      }));
      return JSON.parse(response.text || "{}");
}

export async function generateCode(prompt: string, language: string, model: string, context?: FileData[]): Promise<string> {
    const ai = getAI();
    const parts: any[] = [...(context || []), { text: `Forge ${language} logic for: ${prompt}` }];
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: model as any,
        contents: { parts },
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    }));
    return response.text?.replace(/```[a-z]*\n|```/gi, '').trim() || "";
}

export async function analyzeSchematic(image: FileData): Promise<any> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [image, { text: "Analyze schematic structure. Return JSON analysis." }] },
        config: { responseMimeType: "application/json" }
    }));
    return JSON.parse(response.text || "{}");
}

export async function researchComponents(query: string): Promise<ComponentRecommendation[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Research component recommendations for query: "${query}". Return JSON array of ComponentRecommendation.`,
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION,
            responseMimeType: 'application/json',
            tools: [{ googleSearch: {} }]
        }
    }));
    return JSON.parse(response.text || "[]");
}

export async function analyzePowerDynamics(input: string): Promise<AnalysisResult> {
    const ai = getAI();
    try {
        const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Perform a comprehensive Power X-Ray diagnostic for target: "${input}".
            
            REQUIRED OUTPUT FORMAT: JSON object strictly adhering to this structure:
            {
                "scores": {
                    "centralization": number (0-100),
                    "entropy": number (0-100),
                    "vitality": number (0-100),
                    "opacity": number (0-100),
                    "adaptability": number (0-100)
                },
                "sustainer": string,
                "extractor": string,
                "destroyer": string,
                "vectors": [{"mechanism": string, "vulnerability": string, "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"}],
                "insight": string
            }`,
            config: { 
                systemInstruction: SYSTEM_COMMANDER_INSTRUCTION,
                responseMimeType: 'application/json'
            }
        }));
        
        const rawText = response.text || "{}";
        let parsed: any;
        try {
            parsed = JSON.parse(rawText);
        } catch (parseError) {
            console.error("JSON Parse Error in analyzePowerDynamics:", parseError, "Raw text:", rawText);
            throw new Error("Invalid analysis payload format.");
        }

        // Return strictly formatted result with deep defaults to prevent 'undefined' crashes
        return {
            scores: {
                centralization: typeof parsed?.scores?.centralization === 'number' ? parsed.scores.centralization : 50,
                entropy: typeof parsed?.scores?.entropy === 'number' ? parsed.scores.entropy : 50,
                vitality: typeof parsed?.scores?.vitality === 'number' ? parsed.scores.vitality : 50,
                opacity: typeof parsed?.scores?.opacity === 'number' ? parsed.scores.opacity : 50,
                adaptability: typeof parsed?.scores?.adaptability === 'number' ? parsed.scores.adaptability : 50,
            },
            sustainer: parsed?.sustainer || "Signal lost",
            extractor: parsed?.extractor || "Signal lost",
            destroyer: parsed?.destroyer || "Signal lost",
            vectors: Array.isArray(parsed?.vectors) ? parsed.vectors.map((v: any) => ({
                mechanism: v.mechanism || "Unknown Mechanism",
                vulnerability: v.vulnerability || "Undetected",
                severity: v.severity || "LOW"
            })) : [],
            insight: parsed?.insight || "Scan depth insufficient for high-fidelity insight."
        };
    } catch (err: any) {
        console.error("Critical Power X-Ray Failure:", err);
        // Return a baseline safe result if everything fails
        return {
            scores: { centralization: 0, entropy: 0, vitality: 0, opacity: 0, adaptability: 0 },
            sustainer: "FAULT_DETECTED",
            extractor: "FAULT_DETECTED",
            destroyer: "FAULT_DETECTED",
            vectors: [],
            insight: "DIAGNOSTIC_FAILURE: " + err.message
        };
    }
}

export async function refractStrategy(metavention: any, prisms: string[]): Promise<any[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Refract this metavention: ${JSON.stringify(metavention)} through these knowledge prisms: ${prisms.join(', ')}. Return JSON array of refraction results.`,
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION,
            responseMimeType: 'application/json'
        }
    }));
    return JSON.parse(response.text || "[]");
}

export async function runStrategicStressTest(metavention: any, matrix: any): Promise<any> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Run a strategic stress test simulation for: ${JSON.stringify(metavention)}. Matrix context: ${JSON.stringify(matrix)}. Return JSON report.`,
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION,
            responseMimeType: 'application/json'
        }
    }));
    return JSON.parse(response.text || "{}");
}

export async function synthesizeEconomicDirective(context: any): Promise<any> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Synthesize economic directive for: ${JSON.stringify(context)}. Return JSON.`,
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION,
            responseMimeType: 'application/json'
        }
    }));
    return JSON.parse(response.text || "{}");
}

export async function analyzeBookDNA(file: FileData): Promise<BookDNA> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [file, { text: "Analyze this document and extract its DNA profile: title, author, systemPrompt, axioms, kernelIdentity. Return JSON." }] },
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION,
            responseMimeType: 'application/json'
        }
    }));
    return JSON.parse(response.text || "{}");
}

export async function performGlobalSearch(query: string): Promise<SearchResultItem[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Perform global cross-index search for: "${query}". Return JSON array of SearchResultItem.`,
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION,
            responseMimeType: 'application/json',
            tools: [{ googleSearch: {} }]
        }
    }));
    return JSON.parse(response.text || "[]");
}

export async function smartOrganizeArtifact(file: FileData): Promise<{ name: string, tags: string[] }> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [file, { text: "Determine optimal name and tags for this artifact. Return JSON {name, tags}." }] },
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION,
            responseMimeType: 'application/json'
        }
    }));
    return JSON.parse(response.text || "{ \"name\": \"unnamed\", \"tags\": [] }");
}

export async function generateTaxonomy(fileNames: string[]): Promise<{ category: string, items: string[] }[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Create logical file taxonomy for these names: ${fileNames.join(', ')}. Return JSON array of {category, items}.`,
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION,
            responseMimeType: 'application/json'
        }
    }));
    return JSON.parse(response.text || "[]");
}

export async function applyWorkflowToArtifacts(files: { id: string, name: string, type: string }[], workflow: any): Promise<any[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Apply workflow ${JSON.stringify(workflow)} to these files: ${JSON.stringify(files)}. Suggest renames and tags. Return JSON.`,
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION,
            responseMimeType: 'application/json'
        }
    }));
    return JSON.parse(response.text || "[]");
}

export async function generateAvatar(role: string, name: string): Promise<string> {
    const ai = getAI();
    const prompt = `Hyper-realistic AI agent avatar for role: "${role}", designation: "${name}". Cyber-noir, technical aesthetic.`;
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: prompt,
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION,
            imageConfig: { aspectRatio: "1:1" }
        }
    }));
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

    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: model as any,
        contents,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    }));

    if (type === 'IMAGE') {
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
        throw new Error("Transform failed");
    }

    return response.text;
}

export async function executeNeuralPolicy(mode: AppMode, context: any, logs: string[]): Promise<any> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Evaluate system policy for mode ${mode}. Context: ${JSON.stringify(context)}. Logs: ${logs.join('\n')}. Return JSON {level, message, suggestedPatch}.`,
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION,
            responseMimeType: 'application/json' 
        }
    }));
    return JSON.parse(response.text || "null");
}

export async function generateMermaidDiagram(governance: string, files: FileData[], context: any[]): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [...files, { text: `Generate Mermaid diagram code for system topology under ${governance}. Map context: ${JSON.stringify(context)}. Return ONLY Mermaid code block.` }] },
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    }));
    return response.text?.replace(/```mermaid\n|```/gi, '').trim() || "";
}

export async function repairMermaidSyntax(code: string, error: string): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Fix Mermaid syntax error: "${error}". Original Code:\n${code}. Return ONLY the fixed code block.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    }));
    return response.text?.replace(/```mermaid\n|```/gi, '').trim() || code;
}

export async function generateAutopoieticFramework(context: any): Promise<any> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Generate autopoietic protocol for context: ${JSON.stringify(context)}. Return JSON.`,
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION,
            responseMimeType: 'application/json' 
        }
    }));
    return JSON.parse(response.text || "{}");
}

export async function generateSystemArchitecture(prompt: string): Promise<any> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Blueprint system architecture for: "${prompt}". Return JSON {nodes, edges}.`,
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION,
            responseMimeType: 'application/json' 
        }
    }));
    return JSON.parse(response.text || "{ \"nodes\": [], \"edges\": [] }");
}

export async function decomposeNode(label: string, neighbors: string): Promise<any> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Decompose node "${label}" with neighbors "${neighbors}" into logical sub-components. Return JSON {nodes, edges, optimizations}.`,
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION,
            responseMimeType: 'application/json' 
        }
    }));
    return JSON.parse(response.text || "{ \"nodes\": [], \"edges\": [], \"optimizations\": [] }");
}

export async function generateSingleNode(description: string): Promise<any> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Design a system node for: "${description}". Return JSON {label, subtext, iconName, color, description}.`,
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION,
            responseMimeType: 'application/json' 
        }
    }));
    return JSON.parse(response.text || "{}");
}

export async function generateInfrastructureCode(summary: string, provider: string): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate ${provider} IaC for: "${summary}". Return ONLY code block.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    }));
    return response.text?.replace(/```[a-z]*\n|```/gi, '').trim() || "";
}

export async function generateHypotheses(facts: string[]): Promise<ScienceHypothesis[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate 3 scientific hypotheses from facts: ${facts.join('; ')}. Return JSON array of ScienceHypothesis.`,
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION,
            responseMimeType: 'application/json' 
        }
    }));
    return JSON.parse(response.text || "[]");
}

export async function simulateExperiment(hypothesis: ScienceHypothesis, background: string): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Simulate experiment for: "${hypothesis.statement}". Background facts:\n${background}. Describe results.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    }));
    return response.text || "Simulation inconclusive.";
}

export async function generateTheory(hypotheses: ScienceHypothesis[]): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Synthesize a unified theory from these hypotheses: ${hypotheses.map(h => h.statement).join('; ')}. Return technical summary.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    }));
    return response.text || "Synthesis failed.";
}

export async function crystallizeKnowledge(nodes: KnowledgeNode[]): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Crystallize unified knowledge report from lattice nodes: ${JSON.stringify(nodes)}. Output Markdown.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    }));
    return response.text || "";
}

export async function synthesizeNodes(a: KnowledgeNode, b: KnowledgeNode): Promise<KnowledgeNode> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Synthesize a bridge concept between: "${a.label}" and "${b.label}". Return JSON KnowledgeNode.`,
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION,
            responseMimeType: 'application/json' 
        }
    }));
    return JSON.parse(response.text || "{}");
}

export async function generateStoryboardPlan(context: any, count: number): Promise<any[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Create ${count}-frame cinematic storyboard plan for: ${JSON.stringify(context)}. Return JSON array of frames.`,
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION,
            responseMimeType: 'application/json' 
        }
    }));
    return JSON.parse(response.text || "[]");
}

export async function constructCinematicPrompt(base: string, color: Colorway, styles: boolean, ert?: ResonancePoint, preset?: string, cam?: string, light?: string): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Optimize cinematic prompt. BASE: "${base}". COLOR: ${JSON.stringify(color)}. ERT: ${JSON.stringify(ert)}. PRESET: ${preset}. CAM: ${cam}. LIGHT: ${light}. Return ONLY final string.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    }));
    return response.text || base;
}

export async function generateAudioOverview(files: FileData[]): Promise<{ audioData: string, transcript: string }> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [...files, { text: "Summarize these artifacts for an audio briefing." }] },
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    }));
    const transcript = response.text || "No data.";
    const audioData = await generateSpeech(transcript, 'Puck');
    return { audioData, transcript };
}

export async function generateSpeech(text: string, voiceName: string): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
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
    }));
    const base64 = response.candidates?.[0]?.content?.parts[0]?.inlineData?.data;
    if (!base64) throw new Error("TTS failed");
    return base64;
}

export async function validateSyntax(code: string, lang: string): Promise<{ line: number, message: string }[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Validate ${lang} syntax for:\n${code}\nReturn JSON array of {line, message} if errors.`,
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION,
            responseMimeType: 'application/json' 
        }
    }));
    return JSON.parse(response.text || "[]");
}

export async function generateCodeSuggestions(code: string, lang: string): Promise<string[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Suggest improvements for this ${lang} code:\n${code}\nReturn JSON array of strings.`,
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION,
            responseMimeType: 'application/json' 
        }
    }));
    return JSON.parse(response.text || "[]");
}

export async function applyCodeSuggestion(code: string, suggestion: string, lang: string): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Apply improvement: "${suggestion}" to this ${lang} code:\n${code}\nReturn ONLY the modified code block.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    }));
    return response.text?.replace(/```[a-z]*\n|```/gi, '').trim() || code;
}

export async function simulateCodeExecution(code: string, lang: string): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Simulate execution of this ${lang} code and provide terminal logs:\n${code}`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    }));
    return response.text || "Execution log empty.";
}

export async function formatCode(code: string, lang: string): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Format this ${lang} code snippet. Return ONLY code block.\n${code}`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    }));
    return response.text?.replace(/```[a-z]*\n|```/gi, '').trim() || code;
}

export async function fixCode(code: string, err: string, lang: string): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Fix this ${lang} code using error: "${err}".\nCODE:\n${code}\nReturn ONLY fixed code block.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    }));
    return response.text?.replace(/```[a-z]*\n|```/gi, '').trim() || code;
}

export async function classifyArtifact(file: FileData): Promise<ArtifactAnalysis> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [file, { text: "Classify artifact metadata. Return JSON ArtifactAnalysis." }] },
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION,
            responseMimeType: 'application/json' 
        }
    }));
    return JSON.parse(response.text || "{}");
}

export async function calculateEntropy(data: any): Promise<number> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Calculate structural entropy (0-100) for data: ${JSON.stringify(data)}. Return ONLY the number.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    }));
    return parseFloat(response.text || "50");
}

export async function generateResearchPlan(query: string): Promise<string[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Create research plan with sub-queries for: "${query}". Return JSON array of strings.`,
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION,
            responseMimeType: 'application/json' 
        }
    }));
    return JSON.parse(response.text || "[]");
}

export async function executeResearchQuery(query: string): Promise<FactChunk[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Research this vector: "${query}". Return JSON array of FactChunk.`,
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION,
            responseMimeType: 'application/json',
            tools: [{ googleSearch: {} }]
        }
    }));
    return JSON.parse(response.text || "[]");
}

export async function compileResearchContext(findings: FactChunk[]): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Optimize research findings into a context block:\n${JSON.stringify(findings)}.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    }));
    return response.text || "";
}

export async function synthesizeResearchReport(query: string, context: string): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Synthesize research report for "${query}" using context:\n${context}. Output Markdown.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    }));
    return response.text || "Report failed.";
}

export async function generateXRayVariant(image: FileData): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [image, { text: "Generate X-Ray style variant of this schematic." }] },
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    }));
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    throw new Error("X-Ray failed");
}

export async function generateIsometricSchematic(image: FileData): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [image, { text: "Generate 3D isometric topology render from this schematic." }] },
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    }));
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    throw new Error("Isometric failed");
}

export async function analyzeImageVision(image: FileData): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [image, { text: "Extract cinematic metadata, lighting, and composition from this source." }] },
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    }));
    return response.text || "";
}

export async function generateNarrativeContext(prompt: string, analysis: string): Promise<{ narrative: string, resonance: ResonancePoint[] }> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Expand seed: "${prompt}" based on vision analysis: "${analysis}". Return JSON {narrative, resonance}.`,
        config: { 
            systemInstruction: SYSTEM_COMMANDER_INSTRUCTION,
            responseMimeType: 'application/json' 
        }
    }));
    return JSON.parse(response.text || "{ \"narrative\": \"\", \"resonance\": [] }");
}

class LiveSessionService {
    private session: any = null;
    private inputAudioCtx: AudioContext | null = null;
    private outputAudioCtx: AudioContext | null = null;
    private nextStartTime = 0;
    private sources = new Set<AudioBufferSourceNode>();
    private analyzer: AnalyserNode | null = null;
    private outputAnalyzer: AnalyserNode | null = null;
    
    public onCommand: (intent: UserIntent) => void = () => {};
    public onToolCall: (name: string, args: any) => Promise<any> = async () => ({});

    public isConnected(): boolean { return !!this.session; }

    public async connect(voiceName: string, options?: { systemInstruction?: string, tools?: any[] }): Promise<void> {
        if (this.session) return;
        
        const ai = getAI();
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        this.inputAudioCtx = new AudioCtx({ sampleRate: 16000 });
        this.outputAudioCtx = new AudioCtx({ sampleRate: 24000 });
        
        this.analyzer = this.inputAudioCtx.createAnalyser();
        this.outputAnalyzer = this.outputAudioCtx.createAnalyser();

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        this.session = await ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => {
                    const source = this.inputAudioCtx!.createMediaStreamSource(stream);
                    const processor = this.inputAudioCtx!.createScriptProcessor(4096, 1, 1);
                    
                    processor.onaudioprocess = (e) => {
                        const data = e.inputBuffer.getChannelData(0);
                        const pcm16 = new Int16Array(data.length);
                        for (let i = 0; i < data.length; i++) pcm16[i] = data[i] * 32768;
                        
                        let binary = '';
                        const bytes = new Uint8Array(pcm16.buffer);
                        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
                        
                        this.session?.sendRealtimeInput({
                            media: {
                                data: btoa(binary),
                                mimeType: 'audio/pcm;rate=16000'
                            }
                        });
                    };

                    source.connect(this.analyzer!);
                    this.analyzer!.connect(processor);
                    processor.connect(this.inputAudioCtx!.destination);
                },
                onmessage: async (msg: LiveServerMessage) => {
                    if (msg.toolCall) {
                        for (const fc of msg.toolCall.functionCalls) {
                            const result = await this.onToolCall(fc.name, fc.args);
                            this.session?.sendToolResponse({
                                functionResponses: [{ id: fc.id, name: fc.name, response: result }]
                            });
                        }
                    }

                    const base64Audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                    if (base64Audio) {
                        const binaryString = atob(base64Audio);
                        const bytes = new Uint8Array(binaryString.length);
                        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
                        
                        const pcm16 = new Int16Array(bytes.buffer);
                        const buffer = this.outputAudioCtx!.createBuffer(1, pcm16.length, 24000);
                        const channel = buffer.getChannelData(0);
                        for (let i = 0; i < pcm16.length; i++) channel[i] = pcm16[i] / 32768;

                        const source = this.outputAudioCtx!.createBufferSource();
                        source.buffer = buffer;
                        source.connect(this.outputAnalyzer!);
                        this.outputAnalyzer!.connect(this.outputAudioCtx!.destination);
                        
                        this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioCtx!.currentTime);
                        source.start(this.nextStartTime);
                        this.nextStartTime += buffer.duration;
                        this.sources.add(source);
                        source.onended = () => this.sources.delete(source);
                    }

                    if (msg.serverContent?.interrupted) {
                        this.sources.forEach(s => s.stop());
                        this.sources.clear();
                        this.nextStartTime = 0;
                    }
                },
                onerror: (e) => console.error("[LiveSession] Error:", e),
                onclose: () => this.disconnect()
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
                systemInstruction: options?.systemInstruction || SYSTEM_COMMANDER_INSTRUCTION,
                tools: options?.tools || []
            }
        });
    }

    public disconnect() {
        this.session?.close();
        this.session = null;
        this.sources.forEach(s => s.stop());
        this.sources.clear();
        this.inputAudioCtx?.close();
        this.outputAudioCtx?.close();
    }

    public getInputFrequencies(): Uint8Array {
        if (!this.analyzer) return new Uint8Array(0);
        const data = new Uint8Array(this.analyzer.frequencyBinCount);
        this.analyzer.getByteFrequencyData(data);
        return data;
    }

    public getOutputFrequencies(): Uint8Array {
        if (!this.outputAnalyzer) return new Uint8Array(0);
        const data = new Uint8Array(this.outputAnalyzer.frequencyBinCount);
        this.analyzer.getByteFrequencyData(data);
        return data;
    }
}

export const liveSession = new LiveSessionService();

import { consensusEngine, generateDecompositionMap } from './bicameralService';
