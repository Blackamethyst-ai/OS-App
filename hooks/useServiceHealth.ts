import { useState, useEffect } from 'react';

interface ServiceStatus {
    agentCore: 'online' | 'offline' | 'checking';
    ollama: 'online' | 'offline' | 'checking';
}

const CHECK_INTERVAL = 30_000; // 30 seconds

async function checkService(url: string, timeoutMs = 3000): Promise<boolean> {
    try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(url, { method: 'GET', signal: controller.signal });
        clearTimeout(id);
        return res.ok;
    } catch {
        return false;
    }
}

export function useServiceHealth(): ServiceStatus {
    const [status, setStatus] = useState<ServiceStatus>({
        agentCore: 'checking',
        ollama: 'checking',
    });

    useEffect(() => {
        let mounted = true;

        const check = async () => {
            const agentCoreUrl = import.meta.env.VITE_AGENT_CORE_URL || 'http://localhost:3847';
            const ollamaUrl = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434';
            const [agentCoreOk, ollamaOk] = await Promise.all([
                checkService(`${agentCoreUrl}/health`),
                checkService(`${ollamaUrl}/api/tags`),
            ]);
            if (mounted) {
                setStatus({
                    agentCore: agentCoreOk ? 'online' : 'offline',
                    ollama: ollamaOk ? 'online' : 'offline',
                });
            }
        };

        check();
        const interval = setInterval(check, CHECK_INTERVAL);
        return () => { mounted = false; clearInterval(interval); };
    }, []);

    return status;
}
