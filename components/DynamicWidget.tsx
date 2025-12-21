
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToolResult } from '../types';
import { X, Database, Zap, Activity, Shield, ArrowUpRight, Cpu } from 'lucide-react';

interface DynamicWidgetProps {
    result: ToolResult | null;
    onClose: () => void;
}

const DynamicWidget: React.FC<DynamicWidgetProps> = ({ result, onClose }) => {
    if (!result) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, x: 80, filter: 'blur(15px)', skewX: 10 }}
                animate={{ 
                    opacity: 1, 
                    x: 0, 
                    filter: 'blur(0px)', 
                    skewX: [5, -5, 2, -2, 0] 
                }}
                exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                transition={{ duration: 0.5, times: [0, 0.2, 0.4, 0.6, 1] }}
                className="bg-[#050505]/98 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_50px_150px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[520px] w-full relative"
            >
                {/* Global Glitch Scanline Overlay */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.3)_50%),linear-gradient(90deg,rgba(255,0,0,0.08),rgba(0,255,0,0.03),rgba(0,0,255,0.08))] z-50 bg-[length:100%_3px,2px_100%]" />

                {/* Status Bar */}
                <div className="h-1.5 w-full flex bg-white/5">
                    <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: '100%' }} 
                        transition={{ duration: 0.8 }}
                        className="h-full bg-gradient-to-r from-[#9d4edd] via-[#22d3ee] to-[#10b981]" 
                    />
                </div>

                {/* Header */}
                <div className="h-16 border-b border-white/5 flex items-center justify-between px-7 bg-white/[0.01] relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-[#9d4edd]/20 rounded-2xl text-[#9d4edd] shadow-[0_0_20px_rgba(157,78,221,0.25)] border border-[#9d4edd]/30">
                            {result.uiHint === 'TABLE' ? <Database size={18} /> : 
                             result.uiHint === 'STAT' ? <Zap size={18} /> : 
                             <Activity size={18} />}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[11px] font-black font-mono text-white uppercase tracking-[0.4em]">
                                Agent Output // {result.toolName}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                                <Cpu size={8} className="text-gray-600" />
                                <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">Runtime Hash: {crypto.randomUUID().split('-')[0].toUpperCase()}</span>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-9 h-9 rounded-2xl flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/10"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content Matrix */}
                <div className="flex-1 overflow-auto p-7 custom-scrollbar relative z-10">
                    {result.uiHint === 'TABLE' && Array.isArray(result.data) && (
                        <div className="overflow-x-auto rounded-2xl border border-white/5 bg-black/50 shadow-inner">
                            <table className="w-full text-left font-mono text-[11px] border-collapse">
                                <thead>
                                    <tr className="text-gray-500 border-b border-white/10 bg-white/[0.03]">
                                        {Object.keys(result.data[0]).map(key => (
                                            <th key={key} className="py-4 px-5 uppercase tracking-tighter font-black text-[#9d4edd]">{key}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="text-gray-300">
                                    {result.data.map((row, i) => (
                                        <tr key={i} className="border-b border-white/5 hover:bg-[#22d3ee]/5 transition-all group">
                                            {Object.values(row).map((val: any, j) => (
                                                <td key={j} className="py-4 px-5 truncate max-w-[200px] group-hover:text-white font-medium">{String(val)}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {result.uiHint === 'STAT' && (
                        <div className="grid grid-cols-2 gap-5">
                            {Object.entries(result.data).map(([key, val]) => (
                                <div key={key} className="bg-black/60 border border-white/5 p-6 rounded-3xl group hover:border-[#9d4edd]/40 transition-all relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-10 transition-all">
                                        <ArrowUpRight size={24} className="text-white" />
                                    </div>
                                    <div className="text-[9px] text-gray-600 uppercase font-black font-mono mb-3 tracking-widest">{key}</div>
                                    <div className="text-2xl font-black text-white font-mono group-hover:text-[#22d3ee] transition-colors">{String(val)}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {result.uiHint === 'MESSAGE' && (
                        <div className="p-8 bg-[#22d3ee]/5 border border-[#22d3ee]/30 rounded-3xl text-cyan-50 text-xs font-mono leading-relaxed italic border-l-[6px] border-l-[#22d3ee] shadow-[0_0_30px_rgba(34,211,238,0.05)]">
                            {result.data.message}
                        </div>
                    )}

                    {!result.uiHint && (
                        <div className="bg-black border border-white/5 p-6 rounded-3xl">
                            <pre className="text-[10px] font-mono text-gray-500 leading-relaxed whitespace-pre-wrap">
                                {JSON.stringify(result.data, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>

                {/* Footer Telemetry */}
                <div className="h-12 border-t border-white/5 bg-black/90 flex items-center justify-between px-7 text-[9px] font-mono text-gray-600 relative z-10">
                    <div className="flex gap-8">
                        <span className="flex items-center gap-2"><Shield size={11} className="text-[#10b981]" /> SECURITY: ATTESTED</span>
                        <span className="flex items-center gap-2"><Activity size={11} className="text-[#22d3ee]" /> INTEGRITY: NOMINAL</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-[#10b981] font-black tracking-widest">
                        <motion.div 
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1.2, repeat: Infinity }}
                            className="w-2 h-2 rounded-full bg-current shadow-[0_0_10px_currentColor]"
                        />
                        SYNC_STABLE
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default DynamicWidget;
