import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store';
import { 
    Activity, Shield, DollarSign, Zap, 
    Bot, Cpu, Radio, ChevronLeft, ChevronRight,
    Target, Layout, Fingerprint, Gauge, Globe
} from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar as RechartRadar, ResponsiveContainer } from 'recharts';
import { cn } from '../utils/cn';

const HUDMetric = ({ icon: Icon, label, value, color }: any) => (
    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-2 group hover:border-white/20 transition-all">
        <div className="flex justify-between items-start">
            <div className="p-1.5 rounded-lg bg-black/40 text-gray-400 group-hover:text-white transition-all">
                <Icon size={14} style={{ color }} />
            </div>
            <span className="text-[10px] font-black font-mono text-white tracking-tighter">{value}</span>
        </div>
        <span className="text-[7px] font-black font-mono text-gray-600 uppercase tracking-widest leading-none">{label}</span>
    </div>
);

const GlobalSidebarHUD: React.FC = () => {
    const { isSidebarHUDOpen, dashboard, agents, actions } = useAppStore();
    const { toggleSidebarHUD } = actions;

    return (
        <div className="fixed right-0 top-20 bottom-24 z-[100] flex pointer-events-none">
            {/* The Peek Gutter */}
            <div 
                className="w-16 h-full flex flex-col items-center justify-center pointer-events-auto cursor-pointer group"
                onClick={() => toggleSidebarHUD()}
            >
                <div className="h-40 w-1.5 bg-white/5 rounded-full group-hover:bg-[#9d4edd]/40 transition-all relative overflow-hidden">
                    <motion.div 
                        animate={{ top: ['0%', '100%', '0%'] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 w-full h-8 bg-[#9d4edd] shadow-[0_0_15px_#9d4edd]"
                    />
                </div>
                <div className="mt-4 flex flex-col gap-6 text-gray-700 group-hover:text-white transition-all">
                    <Activity size={14} />
                    <DollarSign size={14} />
                    <Bot size={14} />
                </div>
            </div>

            {/* The Expanded Panel */}
            <AnimatePresence>
                {isSidebarHUDOpen && (
                    <motion.div
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 30, stiffness: 200 }}
                        className="w-80 h-full bg-[#050505]/95 backdrop-blur-3xl border-l border-white/10 pointer-events-auto p-8 flex flex-col gap-10 shadow-[-50px_0_100px_rgba(0,0,0,0.8)] overflow-y-auto custom-scrollbar"
                    >
                        <div className="flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-[#9d4edd]/20 rounded-xl border border-[#9d4edd]/30 text-[#9d4edd]">
                                    <Activity size={18} />
                                </div>
                                <h2 className="text-xs font-black text-white uppercase tracking-[0.4em] font-mono">System Intel</h2>
                            </div>
                            <button onClick={() => toggleSidebarHUD(false)} className="p-2 text-gray-500 hover:text-white transition-all hover:bg-white/5 rounded-xl"><ChevronRight size={20}/></button>
                        </div>

                        <div className="space-y-4 shrink-0">
                            <div className="grid grid-cols-2 gap-4">
                                <HUDMetric icon={Gauge} label="Global Lattice" value="99.99%" color="#10b981" />
                                <HUDMetric icon={Zap} label="Neural Flux" value="3.9" color="#9d4edd" />
                                <HUDMetric icon={Cpu} label="Compute Units" value="92%" color="#f1c21b" />
                                <HUDMetric icon={Radio} label="Bandwidth" value="0.8GB/s" color="#22d3ee" />
                            </div>
                        </div>

                        <div className="flex-1 space-y-10">
                            <div className="space-y-4">
                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block px-1">Network Topology</span>
                                <div className="h-48 bg-black/40 border border-white/5 rounded-3xl p-4 shadow-inner">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart data={dashboard.topologyData}>
                                            <PolarGrid stroke="#333" />
                                            <PolarAngleAxis dataKey="s" tick={{ fill: '#555', fontSize: 8, fontWeight: 'bold' }} />
                                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                            <RechartRadar dataKey="A" stroke="#f1c21b" fill="#f1c21b" fillOpacity={0.2} isAnimationActive={false} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Active Swarm</span>
                                    <span className="text-[8px] font-mono text-[#10b981] font-black uppercase">Synced</span>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {agents.activeAgents.slice(0, 8).map((agent, i) => (
                                        <div key={i} className="aspect-square bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-center group relative cursor-help" title={agent.name}>
                                            <Bot size={14} className={cn(agent.status === 'THINKING' ? "text-[#f1c21b] animate-spin" : "text-gray-600")} />
                                            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-white/5 shrink-0">
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-3">
                                    <Fingerprint size={14} className="text-[#22d3ee]" />
                                    <span className="text-[8px] font-mono text-gray-600 uppercase tracking-[0.2em] font-black">Operator Authenticated</span>
                                </div>
                                <button onClick={() => window.location.hash = '/finance'} className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] text-white transition-all flex items-center justify-center gap-2">
                                    Manage Treasury <ChevronRight size={14}/>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GlobalSidebarHUD;