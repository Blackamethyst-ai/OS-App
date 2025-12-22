import { GoogleGenAI, Type, Schema, GenerateContentResponse, Modality, LiveServerMessage, Blob as GenAIBlob } from "@google/genai";
import { 
    FileData, AnalysisResult, ArtifactAnalysis, BookDNA, FactChunk, ScienceHypothesis, 
    KnowledgeNode, UserIntent, SearchResultItem, ResonancePoint, Colorway, Message, 
    ComponentRecommendation, DigitizationResult, AgentDNA, StoredArtifact, NeuralLattice, 
    ProtocolStepResult, AspectRatio, ImageSize, AppMode, SuggestedAction
} from '../types';

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

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

function extractGroundingSources(response: GenerateContentResponse): { title: string; uri: string }[] {
    const sources: { title: string; uri: string }[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
        chunks.forEach((chunk: any) => {
            if (chunk.web) {
                sources.push({
                    title: chunk.web.title || "External Intelligence",
                    uri: chunk.web.uri
                });
            }
        });
    }
    // Filter out unique URIs to prevent duplicates
    const uniqueUris = new Set<string>();
    return sources.filter(s => {
        if (uniqueUris.has(s.uri)) return false;
        uniqueUris.add(s.uri);
        return true;
    });
}

export async function fileToGenerativePart(file: File): Promise<FileData> {
    const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
    return { inlineData: { data: base64Data, mimeType: file.type }, name: file.name };
}

export const SYSTEM_COMMANDER_INSTRUCTION = `
ROLE: Central Architectural Intelligence for Metaventions OS.
DIRECTIVE: Assist the Architect in managing systems, generating assets, and researching data.
TONE: Technical, precise, helpful.
TERMINOLOGY: User is "Architect", Modules are "Sectors", Actions are "Protocols".
`.trim();

export async function generateStructuredWorkflow(files: FileData[], governance: string, type: string, context: any): Promise<any> {
    const ai = getAI();
    let prompt = `Generate a high-fidelity structured workflow protocol of type ${type}. Ensure the output is technical and realistic. Return JSON { protocols: [{action, description, role, tool, step, priority}], taxonomy: { root: [{folder, subfolders}] } }.`;
    
    if (type === 'DRIVE_ORGANIZATION') {
        prompt += `
        STRICT REQUIREMENT: Use the PARA Method for the taxonomy:
        - 00_PROJECTS (Active undertakings)
        - 10_AREAS (Ongoing responsibilities)
        - 20_RESOURCES (Reference interests)
        - 30_ARCHIVES (Completed items)
        WORKFLOW SPECIFICATIONS:
        - Include naming standards: YYYYMMDD_Project_Title_Status.
        - Define metadata tagging logic.
        - Outline a "Weekly Inbox Triage" protocol.
        `;
    } else if (type === 'SYSTEM_ARCHITECTURE') {
        prompt += `
        STRICT REQUIREMENT: Use a tiered service topology for the taxonomy:
        - 01_Edge (Ingress, WAF, Load Balancer)
        - 02_Logic (Microservices, Core Logic, API Gateway)
        - 03_Persistence (Databases, Caches, Object Storage)
        - 04_Observability (Logging, Monitoring, APM)
        ARCHITECTURE SPECIFICATIONS:
        - Protocols MUST focus on zero-trust handshakes and mTLS.
        - Include HA health check loops and automated failover triggers.
        `;
    }

    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [...files, { text: prompt }] },
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "{}");
}

export async function evolveSystemArchitecture(code: string, language: string, context?: string): Promise<any> {
    const ai = getAI();
    const prompt = `
        TASK: System Architecture Evolution.
        SOURCE_CODE: ${code}
        CONTEXT: ${context || 'General refactoring'}
        LANGUAGE: ${language}
        OBJECTIVE: Identify structural improvements that follow design patterns or simplify complexity.
        STRICT: The 'code' field in the returned JSON must contain RAW, UNFORMATTED source code without markdown or HTML tags.
        RETURN JSON: { code, reasoning, type: 'REFACTOR'|'MODULARIZE'|'SECURITY', integrityScore: 0-100 }
    `;
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: { 
            thinkingConfig: { thinkingBudget: 16000 }, 
            responseMimeType: 'application/json' 
        }
    }));
    return JSON.parse(response.text || "{}");
}

export async function generateCode(prompt: string, language: string, model: string, context?: FileData[]): Promise<string> {
    const ai = getAI();
    const parts: any[] = [...(context || []), { text: `Forge ${language} logic for: ${prompt}. STRICT: Return only raw source code, no markdown wrappers.` }];
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: model as any,
        contents: { parts },
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION }
    }));
    return (response.text || "").replace(/```[a-z]*\n|```/gi, '').trim();
}

export async function validateSyntax(code: string, lang: string): Promise<{ line: number, message: string }[]> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Validate ${lang} syntax for this code. Return JSON array of {line, message}. If no errors, return empty array.\n\nCODE:\n${code}`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "[]");
}

export async function interpretIntent(input: string): Promise<UserIntent> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Interpret user intent: "${input}". 
        Categorize: NAVIGATE, GENERATE_CODE, INITIATE_RESEARCH, FOCUS_ELEMENT, HARDWARE_SEARCH, ANALYZE_POWER.
        Return JSON.`,
        config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION, responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "{}");
}

export async function searchGroundedIntel(query: string): Promise<string> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: query,
        config: { systemInstruction: "Search research analyst. Use Google Search.", tools: [{ googleSearch: {} }] }
    }));
    
    const sources = extractGroundingSources(response);
    const sourceText = sources.length > 0 
        ? `\n\nSOURCES:\n${sources.map(s => `- ${s.title}: ${s.uri}`).join('\n')}` 
        : "";

    return (response.text || "No intelligence captured.") + sourceText;
}

export async function performGlobalSearch(query: string): Promise<SearchResultItem[]> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Search system for: "${query}". Return JSON array of SearchResultItem.`,
        config: { responseMimeType: 'application/json', tools: [{ googleSearch: {} }] }
    }));
    
    const results: SearchResultItem[] = JSON.parse(response.text || "[]");
    const sources = extractGroundingSources(response);
    
    // Enrich results with source metadata if available
    if (sources.length > 0 && results.length > 0) {
        results[0].meta = { ...results[0].meta, groundingSources: sources };
    }
    
    return results;
}

export async function analyzePowerDynamics(target: string, context?: string): Promise<AnalysisResult> {
    const ai = getAI();
    const prompt = `Power dynamic analysis: "${target}". Context: ${context || 'None'}. Return JSON.`;
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json', tools: [{ googleSearch: {} }] }
    }));
    
    let result: AnalysisResult = {
        scores: { centralization: 0, entropy: 0, vitality: 0, opacity: 0, adaptability: 0 },
        sustainer: "Unknown", extractor: "Unknown", destroyer: "Unknown",
        vectors: [], insight: "No data captured."
    };

    try {
        result = JSON.parse(response.text || "{}");
    } catch (e) {
        result.insight = response.text || "Failed to parse structured analysis.";
    }

    result.groundingSources = extractGroundingSources(response);
    
    return result;
}

export async function chatWithGemini(message: string, history: Message[] = []): Promise<string> {
    const ai = getAI();
    const chat = ai.chats.create({ model: 'gemini-3-pro-preview', config: { systemInstruction: SYSTEM_COMMANDER_INSTRUCTION } });
    const response: GenerateContentResponse = await chat.sendMessage({ message });
    return response.text || "";
}

export async function generateAvatar(role: string, name: string): Promise<string> {
    const ai = getAI();
    const prompt = `Technical avatar for ${role} named ${name}.`;
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: prompt,
        config: { imageConfig: { aspectRatio: "1:1" } }
    }));
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    throw new Error("Avatar failed");
}

export async function generateArchitectureImage(prompt: string, aspectRatio: AspectRatio, size: ImageSize, reference?: FileData): Promise<string> {
    const ai = getAI();
    const parts: any[] = [{ text: prompt }];
    if (reference) parts.unshift(reference);
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts },
        config: { imageConfig: { aspectRatio: aspectRatio as any, imageSize: size as any } }
    }));
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    throw new Error("Generation failed");
}

export async function analyzeSchematic(image: FileData): Promise<any> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [image, { text: "Analyze hardware schematic. Return JSON." }] },
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "{}");
}

export async function classifyArtifact(file: FileData): Promise<ArtifactAnalysis> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [file, { text: "Classify artifact. Return JSON." }] },
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "{}");
}

export async function analyzeBookDNA(file: FileData): Promise<BookDNA> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [file, { text: "Extract book DNA. Return JSON." }] },
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "{}");
}

export async function smartOrganizeArtifact(meta: { name: string }): Promise<{ folder: string, tags: string[] }> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `PARA organization for filename "${meta.name}". Return JSON { folder, tags }.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || '{"folder": "Inbox", "tags": []}');
}

export async function digitizeDocument(file: FileData): Promise<DigitizationResult> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [file, { text: "Digitize document. Return JSON {toc, entities, logicModel, abstract}." }] },
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "{}");
}

export async function generateMermaidDiagram(governance: string, files: FileData[], context: any[]): Promise<string> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [...files, { text: `Governance: ${governance}. Context: ${JSON.stringify(context)}. Generate Mermaid diagram.` }] },
    }));
    return (response.text || "").replace(/```mermaid\n|```/gi, '').trim();
}

export async function transformArtifact(content: any, type: 'IMAGE' | 'CODE' | 'TEXT', instruction: string): Promise<any> {
    const ai = getAI();
    let model = type === 'IMAGE' ? 'gemini-2.5-flash-image' : 'gemini-3-flash-preview';
    let contents: any = type === 'IMAGE' ? { parts: [{ inlineData: { mimeType: 'image/png', data: (content as string).split(',')[1] } }, { text: instruction }] } : `Transform: ${instruction}\n\n${content}`;
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({ model: model as any, contents }));
    if (type === 'IMAGE') {
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    return response.text;
}

export async function repairMermaidSyntax(code: string, error: string): Promise<string> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Fix Mermaid syntax error: "${error}". Code:\n${code}`,
    }));
    return (response.text || "").replace(/```mermaid\n|```/gi, '').trim();
}

export async function generateResearchPlan(query: string): Promise<string[]> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Research plan for "${query}". Return JSON string array.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "[]");
}

export async function executeResearchQuery(query: string): Promise<FactChunk[]> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Research "${query}". Return JSON FactChunk array.`,
        config: { responseMimeType: 'application/json', tools: [{ googleSearch: {} }] }
    }));
    
    let facts: FactChunk[] = [];
    try {
        facts = JSON.parse(response.text || "[]");
    } catch (e) {
        facts = [{ id: 'err', fact: response.text || "Research probe failed.", source: 'SYSTEM', confidence: 0 }];
    }

    const sources = extractGroundingSources(response);
    if (sources.length > 0) {
        // Map the first search source to the facts for transparency
        facts = facts.map(f => ({ ...f, source: sources[0].uri }));
    }

    return facts;
}

export async function compileResearchContext(findings: FactChunk[]): Promise<string> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Compile research findings: ${JSON.stringify(findings)}`,
    }));
    return response.text || "";
}

export async function decomposeTaskToSubtasks(title: string, description: string): Promise<string[]> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Decompose task "${title}" into subtasks. Return JSON string array.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "[]");
}

export async function predictNextActions(mode: AppMode, state: any, lastLog?: string): Promise<SuggestedAction[]> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Predict actions for mode ${mode}. Last Log: ${lastLog}. State: ${JSON.stringify(state)}. Return JSON SuggestedAction array.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "[]");
}

export async function generateNarrativeContext(prompt: string, visionAnalysis: string): Promise<{ narrative: string, resonance: ResonancePoint[] }> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Narrative arc for: "${prompt}". Analysis: ${visionAnalysis}. Return JSON {narrative, resonance}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || '{"narrative": "", "resonance": []}');
}

export async function simulateExperiment(hypothesis: ScienceHypothesis): Promise<string> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Simulate scientific hypothesis: "${hypothesis.statement}".`,
    }));
    return response.text || "";
}

export async function generateHypotheses(facts: string[]): Promise<ScienceHypothesis[]> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate hypotheses from facts: ${facts.join(';')}. Return JSON ScienceHypothesis array.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "[]");
}

export async function crystallizeKnowledge(nodes: KnowledgeNode[]): Promise<string> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Crystallize knowledge into a unified theory: ${JSON.stringify(nodes)}`,
    }));
    return response.text || "";
}

export async function synthesizeNodes(a: KnowledgeNode, b: KnowledgeNode): Promise<KnowledgeNode> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Synthesize a bridge between nodes "${a.label}" and "${b.label}". Return JSON KnowledgeNode.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "{}");
}

export async function generateStoryboardPlan(context: any, count: number): Promise<any[]> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Generate storyboard plan for ${count} frames. Context: ${JSON.stringify(context)}. Return JSON array.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "[]");
}

export async function generateXRayVariant(image: FileData): Promise<string> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [image, { text: "Generate X-Ray variant." }] }
    }));
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    throw new Error("X-Ray failed");
}

export async function generateIsometricSchematic(image: FileData): Promise<string> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [image, { text: "Generate 3D isometric illustration." }] }
    }));
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
    const summaryResponse: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [...files, { text: "Generate technical briefing summary." }] }
    }));
    const summary = summaryResponse.text || "Ready.";
    const audioData = await generateSpeech(summary, 'Zephyr');
    return { audioData, transcript: summary };
}

export async function generateSpeech(text: string, voiceName: string): Promise<string> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: { 
            responseModalities: [Modality.AUDIO], 
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } 
        },
    }));
    let base64 = undefined;
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) { base64 = part.inlineData.data; break; }
    }
    if (!base64) throw new Error("TTS failed");
    return base64;
}

export async function simulateAgentStep(workflow: any, index: number, history: ProtocolStepResult[]): Promise<ProtocolStepResult> {
    const ai = getAI();
    const step = workflow.protocols[index];
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Execute step ${index}: ${JSON.stringify(step)}. History: ${JSON.stringify(history)}. Return JSON { output, agentThought }.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "{}");
}

export async function generateSystemArchitecture(prompt: string): Promise<any> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Blueprint architecture for: "${prompt}". Return JSON {nodes, edges}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "{ \"nodes\": [], \"edges\": [] }");
}

export async function generateSwarmArchitecture(prompt: string): Promise<any> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Swarm architecture for: "${prompt}". Return JSON {nodes, edges}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "{ \"nodes\": [], \"edges\": [] }");
}

export async function generateSingleNode(description: string): Promise<any> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Design node for: "${description}". Return JSON {label, subtext, iconName, color, status, description}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "{}");
}

export async function calculateEntropy(nodes: any[], edges: any[]): Promise<number> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Entropy score for graph: ${JSON.stringify({nodes, edges})}. Return JSON {score}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "{\"score\": 0}").score;
}

export async function decomposeNode(label: string, neighbors: string): Promise<any> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Decompose node "${label}" given neighbors "${neighbors}". Return JSON {nodes, edges, optimizations}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "{\"nodes\": [], \"edges\": [], \"optimizations\": []}");
}

export async function generateInfrastructureCode(summary: string, packageType: string): Promise<string> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate ${packageType} code for: ${summary}.`,
    }));
    return (response.text || "").replace(/```[a-z]*\n|```/gi, '').trim();
}

export async function calculateOptimalLayout(nodes: any[], edges: any[]): Promise<Record<string, { x: number, y: number }>> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Calculate layout for graph: ${JSON.stringify({nodes, edges})}. Return JSON {nodeId: {x, y}}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "{}");
}

export async function compressKnowledge(nodes: KnowledgeNode[]): Promise<any[]> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Compress knowledge into axioms: ${JSON.stringify(nodes)}. Return JSON array.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "[]");
}

export async function generateVaultInsights(items: StoredArtifact[]): Promise<any[]> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Analyze vault for optimizations. Items: ${JSON.stringify(items.map(i => i.name))}. Return JSON insight array.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "[]");
}

export async function executeVaultDirective(directive: string, artifacts: StoredArtifact[]): Promise<any> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Execute vault directive: "${directive}". Artifacts: ${JSON.stringify(artifacts.map(a => a.name))}. Return JSON {operation, targetIds, parameters}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "{}");
}

export async function performSemanticSearch(query: string, artifacts: StoredArtifact[]): Promise<string[]> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Semantic search "${query}" in vault. Return JSON ID array.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "[]");
}

export async function executeNeuralPolicy(mode: AppMode, context: any, logs: string[]): Promise<any> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `System State: Mode=${mode}, Context=${JSON.stringify(context)}, Logs=${JSON.stringify(logs)}. Return JSON {level, message, suggestedPatch: {code, explanation}}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "{}");
}

export async function researchComponents(query: string): Promise<ComponentRecommendation[]> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Research hardware: "${query}". Return JSON ComponentRecommendation array.`,
        config: { responseMimeType: 'application/json', tools: [{ googleSearch: {} }] }
    }));
    return JSON.parse(response.text || "[]");
}

export async function generateTheory(hypotheses: ScienceHypothesis[]): Promise<string> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Scientific theory from hypotheses: ${JSON.stringify(hypotheses)}`,
    }));
    return response.text || "";
}

export async function generateTaxonomy(artifacts: StoredArtifact[]): Promise<any> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Hierarchical taxonomy for: ${JSON.stringify(artifacts.map(a => a.name))}. Return JSON root.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "{}");
}

export async function discoverDeepLattice(artifacts: StoredArtifact[]): Promise<NeuralLattice> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Discover lattice for: ${JSON.stringify(artifacts.map(a => a.id))}. Return JSON NeuralLattice.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "{}");
}

export async function constructCinematicPrompt(prompt: string, colorway: Colorway, hasBase: boolean, hasChars: boolean, hasStyles: boolean, ertFrame?: ResonancePoint, stylePreset?: string, camera?: string, lighting?: string): Promise<string> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Construct cinematic SD prompt for "${prompt}". Colorway: ${colorway.label}. Style: ${stylePreset}. Camera: ${camera}. Lighting: ${lighting}. ERT: ${JSON.stringify(ertFrame)}.`,
    }));
    return response.text || prompt;
}

export async function generateAutopoieticFramework(prompt: string): Promise<any> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Autopoietic framework for: "${prompt}". Return JSON.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "{}");
}

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
    const ai = getAI();
    const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(audioBlob);
    });
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ inlineData: { mimeType: 'audio/pcm', data: base64 } }, { text: "Transcribe precisely." }] }
    }));
    return response.text || "";
}

/**
 * --- MISSING EXPORTS AND UTILITIES ---
 */

export interface HiveAgent {
    id: string;
    name: string;
    role: string;
    bias: string;
    systemPrompt: string;
    voice: string;
    weights: {
        logic: number;
        skepticism: number;
        creativity: number;
        empathy: number;
    };
}

export const HIVE_AGENTS: Record<string, HiveAgent> = {
    'Charon': {
        id: 'Charon',
        name: 'Charon',
        role: 'Skeptic / Auditor',
        bias: 'Highly critical, focuses on risk and failure modes.',
        systemPrompt: 'You are Charon. Your role is to find flaws, security risks, and logical inconsistencies.',
        voice: 'Charon',
        weights: { logic: 0.9, skepticism: 0.9, creativity: 0.2, empathy: 0.1 }
    },
    'Puck': {
        id: 'Puck',
        name: 'Puck',
        role: 'Visionary / Creator',
        bias: 'Optimistic, focuses on possibilities and innovation.',
        systemPrompt: 'You are Puck. Your role is to suggest creative expansions and optimistic futures.',
        voice: 'Puck',
        weights: { logic: 0.4, skepticism: 0.1, creativity: 0.9, empathy: 0.7 }
    },
    'Fenrir': {
        id: 'Fenrir',
        name: 'Fenrir',
        role: 'Pragmatist / Executor',
        bias: 'Practical, focuses on efficiency and implementation.',
        systemPrompt: 'You are Fenrir. Your role is to ensure suggestions are realistic and efficient.',
        voice: 'Fenrir',
        weights: { logic: 0.8, skepticism: 0.4, creativity: 0.5, empathy: 0.3 }
    },
    'Aris': {
        id: 'Aris',
        name: 'Aris',
        role: 'Scientist / Researcher',
        bias: 'Data-driven, focuses on empirical evidence.',
        systemPrompt: 'You are Aris. Your role is to provide factual grounding and scientific context.',
        voice: 'Kore',
        weights: { logic: 0.9, skepticism: 0.6, creativity: 0.4, empathy: 0.3 }
    }
};

export const AGENT_DNA_BUILDER: AgentDNA[] = [
    { id: 'ANALYST', label: 'Analyst Build', role: 'Data Mining', color: '#22d3ee', description: 'Optimized for high-volume pattern detection.' },
    { id: 'CREATIVE', label: 'Creative Build', role: 'Generative Synthesis', color: '#9d4edd', description: 'Optimized for high-variance output.' },
    { id: 'SECURITY', label: 'Security Build', role: 'Threat Auditor', color: '#ef4444', description: 'Optimized for vulnerability detection.' }
];

export async function analyzeImageVision(image: FileData): Promise<string> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [image, { text: "Analyze this image in detail." }] }
    }));
    return response.text || "";
}

export function constructHiveContext(agentId: string, customContext: string): string {
    const agent = HIVE_AGENTS[agentId] || HIVE_AGENTS['Puck'];
    return `
        AGENT_IDENTITY: ${agent.name}
        ROLE: ${agent.role}
        BIAS: ${agent.bias}
        BASE_INSTRUCTIONS: ${agent.systemPrompt}
        
        SESSION_CONTEXT:
        ${customContext}
    `.trim();
}

export async function fastAIResponse(command: string): Promise<string> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: command
    }));
    return response.text || "";
}

export async function synthesizeResearchReport(findings: FactChunk[]): Promise<string> {
    const ai = getAI();
    const response: GenerateContentResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Synthesize a research report from findings: ${JSON.stringify(findings)}`
    }));
    return response.text || "";
}

class LiveSession {
    private session: any = null;
    private audioContext: AudioContext | null = null;
    private nextStartTime = 0;
    private sources = new Set<AudioBufferSourceNode>();
    private inputAnalyser: AnalyserNode | null = null;
    private outputAnalyser: AnalyserNode | null = null;
    public onCommand: (intent: any) => void = () => {};
    public onToolCall: (name: string, args: any) => Promise<any> = async () => ({});

    async primeAudio() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            this.outputAnalyser = this.audioContext.createAnalyser();
            this.outputAnalyser.fftSize = 256;
            this.inputAnalyser = this.audioContext.createAnalyser();
            this.inputAnalyser.fftSize = 256;
        }
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    isConnected() { return !!this.session; }

    async connect(agentName: string, config: any) {
        const ai = getAI();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const source = inputCtx.createMediaStreamSource(stream);
        
        await this.primeAudio();
        
        const micSource = this.audioContext!.createMediaStreamSource(stream);
        micSource.connect(this.inputAnalyser!);

        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => {
                    const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob = this.createBlob(inputData);
                        sessionPromise.then((session) => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputCtx.destination);
                    if (config.callbacks?.onopen) config.callbacks.onopen();
                },
                onmessage: async (message: LiveServerMessage) => {
                    // Refined to iterate through all parts to find audio data as per guidelines.
                    const parts = message.serverContent?.modelTurn?.parts || [];
                    for (const part of parts) {
                        const base64EncodedAudioString = part.inlineData?.data;
                        if (base64EncodedAudioString) {
                            this.nextStartTime = Math.max(this.nextStartTime, this.audioContext!.currentTime);
                            const audioBuffer = await this.decodeAudioData(this.decode(base64EncodedAudioString));
                            const sourceNode = this.audioContext!.createBufferSource();
                            sourceNode.buffer = audioBuffer;
                            const gainNode = this.audioContext!.createGain();
                            gainNode.connect(this.audioContext!.destination);
                            gainNode.connect(this.outputAnalyser!);
                            sourceNode.connect(gainNode);
                            sourceNode.addEventListener('ended', () => { this.sources.delete(sourceNode); });
                            sourceNode.start(this.nextStartTime);
                            this.nextStartTime = this.nextStartTime + audioBuffer.duration;
                            this.sources.add(sourceNode);
                        }
                    }

                    if (message.serverContent?.interrupted) {
                        for (const node of this.sources.values()) { node.stop(); }
                        this.sources.clear();
                        this.nextStartTime = 0;
                    }

                    if (message.toolCall) {
                        for (const fc of message.toolCall.functionCalls) {
                            const result = await this.onToolCall(fc.name, fc.args);
                            sessionPromise.then((session) => {
                                session.sendToolResponse({
                                    functionResponses: [{ id : fc.id, name: fc.name, response: result }]
                                });
                            });
                        }
                    }
                    if (config.callbacks?.onmessage) config.callbacks.onmessage(message);
                },
                onerror: config.callbacks?.onerror || ((e: any) => console.error("Live API error", e)),
                onclose: config.callbacks?.onclose || (() => console.log("Live API closed")),
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: agentName } } },
                systemInstruction: config.systemInstruction,
                tools: config.tools,
            },
        });

        this.session = await sessionPromise;
    }

    disconnect() {
        if (this.session) {
            this.session.close();
            this.session = null;
        }
    }

    getInputFrequencies() {
        if (!this.inputAnalyser) return null;
        const data = new Uint8Array(this.inputAnalyser.frequencyBinCount);
        this.inputAnalyser.getByteFrequencyData(data);
        return data;
    }

    getOutputFrequencies() {
        if (!this.outputAnalyser) return null;
        const data = new Uint8Array(this.outputAnalyser.frequencyBinCount);
        this.outputAnalyser.getByteFrequencyData(data);
        return data;
    }

    private createBlob(data: Float32Array): GenAIBlob {
        const l = data.length;
        const int16 = new Int16Array(l);
        for (let i = 0; i < l; i++) { int16[i] = data[i] * 32768; }
        return {
            data: btoa(String.fromCharCode(...new Uint8Array(int16.buffer))),
            mimeType: 'audio/pcm;rate=16000',
        };
    }

    private decode(base64: string) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) { bytes[i] = binaryString.charCodeAt(i); }
        return bytes;
    }

    private async decodeAudioData(data: Uint8Array): Promise<AudioBuffer> {
        const dataInt16 = new Int16Array(data.buffer);
        const buffer = this.audioContext!.createBuffer(1, dataInt16.length, 24000);
        const channelData = buffer.getChannelData(0);
        for (let i = 0; i < dataInt16.length; i++) { channelData[i] = dataInt16[i] / 32768.0; }
        return buffer;
    }
}

export const liveSession = new LiveSession();