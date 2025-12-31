import { useState, useEffect } from 'react';

/**
 * usePerformanceMonitor: Real-time telemetry for Sovereign OS.
 */
export const usePerformanceMonitor = () => {
    const [fps, setFps] = useState(60);
    const [memory, setMemory] = useState<{ used: number; total: number } | null>(null);

    useEffect(() => {
        let frameCount = 0;
        let lastTime = performance.now();

        const update = () => {
            frameCount++;
            const now = performance.now();
            if (now - lastTime >= 1000) {
                setFps(frameCount);
                frameCount = 0;
                lastTime = now;
                
                // @ts-ignore - memory API is non-standard
                if (performance.memory) {
                    // @ts-ignore
                    setMemory({
                        // @ts-ignore
                        used: Math.round(performance.memory.usedJSHeapSize / 1048576),
                        // @ts-ignore
                        total: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
                    });
                }
            }
            requestAnimationFrame(update);
        };

        const handle = requestAnimationFrame(update);
        return () => cancelAnimationFrame(handle);
    }, []);

    return { fps, memory };
};
