
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Play, RotateCcw, Save, ChevronUp, ChevronDown } from 'lucide-react';
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
    className?: string;
}

const TimeTravelScrubber: React.FC<TimeTravelScrubberProps> = ({ mode, onRestore, className }) => {
    const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
    const [activeIndex, setActiveIndex] = useState<number | null>(null); // null = Live
    const [isOpen, setIsOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { addLog } = useAppStore();

    // Load History
    useEffect(() => {
        const loadHistory = async () => {
            const history = await neuralVault.getHistory(mode);
            if (history) {
                // Sort by time ascending
                const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
                setSnapshots(sorted);
            }
        };

        if (isOpen) {
            loadHistory();
            // Poll for new snapshots while open (e.g. auto-saves)
            const interval = setInterval(loadHistory, 5000);
            return () => clearInterval(interval);
        }
    }, [isOpen, mode]);

    // Auto-scroll to end on open
    useEffect(() => {
        if (isOpen && scrollRef.current) {
            // Tiny delay to allow rendering
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
        // "Return to Live" effectively means restoring the latest snapshot if we were scrubbing
        if (snapshots.length > 0) {
             const latest = snapshots[snapshots.length - 1];
             onRestore(latest.state);
        }
        addLog('SYSTEM', 'RESYNC: Returned to Head of Timeline');
    };

    const handleManualSave = async () => {
        // Trigger manual save of current state
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
            
            // Re-fetch immediately
            const history = await neuralVault.getHistory(mode);
            if (history) {
                setSnapshots([...history].sort((a, b) => a.timestamp - b.timestamp));
            }
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
        <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className={`fixed bottom-0 left-6 z-40 w-full max-w-3xl ${className}`}
        >
            {/* Handle / Toggle */}
            <div className="flex justify-start">
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className="bg-[#0a0a0a] border-t border-x border-[#333] px-6 py-1 rounded-t-lg flex items-center gap-2 text-[10px] font-mono text-gray-500 hover:text-[#9d4edd] hover:border-[#9d4edd] transition-all uppercase tracking-widest shadow-lg"
                >
                    <History className="w-3 h-3" />
                    {isOpen ? 'Close Timeline' : 'Temporal Navigation'}
                    {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                </button>
            </div>

            {/* Main Scrubber Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-r border-[#333] rounded-tr-lg shadow-[0_-10px_40px_rgba(0,0,0,0.5)] overflow-hidden"
                    >
                        <div className="p-4 flex flex-col gap-4">
                            
                            {/* Controls Header */}
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="text-[#9d4edd] text-xs font-mono font-bold uppercase tracking-widest flex items-center gap-2">
                                        <RotateCcw className="w-4 h-4" />
                                        Context History
                                    </div>
                                    <div className="h-4 w-px bg-[#333]"></div>
                                    <div className="text-[9px] font-mono text-gray-500">
                                        {snapshots.length} CHECKPOINTS FOUND
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={handleManualSave}
                                        className="px-3 py-1.5 bg-[#1f1f1f] border border-[#333] hover:border-white text-gray-400 hover:text-white rounded text-[9px] font-mono uppercase transition-colors flex items-center gap-2"
                                    >
                                        <Save className="w-3 h-3" /> Checkpoint
                                    </button>
                                    <button 
                                        onClick={handleReturnToLive}
                                        disabled={activeIndex === null}
                                        className={`px-3 py-1.5 border rounded text-[9px] font-mono uppercase transition-colors flex items-center gap-2
                                            ${activeIndex === null 
                                                ? 'bg-[#42be65]/20 border-[#42be65]/50 text-[#42be65] cursor-default' 
                                                : 'bg-[#1f1f1f] border-[#333] text-gray-400 hover:text-[#42be65] hover:border-[#42be65]'
                                            }`}
                                    >
                                        <Play className="w-3 h-3" /> Live State
                                    </button>
                                </div>
                            </div>

                            {/* Timeline Track */}
                            <div 
                                ref={scrollRef}
                                className="relative h-24 bg-[#050505] border border-[#222] rounded-lg overflow-x-auto overflow-y-hidden custom-scrollbar flex items-center px-4 select-none"
                            >
                                {/* Center Line */}
                                <div className="absolute top-1/2 left-0 right-0 h-px bg-[#333] -z-0"></div>

                                <div className="flex gap-8 relative z-10 items-center min-w-full">
                                    {snapshots.map((snap, i) => {
                                        const isActive = activeIndex === i;
                                        const isLast = i === snapshots.length - 1;
                                        const isAuto = snap.label.includes('Auto');

                                        return (
                                            <motion.div
                                                key={snap.timestamp}
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="relative group flex flex-col items-center gap-2 cursor-pointer pt-4"
                                                onClick={() => handleRestore(i)}
                                            >
                                                {/* Tooltip */}
                                                <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-[#222] border border-[#444] px-2 py-1 rounded text-[9px] font-mono text-white pointer-events-none z-20">
                                                    {new Date(snap.timestamp).toLocaleTimeString()}
                                                </div>

                                                {/* Node */}
                                                <div 
                                                    className={`w-3 h-3 rounded-full border-2 transition-all duration-300 relative
                                                        ${isActive 
                                                            ? 'bg-[#9d4edd] border-[#9d4edd] shadow-[0_0_15px_#9d4edd] scale-125' 
                                                            : isLast && activeIndex === null 
                                                                ? 'bg-[#42be65] border-[#42be65] animate-pulse' 
                                                                : 'bg-[#111] border-gray-600 hover:border-white hover:bg-gray-500'
                                                        }`}
                                                >
                                                    {/* Vertical stem connecting to line */}
                                                    <div className={`absolute -top-4 left-1/2 -translate-x-1/2 w-px h-4 ${isActive ? 'bg-[#9d4edd]' : 'bg-[#333]'}`}></div>
                                                </div>

                                                {/* Label */}
                                                <div className="flex flex-col items-center">
                                                    <span className={`text-[9px] font-mono font-bold uppercase tracking-wider ${isActive ? 'text-[#9d4edd]' : 'text-gray-500'}`}>
                                                        {isAuto ? 'AUTO' : 'SAVE'}
                                                    </span>
                                                    <span className="text-[8px] font-mono text-gray-600">
                                                        {formatTimeDelta(snap.timestamp)}
                                                    </span>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                    
                                    {/* Future/Live Ghost Node */}
                                    <div className="opacity-30 flex flex-col items-center gap-2 pl-8 border-l border-dashed border-[#333]">
                                        <div className="w-2 h-2 rounded-full bg-transparent border border-dashed border-gray-500"></div>
                                        <span className="text-[8px] font-mono text-gray-600">FUTURE</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                        
                        {/* Status Footer */}
                        <div className="h-6 bg-[#050505] border-t border-[#222] flex items-center justify-between px-4 text-[9px] font-mono text-gray-600">
                            <span>NEURAL_VAULT v1.0 connected</span>
                            <span>{activeIndex !== null ? '⚠ TIME DIVERGENCE ACTIVE' : 'SYNCED TO PRESENT'}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default TimeTravelScrubber;
