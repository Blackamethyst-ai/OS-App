import { useState, useCallback, useRef, useMemo } from 'react';

/**
 * usePerspectiveRefraction: Material Sovereignty Logic
 * Implements 3D spatial tilt and specular glare physics for crystalline panels.
 */
export const usePerspectiveRefraction = (intensity = 1) => {
    const [tilt, setTilt] = useState({ x: 0, y: 0, glareX: 50, glareY: 50, opacity: 0 });
    const ref = useRef<HTMLDivElement>(null);

    const onMouseMove = useCallback((e: React.MouseEvent) => {
        if (!ref.current) return;

        const rect = ref.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Normalized coordinates (-0.5 to 0.5)
        const x = (e.clientX - centerX) / rect.width;
        const y = (e.clientY - centerY) / rect.height;

        setTilt({
            x: y * 15 * intensity, // Degrees of tilt
            y: -x * 15 * intensity,
            glareX: (x + 0.5) * 100, // Glare percentage
            glareY: (y + 0.5) * 100,
            opacity: 0.15 // Glare visibility
        });
    }, [intensity]);

    const onMouseLeave = useCallback(() => {
        setTilt(prev => ({ ...prev, x: 0, y: 0, opacity: 0 }));
    }, []);

    const style = useMemo(() => ({
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: tilt.x === 0 ? 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)' : 'transform 0.1s linear',
        background: tilt.opacity > 0 
            ? `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,${tilt.opacity}), transparent 60%)` 
            : undefined
    }), [tilt]);

    return { ref, style, onMouseMove, onMouseLeave };
};