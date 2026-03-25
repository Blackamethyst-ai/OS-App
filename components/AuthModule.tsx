import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAppStore } from '../store';
import { AppMode } from '../types/domain/core';
import { Fingerprint, ChevronRight, Loader2, Cpu, Globe, Lock, Eye, Zap } from 'lucide-react';
import MetaventionsLogo from './MetaventionsLogo';

const AuthModule: React.FC = () => {
    const { actions } = useAppStore();
    const { setAuthenticated, setUserProfile, setMode, addToast } = actions;
    const [view, setView] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [credentials, setCredentials] = useState({ username: '', password: '', role: 'OPERATOR' });

    const VALID_CREDENTIALS = {
        username: import.meta.env.VITE_ACCESS_USERNAME || 'blackamethyst',
        passphrase: import.meta.env.VITE_ACCESS_PASSPHRASE || 'metaventions2026',
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('demo') === 'true') {
            setUserProfile({ displayName: 'Demo Observer', role: 'ARCHITECT', clearanceLevel: 10, avatar: null });
            setMode(AppMode.ARCHON);
            window.location.hash = '#/archon';
            setAuthenticated(true);
        }
    }, [setAuthenticated, setUserProfile, setMode]);

    const handleDemoAccess = () => {
        setUserProfile({ displayName: 'Demo Observer', role: 'ARCHITECT', clearanceLevel: 10, avatar: null });
        setMode(AppMode.ARCHON);
        window.location.hash = '#/archon';
        setAuthenticated(true);
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        await new Promise(r => setTimeout(r, 1200));

        if (credentials.username !== VALID_CREDENTIALS.username || credentials.password !== VALID_CREDENTIALS.passphrase) {
            setError('ACCESS DENIED — Invalid credentials');
            setIsLoading(false);
            return;
        }

        if (view === 'REGISTER') {
            setUserProfile({ displayName: credentials.username, role: credentials.role, clearanceLevel: 10, avatar: null });
        }

        setAuthenticated(true);
        addToast('success', 'Welcome back, operator.');
        setIsLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center font-sans overflow-hidden">
            {/* Ambient background */}
            <div className="absolute inset-0 bg-[var(--obsidian)]" />
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(123,44,255,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(123,44,255,0.15)_1px,transparent_1px)] bg-[size:60px_60px]" />
            </div>
            <motion.div
                initial={{ opacity: 0, scale: 1.5 }}
                animate={{ opacity: 0.08, scale: 1 }}
                transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, var(--amethyst) 0%, transparent 70%)' }}
            />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-[420px] relative z-10"
            >
                {/* Card */}
                <div className="crystalline rounded-[2rem] p-10 relative overflow-hidden">
                    {/* Top accent line */}
                    <motion.div
                        animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        className="absolute top-0 left-0 w-full h-[2px] bg-[length:200%_auto] bg-gradient-to-r from-[var(--amethyst)] via-[var(--cyan)] to-[var(--amethyst)]"
                    />

                    {/* Brand */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="text-center mb-10"
                    >
                        <div className="flex items-center justify-center mb-6">
                            <MetaventionsLogo size={48} showText={false} />
                        </div>
                        <h1 className="text-xl font-black text-white tracking-[0.3em] uppercase font-mono">Metaventions</h1>
                        <p className="text-[10px] text-white/30 font-mono mt-2 uppercase tracking-[0.4em]">Sovereign AI Platform</p>
                    </motion.div>

                    {/* Form */}
                    <motion.form
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                        onSubmit={handleAuth}
                        aria-label="Authentication form"
                        className="space-y-5"
                    >
                        <div className="space-y-3">
                            <div className="relative group">
                                <input
                                    type="text"
                                    required
                                    value={credentials.username}
                                    onChange={e => setCredentials({ ...credentials, username: e.target.value })}
                                    aria-label="Operator ID"
                                    aria-describedby={error ? 'auth-error' : undefined}
                                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-11 py-3.5 text-sm text-white font-mono focus:border-[var(--amethyst)]/60 focus:bg-white/[0.05] outline-none transition-all duration-300 placeholder-white/15"
                                    placeholder="Operator ID"
                                />
                                <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-[var(--amethyst)] transition-colors duration-300" />
                            </div>

                            <div className="relative group">
                                <input
                                    type="password"
                                    required
                                    value={credentials.password}
                                    onChange={e => setCredentials({ ...credentials, password: e.target.value })}
                                    aria-label="Passphrase"
                                    aria-describedby={error ? 'auth-error' : undefined}
                                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-11 py-3.5 text-sm text-white font-mono focus:border-[var(--amethyst)]/60 focus:bg-white/[0.05] outline-none transition-all duration-300 placeholder-white/15"
                                    placeholder="Passphrase"
                                />
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-[var(--amethyst)] transition-colors duration-300" />
                            </div>

                            {view === 'REGISTER' && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="relative group">
                                    <select
                                        value={credentials.role}
                                        onChange={e => setCredentials({ ...credentials, role: e.target.value })}
                                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-11 py-3.5 text-sm text-white font-mono focus:border-[var(--amethyst)]/60 outline-none transition-all duration-300 appearance-none cursor-pointer"
                                    >
                                        <option value="OPERATOR">OPERATOR</option>
                                        <option value="ARCHITECT">ARCHITECT</option>
                                        <option value="SENTINEL">SENTINEL</option>
                                    </select>
                                    <Cpu className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-[var(--amethyst)] transition-colors duration-300" />
                                </motion.div>
                            )}
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                role="alert"
                                aria-live="assertive"
                                id="auth-error"
                                className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400/90 text-[11px] font-mono text-center"
                            >
                                {error}
                            </motion.div>
                        )}

                        <button
                            disabled={isLoading}
                            className="w-full py-4 bg-[var(--amethyst)] hover:brightness-110 text-white font-bold font-mono text-xs uppercase tracking-[0.2em] rounded-xl transition-all duration-300 shadow-[0_0_40px_rgba(123,44,255,0.25)] hover:shadow-[0_0_60px_rgba(123,44,255,0.4)] flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    {view === 'LOGIN' ? 'Sign In' : 'Create Account'}
                                    <ChevronRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </motion.form>

                    {/* Observer access */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6, duration: 0.5 }}
                        className="mt-5"
                    >
                        <button
                            onClick={handleDemoAccess}
                            className="w-full py-3 bg-white/[0.02] border border-white/[0.06] hover:border-white/15 text-white/40 hover:text-white/70 font-mono text-[11px] uppercase tracking-[0.15em] rounded-xl transition-all duration-300 flex items-center justify-center gap-2.5"
                        >
                            <Eye size={14} />
                            Enter as Observer
                        </button>
                    </motion.div>

                    {/* Footer */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7, duration: 0.5 }}
                        className="mt-8 flex justify-between items-center text-[10px] font-mono text-white/20 uppercase border-t border-white/[0.04] pt-6"
                    >
                        <button onClick={() => setView(view === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="hover:text-white/60 transition-colors duration-300 tracking-wider">
                            {view === 'LOGIN' ? 'Create Account' : 'Sign In'}
                        </button>
                        <div className="flex gap-4 items-center tracking-wider">
                            <span className="flex items-center gap-1.5"><Globe size={10} /> Sovereign</span>
                            <span className="flex items-center gap-1.5"><Zap size={10} /> E2E Encrypted</span>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
};

export default AuthModule;