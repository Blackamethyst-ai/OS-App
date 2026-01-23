import React from 'react';
import { useAppStore } from '../../store';
import { motion } from 'framer-motion';
import { User, ShieldCheck, Terminal } from 'lucide-react';
import { cn } from '../../utils/cn';
import { audio } from '../../services/audioService';
import { NAV_CONFIG } from '../../config/navigation';
import MetaventionsLogo from '../MetaventionsLogo';
import ThemeSwitcher from '../ThemeSwitcher';
import GlobalSearchBar from '../GlobalSearchBar';
import { AppMode } from '../../types';

const AppHeader: React.FC = () => {
    const mode = useAppStore(s => s.mode);
    const user = useAppStore(s => s.user);
    const search = useAppStore(s => s.search);
    const actions = useAppStore(s => s.actions);
    const focusedSelector = useAppStore(s => s.focusedSelector);

    return (
        <header className="flex-shrink-0 h-[76px] z-[100] px-10 flex items-center justify-between backdrop-blur-3xl bg-[var(--bg-header)] shadow-2xl relative transition-all duration-500 border-b border-[var(--border-main)]">
            {/* Procedural Header Gradient Sweep */}
            <motion.div
                animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute top-0 left-0 w-full h-[1.5px] bg-[length:200%_auto] bg-gradient-to-r from-[#7B2CFF] via-[#f1c21b] to-[#18E6FF] opacity-80"
            />

            <div className="flex items-center gap-12 h-full w-full max-w-[2800px] mx-auto">
                <div className="flex items-center gap-4 cursor-pointer group relative shrink-0" onClick={() => window.location.hash = '/metaventions-hub'}>
                    <MetaventionsLogo size={36} showText={true} className={cn("relative z-10 transition-all duration-700 group-hover:scale-110", focusedSelector === 'header' && "scale-125")} />
                </div>

                <div className="h-8 w-px bg-white/5 shrink-0" />

                {/* SYNAPTIC COMMAND BAR: Fluid integration of Tabs and Search */}
                <motion.div
                    layout
                    className="flex-1 h-[48px] bg-black/20 border border-white/5 rounded-2xl flex items-center px-2 relative group/cmdbar focus-within:border-[#9d4edd]/30 focus-within:bg-black/40 transition-all duration-500 overflow-hidden"
                >
                    <nav className="flex items-center h-full overflow-x-auto no-scrollbar flex-1 min-w-0">
                        {NAV_CONFIG.map(item => (
                            <motion.button
                                layout
                                key={item.id}
                                whileHover={{
                                    y: -1,
                                    scale: 1.05,
                                    x: [0, -0.5, 0.5, 0]
                                }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => { window.location.hash = item.path; audio.playClick(); }}
                                className="relative h-full px-4 group flex-shrink-0 flex items-center overflow-visible transition-all duration-300"
                            >
                                <span className={cn(
                                    "text-[9px] font-black uppercase tracking-[0.2em] font-mono transition-all duration-500 relative z-10",
                                    mode === item.id ? 'text-[#18E6FF]' : 'text-[var(--text-muted)] group-hover:text-[#18E6FF]'
                                )}>
                                    {item.label}
                                </span>
                                {mode === item.id && (
                                    <motion.div
                                        layoutId="nav-underline"
                                        className="absolute bottom-[-4px] left-2 right-2 h-[3px] z-20 rounded-full"
                                        initial={{ opacity: 0 }}
                                        animate={{
                                            opacity: 1,
                                            boxShadow: [
                                                "0 0 10px rgba(24, 230, 255, 0.7), 0 0 20px rgba(24, 230, 255, 0.4)",
                                                "0 0 20px rgba(123, 44, 255, 0.9), 0 0 40px rgba(123, 44, 255, 0.5)",
                                                "0 0 10px rgba(24, 230, 255, 0.7), 0 0 20px rgba(24, 230, 255, 0.4)"
                                            ],
                                            background: [
                                                "linear-gradient(90deg, #7B2CFF, #18E6FF)",
                                                "linear-gradient(90deg, #18E6FF, #7B2CFF)",
                                                "linear-gradient(90deg, #7B2CFF, #18E6FF)"
                                            ]
                                        }}
                                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                    />
                                )}
                            </motion.button>
                        ))}
                    </nav>

                    <div className="h-6 w-px bg-white/5 shrink-0 mx-2" />

                    {/* LOCATE INTELLIGENCE: Connected and Flexible */}
                    <div className={cn(
                        "relative flex items-center transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                        search.isOpen ? "w-[300px] lg:w-[400px]" : "w-12 md:w-64"
                    )}>
                        <GlobalSearchBar isIntegrated />
                    </div>
                </motion.div>

                <div className="h-8 w-px bg-white/5 shrink-0" />

                <div className="flex items-center gap-6 shrink-0 h-full">
                    <div className="flex items-center gap-4">
                        <ThemeSwitcher />
                        <button
                            onClick={() => { actions.toggleProfile(true); audio.playClick(); }}
                            className={cn(
                                "group/user relative p-1.5 transition-all rounded-full border border-white/5 bg-black/40 hover:border-[#9d4edd]/50 hover:shadow-[0_0_30px_rgba(157,78,221,0.3)]",
                                focusedSelector === 'header button' && "scale-110 border-[#9d4edd]"
                            )}
                        >
                            <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center relative border border-white/5">
                                {user.avatar ? (
                                    <img src={user.avatar} className="w-full h-full object-cover" alt="Identity" />
                                ) : (
                                    <User size={18} className="text-gray-600 group-hover/user:text-[#9d4edd]" />
                                )}
                            </div>
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 3, repeat: Infinity }}
                                className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#0a0a0a] border border-[#10b981]/50 rounded-full flex items-center justify-center z-10"
                            >
                                <ShieldCheck size={12} className="text-[#10b981]" />
                            </motion.div>
                        </button>
                    </div>

                    <button
                        onClick={() => { actions.toggleCommandPalette(); audio.playClick(); }}
                        className={cn(
                            "relative group/eco px-6 py-2.5 bg-[#050505] border border-white/10 hover:border-[#f1c21b]/50 rounded-2xl transition-all duration-700 shadow-2xl overflow-hidden active:scale-95 shimmer-edge hidden xl:flex",
                            focusedSelector === 'header button:last-child' && "scale-110 border-[#f1c21b]"
                        )}
                    >
                        <span className="relative z-10 text-[10px] font-black font-mono tracking-[0.3em] uppercase flex items-center gap-4 text-gray-500 group-hover:text-[#f1c21b] transition-all">
                            <Terminal size={14} />
                            SYSTEM_KERNEL
                            <div className="w-1.5 h-1.5 rounded-full bg-[#f1c21b] animate-pulse" />
                        </span>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default AppHeader;
