import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Sun, Moon, Contrast, Terminal, Book, Box, Zap, Palette, ShieldAlert, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../services/audioService';
import { AppTheme } from '../types';

const UI_PREVIEW_MAP: Record<AppTheme, { bg: string; accent: string; text: string }> = {
    [AppTheme.DARK]: { bg: '#030303', accent: '#9d4edd', text: '#e5e5e5' },
    [AppTheme.LIGHT]: { bg: '#f5f5f5', accent: '#a855f7', text: '#171717' },
    [AppTheme.CONTRAST]: { bg: '#000000', accent: '#ffffff', text: '#ffffff' },
    [AppTheme.HIGH_CONTRAST]: { bg: '#000000', accent: '#00ff00', text: '#00ff00' },
    [AppTheme.AMBER]: { bg: '#0a0500', accent: '#f59e0b', text: '#f59e0b' },
    [AppTheme.SOLARIZED]: { bg: '#fdf6e3', accent: '#2aa198', text: '#657b83' },
    [AppTheme.MIDNIGHT]: { bg: '#020617', accent: '#3b82f6', text: '#e2e8f0' },
    [AppTheme.NEON_CYBER]: { bg: '#000000', accent: '#d946ef', text: '#22d3ee' },
    [AppTheme.CUSTOM]: { bg: '#030303', accent: '#9d4edd', text: '#e5e5e5' }
};

const ThemeSwitcher: React.FC = () => {
    const { theme, setTheme } = useAppStore();
    const [isOpen, setIsOpen] = useState(false);
    const [hoveredTheme, setHoveredTheme] = useState<AppTheme | null>(null);

    const themes = [
        { id: AppTheme.DARK, icon: Moon, label: 'Dark Core', color: '#9d4edd', desc: 'Default low-light interface' },
        { id: AppTheme.MIDNIGHT, icon: Box, label: 'Midnight', color: '#3b82f6', desc: 'Deep blue oceanic focus' },
        { id: AppTheme.LIGHT, icon: Sun, label: 'High Light', color: '#a855f7', desc: 'Maximized clarity' },
        { id: AppTheme.AMBER, icon: Terminal, label: 'Amber Protocol', color: '#f59e0b', desc: 'Retro-industrial terminal' },
        { id: AppTheme.SOLARIZED, icon: Book, label: 'Solarized', color: '#2aa198', desc: 'Optimized reading mode' },
        { id: AppTheme.NEON_CYBER, icon: Zap, label: 'Neon Cyber', color: '#d946ef', desc: 'High-entropy visual skin' },
        { id: AppTheme.CONTRAST, icon: Contrast, label: 'High Contrast', color: '#ffffff', desc: 'Pure black/white access' },
        { id: AppTheme.HIGH_CONTRAST, icon: ShieldAlert, label: 'Max Contrast', color: '#00ff00', desc: 'Accessibility focus' },
        { id: AppTheme.CUSTOM, icon: Palette, label: 'Custom Skin', color: '#9d4edd', desc: 'User-defined visual parameters' }
    ];

    const currentTheme = themes.find(t => t.id === theme) || themes[0];
    const previewThemeId = hoveredTheme || theme;
    const previewStyles = UI_PREVIEW_MAP[previewThemeId];

    const handleThemeSelect = (id: AppTheme) => {
        setTheme(id);
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
                            className="absolute top-full right-0 mt-3 w-80 bg-[#0a0a0a]/95 backdrop-blur-2xl border border-[#333] rounded-xl shadow-2xl overflow-hidden z-[101] p-1.5 flex flex-col"
                        >
                            <div className="px-3 py-2 text-[8px] font-mono text-gray-500 uppercase tracking-widest border-b border-[#1f1f1f] mb-2 flex items-center justify-between">
                                <span>Interface Skin // Global Vector</span>
                                <Palette size={10} />
                            </div>

                            {/* UI Matrix Preview Area */}
                            <div className="px-3 mb-4">
                                <div className="text-[7px] font-mono text-gray-600 uppercase tracking-widest mb-1.5">Matrix Projection Preview</div>
                                <div 
                                    className="w-full h-28 rounded-lg border border-white/10 overflow-hidden relative shadow-inner transition-colors duration-500"
                                    style={{ backgroundColor: previewStyles.bg }}
                                >
                                    {/* Mock Header */}
                                    <div className="h-6 border-b border-white/5 flex items-center justify-between px-2 gap-1.5 bg-black/20">
                                        <div className="flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: previewStyles.accent }} />
                                            <div className="w-16 h-1 rounded-full opacity-20" style={{ backgroundColor: previewStyles.text }} />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 rounded bg-white/5" />
                                            <div className="w-3 h-3 rounded bg-white/5" />
                                        </div>
                                    </div>
                                    
                                    <div className="p-3 flex gap-3 h-full">
                                        {/* Mock Sidebar */}
                                        <div className="w-10 border-r border-white/5 h-full flex flex-col gap-1.5 pt-1">
                                            {[1,2,3,4].map(i => (
                                                <div key={i} className="w-full h-1.5 opacity-10 rounded-sm" style={{ backgroundColor: previewStyles.text }} />
                                            ))}
                                        </div>
                                        
                                        {/* Mock Dashboard Area */}
                                        <div className="flex-1 space-y-3 pt-1">
                                            <div className="w-2/3 h-2.5 opacity-80 rounded-sm" style={{ backgroundColor: previewStyles.text }} />
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="h-10 rounded-md border border-white/10 bg-white/5 flex flex-col p-1.5 gap-1" style={{ borderColor: `${previewStyles.accent}20` }}>
                                                    <div className="w-1/2 h-1 opacity-20 rounded" style={{ backgroundColor: previewStyles.text }} />
                                                    <div className="w-1/3 h-2 opacity-50 rounded" style={{ backgroundColor: previewStyles.accent }} />
                                                </div>
                                                <div className="h-10 rounded-md border border-white/10 bg-white/5 flex flex-col p-1.5 gap-1" style={{ borderColor: `${previewStyles.accent}20` }}>
                                                    <div className="w-1/2 h-1 opacity-20 rounded" style={{ backgroundColor: previewStyles.text }} />
                                                    <div className="w-1/3 h-2 opacity-50 rounded" style={{ backgroundColor: previewStyles.accent }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Scanline Effect */}
                                    <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:8px_8px]"></div>
                                </div>
                            </div>

                            <div className="max-h-[350px] overflow-y-auto custom-scrollbar pr-0.5">
                                {themes.map((t) => (
                                    <button
                                        key={t.id}
                                        onMouseEnter={() => setHoveredTheme(t.id)}
                                        onMouseLeave={() => setHoveredTheme(null)}
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
                                    Adaptive interface scaling protocols synchronized.
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