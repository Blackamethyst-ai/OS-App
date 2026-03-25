import { useEffect } from 'react';
import { useAppStore } from '../store';
import { AppMode } from '../types/domain/core';
import { audio } from '../services/audioService';

/** Keyboard shortcut → AppMode mapping (Cmd/Ctrl + number) */
const SHORTCUTS: Record<string, AppMode> = {
    '1': AppMode.DASHBOARD,
    '2': AppMode.METAVENTIONS_HUB,
    '3': AppMode.VOICE_MODE,
    '4': AppMode.AGENT_CONTROL,
    '5': AppMode.IMAGE_GEN,
    '6': AppMode.CODE_STUDIO,
    '7': AppMode.MEMORY_CORE,
    '8': AppMode.HARDWARE_ENGINEER,
    '9': AppMode.AUTONOMOUS_FINANCE,
    '0': AppMode.ARCHON,
};

/** AppMode → hash route slug (mirrors SynapticRouter's routeMap) */
const MODE_TO_ROUTE: Record<AppMode, string> = {
    [AppMode.DASHBOARD]: 'dashboard',
    [AppMode.METAVENTIONS_HUB]: 'metaventions-hub',
    [AppMode.VOICE_MODE]: 'voice',
    [AppMode.AGENT_CONTROL]: 'agents',
    [AppMode.IMAGE_GEN]: 'assets',
    [AppMode.CODE_STUDIO]: 'code',
    [AppMode.MEMORY_CORE]: 'memory',
    [AppMode.HARDWARE_ENGINEER]: 'hardware',
    [AppMode.AUTONOMOUS_FINANCE]: 'finance',
    [AppMode.ARCHON]: 'archon',
    [AppMode.SYNTHESIS_BRIDGE]: 'bridge',
    [AppMode.BIBLIOMORPHIC]: 'bibliomorphic',
    [AppMode.PROCESS_MAP]: 'process',
    [AppMode.NEXUS]: 'nexus',
    [AppMode.BICAMERAL]: 'bicameral',
    [AppMode.AGENT_CORE_TEST]: 'sdk-test',
    [AppMode.CPB_TEST]: 'cpb-test',
    [AppMode.META_LEARNING]: 'predictions',
    [AppMode.SOVEREIGN_GALLERY]: 'vault',
};

export function useGlobalShortcuts() {
    const actions = useAppStore(s => s.actions);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Don't trigger when typing in inputs
            const target = e.target as HTMLElement;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                return;
            }

            // Cmd/Ctrl + number for sector navigation
            if ((e.metaKey || e.ctrlKey) && SHORTCUTS[e.key]) {
                e.preventDefault();
                const mode = SHORTCUTS[e.key];
                actions.setMode(mode);
                window.location.hash = `#/${MODE_TO_ROUTE[mode] || 'dashboard'}`;
                audio.playTransition();
                return;
            }

            // Cmd/Ctrl+K for command palette
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                actions.toggleCommandPalette();
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [actions]);
}
