import { useEffect } from 'react';
import { useAppStore } from '../store';

/**
 * ThemeReactor: The Neural Bridge between AI State and UI Aesthetics.
 * 
 * This component listens to the active agent's "MentalState" and mutates
 * global CSS variables to reflect their mood.
 * 
 * - High Skepticism: Desaturates, sharpens corners, increases contrast (The "Cold" Logic)
 * - High Excitement: Blooms neon, softens corners, adds glow (The "Hot" Creative)
 */
export const ThemeReactor = () => {
    const activeAgents = useAppStore(state => state.agents.activeAgents);
    const primaryAgent = activeAgents.length > 0 ? activeAgents[0] : null;
    const mindset = primaryAgent?.currentMindset;

    useEffect(() => {
        if (!mindset) return;

        const root = document.documentElement;
        const { skepticism, excitement, alignment } = mindset;

        // 1. SATURATION: Skepticism kills color. Excitement boosts it.
        // Base saturation is ~80%. 
        // 100% Skepticism -> 0% Saturation.
        const saturation = Math.max(0, 100 - skepticism * 1.2);

        // 2. GLOW & BLOOM: Excitement creates light.
        // 0% Excitement -> 0px blur. 100% Excitement -> 20px spread.
        const glowOpacity = (excitement / 100) * 0.8;
        const glowRadius = (excitement / 100) * 15;

        // 3. GEOMETRY: Skepticism is hard/sharp. Excitement is organic/round.
        // 100% Skepticism -> 0px borderRadius.
        // 100% Excitement -> 24px borderRadius.
        // We blend them: start at 12px.
        const baseRadius = 12;
        const radiusAdjustment = (excitement - skepticism) * 0.12; // +/- range
        const finalRadius = Math.max(0, Math.min(30, baseRadius + radiusAdjustment));

        // 4. COLOR SHIFT based on Alignment
        // Alignment 100 (Safe) -> Cyan/Green approach.
        // Alignment 0 (Rogue) -> Red/Purple shift.
        // This is subtle. 
        const hueShift = (100 - alignment) * 1.5; // Up to 150deg shift

        // Apply to CSS Variables
        root.style.setProperty('--neural-saturation', `${saturation}%`);
        root.style.setProperty('--neural-glow-opacity', `${glowOpacity}`);
        root.style.setProperty('--neural-glow-radius', `${glowRadius}px`);
        root.style.setProperty('--neural-border-radius', `${finalRadius}px`);
        root.style.setProperty('--neural-hue-shift', `${hueShift}deg`);

        // Dynamic "Mood" Color for overlays
        // If Skepticism > 80, we go Gray.
        if (skepticism > 80) {
            root.style.setProperty('--neural-accent-mode', 'grayscale(100%)');
        } else {
            root.style.setProperty('--neural-accent-mode', `hue-rotate(${hueShift}deg) saturate(${saturation}%)`);
        }

    }, [mindset?.skepticism, mindset?.excitement, mindset?.alignment]);

    return null; // Headless component
};
