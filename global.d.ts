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
    // VITE_GEMINI_API_KEY / GEMINI_API_KEY are deliberately NOT declared.
    // Vite inlines every VITE_-prefixed var into the public client bundle, so declaring
    // them invites shipping an operator key to every visitor. That caused
    // INC-2026-07-20-01: a key was served publicly for ~145 days, harvested, and the
    // GCP project was suspended. Gemini keys now come from the vault only
    // (services/apiKeyService.ts). Leaving these undeclared makes any reintroduction
    // a TypeScript error rather than a silent leak.
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
