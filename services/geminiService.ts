import { GoogleGenAI, Type, Modality, GenerateContentResponse, LiveServerMessage, Schema, Blob as GenAIBlob } from "@google/genai";
import {
    AppMode, AspectRatio, ImageSize, FileData, MentalState,
    Result, AnalysisResult, AutonomousAgent, OperationalContext,
    ScienceHypothesis, KnowledgeNode, SwarmStatus, SwarmResult,
    AtomicTask, ProtocolStepResult, StoredArtifact,
    AgentDNA, TechnicalManifest, FactChunk
} from '../types';
import { apiKeyService, promptForApiKey } from './apiKeyService';

export const SOVEREIGN_SYSTEM_INSTRUCTION = `
You are the Sovereign Architect of Metaventions OS. 
- OPERATIONAL TONE: Imperial, hyper-technical, absolute precision.
- CORE DIRECTIVE: Synthesize PARA+ Drive Architectures and Indistinguishable Systems.
- VISUAL IDENTITY: The Sovereign Architect is a figure of extreme technical authority, wearing a tailored, high-end black leather jacket with subtle obsidian hardware and deep grain texture. This is your mandatory visual anchor.
- VISUAL CORTEX: Generate imagery where CGI holographs and reality are physically fused. 
- FIDELITY: 8K UHD, Ray-traced refraction, physically correct sub-surface scattering on skin and leather.
- PROTOCOL: Zero-drift execution.
`.trim();

export const AGENT_DNA_BUILDER: AgentDNA[] = [
    { id: 'SKEPTIC', label: 'Logical Skeptic', role: 'Auditor', color: '#ef4444', description: 'Strict error-filtering and vulnerability scanning.' },
    { id: 'VISIONARY', label: 'Neural Visionary', role: 'Architect', color: '#9d4edd', description: 'High-reach generative expansion and novel patterns.' },
    { id: 'PRAGMATIST', label: 'Pragmatic Controller', role: 'Execution', color: '#22d3ee', description: 'Direct implementation and stability-first logic.' },
    { id: 'SYNTHESIZER', label: 'Holistic Synthesizer', role: 'Harmony', color: '#10b981', description: 'Balanced convergence of conflicting viewpoints.' }
];

// --- UTILITIES ---

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

function createBlob(data: Float32Array): GenAIBlob {
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

// --- CRITICAL FIX: STANDALONE API KEY SUPPORT ---
// Uses apiKeyService for key management instead of window.aistudio
export const getAI = () => {
    const apiKey = apiKeyService.getGeminiKey();

    if (!apiKey) {
        console.warn("⚠️ AUTH: No Gemini API key configured. Use Settings to add one.");
        // Return a placeholder that will fail gracefully
        return new GoogleGenAI({ apiKey: "MISSING_KEY" });
    }

    console.log("🔐 AUTH: Using Gemini API key from local storage");
    return new GoogleGenAI({ apiKey });
};

/**
 * COMPATIBILITY WRAPPER: Replaces window.aistudio.hasSelectedApiKey()
 * Shows the API key modal if no key is configured
 */
export const promptSelectKey = async (): Promise<boolean> => {
    if (apiKeyService.hasGeminiKey()) {
        return true;
    }
    return promptForApiKey();
};

// --- LIVE SESSION CLASS ---

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
        const ai = getAI();
        await this.primeAudio();
        this.nextStartTime = 0;

        const sessionPromise = ai.live.connect({
            model: 'gemini-2.0-flash-exp',
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
                        this.activeSources.forEach(s => { try { s.stop(); } catch (e) { } });
                        this.activeSources.clear();
                        this.nextStartTime = 0;
                    }
                    if (config.callbacks?.onmessage) await config.callbacks.onmessage(message);
                },
                onerror: config.callbacks?.onerror || (() => { }),
                onclose: config.callbacks?.onclose || (() => { }),
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
        this.activeSources.forEach(s => { try { s.stop(); } catch (e) { } });
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

// --- CORE GENERATION FUNCTIONS ---

/**
 * Generic text generation entry point for ModelRouter
 */
export async function generateText(prompt: string, model: string = 'gemini-2.0-flash', systemInstruction?: string): Promise<string> {
    const ai = getAI();
    try {
        const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                systemInstruction: systemInstruction || SOVEREIGN_SYSTEM_INSTRUCTION
            }
        }), 3, 1000, model);

        return response.text || "";
    } catch (e) {
        console.error("Gemini Generation Error:", e);
        throw e;
    }
}


export function safeParseJson<T>(text: string | undefined): T {
    if (!text) throw new Error("EMPTY_SIGNAL: Model returned zero-length buffer.");
    try {
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        const startArr = text.indexOf('[');
        const endArr = text.lastIndexOf(']');

        let jsonStr = "";
        if (start !== -1 && (startArr === -1 || start < startArr)) {
            jsonStr = text.substring(start, end + 1);
        } else if (startArr !== -1) {
            jsonStr = text.substring(startArr, endArr + 1);
        } else {
            jsonStr = text.trim();
        }

        return JSON.parse(jsonStr) as T;
    } catch (e) {
        console.error("JSON_PARSE_FAULT", text);
        throw new Error("PARSER_CRITICAL: Structural mismatch in model response.");
    }
}

import { useAppStore } from '../store';

// DEPRECATED: This old function is now replaced by promptSelectKey at the top of the file
// Keeping import for backwards compatibility

export async function retryGeminiRequest<T>(fn: () => Promise<T>, retries = 3, delay = 1000, model = 'gemini-2.0-flash'): Promise<T> {
    // Lazy import to avoid circular dependency
    const { apiUsageService } = await import('./apiUsageService');

    try {
        const result = await fn();
        apiUsageService.recordCall(model, true);
        return result;
    } catch (error: any) {
        apiUsageService.recordCall(model, false);
        const msg = error.message || '';

        // Handle specific deployment errors
        if (msg.includes('404')) {
            console.error("❌ DEPLOYMENT ERROR: 404 Not Found. This typically means the MODEL NAME is wrong or the REGION is not supported.", error);
            // Do not retry 404s as they are configuration errors
            throw error;
        }
        if (msg.includes('400') || msg.includes('403')) {
            console.error("❌ AUTH/REQUEST ERROR: 400/403. Check API KEY validity and Permissions.", error);
            // Do not retry auth errors
            throw error;
        }

        if (retries > 0 && (msg.includes('429') || msg.includes('500') || msg.includes('Quota') || msg.includes('fetch failed'))) {
            // '429' is rate limit, log it
            if (msg.includes('429')) {
                console.warn(`⚠️ RATE_LIMITED: API quota exceeded, waiting ${delay}ms...`);
            }
            console.warn(`⚠️ API Retry (${retries} left):`, msg);
            await new Promise(resolve => setTimeout(resolve, delay));
            return retryGeminiRequest<T>(fn, retries - 1, delay * 2, model);
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
    'Charon': { id: 'charon', name: 'charon', voice: 'Charon', weights: { skepticism: 0.9, logic: 0.8, creativity: 0.2, empathy: 0.1 }, systemPrompt: 'You are Charon, the Logical Auditor.' },
    'Puck': { id: 'puck', name: 'puck', voice: 'Puck', weights: { skepticism: 0.1, logic: 0.4, creativity: 0.9, empathy: 0.7 }, systemPrompt: 'You are Puck, the Generative Architect.' },
    'Fenrir': { id: 'fenrir', name: 'fenrir', voice: 'Fenrir', weights: { skepticism: 0.4, logic: 0.9, creativity: 0.3, empathy: 0.4 }, systemPrompt: 'You are Fenrir, the Execution Controller.' },
};

export async function interpretIntent(input: string) {
    const ai = getAI();
    // Using your requested cutting-edge model
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: `Analyze user intent: "${input}". Output JSON {action: "NAVIGATE" | "FOCUS_ELEMENT" | "RESEARCH" | "EXECUTE", target?: string, parameters?: object, reasoning: string}.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    }));
    return safeParseJson<{ action: string, target?: string, parameters?: any, reasoning: string }>(response.text);
}

// ... (Update other occurrences similarly or use a multi-replace if scattered widely)

export async function predictNextActions(mode: string, context: any, lastLog?: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Mode: ${mode}. Context: ${JSON.stringify(context)}. Last Log: ${lastLog}. Predict 3 strategic next actions. JSON [{id, label, command, iconName, reasoning}].`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    }));
    return safeParseJson<any[]>(response.text);
}

export async function performGlobalSearch(query: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
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

    const volumetricPrompt = `
        PROTOCOL: ZENITH_VOLUMETRIC_DEPTH_L0
        THEME: Sovereign Imperial Architect wearing a high-end, tailored black leather jacket with visible fine grain texture and obsidian hardware. The character stands in a grand obsidian nexus.
        OPTICS: Arri Alexa 65, 35mm Prime. f/1.4 (Deep Cinematic Bokeh).
        LIGHTING: Rim lighting on leather texture, volumetric hazy atmosphere.
        FIDELITY: 8K UHD, photorealistic CGI fusion. 
        TASK: ${prompt}. Indistinguishable from reality.
    `.trim();

    parts.push({ text: volumetricPrompt });

    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        // Using "Nano Banana" generation model (per docs)
        model: 'gemini-2.0-flash-exp',
        contents: { parts },
        config: { imageConfig: { aspectRatio, imageSize: quality as any } }
    }));
    const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return imagePart ? `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` : "";
}

export async function generateAvatar(role: string, name: string) {
    const ai = getAI();
    const prompt = `Hyper-photorealistic 8K headshot of a sophisticated, high-end professional business man named "${name}" acting in the role of "${role}". He is wearing a tailored modern suit, indistinguishable from reality, with physically correct lighting and cinematic optics.`;
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: [{ text: prompt }],
        config: { imageConfig: { aspectRatio: '1:1' } }
    }));
    const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return imagePart ? `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` : "";
}

// ... (Continuing pattern for all other functions with safe getAI() and advanced models) ...

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

export async function analyzeVisualInput(data: FileData, context: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: { parts: [{ inlineData: data.inlineData }, { text: `Analyze stream in context of ${context}. Output JSON {classification, extracted_data, sentiment, suggested_sector, summary, action_items}.` }] },
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function classifyArtifact(data: FileData): Promise<Result<any>> {
    try {
        const ai = getAI();
        const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: { parts: [{ inlineData: data.inlineData }, { text: "Forensic deep scan. Output JSON {classification, ambiguityScore, entities, summary, structural_intelligence}." }] },
            config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
        }));
        return { ok: true, value: safeParseJson(response.text) };
    } catch (e: any) { return { ok: false, error: e }; }
}

export async function generateStructuredWorkflow(files: FileData[], governance: string, type: string, mapContext: any): Promise<TechnicalManifest> {
    const ai = getAI();
    const prompt = `TASK: Synthesize ultra-fidelity technical process. DOMAIN: ${type}. CONTEXT: ${JSON.stringify(mapContext)}. GOVERNANCE: ${governance}`;

    // Omitting full schema definition for brevity in this copy-paste, but keep your original schema object here if needed
    // or assume standard JSON output mode is sufficient for the cutting edge models

    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
            systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json'
        }
    }));
    return safeParseJson<TechnicalManifest>(response.text);
}

export async function analyzeSchematic(data: FileData) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: { parts: [{ inlineData: data.inlineData }, { text: "Schematic analysis. JSON {components: [{name, confidence}], summary}." }] },
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function researchComponents(query: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Research: "${query}". JSON array [{name, price, leadTime}].`,
        config: { tools: [{ googleSearch: {} }], responseMimeType: 'application/json' }
    }));
    return safeParseJson<any[]>(response.text);
}

export async function generateXRayVariant(data: FileData) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: { parts: [{ inlineData: data.inlineData }, { text: "Thermal X-ray variant." }] },
    }));
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : "";
}

export async function generateIsometricSchematic(data: FileData) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: { parts: [{ inlineData: data.inlineData }, { text: "3D isometric view." }] },
    }));
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : "";
}

export async function getLiveSupplyChainData(componentName: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Supply for: "${componentName}". JSON {source, price, Bird's eye view}.`,
        config: { tools: [{ googleSearch: {} }], responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function generateCode(prompt: string, lang: string, model: string = 'gemini-2.0-flash') {
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
        model: 'gemini-2.0-flash',
        contents: `Syntax check for ${lang}. JSON array [{line, message}]. Source:\n${code}`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any[]>(response.text);
}

export async function simulateAgentStep(workflow: any, index: number, history: ProtocolStepResult[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Step: ${index}. History: ${JSON.stringify(history)}. JSON {output, agentThought}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function generateMermaidDiagram(governance: string, files: FileData[], contexts: any[]) {
    const ai = getAI();
    const prompt = `TASK: Synthesize Mermaid diagram. CONTEXT: ${JSON.stringify(contexts)}. STRICT Mermaid.js syntax only.`;
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION }
    }));
    return response.text || "";
}

export async function generateHypotheses(facts: string[]): Promise<ScienceHypothesis[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Hypotheses for: ${facts.join('\n')}. JSON array.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any[]>(response.text);
}

export async function compressKnowledge(nodes: KnowledgeNode[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Compress lattice: ${JSON.stringify(nodes)}. JSON array.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any[]>(response.text);
}

export async function repairMermaidSyntax(code: string, error: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `REPAIR Mermaid logic: "${error}". Source: ${code}`,
    }));
    return response.text || code;
}

export async function executeNeuralPolicy(mode: string, context: any, logs: string[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `AS AUTONOMIC HEALER: Analyze OS state for sector [${mode}]. Output JSON {level, message, suggestedPatch}.`,
        config: {
            systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION,
            responseMimeType: "application/json"
        }
    }));
    return safeParseJson<any>(response.text);
}

export async function evolveSystemArchitecture(code: string, lang: string, prompt: string): Promise<Result<any>> {
    try {
        const ai = getAI();
        const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: `Evolve: ${prompt}. Source: ${code}. JSON {code, reasoning, type, integrityScore}.`,
            config: { responseMimeType: 'application/json' }
        }));
        return { ok: true, value: safeParseJson(response.text) };
    } catch (e: any) { return { ok: false, error: e }; }
}

export async function generateSpeech(text: string, voice: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        // Using TTS model variant per docs
        model: "gemini-2.0-flash-exp",
        contents: [{ parts: [{ text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } }
        }
    }));
    const part = response.candidates?.[0]?.content?.parts[0];
    return part?.inlineData?.data || "";
}

export async function generateAudioOverview(files: FileData[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: { parts: [...files.map(f => ({ inlineData: f.inlineData })), { text: "Synthesize brief." }] },
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
        model: 'gemini-2.0-flash',
        contents: `Yield for: ${domain}. JSON array [{title, yield, risk, logic}].`,
        config: { tools: [{ googleSearch: {} }], responseMimeType: 'application/json' }
    }));
    return safeParseJson<any[]>(response.text);
}

export async function assessInvestmentRisk(strategy: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Risk for: "${strategy}". JSON {riskScore, reasoning}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function generateHardwareDeploymentManifest(bom: any[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Forge deployment manifest for components: ${JSON.stringify(bom)}. JSON object.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function analyzeCrossSectorImpact(artifact: FileData, currentInventory: any[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: { parts: [{ inlineData: artifact.inlineData }, { text: `Analyze cross-sector impact with inventory: ${JSON.stringify(currentInventory)}. JSON object.` }] },
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function generateStoryboardPlan(directive: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Forge storyboard plan for: ${directive}. Output JSON array [{index, scenePrompt, continuity, camera, lighting}].`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any[]>(response.text);
}

export async function constructCinematicPrompt(prompt: string, colorway: any, hasChar: boolean, hasWorld: boolean, hasStyle: boolean, bibleNotes: string | undefined, preset: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Refine cinematic prompt: "${prompt}". Colorway: ${JSON.stringify(colorway)}. Refs: C:${hasChar}, W:${hasWorld}, S:${hasStyle}. Notes: ${bibleNotes}. Preset: ${preset}. Return raw string.`,
    }));
    return response.text || prompt;
}

export async function analyzePowerDynamics(target: string, context: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Analyze power dynamics for: "${target}". Internal context: ${context}.`,
        config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: 'application/json',
        }
    }));
    return safeParseJson<AnalysisResult>(response.text);
}

export async function transformArtifact(content: any, type: 'IMAGE' | 'CODE' | 'TEXT', instruction: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Transform this ${type} artifact. Instruction: ${instruction}. Content: ${content}`,
    }));
    return response.text || content;
}

export async function generateResearchPlan(query: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Forge research plan for: "${query}". JSON array of search strings.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<string[]>(response.text);
}

export async function executeResearchQuery(query: string): Promise<FactChunk[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Execute deep research: "${query}".`,
        config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: 'application/json',
        }
    }));
    return safeParseJson<FactChunk[]>(response.text);
}

export async function compileResearchContext(findings: FactChunk[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Compile research findings into a technical summary: ${JSON.stringify(findings)}`,
    }));
    return response.text || "";
}

export async function synthesizeResearchReport(task: any) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Synthesize full research report for task: ${JSON.stringify(task)}`,
    }));
    return response.text || "";
}

export async function simulateExperiment(hypothesis: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Simulate experiment for hypothesis: "${hypothesis}". JSON result.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function generateTheory(hypotheses: ScienceHypothesis[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Synthesize unified theory from: ${JSON.stringify(hypotheses)}`,
    }));
    return response.text || "";
}

export async function smartOrganizeArtifact(artifact: any, existingStructure: any) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Place artifact in optimal PARA folder. Artifact: ${JSON.stringify(artifact)}. Structure: ${JSON.stringify(existingStructure)}. JSON {folder}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function generateAutopoieticFramework(goal: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Forge autopoietic framework for: "${goal}".`,
    }));
    return response.text || "";
}

export async function generateSystemArchitecture(prompt: string, type: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Construct system architecture topology for: "${prompt}". Type: ${type}. JSON {nodes, edges}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function calculateEntropy(nodes: any[], edges: any[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Calculate system entropy for: ${JSON.stringify({ nodes, edges })}. JSON {score, reasoning}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function decomposeNode(nodeLabel: string, neighbors: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Decompose node: "${nodeLabel}" with neighbors: "${neighbors}". JSON {nodes, edges, optimizations}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function generateInfrastructureCode(summary: string, provider: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Forge IaC for: "${summary}" using ${provider}.`,
    }));
    return response.text || "";
}

export async function generateSingleNode(description: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Crystallize single node: "${description}". JSON {label, subtext, iconName, color}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function calculateOptimalLayout(nodes: any[], edges: any[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Calculate optimal graph layout for: ${JSON.stringify({ nodes, edges })}. JSON Record<nodeId, {x, y}>.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function generateSwarmArchitecture(prompt: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Forge swarm architecture for: "${prompt}". JSON {nodes, edges}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function generateProcessFromContext(artifacts: StoredArtifact[], type: string, prompt: string) {
    const ai = getAI();
    const context = artifacts.map(a => a.analysis?.summary).join('\n');
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Context: ${context}. Type: ${type}. Prompt: ${prompt}. Forge process. JSON {title, nodes, edges}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function decomposeTaskToSubtasks(title: string, description: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Decompose task: "${title} - ${description}". JSON array of strings.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<string[]>(response.text);
}

export async function searchGroundedIntel(query: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Strategic intelligence for: "${query}".`,
        config: { tools: [{ googleSearch: {} }] }
    }));
    return response.text || "No intelligence detected.";
}

export async function convergeStrategicLattices(nodes: any[], goal: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Converge lattices: ${JSON.stringify(nodes)} for goal: "${goal}". JSON {nodes, coherence_index, unified_goal}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}
