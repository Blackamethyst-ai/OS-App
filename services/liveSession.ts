/**
 * LIVE SESSION - Voice Streaming via Gemini Live API
 * 
 * Handles real-time audio streaming, voice agent connections,
 * and bidirectional communication with Gemini Live.
 */

import { Modality, LiveServerMessage, Blob as GenAIBlob } from "@google/genai";
import { getAI, SOVEREIGN_SYSTEM_INSTRUCTION } from './geminiService';
import { HIVE_AGENTS } from './agents';
import { logger } from './logger';

// --- Audio Utilities ---

function decode(base64: string): Uint8Array {
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

function encode(bytes: Uint8Array): string {
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

// --- Live Session Class ---

export interface LiveSessionConfig {
    systemInstruction?: string;
    tools?: any[];
    outputAudioTranscription?: Record<string, any>;
    inputAudioTranscription?: Record<string, any>;
    callbacks?: {
        onopen?: () => void;
        onmessage?: (message: LiveServerMessage) => Promise<void>;
        onerror?: (error: Error) => void;
        onclose?: () => void;
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

    public onAgentSwitch: ((agentName: string) => void) | null = null;
    private isSpeaking: boolean = false; // Mute input while AI is speaking to prevent echo

    public onToolCall: (name: string, args: any) => Promise<any> = async (name, args) => {
        if (name === 'switch_agent') {
            if (this.onAgentSwitch) this.onAgentSwitch(args.agentName);
            return { status: 'switching_initiated', target: args.agentName };
        }
        return {};
    };

    async primeAudio(): Promise<void> {
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

    async connect(agentName: string, config: LiveSessionConfig): Promise<void> {
        // Pre-flight: Check API key before attempting connection
        const { apiKeyService } = await import('./apiKeyService');
        if (!apiKeyService.hasGeminiKey()) {
            const error = new Error('Gemini API key not configured. Go to Settings > API Keys to add it.');
            if (config.callbacks?.onerror) config.callbacks.onerror(error);
            throw error;
        }

        const ai = getAI();
        await this.primeAudio();
        this.nextStartTime = 0;

        // Resolve Agent Config robustly (ID or Name)
        const agent = Object.values(HIVE_AGENTS).find(a =>
            a.id === agentName.toLowerCase() ||
            a.name.toLowerCase() === agentName.toLowerCase()
        ) || HIVE_AGENTS[agentName.toLowerCase()] || HIVE_AGENTS['zephyr'];

        const voiceName = agent?.voice || 'Zephyr';

        logger.debug('Connecting with', { agentName, voiceName, model: 'gemini-2.0-flash-exp' }, 'LiveSession');

        const sessionPromise = ai.live.connect({
            model: 'gemini-2.0-flash-exp',
            callbacks: {
                onopen: async () => {
                    try {
                        logger.debug('WebSocket OPENED, requesting microphone...', undefined, 'LiveSession');
                        // Enable echo cancellation to prevent AI from hearing itself
                        this.stream = await navigator.mediaDevices.getUserMedia({
                            audio: {
                                echoCancellation: true,
                                noiseSuppression: true,
                                autoGainControl: true
                            }
                        });
                        logger.debug('Microphone access GRANTED, setting up audio pipeline...', undefined, 'LiveSession');
                        const source = this.audioContext!.createMediaStreamSource(this.stream);
                        const scriptProcessor = this.audioContext!.createScriptProcessor(4096, 1, 1);
                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            // Don't send audio while AI is speaking to prevent echo loops
                            if (this.isSpeaking) return;

                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromise.then((s) => s.sendRealtimeInput({ media: pcmBlob }));
                        };
                        source.connect(this.inputAnalyser!);
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(this.audioContext!.destination);
                        logger.info('Audio pipeline READY - voice session is ACTIVE', undefined, 'LiveSession');
                        if (config.callbacks?.onopen) config.callbacks.onopen();
                    } catch (e: any) {
                        // Provide specific error messages for common failures
                        let error = e;
                        if (e.name === 'NotAllowedError') {
                            error = new Error('Microphone permission denied. Please allow microphone access and try again.');
                        } else if (e.name === 'NotFoundError') {
                            error = new Error('No microphone found. Please connect a microphone and try again.');
                        } else if (e.name === 'NotReadableError') {
                            error = new Error('Microphone is in use by another application.');
                        }
                        logger.error('Failed to setup audio', error, 'LiveSession');
                        if (config.callbacks?.onerror) config.callbacks.onerror(error);
                    }
                },
                onmessage: async (message: LiveServerMessage) => {
                    logger.debug('Message received', {
                        hasToolCall: !!message.toolCall,
                        hasAudio: !!message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data,
                        interrupted: !!message.serverContent?.interrupted,
                    }, 'LiveSession');

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
                        // MUTE MIC: AI is about to speak
                        this.isSpeaking = true;

                        this.nextStartTime = Math.max(this.nextStartTime, this.audioContext.currentTime);
                        const audioBuffer = await decodeAudioData(decode(base64EncodedAudioString), this.audioContext, 24000, 1);
                        const source = this.audioContext.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(this.outputNode);
                        source.addEventListener('ended', () => {
                            this.activeSources.delete(source);
                            // UNMUTE MIC: Only when ALL audio sources are done
                            if (this.activeSources.size === 0) {
                                this.isSpeaking = false;
                            }
                        });
                        source.start(this.nextStartTime);
                        this.nextStartTime += audioBuffer.duration;
                        this.activeSources.add(source);
                    }
                    if (message.serverContent?.interrupted) {
                        this.activeSources.forEach(s => { try { s.stop(); } catch (e) { } });
                        this.activeSources.clear();
                        this.nextStartTime = 0;
                        this.isSpeaking = false; // Unmute on interrupt
                    }
                    if (config.callbacks?.onmessage) await config.callbacks.onmessage(message);
                },
                onerror: config.callbacks?.onerror ? (e: any) => config.callbacks!.onerror!(e) : (() => { }),
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

    disconnect(): void {
        if (this.session) this.session.close();
        if (this.stream) this.stream.getTracks().forEach(t => t.stop());
        this.activeSources.forEach(s => { try { s.stop(); } catch (e) { } });
        this.activeSources.clear();
        this.session = null;
    }

    isConnected(): boolean {
        return !!this.session;
    }

    getInputFrequencies(): Uint8Array | null {
        if (!this.inputAnalyser) return null;
        const data = new Uint8Array(this.inputAnalyser.frequencyBinCount);
        this.inputAnalyser.getByteFrequencyData(data);
        return data;
    }

    getOutputFrequencies(): Uint8Array | null {
        if (!this.outputAnalyser) return null;
        const data = new Uint8Array(this.outputAnalyser.frequencyBinCount);
        this.outputAnalyser.getByteFrequencyData(data);
        return data;
    }
}

// Singleton export
export const liveSession = new LiveSession();
