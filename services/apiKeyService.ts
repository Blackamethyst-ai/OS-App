/**
 * API KEY SERVICE
 * Manages API keys for multiple providers with encrypted localStorage persistence.
 * Uses AES-GCM encryption with a master password for security.
 */

import { encrypt, decrypt, hashPassword, verifyPassword } from '../utils/cryptoService';
import { logger } from './logger';

export interface ApiKeyConfig {
    gemini?: string;
    claude?: string;
    grok?: string;
    openai?: string;
    eleven_labs?: string;
    deepgram?: string;
    priceapi?: string;
    infracost?: string;
}

const STORAGE_KEY = 'os_app_api_keys_encrypted';
const PASSWORD_HASH_KEY = 'os_app_master_hash';
const SESSION_KEY = 'os_app_session_unlocked';

class ApiKeyService {
    private keys: ApiKeyConfig = {};
    private listeners: Set<() => void> = new Set();
    private masterPassword: string | null = null;
    private isUnlocked: boolean = false;

    constructor() {
        // Check if there's an existing vault
        this.checkVaultStatus();
    }

    /**
     * Check if a vault exists (master password has been set)
     */
    hasVault(): boolean {
        return !!localStorage.getItem(PASSWORD_HASH_KEY);
    }

    /**
     * Check if the vault is currently unlocked
     */
    isVaultUnlocked(): boolean {
        return this.isUnlocked && this.masterPassword !== null;
    }

    /**
     * Check vault status on load
     */
    private async checkVaultStatus() {
        // If there's no vault, we're in "setup" mode
        if (!this.hasVault()) {
            this.isUnlocked = false;
            return;
        }

        // Try to auto-unlock from session
        const sessionPassword = sessionStorage.getItem(SESSION_KEY);
        if (sessionPassword) {
            const success = await this.unlockVault(sessionPassword);
            if (success) {
                // Vault auto-unlocked from session
                return;
            }
        }

        // Vault exists but needs to be unlocked
        this.isUnlocked = false;
    }

    /**
     * Create a new vault with a master password
     */
    async createVault(password: string): Promise<boolean> {
        try {
            // Hash the password for verification
            const hash = await hashPassword(password);
            localStorage.setItem(PASSWORD_HASH_KEY, hash);

            // Encrypt empty keys object
            this.keys = {};
            this.masterPassword = password;
            this.isUnlocked = true;
            await this.saveToStorage();

            // Persist session
            sessionStorage.setItem(SESSION_KEY, password);

            this.notifyListeners();
            return true;
        } catch (e) {
            logger.error('Failed to create vault', e, 'ApiKeyService');
            return false;
        }
    }

    /**
     * Unlock the vault with master password
     */
    async unlockVault(password: string): Promise<boolean> {
        try {
            const storedHash = localStorage.getItem(PASSWORD_HASH_KEY);
            if (!storedHash) return false;

            const isValid = await verifyPassword(password, storedHash);
            if (!isValid) return false;

            this.masterPassword = password;
            await this.loadFromStorage();
            this.isUnlocked = true;

            // Persist session
            sessionStorage.setItem(SESSION_KEY, password);

            this.notifyListeners();
            return true;
        } catch (e) {
            logger.error('Failed to unlock vault', e, 'ApiKeyService');
            return false;
        }
    }

    /**
     * Lock the vault (clear session)
     */
    lockVault() {
        this.masterPassword = null;
        this.keys = {};
        this.isUnlocked = false;
        this.notifyListeners();
    }

    /**
     * Load and decrypt keys from localStorage
     */
    private async loadFromStorage() {
        if (!this.masterPassword) return;

        try {
            const encrypted = localStorage.getItem(STORAGE_KEY);
            if (encrypted) {
                const decrypted = await decrypt(encrypted, this.masterPassword);
                this.keys = JSON.parse(decrypted);
            }
        } catch (e) {
            logger.error('Failed to load/decrypt keys', e, 'ApiKeyService');
            this.keys = {};
        }
    }

    /**
     * Encrypt and save keys to localStorage
     */
    private async saveToStorage() {
        if (!this.masterPassword) return;

        try {
            const encrypted = await encrypt(JSON.stringify(this.keys), this.masterPassword);
            localStorage.setItem(STORAGE_KEY, encrypted);
        } catch (e) {
            logger.error('Failed to encrypt/save keys', e, 'ApiKeyService');
        }
    }

    /**
     * Get API key for a provider (only works when unlocked)
     */
    getKey(provider: 'gemini' | 'claude' | 'grok' | 'openai' | 'eleven_labs' | 'deepgram' | 'priceapi' | 'infracost'): string | undefined {
        if (!this.isUnlocked) return undefined;
        return this.keys[provider];
    }

    /**
     * Get Gemini key (most common usage)
     */
    getGeminiKey(): string | undefined {
        if (!this.isUnlocked) return undefined;
        return this.keys.gemini;
    }

    /**
     * Set API key for a provider
     */
    async setKey(provider: 'gemini' | 'claude' | 'grok' | 'openai' | 'eleven_labs' | 'deepgram' | 'priceapi' | 'infracost', key: string) {
        if (!this.isUnlocked) return;

        this.keys[provider] = key;
        await this.saveToStorage();
        this.notifyListeners();
    }

    /**
     * Remove API key for a provider
     */
    async removeKey(provider: 'gemini' | 'claude' | 'grok' | 'openai' | 'eleven_labs' | 'deepgram' | 'priceapi' | 'infracost') {
        if (!this.isUnlocked) return;

        delete this.keys[provider];
        await this.saveToStorage();
        this.notifyListeners();
    }

    /**
     * Check if any API key is configured
     */
    hasAnyKey(): boolean {
        if (!this.isUnlocked) return false;
        return !!(this.keys.gemini || this.keys.claude || this.keys.grok || this.keys.openai || this.keys.eleven_labs || this.keys.deepgram || this.keys.priceapi || this.keys.infracost);
    }

    /**
     * Check if Gemini key is configured
     */
    hasGeminiKey(): boolean {
        if (!this.isUnlocked) return false;
        return !!this.keys.gemini;
    }

    /**
     * Get all configured keys (masked for display)
     */
    getKeyStatus(): { provider: string; configured: boolean; masked: string }[] {
        if (!this.isUnlocked) {
            return [
                { provider: 'gemini', configured: false, masked: '' },
                { provider: 'claude', configured: false, masked: '' },
                { provider: 'grok', configured: false, masked: '' },
                { provider: 'openai', configured: false, masked: '' },
                { provider: 'eleven_labs', configured: false, masked: '' },
                { provider: 'deepgram', configured: false, masked: '' },
                { provider: 'priceapi', configured: false, masked: '' },
                { provider: 'infracost', configured: false, masked: '' }
            ];
        }

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
            },
            {
                provider: 'openai',
                configured: !!this.keys.openai,
                masked: this.keys.openai ? `${this.keys.openai.slice(0, 6)}...${this.keys.openai.slice(-4)}` : ''
            },
            {
                provider: 'eleven_labs',
                configured: !!this.keys.eleven_labs,
                masked: this.keys.eleven_labs ? `${this.keys.eleven_labs.slice(0, 6)}...${this.keys.eleven_labs.slice(-4)}` : ''
            },
            {
                provider: 'deepgram',
                configured: !!this.keys.deepgram,
                masked: this.keys.deepgram ? `${this.keys.deepgram.slice(0, 6)}...${this.keys.deepgram.slice(-4)}` : ''
            },
            {
                provider: 'priceapi',
                configured: !!this.keys.priceapi,
                masked: this.keys.priceapi ? `${this.keys.priceapi.slice(0, 6)}...${this.keys.priceapi.slice(-4)}` : ''
            },
            {
                provider: 'infracost',
                configured: !!this.keys.infracost,
                masked: this.keys.infracost ? `${this.keys.infracost.slice(0, 6)}...${this.keys.infracost.slice(-4)}` : ''
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
     * Change master password
     */
    async changeMasterPassword(currentPassword: string, newPassword: string): Promise<boolean> {
        try {
            const storedHash = localStorage.getItem(PASSWORD_HASH_KEY);
            if (!storedHash) return false;

            const isValid = await verifyPassword(currentPassword, storedHash);
            if (!isValid) return false;

            // Update password hash
            const newHash = await hashPassword(newPassword);
            localStorage.setItem(PASSWORD_HASH_KEY, newHash);

            // Re-encrypt all keys with new password
            this.masterPassword = newPassword;
            await this.saveToStorage();

            return true;
        } catch (e) {
            logger.error('Failed to change password', e, 'ApiKeyService');
            return false;
        }
    }

    /**
     * Reset vault (delete all keys and password)
     */
    resetVault() {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(PASSWORD_HASH_KEY);
        this.keys = {};
        this.masterPassword = null;
        this.isUnlocked = false;
        this.notifyListeners();
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

    /**
     * Validate ElevenLabs API Key via user endpoint
     */
    async validateElevenLabsKey(key: string): Promise<{ valid: boolean; error?: string }> {
        try {
            const response = await fetch('https://api.elevenlabs.io/v1/user', {
                method: 'GET',
                headers: { 'xi-api-key': key }
            });

            if (response.ok) return { valid: true };
            return { valid: false, error: 'Invalid API Key' };
        } catch (e: any) {
            return { valid: false, error: e.message || 'Validation failed' };
        }
    }

    /**
     * Validate Deepgram API Key via projects endpoint
     */
    async validateDeepgramKey(key: string): Promise<{ valid: boolean; error?: string }> {
        try {
            const response = await fetch('https://api.deepgram.com/v1/projects', {
                method: 'GET',
                headers: { 'Authorization': `Token ${key}` }
            });

            if (response.ok) return { valid: true };
            if (response.status === 401 || response.status === 403) {
                return { valid: false, error: 'Invalid API Key' };
            }
            return { valid: false, error: `Validation failed: ${response.status}` };
        } catch (e: any) {
            return { valid: false, error: e.message || 'Validation failed' };
        }
    }

    /**
     * Validate OpenAI API Key via models endpoint
     */
    async validateOpenAIKey(key: string): Promise<{ valid: boolean; error?: string }> {
        try {
            const response = await fetch('https://api.openai.com/v1/models', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${key}` }
            });

            if (response.ok) return { valid: true };
            if (response.status === 401) {
                return { valid: false, error: 'Invalid API Key' };
            }
            if (response.status === 429) {
                // Rate limited but key is valid
                return { valid: true };
            }
            return { valid: false, error: `Validation failed: ${response.status}` };
        } catch (e: any) {
            return { valid: false, error: e.message || 'Validation failed' };
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
