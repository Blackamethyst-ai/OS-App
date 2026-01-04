
import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Eye, Copy, Search, ArrowUpRight, Activity, 
    Terminal, Hash, ShieldCheck, Zap, X
} from 'lucide-react';
import { useAppStore } from '../store';
import { audio } from '../services/audioService';
import { AppMode } from '../types';
import { cn } from '../utils/cn';

interface HubItemProps {
    icon: any;
    label: string;
    onClick: () => void;
    color?: string;
}

const HubItem = ({ icon: Icon, label, onClick, color }: HubItemProps) => (
    <button 
        onClick={onClick}
        className="w-full flex items-center gap-4 px-4 py-2.5 hover:bg-white/[0.03] transition-all group rounded-lg text-left relative"
    >
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-0 bg-[#9d4edd] opacity-0 group-hover:h-1/2 group-hover:opacity-100 transition-all" />
        <Icon size={16} className="text-gray-500 group-hover:text-white transition-colors" />
        <span className="text-[11px] font-mono text-gray-300 group-hover:text-white tracking-widest uppercase transition-colors">
            {label}
        </span>
    </button>
);

const SynapticContextHub: React.FC = () => {
    const { contextMenu, actions } = useAppStore();
    const { isOpen, x, y } = contextMenu;
    const { closeContextMenu, toggleTerminal, setDiagnosticsOpen, setMode } = actions;
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            // Check if the click was outside the menu container
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                closeContextMenu();
            }
        };

        // Delay attaching the listener slightly to avoid catching the initial right-click event
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 0);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, closeContextMenu]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={menuRef}
                    initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                    className="fixed z-[9999] w-[280px] bg-[#0a0a0c] border border-white/10 rounded-xl shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden p-2 backdrop-blur-3xl flex flex-col"
                    style={{ top: y, left: x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="px-4 py-4 space-y-1">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black font-mono text-[#9d4edd] uppercase tracking-[0.2em]">
                                Synaptic Context Hub
                            </h3>
                            <Zap size={12} className="text-[#9d4edd] animate-pulse" />
                        </div>
                        <div className="flex items-center gap-1.5 opacity-40">
                            <Hash size={10} className="text-gray-500" />
                            <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">Metaventions-Hub</span>
                        </div>
                    </div>

                    <div className="h-px w-full bg-white/5 my-1" />

                    {/* Primary Actions */}
                    <div className="flex flex-col gap-0.5 py-1">
                        <HubItem 
                            icon={Eye} 
                            label="Holo Project" 
                            onClick={() => { closeContextMenu(); }} 
                        />
                        <HubItem 
                            icon={Copy} 
                            label="Buffer Copy" 
                            onClick={() => { audio.playClick(); closeContextMenu(); }} 
                        />
                        <HubItem 
                            icon={Search} 
                            label="Grounding Search" 
                            onClick={() => { closeContextMenu(); }} 
                        />
                    </div>

                    <div className="h-px w-full bg-white/5 my-1" />

                    {/* System Navigation */}
                    <div className="flex flex-col gap-0.5 py-1">
                        <HubItem 
                            icon={ArrowUpRight} 
                            label="Hub" 
                            onClick={() => { setMode(AppMode.METAVENTIONS_HUB); closeContextMenu(); }} 
                        />
                        <HubItem 
                            icon={Activity} 
                            label="Diagnostics" 
                            onClick={() => { setDiagnosticsOpen(true); closeContextMenu(); }} 
                        />
                        <HubItem 
                            icon={Terminal} 
                            label="Terminal" 
                            onClick={() => { toggleTerminal(); closeContextMenu(); }} 
                        />
                    </div>

                    {/* Interactive corner close if used as floating widget */}
                    <button 
                        onClick={closeContextMenu}
                        className="absolute top-2 right-2 p-1 text-gray-700 hover:text-white transition-colors"
                    >
                        <X size={10} />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SynapticContextHub;
