import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { apiKeyService } from '../services/apiKeyService';
import { collabService } from '../services/collabService';

export interface UseApiKeyModalResult {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

export const useApiKeyModal = (): UseApiKeyModalResult => {
    const actions = useAppStore(s => s.actions);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        collabService.init();
        actions.hydrateAgents();

        // Listen for API key modal events
        const handleShowModal = () => setIsOpen(true);
        window.addEventListener('show-api-key-modal', handleShowModal);

        // Auto-show modal if no key configured
        let apiKeyTimer: ReturnType<typeof setTimeout> | null = null;
        if (!apiKeyService.hasGeminiKey()) {
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
            // Check if we have a key in Environment OR LocalStorage
            const hasEnvKey = !!(import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY));
            const hasLocalKey = !!localStorage.getItem('gemini_api_key');

            if (!hasEnvKey && !hasLocalKey) {
                console.log("🔐 AUTH EXTENSION: No key found. Triggering auto-prompt.");
                // No key found anywhere. Prompt the user.
                warningTimer = setTimeout(() => {
                    actions.addLog('WARN', 'SECURITY: Neural Uplink Credentials missing.');
                }, 1000);
            } else {
                console.log("🔐 AUTH EXTENSION: Key detected.", { env: hasEnvKey, local: hasLocalKey });
            }
        };
        checkKey();

        return () => {
            if (warningTimer) clearTimeout(warningTimer);
        };
    }, [actions]);

    return { isOpen, setIsOpen };
};
