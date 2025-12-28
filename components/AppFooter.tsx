import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import MetaventionsLogo from './MetaventionsLogo';

const AppFooter: React.FC = () => {
    return (
        <footer className="w-full bg-[var(--bg-header)] border-t border-[var(--border-main)] py-6 px-16 shrink-0 relative z-[60] transition-colors duration-1000 brand-inner-glow overflow-hidden backdrop-blur-3xl">
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

            <div className="max-w-[2800px] mx-auto flex flex-col gap-6 relative z-10">
                
                {/* Top Section */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-10">
                        <MetaventionsLogo size={24} showText={true} />
                        <div className="h-6 w-px bg-white/5 hidden sm:block" />
                        <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-[0.4em] flex items-center gap-6">
                            <span className="text-[var(--stellar-white)] font-black">© 2025 METAVENTIONS AI</span>
                            <span className="opacity-20 hidden lg:block">//</span>
                            <span className="hidden lg:block">Sovereign Architecture OS</span>
                            <span className="opacity-20 hidden lg:block">//</span>
                            <span className="hidden lg:block">v9.5-ZENITH</span>
                        </div>
                    </div>

                    <nav className="flex items-center gap-12">
                        {[
                            { label: 'LINKEDIN', href: 'https://www.linkedin.com/in/dico-angelo/' },
                            { label: 'GITHUB', href: 'https://github.com/Blackamethyst-ai' },
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

                {/* Bottom Separator & Rhythmic Status Dots */}
                <div className="relative pt-4 flex justify-between items-center border-t border-white/5">
                    <div className="flex items-center gap-4 text-[8px] font-mono text-gray-700 uppercase tracking-[0.4em]">
                        <div className="flex items-center gap-2">
                            {/* Fixed missing import: ShieldCheck from lucide-react */}
                            <ShieldCheck size={10} className="text-[#10b981]" />
                            <span>Secure_Handshake_L0</span>
                        </div>
                        <div className="w-1 h-1 rounded-full bg-gray-900" />
                        <span>Manhattan_Node_01</span>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <span className="text-[8px] font-mono text-gray-700 uppercase tracking-[0.3em]">Sector_Sync</span>
                            <div className="flex gap-1.5 items-center">
                                <motion.div 
                                    animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.4, 1] }}
                                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                                    className="w-1.5 h-1.5 rounded-full bg-[var(--cyan)] shadow-[0_0_10px_var(--cyan)]" 
                                />
                                <motion.div 
                                    animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.4, 1] }}
                                    transition={{ duration: 15, repeat: Infinity, delay: 5, ease: "easeInOut" }}
                                    className="w-1.5 h-1.5 rounded-full bg-[var(--azure-blue)] shadow-[0_0_10px_var(--azure-blue)]" 
                                />
                                <motion.div 
                                    animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.4, 1] }}
                                    transition={{ duration: 15, repeat: Infinity, delay: 10, ease: "easeInOut" }}
                                    className="w-1.5 h-1.5 rounded-full bg-[var(--amethyst)] shadow-[0_0_10px_var(--amethyst)]" 
                                />
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </footer>
    );
};

export default AppFooter;