import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Save, Loader2, Sparkles, Activity, Radio } from 'lucide-react';
import { useAppStore } from '../store';
import { neuralVault } from '../services/persistenceService';
import { AppMode } from '../types';
import { audio } from '../services/audioService';
import MetaventionsLogo from './MetaventionsLogo';
import NeuralDock from './NeuralDock';

const AppFooter: React.FC = () => {
    const { mode, actions } = useAppStore();
    const { addLog } = actions;


    return (
        <footer className="w-full h-[76px] bg-[var(--bg-header)] border-t border-[var(--border-main)] px-10 shrink-0 relative z-[60] transition-colors duration-1000 brand-inner-glow overflow-hidden backdrop-blur-3xl flex items-center">
            {/* Meditative, rhythmic footer glow */}
            <motion.div
                animate={{
                    opacity: [0.03, 0.1, 0.03],
                    scale: [1, 1.25, 1],
                    background: [
                        "radial-gradient(circle_at_50%_0%, var(--amethyst) 0%, transparent 75%)",
                        "radial-gradient(circle_at_50%_0%, var(--azure-blue) 0%, transparent 75%)",
                        "radial-gradient(circle_at_50%_0%, var(--amethyst) 0%, transparent 75%)"
                    ]
                }}
                transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 pointer-events-none"
            />

            <div className="w-full max-w-[2800px] mx-auto flex items-center justify-between relative z-10 h-full">

                {/* Left: Identity */}
                <div className="flex items-center gap-8">
                    <MetaventionsLogo size={24} showText={true} />
                    <div className="h-6 w-px bg-white/5 hidden sm:block" />
                    <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-[0.4em] flex items-center gap-4">
                        <span className="text-[var(--stellar-white)] font-black">© 2026</span>
                        <span className="opacity-20 hidden lg:block">//</span>
                        <span className="hidden lg:block text-[#9d4edd] font-black uppercase [text-shadow:0_0_10px_rgba(157,78,221,0.5)]">V9.5</span>
                    </div>
                </div>

                {/* Center: Neural Dock (Scaled to fit) */}
                <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
                    <NeuralDock mode="static" className="py-2 scale-90 border-transparent bg-transparent shadow-none" />
                </div>

                {/* Right: Links */}
                <div className="flex items-center gap-10">
                    <nav className="flex items-center gap-8">
                        {[
                            { label: 'LINKEDIN', href: 'https://www.linkedin.com/in/dico-angelo/' },
                            { label: 'GITHUB', href: 'https://github.com/Dicoangelo' },
                            { label: 'X', href: 'https://x.com/dicoangelo' }
                        ].map((link) => (
                            <a
                                key={link.label}
                                href={link.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-black font-mono text-[var(--text-muted)] hover:text-[var(--cyan)] transition-all tracking-[0.4em] uppercase relative group"
                            >
                                {link.label}
                                <span className="absolute -bottom-1.5 left-0 w-0 h-[1px] bg-[var(--cyan)] transition-all group-hover:w-full shadow-[0_0_15px_var(--cyan)]" />
                            </a>
                        ))}
                    </nav>
                </div>
            </div>
        </footer>
    );
};

export default AppFooter;