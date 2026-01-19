/**
 * VOICE NEXUS - Browser TTS Provider (Fallback)
 *
 * Uses the Web Speech API for text-to-speech.
 * Free fallback when ElevenLabs is not available.
 */

import type { TTSProvider, VoiceConfig, TTSSettings } from '../../types';

// Browser voices vary by platform - these are common ones
const BROWSER_VOICES: VoiceConfig[] = [
    { id: 'default', name: 'System Default', gender: 'male' },
];

class BrowserTTSProvider implements TTSProvider {
    readonly name = 'browser';
    readonly supportsStreaming = false;
    readonly voices = BROWSER_VOICES;

    private synth: SpeechSynthesis | null = null;
    private availableVoices: SpeechSynthesisVoice[] = [];

    constructor() {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            this.synth = window.speechSynthesis;
            this.loadVoices();

            // Voices may load asynchronously
            this.synth.onvoiceschanged = () => this.loadVoices();
        }
    }

    /**
     * Load available browser voices
     */
    private loadVoices(): void {
        if (this.synth) {
            this.availableVoices = this.synth.getVoices();
        }
    }

    /**
     * Check if Web Speech API is available
     */
    isAvailable(): boolean {
        return this.synth !== null;
    }

    /**
     * Get voice for agent (browser doesn't have agent-specific voices)
     */
    getVoiceForAgent(agentName: string): string {
        // Try to match by gender based on agent names
        const femaleAgents = ['noah', 'helen', 'perri'];
        const isFemale = femaleAgents.some(name =>
            agentName.toLowerCase().includes(name)
        );

        // Find a matching voice
        const preferredVoice = this.availableVoices.find(v => {
            if (isFemale) {
                return v.name.toLowerCase().includes('female') ||
                       v.name.toLowerCase().includes('samantha') ||
                       v.name.toLowerCase().includes('victoria');
            }
            return v.name.toLowerCase().includes('male') ||
                   v.name.toLowerCase().includes('alex') ||
                   v.name.toLowerCase().includes('daniel');
        });

        return preferredVoice?.name || 'default';
    }

    /**
     * Synthesize text to audio buffer
     * Note: Web Speech API doesn't provide raw audio buffers,
     * so this returns an empty buffer and plays directly
     */
    async synthesize(text: string, voice: string, settings?: TTSSettings): Promise<ArrayBuffer> {
        // Web Speech API plays directly, doesn't provide buffers
        // Return empty buffer and use speak() method instead
        await this.speak(text, voice, settings);
        return new ArrayBuffer(0);
    }

    /**
     * Speak text using Web Speech API
     */
    async speak(text: string, voice: string, settings?: TTSSettings): Promise<void> {
        if (!this.synth) {
            throw new Error('Web Speech API not available');
        }

        return new Promise((resolve, reject) => {
            // Cancel any ongoing speech
            this.synth!.cancel();

            const utterance = new SpeechSynthesisUtterance(text);

            // Find and set voice
            if (voice !== 'default') {
                const selectedVoice = this.availableVoices.find(v =>
                    v.name === voice || v.name.toLowerCase().includes(voice.toLowerCase())
                );
                if (selectedVoice) {
                    utterance.voice = selectedVoice;
                }
            }

            // Apply settings
            if (settings?.speed) {
                utterance.rate = settings.speed;
            }

            // Default to slightly slower for clarity
            utterance.rate = utterance.rate || 0.9;
            utterance.pitch = 1.0;

            utterance.onend = () => resolve();
            utterance.onerror = (e) => reject(new Error(`Speech synthesis error: ${e.error}`));

            this.synth!.speak(utterance);
        });
    }

    /**
     * Stop any ongoing speech
     */
    stop(): void {
        if (this.synth) {
            this.synth.cancel();
        }
    }

    /**
     * Get all available browser voices
     */
    getAvailableVoices(): VoiceConfig[] {
        return this.availableVoices.map(v => ({
            id: v.name,
            name: v.name,
            gender: v.name.toLowerCase().includes('female') ? 'female' as const : 'male' as const,
            description: `${v.lang} - ${v.localService ? 'Local' : 'Remote'}`,
        }));
    }

    /**
     * Check if currently speaking
     */
    isSpeaking(): boolean {
        return this.synth?.speaking || false;
    }
}

// Singleton export
export const browserTTS = new BrowserTTSProvider();
