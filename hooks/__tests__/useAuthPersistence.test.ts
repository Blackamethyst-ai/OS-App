// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const mockSetAuthenticated = vi.hoisted(() => vi.fn());
const mockSetUserProfile = vi.hoisted(() => vi.fn());
const mockLoggerWarn = vi.hoisted(() => vi.fn());

vi.mock('../../services/logger', () => ({
    logger: { info: vi.fn(), warn: mockLoggerWarn, error: vi.fn(), debug: vi.fn() }
}));

let mockAuthenticated = vi.hoisted(() => false);
let mockUser = vi.hoisted(() => ({ displayName: 'TestUser', role: 'admin', clearanceLevel: 5 }));

vi.mock('../../store', () => ({
    useAppStore: (selector: any) => {
        const state = {
            authenticated: mockAuthenticated,
            user: mockUser,
            actions: {
                setAuthenticated: mockSetAuthenticated,
                setUserProfile: mockSetUserProfile,
            }
        };
        return selector ? selector(state) : state;
    }
}));

import { useAuthPersistence, clearAuthPersistence } from '../useAuthPersistence';

describe('useAuthPersistence', () => {
    let storage: Map<string, string>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthenticated = false;
        mockUser = { displayName: 'TestUser', role: 'admin', clearanceLevel: 5 };
        storage = new Map();
        const mockLocalStorage = {
            getItem: vi.fn((key: string) => storage.get(key) ?? null),
            setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
            removeItem: vi.fn((key: string) => storage.delete(key)),
            clear: vi.fn(() => storage.clear()),
            get length() { return storage.size; },
            key: vi.fn(),
        };
        vi.stubGlobal('localStorage', mockLocalStorage);
    });

    it('should restore authenticated state from localStorage on mount', () => {
        storage.set('metaventions_authenticated', 'true');
        storage.set('metaventions_user', JSON.stringify({ displayName: 'Dico', role: 'owner', clearanceLevel: 10 }));

        renderHook(() => useAuthPersistence());

        expect(mockSetAuthenticated).toHaveBeenCalledWith(true);
        expect(mockSetUserProfile).toHaveBeenCalledWith(
            expect.objectContaining({ displayName: 'Dico', role: 'owner' })
        );
    });

    it('should not restore auth when localStorage has no saved auth', () => {
        renderHook(() => useAuthPersistence());
        expect(mockSetAuthenticated).not.toHaveBeenCalled();
    });

    it('should not restore user when auth is true but no user data saved', () => {
        storage.set('metaventions_authenticated', 'true');

        renderHook(() => useAuthPersistence());

        expect(mockSetAuthenticated).toHaveBeenCalledWith(true);
        expect(mockSetUserProfile).not.toHaveBeenCalled();
    });

    it('should persist authenticated state to localStorage', () => {
        mockAuthenticated = true;

        renderHook(() => useAuthPersistence());

        expect(localStorage.setItem).toHaveBeenCalledWith('metaventions_authenticated', 'true');
    });

    it('should persist user data when authenticated', () => {
        mockAuthenticated = true;
        mockUser = { displayName: 'Agent', role: 'operator', clearanceLevel: 7 };

        renderHook(() => useAuthPersistence());

        expect(localStorage.setItem).toHaveBeenCalledWith(
            'metaventions_user',
            expect.stringContaining('"displayName":"Agent"')
        );
    });

    it('should persist false when not authenticated', () => {
        mockAuthenticated = false;

        renderHook(() => useAuthPersistence());

        expect(localStorage.setItem).toHaveBeenCalledWith('metaventions_authenticated', 'false');
    });

    it('should handle corrupted localStorage gracefully', () => {
        storage.set('metaventions_authenticated', 'true');
        storage.set('metaventions_user', '{invalid json}');

        renderHook(() => useAuthPersistence());

        expect(mockLoggerWarn).toHaveBeenCalledWith(
            'Failed to restore auth state:',
            expect.any(SyntaxError)
        );
    });

    it('should handle localStorage.setItem throwing', () => {
        (localStorage.setItem as any).mockImplementation(() => {
            throw new Error('QuotaExceeded');
        });

        // Should not throw
        renderHook(() => useAuthPersistence());

        expect(mockLoggerWarn).toHaveBeenCalledWith(
            'Failed to persist auth state:',
            expect.any(Error)
        );
    });

    it('should clear auth persistence via clearAuthPersistence', () => {
        storage.set('metaventions_authenticated', 'true');
        storage.set('metaventions_user', '{"displayName":"X"}');

        clearAuthPersistence();

        expect(localStorage.removeItem).toHaveBeenCalledWith('metaventions_authenticated');
        expect(localStorage.removeItem).toHaveBeenCalledWith('metaventions_user');
    });

    it('should persist clearanceLevel in user data', () => {
        mockAuthenticated = true;
        mockUser = { displayName: 'Test', role: 'viewer', clearanceLevel: 3 };

        renderHook(() => useAuthPersistence());

        expect(localStorage.setItem).toHaveBeenCalledWith(
            'metaventions_user',
            expect.stringContaining('"clearanceLevel":3')
        );
    });
});
