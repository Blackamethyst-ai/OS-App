/**
 * ElevenLabs TTS Provider for Voice Nexus
 *
 * Premium text-to-speech with emotional expression.
 * Used for high-quality voice output on complex/deep responses.
 *
 * @example
 * ```typescript
 * import { createElevenLabsTTS } from '@metaventionsai/voice-nexus/providers/tts/elevenlabs';
 *
 * const tts = createElevenLabsTTS();
 *
 * // Synthesize speech
 * const buffer = await tts.synthesize('Hello world!', 'mike');
 * ```
 */

import type { TTSProvider, VoiceConfig, TTSSettings } from '../../types';

export interface ElevenLabsOptions {
    /** API key - defaults to ELEVENLABS_API_KEY env var */
    apiKey?: string;
    /** Default model ID */
    modelId?: string;
    /** Custom voice configurations */
    voices?: VoiceConfig[];
    /** Agent to voice ID mappings */
    agentVoiceMap?: Record<string, string>;
}

/** Default ElevenLabs voice IDs */
export const ELEVENLABS_VOICE_IDS = {
    DR_IRA: 'ygqFiT0uI8EFPIGbhK6d',
    MIKE: '2EiwWnXFnvU5JabPnv8n',
    CALEB: 'EXAVITQu4vr4xnSDxMaL',
    PARAMDEEP: 'ODq5zmih8GrVes37Dizd',
    BILAL: 'SvaPV9dIxFGNM3dxA1j0',
    PERRI: 'FGY2WhTYpPnrIDTdsKH5',
    HELEN: '6YjcKsHQQptWccqMxEXz',
    NOAH: 'L0Dsvb3SLTyegXwtm47J',
} as const;

/** Default voice configurations */
const DEFAULT_VOICES: VoiceConfig[] = [
    { id: ELEVENLABS_VOICE_IDS.DR_IRA, name: 'Dr. Ira', gender: 'male', description: 'Deep, authoritative' },
    { id: ELEVENLABS_VOICE_IDS.MIKE, name: 'Mike', gender: 'male', description: 'Narrative, American' },
    { id: ELEVENLABS_VOICE_IDS.CALEB, name: 'Caleb', gender: 'male', description: 'News anchor, professional' },
    { id: ELEVENLABS_VOICE_IDS.PARAMDEEP, name: 'Paramdeep', gender: 'male', description: 'Casual, conversational' },
    { id: ELEVENLABS_VOICE_IDS.BILAL, name: 'Bilal', gender: 'male', description: 'Energetic, gaming' },
    { id: ELEVENLABS_VOICE_IDS.PERRI, name: 'Perri', gender: 'female', description: 'Clear, American' },
    { id: ELEVENLABS_VOICE_IDS.HELEN, name: 'Helen', gender: 'female', description: 'Strong, expressive' },
    { id: ELEVENLABS_VOICE_IDS.NOAH, name: 'Noah', gender: 'female', description: 'Gentle, narrative' },
];

/** Default agent to voice mappings */
const DEFAULT_AGENT_VOICE_MAP: Record<string, string> = {
    'dr. ira': ELEVENLABS_VOICE_IDS.DR_IRA,
    'dr_ira': ELEVENLABS_VOICE_IDS.DR_IRA,
    'ira': ELEVENLABS_VOICE_IDS.DR_IRA,
    'mike': ELEVENLABS_VOICE_IDS.MIKE,
    'caleb': ELEVENLABS_VOICE_IDS.CALEB,
    'paramdeep': ELEVENLABS_VOICE_IDS.PARAMDEEP,
    'bilal': ELEVENLABS_VOICE_IDS.BILAL,
    'perri': ELEVENLABS_VOICE_IDS.PERRI,
    'helen': ELEVENLABS_VOICE_IDS.HELEN,
    'noah': ELEVENLABS_VOICE_IDS.NOAH,
};

/** Default TTS settings */
const DEFAULT_SETTINGS: TTSSettings = {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.3,
};

const API_BASE_URL = 'https://api.elevenlabs.io/v1';

/**
 * Create an ElevenLabs TTS provider for Voice Nexus
 *
 * No additional dependencies required - uses native fetch API.
 */
export function createElevenLabsTTS(options?: ElevenLabsOptions): TTSProvider {
    const apiKey = options?.apiKey || process.env.ELEVENLABS_API_KEY;
    const modelId = options?.modelId || 'eleven_turbo_v2_5';
    const voices = options?.voices || DEFAULT_VOICES;
    const agentVoiceMap = {
        ...DEFAULT_AGENT_VOICE_MAP,
        ...options?.agentVoiceMap,
    };

    /**
     * Resolve voice identifier to ElevenLabs voice ID
     */
    function resolveVoiceId(voice: string): string {
        // If it looks like a voice ID (long string), use it directly
        if (voice.length > 15) {
            return voice;
        }

        // Otherwise, treat as agent name
        const normalized = voice.toLowerCase().trim();
        return agentVoiceMap[normalized] || ELEVENLABS_VOICE_IDS.MIKE;
    }

    return {
        name: 'elevenlabs',
        supportsStreaming: true,
        voices,

        isAvailable(): boolean {
            return !!apiKey;
        },

        getVoiceForAgent(agentName: string): string {
            const normalized = agentName.toLowerCase().trim();
            return agentVoiceMap[normalized] || ELEVENLABS_VOICE_IDS.MIKE;
        },

        async synthesize(text: string, voice: string, settings?: TTSSettings): Promise<ArrayBuffer> {
            if (!apiKey) {
                throw new Error(
                    'ElevenLabs API key not configured. ' +
                    'Set ELEVENLABS_API_KEY environment variable or pass apiKey option.'
                );
            }

            if (!text || text.trim().length === 0) {
                throw new Error('No text provided for synthesis');
            }

            const voiceId = resolveVoiceId(voice);

            // Merge settings with defaults
            const mergedSettings = {
                ...DEFAULT_SETTINGS,
                ...settings,
            };

            const response = await fetch(`${API_BASE_URL}/text-to-speech/${voiceId}`, {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': apiKey,
                },
                body: JSON.stringify({
                    text,
                    model_id: modelId,
                    voice_settings: {
                        stability: mergedSettings.stability,
                        similarity_boost: mergedSettings.similarity_boost,
                        style: mergedSettings.style,
                    },
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`);
            }

            return response.arrayBuffer();
        },

        async synthesizeStream(
            text: string,
            voice: string,
            onChunk: (chunk: ArrayBuffer) => void
        ): Promise<void> {
            if (!apiKey) {
                throw new Error('ElevenLabs API key not configured.');
            }

            const voiceId = resolveVoiceId(voice);

            const response = await fetch(`${API_BASE_URL}/text-to-speech/${voiceId}/stream`, {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': apiKey,
                },
                body: JSON.stringify({
                    text,
                    model_id: modelId,
                    voice_settings: DEFAULT_SETTINGS,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`);
            }

            if (!response.body) {
                throw new Error('No response body for streaming');
            }

            const reader = response.body.getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value) {
                    onChunk(value.buffer);
                }
            }
        },
    };
}

/**
 * Get available ElevenLabs voices
 */
export function getElevenLabsVoices(): VoiceConfig[] {
    return [...DEFAULT_VOICES];
}

// Default export for convenience
export default createElevenLabsTTS;
