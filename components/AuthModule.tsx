import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store';
import { Shield, Fingerprint, Key, ChevronRight, Loader2, Cpu, Globe, Lock, Eye } from 'lucide-react';

const AuthModule: React.FC = () => {
    const { actions } = useAppStore();
    const { setAuthenticated, setUserProfile } = actions;
    const [view, setView] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [credentials, setCredentials] = useState({ username: '', password: '', role: 'OPERATOR' });

    // SOVEREIGN GATE: Passphrase from env var only (no hardcoded fallback)
    const VALID_PASSPHRASE = import.meta.env.VITE_ACCESS_PASSPHRASE;

    // Auto-bypass: ?demo=true in URL skips auth
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('demo') === 'true') {
            setUserProfile({ displayName: 'Demo Observer', role: 'ARCHITECT', clearanceLevel: 10, avatar: null });
            setAuthenticated(true);
        }
    }, [setAuthenticated, setUserProfile]);

    const handleDemoAccess = () => {
        setUserProfile({ displayName: 'Demo Observer', role: 'ARCHITECT', clearanceLevel: 10, avatar: null });
        setAuthenticated(true);
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        // Simulate network handshake
        await new Promise(r => setTimeout(r, 1500));

        // VALIDATE PASSPHRASE
        if (!VALID_PASSPHRASE || credentials.password !== VALID_PASSPHRASE) {
            setError('UPLINK REJECTED: Invalid Neural Key');
            setIsLoading(false);
            return;
        }

        if (view === 'REGISTER') {
            setUserProfile({
                displayName: credentials.username,
                role: credentials.role,
                clearanceLevel: 10,
                avatar: null
            });
        }

        setAuthenticated(true);
        setIsLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center font-sans overflow-hidden bg-black/40 backdrop-blur-xl transition-all duration-1000">
            {/* Background elements - Subtle pulsing lattice */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(157,78,221,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(157,78,221,0.1)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#9d4edd]/5 rounded-full blur-[120px] animate-pulse"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-md bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden z-10"
            >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#9d4edd] to-transparent"></div>

                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-[#111]/50 rounded-full border border-white/10 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(157,78,221,0.2)]">
                        <Shield className="w-10 h-10 text-[#9d4edd]" />
                    </div>
                    <h1 className="text-2xl font-black font-mono text-white tracking-[0.2em] uppercase">Sovereign Gate</h1>
                    <p className="text-[10px] text-gray-400 font-mono mt-2 uppercase tracking-widest">Biometric Authentication Required</p>
                </div>

                <form onSubmit={handleAuth} className="space-y-6">
                    <div className="space-y-4">
                        <div className="relative group">
                            <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block mb-2 px-1">Designation</label>
                            <input
                                type="text"
                                required
                                value={credentials.username}
                                onChange={e => setCredentials({ ...credentials, username: e.target.value })}
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-10 py-3 text-sm text-white font-mono focus:border-[#9d4edd] outline-none transition-all placeholder-white/20"
                                placeholder="Operator ID..."
                            />
                            <Fingerprint className="absolute left-3.5 bottom-3.5 w-4 h-4 text-gray-600 group-focus-within:text-[#9d4edd] transition-colors" />
                        </div>

                        <div className="relative group">
                            <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block mb-2 px-1">Neural Key</label>
                            <input
                                type="password"
                                required
                                value={credentials.password}
                                onChange={e => setCredentials({ ...credentials, password: e.target.value })}
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-10 py-3 text-sm text-white font-mono focus:border-[#9d4edd] outline-none transition-all placeholder-white/20"
                                placeholder="Passphrase..."
                            />
                            <Lock className="absolute left-3.5 bottom-3.5 w-4 h-4 text-gray-600 group-focus-within:text-[#9d4edd] transition-colors" />
                        </div>

                        {view === 'REGISTER' && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="relative group">
                                <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block mb-2 px-1">Role Protocol</label>
                                <select
                                    value={credentials.role}
                                    onChange={e => setCredentials({ ...credentials, role: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-10 py-3 text-sm text-white font-mono focus:border-[#9d4edd] outline-none transition-all appearance-none cursor-pointer"
                                >
                                    <option value="OPERATOR">OPERATOR</option>
                                    <option value="ARCHITECT">ARCHITECT</option>
                                    <option value="SENTINEL">SENTINEL</option>
                                </select>
                                <Cpu className="absolute left-3.5 bottom-3.5 w-4 h-4 text-gray-600 group-focus-within:text-[#9d4edd] transition-colors" />
                            </motion.div>
                        )}
                    </div>

                    <div className="flex flex-col gap-3">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-[10px] font-mono uppercase tracking-wider text-center"
                            >
                                {error}
                            </motion.div>
                        )}
                        <button
                            disabled={isLoading}
                            className="w-full py-4 bg-[#9d4edd] hover:bg-[#b06bf7] text-black font-black font-mono text-xs uppercase tracking-[0.2em] rounded-xl transition-all shadow-[0_0_40px_rgba(157,78,221,0.3)] flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : view === 'LOGIN' ? 'Authorize Uplink' : 'Forge Identity'}
                            {!isLoading && <ChevronRight className="w-4 h-4" />}
                        </button>


                    </div>
                </form>

                <div className="mt-6">
                    <button
                        onClick={handleDemoAccess}
                        className="w-full py-3 bg-transparent border border-white/10 hover:border-white/20 text-gray-500 hover:text-gray-300 font-mono text-[10px] uppercase tracking-[0.2em] rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        <Eye size={14} />
                        Enter as Observer
                    </button>
                </div>

                <div className="mt-6 flex justify-between items-center text-[10px] font-mono text-gray-600 uppercase border-t border-white/5 pt-6">
                    <button onClick={() => setView(view === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="hover:text-white transition-colors">
                        {view === 'LOGIN' ? 'Forge New Identity' : 'Existing Uplink'}
                    </button>
                    <div className="flex gap-4 items-center">
                        <span className="flex items-center gap-1"><Globe size={10} /> SECURE</span>
                        <span className="flex items-center gap-1"><Key size={10} /> AES-256</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AuthModule;