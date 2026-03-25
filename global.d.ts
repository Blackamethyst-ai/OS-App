/// <reference types="vite/client" />

/**
 * Global Type Declarations for Metaventions OS
 * Resolves TypeScript errors for window.aistudio and import.meta.env
 */

// Extend Window interface for AI Studio API
interface Window {
    aistudio?: {
        hasSelectedApiKey: () => Promise<boolean>;
        selectApiKey: () => Promise<string | null>;
    };
}

// Extend ImportMeta for Vite environment variables
interface ImportMetaEnv {
    readonly VITE_GEMINI_API_KEY?: string;
    readonly GEMINI_API_KEY?: string;
    /** Deepgram API key for streaming STT */
    readonly VITE_DEEPGRAM_API_KEY?: string;
    /** ElevenLabs API key for TTS */
    readonly VITE_ELEVENLABS_API_KEY?: string;
    /** Voice mode: 'gemini' | 'conversational' */
    readonly VITE_VOICE_MODE?: 'gemini' | 'conversational';
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

// Self-hosted font packages (CSS-only, no exports)
declare module '@fontsource-variable/inter';
declare module '@fontsource-variable/fira-code';
