import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store';
import { useFlywheelStore } from '../store/flywheelStore';
import { useSystemMind } from '../stores/useSystemMind';
import { X, Terminal, ShieldAlert, CheckCircle2, Info, AlertTriangle, Activity, Trash2, AlertOctagon, Bell, Cpu, Scan, Globe, ShieldCheck, Zap, Shield, TrendingUp, Radio } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../utils/cn';
import { audio } from '../services/audioService';

const NotificationCard: React.FC<{
    id: string;
    type: 'ERROR' | 'SUCCESS' | 'INFO' | 'WARNING';
    title: string;
    message: string;
    timestamp: number;
    onDismiss: (id: string) => void;
}> = ({ id, type, title, message, timestamp, onDismiss }) => {

    useEffect(() => {
        const duration = type === 'ERROR' ? 10000 : 5000;
        const timer = setTimeout(() => onDismiss(id), duration);
        return () => clearTimeout(timer);
    }, [id, onDismiss, type]);

    const getStyles = () => {
        switch (type) {
            case 'ERROR': return { bg: 'bg-[#1a0505]/95', border: 'border-red-500', text: 'text-red-500', subtext: 'text-red-400', icon: <AlertOctagon className="w-5 h-5" />, glow: 'shadow-[0_0_30px_rgba(239,68,68,0.2)]' };
            case 'SUCCESS': return { bg: 'bg-[#051a05]/95', border: 'border-[#42be65]', text: 'text-[#42be65]', subtext: 'text-green-400', icon: <CheckCircle2 className="w-5 h-5" />, glow: 'shadow-[0_0_30px_rgba(66,190,101,0.2)]' };
            case 'WARNING': return { bg: 'bg-[#1a1205]/95', border: 'border-[#f59e0b]', text: 'text-[#f59e0b]', subtext: 'text-amber-400', icon: <AlertTriangle className="w-5 h-5" />, glow: 'shadow-[0_0_30_px_rgba(245,158,11,0.2)]' };
            default: return { bg: 'bg-[#05051a]/95', border: 'border-[#22d3ee]', text: 'text-[#22d3ee]', subtext: 'text-cyan-400', icon: <Info className="w-5 h-5" />, glow: 'shadow-[0_0_30px_rgba(34,211,238,0.2)]' };
        }
    };

    const s = getStyles();

    return (
        <motion.div layout initial={{ opacity: 0, x: 100, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 100, scale: 0.9, transition: { duration: 0.2 } }} className={cn("w-80 md:w-96 rounded-r-none rounded-l-lg backdrop-blur-xl border-l-4 border-y border-r-0 border-white/10 p-0 pointer-events-auto relative overflow-hidden group mb-3 z-[9999]", s.bg, s.border, s.glow)}>
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_50%,transparent_75%,transparent)] bg-[size:10px_10px] pointer-events-none opacity-20" aria-hidden="true"></div>
            <div className="flex p-4 gap-3 relative z-10">
                <div className={`mt-1 ${s.text} animate-pulse`}>{s.icon}</div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <h4 className={`text-xs font-bold font-mono uppercase tracking-wider ${s.text}`}>{title}</h4>
                        <button onClick={() => onDismiss(id)} className="text-gray-500 hover:text-white transition-colors" aria-label="Dismiss notification"><X className="w-3 h-3" /></button>
                    </div>
                    <p className="text-[10px] text-gray-300 font-mono mt-1 leading-relaxed break-words">{message}</p>
                    <div className="mt-2 text-[8px] font-mono text-gray-600 flex justify-between items-center">
                        <span>{new Date(timestamp).toLocaleTimeString()}</span>
                        <span className="uppercase tracking-widest opacity-50">System Alert</span>
                    </div>
                </div>
            </div>
            <motion.div initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: type === 'ERROR' ? 10 : 5, ease: 'linear' }} className={`h-0.5 absolute bottom-0 left-0 ${s.text.replace('text-', 'bg-')}`} />
        </motion.div>
    );
};

const LogRow: React.FC<{ log: any }> = ({ log }) => {
    const getColor = (t: string) => {
        if (t === 'ERROR' || t === 'CRITICAL') return 'text-red-500';
        if (t === 'WARNING' || t === 'WARN') return 'text-[#f59e0b]';
        if (t === 'SUCCESS') return 'text-[#42be65]';
        return 'text-[#22d3ee]';
    };
    const getIcon = (t: string) => {
        if (t === 'ERROR') return <ShieldAlert className="w-3.5 h-3.5" />;
        if (t === 'SUCCESS') return <CheckCircle2 className="w-3.5 h-3.5" />;
        if (t === 'WARNING' || t === 'WARN') return <AlertTriangle className="w-3.5 h-3.5" />;
        return <Info className="w-3.5 h-3.5" />;
    };
    return (
        <div className="flex items-start gap-4 p-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors font-mono text-[10px] group">
            <div className={`mt-0.5 shrink-0 ${getColor(log.level || log.type)}`}>{getIcon(log.level || log.type)}</div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1.5">
                    <span className={`font-black tracking-widest uppercase text-[9px] ${getColor(log.level || log.type)}`}>{log.level || log.type}</span>
                    <span className="text-gray-500">|</span>
                    <span className="text-[8px] text-gray-400 font-bold">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="text-gray-400 leading-relaxed font-medium uppercase tracking-tight">{log.message}</div>
            </div>
        </div>
    );
};

const TeleologicalEnginePanel = () => {
    const { velocity, confidenceScore } = useFlywheelStore();
    return (
        <div className="p-8 bg-[#0a0a0c] border-b border-white/5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(157,78,221,0.03)_0%,transparent_70%)] pointer-events-none"></div>
            <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-[#9d4edd]/10 border border-[#9d4edd]/30 rounded-xl"><Shield size={18} className="text-[#9d4edd]" /></div>
                    <div>
                        <h3 className="text-[12px] font-black font-mono text-white uppercase tracking-[0.2em]">Teleological Engine</h3>
                        <p className="text-[8px] text-gray-500 font-mono uppercase tracking-[0.4em] mt-1 opacity-60">Core Momentum Metrics</p>
                    </div>
                </div>
                <Activity size={16} className="text-[#9d4edd] animate-pulse" />
            </div>
            <div className="flex items-center gap-12 relative z-10">
                <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90 overflow-visible">
                        <circle cx="48" cy="48" r="44" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
                        <motion.circle cx="48" cy="48" r="44" fill="none" stroke="#9d4edd" strokeWidth="8" strokeDasharray="276" initial={{ strokeDashoffset: 276 }} animate={{ strokeDashoffset: 276 * (1 - (confidenceScore || 0.6)) }} transition={{ duration: 1.5, ease: "circOut" }} strokeLinecap="round" className="drop-shadow-[0_0_8px_#9d4edd]" />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center"><span className="text-2xl font-black font-mono text-white leading-none">{Math.round((confidenceScore || 0.6) * 100)}%</span></div>
                </div>
                <div className="flex-1 space-y-6">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-black font-mono uppercase tracking-widest"><span className="text-gray-500">Velocity</span><span className="text-white">{Math.round(velocity || 15)} m/s</span></div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner"><motion.div animate={{ width: `${Math.min(100, velocity || 15)}%` }} className="h-full bg-gradient-to-r from-[#9d4edd] to-[#22d3ee] shadow-[0_0_15px_rgba(157,78,221,0.4)]" /></div>
                    </div>
                    <div className="bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 flex items-center justify-between group-hover:border-[#9d4edd]/30 transition-all"><span className="text-[9px] font-black font-mono text-gray-500 uppercase tracking-[0.2em]">Alignment State</span><div className="flex items-center gap-2.5"><div className="w-1.5 h-1.5 rounded-full bg-[#9d4edd] animate-pulse shadow-[0_0_10px_#9d4edd]" /><span className="text-[11px] font-black font-mono text-[#9d4edd] uppercase tracking-tighter">Stable</span></div></div>
                </div>
            </div>
        </div>
    );
};

const GlobalAlertMesh: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const store = useAppStore();
    const { notifications, pushNotification, dismissNotification } = useSystemMind();
    const [filter, setFilter] = useState<'ALL' | 'ERROR' | 'WARNING' | 'SYSTEM'>('ALL');
    const lastErrors = useRef<Record<string, string | null>>({});

    useEffect(() => {
        const errorSources = { 'PROCESS_LOGIC': store.process.error, 'DIAGRAM_RENDER': store.process.diagramError, 'ASSET_STUDIO': store.imageGen.error, 'BIBLIOMORPHIC': store.bibliomorphic.error, 'HARDWARE_ENG': store.hardware.error, 'VOICE_CORE': store.voice.error, 'CODE_STUDIO': store.codeStudio.error, 'BICAMERAL': store.bicameral.error };
        Object.entries(errorSources).forEach(([source, errorMsg]) => {
            if (errorMsg && errorMsg !== lastErrors.current[source]) {
                pushNotification('ERROR', `${source}_FAILURE`, errorMsg);
                lastErrors.current[source] = errorMsg;
            } else if (!errorMsg) { lastErrors.current[source] = null; }
        });
    }, [store.process.error, store.process.diagramError, store.imageGen.error, store.bibliomorphic.error, store.hardware.error, store.voice.error, store.codeStudio.error, store.bicameral.error, pushNotification]);

    useEffect(() => {
        const lastLog = store.system.logs[store.system.logs.length - 1];
        if (!lastLog) return;
        const logIdKey = `log-${lastLog.id}`;
        if (lastErrors.current['log_tracker'] === logIdKey) return;
        if (lastLog.level === 'SUCCESS') pushNotification('SUCCESS', 'OP_OK', lastLog.message);
        else if (lastLog.level === 'WARN') pushNotification('WARNING', 'SYS_ALERT', lastLog.message);
        else if (lastLog.level === 'ERROR') pushNotification('ERROR', 'SYS_CRITICAL', lastLog.message);
        lastErrors.current['log_tracker'] = logIdKey;
    }, [store.system.logs, pushNotification]);

    const filteredLogs = store.system.logs.filter(l => {
        if (filter === 'ALL') return true;
        if (filter === 'ERROR') return l.level === 'ERROR';
        if (filter === 'WARNING') return l.level === 'WARN';
        return l.level === 'SYSTEM';
    });
    const errorCount = store.system.logs.filter(n => n.level === 'ERROR').length;

    return (
        <>
            <AnimatePresence>{errorCount > 0 && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="fixed inset-0 pointer-events-none z-[8000] border-[2px] border-red-500/10 shadow-[inset_0_0_100px_rgba(220,38,38,0.1)]" />)}</AnimatePresence>
            <div className="fixed top-20 right-0 z-[9999] flex flex-col items-end pointer-events-none gap-2 p-6">
                <AnimatePresence mode="popLayout">{notifications.slice(-4).reverse().map((note) => (<NotificationCard key={note.id} id={note.id} type={note.type} title={note.title} message={note.message} timestamp={note.timestamp} onDismiss={dismissNotification} />))}</AnimatePresence>
            </div>
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[9998]" />
                        <motion.div initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 180 }} className="fixed bottom-[88px] right-6 top-20 w-[480px] bg-[#0a0a0c]/98 backdrop-blur-5xl border border-white/10 z-[9999] shadow-[0_50px_150px_rgba(0,0,0,1)] flex flex-col rounded-[2.5rem] overflow-hidden">
                            <div className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-white/[0.01] shrink-0 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#22d3ee]/40 to-transparent" />
                                <div className="flex items-center gap-3.5 text-[#22d3ee]"><Activity size={18} className="animate-pulse" /><span className="text-[12px] font-black font-mono uppercase tracking-[0.3em]">Neural Diagnostics</span></div>
                                <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-xl border border-transparent hover:border-white/10"><X size={20} /></button>
                            </div>
                            <TeleologicalEnginePanel />
                            <div className="p-5 border-b border-white/5 flex gap-2.5 bg-black/40 shrink-0 overflow-x-auto no-scrollbar">
                                {[{ id: 'ALL', color: '#22d3ee' }, { id: 'ERROR', color: '#ef4444' }, { id: 'WARNING', color: '#f59e0b' }, { id: 'SYSTEM', color: '#9d4edd' }].map(f => (
                                    <button key={f.id} onClick={() => { audio.playClick(); setFilter(f.id as any); }} className={cn("px-5 py-2 rounded-full text-[10px] font-black font-mono uppercase tracking-widest border transition-all duration-500", filter === f.id ? "bg-[#22d3ee] text-black border-[#22d3ee] shadow-[0_0_15px_rgba(34,211,238,0.3)] scale-105" : "bg-[#111] text-gray-500 border-[#222] hover:border-gray-500")}>{f.id}</button>
                                ))}
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#050507]/40 relative">
                                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
                                {filteredLogs.length === 0 ? (<div className="h-full flex flex-col items-center justify-center text-gray-800 opacity-20 py-32 grayscale"><ShieldCheck size={64} className="mb-6" /><p className="text-[12px] font-mono uppercase tracking-[0.5em] font-black">Lattice Synchronized</p></div>) : (<div className="flex flex-col relative z-10">{filteredLogs.slice().reverse().map((n, i) => <LogRow key={n.id || i} log={n} />)}</div>)}
                            </div>
                            <div className="p-6 border-t border-white/5 bg-[#0a0a0c] flex justify-between items-center shrink-0 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#22d3ee]/5 to-transparent translate-x-[-150%] animate-[shimmer_5s_infinite_linear] balance-flicker" />
                                <div className="flex items-center gap-5 relative z-10">
                                    <div className="flex items-center gap-2">
                                        <div className={cn("w-2 h-2 rounded-full", errorCount > 0 ? "bg-[#ef4444] animate-pulse shadow-[0_0_10px_#ef4444]" : "bg-[#10b981] shadow-[0_0_10px_#10b981]")} />
                                        <span className="text-[9px] font-black font-mono text-gray-500 uppercase tracking-widest">{errorCount} Active Faults</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="flex items-center gap-2.5 text-[#22d3ee] font-black font-mono text-[9px] uppercase tracking-widest"><Globe size={14} className="animate-pulse" /><span>Uplink Stabilized</span></div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

export default GlobalAlertMesh;