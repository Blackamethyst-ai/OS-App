import React from 'react';
import { useAppStore } from '../store';
import { motion } from 'framer-motion';
import { X, ListTodo, Zap, Activity } from 'lucide-react';
import ResearchTray from './research/ResearchTray';

const OperationalSidebar: React.FC = () => {
    const actions = useAppStore(s => s.actions);
    return (
        <motion.aside
            initial={{ x: 450, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 450, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-[450px] border-l border-white/10 bg-[#0a0a0c]/80 backdrop-blur-5xl z-[150] flex flex-col shadow-2xl relative"
        >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(157,78,221,0.03)_0%,transparent_70%)] pointer-events-none" />
            <div className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black/20 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-[#9d4edd]/20 rounded-xl text-[#9d4edd] shadow-xl">
                        <ListTodo size={18} />
                    </div>
                    <span className="text-xs font-black font-mono text-white uppercase tracking-[0.3em]">Operational Suite</span>
                </div>
                <button onClick={() => actions.setSidebarOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-10 relative z-10">
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">
                        <span>Research Signal Swarm</span>
                        <Zap size={12} className="text-[#f1c21b] animate-pulse" />
                    </div>
                    <ResearchTray />
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">
                        <span>Lattice Diagnostics</span>
                    </div>
                    <div className="p-8 bg-black/40 border border-white/5 rounded-[2.5rem] text-center opacity-40 group hover:opacity-100 transition-all border-dashed">
                        <Activity size={32} className="mx-auto mb-4 text-gray-700 group-hover:text-[#22d3ee] transition-colors" />
                        <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Awaiting Deep Integration...</p>
                    </div>
                </div>
            </div>

            <div className="h-12 border-t border-white/5 bg-black flex items-center justify-between px-8 text-[8px] font-mono text-gray-700 uppercase font-black">
                <div className="flex gap-4">
                    <span className="text-[#10b981]">Auth_Gate: PASS</span>
                    <span>L0_Link: Stable</span>
                </div>
                <span>Zenith_OS_v9.5</span>
            </div>
        </motion.aside>
    );
};

export default OperationalSidebar;
