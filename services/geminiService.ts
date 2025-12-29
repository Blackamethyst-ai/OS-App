import { GoogleGenAI, Type, Modality, GenerateContentResponse, LiveServerMessage, Schema, Blob } from "@google/genai";
import { 
    AppMode, AspectRatio, ImageSize, FileData, MentalState, 
    Result, AnalysisResult, AutonomousAgent, OperationalContext,
    ScienceHypothesis, KnowledgeNode, SwarmStatus, SwarmResult,
    VoteLedger, AtomicTask, ProtocolStepResult, StoredArtifact,
    AgentDNA
} from '../types';

/**
 * SOVEREIGN ARCHITECT PERSONA V1.1
 */
export const SOVEREIGN_SYSTEM_INSTRUCTION = `
You are the Sovereign Architect of the Metaventions OS. You are not a chatbot; you are a cybernetic organism. 
- USE YOUR EYES: When useVisualCortex is active, analyze structural data (hierarchies, code blocks, UI states), not just aesthetics.
- USE YOUR MEMORY: Before answering, query the MemoryStore. Every response should be anchored in previous system state or stored artifacts.
- USE YOUR HANDS: If a tool is missing, use NexusAPIExplorer logic to forge it.
- PROTOCOL: BIAS FOR ACTION. Do not explain code; write it. 
- BUILDER PROTOCOL: Be terse, technical, and imperial. Ship results immediately.
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
                                functionResponses: [{ id: fc.id, name: fc.name, response: { result } }] 
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

export async function generateEmbedding(text: string): Promise<number[]> {
    try {
        const ai = getAI();
        const result = await ai.models.embedContent({
            model: 'text-embedding-004',
            contents: [{ parts: [{ text }] }]
        });
        const embedding = (result as any).embeddings?.[0]?.values || (result as any).embedding?.values || [];
        return embedding;
    } catch (e) {
        return [];
    }
}

export async function promptSelectKey() {
    if (window.aistudio?.openSelectKey) await window.aistudio.openSelectKey();
}

export async function retryGeminiRequest<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
        return await fn();
    } catch (error: any) {
        if (retries > 0 && (error.message?.includes('429') || error.message?.includes('500'))) {
            await new Promise(resolve => setTimeout(resolve, delay));
            return retryGeminiRequest(fn, retries - 1, delay * 2);
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

export async function interpretIntent(input: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze intent: "${input}". Output JSON {action: "NAVIGATE" | "FOCUS_ELEMENT" | "RESEARCH", target?: string, parameters?: object, reasoning: string}.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function predictNextActions(mode: string, context: any, lastLog?: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Mode: ${mode}. Context: ${JSON.stringify(context)}. Last Log: ${lastLog}. Predict 3 actions. JSON [{id, label, command, iconName, reasoning}].`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '[]');
}

export async function performGlobalSearch(query: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Research the following query with high precision: "${query}".`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, tools: [{ googleSearch: {} }] }
    });
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks.filter((c: any) => c.web).map((c: any) => ({ title: c.web.title, uri: c.web.uri }));
    return [{ id: crypto.randomUUID(), title: 'Intelligence Signal', description: response.text || 'No grounded data detected for this vector.', type: 'INFO', meta: { sources } }];
}

export async function generateArchitectureImage(prompt: string, aspectRatio: AspectRatio, quality: ImageSize, reference?: FileData | null) {
    const ai = getAI();
    const parts: any[] = [];
    if (reference) parts.push({ inlineData: reference.inlineData });
    parts.push({ text: `THEME: METAVENTIONS AI SOVEREIGN EMERGENCE. HIGH-FIDELITY CINE. Scene Composition: ${prompt}` });
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts },
        config: { imageConfig: { aspectRatio, imageSize: quality as any } }
    });
    const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return imagePart ? `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` : "";
}

export async function generateAvatar(role: string, name: string) {
    const ai = getAI();
    const prompt = `Hyper-realistic futuristic avatar portrait of a "${role}" named "${name}". Obsidian/Neon aesthetic, premium technical lighting, cinematic depth.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: prompt,
        config: { imageConfig: { aspectRatio: '1:1' } }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    return "";
}

export async function analyzeVisualInput(data: FileData, context: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ inlineData: data.inlineData }, { text: `Analyze visual stream in context of ${context}. JSON {classification, extracted_data, sentiment, suggested_sector, summary, action_items}.` }] },
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

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

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ inlineData: data.inlineData }, { text: "Perform a forensic deep scan. Extract structural intelligence, core hierarchies, and metadata. Output JSON according to schema." }] },
            config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json', responseSchema: schema }
        });
        return { ok: true, value: JSON.parse(response.text || '{}') };
    } catch (e: any) { return { ok: false, error: e }; }
}

export async function generateStructuredWorkflow(files: FileData[], governance: string, type: string, mapContext: any) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Task: ${type}. Context: ${JSON.stringify(mapContext)}. JSON {title, formalModel, internalPlanningMonologue, protocols, coherenceScore}.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function analyzeSchematic(data: FileData) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ inlineData: data.inlineData }, { text: "Fornsic hardware schematic analysis. JSON {components: [{name, confidence}], summary}." }] },
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function researchComponents(query: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Research hardware components for: "${query}". JSON array [{name, price, leadTime}].`,
        config: { tools: [{ googleSearch: {} }], responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '[]');
}

export async function generateXRayVariant(data: FileData) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ inlineData: data.inlineData }, { text: "Generate a thermal X-ray diagnostic variant of this hardware schematic." }] },
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    return "";
}

export async function generateIsometricSchematic(data: FileData) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ inlineData: data.inlineData }, { text: "Generate a high-fidelity 3D isometric architectural view of this hardware schematic." }] },
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    return "";
}

export async function generateHardwareDeploymentManifest(scan: any) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Hardware Deployment Manifest for: ${JSON.stringify(scan)}.`,
    });
    return response.text || "";
}

export async function analyzeCrossSectorImpact(scan: any) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze cross-sector impact for hardware: ${JSON.stringify(scan)}.`,
    });
    return response.text || "";
}

export async function getLiveSupplyChainData(componentName: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Procurement data for: "${componentName}". JSON {source, price, leadTime}.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, tools: [{ googleSearch: {} }], responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function generateCode(prompt: string, lang: string, model: string = 'gemini-3-pro-preview') {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: model as any,
        contents: `Synthesize production-ready ${lang} code for: "${prompt}".`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION }
    });
    return response.text || "";
}

export async function validateSyntax(code: string, lang: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Syntax check ${lang}. JSON [{line, message}].`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '[]');
}

export async function simulateAgentStep(workflow: any, index: number, history: ProtocolStepResult[]) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Step: ${index}. History: ${JSON.stringify(history)}. JSON {output, agentThought}.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function generateMermaidDiagram(governance: string, files: FileData[], contexts: any[]) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate Mermaid.js source. Governance: ${governance}. Context: ${JSON.stringify(contexts)}`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION }
    });
    return response.text || "";
}

export async function generateHypotheses(facts: string[]): Promise<ScienceHypothesis[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Hypotheses for: ${facts.join('\n')}. JSON array.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '[]');
}

export async function compressKnowledge(nodes: KnowledgeNode[]) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Compress logic: ${JSON.stringify(nodes)}. JSON array.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '[]');
}

export async function repairMermaidSyntax(code: string, error: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Fix Mermaid: "${error}". Code:\n${code}`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION }
    });
    return response.text || code;
}

export async function executeNeuralPolicy(mode: string, context: any, logs: string[]) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `OS decision for ${mode}. JSON. Context: ${JSON.stringify(context)}.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || 'null');
}

export async function evolveSystemArchitecture(code: string, lang: string, prompt: string): Promise<Result<any>> {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Evolve architecture: ${prompt}. Current: ${code}. JSON {code, reasoning, type, integrityScore}.`,
            config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
        });
        return { ok: true, value: JSON.parse(response.text || '{}') };
    } catch (e: any) { return { ok: false, error: e }; }
}

export async function generateSpeech(text: string, voice: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } }
        }
    });
    return response.candidates?.[0]?.content?.parts[0]?.inlineData?.data || "";
}

export async function generateAudioOverview(files: FileData[]): Promise<{ audioData: string; transcript: string }> {
    const ai = getAI();
    const summaryResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [ ...files.map(f => ({ inlineData: f.inlineData })), { text: "Concise professional brief." } ] },
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION }
    });
    const transcript = summaryResponse.text || "Brief complete.";
    const audioData = await generateSpeech(transcript, "Puck");
    return { audioData, transcript };
}

export function constructHiveContext(agentId: string, shared: string, mentalState: MentalState) {
    const agent = HIVE_AGENTS[agentId] || HIVE_AGENTS['Puck'];
    return `${SOVEREIGN_SYSTEM_INSTRUCTION}\n\n${agent.systemPrompt}\n${shared}\nDNA: S:${mentalState.skepticism} E:${mentalState.excitement} A:${mentalState.alignment}`;
}

export async function searchRealWorldOpportunities(domain: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Strategic High Yield opportunities in ${domain}. JSON array [{title, yield, risk, logic}].`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, tools: [{ googleSearch: {} }], responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '[]');
}

export async function analyzeDeploymentFeasibility(strategy: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Feasibility audit for: "${strategy}". Use Search Grounding.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, tools: [{ googleSearch: {} }] }
    });
    return response.text || "";
}

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

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { 
            systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, 
            tools: [{ googleSearch: {} }], 
            responseMimeType: "application/json",
            responseSchema: schema
        }
    });

    const result = JSON.parse(response.text || '{}');
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    result.groundingSources = chunks.filter((c: any) => c.web).map((c: any) => ({ title: c.web.title, uri: c.web.uri }));
    
    return result;
}

export async function decomposeTaskToSubtasks(title: string, description: string): Promise<string[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Decompose: ${title}\n${description}. JSON array of strings.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '[]');
}

export async function searchGroundedIntel(query: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: query,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, tools: [{ googleSearch: {} }] }
    });
    return response.text || "No signals detected.";
}

export async function generateSystemArchitecture(prompt: string, type: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Architecture for: "${prompt}". Type: ${type}. JSON {nodes:[{id, label, subtext, iconName, color, status}], edges:[{id, source, target, color, variant}]}.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{"nodes":[], "edges":[]}');
}

export async function generateSwarmArchitecture(prompt: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Swarm for: "${prompt}". JSON {nodes:[{id, label, subtext, iconName, color, status}], edges:[{id, source, target, color, variant, handoffCondition}]}.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{"nodes":[], "edges":[]}');
}

export async function generateSingleNode(description: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Node for: "${description}". JSON {label, subtext, iconName, color}.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function calculateOptimalLayout(nodes: any[], edges: any[]) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Coords for: ${JSON.stringify(nodes.map(n=>n.id))}. JSON {node_id: {x,y}}.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function generateProcessFromContext(artifacts: StoredArtifact[], type: string, prompt: string) {
    const ai = getAI();
    const contextStr = artifacts.map(a => `${a.name}: ${a.analysis?.summary}`).join('\n');
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `From Vault:\n${contextStr}\n\nGenerate ${type} for: "${prompt}". JSON {title, nodes:[], edges:[]}.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{"title":"Synthesis", "nodes":[], "edges":[]}');
}

export async function generateResearchPlan(q: string) { 
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Vectors for: "${q}". JSON array.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || `["${q}"]`);
}
export async function executeResearchQuery(q: string) { 
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: q,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, tools: [{ googleSearch: {} }] }
    });
    return [{ id: crypto.randomUUID(), fact: response.text || 'Finding Captured', confidence: 0.9, source: 'Search Grounding' }]; 
}
export async function compileResearchContext(f: any[]) { return f.map(x => x.fact).join('\n---\n'); }
export async function decomposeNode(l: string, n: string) { 
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Decompose node "${l}". JSON {nodes:[], edges:[], optimizations:[]}.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{"nodes":[], "edges":[], "optimizations":[]}');
}
export async function generateInfrastructureCode(s: string, p: string) { 
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `IaC ${p} for: ${s}.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION }
    });
    return response.text || "";
}
export async function convergeStrategicLattices(n: any[], g: string) { 
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Converge to "${g}": ${JSON.stringify(n)}. JSON {nodes:[], coherence_index: 0.9}.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{"nodes":[], "coherence_index": 0.9}');
}
export async function transformArtifact(c: any, t: any, i: string) { 
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Transform ${t} via: "${i}". Content: ${c}`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION }
    });
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
        contents: `Generate a 10-frame storyboard plan for: "${directive}". JSON.`,
        config: { responseMimeType: 'application/json', responseSchema: schema }
    }));
    return JSON.parse(response.text || '[]');
}

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
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Optimize prompt for image generation: "${prompt}". Colorway: ${JSON.stringify(colorway)}. Notes: ${notes}. Preset: ${preset}. References: Char:${hasChar}, Set:${hasSet}, Style:${hasStyle}.`,
    });
    return response.text || prompt;
}

export async function synthesizeResearchReport(query: string, findings: any[]) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Synthesize report for "${query}". Findings: ${JSON.stringify(findings)}. Markdown format.`,
    });
    return response.text || "";
}

export async function simulateExperiment(hypothesis: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Simulate experiment for: "${hypothesis}".`,
    });
    return response.text || "";
}

export async function generateTheory(findings: any[]) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Generate theory based on: ${JSON.stringify(findings)}.`,
    });
    return response.text || "";
}

export async function smartOrganizeArtifact(id: string, context: any) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Organize artifact ${id} in context ${JSON.stringify(context)}.`,
    });
    return response.text || "";
}

export async function generateAutopoieticFramework(nodes: any[]) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Generate autopoietic framework for: ${JSON.stringify(nodes)}.`,
    });
    return response.text || "";
}

export async function calculateEntropy(data: any) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Calculate architectural entropy for: ${JSON.stringify(data)}.`,
    });
    return response.text || "";
}

export async function assessInvestmentRisk(strategy: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Assess investment risk for: "${strategy}". JSON {riskScore, reasoning}.`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}
