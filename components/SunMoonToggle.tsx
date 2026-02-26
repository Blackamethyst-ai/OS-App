import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Moon } from 'lucide-react';
import { useAppStore } from '../store';
import { AppTheme } from '../types';
import { audio } from '../services/audioService';

const SunMoonToggle: React.FC = () => {
    const theme = useAppStore(s => s.theme);
    const setTheme = useAppStore(s => s.actions.setTheme);
    const isDark = theme !== AppTheme.LIGHT;

    const toggleTheme = () => {
        audio.playClick();
        if (isDark) {
            setTheme(AppTheme.LIGHT);
        } else {
            setTheme(AppTheme.DARK);
        }
    };

    return (
        <button
            onClick={toggleTheme}
            className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-black/5 border border-white/5 hover:border-white/20 transition-all group overflow-hidden"
            title={isDark ? "Activate High-Light Mode" : "Activate Void-Dark Mode"}
        >
            <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <AnimatePresence mode="wait" initial={false}>
                {isDark ? (
                    <motion.div
                        key="moon"
                        initial={{ y: 20, opacity: 0, rotate: -45 }}
                        animate={{ y: 0, opacity: 1, rotate: 0 }}
                        exit={{ y: -20, opacity: 0, rotate: 45 }}
                        transition={{ duration: 0.2, ease: "circOut" }}
                    >
                        <Moon size={18} className="text-[#9d4edd] group-hover:drop-shadow-[0_0_8px_#9d4edd]" />
                    </motion.div>
                ) : (
                    <motion.div
                        key="sun"
                        initial={{ y: 20, opacity: 0, rotate: -45 }}
                        animate={{ y: 0, opacity: 1, rotate: 0 }}
                        exit={{ y: -20, opacity: 0, rotate: 45 }}
                        transition={{ duration: 0.2, ease: "circOut" }}
                    >
                        <Sun size={18} className="text-[#f1c21b] group-hover:drop-shadow-[0_0_8px_#f1c21b]" />
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Visual feedback ring */}
            <motion.div 
                className="absolute inset-0 rounded-xl border border-[#9d4edd]/0 pointer-events-none"
                animate={isDark ? { borderColor: 'rgba(157,78,221,0.1)' } : { borderColor: 'rgba(241,194,27,0.1)' }}
            />
        </button>
    );
};

export default SunMoonToggle;