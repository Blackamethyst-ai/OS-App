import { apiKeyService } from './apiKeyService';
import { logger } from './logger';

export const ELEVEN_LABS_VOICES = {
    // Male
    MIKE: 'TX3LPaxmHKxFdv7VOQHJ', // Liam: Narrative, American
    DR_IRA: '2EiwWnXFnvU5JabPnv8n', // Clyde: Deep, authoritative
    CALEB: '29vD33N1CtxCmqQRPOHJ', // Drew: News anchor, professional
    PARAMDEEP: 'ZFqH11593o6cW8aK3q1g', // Charlie: Casual, conversational
    BILAL: 'D38z5RcWu1voky8WS1ja', // Fin: Energetic, gaming

    // Female
    PERRI: '21m00Tcm4TlvDq8ikWAM', // Rachel: Clear, American
    HELEN: 'AZnzlk1XvdvUeBnXmlld', // Domi: Strong, expressive
    NOAH: 'ThT5KcBeYPX3keUQqHPh', // Dorothy: Gentle, British-ish
};

interface VoiceSettings {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
}

class ElevenLabsService {
    private baseUrl = 'https://api.elevenlabs.io/v1';

    private getHeaders() {
        const key = apiKeyService.getKey('eleven_labs');
        if (!key) throw new Error('ElevenLabs API Key not configured');

        return {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': key
        };
    }

    /**
     * Synthesis text to speech
     * @param text The text to speak
     * @param voiceId The ID of the voice to use
     * @param model 'eleven_turbo_v2_5' (Fast) or 'eleven_multilingual_v2' (High Quality)
     */
    async generateSpeech(
        text: string,
        voiceId: string,
        model: 'eleven_turbo_v2_5' | 'eleven_multilingual_v2' = 'eleven_turbo_v2_5',
        settings?: VoiceSettings
    ): Promise<ArrayBuffer> {
        if (!text) throw new Error('No text provided');

        const headers = this.getHeaders();

        const body = {
            text,
            model_id: model,
            voice_settings: settings || {
                stability: 0.5,
                similarity_boost: 0.75
            }
        };

        const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(`ElevenLabs Error: ${error.detail || response.statusText}`);
        }

        return await response.arrayBuffer();
    }

    /**
     * Stream speech (returns a ReadableStream - for advanced usage)
     * For now, returns an AudioBuffer to play immediately via AudioContext
     */
    private _audioCtx: AudioContext | null = null;
    private getAudioContext(): AudioContext {
        if (!this._audioCtx || this._audioCtx.state === 'closed') {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            this._audioCtx = new AudioCtx();
        }
        return this._audioCtx;
    }

    async streamSpeech(text: string, voiceId: string): Promise<AudioBuffer> {
        const arrayBuffer = await this.generateSpeech(text, voiceId, 'eleven_turbo_v2_5');
        const ctx = this.getAudioContext();
        return await ctx.decodeAudioData(arrayBuffer);
    }

    /**
     * Play raw audio directly
     */
    async playAudio(buffer: ArrayBuffer): Promise<void> {
        const ctx = this.getAudioContext();
        const audioBuffer = await ctx.decodeAudioData(buffer);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start(0);

        return new Promise(resolve => {
            source.onended = () => resolve();
        });
    }

    /**
     * Synthesize and Play in one go
     */
    async speak(text: string, voiceId: string, stability = 0.5): Promise<void> {
        try {
            const buffer = await this.generateSpeech(text, voiceId, 'eleven_turbo_v2_5', {
                stability,
                similarity_boost: 0.8
            });
            await this.playAudio(buffer);
        } catch (e) {
            logger.error('Speech synthesis failed', e, 'ElevenLabs');
        }
    }
}

export const elevenLabs = new ElevenLabsService();
