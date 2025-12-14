
import React, { useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import useSystemMind from '../stores/useSystemMind';
import { X, Terminal, ShieldAlert, CheckCircle2, Info, AlertTriangle, Activity } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// --- Visual Components ---

const NotificationCard: React.FC<{ 
    id: string; 
    type: 'ERROR' | 'SUCCESS' | 'INFO' | 'WARNING'; 
    title: string; 
    message: string; 
    onDismiss: (id: string) => void; 
}> = ({ id, type, title, message, onDismiss }) => {
    
    // Auto-dismiss timer
    useEffect(() => {
        const duration = type === 'ERROR' ? 8000 : 5000;
        const timer = setTimeout(() => onDismiss(id), duration);
        return () => clearTimeout(timer);
    }, [id, onDismiss, type]);

    const getColors = () => {
        switch (type) {
            case 'ERROR': return { border: 'border-red-500', bg: 'bg-red-500/10', icon: 'text-red-500', text: 'text-red-400' };
            case 'SUCCESS': return { border: 'border-green-500', bg: 'bg-green-500/10', icon: 'text-green-500', text: 'text-green-400' };
            case 'WARNING': return { border: 'border-amber-500', bg: 'bg-amber-500/10', icon: 'text-amber-500', text: 'text-amber-400' };
            default: return { border: 'border-[#22d3ee]', bg: 'bg-[#22d3ee]/10', icon: 'text-[#22d3ee]', text: 'text-[#22d3ee]' };
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'ERROR': return <ShieldAlert className="w-5 h-5" />;
            case 'SUCCESS': return <CheckCircle2 className="w-5 h-5" />;
            case 'WARNING': return <AlertTriangle className="w-5 h-5" />;
            default: return <Info className="w-5 h-5" />;
        }
    };

    const style = getColors();

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95, transition: { duration: 0.2 } }}
            className={`
                w-96 backdrop-blur-xl border-l-2 rounded-r-lg shadow-[0_5px_30px_rgba(0,0,0,0.5)] 
                p-4 pointer-events-auto relative overflow-hidden group mb-3 bg-[#0a0a0a]/95
                ${style.border}
            `}
        >
            {/* Background Texture */}
            <div className={`absolute inset-0 ${style.bg} opacity-20 group-hover:opacity-30 transition-opacity`}></div>
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none"></div>
            
            <button 
                onClick={() => onDismiss(id)}
                className={`absolute top-2 right-2 ${style.text} hover:text-white transition-colors z-20 opacity-60 hover:opacity-100`}
            >
                <X className="w-4 h-4" />
            </button>

            <div className="flex gap-4 relative z-10 items-start">
                <div className={`flex-shrink-0 p-2 rounded-md border border-white/5 bg-black/40 ${style.icon}`}>
                     {getIcon()}
                </div>
                
                <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2 mb-1">
                        <Terminal className={`w-3 h-3 ${style.text} opacity-70`} />
                        <span className={`text-[10px] font-bold font-mono uppercase tracking-widest ${style.text}`}>
                            {title}
                        </span>
                    </div>
                    <p className="text-xs text-gray-300 font-mono leading-relaxed break-words">
                        {message}
                    </p>
                </div>
            </div>

            {/* Time Bar */}
            <motion.div 
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: type === 'ERROR' ? 8 : 5, ease: 'linear' }}
                className={`absolute bottom-0 left-0 h-0.5 ${style.bg.replace('/10', '')}`}
            />
        </motion.div>
    );
};

// --- Main Controller ---

const SystemNotification: React.FC = () => {
    // 1. Core Stores
    const store = useAppStore();
    const { notifications, pushNotification, dismissNotification } = useSystemMind();
    
    // 2. Refs to prevent infinite loops when syncing Legacy Store -> New Notification System
    const lastErrors = useRef<Record<string, string | null>>({});

    // 3. Watcher Effect: Syncs Legacy Errors (from slices) to Central Notification Queue
    useEffect(() => {
        const errorSources = {
            'PROCESS_LOGIC': store.process.error,
            'ASSET_STUDIO': store.imageGen.error,
            'BIBLIOMORPHIC': store.bibliomorphic.error,
            'HARDWARE_ENG': store.hardware.error,
            'VOICE_CORE': store.voice.error,
            'CODE_STUDIO': store.codeStudio.error,
            'BICAMERAL': store.bicameral.error,
        };

        Object.entries(errorSources).forEach(([source, errorMsg]) => {
            if (errorMsg && errorMsg !== lastErrors.current[source]) {
                // New error detected
                pushNotification('ERROR', `SYS_ERR::${source}`, errorMsg);
                lastErrors.current[source] = errorMsg;
                
                // Optional: Play Sound
                // audio.playError(); 
            } else if (!errorMsg) {
                // Error cleared
                lastErrors.current[source] = null;
            }
        });
    }, [
        store.process.error, 
        store.imageGen.error, 
        store.bibliomorphic.error, 
        store.hardware.error, 
        store.voice.error, 
        store.codeStudio.error,
        store.bicameral.error,
        pushNotification
    ]);

    // 4. Watcher Effect: System Logs (Success/Warn)
    useEffect(() => {
        const lastLog = store.system.logs[store.system.logs.length - 1];
        if (!lastLog) return;

        // Only promote important logs to Toasts to avoid spam
        // We track ID to prevent duplicates if effect re-runs
        const logIdKey = `log-${lastLog.id}`;
        if (lastErrors.current['log_tracker'] === logIdKey) return;

        if (lastLog.level === 'SUCCESS') {
            pushNotification('SUCCESS', 'OPERATION_COMPLETE', lastLog.message);
            lastErrors.current['log_tracker'] = logIdKey;
        } else if (lastLog.level === 'WARN') {
            pushNotification('WARNING', 'SYSTEM_ALERT', lastLog.message);
            lastErrors.current['log_tracker'] = logIdKey;
        }
    }, [store.system.logs, pushNotification]);

    return (
        <div className="fixed top-20 right-6 z-[9999] flex flex-col items-end pointer-events-none gap-2 perspective-1000">
            <AnimatePresence mode="popLayout">
                {notifications.map((note) => (
                    <NotificationCard 
                        key={note.id}
                        id={note.id}
                        type={note.type}
                        title={note.title}
                        message={note.message}
                        onDismiss={dismissNotification}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
};

export default SystemNotification;
