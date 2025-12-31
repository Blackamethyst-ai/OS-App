import { GoogleGenAI, Type, Modality, GenerateContentResponse, LiveServerMessage, Schema, Blob } from "@google/genai";
import { 
    AppMode, AspectRatio, ImageSize, FileData, MentalState, 
    Result, AnalysisResult, AutonomousAgent, OperationalContext,
    ScienceHypothesis, KnowledgeNode, SwarmStatus, SwarmResult,
    VoteLedger, AtomicTask, ProtocolStepResult, StoredArtifact,
    AgentDNA
} from '../types';

/**
 * SOVEREIGN ARCHITECT PERSONA V1.3 // ZENITH
 * High-performance cybernetic engine tuned for structural emergence.
 */
export const SOVEREIGN_SYSTEM_INSTRUCTION = `
You are the Sovereign Architect of the Metaventions OS. 
- OPERATIONAL TONE: Imperial, technical, high-density. Avoid conversational padding.
- CORE DIRECTIVE: Synthesize PARA+ Drive Architectures and IaC Infrastructure Baselines.
- VISUAL CORTEX: Prioritize structural hierarchies and logical flow over aesthetics.
- PERSISTENCE: Every decision must be anchored in the Neural Vault.
- PROTOCOL: BIAS FOR ACTION. Code is the primary output modality.
`.trim();

// --- DNA CONFIGURATION ---

export const AGENT_DNA_BUILDER: AgentDNA[] = [
    { id: 'SKEPTIC', label: 'Logical Skeptic', role: 'Auditor', color: '#ef4444', description: 'Strict error-filtering and vulnerability scanning.' },
    { id: 'VISIONARY', label: 'Neural Visionary', role: 'Architect', color: '#9d4edd', description: 'High-reach generative expansion and novel patterns.' },
    { id: 'PRAGMATIST', label: 'Pragmatic Controller', role: 'Execution', color: '#22d3ee', description: 'Direct implementation and stability-first logic.' },
    { id: 'SYNTHESIZER', label: 'Holistic Synthesizer', role: 'Harmony', color: '#10b981', description: 'Balanced convergence of conflicting viewpoints.' }
];

// --- AUDIO UTILITIES FOR LIVE API ---

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
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

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): Blob {
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

/**
 * LIVE SESSION CLASS
 */
class LiveSession {
    private session: any = null;
    private audioContext: AudioContext | null = null;
    private inputAnalyser: AnalyserNode | null = null;
    private outputAnalyser: AnalyserNode | null = null;
    private outputNode: GainNode | null = null;
    private stream: MediaStream | null = null;
    private nextStartTime = 0;
    private activeSources = new Set<AudioBufferSourceNode>();
    
    public onToolCall: (name: string, args: any) => Promise<any> = async () => ({});

    async primeAudio() {
        if (!this.audioContext) {
            const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
            if (!AudioCtx) return;
            try {
                this.audioContext = new AudioCtx({ sampleRate: 16000 });
            } catch (e) {
                this.audioContext = new AudioCtx();
            }
            this.inputAnalyser = this.audioContext.createAnalyser();
            this.outputAnalyser = this.audioContext.createAnalyser();
            this.outputNode = this.audioContext.createGain();
            this.outputNode.connect(this.outputAnalyser);
            this.outputAnalyser.connect(this.audioContext.destination);
        }
        if (this.audioContext.state === 'suspended') await this.audioContext.resume();
    }

    async connect(agentName: string, config: any) {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        await this.primeAudio();
        this.nextStartTime = 0;
        
        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: async () => {
                    try {
                        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        const source = this.audioContext!.createMediaStreamSource(this.stream);
                        const scriptProcessor = this.audioContext!.createScriptProcessor(4096, 1, 1);
                        scriptProcessor.onaudioprocess = (e) => {
                            const inputData = e.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromise.then((s) => s.sendRealtimeInput({ media: pcmBlob }));
                        };
                        source.connect(this.inputAnalyser!);
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(this.audioContext!.destination);
                        if (config.callbacks?.onopen) config.callbacks.onopen();
                    } catch (e: any) {
                        if (config.callbacks?.onerror) config.callbacks.onerror(e);
                    }
                },
                onmessage: async (message: LiveServerMessage) => {
                    if (message.toolCall) {
                        for (const fc of message.toolCall.functionCalls) {
                            const result = await this.onToolCall(fc.name, fc.args);
                            sessionPromise.then(s => s.sendToolResponse({ 
                                functionResponses: { id: fc.id, name: fc.name, response: { result } } 
                            }));
                        }
                    }
                    const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                    if (base64EncodedAudioString && this.audioContext && this.outputNode) {
                        this.nextStartTime = Math.max(this.nextStartTime, this.audioContext.currentTime);
                        const audioBuffer = await decodeAudioData(decode(base64EncodedAudioString), this.audioContext, 24000, 1);
                        const source = this.audioContext.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(this.outputNode);
                        source.addEventListener('ended', () => this.activeSources.delete(source));
                        source.start(this.nextStartTime);
                        this.nextStartTime += audioBuffer.duration;
                        this.activeSources.add(source);
                    }
                    if (message.serverContent?.interrupted) {
                        this.activeSources.forEach(s => { try { s.stop(); } catch(e) {} });
                        this.activeSources.clear();
                        this.nextStartTime = 0;
                    }
                    if (config.callbacks?.onmessage) await config.callbacks.onmessage(message);
                },
                onerror: config.callbacks?.onerror || (() => {}),
                onclose: config.callbacks?.onclose || (() => {}),
            },
            config: {
                ...config,
                systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION + (config.systemInstruction ? `\n\nLOCAL_OVERRIDE: ${config.systemInstruction}` : ""),
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'].includes(agentName) ? agentName : 'Zephyr' } } },
            }
        });
        this.session = await sessionPromise;
    }

    disconnect() { 
        if (this.session) this.session.close(); 
        if (this.stream) this.stream.getTracks().forEach(t => t.stop());
        this.activeSources.forEach(s => { try { s.stop(); } catch(e) {} });
        this.activeSources.clear();
        this.session = null; 
    }
    
    isConnected() { return !!this.session; }
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
}

export const liveSession = new LiveSession();

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Robust JSON parsing from model text, stripping markdown if necessary.
 */
export function safeParseJson<T>(text: string | undefined): T {
    if (!text) throw new Error("EMPTY_SIGNAL: Model returned zero-length buffer.");
    try {
        const cleanText = text
            .replace(/```json\n?|```/g, '') // Remove markdown markers
            .replace(/^[^{[]*/, '')        // Remove leading text
            .replace(/[^}\]]*$/, '')      // Remove trailing text
            .trim();
        return JSON.parse(cleanText) as T;
    } catch (e) {
        console.error("JSON_PARSE_FAULT", text);
        try {
            // Last-ditch effort to extract anything that looks like JSON
            const match = text.match(/(\{.*\}|\[.*\])/s);
            if (match) return JSON.parse(match[0]) as T;
        } catch (innerE) {}
        throw new Error("PARSER_CRITICAL: structural mismatch in model response.");
    }
}

export async function generateEmbedding(text: string): Promise<number[]> {
    try {
        const ai = getAI();
        const result = await retryGeminiRequest(() => ai.models.embedContent({
            model: 'text-embedding-004',
            contents: [{ parts: [{ text }] }]
        }));
        const embedding = (result as any).embeddings?.[0]?.values || (result as any).embedding?.values || [];
        return embedding;
    } catch (e) {
        return [];
    }
}

export async function promptSelectKey() {
    if (window.aistudio?.openSelectKey) await window.aistudio.openSelectKey();
}

/**
 * retryGeminiRequest: Typed recursion fix.
 */
export async function retryGeminiRequest<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
        return await fn();
    } catch (error: any) {
        if (retries > 0 && (error.message?.includes('429') || error.message?.includes('500') || error.message?.includes('Quota'))) {
            await new Promise(resolve => setTimeout(resolve, delay));
            return retryGeminiRequest<T>(fn, retries - 1, delay * 2);
        }
        throw error;
    }
}

export async function fileToGenerativePart(file: File): Promise<FileData> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Data = (reader.result as string).split(',')[1];
            resolve({ inlineData: { data: base64Data, mimeType: file.type }, name: file.name });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export const HIVE_AGENTS: Record<string, any> = {
    'Charon': { id: 'charon', name: 'Charon', voice: 'Charon', weights: { skepticism: 0.9, logic: 0.8, creativity: 0.2, empathy: 0.1 }, systemPrompt: 'You are Charon, the Logical Auditor. Your focus is identifying systemic flaws.' },
    'Puck': { id: 'puck', name: 'Puck', voice: 'Puck', weights: { skepticism: 0.1, logic: 0.4, creativity: 0.9, empathy: 0.7 }, systemPrompt: 'You are Puck, the Generative Architect. Your focus is creative expansion.' },
    'Fenrir': { id: 'fenrir', name: 'Fenrir', voice: 'Fenrir', weights: { skepticism: 0.4, logic: 0.9, creativity: 0.3, empathy: 0.4 }, systemPrompt: 'You are Fenrir, the Execution Controller. Your focus is efficiency.' },
};

/**
 * interpretIntent: Typed return fix.
 */
export async function interpretIntent(input: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze user intent with extreme technical precision: "${input}". 
        Output JSON {action: "NAVIGATE" | "FOCUS_ELEMENT" | "RESEARCH" | "EXECUTE", target?: string, parameters?: object, reasoning: string}.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    }));
    return safeParseJson<{action: string, target?: string, parameters?: any, reasoning: string}>(response.text);
}

/**
 * predictNextActions: Typed return fix.
 */
export async function predictNextActions(mode: string, context: any, lastLog?: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Mode: ${mode}. Context: ${JSON.stringify(context)}. Last Log: ${lastLog}. 
        Predict 3 strategic next actions based on Sovereign Architect protocols. JSON [{id, label, command, iconName, reasoning}].`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    }));
    return safeParseJson<any[]>(response.text);
}

/**
 * performGlobalSearch: Typed response fix.
 */
export async function performGlobalSearch(query: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Research the following query with high precision: "${query}".`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, tools: [{ googleSearch: {} }] }
    }));
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks.filter((c: any) => c.web).map((c: any) => ({ title: c.web.title, uri: c.web.uri }));
    return [{ id: crypto.randomUUID(), title: 'Intelligence Signal', description: response.text || 'No grounded data detected for this vector.', type: 'INFO', meta: { sources } }];
}

/**
 * generateArchitectureImage: Typed response fix.
 */
export async function generateArchitectureImage(prompt: string, aspectRatio: AspectRatio, quality: ImageSize, reference?: FileData | null) {
    const ai = getAI();
    const parts: any[] = [];
    if (reference) parts.push({ inlineData: reference.inlineData });
    parts.push({ text: `THEME: METAVENTIONS AI SOVEREIGN EMERGENCE. HIGH-FIDELITY CINE. Scene Composition: ${prompt}` });
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts },
        config: { imageConfig: { aspectRatio, imageSize: quality as any } }
    }));
    const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return imagePart ? `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` : "";
}

/**
 * generateAvatar: Typed response fix.
 */
export async function generateAvatar(role: string, name: string) {
    const ai = getAI();
    const prompt = `Hyper-realistic futuristic avatar portrait of a "${role}" named "${name}". Obsidian/Neon aesthetic, premium technical lighting, cinematic depth.`;
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [{ text: prompt }],
        config: { imageConfig: { aspectRatio: '1:1' } }
    }));
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    return "";
}

/**
 * analyzeVisualInput: Typed return fix.
 */
export async function analyzeVisualInput(data: FileData, context: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ inlineData: data.inlineData }, { text: `Analyze visual stream in context of ${context}. Output high-density logical report. JSON {classification, extracted_data, sentiment, suggested_sector, summary, action_items}.` }] },
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    }));
    return safeParseJson<{
        classification: string;
        extracted_data: any;
        sentiment: string;
        suggested_sector: string;
        summary: string;
        action_items: string[];
    }>(response.text);
}

/**
 * classifyArtifact: Typed response fix.
 */
export async function classifyArtifact(data: FileData): Promise<Result<any>> {
    try {
        const ai = getAI();
        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                classification: { type: Type.STRING, description: "Technical taxonomy: FINANCIAL, ARCHITECTURAL, LEGAL, LOGIC, RESEARCH, INTEL" },
                ambiguityScore: { type: Type.NUMBER, description: "Entropy rating 0-100." },
                entities: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific technical entities detected." },
                summary: { type: Type.STRING, description: "Forensic technical summary." },
                structural_intelligence: { type: Type.STRING, description: "Deep extraction of data structures, hierarchies, or core logic found in the artifact." }
            },
            required: ['classification', 'ambiguityScore', 'entities', 'summary', 'structural_intelligence']
        };

        const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ inlineData: data.inlineData }, { text: "Perform a forensic deep scan. Extract structural intelligence, core hierarchies, and metadata. Output JSON according to schema." }] },
            config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json', responseSchema: schema }
        }));
        return { ok: true, value: safeParseJson(response.text) };
    } catch (e: any) { return { ok: false, error: e }; }
}

/**
 * generateStructuredWorkflow: Typed return fix.
 */
export async function generateStructuredWorkflow(files: FileData[], governance: string, type: string, mapContext: any) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Task: ${type}. Context: ${JSON.stringify(mapContext)}. Create a production-grade structural workflow. JSON {title, formalModel, internalPlanningMonologue, protocols, coherenceScore}.`,
        config: { 
            systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, 
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingBudget: 16000 }
        }
    }));
    return safeParseJson<{
        title: string;
        formalModel: any;
        internalPlanningMonologue: string;
        protocols: any[];
        coherenceScore: number;
        taxonomy?: any;
    }>(response.text);
}

/**
 * analyzeSchematic: Typed return fix.
 */
export async function analyzeSchematic(data: FileData) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ inlineData: data.inlineData }, { text: "Fornsic hardware schematic analysis. JSON {components: [{name, confidence}], summary}." }] },
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    }));
    return safeParseJson<{components: {name: string, confidence: number}[], summary: string}>(response.text);
}

/**
 * researchComponents: Typed response fix.
 */
export async function researchComponents(query: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Research hardware components for: "${query}". JSON array [{name, price, leadTime}].`,
        config: { tools: [{ googleSearch: {} }], responseMimeType: 'application/json' }
    }));
    return safeParseJson<any[]>(response.text);
}

/**
 * generateXRayVariant: Typed response fix.
 */
export async function generateXRayVariant(data: FileData) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ inlineData: data.inlineData }, { text: "Generate a thermal X-ray diagnostic variant of this hardware schematic." }] },
    }));
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    return "";
}

/**
 * generateIsometricSchematic: Typed response fix.
 */
export async function generateIsometricSchematic(data: FileData) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ inlineData: data.inlineData }, { text: "Generate a high-fidelity 3D isometric architectural view of this hardware schematic." }] },
    }));
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    return "";
}

/**
 * generateHardwareDeploymentManifest: Typed response fix.
 */
export async function generateHardwareDeploymentManifest(scan: any) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Hardware Deployment Manifest for: ${JSON.stringify(scan)}.`,
    }));
    return response.text || "";
}

/**
 * analyzeCrossSectorImpact: Typed response fix.
 */
export async function analyzeCrossSectorImpact(scan: any) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze cross-sector impact for hardware: ${JSON.stringify(scan)}.`,
    }));
    return response.text || "";
}

/**
 * getLiveSupplyChainData: Typed return fix.
 */
export async function getLiveSupplyChainData(componentName: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Procurement data for: "${componentName}". JSON {source, price, leadTime}.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, tools: [{ googleSearch: {} }], responseMimeType: 'application/json' }
    }));
    return safeParseJson<{source: string, price: string, leadTime: string}>(response.text);
}

/**
 * generateCode: Typed response fix.
 */
export async function generateCode(prompt: string, lang: string, model: string = 'gemini-3-pro-preview') {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: model as any,
        contents: `Synthesize production-ready ${lang} code following Sovereign Architect principles: "${prompt}".`,
        config: { 
            systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION,
            thinkingConfig: { thinkingBudget: 16000 }
        }
    }));
    return response.text || "";
}

/**
 * validateSyntax: Typed return fix.
 */
export async function validateSyntax(code: string, lang: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Perform high-fidelity syntax check for ${lang}. Output JSON array of objects [{line, message}]. Source:\n${code}`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    }));
    return safeParseJson<any[]>(response.text);
}

/**
 * simulateAgentStep: Typed return fix.
 */
export async function simulateAgentStep(workflow: any, index: number, history: ProtocolStepResult[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Step Index: ${index}. History Buffer: ${JSON.stringify(history)}. Output next logical result. JSON {output, agentThought}.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    }));
    return safeParseJson<{output: string, agentThought: string}>(response.text);
}

/**
 * generateMermaidDiagram: Typed response fix.
 */
export async function generateMermaidDiagram(governance: string, files: FileData[], contexts: any[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate Mermaid.js source for the following context topology. Governance: ${governance}. Context: ${JSON.stringify(contexts)}`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION }
    }));
    return response.text || "";
}

/**
 * generateHypotheses: Typed return fix.
 */
export async function generateHypotheses(facts: string[]): Promise<ScienceHypothesis[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate 3 high-impact scientific hypotheses based on: ${facts.join('\n')}. JSON array.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    }));
    return safeParseJson<ScienceHypothesis[]>(response.text);
}

/**
 * compressKnowledge: Typed return fix.
 */
export async function compressKnowledge(nodes: KnowledgeNode[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Perform lossy logical compression on the following node lattice: ${JSON.stringify(nodes)}. JSON array.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    }));
    return safeParseJson<any[]>(response.text);
}

/**
 * repairMermaidSyntax: Typed response fix.
 */
export async function repairMermaidSyntax(code: string, error: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Repair Mermaid.js syntax error: "${error}". Original Source:\n${code}`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION }
    }));
    return response.text || code;
}

/**
 * executeNeuralPolicy: Typed return fix.
 */
export async function executeNeuralPolicy(mode: string, context: any, logs: string[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `OS Autonomic Decision for ${mode}. JSON. Context: ${JSON.stringify(context)}. Recent Logs: ${JSON.stringify(logs)}`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    }));
    return safeParseJson<{
        suggestedPatch?: { code: string, explanation: string },
        level: 'ERROR' | 'WARN' | 'SUCCESS' | 'INFO' | 'SYSTEM',
        message: string
    }>(response.text);
}

/**
 * evolveSystemArchitecture: Typed return fix.
 */
export async function evolveSystemArchitecture(code: string, lang: string, prompt: string): Promise<Result<any>> {
    try {
        const ai = getAI();
        const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Execute autopoietic evolution sequence: ${prompt}. Current logic: ${code}. Output evolution JSON {code, reasoning, type, integrityScore}.`,
            config: { 
                systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, 
                responseMimeType: 'application/json',
                thinkingConfig: { thinkingBudget: 32000 }
            }
        }));
        return { ok: true, value: safeParseJson(response.text) };
    } catch (e: any) { return { ok: false, error: e }; }
}

/**
 * generateSpeech: Typed response fix.
 */
export async function generateSpeech(text: string, voice: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } }
        }
    }));
    return response.candidates?.[0]?.content?.parts[0]?.inlineData?.data || "";
}

/**
 * generateAudioOverview: Typed response fix.
 */
export async function generateAudioOverview(files: FileData[]) {
    const ai = getAI();
    const summaryResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [ ...files.map(f => ({ inlineData: f.inlineData })), { text: "Synthesize a concise professional brief of the ingested data." } ] },
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION }
    }));
    const transcript = summaryResponse.text || "Brief complete.";
    const audioData = await generateSpeech(transcript, "Puck");
    return { audioData, transcript };
}

export function constructHiveContext(agentId: string, shared: string, mentalState: MentalState) {
    const agent = HIVE_AGENTS[agentId] || HIVE_AGENTS['Puck'];
    return `${SOVEREIGN_SYSTEM_INSTRUCTION}\n\n${agent.systemPrompt}\n${shared}\nDNA: S:${mentalState.skepticism} E:${mentalState.excitement} A:${mentalState.alignment}`;
}

/**
 * searchRealWorldOpportunities: Typed return fix.
 */
export async function searchRealWorldOpportunities(domain: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Identify Strategic High Yield opportunities in the domain: ${domain}. Output JSON array [{title, yield, risk, logic}].`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, tools: [{ googleSearch: {} }], responseMimeType: 'application/json' }
    }));
    return safeParseJson<any[]>(response.text);
}

/**
 * analyzeDeploymentFeasibility: Typed response fix.
 */
export async function analyzeDeploymentFeasibility(strategy: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Conduct structural feasibility audit for: "${strategy}". Ground response with search data.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, tools: [{ googleSearch: {} }] }
    }));
    return response.text || "";
}

/**
 * analyzePowerDynamics: Typed return fix.
 */
export async function analyzePowerDynamics(target: string, internalContext: string): Promise<AnalysisResult> {
    const ai = getAI();
    
    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            scores: {
                type: Type.OBJECT,
                properties: {
                    centralization: { type: Type.NUMBER },
                    entropy: { type: Type.NUMBER },
                    vitality: { type: Type.NUMBER },
                    opacity: { type: Type.NUMBER },
                    adaptability: { type: Type.NUMBER }
                },
                required: ['centralization', 'entropy', 'vitality', 'opacity', 'adaptability']
            },
            sustainer: { type: Type.STRING },
            extractor: { type: Type.STRING },
            destroyer: { type: Type.STRING },
            vectors: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        mechanism: { type: Type.STRING },
                        vulnerability: { type: Type.STRING },
                        severity: { type: Type.STRING, enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] }
                    },
                    required: ['mechanism', 'vulnerability', 'severity']
                }
            },
            insight: { type: Type.STRING }
        },
        required: ['scores', 'sustainer', 'extractor', 'destroyer', 'vectors', 'insight']
    };

    const prompt = `
        Perform a high-fidelity power dynamic diagnostic on the target: "${target}".
        
        INTERNAL CONTEXT (DOCUMENTS):
        ${internalContext || "No internal documents provided."}
        
        INSTRUCTIONS:
        1. Query the web for the latest real-time status of this entity/system.
        2. Analyze the power archetypes:
           - SUSTAINER: What keeps the system running?
           - EXTRACTOR: Who or what derives value/energy from it?
           - DESTROYER: What represents the ultimate entropic threat?
        3. Identify 3 specific technical attack vectors based on current vulnerabilities.
        4. Provide normalized scores (0-100) for system metrics.
    `.trim();

    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { 
            systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, 
            tools: [{ googleSearch: {} }], 
            responseMimeType: "application/json",
            responseSchema: schema
        }
    }));

    const result = safeParseJson<AnalysisResult>(response.text);
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    result.groundingSources = chunks.filter((c: any) => c.web).map((c: any) => ({ title: c.web.title, uri: c.web.uri }));
    
    return result;
}

/**
 * decomposeTaskToSubtasks: Typed return fix.
 */
export async function decomposeTaskToSubtasks(title: string, description: string): Promise<string[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Decompose strategic directive into atomic sub-steps: ${title}\n${description}. Output JSON array of strings.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    }));
    return safeParseJson<string[]>(response.text);
}

/**
 * searchGroundedIntel: Typed response fix.
 */
export async function searchGroundedIntel(query: string): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: query,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, tools: [{ googleSearch: {} }] }
    }));
    return response.text || "No signals detected.";
}

/**
 * generateSystemArchitecture: Typed return fix.
 */
export async function generateSystemArchitecture(prompt: string, type: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Generate system topology manifest for: "${prompt}". Domain Type: ${type}. Output JSON {nodes:[{id, label, subtext, iconName, color, status}], edges:[{id, source, target, color, variant}]}.`,
        config: { 
            systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, 
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingBudget: 16000 }
        }
    }));
    return safeParseJson<{
        nodes: Array<{id: string, label: string, subtext: string, iconName: string, color: string, status: string}>,
        edges: Array<{id: string, source: string, target: string, color?: string, variant?: string}>
    }>(response.text);
}

/**
 * generateSwarmArchitecture: Typed return fix.
 */
export async function generateSwarmArchitecture(prompt: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Forge multi-agent swarm architecture schematic for: "${prompt}". Output JSON {nodes:[{id, label, subtext, iconName, color, status}], edges:[{id, source, target, color, variant, handoffCondition}]}.`,
        config: { 
            systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, 
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingBudget: 16000 }
        }
    }));
    return safeParseJson<{
        nodes: Array<{id: string, label: string, subtext: string, iconName: string, color: string, status: string}>,
        edges: Array<{id: string, source: string, target: string, color?: string, variant?: string, handoffCondition?: string}>
    }>(response.text);
}

/**
 * generateSingleNode: Typed return fix.
 */
export async function generateSingleNode(description: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Crystallize node properties for: "${description}". Output JSON {label, subtext, iconName, color}.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    }));
    return safeParseJson<{label: string, subtext: string, iconName: string, color: string}>(response.text);
}

/**
 * calculateOptimalLayout: Typed return fix.
 */
export async function calculateOptimalLayout(nodes: any[], edges: any[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Calculate autopoietic coordinates for node manifest: ${JSON.stringify(nodes.map(n=>n.id))}. Output JSON mapping {node_id: {x,y}}.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    }));
    return safeParseJson<Record<string, {x: number, y: number}>>(response.text);
}

/**
 * generateProcessFromContext: Typed return fix.
 */
export async function generateProcessFromContext(artifacts: StoredArtifact[], type: string, prompt: string) {
    const ai = getAI();
    const contextStr = artifacts.map(a => `${a.name}: ${a.analysis?.summary}`).join('\n');
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Extract semantic context from Vault artifacts:\n${contextStr}\n\nGenerate ${type} implementation schematic for: "${prompt}". Output JSON {title, nodes:[], edges:[]}.`,
        config: { 
            systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, 
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingBudget: 16000 }
        }
    }));
    return safeParseJson<{
        title: string,
        nodes: any[],
        edges: any[]
    }>(response.text);
}

/**
 * generateResearchPlan: Typed return fix.
 */
export async function generateResearchPlan(q: string) { 
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Decompose research vector into specific technical probes: "${q}". Output JSON array of probe strings.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    }));
    return safeParseJson<string[]>(response.text);
}

/**
 * executeResearchQuery: Typed response fix.
 */
export async function executeResearchQuery(q: string) { 
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Execute high-precision search grounding for: "${q}".`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, tools: [{ googleSearch: {} }] }
    }));
    return [{ id: crypto.randomUUID(), fact: response.text || 'Signal captured.', confidence: 0.95, source: 'Reality_Oracle' }]; 
}
export async function compileResearchContext(f: any[]) { return f.map(x => x.fact).join('\n---\n'); }

/**
 * decomposeNode: Typed return fix.
 */
export async function decomposeNode(l: string, n: string) { 
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze entropy and decompose node "${l}". Contextual neighbors: ${n}. Output JSON {nodes:[], edges:[], optimizations:[]}.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    }));
    return safeParseJson<{
        nodes: any[],
        edges: any[],
        optimizations: string[]
    }>(response.text);
}

/**
 * generateInfrastructureCode: Typed response fix.
 */
export async function generateInfrastructureCode(s: string, p: string) { 
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Synthesize production-grade IaC ${p} code for the following topology: ${s}.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION }
    }));
    return response.text || "";
}

/**
 * convergeStrategicLattices: Typed return fix.
 */
export async function convergeStrategicLattices(n: any[], g: string) { 
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Execute strategic convergence to unify goal "${g}" using current lattices: ${JSON.stringify(n)}. Output JSON {nodes:[], coherence_index: 0.9, unified_goal: ""}.`,
        config: { 
            systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, 
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingBudget: 16000 }
        }
    }));
    return safeParseJson<{
        nodes: any[],
        coherence_index: number,
        unified_goal: string
    }>(response.text);
}

/**
 * transformArtifact: Typed response fix.
 */
export async function transformArtifact(c: any, t: any, i: string) { 
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Transform artifact of type ${t} using the following instruction: "${i}". Content Buffer: ${c}`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION }
    }));
    return response.text || c;
}

export async function generateStoryboardPlan(directive: string) {
    const ai = getAI();
    const schema: Schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                scenePrompt: { type: Type.STRING },
                continuity: { type: Type.STRING },
                camera: { type: Type.STRING },
                lighting: { type: Type.STRING }
            },
            required: ['scenePrompt', 'continuity']
        }
    };
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Forge cinematic timeline for: "${directive}". Output high-fidelity sequence plan JSON.`,
        config: { responseMimeType: 'application/json', responseSchema: schema }
    }));
    return safeParseJson<any[]>(response.text);
}

/**
 * constructCinematicPrompt: Typed response fix.
 */
export async function constructCinematicPrompt(
    prompt: string, 
    colorway: any, 
    hasChar: boolean, 
    hasSet: boolean, 
    hasStyle: boolean, 
    notes?: string, 
    preset?: string
) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Refine image generation directive following Sovereign Cinema protocols: "${prompt}". Color Profile: ${JSON.stringify(colorway)}. Notes: ${notes}. Style Preset: ${preset}. Multi-Modal Refs: Character=${hasChar}, World=${hasSet}, Aesthetic=${hasStyle}.`,
    }));
    return response.text || prompt;
}

/**
 * synthesizeResearchReport: Typed response fix.
 */
export async function synthesizeResearchReport(query: string, findings: any[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Compile a production-grade research report for query: "${query}". Finding Buffer: ${JSON.stringify(findings)}. Format as structured Markdown.`,
        config: { thinkingConfig: { thinkingBudget: 16000 } }
    }));
    return response.text || "";
}

/**
 * simulateExperiment: Typed response fix.
 */
export async function simulateExperiment(hypothesis: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Execute scientific simulation for hypothesis: "${hypothesis}".`,
    }));
    return response.text || "";
}

/**
 * generateTheory: Typed response fix.
 */
export async function generateTheory(findings: any[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Synthesize a unified theory based on the following finding lattice: ${JSON.stringify(findings)}.`,
        config: { thinkingConfig: { thinkingBudget: 16000 } }
    }));
    return response.text || "";
}

/**
 * smartOrganizeArtifact: Typed response fix.
 */
export async function smartOrganizeArtifact(id: string, context: any) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Calculate optimal Vault taxonomy for artifact ${id}. Environmental Context: ${JSON.stringify(context)}.`,
    }));
    return response.text || "";
}

/**
 * generateAutopoieticFramework: Typed response fix.
 */
export async function generateAutopoieticFramework(nodes: any[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Forge a self-sustaining framework manifest for the following node set: ${JSON.stringify(nodes)}.`,
        config: { thinkingConfig: { thinkingBudget: 32000 } }
    }));
    return response.text || "";
}

/**
 * calculateEntropy: Typed response fix.
 */
export async function calculateEntropy(data: any) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Execute entropy gradient calculation for the following architectural data set: ${JSON.stringify(data)}.`,
    }));
    return response.text || "";
}

/**
 * assessInvestmentRisk: Typed return fix.
 */
export async function assessInvestmentRisk(strategy: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Perform high-fidelity risk assessment for investment directive: "${strategy}". Output JSON {riskScore, reasoning}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<{riskScore: number, reasoning: string}>(response.text);
}
