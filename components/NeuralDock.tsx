import React, { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Terminal, Scan, Bot, RefreshCw, ShieldAlert,
    PanelRight, Dna, Activity, Battery
} from 'lucide-react';
import { useAppStore } from '../store';
import { useVisualCortex } from '../hooks/useVisualCortex';
import { audio } from '../services/audioService';
import { cn } from '../utils/cn';
import { powerService } from '../services/powerService';
import EvolutionConsole from './EvolutionConsole';
import PowerControlPanel from './PowerControlPanel';
import { NeuralDebuggerPanel } from './NeuralDebuggerPanel';

const DockIcon = memo(({ icon: Icon, color, onClick, isActive, glowColor, label }: any) => {
    return (
        <div className="relative group flex flex-col items-center gap-2">
            {/* Tooltip */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 border border-white/10 rounded text-[10px] font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {label}
            </div>

            <motion.button
                whileHover={{ scale: 1.2, y: -5 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => { audio.playClick(); onClick(); }}
                className={cn(
                    "relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 border",
                    isActive
                        ? "bg-[var(--btn-color)]/20 border-[var(--btn-color)] shadow-[0_0_20px_var(--btn-color)]"
                        : "bg-black/40 border-white/5 hover:bg-white/10 hover:border-white/20"
                )}
                style={{ '--btn-color': color } as React.CSSProperties}
            >
                <Icon size={20} className="transition-colors duration-300" style={{ color: isActive ? '#fff' : color }} />

                {isActive && (
                    <div className="absolute inset-0 bg-[var(--btn-color)]/20 blur-xl rounded-full" />
                )}

                {/* Active Dot */}
                {isActive && (
                    <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-[var(--btn-color)] shadow-[0_0_5px_var(--btn-color)]" />
                )}
            </motion.button>
        </div>
    );
});

const NeuralDock: React.FC<{ mode?: 'fixed' | 'static', className?: string }> = ({ mode = 'fixed', className }) => {
    const {
        system, actions,
        isDiagnosticsOpen, isSidebarOpen
    } = useAppStore();

    const {
        setDiagnosticsOpen, setSidebarOpen, toggleTerminal,
        hydrateAgents, addLog
    } = actions;

    const { probeScreen, isProbing } = useVisualCortex();

    // Local State
    const [isEvolutionOpen, setIsEvolutionOpen] = useState(false);
    const [isPowerOpen, setIsPowerOpen] = useState(false);
    const [isNeuralDebugOpen, setIsNeuralDebugOpen] = useState(false);

    const powerConfig = powerService.getConfig();

    // Neural Debugger / Theme Reactor Logic
    const activeAgents = useAppStore(state => state.agents.activeAgents);
    const primaryAgent = activeAgents.length > 0 ? activeAgents[0] : null;
    const [demoState, setDemoState] = useState({
        skepticism: 20,
        excitement: 80,
        alignment: 95
    });

    const mindset = isNeuralDebugOpen ? demoState : (primaryAgent?.currentMindset || demoState);

    useEffect(() => {
        if (!mindset) return;

        const root = document.documentElement;
        const { skepticism, excitement, alignment } = mindset;

        const saturation = Math.max(0, 100 - skepticism * 1.2);
        const glowOpacity = (excitement / 100) * 0.8;
        const glowRadius = (excitement / 100) * 15;
        const baseRadius = 12;
        const radiusAdjustment = (excitement - skepticism) * 0.12;
        const finalRadius = Math.max(0, Math.min(30, baseRadius + radiusAdjustment));
        const hueShift = (100 - alignment) * 1.5;

        root.style.setProperty('--neural-saturation', `${saturation}%`);
        root.style.setProperty('--neural-glow-opacity', `${glowOpacity}`);
        root.style.setProperty('--neural-glow-radius', `${glowRadius}px`);
        root.style.setProperty('--neural-border-radius', `${finalRadius}px`);
        root.style.setProperty('--neural-hue-shift', `${hueShift}deg`);

        if (skepticism > 80) {
            root.style.setProperty('--neural-accent-mode', 'grayscale(100%)');
        } else {
            root.style.setProperty('--neural-accent-mode', `hue-rotate(${hueShift}deg) saturate(${saturation}%)`);
        }
    }, [mindset.skepticism, mindset.excitement, mindset.alignment]);

    return (
        <>
            <motion.div
                initial={mode === 'fixed' ? { y: 100, opacity: 0 } : { opacity: 0 }}
                animate={mode === 'fixed' ? { y: 0, opacity: 1 } : { opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className={cn(
                    "flex items-center gap-3 px-6 py-4 bg-[#050505]/60 backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.8)]",
                    mode === 'fixed' ? "fixed bottom-8 left-1/2 -translate-x-1/2 z-[200]" : "relative",
                    className
                )}
            >
                {/* 1. Terminal */}
                <DockIcon
                    icon={Terminal}
                    color="#9d4edd"
                    onClick={() => toggleTerminal()}
                    isActive={system.isTerminalOpen}
                    label="Terminal"
                />

                <div className="w-px h-8 bg-white/10 mx-1" /> {/* Divider */}

                {/* 2. Visual Cortex */}
                <DockIcon
                    icon={Scan}
                    color="#18E6FF"
                    onClick={probeScreen}
                    isActive={isProbing}
                    label="Visual Cortex"
                />

                {/* 3. Swarm Sync */}
                <DockIcon
                    icon={Bot}
                    color="#10b981"
                    onClick={() => {
                        hydrateAgents();
                        addLog('SYSTEM', 'SWARM: Synchronizing active node presence.');
                    }}
                    label="Swarm Sync"
                />

                {/* 4. Sync Hub */}
                <DockIcon
                    icon={RefreshCw}
                    color="#f1c21b"
                    onClick={() => addLog('SYSTEM', 'LATTICE: Global recalibration sequence active.')}
                    label="Sync Hub"
                />

                <div className="w-px h-8 bg-white/10 mx-1" /> {/* Divider */}

                {/* 5. Diagnostics */}
                <DockIcon
                    icon={ShieldAlert}
                    color="#ef4444"
                    onClick={() => setDiagnosticsOpen(!isDiagnosticsOpen)}
                    isActive={isDiagnosticsOpen}
                    label="Diagnostics"
                />

                {/* 6. Evolution */}
                <DockIcon
                    icon={Dna}
                    color="#ec4899"
                    onClick={() => setIsEvolutionOpen(true)}
                    isActive={isEvolutionOpen}
                    label="Evolution"
                />

                {/* 7. Neural Debugger */}
                <DockIcon
                    icon={Activity}
                    color="#3b82f6"
                    onClick={() => setIsNeuralDebugOpen(!isNeuralDebugOpen)}
                    isActive={isNeuralDebugOpen}
                    label="Neural Debugger"
                />

                <div className="w-px h-8 bg-white/10 mx-1" /> {/* Divider */}

                {/* 8. Power */}
                <DockIcon
                    icon={Battery}
                    color={powerConfig.mode === 'OVERDRIVE' ? '#ef4444' : powerConfig.mode === 'ECO' ? '#10b981' : '#f59e0b'}
                    onClick={() => setIsPowerOpen(true)}
                    isActive={isPowerOpen}
                    label="Power"
                />

                {/* 9. Sidebar Controls (Main Toggle) */}
                <DockIcon
                    icon={PanelRight}
                    color="#8b5cf6"
                    onClick={() => setSidebarOpen(!isSidebarOpen)}
                    isActive={isSidebarOpen}
                    label="Operations"
                />

            </motion.div>

            {/* Modals */}
            <EvolutionConsole isOpen={isEvolutionOpen} onClose={() => setIsEvolutionOpen(false)} />
            <PowerControlPanel isOpen={isPowerOpen} onClose={() => setIsPowerOpen(false)} />
            <NeuralDebuggerPanel
                isOpen={isNeuralDebugOpen}
                onClose={() => setIsNeuralDebugOpen(false)}
                state={demoState}
                onChange={(k, v) => setDemoState(s => ({ ...s, [k]: v }))}
            />
        </>
    );
};

export default NeuralDock;
