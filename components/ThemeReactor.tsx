import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Activity, Sliders } from 'lucide-react';

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

    // Demo Mode State
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [demoState, setDemoState] = useState({
        skepticism: 20,
        excitement: 80,
        alignment: 95
    });

    // Use either Real Agent State or Demo State
    const mindset = isDemoMode ? demoState : (primaryAgent?.currentMindset || demoState);

    useEffect(() => {
        if (!mindset) return;

        const root = document.documentElement;
        const { skepticism, excitement, alignment } = mindset;

        // 1. SATURATION: Skepticism kills color. Excitement boosts it.
        const saturation = Math.max(0, 100 - skepticism * 1.2);

        // 2. GLOW & BLOOM: Excitement creates light.
        const glowOpacity = (excitement / 100) * 0.8;
        const glowRadius = (excitement / 100) * 15;

        // 3. GEOMETRY: Skepticism is hard/sharp. Excitement is organic/round.
        const baseRadius = 12;
        const radiusAdjustment = (excitement - skepticism) * 0.12;
        const finalRadius = Math.max(0, Math.min(30, baseRadius + radiusAdjustment));

        // 4. COLOR SHIFT based on Alignment
        const hueShift = (100 - alignment) * 1.5;

        // Apply to CSS Variables
        root.style.setProperty('--neural-saturation', `${saturation}%`);
        root.style.setProperty('--neural-glow-opacity', `${glowOpacity}`);
        root.style.setProperty('--neural-glow-radius', `${glowRadius}px`);
        root.style.setProperty('--neural-border-radius', `${finalRadius}px`);
        root.style.setProperty('--neural-hue-shift', `${hueShift}deg`);

        // Dynamic "Mood" Color for overlays
        if (skepticism > 80) {
            root.style.setProperty('--neural-accent-mode', 'grayscale(100%)');
        } else {
            root.style.setProperty('--neural-accent-mode', `hue-rotate(${hueShift}deg) saturate(${saturation}%)`);
        }

    }, [mindset.skepticism, mindset.excitement, mindset.alignment]);

    // Render "Neural Debugger" Panel
    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end pointer-events-none">
            <div className={`
                bg-black/90 border border-white/10 backdrop-blur-xl p-4 rounded-xl shadow-2xl pointer-events-auto
                transition-all duration-300 origin-bottom-right
                ${isDemoMode ? 'w-64 opacity-100 scale-100' : 'w-12 h-12 opacity-50 scale-90 overflow-hidden p-0'}
            `}>
                {!isDemoMode ? (
                    <button
                        onClick={() => setIsDemoMode(true)}
                        className="w-full h-full flex items-center justify-center text-white/50 hover:text-[#18E6FF] transition-colors"
                        title="Open Neural Debugger"
                    >
                        <Activity size={20} />
                    </button>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-white/10">
                            <span className="text-xs font-bold text-[#18E6FF] flex items-center gap-2">
                                <Activity size={12} /> NEURAL DEBUGGER
                            </span>
                            <button onClick={() => setIsDemoMode(false)} className="text-white/20 hover:text-white">
                                <Sliders size={12} />
                            </button>
                        </div>

                        {/* CONTROLS */}
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px] text-white/50">
                                    <span>SKEPTICISM (Form)</span>
                                    <span>{demoState.skepticism}%</span>
                                </div>
                                <input
                                    type="range" min="0" max="100"
                                    value={demoState.skepticism}
                                    onChange={(e) => setDemoState(s => ({ ...s, skepticism: parseInt(e.target.value) }))}
                                    className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#7B2CFF]"
                                />
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px] text-white/50">
                                    <span>EXCITEMENT (Glow)</span>
                                    <span>{demoState.excitement}%</span>
                                </div>
                                <input
                                    type="range" min="0" max="100"
                                    value={demoState.excitement}
                                    onChange={(e) => setDemoState(s => ({ ...s, excitement: parseInt(e.target.value) }))}
                                    className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#18E6FF]"
                                />
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px] text-white/50">
                                    <span>ALIGNMENT (Hue)</span>
                                    <span>{demoState.alignment}%</span>
                                </div>
                                <input
                                    type="range" min="0" max="100"
                                    value={demoState.alignment}
                                    onChange={(e) => setDemoState(s => ({ ...s, alignment: parseInt(e.target.value) }))}
                                    className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#10b981]"
                                />
                            </div>
                        </div>

                        <div className="text-[9px] text-white/30 text-center pt-2">
                            Manual Override Active
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
