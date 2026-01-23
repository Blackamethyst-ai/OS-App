import { useEffect } from 'react';
import { useAppStore } from '../store';
import { agentKernel } from '../services/kernel';

export const useKernelLifecycle = (): void => {
    const actions = useAppStore(s => s.actions);

    useEffect(() => {
        agentKernel.boot().then(() => {
            actions.addLog('SYSTEM', 'KERNEL: Agentic Kernel booted successfully');
            actions.setKernelState({ operationalState: 'IDLE' });
        }).catch((err) => {
            actions.addLog('ERROR', `KERNEL: Boot failed - ${err.message}`);
        });

        return () => {
            agentKernel.shutdown();
        };
    }, []);
};
