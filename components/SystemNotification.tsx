
import React, { useEffect } from 'react';
import { useAppStore } from '../store';
import { X, Terminal, ShieldAlert } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface SystemError {
    id: string;
    source: string;
    message: string;
    clear: () => void;
}

const NotificationItem: React.FC<{ error: SystemError }> = ({ error }) => {
    // Auto-dismiss after 10 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            error.clear();
        }, 10000);
        return () => clearTimeout(timer);
    }, [error, error.message]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            className="w-80 bg-[#0a0a0a]/95 backdrop-blur-xl border-l-4 border-red-500 rounded-r-lg shadow-[0_0_30px_rgba(220,38,38,0.2)] p-4 pointer-events-auto relative overflow-hidden group mb-2"
        >
            {/* Scanline BG */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(220,38,38,0.05)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none"></div>
            
            <button 
                onClick={error.clear}
                className="absolute top-2 right-2 text-red-900 hover:text-red-500 transition-colors z-20"
            >
                <X className="w-4 h-4" />
            </button>

            <div className="flex gap-3 relative z-10">
                <div className="flex-shrink-0">
                    <div className="p-2 bg-red-500/10 rounded border border-red-500/20">
                         <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <Terminal className="w-3 h-3 text-red-400" />
                        <span className="text-[10px] font-bold font-mono text-red-400 uppercase tracking-widest">
                            ERROR::{error.source}
                        </span>
                    </div>
                    <p className="text-[11px] text-gray-300 font-mono leading-relaxed break-words">
                        {error.message}
                    </p>
                    <div className="mt-2 text-[9px] text-red-900 font-mono uppercase">
                        System Integrity Compromised
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const SystemNotification: React.FC = () => {
    const store = useAppStore();

    // Map store errors to a unified structure
    const errors: SystemError[] = [
        { id: 'proc', source: 'PROCESS_LOGIC', message: store.process.error, clear: () => store.setProcessState({ error: null }) },
        { id: 'img', source: 'ASSET_STUDIO', message: store.imageGen.error, clear: () => store.setImageGenState({ error: null }) },
        { id: 'bib', source: 'BIBLIOMORPHIC', message: store.bibliomorphic.error, clear: () => store.setBibliomorphicState({ error: null }) },
        { id: 'hw', source: 'HARDWARE_ENG', message: store.hardware.error, clear: () => store.setHardwareState({ error: null }) },
        { id: 'voice', source: 'VOICE_CORE', message: store.voice.error, clear: () => store.setVoiceState({ error: null }) },
        { id: 'code', source: 'CODE_STUDIO', message: store.codeStudio.error, clear: () => store.setCodeStudioState({ error: null }) },
    ].filter(e => e.message) as SystemError[];

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end pointer-events-none gap-2">
            <AnimatePresence mode="popLayout">
                {errors.map((err) => (
                    <NotificationItem key={err.id} error={err} />
                ))}
            </AnimatePresence>
        </div>
    );
};

export default SystemNotification;
