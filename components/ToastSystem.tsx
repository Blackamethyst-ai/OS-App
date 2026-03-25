import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import type { ToastType } from '../types';

const TOAST_ICONS: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle size={16} className="text-emerald-400 shrink-0" />,
    error: <XCircle size={16} className="text-red-400 shrink-0" />,
    info: <Info size={16} className="text-cyan-400 shrink-0" />,
    warning: <AlertTriangle size={16} className="text-amber-400 shrink-0" />,
};

const TOAST_ACCENTS: Record<ToastType, string> = {
    success: 'border-l-emerald-500/60',
    error: 'border-l-red-500/60',
    info: 'border-l-cyan-500/60',
    warning: 'border-l-amber-500/60',
};

const ToastSystem: React.FC = () => {
    const toasts = useAppStore(s => s.toasts);
    const removeToast = useAppStore(s => s.actions.removeToast);

    return (
        <div className="fixed bottom-6 right-6 z-[900] flex flex-col-reverse gap-2 pointer-events-none">
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => (
                    <ToastItem
                        key={toast.id}
                        id={toast.id}
                        type={toast.type}
                        message={toast.message}
                        duration={toast.duration ?? 4000}
                        onDismiss={removeToast}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
};

const ToastItem: React.FC<{
    id: string;
    type: ToastType;
    message: string;
    duration: number;
    onDismiss: (id: string) => void;
}> = ({ id, type, message, duration, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(() => onDismiss(id), duration);
        return () => clearTimeout(timer);
    }, [id, duration, onDismiss]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 80, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 min-w-[280px] max-w-[380px] bg-black/80 backdrop-blur-xl border border-white/10 border-l-2 ${TOAST_ACCENTS[type]} rounded-xl shadow-2xl`}
        >
            {TOAST_ICONS[type]}
            <span className="text-[12px] font-mono text-white/90 flex-1 leading-relaxed">{message}</span>
            <button
                onClick={() => onDismiss(id)}
                className="text-white/30 hover:text-white/70 transition-colors shrink-0"
                aria-label="Dismiss notification"
            >
                <X size={14} />
            </button>
        </motion.div>
    );
};

export default ToastSystem;
