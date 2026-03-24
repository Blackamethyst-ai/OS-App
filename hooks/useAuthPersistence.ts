/**
 * AUTH PERSISTENCE HOOK
 *
 * Persists authentication state to localStorage so users stay logged in
 * across page refreshes and browser sessions.
 */

import { useEffect } from 'react';
import { logger } from '../services/logger';
import { useAppStore } from '../store';

const AUTH_KEY = 'metaventions_authenticated';
const USER_KEY = 'metaventions_user';

export const useAuthPersistence = (): void => {
    const authenticated = useAppStore(s => s.authenticated);
    const user = useAppStore(s => s.user);
    const actions = useAppStore(s => s.actions);

    // On mount: restore auth state from localStorage
    useEffect(() => {
        try {
            const savedAuth = localStorage.getItem(AUTH_KEY);
            const savedUser = localStorage.getItem(USER_KEY);

            if (savedAuth === 'true') {
                actions.setAuthenticated(true);

                if (savedUser) {
                    const userData = JSON.parse(savedUser);
                    actions.setUserProfile(userData);
                }
            }
        } catch (e) {
            logger.warn('Failed to restore auth state:', e);
        }
    }, []);

    // When auth changes: persist to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(AUTH_KEY, String(authenticated));

            if (authenticated) {
                localStorage.setItem(USER_KEY, JSON.stringify({
                    displayName: user.displayName,
                    role: user.role,
                    clearanceLevel: user.clearanceLevel
                }));
            }
        } catch (e) {
            logger.warn('Failed to persist auth state:', e);
        }
    }, [authenticated, user.displayName, user.role, user.clearanceLevel]);
};

// Utility to clear auth (for logout)
export const clearAuthPersistence = (): void => {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(USER_KEY);
};
