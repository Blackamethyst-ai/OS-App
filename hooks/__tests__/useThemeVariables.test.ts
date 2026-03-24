// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useThemeVariables } from '../useThemeVariables';
import { AppTheme } from '../../types/domain/core';

describe('useThemeVariables', () => {
    beforeEach(() => {
        // Reset document state before each test
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.classList.remove('dark');
    });

    it('should return light theme variables for AppTheme.LIGHT', () => {
        const { result } = renderHook(() => useThemeVariables(AppTheme.LIGHT));
        expect(result.current['--bg-app']).toBe('#F8FAFC');
        expect(result.current['--text-primary']).toBe('#0F172A');
        expect(result.current['--text-muted']).toBe('#64748B');
    });

    it('should set data-theme to light and remove dark class for LIGHT theme', () => {
        renderHook(() => useThemeVariables(AppTheme.LIGHT));
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should return amber theme variables for AppTheme.AMBER', () => {
        const { result } = renderHook(() => useThemeVariables(AppTheme.AMBER));
        expect(result.current['--bg-app']).toBe('#0C0600');
        expect(result.current['--text-primary']).toBe('#f59e0b');
        expect(result.current['--cyan']).toBe('#f59e0b');
    });

    it('should set data-theme to dark and add dark class for AMBER theme', () => {
        renderHook(() => useThemeVariables(AppTheme.AMBER));
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should return midnight theme variables for AppTheme.MIDNIGHT', () => {
        const { result } = renderHook(() => useThemeVariables(AppTheme.MIDNIGHT));
        expect(result.current['--bg-app']).toBe('#020617');
        expect(result.current['--text-primary']).toBe('#e2e8f0');
        expect(result.current['--amethyst']).toBe('#6366f1');
    });

    it('should return neon cyber theme variables for AppTheme.NEON_CYBER', () => {
        const { result } = renderHook(() => useThemeVariables(AppTheme.NEON_CYBER));
        expect(result.current['--bg-app']).toBe('#020204');
        expect(result.current['--text-primary']).toBe('#18E6FF');
        expect(result.current['--plasma-green']).toBe('#00ff88');
    });

    it('should return default dark theme variables for AppTheme.DARK', () => {
        const { result } = renderHook(() => useThemeVariables(AppTheme.DARK));
        expect(result.current['--bg-app']).toBe('#020204');
        expect(result.current['--text-primary']).toBe('#FFFFFF');
        expect(result.current['--text-muted']).toBe('#94A3B8');
    });

    it('should set dark class for all non-light themes', () => {
        const darkThemes = [AppTheme.DARK, AppTheme.AMBER, AppTheme.MIDNIGHT, AppTheme.NEON_CYBER];
        for (const theme of darkThemes) {
            document.documentElement.classList.remove('dark');
            renderHook(() => useThemeVariables(theme));
            expect(document.documentElement.classList.contains('dark')).toBe(true);
        }
    });

    it('should remove dark class when switching from dark to light', () => {
        // Start with dark
        const { rerender } = renderHook(
            ({ theme }) => useThemeVariables(theme),
            { initialProps: { theme: AppTheme.DARK } },
        );
        expect(document.documentElement.classList.contains('dark')).toBe(true);

        // Switch to light
        rerender({ theme: AppTheme.LIGHT });
        expect(document.documentElement.classList.contains('dark')).toBe(false);
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should return all expected CSS variable keys', () => {
        const { result } = renderHook(() => useThemeVariables(AppTheme.DARK));
        const expectedKeys = [
            '--bg-app',
            '--bg-header',
            '--bg-panel',
            '--bg-side',
            '--bg-card-top',
            '--bg-card-bottom',
            '--text-primary',
            '--text-muted',
            '--border-main',
            '--cyan',
            '--amethyst',
            '--plasma-green',
            '--executive-gold',
        ];
        for (const key of expectedKeys) {
            expect(result.current).toHaveProperty(key);
        }
    });

    it('should memoize result for same theme', () => {
        const { result, rerender } = renderHook(
            ({ theme }) => useThemeVariables(theme),
            { initialProps: { theme: AppTheme.MIDNIGHT } },
        );
        const first = result.current;
        rerender({ theme: AppTheme.MIDNIGHT });
        expect(result.current).toBe(first);
    });
});
