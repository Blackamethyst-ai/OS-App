import { GoogleGenAI, Type, Schema, FunctionDeclaration, LiveServerMessage, Modality } from "@google/genai";
import { AspectRatio, ImageSize, AnalysisResult, BookDNA, AutopoieticFramework, ComponentRecommendation, ArtifactAnalysis, UserIntent, ArtifactNode, FileData, SearchResultItem, GovernanceSchema, SystemWorkflow, SuggestedAction, AppMode } from '../types';

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function promptSelectKey() {
    if ((window as any).aistudio) {
        await (window as any).aistudio.openSelectKey();
    } else {
        console.warn("AI Studio interface not found in window");
    }
}

export async function fileToGenerativePart(file: File): Promise<FileData> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            const base64Data = base64String.split(',')[1];
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

export async function interpretIntent(input: string): Promise<UserIntent> {
  const ai = getAI();
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      action: { 
        type: Type.STRING, 
        enum: ['NAVIGATE', 'CONFIGURE_GOVERNANCE', 'CONFIGURE_IMAGE', 'ANALYZE_POWER', 'GENERATE_CODE', 'HARDWARE_SEARCH', 'ACTIVATE_VOICE'] 
      },
      target: { type: Type.STRING },
      parameters: { 
        type: Type.OBJECT, 
        properties: {
            targetSystem: {type: Type.STRING},
            constraintLevel: {type: Type.STRING},
            outputTopology: {type: Type.STRING},
            aspectRatio: {type: Type.STRING},
            size: {type: Type.STRING},
            prompt: {type: Type.STRING},
            query: {type: Type.STRING},
            language: {type: Type.STRING},
            voiceName: {type: Type.STRING}
        }
      },
      reasoning: { type: Type.STRING },
      payload: { type: Type.STRING }
    },
    required: ['action', 'reasoning']
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Interpret the user's intent from the following input: "${input}"`,
    config: { responseMimeType: 'application/json', responseSchema: schema }
  });

  return JSON.parse(response.text || "{}");
}

export async function predictNextActions(currentMode: AppMode, contextData: any = {}, lastLog?: string): Promise<SuggestedAction[]> {
    const ai = getAI();
    const schema: Schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING },
                label: { type: Type.STRING },
                command: { type: Type.STRING },
                reasoning: { type: Type.STRING },
                iconName: { type: Type.STRING }
            },
            required: ['id', 'label', 'command', 'reasoning', 'iconName']
        }
    };

    const prompt = `
    Analyze the current user state and suggest 3 high-value next actions or commands.
    
    CONTEXT:
    - App Mode: ${currentMode}
    - Recent System Log: "${lastLog || 'None'}"
    - Active State Data: ${JSON.stringify(contextData)}
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: schema }
    });

    return JSON.parse(response.text || "[]");
}

export async function repairMermaidSyntax(code: string, error: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Fix the following Mermaid JS code which produced this error: "${error}".\n\nCode:\n${code}\n\nReturn only the fixed code block.`,
    });
    let text = response.text || "";
    text = text.replace(/```mermaid/g, '').replace(/```/g, '').trim();
    return text;
}

export async function analyzeSchematic(image: FileData): Promise<any> {
    const ai = getAI();
    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            powerRails: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { voltage: { type: Type.STRING }, source: { type: Type.STRING }, category: { type: Type.STRING }, status: { type: Type.STRING } } } },
            issues: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, severity: { type: Type.STRING }, location: { type: Type.STRING }, description: { type: Type.STRING }, recommendation: { type: Type.STRING } } } },
            efficiencyRating: { type: Type.NUMBER }
        }
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [image, { text: "Analyze this electronic schematic. Identify power rails, potential issues, and efficiency rating." }] },
        config: { responseMimeType: 'application/json', responseSchema: schema }
    });
    return JSON.parse(response.text || "{}");
}

export async function researchComponents(query: string): Promise<ComponentRecommendation[]> {
    const ai = getAI();
    const schema: Schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                partNumber: { type: Type.STRING },
                manufacturer: { type: Type.STRING },
                description: { type: Type.STRING },
                reasoning: { type: Type.STRING },
                specs: { type: Type.OBJECT, properties: { "Lead Time": {type: Type.STRING}, "Stock Status": {type: Type.STRING}, "Buy Link": {type: Type.STRING} } }
            }
        }
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Research electronic components for query: "${query}". Provide 5 recommendations with specs.`,
        config: { responseMimeType: 'application/json', responseSchema: schema, tools: [{ googleSearch: {} }] }
    });
    return JSON.parse(response.text || "[]");
}

export async function generateXRayVariant(image: FileData): Promise<string> {
    const ai = getAI();
    // Simulate X-Ray by asking for a description or just using generation (since we can't edit images easily with just text models, we'll use generation)
    // Actually, we can use gemini-2.5-flash-image for editing if supported, but here we'll generate a new image based on the prompt.
    // For demo purposes, we will return a placeholder or generate a new image description.
    // Since we need an image URL, we will use a text prompt to generate an image if possible, or mock it.
    // Let's use image generation model.
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image', // Using flash-image for editing/generation
        contents: { parts: [image, { text: "Generate an X-Ray view of this device, showing internal components in blue and purple neon style." }] }
    });
    // Currently the API returns base64 in inlineData for image gen models? 
    // The guidelines say for `generateImages` (Imagen) it returns `generatedImages`.
    // For `gemini-2.5-flash-image`, it returns `GenerateContentResponse`.
    // We iterate parts to find image.
    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    throw new Error("No image generated");
}

export async function generateIsometricSchematic(image: FileData): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [image, { text: "Generate a 3D isometric diagram of this schematic, focusing on topological structure. High-tech, dark mode style." }] }
    });
    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    throw new Error("No image generated");
}

export async function generateArchitectureImage(prompt: string, aspectRatio: string, size: string, referenceImage?: FileData): Promise<string> {
    const ai = getAI();
    const model = 'gemini-2.5-flash-image'; 
    // Note: 'gemini-3-pro-image-preview' supports size, but for reliability we default to flash-image or use pro if size is critical.
    // Guidelines say use 'gemini-3-pro-image-preview' for high quality.
    
    const contents = referenceImage 
        ? { parts: [referenceImage, { text: prompt }] } 
        : prompt;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: contents as any,
        config: {
            imageConfig: {
                aspectRatio: aspectRatio as any,
                imageSize: size as any
            }
        }
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    throw new Error("No image generated");
}

export async function analyzePowerDynamics(target: string): Promise<AnalysisResult> {
    const ai = getAI();
    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            sustainer: { type: Type.STRING },
            destroyer: { type: Type.STRING },
            extractor: { type: Type.STRING },
            insight: { type: Type.STRING },
            scores: { type: Type.OBJECT, properties: { centralization: { type: Type.NUMBER }, entropy: { type: Type.NUMBER }, vitality: { type: Type.NUMBER }, opacity: { type: Type.NUMBER }, adaptability: { type: Type.NUMBER } } },
            vectors: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { mechanism: { type: Type.STRING }, vulnerability: { type: Type.STRING } } } }
        }
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Analyze the power dynamics of: "${target}". Identify the Sustainer, Destroyer, and Extractor forces.`,
        config: { responseMimeType: 'application/json', responseSchema: schema, tools: [{ googleSearch: {} }] }
    });
    return JSON.parse(response.text || "{}");
}

export async function generateMermaidDiagram(governance: any, files: FileData[], context: any[]): Promise<string> {
    const ai = getAI();
    const prompt = `
    Generate a Mermaid JS diagram code block (flowchart TD or similar) representing the system architecture based on these files and context.
    Governance: ${JSON.stringify(governance)}
    Context: ${JSON.stringify(context)}
    
    Return ONLY the mermaid code.
    `;
    
    const parts: any[] = [...files, { text: prompt }];
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { parts },
    });
    
    let text = response.text || "";
    text = text.replace(/```mermaid/g, '').replace(/```/g, '').trim();
    return text;
}

export async function chatWithFiles(message: string, history: any[], files: FileData[], context: string): Promise<string> {
    const ai = getAI();
    // Reconstruct history in format
    const contents: any[] = [];
    if (files.length > 0) contents.push(...files);
    
    // Add system context as first message or systemInstruction
    const config = {
        systemInstruction: context
    };
    
    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        history: history,
        config
    });
    
    // Note: chat.sendMessage takes string or part[]. If we have files for THIS message we pass them.
    // But files are usually context. We passed them in "contents" above? No, wait.
    // We should pass files in history or as the first message of the chat if not supported in systemInstruction.
    // Actually, gemini 1.5/2.5 supports files in history.
    // For simplicity, we assume files are part of the "history" or context we passed.
    // Since we are using `ai.chats.create`, we can pass history.
    // If files are global context, we can send them in the first turn.
    
    // Let's simplified: We'll just generate content with history + files + new message.
    
    const parts = [...files, { text: message }];
    // We append previous history as text for now or structure it if we want multi-turn with files.
    // Actually, best is to use generateContent with full context each time for "Chat with Files" unless session is persistent.
    // Here we treat it as single turn with history context.
    
    const histText = history.map(h => `${h.role}: ${h.parts[0].text}`).join('\n');
    const fullPrompt = `${context}\n\nHISTORY:\n${histText}\n\nUSER: ${message}`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [...files, { text: fullPrompt }] }
    });
    
    return response.text || "";
}

export async function generateAudioOverview(files: FileData[]): Promise<{ audioData: string, transcript: string }> {
    const ai = getAI();
    
    // 1. Generate Script
    const scriptResp = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [...files, { text: "Generate a concise, high-level audio briefing script summarizing these documents for a tactical overview. Keep it under 2 minutes spoken." }] }
    });
    const transcript = scriptResp.text || "No script generated.";
    
    // 2. TTS
    const ttsResp = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: { parts: [{ text: transcript }] },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
        }
    });
    
    // Extract audio
    const audioData = ttsResp.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
    return { audioData, transcript };
}

export async function classifyArtifact(file: FileData): Promise<ArtifactAnalysis> {
    const ai = getAI();
    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            classification: { type: Type.STRING },
            ambiguityScore: { type: Type.NUMBER },
            entities: { type: Type.ARRAY, items: { type: Type.STRING } },
            summary: { type: Type.STRING }
        }
    };
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [file, { text: "Classify this artifact." }] },
        config: { responseMimeType: 'application/json', responseSchema: schema }
    });
    return JSON.parse(response.text || "{}");
}

export async function generateAutopoieticFramework(file: FileData, governance: any): Promise<AutopoieticFramework> {
    const ai = getAI();
    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            framework_identity: { type: Type.OBJECT, properties: { name: {type: Type.STRING}, acronym: {type: Type.STRING}, philosophical_origin: {type: Type.STRING} } },
            operational_logic: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { step: {type: Type.STRING}, designation: {type: Type.STRING}, execution_vector: {type: Type.STRING} } } },
            governance_mandate: { type: Type.STRING },
            visual_signature: { type: Type.OBJECT, properties: { color_hex: {type: Type.STRING}, icon_metaphor: {type: Type.STRING} } }
        }
    };
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { parts: [file, { text: `Generate an Autopoietic Framework based on this seed and governance: ${JSON.stringify(governance)}` }] },
        config: { responseMimeType: 'application/json', responseSchema: schema }
    });
    return JSON.parse(response.text || "{}");
}

export async function generateStructuredWorkflow(files: FileData[], governance: any, type: string): Promise<SystemWorkflow> {
    const ai = getAI();
    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            structureTree: { type: Type.STRING },
            protocols: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { rule: {type: Type.STRING}, reasoning: {type: Type.STRING} } } },
            automationScript: { type: Type.STRING },
            processDiagram: { type: Type.STRING }
        }
    };
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { parts: [...files, { text: `Generate a structured workflow for ${type}. Governance: ${JSON.stringify(governance)}` }] },
        config: { responseMimeType: 'application/json', responseSchema: schema }
    });
    return JSON.parse(response.text || "{}");
}

export async function calculateEntropy(files: FileData[]): Promise<number> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [...files, { text: "Calculate the information entropy (0-100) of these documents. Return ONLY the number." }] }
    });
    return parseInt(response.text || "0");
}

export async function analyzeBookDNA(file: FileData): Promise<BookDNA> {
    const ai = getAI();
    // Using a simpler schema for brevity, matching the interface
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [file, { text: "Analyze this text and extract its 'DNA' (Title, Author, Tone, Axioms, Modules, Kernel Identity)." }] },
        config: { responseMimeType: 'application/json' } // Schema definition omitted for brevity, assuming standard structure or loose parsing
    });
    return JSON.parse(response.text || "{}");
}

export async function generateCode(prompt: string, language: string, model: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: model,
        contents: `Write ${language} code for: ${prompt}. Return ONLY the code, no markdown block if possible, or standard markdown.`,
    });
    let text = response.text || "";
    // Strip markdown if present
    if (text.startsWith("```")) {
        text = text.split("\n").slice(1, -1).join("\n");
    }
    return text;
}

export async function simulateCodeExecution(code: string, language: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Simulate the execution of this ${language} code. Provide the likely console output or logs.
        
        CODE:
        ${code}
        `,
    });
    return response.text || "No output simulated.";
}

export async function formatCode(code: string, language: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Format this ${language} code according to standard style guides. Return ONLY the code.
        
        ${code}`,
    });
    let text = response.text || "";
    if (text.startsWith("```")) {
        text = text.split("\n").slice(1, -1).join("\n");
    }
    return text;
}

export async function fixCode(code: string, error: string, language: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Fix this ${language} code based on the error: "${error}". Return ONLY the fixed code.
        
        ${code}`,
    });
    let text = response.text || "";
    if (text.startsWith("```")) {
        text = text.split("\n").slice(1, -1).join("\n");
    }
    return text;
}

export async function performGlobalSearch(query: string): Promise<SearchResultItem[]> {
    const ai = getAI();
    const schema: Schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['NAV', 'ACTION', 'QUERY'] },
                meta: { type: Type.OBJECT, properties: { targetMode: { type: Type.STRING }, payload: { type: Type.STRING } } }
            }
        }
    };
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Search query: "${query}". Return relevant app actions, navigation targets (AppModes), or answers.`,
        config: { responseMimeType: 'application/json', responseSchema: schema, tools: [{ googleSearch: {} }] }
    });
    return JSON.parse(response.text || "[]");
}

export async function generateTaxonomy(items: string[]): Promise<any[]> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Categorize these items into a taxonomy: ${JSON.stringify(items)}. Return JSON: [{ category: string, items: string[] }]`,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
}

export async function generateSpeech(text: string, voiceName: string): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: { parts: [{ text }] },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } }
        }
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
}

// Live Session Manager
class LiveSessionManager {
    private session: any = null;
    public onTranscriptUpdate: (role: string, text: string) => void = () => {};
    public onDisconnect: () => void = () => {};
    public onToolCall: (name: string, args: any) => Promise<any> = async () => ({});
    public onCommand: (intent: UserIntent) => void = () => {};
    
    private inputAnalyser: AnalyserNode | null = null;
    private outputAnalyser: AnalyserNode | null = null;
    private activeStream: MediaStream | null = null;
    private audioContext: AudioContext | null = null;

    isConnected() {
        return !!this.session;
    }

    async connect(voiceName: string, config: any = {}) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        
        this.activeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = this.audioContext.createMediaStreamSource(this.activeStream);
        this.inputAnalyser = this.audioContext.createAnalyser();
        source.connect(this.inputAnalyser);
        
        this.outputAnalyser = this.audioContext.createAnalyser();
        
        const ai = getAI();
        let sessionResolver: (s: any) => void;
        const sessionPromise = new Promise<any>(resolve => sessionResolver = resolve);

        const processor = this.audioContext.createScriptProcessor(4096, 1, 1);
        processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmBlob = this.createPcmBlob(inputData);
            sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
        };
        source.connect(processor);
        processor.connect(this.audioContext.destination);

        const fullConfig = {
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: async () => {
                    console.log("Live Session Opened");
                },
                onmessage: async (msg: LiveServerMessage) => {
                    const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                    if (audioData) {
                        await this.playAudio(audioData);
                    }
                    
                    if (msg.serverContent?.modelTurn?.parts[0]?.text) {
                         this.onTranscriptUpdate('model', msg.serverContent.modelTurn.parts[0].text);
                    }
                    
                    if (msg.toolCall) {
                        for (const fc of msg.toolCall.functionCalls) {
                            const result = await this.onToolCall(fc.name, fc.args);
                            sessionPromise.then(s => s.sendToolResponse({
                                functionResponses: {
                                    id: fc.id,
                                    name: fc.name,
                                    response: { result }
                                }
                            }));
                        }
                    }
                },
                onclose: () => {
                    this.disconnect();
                },
                onerror: (e: any) => {
                    console.error("Live Session Error", e);
                    this.disconnect();
                }
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName } }
                },
                systemInstruction: config.systemInstruction,
                tools: config.tools,
            }
        };

        const session = await ai.live.connect(fullConfig);
        this.session = session;
        sessionResolver!(session);
    }

    disconnect() {
        if (this.session) {
            this.session = null;
        }
        if (this.activeStream) {
            this.activeStream.getTracks().forEach(t => t.stop());
            this.activeStream = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.onDisconnect();
    }

    getInputFrequencies() {
        if (!this.inputAnalyser) return new Uint8Array(0);
        const array = new Uint8Array(this.inputAnalyser.frequencyBinCount);
        this.inputAnalyser.getByteFrequencyData(array);
        return array;
    }

    getOutputFrequencies() {
        if (!this.outputAnalyser) return new Uint8Array(0);
        const array = new Uint8Array(this.outputAnalyser.frequencyBinCount);
        this.outputAnalyser.getByteFrequencyData(array);
        return array;
    }

    private createPcmBlob(data: Float32Array) {
        const l = data.length;
        const int16 = new Int16Array(l);
        for (let i = 0; i < l; i++) {
            int16[i] = data[i] * 32768;
        }
        const buffer = new Uint8Array(int16.buffer);
        let binary = '';
        const len = buffer.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(buffer[i]);
        }
        return {
            data: btoa(binary),
            mimeType: 'audio/pcm;rate=16000'
        };
    }

    private async playAudio(base64: string) {
        if (!this.audioContext || this.audioContext.state === 'closed') return;
        
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        const pcmData = new Int16Array(bytes.buffer);
        const audioBuffer = this.audioContext.createBuffer(1, pcmData.length, 24000);
        const channelData = audioBuffer.getChannelData(0);
        for (let i = 0; i < pcmData.length; i++) {
            channelData[i] = pcmData[i] / 32768.0;
        }

        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        
        if (this.outputAnalyser) {
            source.connect(this.outputAnalyser);
            this.outputAnalyser.connect(this.audioContext.destination);
        } else {
            source.connect(this.audioContext.destination);
        }
        
        source.start();
    }
}

export const liveSession = new LiveSessionManager();