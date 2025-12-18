
import { useEffect, useRef } from 'react';
import { neuralAutomata } from '../services/daemonService';
import { useAppStore } from '../store';

export const useDaemonSwarm = () => {
    // Neural Automata Heartbeat
    // We run this less frequently than the old heuristic daemons 
    // because it involves an API call (even though Flash is fast).
    // 15 seconds is a good balance for "background intelligence".
    
    useEffect(() => {
        const interval = setInterval(() => {
            // Only run if the tab is focused to save resources
            if (document.visibilityState === 'visible') {
                neuralAutomata();
            }
        }, 15000); 

        return () => clearInterval(interval);
    }, []);
};
