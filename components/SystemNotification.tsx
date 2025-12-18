
import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store';
import { useSystemMind } from '../stores/useSystemMind';
import { X, Terminal, ShieldAlert, CheckCircle2, Info, AlertTriangle, Activity, Trash2, AlertOctagon, Bell, Cpu, Scan, Globe } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// --- VISUAL COMPONENT: NOTIFICATION CARD ---

const NotificationCard: React.FC<{ 
    id: string; 
    type: 'ERROR' | 'SUCCESS' | 'INFO' | 'WARNING'; 
    title: string; 
    message: string; 
    timestamp: number;
    onDismiss: (id: string) => void; 
}> = ({ id, type, title, message, timestamp, onDismiss }) => {
    
    // Auto-dismiss timer
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

            {/* Progress Bar */}
            <motion.div 
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: type === 'ERROR' ? 10 : 5, ease: 'linear' }}
                className={`h-0.5 absolute bottom-0 left-0 ${s.text.replace('text-', 'bg-')}`}
            />
        </motion.div>
    );
};

// --- VISUAL COMPONENT: LOG ROW ---

const LogRow: React.FC<{ log: any }> = ({ log }) => {
    const getColor = (t: string) => {
        if (t === 'ERROR') return 'text-red-500';
        if (t === 'WARNING') return 'text-amber-500';
        if (t === 'SUCCESS') return 'text-green-500';
        return 'text-blue-400';
    };

    return (
        <div className="flex items-start gap-3 p-3 border-b border-[#222] hover:bg-white/5 transition-colors font-mono text-[10px] group">
            <div className={`mt-0.5 ${getColor(log.type)}`}>
                {log.type === 'ERROR' ? <ShieldAlert className="w-3 h-3" /> : 
                 log.type === 'SUCCESS' ? <CheckCircle2 className="w-3 h-3" /> :
                 log.type === 'WARNING' ? <AlertTriangle className="w-3 h-3" /> :
                 <Info className="w-3 h-3" />}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className={`font-bold ${getColor(log.type)}`}>{log.title}</span>
                    <span className="text-gray-600">|</span>
                    <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="text-gray-300 leading-relaxed break-words">{log.message}</div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT: GLOBAL ALERT MESH ---

const GlobalAlertMesh: React.FC = () => {
    const store = useAppStore();
    const { notifications, pushNotification, dismissNotification } = useSystemMind();
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [filter, setFilter] = useState<'ALL' | 'ERROR' | 'WARNING' | 'SYSTEM'>('ALL');
    
    // Tracks errors to prevent duplicate toasts
    const lastErrors = useRef<Record<string, string | null>>({});

    // 1. WATCHER: Sync Store Errors (Centralized Trap)
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
        store.process.error, 
        store.process.diagramError,
        store.imageGen.error, 
        store.bibliomorphic.error, 
        store.hardware.error, 
        store.voice.error, 
        store.codeStudio.error,
        store.bicameral.error,
        pushNotification
    ]);

    // 2. WATCHER: Sync System Logs (Success/Error/Warn)
    useEffect(() => {
        const lastLog = store.system.logs[store.system.logs.length - 1];
        if (!lastLog) return;

        const logIdKey = `log-${lastLog.id}`;
        if (lastErrors.current['log_tracker'] === logIdKey) return;

        if (lastLog.level === 'SUCCESS') {
            pushNotification('SUCCESS', 'OPERATION_COMPLETE', lastLog.message);
        } else if (lastLog.level === 'WARN') {
            pushNotification('WARNING', 'SYSTEM_ALERT', lastLog.message);
        } else if (lastLog.level === 'ERROR') {
            // Logs marked as ERROR get boosted to toasts automatically
            pushNotification('ERROR', 'CRITICAL_FAILURE', lastLog.message);
        }
        
        lastErrors.current['log_tracker'] = logIdKey;
    }, [store.system.logs, pushNotification]);

    // Filter Logic
    const filteredNotifications = notifications.filter(n => {
        if (filter === 'ALL') return true;
        if (filter === 'ERROR') return n.type === 'ERROR';
        if (filter === 'WARNING') return n.type === 'WARNING';
        return n.type !== 'ERROR' && n.type !== 'WARNING';
    });

    const errorCount = notifications.filter(n => n.type === 'ERROR').length;

    return (
        <>
            {/* 0. SYSTEM HEALTH VIGNETTE (Visual Feedback for Critical State) */}
            <AnimatePresence>
                {errorCount > 0 && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="fixed inset-0 pointer-events-none z-[8000] border-[4px] border-red-500/20 shadow-[inset_0_0_150px_rgba(220,38,38,0.15)]"
                    />
                )}
            </AnimatePresence>

            {/* 1. TOAST LAYER (Fixed Top Right) */}
            <div className="fixed top-20 right-0 z-[9999] flex flex-col items-end pointer-events-none gap-2 perspective-1000 overflow-visible p-6">
                <AnimatePresence mode="popLayout">
                    {notifications.slice(-4).reverse().map((note) => (
                        <NotificationCard 
                            key={note.id}
                            id={note.id}
                            type={note.type}
                            title={note.title}
                            message={note.message}
                            timestamp={note.timestamp}
                            onDismiss={dismissNotification}
                        />
                    ))}
                </AnimatePresence>
            </div>

            {/* 2. DIAGNOSTICS TRIGGER (Fixed Bottom Right) */}
            <div className="fixed bottom-6 right-6 z-[9000]">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsPanelOpen(!isPanelOpen)}
                    className={`
                        h-10 px-4 rounded-full flex items-center gap-3 shadow-[0_0_20px_rgba(0,0,0,0.5)] border backdrop-blur-xl transition-all
                        ${errorCount > 0 
                            ? 'bg-red-950/80 border-red-500 text-red-400 animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.4)]' 
                            : 'bg-[#0a0a0a]/90 border-[#333] text-gray-400 hover:text-white hover:border-[#9d4edd]'}
                    `}
                >
                    {errorCount > 0 ? <AlertOctagon className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
                        Diagnostics {errorCount > 0 ? `(${errorCount})` : ''}
                    </span>
                </motion.button>
            </div>

            {/* 3. DIAGNOSTICS PANEL (Slide Up) */}
            <AnimatePresence>
                {isPanelOpen && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            onClick={() => setIsPanelOpen(false)}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 right-0 top-0 w-[500px] bg-[#0a0a0a] border-l border-[#333] z-[9999] shadow-2xl flex flex-col"
                        >
                            {/* Header */}
                            <div className="h-14 border-b border-[#333] flex items-center justify-between px-6 bg-[#111]">
                                <div className="flex items-center gap-2">
                                    <Terminal className="w-5 h-5 text-[#9d4edd]" />
                                    <span className="text-xs font-bold font-mono text-white uppercase tracking-widest">
                                        System Diagnostics
                                    </span>
                                </div>
                                <button onClick={() => setIsPanelOpen(false)} className="text-gray-500 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Filters */}
                            <div className="p-3 border-b border-[#222] flex gap-2 overflow-x-auto bg-[#050505]">
                                {['ALL', 'ERROR', 'WARNING', 'SYSTEM'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f as any)}
                                        className={`
                                            px-3 py-1.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border transition-all
                                            ${filter === f 
                                                ? 'bg-[#9d4edd] text-black border-[#9d4edd]' 
                                                : 'bg-[#111] text-gray-500 border-[#333] hover:border-gray-500 hover:text-gray-300'}
                                        `}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>

                            {/* List */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#080808]">
                                {filteredNotifications.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
                                        <CheckCircle2 className="w-12 h-12 mb-4" />
                                        <p className="text-xs font-mono uppercase tracking-widest">System Nominal</p>
                                    </div>
                                ) : (
                                    filteredNotifications.slice().reverse().map(n => (
                                        <LogRow key={n.id} log={n} />
                                    ))
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-[#333] bg-[#0a0a0a] flex justify-between items-center text-[10px] font-mono text-gray-500">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${errorCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                                    <span>{errorCount} Active Issues</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-1">
                                        <Globe className="w-3 h-3" />
                                        NET: ONLINE
                                    </span>
                                    <button className="flex items-center gap-2 hover:text-white transition-colors">
                                        <Trash2 className="w-3 h-3" /> Clear History
                                    </button>
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
