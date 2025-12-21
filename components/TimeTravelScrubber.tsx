
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Play, RotateCcw, Save, ChevronUp, ChevronDown, X } from 'lucide-react';
import { neuralVault } from '../services/persistenceService';
import { AppMode } from '../types';
import { useAppStore } from '../store';

interface Snapshot {
    timestamp: number;
    mode: AppMode;
    label: string;
    state: any;
}

interface TimeTravelScrubberProps {
    mode: AppMode;
    onRestore: (state: any) => void;
    isOpen: boolean;
    onClose: () => void;
}

const TimeTravelScrubber: React.FC<TimeTravelScrubberProps> = ({ mode, onRestore, isOpen, onClose }) => {
    const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
    const [activeIndex, setActiveIndex] = useState<number | null>(null); // null = Live
    const scrollRef = useRef<HTMLDivElement>(null);
    const { addLog } = useAppStore();

    // Load History
    useEffect(() => {
        const loadHistory = async () => {
            const history = await neuralVault.getHistory(mode);
            if (history) {
                const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
                setSnapshots(sorted);
            }
        };

        if (isOpen) {
            loadHistory();
            const interval = setInterval(loadHistory, 5000);
            return () => clearInterval(interval);
        }
    }, [isOpen, mode]);

    // Auto-scroll to end on open
    useEffect(() => {
        if (isOpen && scrollRef.current) {
            setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
                }
            }, 100);
        }
    }, [isOpen, snapshots.length]);

    const handleRestore = (index: number) => {
        const snapshot = snapshots[index];
        setActiveIndex(index);
        onRestore(snapshot.state);
        addLog('WARN', `TIMELINE_JUMP: Reverted state to [${new Date(snapshot.timestamp).toLocaleTimeString()}]`);
    };

    const handleReturnToLive = async () => {
        setActiveIndex(null);
        if (snapshots.length > 0) {
             const latest = snapshots[snapshots.length - 1];
             onRestore(latest.state);
        }
        addLog('SYSTEM', 'RESYNC: Returned to Head of Timeline');
    };

    const handleManualSave = async () => {
        const store = useAppStore.getState();
        let stateToSave = null;
        
        switch(mode) {
            case AppMode.PROCESS_MAP: stateToSave = store.process; break;
            case AppMode.CODE_STUDIO: stateToSave = store.codeStudio; break;
            case AppMode.HARDWARE_ENGINEER: stateToSave = store.hardware; break;
            case AppMode.IMAGE_GEN: stateToSave = store.imageGen; break;
            case AppMode.BIBLIOMORPHIC: stateToSave = store.bibliomorphic; break;
            default: break;
        }

        if (stateToSave) {
            await neuralVault.createCheckpoint(mode, stateToSave, "Manual Checkpoint");
            addLog('SYSTEM', 'SNAPSHOT: Manual Checkpoint Created');
            const history = await neuralVault.getHistory(mode);
            if (history) setSnapshots([...history].sort((a, b) => a.timestamp - b.timestamp));
        } else {
            addLog('WARN', 'SNAPSHOT: Mode does not support persistence');
        }
    };

    const formatTimeDelta = (timestamp: number) => {
        const diff = Date.now() - timestamp;
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `-${Math.floor(diff / 60000)}m`;
        return `-${Math.floor(diff / 3600000)}h`;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ y: 200, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 200, opacity: 0 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 120 }}
                    className="fixed bottom-[88px] left-6 right-6 z-[140] w-auto max-w-4xl"
                >
                    <div className="bg-[#0a0a0a]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_-20px_50px_rgba(0,0,0,0.6)] overflow-hidden">
                        <div className="p-5 flex flex-col gap-5">
                            
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-[#9d4edd]/20 rounded-lg text-[#9d4edd]">
                                        <History size={16} />
                                    </div>
                                    <div>
                                        <div className="text-[#9d4edd] text-[10px] font-black font-mono uppercase tracking-[0.2em]">Temporal Navigation Hub</div>
                                        <div className="text-[8px] font-mono text-gray-500 uppercase tracking-widest mt-0.5">
                                            {snapshots.length} SECURE CHECKPOINTS IDENTIFIED
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={handleManualSave}
                                        className="px-4 py-2 bg-white/5 border border-white/10 hover:border-white/30 text-gray-300 hover:text-white rounded-xl text-[9px] font-mono uppercase transition-all flex items-center gap-2"
                                    >
                                        <Save size={12} /> Checkpoint
                                    </button>
                                    <button 
                                        onClick={handleReturnToLive}
                                        disabled={activeIndex === null}
                                        className={`px-4 py-2 rounded-xl border text-[9px] font-mono uppercase transition-all flex items-center gap-2
                                            ${activeIndex === null 
                                                ? 'bg-[#42be65]/20 border-[#42be65]/40 text-[#42be65] cursor-default' 
                                                : 'bg-white/5 border-white/10 text-gray-400 hover:text-[#42be65] hover:border-[#42be65]'
                                            }`}
                                    >
                                        <Play size={12} /> Live State
                                    </button>
                                    <button onClick={onClose} className="p-2 text-gray-600 hover:text-white transition-colors">
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            <div 
                                ref={scrollRef}
                                className="relative h-28 bg-black/50 border border-white/5 rounded-xl overflow-x-auto overflow-y-hidden custom-scrollbar flex items-center px-6 select-none"
                            >
                                <div className="absolute top-1/2 left-0 right-0 h-px bg-white/5 -z-0"></div>

                                <div className="flex gap-10 relative z-10 items-center min-w-full">
                                    {snapshots.map((snap, i) => {
                                        const isActive = activeIndex === i;
                                        const isLast = i === snapshots.length - 1;
                                        const isAuto = snap.label.includes('Auto');

                                        return (
                                            <motion.div
                                                key={snap.timestamp}
                                                whileHover={{ y: -2 }}
                                                className="relative group flex flex-col items-center gap-3 cursor-pointer pt-6"
                                                onClick={() => handleRestore(i)}
                                            >
                                                <div 
                                                    className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-500 relative
                                                        ${isActive 
                                                            ? 'bg-[#9d4edd] border-[#9d4edd] shadow-[0_0_15px_#9d4edd] scale-125' 
                                                            : isLast && activeIndex === null 
                                                                ? 'bg-[#42be65] border-[#42be65] animate-pulse' 
                                                                : 'bg-[#111] border-gray-700 hover:border-white'
                                                        }`}
                                                >
                                                    <div className={`absolute -top-6 left-1/2 -translate-x-1/2 w-px h-6 ${isActive ? 'bg-[#9d4edd]' : 'bg-white/10'}`}></div>
                                                </div>

                                                <div className="flex flex-col items-center">
                                                    <span className={`text-[9px] font-black font-mono uppercase tracking-widest ${isActive ? 'text-[#9d4edd]' : 'text-gray-500'}`}>
                                                        {isAuto ? 'AUTO' : 'SAVE'}
                                                    </span>
                                                    <span className="text-[8px] font-mono text-gray-600 mt-0.5">
                                                        {formatTimeDelta(snap.timestamp)}
                                                    </span>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                    
                                    <div className="opacity-20 flex flex-col items-center gap-3 pl-10 border-l border-dashed border-white/10">
                                        <div className="w-2.5 h-2.5 rounded-full bg-transparent border border-dashed border-gray-600"></div>
                                        <span className="text-[8px] font-mono text-gray-700 uppercase tracking-widest">Projection</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default TimeTravelScrubber;
