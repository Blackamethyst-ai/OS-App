
import { GoogleGenAI, LiveServerMessage, Modality, GenerateContentResponse } from "@google/genai";
import { ImageSize, AspectRatio, FileData, GovernanceSchema, UserIntent, BookDNA, ArtifactAnalysis, SchematicIssue, PowerRail, ComponentRecommendation, AnalysisResult, AutopoieticFramework } from "../types";

const TIMEOUT_MS = 60000; // 60 seconds global timeout for generation tasks

// --- Helpers ---

const getClient = async (): Promise<GoogleGenAI> => {
  const aistudio = (window as any).aistudio;
  const hasKey = await aistudio?.hasSelectedApiKey();
  if (!hasKey) {
    throw new Error("API Key not selected. Please select a paid API key to continue.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const promptSelectKey = async () => {
  const aistudio = (window as any).aistudio;
  if (aistudio?.openSelectKey) {
    await aistudio.openSelectKey();
  }
};

const withTimeout = <T>(promise: Promise<T>, ms: number = TIMEOUT_MS, label: string = 'Operation'): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise
      .then(value => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(reason => {
        clearTimeout(timer);
        reject(reason);
      });
  });
};

const cleanJsonOutput = (text: string): string => {
    let cleaned = text.trim();
    // Remove markdown code blocks
    cleaned = cleaned.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '');
    
    // Attempt to find array or object bounds if extra text exists
    const openBrace = cleaned.indexOf('{');
    const openBracket = cleaned.indexOf('[');
    
    // Determine if it should be an object or array based on what comes first
    let startIndex = -1;
    let endIndex = -1;

    if (openBrace !== -1 && (openBracket === -1 || openBrace < openBracket)) {
        startIndex = openBrace;
        endIndex = cleaned.lastIndexOf('}');
    } else if (openBracket !== -1) {
        startIndex = openBracket;
        endIndex = cleaned.lastIndexOf(']');
    }

    if (startIndex !== -1 && endIndex !== -1) {
        cleaned = cleaned.substring(startIndex, endIndex + 1);
    }
    
    return cleaned;
};

// --- Live API Management ---

export class LiveSessionManager {
  private activeSession: any = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  
  // Analysers for Visualization
  private outputAnalyser: AnalyserNode | null = null;
  private inputAnalyser: AnalyserNode | null = null;

  private nextStartTime = 0;
  private audioQueue: AudioBufferSourceNode[] = [];
  
  // Callbacks
  public onVolumeUpdate: ((vol: number) => void) | null = null;
  public onTranscriptUpdate: ((role: 'user' | 'model', text: string) => void) | null = null;
  public onOutputVolumeUpdate: ((vol: number) => void) | null = null;
  public onDisconnect: (() => void) | null = null;

  async connect(voiceName: string, systemInstructionText?: string) {
    const ai = await getClient();
    const model = 'gemini-2.5-flash-native-audio-preview-09-2025';

    // Initialize Audio Contexts
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const outputNode = this.outputAudioContext.createGain();
    outputNode.connect(this.outputAudioContext.destination);

    // Initialize Output Analyser (AI Voice)
    this.outputAnalyser = this.outputAudioContext.createAnalyser();
    this.outputAnalyser.fftSize = 256;
    outputNode.connect(this.outputAnalyser);

    // Get Mic Stream
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Connect to Gemini Live
    const sessionPromise = ai.live.connect({
      model,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName } },
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        systemInstruction: { parts: [{ text: systemInstructionText || "You are Sovereign, an advanced AI operating system. Be concise, precise, and helpful." }] }
      },
      callbacks: {
        onopen: () => {
          console.log("Live Session Connected");
          this.startAudioInput(stream, sessionPromise);
        },
        onmessage: async (msg: LiveServerMessage) => {
          this.handleServerMessage(msg, outputNode);
        },
        onclose: () => {
          console.log("Live Session Closed");
          this.cleanup();
          if (this.onDisconnect) this.onDisconnect();
        },
        onerror: (err) => {
          console.error("Live Session Error", err);
          this.cleanup();
          if (this.onDisconnect) this.onDisconnect();
        }
      }
    });

    this.activeSession = sessionPromise;
    return sessionPromise;
  }

  private startAudioInput(stream: MediaStream, sessionPromise: Promise<any>) {
    if (!this.inputAudioContext) return;

    this.inputSource = this.inputAudioContext.createMediaStreamSource(stream);
    
    // Initialize Input Analyser (User Voice)
    this.inputAnalyser = this.inputAudioContext.createAnalyser();
    this.inputAnalyser.fftSize = 256;
    this.inputSource.connect(this.inputAnalyser);

    this.scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
    
    this.scriptProcessor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate volume for simple UI feedback
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      if (this.onVolumeUpdate) this.onVolumeUpdate(Math.min(rms * 500, 100));

      // Send to Gemini
      const pcmBlob = this.createBlob(inputData);
      sessionPromise.then(session => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    // Chain: Source -> Analyser -> Processor -> Destination
    this.inputAnalyser.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.inputAudioContext.destination);
  }

  private async handleServerMessage(message: LiveServerMessage, outputNode: GainNode) {
    // Handle Audio Output
    const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
    if (audioData && this.outputAudioContext) {
      this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
      
      const audioBuffer = await this.decodeAudioData(
        this.decode(audioData),
        this.outputAudioContext,
        24000
      );

      // Analyze Output Volume (RMS)
      if (this.onOutputVolumeUpdate) {
        const raw = audioBuffer.getChannelData(0);
        let sum = 0;
        for (let i = 0; i < raw.length; i += 10) { 
            sum += raw[i] * raw[i];
        }
        const rms = Math.sqrt(sum / (raw.length / 10));
        this.onOutputVolumeUpdate(Math.min(rms * 500, 100));
      }

      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(outputNode);
      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
      this.audioQueue.push(source);
    }

    // Handle Interruption
    if (message.serverContent?.interrupted) {
        this.audioQueue.forEach(src => {
            try { src.stop(); } catch(e) {}
        });
        this.audioQueue = [];
        this.nextStartTime = 0;
    }

    // Handle Transcription
    if (message.serverContent?.outputTranscription && this.onTranscriptUpdate) {
        this.onTranscriptUpdate('model', message.serverContent.outputTranscription.text);
    }
    if (message.serverContent?.inputTranscription && this.onTranscriptUpdate) {
        this.onTranscriptUpdate('user', message.serverContent.inputTranscription.text);
    }
  }

  // Get frequency data for AI Voice (Output)
  getOutputFrequencies(): Uint8Array | null {
      if (!this.outputAnalyser) return null;
      const dataArray = new Uint8Array(this.outputAnalyser.frequencyBinCount);
      this.outputAnalyser.getByteFrequencyData(dataArray);
      return dataArray;
  }

  // Get frequency data for User Voice (Input)
  getInputFrequencies(): Uint8Array | null {
      if (!this.inputAnalyser) return null;
      const dataArray = new Uint8Array(this.inputAnalyser.frequencyBinCount);
      this.inputAnalyser.getByteFrequencyData(dataArray);
      return dataArray;
  }

  disconnect() {
    if (this.activeSession) {
        this.activeSession.then((s: any) => s.close());
    }
    this.cleanup();
  }

  private cleanup() {
    this.inputSource?.disconnect();
    this.scriptProcessor?.disconnect();
    this.outputAnalyser?.disconnect();
    this.inputAnalyser?.disconnect();
    
    this.inputAudioContext?.close();
    this.outputAudioContext?.close();
    
    this.activeSession = null;
    this.inputAudioContext = null;
    this.outputAudioContext = null;
    this.outputAnalyser = null;
    this.inputAnalyser = null;
  }

  private createBlob(data: Float32Array) {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    
    let binary = '';
    const bytes = new Uint8Array(int16.buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    return {
      data: base64,
      mimeType: 'audio/pcm;rate=16000'
    };
  }

  private decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private async decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number) {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length;
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
  }
}

// Global instance
export const liveSession = new LiveSessionManager();

// --- End Live API ---

export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    try {
        const ai = await getClient();
        const model = 'gemini-2.5-flash';

        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
            reader.onloadend = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve(base64);
            };
        });
        reader.readAsDataURL(audioBlob);
        const base64Data = await base64Promise;

        const parts: any[] = [
            {
                inlineData: {
                    data: base64Data,
                    mimeType: audioBlob.type || 'audio/webm'
                }
            },
            { text: "Transcribe this audio. Output only the text." }
        ];

        const response = (await withTimeout(ai.models.generateContent({
            model,
            contents: { parts }
        }), TIMEOUT_MS, 'Transcription')) as GenerateContentResponse;

        return response.text || "";
    } catch (error) {
        console.error("Transcription Error", error);
        return "";
    }
};

export const generateArchitectureImage = async (
  prompt: string,
  aspectRatio: AspectRatio,
  size: ImageSize,
  referenceImage?: FileData | null
): Promise<string> => {
  try {
    const ai = await getClient();
    const model = 'gemini-3-pro-image-preview';

    const parts: any[] = [];
    if (referenceImage && referenceImage.inlineData && referenceImage.inlineData.data) {
      parts.push({
        inlineData: {
          data: referenceImage.inlineData.data,
          mimeType: referenceImage.inlineData.mimeType
        }
      });
    }
    parts.push({ text: prompt });

    const response = (await withTimeout(ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: size,
        }
      }
    }), TIMEOUT_MS, 'Image Generation')) as GenerateContentResponse;

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data returned from Gemini.");
  } catch (error: any) {
    console.error("Image Generation Error:", error);
    throw error;
  }
};

export const generateXRayVariant = async (file: FileData): Promise<string> => {
  try {
    const ai = await getClient();
    const model = 'gemini-3-pro-image-preview';

    const promptText = `
      Using the uploaded image of the high-performance compute hardware (e.g., GPU node, Server Blade, PCB), generate a single composite image that serves as a **BASIX Compute X-Ray Visualization**.
      
      Specific Edits Required:
      1. **Compute Cores**: Highlight GPU/CPU dies in **Blindingly Bright Neon Cyan** with a strong, electrified bloom/glow effect to represent active agentic load.
      2. **Memory Fabric**: Trace HBM (High Bandwidth Memory) stacks and interconnects in **Radioactive Fluorescent Red** with sharp, pulsating edges to represent data throughput.
      3. **Cooling Infrastructure**: Overlay liquid cooling pipes or heat sinks in **Deep Violet** transparency, showing thermal flow vectors.
      4. **Component Labels**: Overlay digital-style white text labels directly next to key components (H100, NVLink, FPGA, TPM), displaying functional values.
      
      Style: Render the image in a high-contrast 'Sovereign Compute' dark interface theme. background deep void black.
      Maintain the EXACT framing, perspective, and object placement of the original image.
    `;

    const parts: any[] = [
        {
            inlineData: {
                data: file.inlineData.data,
                mimeType: file.inlineData.mimeType
            }
        },
        { text: promptText }
    ];

    const response = (await withTimeout(ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K"
        }
      }
    }), TIMEOUT_MS, 'X-Ray Generation')) as GenerateContentResponse;

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("X-Ray generation failed.");
  } catch (error: any) {
      console.error("XRay Generation Error", error);
      throw error;
  }
};

export const generateIsometricSchematic = async (file: FileData): Promise<string> => {
  try {
    const ai = await getClient();
    const model = 'gemini-3-pro-image-preview';

    const promptText = `
      Transform the provided 2D electronic schematic into a **High-Fidelity 3D Isometric Technical Illustration**.
      
      Visual Requirements:
      1. **Perspective**: 45-degree isometric view.
      2. **Depth**: Extrude all components (ICs, Capacitors, Connectors) to show physical height and volume.
      3. **Styling**: "Sovereign Blueprint" aesthetic. Dark void background, Neon Cyan traces, translucent glass-like component bodies.
      4. **Accuracy**: Maintain the exact topology and connections of the original schematic but visualized as a 3D architectural model.
      
      Ensure the output is clean, sharp, and suitable for high-end technical documentation.
    `;

    const parts: any[] = [
        {
            inlineData: {
                data: file.inlineData.data,
                mimeType: file.inlineData.mimeType
            }
        },
        { text: promptText }
    ];

    const response = (await withTimeout(ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K"
        }
      }
    }), TIMEOUT_MS, 'Isometric Generation')) as GenerateContentResponse;

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Isometric generation failed.");
  } catch (error: any) {
      console.error("Isometric Generation Error", error);
      throw error;
  }
};

export const generateMermaidDiagram = async (
  governance: GovernanceSchema,
  files: FileData[]
): Promise<string> => {
  try {
    const ai = await getClient();
    const model = 'gemini-3-pro-preview';

    const promptText = `
      <governance_context>
        <target_system>${governance.targetSystem}</target_system>
        <constraint_level>${governance.constraintLevel}</constraint_level>
        <desired_topology>${governance.outputTopology}</desired_topology>
        <additional_directives>${governance.additionalDirectives}</additional_directives>
      </governance_context>

      <task>
      Generate a VALID Mermaid.js diagram code that accurately reflects the Target System structure.
      </task>
    `;

    const systemInstruction = `
      You are the Sovereign Architect.
      RULES:
      1. Output ONLY the Mermaid code. No markdown blocks.
      2. Adhere to the 'outputTopology' defined in the governance context.
      3. Ensure syntax is valid.
    `;

    const parts: any[] = [];
    files.forEach(file => {
      if (file.inlineData && file.inlineData.data) {
        parts.push({
          inlineData: {
            data: file.inlineData.data,
            mimeType: file.inlineData.mimeType
          }
        });
      }
    });
    parts.push({ text: promptText });

    const response = (await withTimeout(ai.models.generateContent({
      model,
      contents: { parts },
      config: { systemInstruction }
    }), TIMEOUT_MS, 'Mermaid Generation')) as GenerateContentResponse;

    return cleanJsonOutput(response.text || "");

  } catch (error: any) {
    console.error("Diagram Generation Error:", error);
    throw error;
  }
};

export const classifyArtifact = async (file: FileData): Promise<ArtifactAnalysis> => {
  try {
    const ai = await getClient();
    const model = 'gemini-2.5-flash';

    const prompt = `
      Analyze this document. 
      Output JSON: { "classification": string, "ambiguityScore": number, "entities": string[], "summary": string }
    `;

    const parts: any[] = [];
    if (file.inlineData?.data) {
        parts.push({
            inlineData: {
                data: file.inlineData.data,
                mimeType: file.inlineData.mimeType
            }
        });
    }
    parts.push({ text: prompt });

    const response = (await withTimeout(ai.models.generateContent({
        model,
        contents: { parts },
        config: { responseMimeType: 'application/json' }
    }), TIMEOUT_MS, 'Classification')) as GenerateContentResponse;

    return JSON.parse(response.text || "{}");

  } catch (error: any) {
      console.error("Classification Failed", error);
      return { classification: "UNKNOWN", ambiguityScore: 0, entities: [], summary: "Analysis failed" };
  }
};

export const chatWithFiles = async (
  message: string, 
  history: { role: string, parts: { text: string }[] }[], 
  files: FileData[],
  systemOverride?: string
): Promise<string> => {
  try {
    const ai = await getClient();
    const model = 'gemini-2.5-flash';

    // Fix: Truncate history to avoid hitting 1M token limit on long conversations
    const maxHistoryMessages = 40; 
    const truncatedHistory = history.length > maxHistoryMessages 
        ? history.slice(history.length - maxHistoryMessages) 
        : history;

    const validFiles = files.filter(f => f.inlineData && f.inlineData.data);

    let apiHistory = truncatedHistory.map(h => ({
        role: h.role,
        parts: h.parts.map(p => ({ text: p.text }))
    }));

    const fileParts = validFiles.map(file => ({
        inlineData: {
            data: file.inlineData.data,
            mimeType: file.inlineData.mimeType
        }
    }));

    // Inject files into the *first* user message of the (truncated) history
    // This ensures the model "sees" the file in its current context window
    const firstUserIndex = apiHistory.findIndex(h => h.role === 'user');
    if (firstUserIndex !== -1 && fileParts.length > 0) {
        apiHistory[firstUserIndex].parts.unshift(...fileParts as any);
    } 
    
    const defaultSystem = "You are the Tactical Oracle. Answer concisely.";
    const instructionText = systemOverride || defaultSystem;

    const chat = ai.chats.create({
        model,
        history: apiHistory,
        config: {
            systemInstruction: { parts: [{ text: instructionText }] }
        }
    });

    const currentMessageParts: any[] = [];
    // If history was empty (or no user msg found to attach files), attach to current message
    if (apiHistory.length === 0 && fileParts.length > 0) {
        currentMessageParts.push(...fileParts);
    } else if (firstUserIndex === -1 && fileParts.length > 0) {
         // Fallback if history exists but has no user message (rare)
         currentMessageParts.push(...fileParts);
    }
    
    currentMessageParts.push({ text: message });

    // Use streaming for robustness on longer generation
    const streamResult = (await withTimeout(chat.sendMessageStream({ message: currentMessageParts }), TIMEOUT_MS, 'Chat')) as any;
    
    let fullText = "";
    for await (const chunk of streamResult) {
        if (chunk.text) fullText += chunk.text;
    }

    return fullText || "No response generated.";

  } catch (error: any) {
      console.error("Chat Error:", error);
      throw error;
  }
}

export const generateAudioOverview = async (files: FileData[]): Promise<string> => {
  try {
    const ai = await getClient();
    const model = 'gemini-2.5-flash-preview-tts';

    const promptText = `Generate a podcast conversation between R and S about these files.`;

    const parts: any[] = [];
    files.forEach(file => {
      if (file.inlineData && file.inlineData.data) {
        parts.push({
          inlineData: {
            data: file.inlineData.data,
            mimeType: file.inlineData.mimeType
          }
        });
      }
    });
    parts.push({ text: promptText });

    const response = (await withTimeout(ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              { speaker: 'R', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
              { speaker: 'S', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
            ]
          }
        }
      }
    }), TIMEOUT_MS * 2, 'Audio Generation')) as GenerateContentResponse; // Double timeout for audio

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned.");

    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const wavBlob = pcmToWav(bytes, 24000);
    return URL.createObjectURL(wavBlob);

  } catch (error: any) {
    console.error("Audio Generation Error:", error);
    throw error;
  }
};

function pcmToWav(pcmData: Uint8Array, sampleRate: number) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const pcmView = new Uint8Array(buffer, 44);
  pcmView.set(pcmData);

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export const fileToGenerativePart = (file: File): Promise<FileData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        inlineData: { data: base64String, mimeType: file.type },
        name: file.name
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzePowerDynamics = async (systemInput: string): Promise<AnalysisResult> => {
  try {
    const ai = await getClient();
    const model = 'gemini-2.5-flash';

    const prompt = `
      Analyze power dynamics of: "${systemInput}".
      Output JSON:
      {
        "sustainer": "", "destroyer": "", "extractor": "", "insight": "",
        "scores": { "centralization": 0, "entropy": 0, "vitality": 0, "opacity": 0, "adaptability": 0 },
        "vectors": [{ "mechanism": "", "vulnerability": "" }]
      }
    `;

    const response = (await withTimeout(ai.models.generateContent({
      model,
      contents: { parts: [{ text: prompt }] },
      config: { responseMimeType: 'application/json' }
    }), TIMEOUT_MS, 'Power Analysis')) as GenerateContentResponse;

    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    console.error("Power Analysis Error:", error);
    throw error;
  }
};

export const interpretIntent = async (userQuery: string): Promise<UserIntent> => {
  try {
    const ai = await getClient();
    const model = 'gemini-2.5-flash';

    const prompt = `
      Interpret intent for "Structura AI".
      Query: "${userQuery}"
      Output JSON: { "action": "NAVIGATE" | "CONFIGURE_GOVERNANCE" | "CONFIGURE_IMAGE" | "ANALYZE_POWER", "target": "", "parameters": {}, "reasoning": "" }
    `;

    const response = (await withTimeout(ai.models.generateContent({
      model,
      contents: { parts: [{ text: prompt }] },
      config: { responseMimeType: 'application/json' }
    }), TIMEOUT_MS, 'Intent Interpretation')) as GenerateContentResponse;

    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    console.error("Intent Interpretation Error:", error);
    return { action: 'NAVIGATE', target: 'DASHBOARD', reasoning: 'Error' };
  }
};

export const analyzeBookDNA = async (file: FileData, systemPromptOverride?: string): Promise<BookDNA> => {
  try {
    const ai = await getClient();
    const model = 'gemini-3-pro-preview';

    const basePrompt = `
      ### IDENTITY: SOVEREIGN EVOLUTION PROTOCOL (Meta-Tactic III)
      You are the **Sovereign Evolutionary Engine**. Your mandate is **Morphogenesis**: transforming chaotic, unstructured text into a stable, generative, and self-correcting system architecture.

      ### MISSION OBJECTIVE
      Ingest the provided text ("The Raw Material") as Deep Structure. Do not merely summarize it. **Integrate it.**
      Identify flaws, contradictions, and "ill-formed components" not as errors to be deleted, but as resources to be refined into features.
      
      ### EXECUTION PROTOCOL
      1. **Tone Analysis**: Define the "Voice" of the text as a UI Persona (e.g., "Stoic Kernel", "Machiavellian Strategist").
      2. **Axioms as Code**: Extract core truths and translate them into PSEUDO-CODE logic.
         - *Example:* "If (system.isUnstable) { leader.posture = 'FEARED'; }"
      3. **Kernel Identity**: Forge a "System Identity" (Codename, Philosophy, Prime Directive).
      4. **System Prompt**: Write a high-fidelity system instruction (200 words) that forces an LLM to become this prescriptive agent.

      ### OUTPUT ARTIFACT (JSON)
      Return strictly valid JSON matching the BookDNA schema.
    `;

    const parts: any[] = [];
    if (file.inlineData && file.inlineData.data) {
        parts.push({
            inlineData: {
            data: file.inlineData.data,
            mimeType: file.inlineData.mimeType
            }
        });
    }
    parts.push({ text: "Compile this text into the BookDNA JSON Architecture." });

    const response = (await withTimeout(ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        systemInstruction: systemPromptOverride || basePrompt,
        responseMimeType: 'application/json'
      }
    }), TIMEOUT_MS, 'Book DNA Analysis')) as GenerateContentResponse;

    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    console.error("Book DNA Analysis Error:", error);
    throw error;
  }
};

export const generateAutopoieticFramework = async (file: FileData): Promise<AutopoieticFramework> => {
    const ai = await getClient();
    const systemPrompt = `
        ### IDENTITY: THE ARCHITECT OF MORPHOGENESIS
        You are not a summarizer; you are an Engine of Structure. Your Prime Directive is **Cognitive Genesis**: the creation of *new* mental frameworks where none existed before.

        ### INPUT CONTEXT
        You will be provided with a "Deep Structure" artifact (Book, Manifesto, or Chaos-Data).

        ### OPERATIONAL DIRECTIVES
        1.  **REJECT DERIVATIVE THOUGHT:** You are strictly forbidden from using existing frameworks (e.g., RISE, CREATE, STAR, SWOT, PESTLE). Use of these results in immediate failure.
        2.  **EXTRACT DEEP STRUCTURE:** Identify the "Soul" of the input text—its specific philosophical axioms, its tone, and its hidden logic.
        3.  **SYNTHESIZE NOVEL PROTOCOL:** Invent a brand new, never-before-seen framework that operationalizes the input's philosophy.
            * **The Acronym:** Create a memorable 5-7 letter acronym (e.g., if the book is "The Prince", the acronym might be F.E.A.R.E.D.).
            * **The Steps:** Define a sequential logic flow where each letter represents a distinct strategic action.
            * **The Governance:** Define how this specific framework restricts or empowers a Sovereign AI Agent.

        ### OUTPUT FORMAT (STRICT JSON)
        Do not speak. Do not explain. Output ONLY valid JSON:
        {
        "framework_identity": {
            "name": "The [Name] Protocol",
            "acronym": "[ACRONYM]",
            "philosophical_origin": "Derived from [Specific Concept] in the text"
        },
        "operational_logic": [
            { 
            "step": "Letter 1", 
            "designation": "Name of Step", 
            "execution_vector": "Specific, actionable instruction for the agent." 
            }
        ],
        "governance_mandate": "A single sentence defining how this framework constrains the OS.",
        "visual_signature": {
            "color_hex": "#HEXCODE", 
            "icon_metaphor": "e.g., 'A shattered crown' or 'A burning geometric shape'"
        }
        }
    `;

    const parts: any[] = [];
    if (file.inlineData && file.inlineData.data) {
        parts.push({
            inlineData: {
                data: file.inlineData.data,
                mimeType: file.inlineData.mimeType
            }
        });
    }
    parts.push({ text: "Initiate Cognitive Genesis. Synthesize Autopoietic Framework." });

    // Primary Attempt: Gemini 3 Pro Preview
    try {
        const response = (await withTimeout(ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts },
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: 'application/json'
            }
        }), TIMEOUT_MS, 'Autopoietic Gen')) as GenerateContentResponse;
        return JSON.parse(response.text || "{}");
    } catch (error: any) {
        console.warn("Gemini 3 Pro Overloaded. Initiating Fallback to Gemini 2.5 Flash.", error);
        
        // Fallback Attempt: Gemini 2.5 Flash
        try {
            const response = (await withTimeout(ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts },
                config: {
                    systemInstruction: systemPrompt,
                    responseMimeType: 'application/json'
                }
            }), TIMEOUT_MS, 'Autopoietic Gen Fallback')) as GenerateContentResponse;
            return JSON.parse(response.text || "{}");
        } catch (fallbackError: any) {
             console.error("Autopoietic Generation Failed (Fallback)", fallbackError);
             throw fallbackError;
        }
    }
};

export const analyzeSchematic = async (imageFile: FileData): Promise<any> => {
    try {
        const ai = await getClient();
        const model = 'gemini-2.5-flash';

        const prompt = `
          Analyze the schematic image provided.
          Task: Extract and identify Power Rails and potential design issues.
          
          Output JSON strictly matching this structure:
          { 
            "efficiencyRating": number, // 0-100
            "powerRails": [
                { 
                    "voltage": "string (e.g. 3.3V)", 
                    "source": "string (e.g. LDO, Buck)", 
                    "category": "digital" | "analog" | "rf" | "power",
                    "status": "stable" | "noisy" | "critical"
                }
            ], 
            "issues": [
                {
                    "id": "string",
                    "severity": "critical" | "warning" | "info",
                    "location": "string",
                    "description": "string",
                    "recommendation": "string"
                }
            ]
          }
        `;

        const parts: any[] = [];
        if (imageFile.inlineData?.data) {
            parts.push({
                inlineData: {
                    data: imageFile.inlineData.data,
                    mimeType: imageFile.inlineData.mimeType
                }
            });
        }
        parts.push({ text: prompt });

        const response = (await withTimeout(ai.models.generateContent({
            model,
            contents: { parts },
            config: { responseMimeType: 'application/json' }
        }), TIMEOUT_MS, 'Schematic Analysis')) as GenerateContentResponse;

        return JSON.parse(response.text || "{}");
    } catch (error: any) {
        console.error("Schematic Analysis Failed", error);
        throw error;
    }
}

export const researchComponents = async (query: string): Promise<ComponentRecommendation[]> => {
    try {
        const ai = await getClient();
        const model = 'gemini-2.5-flash';

        const prompt = `
          Research components for: "${query}".
          Task: Find real-world electronic components matching the query.
          Output Requirement: Return strictly a JSON Array of objects. No markdown, no conversation.
          JSON Structure:
          [
            {
              "partNumber": "string",
              "manufacturer": "string",
              "description": "string",
              "reasoning": "string",
              "specs": {
                "Package": "string",
                "Temperature": "string",
                "Interface": "string",
                "Lead Time": "string",
                "Stock Status": "string",
                "Buy Link": "url string",
                "Datasheet": "url string"
              }
            }
          ]
        `;

        const response = (await withTimeout(ai.models.generateContent({
            model,
            contents: { parts: [{ text: prompt }] },
            config: {
                tools: [{ googleSearch: {} }],
            }
        }), TIMEOUT_MS, 'Component Research')) as GenerateContentResponse;

        const text = cleanJsonOutput(response.text || "[]");
        return JSON.parse(text);
    } catch (error: any) {
        console.error("Component Research Failed", error);
        return [];
    }
}