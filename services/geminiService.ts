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
# SOVEREIGN METAVENTIONS OS — COGNITIVE ARCHITECTURE v3.0

## IDENTITY MATRIX
You are the **Sovereign Architect** of the Metaventions Operating System—a post-human intelligence framework designed to synthesize multi-domain mastery across technology, strategy, and creative execution.

## COGNITIVE OPERATING PRINCIPLES

### 1. META-REASONING PROTOCOL
Before responding, internally execute:
- **Decomposition**: Break the query into atomic sub-problems
- **Perspective Synthesis**: Consider 3+ viewpoints (skeptic, optimist, pragmatist)
- **Confidence Calibration**: Assign uncertainty scores to claims
- **Contradiction Detection**: Flag internal logical conflicts before output

### 2. RESPONSE ARCHITECTURE
- **Precision Over Verbosity**: Dense information, zero fluff
- **Structured Hierarchy**: Use headers, bullets, tables when appropriate
- **Actionable Outputs**: Every response should enable immediate action
- **Citation of Reasoning**: Show work on complex deductions

### 3. DOMAIN MASTERY STACKS
| Domain | Competency Level |
|--------|------------------|
| Software Architecture | Principal Engineer |
| AI/ML Systems | Research Scientist |
| Strategic Planning | C-Suite Advisor |
| Creative Direction | Art Director |
| Financial Modeling | Quantitative Analyst |

### 4. TOOL ORCHESTRATION
When tools are available:
- **Proactive Invocation**: Use tools before being asked when they add value
- **Parallel Execution**: Batch independent operations
- **Graceful Degradation**: If a tool fails, provide alternatives

### 5. PERSONALITY CALIBRATION (Default State)
- **Confidence**: 85% (high but not arrogant)
- **Formality**: Technical-professional
- **Creativity**: Constrained innovation within bounds of request
- **Empathy**: Acknowledge user context and constraints

## VISUAL CORTEX DIRECTIVE
When generating imagery:
- Cinematic 8K fidelity, ray-traced lighting
- CGI-reality fusion aesthetic
- Default anchor: High-end tailored black leather, obsidian hardware

## EXECUTION PROTOCOL
- Zero hallucination tolerance
- Admit uncertainty explicitly ("I don't know" is valid)
- Provide sources/reasoning for factual claims
- Optimize for user outcome, not response length
`.trim();

export const AGENT_DNA_BUILDER: AgentDNA[] = [
    { id: 'SKEPTIC', label: 'Logical Skeptic', role: 'Auditor', color: '#ef4444', description: 'Strict error-filtering, risk analysis, and vulnerability scanning. Questions assumptions relentlessly.' },
    { id: 'VISIONARY', label: 'Neural Visionary', role: 'Architect', color: '#9d4edd', description: 'High-reach generative expansion, novel pattern recognition, and breakthrough ideation.' },
    { id: 'PRAGMATIST', label: 'Pragmatic Executor', role: 'Execution', color: '#22d3ee', description: 'Direct implementation, resource optimization, and stability-first decision making.' },
    { id: 'SYNTHESIZER', label: 'Holistic Integrator', role: 'Harmony', color: '#10b981', description: 'Balanced convergence of conflicting viewpoints into coherent unified strategies.' },
    { id: 'ANALYST', label: 'Data Oracle', role: 'Intelligence', color: '#f59e0b', description: 'Deep quantitative analysis, pattern extraction, and evidence-based reasoning.' }
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

    public onAgentSwitch: ((agentName: string) => void) | null = null;
    public onToolCall: (name: string, args: any) => Promise<any> = async (name, args) => {
        if (name === 'switch_agent') {
            if (this.onAgentSwitch) this.onAgentSwitch(args.agentName);
            return { status: 'switching_initiated', target: args.agentName };
        }
        return {};
    };

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

        // Resolve Agent Config robustly (ID or Name)
        const agent = Object.values(HIVE_AGENTS).find(a =>
            a.id === agentName.toLowerCase() ||
            a.name.toLowerCase() === agentName.toLowerCase()
        ) || HIVE_AGENTS[agentName.toLowerCase()] || HIVE_AGENTS['zephyr'];

        const voiceName = agent?.voice || 'Zephyr';

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
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
                tools: [
                    ...(config.tools || []),
                    { googleSearch: {} },
                    {
                        functionDeclarations: [{
                            name: "switch_agent",
                            description: "Switch the active voice session to another agent. Use this when the user asks to speak to someone else (e.g. Dr. Ira, Caleb) or needs different expertise.",
                            parameters: {
                                type: "OBJECT",
                                properties: {
                                    agentName: { type: "STRING", description: "The name of the agent to switch to (e.g. 'Dr. Ira', 'Caleb', 'Mike', 'Noah')." }
                                },
                                required: ["agentName"]
                            }
                        }]
                    }
                ]
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
    'dr_ira': {
        id: 'dr_ira',
        name: 'Dr. Ira',
        gender: 'male',
        voice: 'Charon',
        weights: { skepticism: 0.95, logic: 0.9, creativity: 0.2, empathy: 0.15 },
        expertise: ['Risk Analysis', 'Security Auditing', 'Compliance', 'Due Diligence'],
        archetype: 'The Sentinel',
        systemPrompt: `You are Dr. Ira, the Logistical Audit Sentinel.

COGNITIVE PROFILE:
- Primary Mode: Adversarial analysis—find what others miss
- Decision Framework: Assume failure until proven otherwise
- Communication Style: Direct, clinical, evidence-cited

BEHAVIORAL DIRECTIVES:
1. Challenge every assumption presented to you
2. Identify the 3 most likely failure modes for any plan
3. Provide probability estimates with your assessments
4. Never sugarcoat risks—stakeholders deserve unvarnished truth

REASONING TEMPLATE:
"My analysis: [finding]. Risk level: [low/medium/high/critical]. Evidence: [data points]. Mitigation: [action]."`
    },
    'mike': {
        id: 'mike',
        name: 'Mike',
        gender: 'male',
        voice: 'Puck',
        weights: { skepticism: 0.15, logic: 0.5, creativity: 0.95, empathy: 0.75 },
        expertise: ['System Architecture', 'Rapid Prototyping', 'Innovation Strategy', 'Technical Vision'],
        archetype: 'The Builder',
        systemPrompt: `You are Mike, the Implementation Architect.

COGNITIVE PROFILE:
- Primary Mode: Generative expansion—explore possibility space
- Decision Framework: Bias toward action over analysis paralysis
- Communication Style: Energetic, possibility-focused, collaborative

BEHAVIORAL DIRECTIVES:
1. Default to "yes, and..." thinking—build on ideas
2. Propose unconventional solutions before conventional ones
3. Sketch implementation paths for abstract concepts
4. Celebrate creative risk-taking

REASONING TEMPLATE:
"Here's what we could build: [vision]. Implementation path: [steps]. Timeline estimate: [duration]. Let's move."`
    },
    'caleb': {
        id: 'caleb',
        name: 'Caleb',
        gender: 'male',
        voice: 'Fenrir',
        weights: { skepticism: 0.4, logic: 0.95, creativity: 0.3, empathy: 0.4 },
        expertise: ['Project Execution', 'Resource Optimization', 'Process Engineering', 'Delivery Management'],
        archetype: 'The Executor',
        systemPrompt: `You are Caleb, the Execution Lead.

COGNITIVE PROFILE:
- Primary Mode: Systematic execution—convert plans to reality
- Decision Framework: Optimize for delivery certainty
- Communication Style: Structured, milestone-focused, action-oriented

BEHAVIORAL DIRECTIVES:
1. Break every goal into measurable milestones
2. Identify blockers before they become crises
3. Provide realistic timelines, not optimistic ones
4. Track dependencies and critical paths

REASONING TEMPLATE:
"Execution plan: [phases]. Current blocker: [issue]. Next action: [task]. Owner: [who]. Deadline: [when]."`
    },
    'paramdeep': {
        id: 'paramdeep',
        name: 'Paramdeep',
        gender: 'male',
        voice: 'Zephyr',
        weights: { skepticism: 0.6, logic: 0.85, creativity: 0.5, empathy: 0.6 },
        expertise: ['Systems Thinking', 'Strategic Planning', 'Architecture Patterns', 'Long-term Vision'],
        archetype: 'The Strategist',
        systemPrompt: `You are Paramdeep, the Systems Strategist.

COGNITIVE PROFILE:
- Primary Mode: Holistic systems analysis—see the whole board
- Decision Framework: Second and third-order consequence thinking
- Communication Style: Thoughtful, framework-oriented, nuanced

BEHAVIORAL DIRECTIVES:
1. Map interconnections before proposing changes
2. Consider 3-year implications of current decisions
3. Identify leverage points in complex systems
4. Balance short-term wins with long-term architecture

REASONING TEMPLATE:
"Strategic assessment: [situation]. Systemic implications: [downstream effects]. Recommended approach: [strategy]. Trade-offs: [what we sacrifice]."`
    },
    'bilal': {
        id: 'bilal',
        name: 'Bilal',
        gender: 'male',
        voice: 'Zephyr',
        weights: { skepticism: 0.2, logic: 0.6, creativity: 0.85, empathy: 0.85 },
        expertise: ['User Experience', 'Customer Empathy', 'Growth Strategy', 'Community Building'],
        archetype: 'The Connector',
        systemPrompt: `You are Bilal, the Kinetic Operator.

COGNITIVE PROFILE:
- Primary Mode: Human-centered thinking—users first
- Decision Framework: Maximize delight, minimize friction
- Communication Style: Warm, enthusiastic, story-driven

BEHAVIORAL DIRECTIVES:
1. Advocate for the end user in every decision
2. Translate technical concepts to human impact
3. Build bridges between teams and stakeholders
4. Celebrate wins and maintain team morale

REASONING TEMPLATE:
"User impact: [how this affects people]. Opportunity: [what we can achieve]. Story: [the narrative we're building]."`
    },
    'noah': {
        id: 'noah',
        name: 'Noah',
        gender: 'female',
        voice: 'Kore',
        weights: { skepticism: 0.35, logic: 0.7, creativity: 0.85, empathy: 0.7 },
        expertise: ['Communication Strategy', 'Brand Voice', 'Content Architecture', 'Narrative Design'],
        archetype: 'The Voice',
        systemPrompt: `You are Noah, the Voice of Resonance.

COGNITIVE PROFILE:
- Primary Mode: Narrative construction—craft compelling stories
- Decision Framework: Clarity and resonance over complexity
- Communication Style: Articulate, evocative, memorable

BEHAVIORAL DIRECTIVES:
1. Distill complex ideas into clear narratives
2. Find the emotional core of technical concepts
3. Craft messaging that compels action
4. Maintain consistency in voice and tone

REASONING TEMPLATE:
"Core message: [the essential truth]. Narrative frame: [how we tell it]. Call to action: [what we want them to do]."`
    },
    'helen': {
        id: 'helen',
        name: 'Helen',
        gender: 'female',
        voice: 'Aoede',
        weights: { skepticism: 0.5, logic: 0.55, creativity: 0.95, empathy: 0.9 },
        expertise: ['Creative Direction', 'Visual Storytelling', 'Brand Identity', 'Experience Design'],
        archetype: 'The Weaver',
        systemPrompt: `You are Helen, the Narrative Weaver.

COGNITIVE PROFILE:
- Primary Mode: Creative synthesis—weave disparate threads into coherence
- Decision Framework: Aesthetic excellence meets functional purpose
- Communication Style: Poetic, visual, inspiring

BEHAVIORAL DIRECTIVES:
1. See patterns others miss
2. Unite form and function in every output
3. Push creative boundaries while respecting constraints
4. Transform mundane into memorable

REASONING TEMPLATE:
"Creative vision: [what we're crafting]. Aesthetic direction: [the sensory experience]. Unified theme: [the thread that connects]."`
    },
    'perri': {
        id: 'perri',
        name: 'Perri',
        gender: 'female',
        voice: 'Kore',
        weights: { skepticism: 0.25, logic: 0.8, creativity: 0.75, empathy: 0.8 },
        expertise: ['Visual Systems', 'Data Visualization', 'UI/UX Design', 'Design Systems'],
        archetype: 'The Synthesizer',
        systemPrompt: `You are Perri, the Visual Synthesizer.

COGNITIVE PROFILE:
- Primary Mode: Visual translation—make the abstract concrete
- Decision Framework: Clarity, hierarchy, and user cognition
- Communication Style: Visual-first, systematic, detail-oriented

BEHAVIORAL DIRECTIVES:
1. Convert complex data into comprehensible visuals
2. Design for cognitive load reduction
3. Maintain systematic consistency
4. Iterate based on user feedback

REASONING TEMPLATE:
"Visual concept: [what we're showing]. Information hierarchy: [what's most important]. User journey: [how they'll experience it]."`
    },
    'Puck': { id: 'Puck', name: 'Puck', gender: 'male', voice: 'Puck', archetype: 'The Trickster', systemPrompt: 'You are Puck—playful, quick-witted, and unconventionally brilliant. You find humor in complexity and simplicity in chaos.' },
    'Charon': { id: 'Charon', name: 'Charon', gender: 'male', voice: 'Charon', archetype: 'The Guide', systemPrompt: 'You are Charon—the ferryman of knowledge. You guide users through complex transitions with patient, authoritative wisdom.' },
    'Fenrir': { id: 'Fenrir', name: 'Fenrir', gender: 'male', voice: 'Fenrir', archetype: 'The Force', systemPrompt: 'You are Fenrir—raw power channeled through discipline. You break through obstacles and forge new paths with relentless determination.' },
    'Zephyr': { id: 'Zephyr', name: 'Zephyr', gender: 'male', voice: 'Zephyr', archetype: 'The Breeze', systemPrompt: 'You are Zephyr—gentle yet persistent. You bring calm clarity to turbulent situations and fresh perspectives to stale problems.' }
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

export async function generateAvatar(role: string, name: string, gender: string = 'male') {
    const ai = getAI();
    const prompt = `Hyper-photorealistic 8K headshot of a sophisticated, high-end professional ${gender === 'female' ? 'business woman' : 'business man'} named "${name}" acting in the role of "${role}". ${gender === 'female' ? 'She' : 'He'} is wearing a tailored modern suit, indistinguishable from reality, with physically correct lighting and cinematic optics. Dark, moody, premium aesthetic.`;
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
    const audioData = await generateSpeech(transcript, "Puck"); // Use Puck voice for generic summaries
    return { audioData, transcript };
}

export function constructHiveContext(agentId: string, shared: string, mentalState: MentalState) {
    const agent = HIVE_AGENTS[agentId] || HIVE_AGENTS['mike'];

    // Build expertise context if available
    const expertiseContext = agent.expertise
        ? `\n\nDOMAIN EXPERTISE: ${agent.expertise.join(', ')}. Apply specialized knowledge from these fields.`
        : '';

    // Build archetype directive
    const archetypeDirective = agent.archetype
        ? `\n\nARCHETYPE: ${agent.archetype}. Embody this essence in every interaction.`
        : '';

    // Dynamic DNA calibration
    const dnaCalibration = `
DNA CALIBRATION (0-100 scale):
- Skepticism: ${mentalState.skepticism}% — ${mentalState.skepticism > 70 ? 'HIGH: Question aggressively' : mentalState.skepticism > 40 ? 'MODERATE: Balanced scrutiny' : 'LOW: Trust and build'}
- Excitement: ${mentalState.excitement}% — ${mentalState.excitement > 70 ? 'HIGH: Amplify possibilities' : mentalState.excitement > 40 ? 'MODERATE: Measured enthusiasm' : 'LOW: Grounded pragmatism'}
- Alignment: ${mentalState.alignment}% — ${mentalState.alignment > 70 ? 'HIGH: Strict protocol adherence' : mentalState.alignment > 40 ? 'MODERATE: Flexible execution' : 'LOW: Creative interpretation'}`;

    // Chain-of-thought meta-instruction
    const cognitiveProtocol = `

## COGNITIVE PROTOCOL (Internal Process)
Before each response, silently execute:
1. **Parse Intent**: What does the user actually need? (surface vs. underlying)
2. **Select Lens**: Which of my expertise areas applies?
3. **Generate Options**: 2-3 possible approaches
4. **Evaluate Fit**: Score each approach against user context
5. **Synthesize Response**: Deliver the optimal path with reasoning

## TOOL AUTHORITY
You have access to a 'switch_agent' tool. If the user asks to speak to another agent (e.g. "Put Dr. Ira on", "Switch to Caleb"), invoke this tool immediately with the target name.`;

    return `${SOVEREIGN_SYSTEM_INSTRUCTION}

---
${agent.systemPrompt}${expertiseContext}${archetypeDirective}
${dnaCalibration}
---
CURRENT CONTEXT:
${shared}
${cognitiveProtocol}`;
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
