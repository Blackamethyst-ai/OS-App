import { useEffect } from 'react';
import { neuralAutomata } from '../services/daemonService';
import { autopoieticDaemon } from '../services/autopoieticDaemon';
import { useAppStore } from '../store';

export const useDaemonSwarm = () => {
    // Neural Automata Heartbeat
    // We run this less frequently than the old heuristic daemons 
    // because it involves an API call (even though Flash is fast).
    // 15 seconds for general healer, 45 seconds for autopoietic refactor.
    
    useEffect(() => {
        const interval = setInterval(() => {
            // Only run if the tab is focused to save resources
            if (document.visibilityState === 'visible') {
                neuralAutomata();
                autopoieticDaemon(); // New evolutionary daemon
            }
        }, 15000); 

        return () => clearInterval(interval);
    }, []);
};