
import React from 'react';
import { useAppStore } from '../store';
import { Sun, Moon, Contrast, Terminal, Book, Box, Zap, Palette, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../services/audioService';

const ThemeSwitcher: React.FC = () => {
    const { theme, setTheme } = useAppStore();
    const [isOpen, setIsOpen] = React.useState(false);

    const themes = [
        { id: 'DARK', icon: Moon, label: 'Dark Core', color: '#9d4edd', desc: 'Default low-light interface' },
        { id: 'MIDNIGHT', icon: Box, label: 'Midnight', color: '#3b82f6', desc: 'Deep blue oceanic focus' },
        { id: 'LIGHT', icon: Sun, label: 'High Light', color: '#a855f7', desc: 'Maximized clarity' },
        { id: 'AMBER', icon: Terminal, label: 'Amber Protocol', color: '#f59e0b', desc: 'Retro-industrial terminal' },
        { id: 'SOLARIZED', icon: Book, label: 'Solarized', color: '#2aa198', desc: 'Optimized reading mode' },
        { id: 'NEON_CYBER', icon: Zap, label: 'Neon Cyber', color: '#d946ef', desc: 'High-entropy visual skin' },
        { id: 'CONTRAST', icon: Contrast, label: 'High Contrast', color: '#ffffff', desc: 'Pure black/white access' },
        { id: 'HIGH_CONTRAST', icon: ShieldAlert, label: 'Max Contrast', color: '#00ff00', desc: 'Accessibility focus' }
    ];

    const currentTheme = themes.find(t => t.id === theme) || themes[0];

    const handleThemeSelect = (id: string) => {
        setTheme(id as any);
        setIsOpen(false);
        audio.playClick();
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-gray-500 hover:text-white transition-all border border-transparent hover:border-[#333] rounded-lg bg-transparent hover:bg-white/5 flex items-center justify-center"
                title="Change Interface Theme"
            >
                <currentTheme.icon size={18} style={{ color: isOpen ? currentTheme.color : undefined }} className="transition-transform group-hover:scale-110" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className="absolute top-full right-0 mt-3 w-64 bg-[#0a0a0a]/95 backdrop-blur-2xl border border-[#333] rounded-xl shadow-2xl overflow-hidden z-[101] p-1.5"
                        >
                            <div className="px-3 py-2 text-[8px] font-mono text-gray-500 uppercase tracking-widest border-b border-[#1f1f1f] mb-1 flex items-center justify-between">
                                <span>Interface Skin // Global Vector</span>
                                <Palette size={10} />
                            </div>
                            <div className="max-h-[350px] overflow-y-auto custom-scrollbar pr-0.5">
                                {themes.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => handleThemeSelect(t.id)}
                                        className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all text-left group mb-0.5
                                            ${theme === t.id 
                                                ? 'bg-white/10 text-white border border-white/20 shadow-inner' 
                                                : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'}
                                        `}
                                    >
                                        <div className="mt-1">
                                            <t.icon size={14} style={{ color: theme === t.id ? t.color : undefined }} className="transition-transform duration-300 group-hover:scale-125" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-[10px] font-mono font-bold uppercase tracking-wider">{t.label}</div>
                                            <div className="text-[8px] font-mono text-gray-600 group-hover:text-gray-400 transition-colors">{t.desc}</div>
                                        </div>
                                        {theme === t.id && (
                                            <motion.div layoutId="active-dot-theme" className="w-1.5 h-1.5 rounded-full self-center" style={{ backgroundColor: t.color, boxShadow: `0 0 8px ${t.color}` }} />
                                        )}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-1 p-2 bg-black/50 border-t border-[#1f1f1f] rounded-b-lg">
                                <p className="text-[7px] text-gray-600 font-mono leading-tight uppercase tracking-widest">
                                    Global context-aware transitions active.
                                </p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ThemeSwitcher;
