import React from 'react';
import { motion } from 'framer-motion';
import MetaventionsLogo from './MetaventionsLogo';

const AppFooter: React.FC = () => {
    return (
        <footer className="w-full bg-[var(--bg-header)] border-t border-[var(--border-main)] py-14 px-16 shrink-0 relative z-[60] transition-colors duration-1000 brand-inner-glow overflow-hidden backdrop-blur-3xl">
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

            <div className="max-w-[2800px] mx-auto flex flex-col gap-14 relative z-10">
                
                {/* Top Section */}
                <div className="flex justify-between items-start">
                    <div className="space-y-8">
                        <MetaventionsLogo size={36} showText={true} />
                        <div className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-[0.6em] flex items-center gap-6">
                            <span className="text-[var(--stellar-white)] font-black">© 2025 METAVENTIONS AI</span>
                            <span className="opacity-20">//</span>
                            <span>Sovereign Architecture OS</span>
                            <span className="opacity-20">//</span>
                            <span>v9.5-ZENITH-STABLE</span>
                        </div>
                    </div>

                    <nav className="flex items-center gap-20 pt-6">
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
                                className="text-[12px] font-black font-mono text-[var(--text-muted)] hover:text-[var(--cyan)] transition-all tracking-[0.6em] uppercase relative group"
                            >
                                {link.label}
                                <span className="absolute -bottom-3 left-0 w-0 h-[1.5px] bg-[var(--cyan)] transition-all group-hover:w-full shadow-[0_0_15px_var(--cyan)]" />
                            </a>
                        ))}
                    </nav>
                </div>

                {/* Bottom Separator & Rhythmic Status Dots */}
                <div className="relative pt-12">
                    <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[var(--border-main)] to-transparent opacity-60" />
                    
                    <div className="absolute top-18 right-0 flex items-center gap-6 pt-4">
                        <div className="flex flex-col items-end mr-4">
                            <span className="text-[8px] font-mono text-gray-700 uppercase tracking-[0.3em] mb-1">Sector_Sync</span>
                            <span className="text-[10px] font-black font-mono text-[#10b981] uppercase tracking-widest">Nominal</span>
                        </div>
                        <motion.div 
                            animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.4, 1] }}
                            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                            className="w-2.5 h-2.5 rounded-full bg-[var(--cyan)] shadow-[0_0_20px_var(--cyan)]" 
                        />
                        <motion.div 
                            animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.4, 1] }}
                            transition={{ duration: 15, repeat: Infinity, delay: 5, ease: "easeInOut" }}
                            className="w-2.5 h-2.5 rounded-full bg-[var(--azure-blue)] shadow-[0_0_20px_var(--azure-blue)]" 
                        />
                        <motion.div 
                            animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.4, 1] }}
                            transition={{ duration: 15, repeat: Infinity, delay: 10, ease: "easeInOut" }}
                            className="w-2.5 h-2.5 rounded-full bg-[var(--amethyst)] shadow-[0_0_20px_var(--amethyst)]" 
                        />
                    </div>
                    
                    <div className="absolute top-18 left-0 flex items-center gap-4 pt-4 text-[9px] font-mono text-gray-700 uppercase tracking-[0.4em]">
                        <span>Secure_Connection_TLS_1.3</span>
                        <div className="w-1 h-1 rounded-full bg-gray-800" />
                        <span>Manhattan_Node_01</span>
                    </div>
                </div>

            </div>
        </footer>
    );
};

export default AppFooter;