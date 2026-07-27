import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAppStore } from '../store';
import { AppMode } from '../types/domain/core';
import { Fingerprint, ChevronRight, Cpu, Globe, Eye, HardDrive } from 'lucide-react';
import MetaventionsLogo from './MetaventionsLogo';

/**
 * Entry screen — an operator profile chooser, not an authentication gate.
 *
 * This used to present a username/passphrase form checked against
 * `VITE_ACCESS_*` with `blackamethyst` / `metaventions2026` as hardcoded
 * fallbacks. That check protected nothing and leaked the password twice
 * over: the fallbacks were compiled into the public bundle, and any
 * `VITE_` value is client-visible by definition. Meanwhile "Enter as
 * Observer" and `?demo=true` both granted full clearance with no password
 * at all, so the form was the long way round to a door that stood open.
 *
 * There is no server-side session and nothing secret behind this screen —
 * model credentials are bring-your-own and live in the in-app vault. So the
 * screen now does the one thing it was really doing: collect a display name
 * and a role. If real authentication is ever needed, it belongs on a server,
 * not here.
 */

const ROLES = ['OPERATOR', 'ARCHITECT', 'SENTINEL'] as const;

/**
 * Uniform for every profile. `clearanceLevel` gates which nav items render
 * (see config/navigation.ts) and every existing entry path already granted
 * 10, so anything lower would silently hide features rather than secure them.
 */
const CLEARANCE = 10;

const AuthModule: React.FC = () => {
    const { actions } = useAppStore();
    const { setAuthenticated, setUserProfile, setMode, addToast } = actions;
    const [displayName, setDisplayName] = useState('');
    const [role, setRole] = useState<string>('ARCHITECT');

    const enter = React.useCallback(
        (profileName: string, profileRole: string) => {
            setUserProfile({
                displayName: profileName,
                role: profileRole,
                clearanceLevel: CLEARANCE,
                avatar: null,
            });
            setMode(AppMode.ARCHON);
            window.location.hash = '#/archon';
            setAuthenticated(true);
        },
        [setAuthenticated, setUserProfile, setMode]
    );

    // Preserved so existing shared ?demo=true links keep working.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('demo') === 'true') {
            enter('Demo Observer', 'ARCHITECT');
        }
    }, [enter]);

    const handleDemoAccess = () => enter('Demo Observer', 'ARCHITECT');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const name = displayName.trim() || 'Operator';
        enter(name, role);
        addToast('success', `Welcome, ${name}.`);
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
                        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
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

                    {/* Profile chooser */}
                    <motion.form
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                        onSubmit={handleSubmit}
                        aria-label="Operator profile"
                        className="space-y-5"
                    >
                        <p className="text-[11px] text-white/35 font-mono text-center uppercase tracking-[0.15em]">
                            Choose your operator profile
                        </p>

                        <div className="space-y-3">
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={e => setDisplayName(e.target.value)}
                                    aria-label="Display name"
                                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-11 py-3.5 text-sm text-white font-mono focus:border-[var(--amethyst)]/60 focus:bg-white/[0.05] outline-none transition-all duration-300 placeholder-white/15"
                                    placeholder="Display name"
                                />
                                <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-[var(--amethyst)] transition-colors duration-300" />
                            </div>

                            <div className="relative group">
                                <select
                                    value={role}
                                    onChange={e => setRole(e.target.value)}
                                    aria-label="Role"
                                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-11 py-3.5 text-sm text-white font-mono focus:border-[var(--amethyst)]/60 outline-none transition-all duration-300 appearance-none cursor-pointer"
                                >
                                    {ROLES.map(r => (
                                        <option key={r} value={r}>
                                            {r}
                                        </option>
                                    ))}
                                </select>
                                <Cpu className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-[var(--amethyst)] transition-colors duration-300" />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-4 bg-[var(--amethyst)] hover:brightness-110 text-white font-bold font-mono text-xs uppercase tracking-[0.2em] rounded-xl transition-all duration-300 shadow-[0_0_40px_rgba(123,44,255,0.25)] hover:shadow-[0_0_60px_rgba(123,44,255,0.4)] flex items-center justify-center gap-3 active:scale-[0.98]"
                        >
                            Enter
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </motion.form>

                    {/* One-click default profile */}
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
                        className="mt-8 flex justify-center items-center gap-4 text-[10px] font-mono text-white/20 uppercase border-t border-white/[0.04] pt-6"
                    >
                        <span className="flex items-center gap-1.5 tracking-wider"><Globe size={10} /> Sovereign</span>
                        <span className="flex items-center gap-1.5 tracking-wider"><HardDrive size={10} /> Local-first</span>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
};

export default AuthModule;
