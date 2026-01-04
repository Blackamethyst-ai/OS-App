import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Save, Loader2, Sparkles, Activity, Radio } from 'lucide-react';
import { useAppStore } from '../store';
import { neuralVault } from '../services/persistenceService';
import { AppMode } from '../types';
import { audio } from '../services/audioService';
import MetaventionsLogo from './MetaventionsLogo';

const AppFooter: React.FC = () => {
    const { mode, actions } = useAppStore();
    const { addLog } = actions;
    const [isSaving, setIsSaving] = useState(false);
    const [latency, setLatency] = useState(12);

    useEffect(() => {
        const interval = setInterval(() => {
            setLatency(Math.floor(Math.random() * 8 + 12));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleManualSnapshot = async () => {
        setIsSaving(true);
        audio.playClick();
        addLog('SYSTEM', 'SNAPSHOT: Initializing high-priority state persistence...');
        
        try {
            const store = useAppStore.getState();
            let stateToSave = null;
            
            // Map current mode to store sector
            switch(mode) {
                case AppMode.PROCESS_MAP: stateToSave = store.process; break;
                case AppMode.CODE_STUDIO: stateToSave = store.codeStudio; break;
                case AppMode.HARDWARE_ENGINEER: stateToSave = store.hardware; break;
                case AppMode.IMAGE_GEN: stateToSave = store.imageGen; break;
                case AppMode.BIBLIOMORPHIC: stateToSave = store.bibliomorphic; break;
                case AppMode.DASHBOARD: stateToSave = store.dashboard; break;
                case AppMode.METAVENTIONS_HUB: stateToSave = store.metaventions; break;
                case AppMode.AUTONOMOUS_FINANCE: stateToSave = store.metaventions; break;
                case AppMode.AGENT_CONTROL: stateToSave = store.agents; break;
                case AppMode.SYNTHESIS_BRIDGE: stateToSave = store.metaventions; break;
                case AppMode.MEMORY_CORE: stateToSave = store.memory; break;
                case AppMode.VOICE_MODE: stateToSave = store.voice; break;
                case AppMode.BICAMERAL: stateToSave = store.bicameral; break;
                default: break;
            }

            if (stateToSave) {
                await neuralVault.createCheckpoint(mode, stateToSave, "Emergency Manual Sync");
                addLog('SUCCESS', 'SNAPSHOT: Local state crystallized to Neural Vault.');
                audio.playSuccess();
            }
        } catch (e) {
            addLog('ERROR', 'SNAPSHOT: Persistence failure.');
            audio.playError();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <footer className="w-full bg-[var(--bg-header)] border-t border-[var(--border-main)] py-6 px-16 shrink-0 relative z-[60] transition-colors duration-1000 brand-inner-glow overflow-hidden backdrop-blur-3xl">
            {/* Meditative, rhythmic footer glow */}
            <motion.div 
                animate={{ 
                    opacity: [0.03, 0.1, 0.03],
                    scale: [1, 1.25, 1],
                    background: [
                        "radial-gradient(circle_at_50%_0%, var(--amethyst) 0%, transparent 75%)",
                        "radial-gradient(circle_at_50%_0%, var(--azure-blue) 0%, transparent 75%)",
                        "radial-gradient(circle_at_50%_0%, var(--amethyst) 0%, transparent 75%)"
                    ]
                }}
                transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 pointer-events-none" 
            />

            <div className="max-w-[2800px] mx-auto flex flex-col gap-6 relative z-10">
                
                {/* Top Section */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-10">
                        <MetaventionsLogo size={24} showText={true} />
                        <div className="h-6 w-px bg-white/5 hidden sm:block" />
                        <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-[0.4em] flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <span className="text-[var(--stellar-white)] font-black">© 2025</span>
                                <motion.span 
                                    animate={{ 
                                        textShadow: [
                                            "0 0 10px rgba(255, 255, 255, 0.4)",
                                            "0 0 20px rgba(255, 255, 255, 0.7)",
                                            "0 0 10px rgba(255, 255, 255, 0.4)"
                                        ]
                                    }}
                                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                                    className="text-white font-black"
                                >
                                    METAVENTIONS
                                </motion.span>
                                <motion.span 
                                    animate={{ color: ["#18E6FF", "#7B2CFF", "#18E6FF"] }}
                                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                    className="font-black"
                                >
                                    AI
                                </motion.span>
                            </div>
                            <span className="opacity-20 hidden lg:block">//</span>
                            <span className="hidden lg:block">Architecture OS</span>
                            <span className="opacity-20 hidden lg:block">//</span>
                            <span className="hidden lg:block text-[#9d4edd] font-black uppercase [text-shadow:0_0_10px_rgba(157,78,221,0.5)]">V9.5 - THE D-Ecosystem</span>
                        </div>
                    </div>

                    <div className="flex-1 flex justify-center px-20">
                         <button 
                            onClick={handleManualSnapshot}
                            disabled={isSaving}
                            className={`flex items-center gap-3 px-6 py-2 rounded-full border transition-all relative overflow-hidden group/snap
                                ${isSaving 
                                    ? 'bg-[#10b981] border-[#10b981] text-black shadow-[0_0_20px_#10b981]' 
                                    : 'bg-white/5 border-white/10 text-gray-500 hover:text-[#10b981] hover:border-[#10b981]/50'
                                }`}
                         >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover/snap:translate-x-[100%] transition-transform duration-1000" />
                            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} className="group-hover/snap:scale-125 transition-transform" />}
                            <span className="text-[9px] font-black font-mono uppercase tracking-[0.3em]">Snapshot Sync</span>
                            {isSaving && <Sparkles size={10} className="animate-pulse" />}
                         </button>
                    </div>

                    <div className="flex items-center gap-10">
                        {/* Live Telemetry Ticker */}
                        <div className="flex items-center gap-6 px-6 py-2 bg-black/40 border border-white/5 rounded-2xl shadow-inner group/telemetry">
                            <div className="flex items-center gap-2">
                                <Radio size={12} className="text-[#10b981] animate-pulse" />
                                <span className="text-[9px] font-mono text-[#10b981] font-black tracking-widest uppercase">Live_Link</span>
                            </div>
                            <div className="h-4 w-px bg-white/10" />
                            <div className="flex items-center gap-3 min-w-[120px]">
                                <Activity size={12} className="text-[#22d3ee]" />
                                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest whitespace-nowrap">
                                    SYS_LATENCY: <span className="text-[#22d3ee] font-black">{latency}ms</span>
                                </span>
                            </div>
                        </div>

                        <nav className="flex items-center gap-8">
                            {[
                                { label: 'LINKEDIN', href: 'https://www.linkedin.com/in/dico-angelo/' },
                                { label: 'GITHUB', href: 'https://github.com/Blackamethyst-ai' },
                                { label: 'X', href: 'https://x.com/dicoangelo' }
                            ].map((link) => (
                                <a 
                                    key={link.label}
                                    href={link.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] font-black font-mono text-[var(--text-muted)] hover:text-[var(--cyan)] transition-all tracking-[0.4em] uppercase relative group"
                                >
                                    {link.label}
                                    <span className="absolute -bottom-1.5 left-0 w-0 h-[1px] bg-[var(--cyan)] transition-all group-hover:w-full shadow-[0_0_15px_var(--cyan)]" />
                                </a>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Bottom Separator & Rhythmic Status Dots */}
                <div className="relative pt-4 flex justify-between items-center border-t border-white/5">
                    <div className="flex items-center gap-4 text-[8px] font-mono text-gray-700 uppercase tracking-[0.4em]">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={10} className="text-[#10b981]" />
                            <span>Secure_Handshake_L0</span>
                        </div>
                        <div className="w-1 h-1 rounded-full bg-gray-900" />
                        <span>Manhattan_Node_01</span>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <span className="text-[8px] font-mono text-gray-700 uppercase tracking-widest">Sector_Sync</span>
                            <div className="flex gap-1.5 items-center">
                                <motion.div 
                                    animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.4, 1] }}
                                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                                    className="w-1.5 h-1.5 rounded-full bg-[var(--cyan)] shadow-[0_0_10px_var(--cyan)]" 
                                />
                                <motion.div 
                                    animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.4, 1] }}
                                    transition={{ duration: 15, repeat: Infinity, delay: 5, ease: "easeInOut" }}
                                    className="w-1.5 h-1.5 rounded-full bg-[var(--azure-blue)] shadow-[0_0_10px_var(--azure-blue)]" 
                                />
                                <motion.div 
                                    animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.4, 1] }}
                                    transition={{ duration: 15, repeat: Infinity, delay: 10, ease: "easeInOut" }}
                                    className="w-1.5 h-1.5 rounded-full bg-[var(--amethyst)] shadow-[0_0_10px_var(--amethyst)]" 
                                />
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </footer>
    );
};

export default AppFooter;