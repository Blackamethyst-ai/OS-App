
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store';
import { Shield, Fingerprint, Key, ChevronRight, Loader2, Cpu, Globe, Lock } from 'lucide-react';

const AuthModule: React.FC = () => {
    const { setAuthenticated, setUserProfile } = useAppStore();
    const [view, setView] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
    const [isLoading, setIsLoading] = useState(false);
    const [credentials, setCredentials] = useState({ username: '', password: '', role: 'OPERATOR' });

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate network handshake
        await new Promise(r => setTimeout(r, 1500));
        
        if (view === 'REGISTER') {
            setUserProfile({
                displayName: credentials.username,
                role: credentials.role,
                clearanceLevel: 1,
                avatar: null
            });
        }
        
        setAuthenticated(true);
        setIsLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[1000] bg-black flex items-center justify-center font-sans overflow-hidden">
            {/* Background elements */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(157,78,221,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(157,78,221,0.1)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#9d4edd]/5 rounded-full blur-[120px]"></div>
            </div>

            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-md bg-[#0a0a0a] border border-[#222] rounded-3xl p-8 shadow-2xl relative overflow-hidden z-10"
            >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#9d4edd] to-transparent"></div>
                
                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-[#111] rounded-full border border-[#333] flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(157,78,221,0.2)]">
                        <Shield className="w-10 h-10 text-[#9d4edd]" />
                    </div>
                    <h1 className="text-2xl font-black font-mono text-white tracking-[0.2em] uppercase">Sovereign Gate</h1>
                    <p className="text-[10px] text-gray-500 font-mono mt-2 uppercase tracking-widest">Biometric Authentication Required</p>
                </div>

                <form onSubmit={handleAuth} className="space-y-6">
                    <div className="space-y-4">
                        <div className="relative group">
                            <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block mb-2 px-1">Designation</label>
                            <input 
                                type="text"
                                required
                                value={credentials.username}
                                onChange={e => setCredentials({...credentials, username: e.target.value})}
                                className="w-full bg-[#050505] border border-[#333] rounded-xl px-10 py-3 text-sm text-white font-mono focus:border-[#9d4edd] outline-none transition-all"
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
                                onChange={e => setCredentials({...credentials, password: e.target.value})}
                                className="w-full bg-[#050505] border border-[#333] rounded-xl px-10 py-3 text-sm text-white font-mono focus:border-[#9d4edd] outline-none transition-all"
                                placeholder="Passphrase..."
                            />
                            <Lock className="absolute left-3.5 bottom-3.5 w-4 h-4 text-gray-600 group-focus-within:text-[#9d4edd] transition-colors" />
                        </div>

                        {view === 'REGISTER' && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="relative group">
                                <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block mb-2 px-1">Role Protocol</label>
                                <select 
                                    value={credentials.role}
                                    onChange={e => setCredentials({...credentials, role: e.target.value})}
                                    className="w-full bg-[#050505] border border-[#333] rounded-xl px-10 py-3 text-sm text-white font-mono focus:border-[#9d4edd] outline-none transition-all appearance-none cursor-pointer"
                                >
                                    <option value="OPERATOR">OPERATOR</option>
                                    <option value="ARCHITECT">ARCHITECT</option>
                                    <option value="SENTINEL">SENTINEL</option>
                                </select>
                                <Cpu className="absolute left-3.5 bottom-3.5 w-4 h-4 text-gray-600 group-focus-within:text-[#9d4edd] transition-colors" />
                            </motion.div>
                        )}
                    </div>

                    <button 
                        disabled={isLoading}
                        className="w-full py-4 bg-[#9d4edd] hover:bg-[#b06bf7] text-black font-black font-mono text-xs uppercase tracking-[0.2em] rounded-xl transition-all shadow-[0_0_40px_rgba(157,78,221,0.3)] flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : view === 'LOGIN' ? 'Authorize Uplink' : 'Forge Identity'}
                        {!isLoading && <ChevronRight className="w-4 h-4" />}
                    </button>
                </form>

                <div className="mt-8 flex justify-between items-center text-[10px] font-mono text-gray-600 uppercase border-t border-[#1f1f1f] pt-6">
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
