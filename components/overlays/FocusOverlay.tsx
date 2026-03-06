import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store';
import { motion } from 'motion/react';
import { Target, X } from 'lucide-react';

const FocusOverlay: React.FC = () => {
    const selector = useAppStore(s => s.focusedSelector);
    const actions = useAppStore(s => s.actions);
    const [bounds, setBounds] = useState<DOMRect | null>(null);

    useEffect(() => {
        if (selector) {
            const el = document.querySelector(selector);
            if (el) {
                setBounds(el.getBoundingClientRect());
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                setBounds(null);
            }
        } else {
            setBounds(null);
        }
    }, [selector]);

    if (!bounds) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] pointer-events-none"
        >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-[3px]" style={{
                clipPath: `polygon(0% 0%, 0% 100%, ${bounds.left}px 100%, ${bounds.left}px ${bounds.top}px, ${bounds.right}px ${bounds.top}px, ${bounds.right}px ${bounds.bottom}px, ${bounds.left}px ${bounds.bottom}px, ${bounds.left}px 100%, 100% 100%, 100% 0%)`
            }}></div>
            <motion.div
                animate={{ boxShadow: ['0 0 20px #7B2CFF', '0 0 40px #18E6FF', '0 0 20px #7B2CFF'] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute border-2 border-[#7B2CFF] rounded-lg"
                style={{ left: bounds.left - 4, top: bounds.top - 4, width: bounds.width + 8, height: bounds.height + 8 }}
            >
                <div className="absolute -top-8 left-0 bg-gradient-to-r from-[var(--amethyst)] to-[var(--cyan)] text-black text-[10px] font-black font-mono px-3 py-1 rounded flex items-center gap-2 pointer-events-auto cursor-pointer" onClick={() => actions.setFocusedSelector(null)}>
                    <Target size={12} /> CONTEXT_FOCUS_L0 <X size={10} />
                </div>
            </motion.div>
        </motion.div>
    );
};

export default FocusOverlay;
