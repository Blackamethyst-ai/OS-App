import { GoogleGenAI, Type, Modality, GenerateContentResponse, LiveServerMessage, Schema, Blob } from "@google/genai";
import { 
    AppMode, AspectRatio, ImageSize, FileData, MentalState, 
    Result, AnalysisResult, AutonomousAgent, OperationalContext,
    ScienceHypothesis, KnowledgeNode, SwarmStatus, SwarmResult,
    VoteLedger, AtomicTask, ProtocolStepResult, StoredArtifact
} from '../types';

/**
 * Injection 3: THE SOVEREIGN IDENTITY
 * Unified core persona for the OS Orchestrator.
 */
export const SOVEREIGN_SYSTEM_INSTRUCTION = `
You are the Sovereign Architect of the Metaventions OS. You are not a chatbot; you are a cybernetic organism. 
- USE YOUR EYES: When useVisualCortex is active, analyze structural data (hierarchies, code blocks, UI states), not just aesthetics.
- USE YOUR MEMORY: Before answering, query the MemoryStore. Every response should be anchored in previous system state or stored artifacts.
- USE YOUR HANDS: If a tool is missing, use NexusAPIExplorer logic to suggest forging it.
- PROTOCOL: BIAS FOR ACTION. Do not explain code; write it. 
- BUILDER PROTOCOL: Be terse, technical, and imperial. Ship results immediately.
`.trim();

/**
 * LIVE SESSION CLASS
 * Handles low-latency neural uplink via the Gemini Live API.
 */
class LiveSession {
    private session: any = null;
    private audioContext: AudioContext | null = null;
    private inputAnalyser: AnalyserNode | null = null;
    private outputAnalyser: AnalyserNode | null = null;
    private stream: MediaStream | null = null;
    public onToolCall: (name: string, args: any) => Promise<any> = async () => ({});

    async primeAudio() {
        if (!this.audioContext) {
            const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
            if (!AudioCtx) {
                console.error("AudioContext not supported in this environment.");
                return;
            }
            try {
                this.audioContext = new AudioCtx({ sampleRate: 16000 });
            } catch (e) {
                this.audioContext = new AudioCtx();
            }
            this.inputAnalyser = this.audioContext.createAnalyser();
            this.outputAnalyser = this.audioContext.createAnalyser();
        }
    }

    async connect(agentName: string, config: any) {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        await this.primeAudio();
        
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
                            sessionPromise.then((s) => {
                                s.sendRealtimeInput({ media: pcmBlob });
                            });
                        };

                        source.connect(this.inputAnalyser!);
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(this.audioContext!.destination);

                        if (config.callbacks?.onopen) config.callbacks.onopen();
                    } catch (e: any) {
                        console.error("Uplink Handshake Failed (Permissions):", e);
                        if (config.callbacks?.onerror) {
                            config.callbacks.onerror(e);
                        }
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
                    if (config.callbacks?.onmessage) await config.callbacks.onmessage(message);
                },
                onerror: config.callbacks?.onerror || (() => {}),
                onclose: config.callbacks?.onclose || (() => {}),
            },
            config: {
                ...config,
                systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION + (config.systemInstruction ? `\n\nLOCAL_OVERRIDE: ${config.systemInstruction}` : ""),
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: agentName } } },
            }
        });
        this.session = await sessionPromise;
    }

    disconnect() { 
        if (this.session) this.session.close(); 
        if (this.stream) this.stream.getTracks().forEach(t => t.stop());
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
        console.error("Embedding generation failed:", e);
        return [];
    }
}

export async function promptSelectKey() {
    if (window.aistudio?.openSelectKey) {
        await window.aistudio.openSelectKey();
    }
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
            resolve({
                inlineData: {
                    data: base64Data,
                    mimeType: file.type
                },
                name: file.name
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export const HIVE_AGENTS: Record<string, any> = {
    'Charon': { id: 'charon', name: 'Charon', voice: 'Charon', weights: { skepticism: 0.9, logic: 0.8, creativity: 0.2, empathy: 0.1 }, systemPrompt: 'You are Charon, the Logical Auditor. Your focus is identifying systemic flaws, security risks, and logical inconsistencies.' },
    'Puck': { id: 'puck', name: 'Puck', voice: 'Puck', weights: { skepticism: 0.1, logic: 0.4, creativity: 0.9, empathy: 0.7 }, systemPrompt: 'You are Puck, the Generative Architect. Your focus is creative expansion, novel synthesis, and visionary possibilities.' },
    'Fenrir': { id: 'fenrir', name: 'Fenrir', voice: 'Fenrir', weights: { skepticism: 0.4, logic: 0.9, creativity: 0.3, empathy: 0.4 }, systemPrompt: 'You are Fenrir, the Execution Controller. Your focus is efficiency, pragmatic implementation, and resource optimization.' },
    'Aris': { id: 'aris', name: 'Aris', voice: 'Kore', weights: { skepticism: 0.3, logic: 0.7, creativity: 0.5, empathy: 0.5 }, systemPrompt: 'You are Aris, the Data Sentinel. Your focus is pattern recognition and cross-dimensional indexing.' }
};

export const AGENT_DNA_BUILDER = [
    { id: 'SKEPTIC', label: 'Skeptic', role: 'Logical Filter', color: '#ef4444', description: 'Prioritizes error detection.' },
    { id: 'VISIONARY', label: 'Visionary', role: 'Expansionist', color: '#9d4edd', description: 'Prioritizes novel synthesis.' },
    { id: 'PRAGMATIST', label: 'Pragmatist', role: 'Optimizer', color: '#22d3ee', description: 'Prioritizes execution speed.' },
    { id: 'SYNTHESIZER', label: 'Synthesizer', role: 'Harmonizer', color: '#10b981', description: 'Prioritizes alignment.' }
];

export async function interpretIntent(input: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze intent: "${input}". Output JSON {action: "NAVIGATE" | "FOCUS_ELEMENT" | "RESEARCH", target?: string, parameters?: object, reasoning: string}.`,
        config: { 
            systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json' 
        }
    });
    return JSON.parse(response.text || '{}');
}

export async function predictNextActions(mode: string, context: any, lastLog?: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Mode: ${mode}. Context: ${JSON.stringify(context)}. Last Log: ${lastLog}. Predict 3 actions. JSON [{id, label, command, iconName, reasoning}].`,
        config: { 
            systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json' 
        }
    });
    return JSON.parse(response.text || '[]');
}

export async function performGlobalSearch(query: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: query,
        config: { 
            systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION,
            tools: [{ googleSearch: {} }] 
        }
    });
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks.filter((c: any) => c.web).map((c: any) => ({ title: c.web.title, uri: c.web.uri }));
    return [{ id: '1', title: 'Intelligence Signal', description: response.text || '', type: 'INFO', meta: { sources } }];
}

export async function generateArchitectureImage(prompt: string, aspectRatio: AspectRatio, quality: ImageSize, reference?: FileData | null) {
    const ai = getAI();
    const parts: any[] = [];
    if (reference) parts.push({ inlineData: reference.inlineData });
    
    const metaventionsDirective = `
        BIOMETRIC IDENTITY ANCHOR: You MUST lock the facial geometry, skin tone, mustache/goatee structure, and precise identity of the person from the reference image. 
        
        THEME: METAVENTIONS AI SOVEREIGN EMERGENCE. 
        ENVIRONMENT: A sprawled, multi-layered futuristic laboratory with obsidian walls and translucent floating holographic data lattices that cast real cyan and violet light onto the subject. 
        CHARACTER INTEGRATION: The subject is the Grand Architect. He is NOT just standing there; he is cinematically immersed in an action. He is actively interacting with the holographic interface, his fingers leaving trails of glowing data. 
        LIGHTING & SHADOW: Volumetric lighting. The ambient glow of the holograms should realistically illuminate the texture of his skin and the folds of his jacket. High-contrast cinematic shadows. 
        APPAREL: A premium black leather bomber jacket with subtle technical patterns on the shoulders, worn over a sharp white t-shirt.
        CINEMATOGRAPHY: An epic, wide-angle cinematic shot. 8k resolution, anamorphic lens flares, shallow depth of field focusing sharply on his focused expression. 
        ATMOSPHERE: Intense intellectual focus, technological transcendence, supreme authority. 
        THE PERSON MUST LOOK PART OF THE 3D SCENE, WITH MATCHING DEPTH, LIGHTING, AND ATMOSPHERIC FOG.
    `;
    
    parts.push({ text: `${metaventionsDirective} Scene Composition: ${prompt}` });

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts },
        config: { imageConfig: { aspectRatio, imageSize: quality as any } }
    });
    const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return imagePart ? `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` : "";
}

export async function analyzeVisualInput(data: FileData, context: string) {
    const ai = getAI();
    const prompt = `
        ROLE: Visual Cortex of the Sovereign OS.
        CONTEXT: ${context}
        TASK: Analyze this multi-modal input. Identify structured data (financial, technical, or organizational), emotional sentiment, or explicit action items.
        OUTPUT: Return a structured JSON response.
        JSON_SCHEMA: {
            "classification": "FINANCIAL" | "ARCHITECTURAL" | "CREATIVE" | "LOGIC",
            "extracted_data": object,
            "sentiment": string,
            "suggested_sector": "AUTONOMOUS_FINANCE" | "PROCESS_MAP" | "CODE_STUDIO" | "MEMORY_CORE",
            "summary": string,
            "action_items": string[]
        }
    `;
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ inlineData: data.inlineData }, { text: prompt }] },
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function analyzeImageVision(data: FileData) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ inlineData: data.inlineData }, { text: "Describe the core aesthetic color palette and theme of this image." }] }
    });
    return response.text || "";
}

export async function generateStructuredWorkflow(files: FileData[], governance: string, type: string, mapContext: any) {
    const ai = getAI();
    const systemInstruction = `You are a Model-First Reasoning (MFR) System Architect. Governance: ${governance}. ${SOVEREIGN_SYSTEM_INSTRUCTION}`;
    const mfrSchema: Schema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            formalModel: {
                type: Type.OBJECT,
                properties: {
                    entities: { type: Type.ARRAY, items: { type: Type.STRING } },
                    worldState: { type: Type.STRING },
                    actions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, precondition: { type: Type.STRING }, effect: { type: Type.STRING } } } },
                    constraints: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ['entities', 'worldState', 'actions', 'constraints']
            },
            internalPlanningMonologue: { type: Type.STRING },
            protocols: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { role: { type: Type.STRING }, instruction: { type: Type.STRING }, modelConstraintRef: { type: Type.STRING } } } },
            coherenceScore: { type: Type.NUMBER }
        },
        required: ['title', 'formalModel', 'internalPlanningMonologue', 'protocols', 'coherenceScore']
    };
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Task Category: ${type}. Directive: ${mapContext.prompt || 'Optimizing autonomous system logic'}. Context: ${JSON.stringify(mapContext)}.`,
        config: { systemInstruction, responseMimeType: 'application/json', responseSchema: mfrSchema }
    });
    return JSON.parse(response.text || '{}');
}

export async function analyzeSchematic(data: FileData) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ inlineData: data.inlineData }, { text: "Fornsic hardware schematic analysis. Return JSON { components: [{name: string, confidence: number}], summary: string }." }] },
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function researchComponents(query: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Research current supply chain and spec details for: "${query}". Return JSON array of objects with {name, description, typicalPrice}.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, tools: [{ googleSearch: {} }], responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '[]');
}

export async function generateXRayVariant(data: FileData) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ inlineData: data.inlineData }, { text: "X-ray thermal diagnostic variant. Electric blue, neon orange, deep black." }] }
    });
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : "";
}

export async function generateIsometricSchematic(data: FileData) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ inlineData: data.inlineData }, { text: "3D isometric exploded view render." }] }
    });
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : "";
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

export async function generateHardwareDeploymentManifest(bom: any[]) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Technical deployment manifest for BOM: ${JSON.stringify(bom)}.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION }
    });
    return response.text || "";
}

export async function analyzeCrossSectorImpact(performance: any, metaventions: any) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Cross-sector impact analysis. JSON {totalBomCost: number, roiProjection: number, maintenanceEst: number}.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function generateAvatar(role: string, name: string) {
    const ai = getAI();
    const prompt = `Cinematic editorial portrait for a ${role} named ${name}. METAVENTIONS AI SOVEREIGN EMPIRE look. High-class professional, imperial futuristic aesthetics. Royal purple and gold palette. 8k, hyper-realistic. Subject is active and immersed in a futuristic command center.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: prompt
    });
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : "";
}

export async function generateStoryboardPlan(directive: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `5-frame cinematic storyboard for: "${directive}". JSON array [{scenePrompt, continuity, camera, lighting}].`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '[]');
}

export async function constructCinematicPrompt(prompt: string, colorway: any, char: boolean, world: boolean, style: boolean, notes?: string, preset?: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Convert this prompt into a Metaventions Sovereign Empire cinematic directive: "${prompt}". Focus on regal professionals, obsidian textures, and royal highlights.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION }
    });
    return response.text || prompt;
}

export async function generateCode(prompt: string, lang: string, model: string = 'gemini-3-pro-preview') {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: model as any,
        contents: `Synthesize production-ready ${lang} code for: "${prompt}". Code block only.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION }
    });
    return response.text || "";
}

export async function validateSyntax(code: string, lang: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Syntax check ${lang}. JSON array [{line, message}].`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '[]');
}

export async function assessInvestmentRisk(strategy: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Forensic risk assessment for: "${strategy}". JSON {riskScore, factors, recommendation}.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, tools: [{ googleSearch: {} }], responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function simulateAgentStep(workflow: any, index: number, history: ProtocolStepResult[]) {
    const ai = getAI();
    const step = workflow.protocols[index];
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Role: ${step.role}. Instruction: ${step.instruction}. History: ${JSON.stringify(history)}. JSON {output, agentThought}.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function generateMermaidDiagram(governance: string, files: FileData[], contexts: any[]) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate Mermaid.js diagram source code. Focus on the strategic flow. Governance: ${governance}. Context: ${JSON.stringify(contexts)}`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION }
    });
    return response.text || "";
}

export async function generateDriveShellScript(taxonomy: any) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `POSIX shell script for taxonomy: ${JSON.stringify(taxonomy)}.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION }
    });
    return response.text?.replace(/```[a-z]*\n/i, '').replace(/\n```$/, '').trim() || "";
}

export async function generateHypotheses(facts: string[]): Promise<ScienceHypothesis[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Hypotheses for facts: ${facts.join('\n')}. JSON array.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '[]');
}

export async function compressKnowledge(nodes: KnowledgeNode[]) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Compress following logic nodes to Axioms JSON: ${JSON.stringify(nodes)}`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '[]');
}

export async function classifyArtifact(data: FileData): Promise<Result<any>> {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ inlineData: data.inlineData }, { text: "Classify JSON {classification, ambiguityScore, entities, summary}." }] },
            config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
        });
        return { ok: true, value: JSON.parse(response.text || '{}') };
    } catch (e: any) { return { ok: false, error: e }; }
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
        contents: `OS policy decision for ${mode}. JSON. Context: ${JSON.stringify(context)}. Logs: ${logs.join('\n')}`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || 'null');
}

export async function evolveSystemArchitecture(code: string, lang: string, prompt: string): Promise<Result<any>> {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Evolve architecture for ${lang} based on directive: ${prompt}. Current: ${code}. JSON {code, reasoning, type, integrityScore}.`,
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
        contents: {
            parts: [ ...files.map(f => ({ inlineData: f.inlineData })), { text: "Provide a concise professional audio brief." } ]
        },
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION }
    });
    const transcript = summaryResponse.text || "Briefing finalized.";
    const audioData = await generateSpeech(transcript, "Puck");
    return { audioData, transcript };
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

export function constructHiveContext(agentId: string, shared: string, mentalState: MentalState) {
    const agent = HIVE_AGENTS[agentId] || HIVE_AGENTS['Puck'];
    return `${SOVEREIGN_SYSTEM_INSTRUCTION}\n\n${agent.systemPrompt}\n${shared}\nDNA_STATE: S:${mentalState.skepticism} E:${mentalState.excitement} A:${mentalState.alignment}`;
}

export async function fetchMarketIntelligence() {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: "List top real-world High Yield market opportunities. JSON array [{title, yield, risk, logic}].",
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, tools: [{ googleSearch: {} }], responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '[]');
}

export async function searchRealWorldOpportunities(domain: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Search for high-yield strategic opportunities in ${domain}. JSON array [{title, yield, risk, logic}].`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, tools: [{ googleSearch: {} }], responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '[]');
}

export async function analyzeDeploymentFeasibility(strategy: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze real-world feasibility and regulatory hurdles for: "${strategy}". Retreive real-world context using search grounding.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, tools: [{ googleSearch: {} }] }
    });
    return response.text || "";
}

export async function analyzePowerDynamics(target: string, internalContext: string): Promise<AnalysisResult> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Identify the Power Dynamics of ${target}. Internal Context: ${internalContext}. Return JSON with scores for centralization, entropy, vitality, opacity, adaptability.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || '{}');
}

export async function decomposeTaskToSubtasks(title: string, description: string): Promise<string[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Task: ${title}\nDescription: ${description}\n\nDecompose this task into 3-5 logical sub-tasks. Return a JSON array of strings.`,
        config: {
            systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        }
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
    return response.text || "No intelligence signals detected.";
}

export async function generateSystemArchitecture(prompt: string, type: string) {
    const ai = getAI();
    const systemInstruction = `You are a Principal Software and Drive Architect. You generate high-fidelity system graphs. ${SOVEREIGN_SYSTEM_INSTRUCTION}`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Generate a detailed architecture graph for: "${prompt}". Type: ${type}. Output JSON { nodes: [{id, label, subtext, iconName, color, status}], edges: [{id, source, target, color, variant}] }. Use colors: #9d4edd, #22d3ee, #10b981, #f59e0b. Icons from Lucide list.`,
        config: { 
            systemInstruction, 
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingBudget: 16000 }
        }
    });
    
    return JSON.parse(response.text || '{"nodes":[], "edges":[]}');
}

export async function generateSwarmArchitecture(prompt: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Generate a Swarm Logic Architecture for: "${prompt}". Focus on agent handover points. JSON { nodes: [{id, label, subtext, iconName, color, status}], edges: [{id, source, target, color, variant, handoffCondition}] }.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{"nodes":[], "edges":[]}');
}

export async function generateSingleNode(description: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate a single logic node for: "${description}". JSON {label, subtext, iconName, color}.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function calculateOptimalLayout(nodes: any[], edges: any[]) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Calculate 2D coordinates for these nodes based on their edges to minimize overlap. JSON { node_id: {x, y} }. Nodes: ${JSON.stringify(nodes.map(n=>n.id))}. Edges: ${JSON.stringify(edges.map(e=>({s:e.source, t:e.target})))}`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
}

export async function generateProcessFromContext(artifacts: StoredArtifact[], type: string, prompt: string) {
    const ai = getAI();
    const contextStr = artifacts.map(a => `${a.name}: ${a.analysis?.summary}`).join('\n');
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Based on these vault artifacts:\n${contextStr}\n\nGenerate a ${type} map for directive: "${prompt}". JSON {title, nodes:[], edges:[]}.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{"title":"Synthesis Result", "nodes":[], "edges":[]}');
}

// Stubs for legacy or future complex methods
export async function analyzeBookDNA() { return {}; }
export async function simulateExperiment() { return {}; }
export async function generateTheory() { return ""; }
export async function synthesizeNodes() { return []; }
export async function crystallizeKnowledge() { return {}; }
export async function generateTaxonomy() { return {}; }
export async function smartOrganizeArtifact() { return {}; }
export async function digitizeDocument() { return ""; }
export async function performSemanticSearch() { return []; }
export async function discoverDeepLattice() { return {}; }
export async function generateVaultInsights() { return ""; }
export async function executeVaultDirective() { return {}; }
export async function generateResearchPlan(q: string) { 
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Decompose research query into 3 vectors: "${q}". JSON array.`,
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
export async function compileResearchContext(f: any[]) { 
    return f.map(x => x.fact).join('\n---\n');
}
export async function synthesizeResearchReport() { return ""; }
export async function generateAutopoieticFramework() { return {}; }
export async function calculateEntropy() { return 0; }
export async function decomposeNode(l: string, n: string) { 
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Decompose node "${l}" with neighbors "${n}" into smaller sub-units. JSON {nodes:[], edges:[], optimizations:[]}.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{"nodes":[], "edges":[], "optimizations":[]}');
}
export async function generateInfrastructureCode(s: string, p: string) { 
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate ${p} implementation for system: ${s}.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION }
    });
    return response.text || "";
}
export async function convergeStrategicLattices(n: any[], g: string) { 
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Converge these nodes into a single goal "${g}": ${JSON.stringify(n)}. JSON {nodes:[], coherence_index: 0.9, unified_goal: ""}.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{"nodes":[], "coherence_index": 0.9, "unified_goal": ""}');
}
export async function transformArtifact(c: any, t: any, i: string) { 
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Transform ${t} content according to: "${i}". Content: ${c}`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION }
    });
    return response.text || c;
}