
import { useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { neuralVault } from '../services/persistenceService';
import { AppMode } from '../types';

export const useAutoSave = () => {
    const lastSave = useRef<number>(Date.now());
    const mode = useAppStore(s => s.mode); // Track mode for switch saving

    const saveCheckpoint = (state: any, label: string) => {
        let activeData = null;
        switch (state.mode) {
            case AppMode.PROCESS_MAP: activeData = state.process; break;
            case AppMode.CODE_STUDIO: activeData = state.codeStudio; break;
            case AppMode.HARDWARE_ENGINEER: activeData = state.hardware; break;
            case AppMode.BIBLIOMORPHIC: activeData = state.bibliomorphic; break;
            case AppMode.DASHBOARD: activeData = state.dashboard; break;
            case AppMode.IMAGE_GEN: activeData = state.imageGen; break;
        }

        if (activeData) {
            neuralVault.createCheckpoint(state.mode, activeData, label);
            lastSave.current = Date.now();
        }
    };

    // 1. Periodic Auto-Save
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            if (now - lastSave.current > 60000) {
                const state = useAppStore.getState();
                saveCheckpoint(state, 'Auto-Save');
            }
        }, 10000); 

        return () => clearInterval(interval);
    }, []);

    // 2. Mode Switch Save
    useEffect(() => {
        const state = useAppStore.getState();
        saveCheckpoint(state, `Mode Switch: ${mode}`);
    }, [mode]);
};
