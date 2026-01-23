/**
 * Browser TTS Provider for Voice Nexus
 *
 * Uses the Web Speech API for text-to-speech.
 * Free fallback when ElevenLabs is not available.
 *
 * @example
 * ```typescript
 * import { createBrowserTTS } from '@metaventionsai/voice-nexus/providers/tts/browser';
 *
 * const tts = createBrowserTTS();
 *
 * // Speak text directly (Web Speech API plays audio directly)
 * await tts.synthesize('Hello world!', 'default');
 * ```
 */

import type { TTSProvider, VoiceConfig, TTSSettings } from '../../types';

export interface BrowserTTSOptions {
    /** Default speech rate (0.1 to 10, default 0.9) */
    rate?: number;
    /** Default pitch (0 to 2, default 1.0) */
    pitch?: number;
    /** Preferred language (e.g., 'en-US') */
    preferredLanguage?: string;
}

/** Default browser voice configuration */
const BROWSER_VOICES: VoiceConfig[] = [
    { id: 'default', name: 'System Default', gender: 'neutral' },
];

/**
 * Create a Browser TTS provider for Voice Nexus
 *
 * Uses the native Web Speech API - no additional dependencies required.
 * Only works in browser environments.
 */
export function createBrowserTTS(options?: BrowserTTSOptions): TTSProvider {
    const defaultRate = options?.rate ?? 0.9;
    const defaultPitch = options?.pitch ?? 1.0;
    const preferredLanguage = options?.preferredLanguage || 'en-US';

    let synth: SpeechSynthesis | null = null;
    let availableVoices: SpeechSynthesisVoice[] = [];

    // Initialize speech synthesis if in browser
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        synth = window.speechSynthesis;
        loadVoices();

        // Voices may load asynchronously
        synth.onvoiceschanged = loadVoices;
    }

    function loadVoices(): void {
        if (synth) {
            availableVoices = synth.getVoices();
        }
    }

    function findVoice(voiceName: string, isFemale: boolean): SpeechSynthesisVoice | undefined {
        // Try exact match first
        const exactMatch = availableVoices.find(v =>
            v.name === voiceName || v.name.toLowerCase().includes(voiceName.toLowerCase())
        );
        if (exactMatch) return exactMatch;

        // Filter by language
        const langVoices = availableVoices.filter(v =>
            v.lang.startsWith(preferredLanguage.split('-')[0])
        );

        // Try to match by gender
        if (isFemale) {
            return langVoices.find(v =>
                v.name.toLowerCase().includes('female') ||
                v.name.toLowerCase().includes('samantha') ||
                v.name.toLowerCase().includes('victoria') ||
                v.name.toLowerCase().includes('karen')
            ) || langVoices[0];
        }

        return langVoices.find(v =>
            v.name.toLowerCase().includes('male') ||
            v.name.toLowerCase().includes('alex') ||
            v.name.toLowerCase().includes('daniel') ||
            v.name.toLowerCase().includes('tom')
        ) || langVoices[0];
    }

    return {
        name: 'browser',
        supportsStreaming: false,
        voices: BROWSER_VOICES,

        isAvailable(): boolean {
            return synth !== null;
        },

        getVoiceForAgent(agentName: string): string {
            // Try to match by gender based on agent names
            const femaleAgents = ['noah', 'helen', 'perri'];
            const isFemale = femaleAgents.some(name =>
                agentName.toLowerCase().includes(name)
            );

            // Find a matching voice
            const preferredVoice = findVoice('', isFemale);
            return preferredVoice?.name || 'default';
        },

        async synthesize(text: string, voice: string, settings?: TTSSettings): Promise<ArrayBuffer> {
            // Web Speech API plays directly, doesn't provide buffers
            // We'll speak the text and return an empty buffer
            await speak(text, voice, settings);
            return new ArrayBuffer(0);
        },
    };

    /**
     * Speak text using Web Speech API
     */
    async function speak(text: string, voice: string, settings?: TTSSettings): Promise<void> {
        if (!synth) {
            throw new Error('Web Speech API not available');
        }

        return new Promise((resolve, reject) => {
            // Cancel any ongoing speech
            synth!.cancel();

            const utterance = new SpeechSynthesisUtterance(text);

            // Find and set voice
            if (voice !== 'default') {
                // Check if this is an agent name (short) or voice name
                const femaleAgents = ['noah', 'helen', 'perri'];
                const isFemale = femaleAgents.some(name =>
                    voice.toLowerCase().includes(name)
                );

                const selectedVoice = findVoice(voice, isFemale);
                if (selectedVoice) {
                    utterance.voice = selectedVoice;
                }
            }

            // Apply settings
            utterance.rate = settings?.speed ?? defaultRate;
            utterance.pitch = settings?.pitch ?? defaultPitch;

            utterance.onend = () => resolve();
            utterance.onerror = (e) => reject(new Error(`Speech synthesis error: ${e.error}`));

            synth!.speak(utterance);
        });
    }
}

/**
 * Check if Web Speech API is available
 */
export function isBrowserTTSAvailable(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Get available browser voices
 */
export function getBrowserVoices(): VoiceConfig[] {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return [];
    }

    return window.speechSynthesis.getVoices().map(v => ({
        id: v.name,
        name: v.name,
        gender: v.name.toLowerCase().includes('female') ? 'female' as const : 'male' as const,
        description: `${v.lang} - ${v.localService ? 'Local' : 'Remote'}`,
        language: v.lang,
    }));
}

// Default export for convenience
export default createBrowserTTS;
