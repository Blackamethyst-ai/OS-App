import React from 'react';
import { motion } from 'framer-motion';
import MetaventionsLogo from './MetaventionsLogo';

const AppFooter: React.FC = () => {
    return (
        <footer className="w-full bg-[var(--bg-header)] border-t border-[var(--border-main)] py-10 px-12 shrink-0 relative z-[60] transition-colors duration-500">
            <div className="max-w-[2400px] mx-auto flex flex-col gap-10">
                
                {/* Top Section */}
                <div className="flex justify-between items-start">
                    {/* Left: Branding & Metadata */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <MetaventionsLogo size={28} />
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl font-black font-sans tracking-tight text-[var(--text-primary)] uppercase leading-none">
                                    Metaventions
                                </span>
                                <span className="text-xl font-black font-sans text-[#18E6FF] uppercase leading-none drop-shadow-[0_0_10px_rgba(24,230,255,0.4)]">
                                    AI
                                </span>
                            </div>
                        </div>
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
                                <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[#18E6FF] transition-all group-hover:w-full" />
                            </a>
                        ))}
                    </nav>
                </div>

                {/* Bottom Section: Separator & Accents */}
                <div className="relative">
                    <div className="w-full h-[1px] bg-[var(--border-main)] opacity-50" />
                    
                    {/* Decorative Dots */}
                    <div className="absolute top-6 right-0 flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#18E6FF] shadow-[0_0_8px_rgba(24,230,255,0.6)]" />
                        <div className="w-1.5 h-1.5 rounded-full bg-[#7B2CFF] shadow-[0_0_8px_rgba(123,44,255,0.6)]" />
                        <div className="w-1.5 h-1.5 rounded-full bg-[#FF3DF2] shadow-[0_0_8px_rgba(255,61,242,0.6)]" />
                    </div>
                </div>

            </div>
        </footer>
    );
};

export default AppFooter;