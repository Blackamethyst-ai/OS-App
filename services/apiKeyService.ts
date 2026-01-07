/**
 * API KEY SERVICE
 * Manages API keys for multiple providers with localStorage persistence.
 * Replaces the window.aistudio dependency for standalone operation.
 */

export interface ApiKeyConfig {
    gemini?: string;
    claude?: string;
    grok?: string;
}

const STORAGE_KEY = 'os_app_api_keys';

class ApiKeyService {
    private keys: ApiKeyConfig = {};
    private listeners: Set<() => void> = new Set();

    constructor() {
        this.loadFromStorage();
    }

    /**
     * Load keys from localStorage
     */
    private loadFromStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                this.keys = JSON.parse(stored);
            }
            // Also check for legacy key format
            const legacyKey = localStorage.getItem('gemini_api_key');
            if (legacyKey && !this.keys.gemini) {
                this.keys.gemini = legacyKey;
                this.saveToStorage();
            }
        } catch (e) {
            console.error('[ApiKeyService] Failed to load keys:', e);
        }
    }

    /**
     * Save keys to localStorage
     */
    private saveToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.keys));
            // Also maintain legacy key for backwards compatibility
            if (this.keys.gemini) {
                localStorage.setItem('gemini_api_key', this.keys.gemini);
            }
        } catch (e) {
            console.error('[ApiKeyService] Failed to save keys:', e);
        }
    }

    /**
     * Get API key for a provider
     */
    getKey(provider: 'gemini' | 'claude' | 'grok'): string | undefined {
        return this.keys[provider];
    }

    /**
     * Get Gemini key (most common usage)
     */
    getGeminiKey(): string | undefined {
        return this.keys.gemini;
    }

    /**
     * Set API key for a provider
     */
    setKey(provider: 'gemini' | 'claude' | 'grok', key: string) {
        this.keys[provider] = key;
        this.saveToStorage();
        this.notifyListeners();
    }

    /**
     * Remove API key for a provider
     */
    removeKey(provider: 'gemini' | 'claude' | 'grok') {
        delete this.keys[provider];
        this.saveToStorage();
        this.notifyListeners();
    }

    /**
     * Check if any API key is configured
     */
    hasAnyKey(): boolean {
        return !!(this.keys.gemini || this.keys.claude || this.keys.grok);
    }

    /**
     * Check if Gemini key is configured (replaces window.aistudio.hasSelectedApiKey)
     */
    hasGeminiKey(): boolean {
        return !!this.keys.gemini;
    }

    /**
     * Get all configured keys (masked for display)
     */
    getKeyStatus(): { provider: string; configured: boolean; masked: string }[] {
        return [
            {
                provider: 'gemini',
                configured: !!this.keys.gemini,
                masked: this.keys.gemini ? `${this.keys.gemini.slice(0, 6)}...${this.keys.gemini.slice(-4)}` : ''
            },
            {
                provider: 'claude',
                configured: !!this.keys.claude,
                masked: this.keys.claude ? `${this.keys.claude.slice(0, 6)}...${this.keys.claude.slice(-4)}` : ''
            },
            {
                provider: 'grok',
                configured: !!this.keys.grok,
                masked: this.keys.grok ? `${this.keys.grok.slice(0, 6)}...${this.keys.grok.slice(-4)}` : ''
            }
        ];
    }

    /**
     * Subscribe to key changes
     */
    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notifyListeners() {
        this.listeners.forEach(listener => listener());
    }

    /**
     * Validate a Gemini API key by making a test request
     */
    async validateGeminiKey(key: string): Promise<{ valid: boolean; error?: string }> {
        try {
            const { GoogleGenAI } = await import('@google/genai');
            const ai = new GoogleGenAI({ apiKey: key });

            // Test with a minimal request
            await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: 'Hi'
            });

            return { valid: true };
        } catch (e: any) {
            const msg = e.message || '';
            if (msg.includes('401') || msg.includes('403') || msg.includes('API key')) {
                return { valid: false, error: 'Invalid API key' };
            }
            if (msg.includes('429') || msg.includes('quota')) {
                // Key is valid but rate limited
                return { valid: true };
            }
            return { valid: false, error: msg };
        }
    }
}

// Singleton instance
export const apiKeyService = new ApiKeyService();

/**
 * Compatibility function - replaces window.aistudio?.hasSelectedApiKey()
 */
export async function hasApiKey(): Promise<boolean> {
    return apiKeyService.hasGeminiKey();
}

/**
 * Compatibility function - shows key setup modal
 */
export async function promptForApiKey(): Promise<boolean> {
    // Dispatch event to show the API key modal
    window.dispatchEvent(new CustomEvent('show-api-key-modal'));
    return new Promise((resolve) => {
        const handler = () => {
            window.removeEventListener('api-key-saved', handler);
            resolve(apiKeyService.hasGeminiKey());
        };
        window.addEventListener('api-key-saved', handler);
    });
}
