// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useServiceHealth } from '../useServiceHealth';

describe('useServiceHealth', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should start with checking status', () => {
        (globalThis.fetch as any).mockImplementation(() => new Promise(() => {}));
        const { result } = renderHook(() => useServiceHealth());
        expect(result.current.agentCore).toBe('checking');
        expect(result.current.ollama).toBe('checking');
    });

    it('should set online when services respond ok', async () => {
        let resolvers: Array<(v: any) => void> = [];
        (globalThis.fetch as any).mockImplementation(() => new Promise(r => resolvers.push(r)));

        const { result } = renderHook(() => useServiceHealth());

        // Resolve both fetch calls
        await act(async () => {
            resolvers.forEach(r => r({ ok: true }));
            await new Promise(r => setTimeout(r, 0));
        });

        expect(result.current.agentCore).toBe('online');
        expect(result.current.ollama).toBe('online');
    });

    it('should set offline when services fail', async () => {
        let rejecters: Array<(e: Error) => void> = [];
        (globalThis.fetch as any).mockImplementation(() => new Promise((_, rej) => rejecters.push(rej)));

        const { result } = renderHook(() => useServiceHealth());

        await act(async () => {
            rejecters.forEach(r => r(new Error('Network error')));
            await new Promise(r => setTimeout(r, 0));
        });

        expect(result.current.agentCore).toBe('offline');
        expect(result.current.ollama).toBe('offline');
    });

    it('should set offline when response is not ok', async () => {
        let resolvers: Array<(v: any) => void> = [];
        (globalThis.fetch as any).mockImplementation(() => new Promise(r => resolvers.push(r)));

        const { result } = renderHook(() => useServiceHealth());

        await act(async () => {
            resolvers.forEach(r => r({ ok: false }));
            await new Promise(r => setTimeout(r, 0));
        });

        expect(result.current.agentCore).toBe('offline');
        expect(result.current.ollama).toBe('offline');
    });
});
