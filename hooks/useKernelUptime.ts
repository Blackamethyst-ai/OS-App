import { useEffect } from 'react';
import { useAppStore } from '../store';

export const useKernelUptime = (): void => {
    useEffect(() => {
        const timer = setInterval(() => {
            useAppStore.setState(state => ({
                kernel: { ...state.kernel, uptime: state.kernel.uptime + 1 }
            }));
        }, 1000);
        return () => clearInterval(timer);
    }, []);
};
