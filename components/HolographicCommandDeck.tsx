import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    Zap, Search, Bot, ShieldAlert, 
    RefreshCw, Trash2, Terminal, 
    Cpu, Activity, Scan, Gauge, Waves, Fingerprint
} from 'lucide-react';
import { audio } from '../services/audioService';
import { useAppStore } from '../store';
import { cn } from '../utils/cn';

const CommandIcon = ({ icon: Icon, label, onClick, color, isActive }: any) => (
    <motion.button
        whileHover={{ 
            scale: 1.2, 
            y: -15,
            filter: 'drop-shadow(0 0 20px currentColor)'
        }}
        whileTap={{ scale: 0.95 }}
        onClick={() => { audio.playClick(); onClick(); }}
        className={cn(
            "flex flex-col items-center gap-3 group relative p-4 transition-all duration-500",
            isActive ? "text-white" : ""
        )}
        style={{ color: isActive ? color : undefined }}
    >
        <div className={cn(
            "p-4 rounded-[1.5rem] border transition-all duration-500 shadow-2xl backdrop-blur-3xl relative overflow-hidden",
            isActive ? "bg-white/10 border-current" : "bg-black/40 border-white/10 group-hover:border-white/30"
        )}>
            <div className="absolute inset-0 bg-current opacity-0 group-hover:opacity-5 transition-opacity" />
            <Icon size={24} />
        </div>
        <span className="text-[8px] font-black font-mono uppercase tracking-[0.3em] opacity-0 group-hover:opacity-100 transition-all absolute -bottom-6 whitespace-nowrap">
            {label}
        </span>
    </motion.button>
);

const HolographicCommandDeck: React.FC = () => {
    const { actions } = useAppStore();
    const { addLog, toggleTerminal, setDiagnosticsOpen } = actions;
    const [stress, setStress] = useState(12.4);

    useEffect(() => {
        const interval = setInterval(() => {
            setStress(prev => {
                const delta = (Math.random() * 4 - 2);
                return Math.max(5, Math.min(45, prev + delta));
            });
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const containerVariants = {
        idle: { 
            y: 35, 
            opacity: 0.25,
            filter: 'blur(10px)',
            scale: 0.98,
            transition: { type: 'spring', stiffness: 200, damping: 40 }
        },
        wake: { 
            y: 0, 
            opacity: 1,
            filter: 'blur(0px)',
            scale: 1,
            transition: { type: 'spring', stiffness: 500, damping: 25 }
        }
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 h-40 z-[400] flex items-end justify-center pb-12 pointer-events-none">
            <motion.div 
                initial="idle"
                whileHover="wake"
                variants={containerVariants}
                className="pointer-events-auto relative group/deck"
            >
                {/* Volumetric Underglow */}
                <motion.div 
                    animate={{ opacity: [0.1, 0.3, 0.1], scale: [1, 1.1, 1] }}
                    transition={{ duration: 5, repeat: Infinity }}
                    className="absolute inset-x-0 -bottom-20 h-64 bg-gradient-to-t from-[#7B2CFF]/20 via-transparent to-transparent blur-[100px] rounded-full opacity-0 group-hover/deck:opacity-100 transition-opacity"
                />

                <div className="crystalline px-10 py-4 rounded-[4rem] flex items-center gap-8 shadow-[0_60px_150px_rgba(0,0,0,1)] border border-white/10 relative overflow-hidden group-hover/deck:border-white/20 transition-all glass-refraction">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent translate-x-[-150%] group-hover/deck:translate-x-[150%] transition-transform duration-[3s] linear pointer-events-none" />
                    
                    {/* Stress Gauge HUD (Visual Innovation) */}
                    <div className="flex flex-col items-center gap-3 px-6 border-r border-white/5 mr-2">
                         <div className="flex items-center gap-3 text-[8px] font-black font-mono text-gray-500 uppercase tracking-widest">
                            <Gauge size={12} className="text-[#18E6FF]" />
                            <span>Neural_Load</span>
                         </div>
                         <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                            <motion.div 
                                animate={{ width: `${stress}%` }}
                                className={cn("h-full transition-colors duration-1000", stress > 30 ? "bg-[#ef4444]" : "bg-[#18E6FF]")} 
                            />
                         </div>
                    </div>

                    <CommandIcon 
                        icon={Terminal} 
                        label="[ROOT_SHELL]" 
                        color="#7B2CFF" 
                        onClick={() => toggleTerminal()} 
                    />
                    <CommandIcon 
                        icon={Scan} 
                        label="[DEEP_PROBE]" 
                        color="#18E6FF" 
                        onClick={() => addLog('SYSTEM', 'COMMAND_DECK: Dispatching multi-vector scan...')} 
                    />
                    <CommandIcon 
                        icon={Bot} 
                        label="[SPAWN_NODE]" 
                        color="#10b981" 
                        onClick={() => addLog('INFO', 'COMMAND_DECK: Initializing autonomic node spawning...')} 
                    />
                    
                    <div className="h-10 w-px bg-white/5 mx-2" />

                    <CommandIcon 
                        icon={RefreshCw} 
                        label="[LATTICE_SYNC]" 
                        color="#f1c21b" 
                        onClick={() => addLog('SYSTEM', 'COMMAND_DECK: Calibrating global coherence...')} 
                    />
                    <CommandIcon 
                        icon={ShieldAlert} 
                        label="[DIAGNOSTICS]" 
                        color="#ef4444" 
                        onClick={() => setDiagnosticsOpen(true)} 
                    />
                    
                    <div className="flex flex-col items-center gap-3 px-6 border-l border-white/5 ml-2">
                         <div className="flex items-center gap-3 text-[8px] font-black font-mono text-gray-500 uppercase tracking-widest">
                            <Fingerprint size={12} className="text-[#9d4edd]" />
                            <span>Auth_Token</span>
                         </div>
                         <span className="text-[10px] font-mono text-gray-400 font-bold tracking-tighter">0xFD2..9A</span>
                    </div>
                </div>

                {/* Reticle Shadow Decoration */}
                <div className="absolute -inset-10 border border-white/5 rounded-[5rem] pointer-events-none opacity-0 group-hover/deck:opacity-100 transition-opacity duration-1000" />
            </motion.div>
        </div>
    );
};

export default HolographicCommandDeck;