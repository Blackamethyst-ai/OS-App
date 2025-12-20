
import { useEffect } from 'react';
import { useAppStore } from '../store';
import { liveSession } from '../services/geminiService';
import { AppMode, UserIntent } from '../types';

export const useVoiceControl = () => {
    const store = useAppStore();

    useEffect(() => {
        liveSession.onCommand = (intent: UserIntent) => {
            console.log('[Synaptic Bridge] Voice Command Received:', intent);
            store.addLog('SYSTEM', `VOICE_OP: ${intent.action} -> ${intent.target || 'N/A'}`);

            switch (intent.action) {
                case 'NAVIGATE':
                    if (intent.target) {
                        const rawTarget = intent.target.toUpperCase();
                        const exactMatch = Object.values(AppMode).find(m => m === rawTarget);
                        let targetMode = exactMatch;
                        
                        if (!targetMode) {
                            if (rawTarget.includes('DASH') || rawTarget.includes('HOME')) targetMode = AppMode.DASHBOARD;
                            else if (rawTarget.includes('CODE') || rawTarget.includes('DEV')) targetMode = AppMode.CODE_STUDIO;
                            else if (rawTarget.includes('HARDWARE') || rawTarget.includes('ENG')) targetMode = AppMode.HARDWARE_ENGINEER;
                            else if (rawTarget.includes('IMAGE') || rawTarget.includes('ASSET')) targetMode = AppMode.IMAGE_GEN;
                            else if (rawTarget.includes('PROCESS') || rawTarget.includes('LOGIC')) targetMode = AppMode.PROCESS_MAP;
                            else if (rawTarget.includes('POWER') || rawTarget.includes('XRAY')) targetMode = AppMode.POWER_XRAY;
                            else if (rawTarget.includes('BOOK') || rawTarget.includes('BIBLIO')) targetMode = AppMode.BIBLIOMORPHIC;
                            else if (rawTarget.includes('MEMORY') || rawTarget.includes('VAULT')) targetMode = AppMode.MEMORY_CORE;
                        }

                        if (targetMode) store.setMode(targetMode);
                        else store.addLog('WARN', `VOICE_NAV: Unknown target "${intent.target}"`);
                    }
                    break;

                case 'GENERATE_CODE':
                    store.setMode(AppMode.CODE_STUDIO);
                    const prompt = intent.parameters?.prompt || intent.payload;
                    if (prompt) store.setCodeStudioState({ prompt });
                    break;

                case 'INITIATE_RESEARCH':
                case 'BACKGROUND_RESEARCH':
                    const query = intent.parameters?.query || intent.payload;
                    if (query) {
                        store.addResearchTask({
                            id: crypto.randomUUID(),
                            query: query,
                            status: 'QUEUED',
                            progress: 0,
                            logs: ['Dispatched via Voice Core'],
                            timestamp: Date.now()
                        });
                        store.addLog('SUCCESS', `RESEARCH_START: Agent dispatched for "${query}"`);
                    }
                    break;

                case 'HARDWARE_SEARCH':
                    store.setMode(AppMode.HARDWARE_ENGINEER);
                    if (intent.payload) store.setHardwareState({ componentQuery: intent.payload });
                    break;

                case 'ANALYZE_POWER':
                    store.setMode(AppMode.POWER_XRAY);
                    break;
            }
        };

        liveSession.onToolCall = async (name, args) => {
            if (name === 'initiate_background_research') {
                const query = args.query;
                store.addResearchTask({
                    id: crypto.randomUUID(),
                    query: query,
                    status: 'QUEUED',
                    progress: 0,
                    logs: ['Triggered via Tool Protocol'],
                    timestamp: Date.now()
                });
                return { status: "RESEARCH_DISPATCHED", target: query };
            }
            return { error: "Unknown tool" };
        };

        return () => {
            liveSession.onCommand = () => {};
            liveSession.onToolCall = async () => ({});
        };
    }, [store]);
};
