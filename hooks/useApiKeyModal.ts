import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { apiKeyService } from '../services/apiKeyService';
import { collabService } from '../services/collabService';

export interface UseApiKeyModalResult {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

// Check if running in demo mode (URL param or session flag)
const isDemoMode = (): boolean => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === 'true') return true;
    if (sessionStorage.getItem('metaventions_demo_mode') === 'true') return true;
    // Demo Observer user (set by AuthModule demo bypass)
    try {
        const user = localStorage.getItem('metaventions_user');
        if (user && JSON.parse(user).displayName === 'Demo Observer') return true;
    } catch { /* ignore */ }
    return false;
};

export const useApiKeyModal = (): UseApiKeyModalResult => {
    const actions = useAppStore(s => s.actions);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        collabService.init();
        actions.hydrateAgents();

        // Listen for API key modal events
        const handleShowModal = () => setIsOpen(true);
        window.addEventListener('show-api-key-modal', handleShowModal);

        // Auto-show modal if no key configured (skip in demo mode)
        let apiKeyTimer: ReturnType<typeof setTimeout> | null = null;
        if (!apiKeyService.hasGeminiKey() && !isDemoMode()) {
            apiKeyTimer = setTimeout(() => setIsOpen(true), 1500);
        }

        return () => {
            collabService.disconnect();
            window.removeEventListener('show-api-key-modal', handleShowModal);
            if (apiKeyTimer) clearTimeout(apiKeyTimer);
        };
    }, []);

    useEffect(() => {
        let warningTimer: ReturnType<typeof setTimeout> | null = null;

        const checkKey = async () => {
            // Check if we have a key in Environment OR Vault
            const hasEnvKey = !!(import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY));
            const hasVaultKey = apiKeyService.hasGeminiKey();

            if (!hasEnvKey && !hasVaultKey) {
                // No key found anywhere. Prompt the user.
                warningTimer = setTimeout(() => {
                    actions.addLog('WARN', 'SECURITY: Neural Uplink Credentials missing.');
                }, 1000);
            }
        };
        checkKey();

        return () => {
            if (warningTimer) clearTimeout(warningTimer);
        };
    }, [actions]);

    return { isOpen, setIsOpen };
};
