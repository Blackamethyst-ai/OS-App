import React from 'react';
import { motion } from 'framer-motion';
import MetaventionsLogo from './MetaventionsLogo';

const AppFooter: React.FC = () => {
    return (
        <footer className="w-full bg-[var(--bg-header)] border-t border-[var(--border-main)] py-10 px-12 shrink-0 relative z-[60] transition-colors duration-500">
            {/* Ambient footer glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(123,44,255,0.03)_0%,transparent_70%)] pointer-events-none" />

            <div className="max-w-[2400px] mx-auto flex flex-col gap-10 relative z-10">
                
                {/* Top Section */}
                <div className="flex justify-between items-start">
                    {/* Left: Branding & Metadata */}
                    <div className="space-y-4">
                        <MetaventionsLogo size={28} showText={true} />
                        <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-[0.3em] flex items-center gap-2">
                            <span>© 2025 METAVENTIONS AI</span>
                            <span className="opacity-30">//</span>
                            <span>MANHATTAN, NY</span>
                            <span className="opacity-30">//</span>
                            <span>ORBITAL_CORE_01</span>
                        </div>
                    </div>

                    {/* Right: Navigation Links */}
                    <nav className="flex items-center gap-12 pt-4">
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
                                className="text-[10px] font-black font-mono text-[var(--text-muted)] hover:text-[#18E6FF] transition-all tracking-[0.4em] uppercase relative group"
                            >
                                {link.label}
                                <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[#18E6FF] transition-all group-hover:w-full shadow-[0_0_8px_#18E6FF]" />
                            </a>
                        ))}
                    </nav>
                </div>

                {/* Bottom Section: Separator & Accents */}
                <div className="relative">
                    <div className="w-full h-[1px] bg-[var(--border-main)] opacity-50" />
                    
                    {/* Decorative Dots with rhythmic glow */}
                    <div className="absolute top-6 right-0 flex items-center gap-3">
                        <motion.div 
                            animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.2, 1] }}
                            transition={{ duration: 4, repeat: Infinity }}
                            className="w-1.5 h-1.5 rounded-full bg-[#18E6FF] shadow-[0_0_12px_rgba(24,230,255,0.8)]" 
                        />
                        <motion.div 
                            animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.2, 1] }}
                            transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                            className="w-1.5 h-1.5 rounded-full bg-[#7B2CFF] shadow-[0_0_12px_rgba(123,44,255,0.8)]" 
                        />
                        <motion.div 
                            animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.2, 1] }}
                            transition={{ duration: 4, repeat: Infinity, delay: 2 }}
                            className="w-1.5 h-1.5 rounded-full bg-[#FF3DF2] shadow-[0_0_12px_rgba(255,61,242,0.8)]" 
                        />
                    </div>
                </div>

            </div>
        </footer>
    );
};

export default AppFooter;