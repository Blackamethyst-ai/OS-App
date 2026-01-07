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
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
