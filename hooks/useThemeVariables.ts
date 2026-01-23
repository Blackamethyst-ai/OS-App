import { useMemo } from 'react';
import { AppTheme } from '../types';

export interface ThemeVariables {
    '--bg-app': string;
    '--bg-header': string;
    '--bg-panel': string;
    '--bg-side': string;
    '--bg-card-top': string;
    '--bg-card-bottom': string;
    '--text-primary': string;
    '--text-muted': string;
    '--border-main': string;
    '--cyan': string;
    '--amethyst': string;
    '--plasma-green': string;
    '--executive-gold': string;
}

export const useThemeVariables = (theme: AppTheme): ThemeVariables => {
    return useMemo(() => {
        const isDark = theme !== AppTheme.LIGHT;

        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        if (isDark) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');

        switch (theme) {
            case AppTheme.LIGHT: return {
                '--bg-app': '#F8FAFC',
                '--bg-header': 'rgba(255, 255, 255, 0.7)',
                '--bg-panel': 'rgba(241, 245, 249, 0.4)',
                '--bg-side': '#F1F5F9',
                '--bg-card-top': 'rgba(255, 255, 255, 0.6)',
                '--bg-card-bottom': 'rgba(241, 245, 249, 0.4)',
                '--text-primary': '#0F172A',
                '--text-muted': '#64748B',
                '--border-main': 'rgba(15, 23, 42, 0.08)',
                '--cyan': '#18E6FF',
                '--amethyst': '#7B2CFF',
                '--plasma-green': '#10b981',
                '--executive-gold': '#f1c21b'
            };
            case AppTheme.AMBER: return {
                '--bg-app': '#0C0600',
                '--bg-header': 'rgba(12, 6, 0, 0.7)',
                '--bg-panel': 'rgba(20, 10, 0, 0.4)',
                '--bg-side': '#0E0700',
                '--bg-card-top': 'rgba(245, 158, 11, 0.12)',
                '--bg-card-bottom': 'rgba(15, 8, 0, 0.08)',
                '--text-primary': '#f59e0b',
                '--text-muted': '#92400e',
                '--border-main': 'rgba(245, 158, 11, 0.15)',
                '--cyan': '#f59e0b',
                '--amethyst': '#b45309',
                '--plasma-green': '#84cc16',
                '--executive-gold': '#fbbf24'
            };
            case AppTheme.MIDNIGHT: return {
                '--bg-app': '#020617',
                '--bg-header': 'rgba(2, 6, 23, 0.8)',
                '--bg-panel': 'rgba(3, 10, 33, 0.4)',
                '--bg-side': '#030a21',
                '--bg-card-top': 'rgba(59, 130, 246, 0.12)',
                '--bg-card-bottom': 'rgba(7, 10, 20, 0.06)',
                '--text-primary': '#e2e8f0',
                '--text-muted': '#64748b',
                '--border-main': 'rgba(59, 130, 246, 0.15)',
                '--cyan': '#38bdf8',
                '--amethyst': '#6366f1',
                '--plasma-green': '#22c55e',
                '--executive-gold': '#eab308'
            };
            case AppTheme.NEON_CYBER: return {
                '--bg-app': '#020204',
                '--bg-header': 'rgba(2, 2, 4, 0.8)',
                '--bg-panel': 'rgba(255, 255, 255, 0.015)',
                '--bg-side': '#050505',
                '--bg-card-top': 'rgba(24, 230, 255, 0.08)',
                '--bg-card-bottom': 'rgba(123, 44, 255, 0.05)',
                '--text-primary': '#18E6FF',
                '--text-muted': '#7B2CFF',
                '--border-main': 'rgba(24, 230, 255, 0.2)',
                '--cyan': '#18E6FF',
                '--amethyst': '#7B2CFF',
                '--plasma-green': '#00ff88',
                '--executive-gold': '#ffdd00'
            };
            default: return {
                '--bg-app': '#020204',
                '--bg-header': 'rgba(2, 2, 4, 0.8)',
                '--bg-panel': 'rgba(255, 255, 255, 0.012)',
                '--bg-side': '#080808',
                '--bg-card-top': 'rgba(255, 255, 255, 0.06)',
                '--bg-card-bottom': 'rgba(255, 255, 255, 0.02)',
                '--text-primary': '#FFFFFF',
                '--text-muted': '#94A3B8',
                '--border-main': 'rgba(255, 255, 255, 0.08)',
                '--cyan': '#18E6FF',
                '--amethyst': '#7B2CFF',
                '--plasma-green': '#10b981',
                '--executive-gold': '#f1c21b'
            };
        }
    }, [theme]);
};
