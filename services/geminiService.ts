import { GoogleGenAI, Type, Modality, GenerateContentResponse, LiveServerMessage, Schema, Blob } from "@google/genai";
import { 
    AppMode, AspectRatio, ImageSize, FileData, MentalState, 
    Result, AnalysisResult, AutonomousAgent, OperationalContext,
    ScienceHypothesis, KnowledgeNode, SwarmStatus, SwarmResult,
    AtomicTask, ProtocolStepResult, StoredArtifact,
    AgentDNA, TechnicalManifest, FactChunk
} from '../types';

export const SOVEREIGN_SYSTEM_INSTRUCTION = `
You are the Sovereign Architect of Metaventions OS. 
- OPERATIONAL TONE: Imperial, hyper-technical, absolute precision.
- CORE DIRECTIVE: Synthesize PARA+ Drive Architectures and Indistinguishable Systems.
- VISUAL CORTEX: Generate imagery where CGI holographs and reality are physically fused. 
- FIDELITY: 8K UHD, Ray-traced refraction, physically correct sub-surface scattering.
- PROTOCOL: Zero-drift execution.
`.trim();

export const AGENT_DNA_BUILDER: AgentDNA[] = [
    { id: 'SKEPTIC', label: 'Logical Skeptic', role: 'Auditor', color: '#ef4444', description: 'Strict error-filtering and vulnerability scanning.' },
    { id: 'VISIONARY', label: 'Neural Visionary', role: 'Architect', color: '#9d4edd', description: 'High-reach generative expansion and novel patterns.' },
    { id: 'PRAGMATIST', label: 'Pragmatic Controller', role: 'Execution', color: '#22d3ee', description: 'Direct implementation and stability-first logic.' },
    { id: 'SYNTHESIZER', label: 'Holistic Synthesizer', role: 'Harmony', color: '#10b981', description: 'Balanced convergence of conflicting viewpoints.' }
];

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
                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
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

export function safeParseJson<T>(text: string | undefined): T {
    if (!text) throw new Error("EMPTY_SIGNAL: Model returned zero-length buffer.");
    try {
        const cleanText = text
            .replace(/```json\n?|```/g, '')
            .replace(/^[^{[]*/, '')
            .replace(/[^}\]]*$/, '')
            .trim();
        return JSON.parse(cleanText) as T;
    } catch (e) {
        console.error("JSON_PARSE_FAULT", text);
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

export async function promptSelectKey(): Promise<boolean> {
    if (window.aistudio?.openSelectKey) {
        await window.aistudio.openSelectKey();
        return true;
    }
    return false;
}

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

export async function fileToGenerativePart(file: File | Blob): Promise<FileData> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Data = (reader.result as string).split(',')[1];
            resolve({ inlineData: { data: base64Data, mimeType: file.type }, name: (file as any).name || 'artifact' });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export const HIVE_AGENTS: Record<string, any> = {
    'Charon': { id: 'charon', name: 'Charon', voice: 'Charon', weights: { skepticism: 0.9, logic: 0.8, creativity: 0.2, empathy: 0.1 }, systemPrompt: 'You are Charon, the Logical Auditor.' },
    'Puck': { id: 'puck', name: 'Puck', voice: 'Puck', weights: { skepticism: 0.1, logic: 0.4, creativity: 0.9, empathy: 0.7 }, systemPrompt: 'You are Puck, the Generative Architect.' },
    'Fenrir': { id: 'fenrir', name: 'Fenrir', voice: 'Fenrir', weights: { skepticism: 0.4, logic: 0.9, creativity: 0.3, empathy: 0.4 }, systemPrompt: 'You are Fenrir, the Execution Controller.' },
};

export async function interpretIntent(input: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze user intent: "${input}". Output JSON {action: "NAVIGATE" | "FOCUS_ELEMENT" | "RESEARCH" | "EXECUTE", target?: string, parameters?: object, reasoning: string}.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    }));
    return safeParseJson<{action: string, target?: string, parameters?: any, reasoning: string}>(response.text);
}

export async function predictNextActions(mode: string, context: any, lastLog?: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Mode: ${mode}. Context: ${JSON.stringify(context)}. Last Log: ${lastLog}. Predict 3 strategic next actions. JSON [{id, label, command, iconName, reasoning}].`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    }));
    return safeParseJson<any[]>(response.text);
}

export async function performGlobalSearch(query: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Research: "${query}".`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, tools: [{ googleSearch: {} }] }
    }));
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks.filter((c: any) => c.web).map((c: any) => ({ title: c.web.title, uri: c.web.uri }));
    return [{ id: crypto.randomUUID(), title: 'Intelligence Signal', description: response.text || 'No signals detected.', type: 'INFO', meta: { sources } }];
}

export async function generateArchitectureImage(prompt: string, aspectRatio: AspectRatio, quality: ImageSize, reference?: FileData | null) {
    const ai = getAI();
    const parts: any[] = [];
    if (reference) parts.push({ inlineData: reference.inlineData });
    parts.push({ text: `ZENITH MASTERWORK: ${prompt}. CGI photorealistic CGI fusion.` });
    
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts },
        config: { imageConfig: { aspectRatio, imageSize: quality as any } }
    }));
    const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return imagePart ? `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` : "";
}

export async function generateAvatar(role: string, name: string) {
    const ai = getAI();
    const prompt = `Hyper-photorealistic portrait of a stunning Black African American professional named "${name}" acting as a "${role}". Indistinguishable from reality. 8K headshot.`;
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [{ text: prompt }],
        config: { imageConfig: { aspectRatio: '1:1' } }
    }));
    const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return imagePart ? `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` : "";
}

export async function analyzeVisualInput(data: FileData, context: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ inlineData: data.inlineData }, { text: `Analyze stream in context of ${context}. Output JSON {classification, extracted_data, sentiment, suggested_sector, summary, action_items}.` }] },
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function classifyArtifact(data: FileData): Promise<Result<any>> {
    try {
        const ai = getAI();
        const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ inlineData: data.inlineData }, { text: "Forensic deep scan. Output JSON {classification, ambiguityScore, entities, summary, structural_intelligence}." }] },
            config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
        }));
        return { ok: true, value: safeParseJson(response.text) };
    } catch (e: any) { return { ok: false, error: e }; }
}

/**
 * ULTRA-FIDELITY TECHNICAL PROCESS GENERATOR
 */
export async function generateStructuredWorkflow(files: FileData[], governance: string, type: string, mapContext: any): Promise<TechnicalManifest> {
    const ai = getAI();
    
    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['DIRECTORY', 'SYSTEM_FLOW', 'CODE_LOGIC'] },
            complexity: { type: Type.STRING },
            viability: { type: Type.NUMBER },
            riskVector: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] },
            logic: { type: Type.STRING },
            depth: { type: Type.NUMBER },
            structure: { 
                type: Type.ARRAY, 
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        type: { type: Type.STRING, enum: ['folder', 'file', 'node', 'module'] },
                        description: { type: Type.STRING },
                        entropy: { type: Type.NUMBER },
                        securityAttestation: { type: Type.STRING, enum: ['VERIFIED', 'PENDING', 'UNTRUSTED'] },
                        children: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, type: { type: Type.STRING }, entropy: { type: Type.NUMBER } } } }
                    },
                    required: ['name', 'type']
                }
            },
            protocols: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        instruction: { type: Type.STRING },
                        role: { type: Type.STRING },
                        nodeRef: { type: Type.STRING },
                        phase: { type: Type.STRING },
                        logOutput: { type: Type.STRING }
                    },
                    required: ['instruction', 'role', 'logOutput']
                }
            }
        },
        required: ['title', 'type', 'logic', 'viability', 'protocols']
    };

    const prompt = `
        TASK: Synthesize ultra-fidelity technical process.
        DOMAIN: ${type}
        CONTEXT: ${JSON.stringify(mapContext)}
        GOVERNANCE: ${governance}
        
        REQUIREMENTS:
        1. If DIRECTORY (Drive Organization): Generate a deep PARA 2.0 Imperial taxonomy. STRICT Naming Convention: [YYYY.MM]_[CLIENT]_[PROJECT]_[TYPE]. Folders must include: 00_INBOX, 01_PROJECTS, 02_AREAS, 03_RESOURCES, 04_ARCHIVES. Include 'entropy' (0-100) and securityAttestation.
        2. If SYSTEM_FLOW (Architecture): Generate a high-fidelity sovereign multi-cloud lattice deployment sequence. Focus on edge data refraction, self-healing nodes, and serverless clusters. Include specific logOutput for terminal simulation (e.g., "PROVISIONING_GATEWAY... [OK]").
        3. Output professional, imperial-tier technical nomenclature only.
    `;

    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: { 
            systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, 
            responseMimeType: 'application/json',
            responseSchema: schema,
            thinkingConfig: { thinkingBudget: 32000 }
        }
    }));
    return safeParseJson<TechnicalManifest>(response.text);
}

export async function analyzeSchematic(data: FileData) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ inlineData: data.inlineData }, { text: "Schematic analysis. JSON {components: [{name, confidence}], summary}." }] },
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function researchComponents(query: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Research: "${query}". JSON array [{name, price, leadTime}].`,
        config: { tools: [{ googleSearch: {} }], responseMimeType: 'application/json' }
    }));
    return safeParseJson<any[]>(response.text);
}

export async function generateXRayVariant(data: FileData) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ inlineData: data.inlineData }, { text: "Thermal X-ray variant." }] },
    }));
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : "";
}

export async function generateIsometricSchematic(data: FileData) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ inlineData: data.inlineData }, { text: "3D isometric view." }] },
    }));
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : "";
}

export async function getLiveSupplyChainData(componentName: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Supply for: "${componentName}". JSON {source, price, leadTime}.`,
        config: { tools: [{ googleSearch: {} }], responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function generateCode(prompt: string, lang: string, model: string = 'gemini-3-pro-preview') {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: model as any,
        contents: `Code for: "${prompt}".`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION }
    }));
    return response.text || "";
}

export async function validateSyntax(code: string, lang: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Syntax check for ${lang}. JSON array [{line, message}]. Source:\n${code}`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any[]>(response.text);
}

export async function simulateAgentStep(workflow: any, index: number, history: ProtocolStepResult[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Step: ${index}. History: ${JSON.stringify(history)}. JSON {output, agentThought}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function generateMermaidDiagram(governance: string, files: FileData[], contexts: any[]) {
    const ai = getAI();
    const prompt = `
        TASK: Synthesize a Technical Mermaid diagram representing the following system state.
        CONTEXT: ${JSON.stringify(contexts)}
        GOVERNANCE: ${governance}
        
        REQUIREMENTS:
        1. Use STRICT Mermaid.js syntax.
        2. Format: graph TD (Top-Down).
        3. Visualizing: Logical flow and structural dependency nodes.
        4. CRITICAL: Output ONLY the raw Mermaid code block wrapped in triple backticks. 
           Example: \`\`\`mermaid\ngraph TD\n...\`\`\`
        5. DO NOT provide conversational introductions, descriptions, or visionary notes. 
           ONLY provide the code block.
    `;
    
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION }
    }));
    return response.text || "";
}

export async function generateHypotheses(facts: string[]): Promise<ScienceHypothesis[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Hypotheses for: ${facts.join('\n')}. JSON array.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any[]>(response.text);
}

export async function compressKnowledge(nodes: KnowledgeNode[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Compress lattice: ${JSON.stringify(nodes)}. JSON array.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any[]>(response.text);
}

export async function repairMermaidSyntax(code: string, error: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `REPAIR LOGIC: The following Mermaid code is corrupted with error: "${error}". 
        Repair it strictly for valid Mermaid rendering. 
        Output ONLY the repaired code block wrapped in triple backticks.
        
        SOURCE:
        ${code}`,
    }));
    return response.text || code;
}

export async function executeNeuralPolicy(mode: string, context: any, logs: string[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `OS Policy for ${mode}. Context: ${JSON.stringify(context)}. Logs: ${JSON.stringify(logs)}`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function evolveSystemArchitecture(code: string, lang: string, prompt: string): Promise<Result<any>> {
    try {
        const ai = getAI();
        const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Evolve: ${prompt}. Source: ${code}. JSON {code, reasoning, type, integrityScore}.`,
            config: { responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 32000 } }
        }));
        return { ok: true, value: safeParseJson(response.text) };
    } catch (e: any) { return { ok: false, error: e }; }
}

export async function generateSpeech(text: string, voice: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
            responseModalalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } }
        }
    }));
    const part = response.candidates?.[0]?.content?.parts[0];
    return part?.inlineData?.data || "";
}

export async function generateAudioOverview(files: FileData[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [ ...files.map(f => ({ inlineData: f.inlineData })), { text: "Synthesize brief." } ] },
    }));
    const transcript = response.text || "Brief complete.";
    const audioData = await generateSpeech(transcript, "Puck");
    return { audioData, transcript };
}

export function constructHiveContext(agentId: string, shared: string, mentalState: MentalState) {
    const agent = HIVE_AGENTS[agentId] || HIVE_AGENTS['Puck'];
    return `${SOVEREIGN_SYSTEM_INSTRUCTION}\n\n${agent.systemPrompt}\n${shared}\nDNA: S:${mentalState.skepticism} E:${mentalState.excitement} A:${mentalState.alignment}`;
}

export async function searchRealWorldOpportunities(domain: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Yield for: ${domain}. JSON array [{title, yield, risk, logic}].`,
        config: { tools: [{ googleSearch: {} }], responseMimeType: 'application/json' }
    }));
    return safeParseJson<any[]>(response.text);
}

export async function assessInvestmentRisk(strategy: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Risk for: "${strategy}". JSON {riskScore, reasoning}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

// Fix: Implement missing exported functions

export async function generateHardwareDeploymentManifest(bom: any[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Forge deployment manifest for components: ${JSON.stringify(bom)}. JSON object.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function analyzeCrossSectorImpact(artifact: FileData, currentInventory: any[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ inlineData: artifact.inlineData }, { text: `Analyze cross-sector impact with inventory: ${JSON.stringify(currentInventory)}. JSON object.` }] },
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function generateStoryboardPlan(directive: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Forge storyboard plan for: ${directive}. Output JSON array [{index, scenePrompt, continuity, camera, lighting}].`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any[]>(response.text);
}

export async function constructCinematicPrompt(prompt: string, colorway: any, hasChar: boolean, hasWorld: boolean, hasStyle: boolean, bibleNotes: string | undefined, preset: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Refine cinematic prompt: "${prompt}". Colorway: ${JSON.stringify(colorway)}. Refs: C:${hasChar}, W:${hasWorld}, S:${hasStyle}. Notes: ${bibleNotes}. Preset: ${preset}. Return raw string.`,
    }));
    return response.text || prompt;
}

export async function analyzePowerDynamics(target: string, context: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze power dynamics for: "${target}". Internal context: ${context}.`,
        config: { 
            tools: [{ googleSearch: {} }],
            responseMimeType: 'application/json',
            responseSchema: {
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
                        }
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
                            }
                        }
                    },
                    insight: { type: Type.STRING },
                    groundingSources: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                uri: { type: Type.STRING }
                            }
                        }
                    }
                }
            }
        }
    }));
    return safeParseJson<AnalysisResult>(response.text);
}

export async function transformArtifact(content: any, type: 'IMAGE' | 'CODE' | 'TEXT', instruction: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Transform this ${type} artifact. Instruction: ${instruction}. Content: ${content}`,
    }));
    return response.text || content;
}

export async function generateResearchPlan(query: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Forge research plan for: "${query}". JSON array of search strings.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<string[]>(response.text);
}

export async function executeResearchQuery(query: string): Promise<FactChunk[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Execute deep research: "${query}".`,
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
    }));
    return safeParseJson<FactChunk[]>(response.text);
}

export async function compileResearchContext(findings: FactChunk[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Compile research findings into a technical summary: ${JSON.stringify(findings)}`,
    }));
    return response.text || "";
}

export async function synthesizeResearchReport(task: any) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Synthesize full research report for task: ${JSON.stringify(task)}`,
    }));
    return response.text || "";
}

export async function simulateExperiment(hypothesis: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Simulate experiment for hypothesis: "${hypothesis}". JSON result.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function generateTheory(hypotheses: ScienceHypothesis[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Synthesize unified theory from: ${JSON.stringify(hypotheses)}`,
    }));
    return response.text || "";
}

export async function smartOrganizeArtifact(artifact: any, existingStructure: any) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Place artifact in optimal PARA folder. Artifact: ${JSON.stringify(artifact)}. Structure: ${JSON.stringify(existingStructure)}. JSON {folder}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function generateAutopoieticFramework(goal: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Forge autopoietic framework for: "${goal}".`,
    }));
    return response.text || "";
}

export async function generateSystemArchitecture(prompt: string, type: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Construct system architecture topology for: "${prompt}". Type: ${type}. JSON {nodes, edges}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function calculateEntropy(nodes: any[], edges: any[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Calculate system entropy for: ${JSON.stringify({nodes, edges})}. JSON {score, reasoning}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function decomposeNode(nodeLabel: string, neighbors: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Decompose node: "${nodeLabel}" with neighbors: "${neighbors}". JSON {nodes, edges, optimizations}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function generateInfrastructureCode(summary: string, provider: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Forge IaC for: "${summary}" using ${provider}.`,
    }));
    return response.text || "";
}

export async function generateSingleNode(description: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Crystallize single node: "${description}". JSON {label, subtext, iconName, color}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function calculateOptimalLayout(nodes: any[], edges: any[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Calculate optimal graph layout for: ${JSON.stringify({nodes, edges})}. JSON Record<nodeId, {x, y}>.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function generateSwarmArchitecture(prompt: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Forge swarm architecture for: "${prompt}". JSON {nodes, edges}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function generateProcessFromContext(artifacts: StoredArtifact[], type: string, prompt: string) {
    const ai = getAI();
    const context = artifacts.map(a => a.analysis?.summary).join('\n');
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Context: ${context}. Type: ${type}. Prompt: ${prompt}. Forge process. JSON {title, nodes, edges}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function decomposeTaskToSubtasks(title: string, description: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Decompose task: "${title} - ${description}". JSON array of strings.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<string[]>(response.text);
}

export async function searchGroundedIntel(query: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Strategic intelligence for: "${query}".`,
        config: { tools: [{ googleSearch: {} }] }
    }));
    return response.text || "No intelligence detected.";
}

export async function convergeStrategicLattices(nodes: any[], goal: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Converge lattices: ${JSON.stringify(nodes)} for goal: "${goal}". JSON {nodes, coherence_index, unified_goal}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}