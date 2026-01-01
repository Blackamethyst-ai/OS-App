import React from 'react';
import { motion } from 'framer-motion';
import { 
    Zap, Search, Bot, ShieldAlert, 
    RefreshCw, Trash2, Terminal, 
    Cpu, Activity, Scan
} from 'lucide-react';
import { audio } from '../services/audioService';
import { useAppStore } from '../store';
import { cn } from '../utils/cn';

const CommandIcon = ({ icon: Icon, label, onClick, color }: any) => (
    <motion.button
        whileHover={{ 
            scale: 1.25, 
            y: -10,
            filter: 'drop-shadow(0 0 15px currentColor)'
        }}
        whileTap={{ scale: 0.9 }}
        onClick={() => { audio.playClick(); onClick(); }}
        className="flex flex-col items-center gap-2 group relative p-3"
        style={{ color }}
    >
        <div className="p-3 bg-white/5 rounded-2xl border border-white/10 group-hover:border-current transition-colors shadow-2xl backdrop-blur-md">
            <Icon size={20} />
        </div>
        <span className="text-[7px] font-black font-mono uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-4 whitespace-nowrap">
            {label}
        </span>
    </motion.button>
);

const HolographicCommandDeck: React.FC = () => {
    const { actions } = useAppStore();
    const { addLog, toggleTerminal, setDiagnosticsOpen } = actions;

    return (
        <motion.div 
            initial={{ y: 50, opacity: 0.2 }}
            whileHover={{ y: 0, opacity: 1 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] group/deck"
        >
            {/* Proximity Glow */}
            <motion.div 
                animate={{ opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute inset-0 bg-[#9d4edd]/20 blur-3xl rounded-full opacity-0 group-hover/deck:opacity-100 transition-opacity"
            />

            <div className="crystalline px-8 py-3 rounded-full flex items-center gap-6 shadow-[0_40px_100px_rgba(0,0,0,0.8)] border border-white/10 relative overflow-hidden group-hover/deck:border-white/20 transition-all">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent animate-[shimmer_5s_infinite_linear] pointer-events-none" />
                
                <CommandIcon 
                    icon={Terminal} 
                    label="[KERNEL_ACCESS]" 
                    color="#9d4edd" 
                    onClick={() => toggleTerminal()} 
                />
                <CommandIcon 
                    icon={Scan} 
                    label="[DEEP_SCAN]" 
                    color="#18E6FF" 
                    onClick={() => addLog('SYSTEM', 'COMMAND_DECK: Initializing deep sector analysis...')} 
                />
                <CommandIcon 
                    icon={Bot} 
                    label="[DEPLOY_AGENT]" 
                    color="#10b981" 
                    onClick={() => addLog('INFO', 'COMMAND_DECK: Routing new autonomic node...')} 
                />
                
                <div className="h-8 w-px bg-white/10 mx-2" />

                <CommandIcon 
                    icon={RefreshCw} 
                    label="[SYNC_LATTICE]" 
                    color="#f1c21b" 
                    onClick={() => addLog('SYSTEM', 'COMMAND_DECK: Recalibrating global sync...')} 
                />
                <CommandIcon 
                    icon={ShieldAlert} 
                    label="[DIAGNOSTICS]" 
                    color="#ef4444" 
                    onClick={() => setDiagnosticsOpen(true)} 
                />
                <CommandIcon 
                    icon={Trash2} 
                    label="[PURGE_CACHE]" 
                    color="#666" 
                    onClick={() => { audio.playError(); addLog('WARN', 'COMMAND_DECK: Temporary buffers flushed.'); }} 
                />
            </div>
        </motion.div>
    );
};

export default HolographicCommandDeck;