import { useCallback } from 'react';
import { useAppStore } from '../store';
import { AppMode } from '../types';
import { audio } from '../services/audioService';

export const useTimeTravel = () => {
    const mode = useAppStore(s => s.mode);
    const actions = useAppStore(s => s.actions);

    const restore = useCallback((state: any) => {
        switch (mode) {
            case AppMode.PROCESS_MAP: actions.setProcessState(state); break;
            case AppMode.CODE_STUDIO: actions.setCodeStudioState(state); break;
            case AppMode.HARDWARE_ENGINEER: actions.setHardwareState(state); break;
            case AppMode.IMAGE_GEN: actions.setImageGenState(state); break;
            case AppMode.BIBLIOMORPHIC: actions.setBibliomorphicState(state); break;
            case AppMode.DASHBOARD: actions.setDashboardState(state); break;
            case AppMode.METAVENTIONS_HUB: actions.setMetaventionsState(state); break;
            case AppMode.AUTONOMOUS_FINANCE: actions.setMetaventionsState(state); break;
            case AppMode.AGENT_CONTROL: actions.setAgentState(state); break;
            case AppMode.SYNTHESIS_BRIDGE: actions.setMetaventionsState(state); break;
            case AppMode.MEMORY_CORE: actions.setMemoryState(state); break;
            case AppMode.VOICE_MODE: actions.setVoiceState(state); break;
            case AppMode.BICAMERAL: actions.setBicameralState(state); break;
        }
        actions.addLog('INFO', 'Timeline resync successful.');
        audio.playSuccess();
    }, [mode, actions]);

    return { restore };
};
