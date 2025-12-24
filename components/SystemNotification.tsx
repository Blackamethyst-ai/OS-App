import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store';
import { useFlywheelStore } from '../store/flywheelStore';
import { useSystemMind } from '../stores/useSystemMind';
import { X, Terminal, ShieldAlert, CheckCircle2, Info, AlertTriangle, Activity, Trash2, AlertOctagon, Bell, Cpu, Scan, Globe, ShieldCheck, Zap, Shield, TrendingUp } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

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
            case 'ERROR': return { 
                bg: 'bg-[#1a0505]/95', 
                border: 'border-red-500', 
                text: 'text-red-500', 
                subtext: 'text-red-400',
                icon: <AlertOctagon className="w-5 h-5" />,
                glow: 'shadow-[0_0_30px_rgba(239,68,68,0.2)]'
            };
            case 'SUCCESS': return { 
                bg: 'bg-[#051a05]/95', 
                border: 'border-[#42be65]', 
                text: 'text-[#42be65]', 
                subtext: 'text-green-400',
                icon: <CheckCircle2 className="w-5 h-5" />,
                glow: 'shadow-[0_0_30px_rgba(66,190,101,0.2)]'
            };
            case 'WARNING': return { 
                bg: 'bg-[#1a1205]/95', 
                border: 'border-[#f59e0b]', 
                text: 'text-[#f59e0b]', 
                subtext: 'text-amber-400',
                icon: <AlertTriangle className="w-5 h-5" />,
                glow: 'shadow-[0_0_30px_rgba(245,158,11,0.2)]'
            };
            default: return { 
                bg: 'bg-[#05051a]/95', 
                border: 'border-[#22d3ee]', 
                text: 'text-[#22d3ee]', 
                subtext: 'text-cyan-400',
                icon: <Info className="w-5 h-5" />,
                glow: 'shadow-[0_0_30px_rgba(34,211,238,0.2)]'
            };
        }
    };

    const s = getStyles();

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9, transition: { duration: 0.2 } }}
            className={`
                w-80 md:w-96 rounded-r-none rounded-l-lg backdrop-blur-xl border-l-4 border-y border-r-0 border-white/10
                p-0 pointer-events-auto relative overflow-hidden group mb-3 z-[9999]
                ${s.bg} ${s.border} ${s.glow}
            `}
        >
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_50%,transparent_75%,transparent)] bg-[length:10px_10px] pointer-events-none opacity-20"></div>
            
            <div className="flex p-4 gap-3 relative z-10">
                <div className={`mt-1 ${s.text} animate-pulse`}>
                    {s.icon}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <h4 className={`text-xs font-bold font-mono uppercase tracking-wider ${s.text}`}>{title}</h4>
                        <button onClick={() => onDismiss(id)} className="text-gray-500 hover:text-white transition-colors">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-300 font-mono mt-1 leading-relaxed break-words">{message}</p>
                    <div className="mt-2 text-[8px] font-mono text-gray-600 flex justify-between items-center">
                        <span>{new Date(timestamp).toLocaleTimeString()}</span>
                        <span className="uppercase tracking-widest opacity-50">System Alert</span>
                    </div>
                </div>
            </div>

            <motion.div 
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: type === 'ERROR' ? 10 : 5, ease: 'linear' }}
                className={`h-0.5 absolute bottom-0 left-0 ${s.text.replace('text-', 'bg-')}`}
            />
        </motion.div>
    );
};

const LogRow: React.FC<{ log: any }> = ({ log }) => {
    const getColor = (t: string) => {
        if (t === 'ERROR') return 'text-red-500';
        if (t === 'WARNING') return 'text-amber-500';
        if (t === 'SUCCESS') return 'text-green-500';
        return 'text-blue-400';
    };

    return (
        <div className="flex items-start gap-3 p-3 border-b border-[#222] hover:bg-white/5 transition-colors font-mono text-[10px] group">
            <div className={`mt-0.5 ${getColor(log.level || log.type)}`}>
                {(log.level || log.type) === 'ERROR' ? <ShieldAlert className="w-3 h-3" /> : 
                 (log.level || log.type) === 'SUCCESS' ? <CheckCircle2 className="w-3 h-3" /> :
                 (log.level || log.type) === 'WARNING' ? <AlertTriangle className="w-3 h-3" /> :
                 <Info className="w-3 h-3" />}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className={`font-bold ${getColor(log.level || log.type)} uppercase`}>{log.level || log.type}</span>
                    <span className="text-gray-600">|</span>
                    <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="text-gray-300 leading-relaxed break-words">{log.message}</div>
            </div>
        </div>
    );
};

const TeleologicalEnginePanel = () => {
    const { velocity, confidenceScore } = useFlywheelStore();
    
    const getTheme = (score: number) => {
        if (score > 0.8) return { color: '#22d3ee', label: 'OPTIMAL', glow: 'shadow-[0_0_15px_rgba(34,211,238,0.2)]' };
        if (score > 0.5) return { color: '#9d4edd', label: 'STABLE', glow: 'shadow-[0_0_15px_rgba(157,78,221,0.2)]' };
        return { color: '#ef4444', label: 'CRITICAL', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.2)]' };
    };

    const theme = getTheme(confidenceScore);
    const rotationDuration = velocity > 0 ? Math.max(0.3, 55 / velocity) : 20;

    return (
        <div className="p-6 bg-[#0a0a0a] border-b border-white/5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(157,78,221,0.03)_0%,transparent_70%)] pointer-events-none"></div>
            
            <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#9d4edd]/10 border border-[#9d4edd]/30 rounded-xl">
                        <Shield size={16} className="text-[#9d4edd]" />
                    </div>
                    <div>
                        <h3 className="text-[11px] font-black font-mono text-white uppercase tracking-[0.2em]">Teleological Engine</h3>
                        <p className="text-[8px] text-gray-500 font-mono uppercase tracking-widest">Core Momentum Metrics</p>
                    </div>
                </div>
                <Activity size={14} style={{ color: theme.color }} className="animate-pulse" />
            </div>

            <div className="flex items-center gap-8 relative z-10">
                {/* Mini Orbit Vis */}
                <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: rotationDuration * 2, ease: "linear" }}
                        className="absolute inset-0 rounded-full border border-dashed border-white/10"
                    />
                    <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ repeat: Infinity, duration: rotationDuration, ease: "linear" }}
                        className="absolute inset-1 rounded-full border-t border-l border-transparent"
                        style={{ borderTopColor: theme.color, borderLeftColor: theme.color }}
                    />
                    <div className={`w-8 h-8 rounded-full bg-black border border-white/10 flex items-center justify-center ${theme.glow}`}>
                        <span className="text-[9px] font-black font-mono" style={{ color: theme.color }}>{Math.round(confidenceScore * 100)}%</span>
                    </div>
                </div>

                {/* Statistical Readout */}
                <div className="flex-1 space-y-4">
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[9px] font-mono">
                            <span className="text-gray-500 uppercase tracking-widest">Velocity</span>
                            <span className="text-white font-black tracking-tighter">{Math.round(velocity)} m/s</span>
                        </div>
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                                animate={{ width: `${velocity}%` }}
                                className="h-full bg-white transition-all duration-700" 
                                style={{ backgroundColor: theme.color }}
                            />
                        </div>
                    </div>

                    <div className="flex justify-between items-center bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2">
                        <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">Alignment State</span>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: theme.color }} />
                            <span className="text-[10px] font-black font-mono uppercase" style={{ color: theme.color }}>{theme.label}</span>
                        </div>
                    </div>
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
        const errorSources = {
            'PROCESS_LOGIC': store.process.error,
            'DIAGRAM_RENDER': store.process.diagramError,
            'ASSET_STUDIO': store.imageGen.error,
            'BIBLIOMORPHIC': store.bibliomorphic.error,
            'HARDWARE_ENG': store.hardware.error,
            'VOICE_CORE': store.voice.error,
            'CODE_STUDIO': store.codeStudio.error,
            'BICAMERAL': store.bicameral.error,
        };

        Object.entries(errorSources).forEach(([source, errorMsg]) => {
            if (errorMsg && errorMsg !== lastErrors.current[source]) {
                pushNotification('ERROR', `${source}_FAILURE`, errorMsg);
                lastErrors.current[source] = errorMsg;
            } else if (!errorMsg) {
                lastErrors.current[source] = null;
            }
        });
    }, [
        store.process.error, store.process.diagramError, store.imageGen.error, 
        store.bibliomorphic.error, store.hardware.error, store.voice.error, 
        store.codeStudio.error, store.bicameral.error, pushNotification
    ]);

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
        return l.level !== 'ERROR' && l.level !== 'WARN';
    });

    const errorCount = store.system.logs.filter(n => n.level === 'ERROR').length;

    return (
        <>
            <AnimatePresence>
                {errorCount > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="fixed inset-0 pointer-events-none z-[8000] border-[2px] border-red-500/10 shadow-[inset_0_0_100px_rgba(220,38,38,0.1)]" />
                )}
            </AnimatePresence>

            <div className="fixed top-20 right-0 z-[9999] flex flex-col items-end pointer-events-none gap-2 p-6">
                <AnimatePresence mode="popLayout">
                    {notifications.slice(-4).reverse().map((note) => (
                        <NotificationCard key={note.id} id={note.id} type={note.type} title={note.title} message={note.message} timestamp={note.timestamp} onDismiss={dismissNotification} />
                    ))}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998]" />
                        <motion.div
                            initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 180 }}
                            className="fixed bottom-[88px] right-6 top-20 w-[450px] bg-[#0a0a0a]/95 backdrop-blur-3xl border border-white/10 z-[9999] shadow-2xl flex flex-col rounded-2xl overflow-hidden"
                        >
                            <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-white/[0.02] shrink-0">
                                <div className="flex items-center gap-3 text-[#22d3ee]">
                                    <div className="p-1.5 bg-[#22d3ee]/20 rounded-lg"><Activity size={18} /></div>
                                    <span className="text-xs font-black font-mono uppercase tracking-[0.2em]">Neural Diagnostics</span>
                                </div>
                                <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-2 bg-[#111] rounded-lg border border-[#222]"><X size={18} /></button>
                            </div>

                            {/* Teleological Engine (Flywheel) integrated here */}
                            <TeleologicalEnginePanel />

                            <div className="p-3 border-b border-white/5 flex gap-2 overflow-x-auto bg-black/40 shrink-0">
                                {['ALL', 'ERROR', 'WARNING', 'SYSTEM'].map(f => (
                                    <button key={f} onClick={() => setFilter(f as any)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black font-mono uppercase tracking-widest border transition-all ${filter === f ? 'bg-[#22d3ee] text-black border-[#22d3ee]' : 'bg-[#111] text-gray-500 border-[#222] hover:border-gray-400'}`}>{f}</button>
                                ))}
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 bg-[#050505]">
                                {filteredLogs.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-700 opacity-50 py-20">
                                        <ShieldCheck size={32} className="mb-4" />
                                        <p className="text-[10px] font-mono uppercase tracking-widest">Lattice Synchronized</p>
                                    </div>
                                ) : (
                                    filteredLogs.slice().reverse().map((n, i) => <LogRow key={i} log={n} />)
                                )}
                            </div>

                            <div className="p-4 border-t border-white/5 bg-black/60 flex justify-between items-center text-[9px] font-mono text-gray-500 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className={`w-1.5 h-1.5 rounded-full ${errorCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-[#10b981]'}`}></div>
                                    <span className="font-black uppercase tracking-tighter">{errorCount} Active Faults</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-2 uppercase tracking-tighter"><Globe size={12} className="text-[#22d3ee]" /> Uplink Stabilized</span>
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