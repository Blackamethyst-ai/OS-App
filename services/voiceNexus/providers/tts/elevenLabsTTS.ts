/**
 * VOICE NEXUS - ElevenLabs TTS Provider
 *
 * Premium text-to-speech with emotional expression and 9 voices.
 * Used for high-quality voice output on complex/deep responses.
 */

import type { TTSProvider, VoiceConfig, TTSSettings } from '../../types';
import { elevenLabs, ELEVEN_LABS_VOICES } from '../../../elevenLabsService';
import { apiKeyService } from '../../../apiKeyService';
import { logger } from '../../../logger';

// Voice configurations with agent mappings
const VOICE_CONFIGS: VoiceConfig[] = [
    { id: ELEVEN_LABS_VOICES.DR_IRA, name: 'Dr. Ira', gender: 'male', description: 'Deep, authoritative' },
    { id: ELEVEN_LABS_VOICES.MIKE, name: 'Mike', gender: 'male', description: 'Narrative, American' },
    { id: ELEVEN_LABS_VOICES.CALEB, name: 'Caleb', gender: 'male', description: 'News anchor, professional' },
    { id: ELEVEN_LABS_VOICES.PARAMDEEP, name: 'Paramdeep', gender: 'male', description: 'Casual, conversational' },
    { id: ELEVEN_LABS_VOICES.BILAL, name: 'Bilal', gender: 'male', description: 'Energetic, gaming' },
    { id: ELEVEN_LABS_VOICES.PERRI, name: 'Perri', gender: 'female', description: 'Clear, American' },
    { id: ELEVEN_LABS_VOICES.HELEN, name: 'Helen', gender: 'female', description: 'Strong, expressive' },
    { id: ELEVEN_LABS_VOICES.NOAH, name: 'Noah', gender: 'female', description: 'Gentle, narrative' },
];

// Map agent names to ElevenLabs voice IDs
const AGENT_VOICE_MAP: Record<string, string> = {
    'dr. ira': ELEVEN_LABS_VOICES.DR_IRA,
    'dr_ira': ELEVEN_LABS_VOICES.DR_IRA,
    'ira': ELEVEN_LABS_VOICES.DR_IRA,
    'mike': ELEVEN_LABS_VOICES.MIKE,
    'caleb': ELEVEN_LABS_VOICES.CALEB,
    'paramdeep': ELEVEN_LABS_VOICES.PARAMDEEP,
    'bilal': ELEVEN_LABS_VOICES.BILAL,
    'perri': ELEVEN_LABS_VOICES.PERRI,
    'helen': ELEVEN_LABS_VOICES.HELEN,
    'noah': ELEVEN_LABS_VOICES.NOAH,
};

// Default voice settings for natural speech
const DEFAULT_SETTINGS: TTSSettings = {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.3,
};

class ElevenLabsTTSProvider implements TTSProvider {
    readonly name = 'elevenlabs';
    readonly supportsStreaming = true;
    readonly voices = VOICE_CONFIGS;

    private audioContext: AudioContext | null = null;

    /**
     * Check if ElevenLabs API key is configured
     */
    isAvailable(): boolean {
        return !!apiKeyService.getKey('eleven_labs');
    }

    /**
     * Get voice ID from agent name
     */
    getVoiceForAgent(agentName: string): string {
        const normalized = agentName.toLowerCase().trim();
        return AGENT_VOICE_MAP[normalized] || ELEVEN_LABS_VOICES.MIKE; // Default to Mike
    }

    /**
     * Synthesize text to audio buffer
     */
    async synthesize(text: string, voice: string, settings?: TTSSettings): Promise<ArrayBuffer> {
        if (!this.isAvailable()) {
            throw new Error('ElevenLabs API key not configured');
        }

        if (!text || text.trim().length === 0) {
            throw new Error('No text provided for synthesis');
        }

        // Resolve voice - could be agent name or voice ID
        const voiceId = this.resolveVoiceId(voice);

        // Merge settings with defaults
        const mergedSettings = {
            ...DEFAULT_SETTINGS,
            ...settings,
        };

        try {
            const buffer = await elevenLabs.generateSpeech(
                text,
                voiceId,
                'eleven_turbo_v2_5', // Fast model for voice interactions
                {
                    stability: mergedSettings.stability,
                    similarity_boost: mergedSettings.similarity_boost,
                    style: mergedSettings.style,
                }
            );

            return buffer;
        } catch (error) {
            logger.error('Synthesis failed', error, 'ElevenLabsTTS');
            throw error;
        }
    }

    /**
     * Synthesize and play audio directly
     */
    async synthesizeAndPlay(text: string, voice: string, settings?: TTSSettings): Promise<void> {
        const buffer = await this.synthesize(text, voice, settings);
        await this.playBuffer(buffer);
    }

    /**
     * Play an audio buffer
     */
    async playBuffer(buffer: ArrayBuffer): Promise<void> {
        if (!this.audioContext) {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            this.audioContext = new AudioCtx();
        }

        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        const audioBuffer = await this.audioContext.decodeAudioData(buffer.slice(0));
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioContext.destination);

        return new Promise((resolve) => {
            source.onended = () => resolve();
            source.start(0);
        });
    }

    /**
     * Resolve voice identifier to ElevenLabs voice ID
     */
    private resolveVoiceId(voice: string): string {
        // If it looks like a voice ID (long string), use it directly
        if (voice.length > 15) {
            return voice;
        }

        // Otherwise, treat as agent name
        return this.getVoiceForAgent(voice);
    }

    /**
     * Get voice config by name
     */
    getVoiceConfig(name: string): VoiceConfig | undefined {
        return this.voices.find(v =>
            v.name.toLowerCase() === name.toLowerCase()
        );
    }

    /**
     * Get all available voices
     */
    getAvailableVoices(): VoiceConfig[] {
        return [...this.voices];
    }

    /**
     * Check if a specific voice is available
     */
    hasVoice(name: string): boolean {
        return this.getVoiceConfig(name) !== undefined;
    }
}

// Singleton export
export const elevenLabsTTS = new ElevenLabsTTSProvider();
