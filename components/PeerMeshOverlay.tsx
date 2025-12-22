
import React from 'react';
import { useAppStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, Globe, Activity, Terminal, Shield, Zap, Target } from 'lucide-react';
import { AppMode } from '../types';

const PeerMeshOverlay: React.FC = () => {
    const { collaboration, setCollabState } = useAppStore();
    const { peers, events, isOverlayOpen } = collaboration;

    if (!isOverlayOpen) return null;

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-md p-10" onClick={() => setCollabState({ isOverlayOpen: false })}>
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-4xl h-[70vh] bg-[#0a0a0a] border border-[#333] rounded-3xl overflow-hidden shadow-2xl flex flex-col relative"
            >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.05)_0%,transparent_70%)] pointer-events-none"></div>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#9d4edd] via-[#22d3ee] to-[#10b981] opacity-50"></div>

                {/* Header */}
                <div className="h-16 border-b border-[#1f1f1f] bg-white/[0.02] flex items-center justify-between px-8 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-[#22d3ee]/20 rounded-xl text-[#22d3ee] shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                            <Globe size={20} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black font-mono text-white uppercase tracking-[0.3em]">Peer Mesh // Swarm Protocol</h2>
                            <p className="text-[9px] text-gray-500 font-mono tracking-tighter uppercase">{peers.length} Nodes Connected</p>
                        </div>
                    </div>
                    <button onClick={() => setCollabState({ isOverlayOpen: false })} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-500 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Active Peers List */}
                    <div className="w-1/2 border-r border-[#1f1f1f] flex flex-col bg-black/20">
                        <div className="p-4 border-b border-[#1f1f1f] bg-white/[0.01]">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                <Users size={12} /> Live Presence
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3">
                            {peers.map(peer => (
                                <motion.div 
                                    key={peer.id}
                                    layout
                                    className="p-4 bg-[#111] border border-[#222] rounded-2xl flex items-center justify-between group hover:border-[#22d3ee]/40 transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center relative shadow-lg" style={{ backgroundColor: `${peer.color}20`, border: `1px solid ${peer.color}40`, color: peer.color }}>
                                            <span className="text-sm font-black font-mono">{peer.name.charAt(0)}</span>
                                            <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[#10b981] border-2 border-[#111] animate-pulse"></div>
                                        </div>
                                        <div>
                                            <div className="text-xs font-black text-white uppercase font-mono">{peer.name}</div>
                                            <div className="text-[8px] text-gray-500 font-mono uppercase tracking-widest">{peer.role} // LVL 4</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[8px] font-mono text-[#22d3ee] uppercase tracking-tighter mb-1 flex items-center gap-1.5 justify-end">
                                            <Target size={10} /> {peer.activeSector}
                                        </div>
                                        <span className="text-[7px] text-gray-600 font-mono">Synced {Math.floor((Date.now() - peer.lastSeen)/1000)}s ago</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Event Stream */}
                    <div className="w-1/2 flex flex-col bg-black/40">
                        <div className="p-4 border-b border-[#1f1f1f] bg-white/[0.01]">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                <Activity size={12} /> Swarm Intelligence Feed
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                            <AnimatePresence initial={false}>
                                {events.map((event, i) => (
                                    <motion.div 
                                        key={event.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex gap-4 items-start border-l border-white/5 pl-4 py-1"
                                    >
                                        <div className="mt-1 shrink-0">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#9d4edd] shadow-[0_0_8px_#9d4edd]"></div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] font-bold text-[#22d3ee] font-mono uppercase">{event.userName}</span>
                                                <span className="text-[8px] text-gray-600 font-mono">{new Date(event.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'})}</span>
                                            </div>
                                            <p className="text-[11px] text-gray-300 font-mono leading-relaxed">
                                                <span className="text-[#9d4edd] font-black mr-2">>>></span>
                                                {event.action}
                                                {event.target && <span className="text-gray-500 ml-2">[{event.target}]</span>}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {events.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-4">
                                    <Zap size={48} />
                                    <p className="text-[10px] font-mono uppercase tracking-[0.4em]">Signal Quiet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="h-10 bg-black border-t border-[#1f1f1f] px-8 flex items-center justify-between text-[8px] font-mono text-gray-600 shrink-0">
                    <div className="flex items-center gap-6">
                        <span className="flex items-center gap-2 uppercase tracking-widest text-[#10b981]">
                            <Shield size={12} /> End-to-End Encrypted
                        </span>
                        <span className="flex items-center gap-2 uppercase tracking-widest">
                            <Zap size={12} className="text-[#f59e0b]" /> Low Latency Sync
                        </span>
                    </div>
                    <div className="uppercase tracking-[0.4em]">Sovereign Swarm Architecture</div>
                </div>
            </motion.div>
        </div>
    );
};

export default PeerMeshOverlay;
