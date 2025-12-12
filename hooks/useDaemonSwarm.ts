
import { useEffect, useRef } from 'react';
import { sentinelDaemon, architectDaemon, negotiatorDaemon } from '../services/daemonService';
import { useAppStore } from '../store';

export const useDaemonSwarm = () => {
    // Refs to track last execution time to prevent spam
    const lastSentinelRun = useRef(0);
    const lastArchitectRun = useRef(0);
    const lastNegotiatorRun = useRef(0);

    useEffect(() => {
        const heartBeat = setInterval(() => {
            const now = Date.now();

            // 1. Sentinel: Runs always, low frequency (every 30s)
            if (now - lastSentinelRun.current > 30000) {
                sentinelDaemon();
                lastSentinelRun.current = now;
            }

            // 2. Architect: Runs only in Code Mode (checked internally), medium frequency (every 5s)
            if (now - lastArchitectRun.current > 5000) {
                architectDaemon();
                lastArchitectRun.current = now;
            }

            // 3. Negotiator: Runs only in Hardware Mode (checked internally), medium frequency (every 10s)
            if (now - lastNegotiatorRun.current > 10000) {
                negotiatorDaemon();
                lastNegotiatorRun.current = now;
            }

        }, 1000); // 1s Heartbeat check

        return () => clearInterval(heartBeat);
    }, []); // Empty dependency array = runs constantly, checks store internally
};
