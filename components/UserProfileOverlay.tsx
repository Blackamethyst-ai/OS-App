import { apiKeyService } from '../services/apiKeyService';
import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { neuralVault } from '../services/persistenceService';
import { generateAvatar, promptSelectKey } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { User, X, Camera, Save, ShieldCheck, Loader2, Fingerprint, ScanFace, Sparkles, ChevronDown, Upload, Sun, Moon, Contrast, Activity, Key } from 'lucide-react';
import { audio } from '../services/audioService';
import { logger } from '../services/logger';
import { AppTheme } from '../types';

const ROLES = ['ARCHITECT', 'OPERATOR', 'SENTINEL', 'NETRUNNER', 'OVERWATCH'];

const UserProfileOverlay: React.FC = () => {
    const isProfileOpen = useAppStore(s => s.isProfileOpen);
    const user = useAppStore(s => s.user);
    const theme = useAppStore(s => s.theme);
    const actions = useAppStore(s => s.actions);

    // Local state for editing
    const [editName, setEditName] = useState(user.displayName || '');
    const [editRole, setEditRole] = useState(user.role);
    const [editClearance, setEditClearance] = useState(user.clearanceLevel);
    const [editAvatar, setEditAvatar] = useState<string | null>(user.avatar);
    const [editApiKey, setEditApiKey] = useState('');

    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Handle Escape key to close profile
    useEffect(() => {
        if (!isProfileOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') actions.toggleProfile(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isProfileOpen, actions]);

    // Sync local state when store updates (e.g. initial load)
    useEffect(() => {
        setEditName(user.displayName || '');
        setEditAvatar(user.avatar);
        setEditRole(user.role);
        setEditClearance(user.clearanceLevel);
        const existingKey = apiKeyService.getGeminiKey();
        if (existingKey) setEditApiKey(existingKey);
    }, [user, isProfileOpen]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];

            // Validation: Size < 5MB
            if (file.size > 5 * 1024 * 1024) {
                actions.addLog('ERROR', 'UPLOAD_FAIL: Image exceeds 5MB limit.');
                audio.playError();
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setEditAvatar(reader.result as string);
                audio.playHover();
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerateAvatar = async () => {
        if (!(editName || '').trim()) return;
        setIsGenerating(true);
        audio.playClick();
        try {
            const hasKey = apiKeyService.hasGeminiKey();
            if (!hasKey) {
                await promptSelectKey();
                setIsGenerating(false);
                return;
            }
            const avatarUrl = await generateAvatar(editRole, editName);
            setEditAvatar(avatarUrl);
            audio.playSuccess();
        } catch (err: any) {
            logger.error("Avatar Gen Error:", err);
            actions.addLog('ERROR', `AVATAR_GEN: ${err.message}`);
            audio.playError();
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        if (!(editName || '').trim()) return;
        setIsSaving(true);
        audio.playClick();

        try {
            const newProfile = {
                displayName: editName,
                avatar: editAvatar,
                role: editRole,
                clearanceLevel: editClearance
            };

            // 1. Update Store
            actions.setUserProfile(newProfile);

            // 2. Persist to DB
            await neuralVault.saveProfile(newProfile);

            // 3. Save API Key (BYOK) - use encrypted vault
            if (editApiKey.trim()) {
                await apiKeyService.setKey('gemini', editApiKey.trim());
            } else {
                await apiKeyService.removeKey('gemini');
            }

            actions.addLog('SUCCESS', `PROFILE_UPDATE: Identity confirmed for [${editName}]`);
            audio.playSuccess();

            setTimeout(() => {
                setIsSaving(false);
                actions.toggleProfile(false);
            }, 800);
        } catch (err) {
            logger.error("Profile Save Error", err);
            actions.addLog('ERROR', "PROFILE_SAVE_FAILED: Write access denied");
            setIsSaving(false);
            audio.playError();
        }
    };

    // Adaptive Layout Logic
    const [isCompact, setIsCompact] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isProfileOpen) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                // Trigger compact mode if height < 700px (standard laptop/small window)
                setIsCompact(entry.contentRect.height < 700);
            }
        });

        if (document.documentElement) resizeObserver.observe(document.documentElement);
        return () => resizeObserver.disconnect();
    }, [isProfileOpen]);

    const ThemeButton = ({ mode, icon: Icon, label }: { mode: AppTheme, icon: any, label: string }) => (
        <button
            onClick={() => { actions.setTheme(mode); audio.playClick(); }}
            className={`flex-1 py-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${theme === mode
                ? 'bg-[var(--amethyst-soft)] text-black border-[var(--amethyst-soft)] shadow-lg scale-105'
                : 'bg-[#111] text-gray-500 border-[#333] hover:border-gray-500 hover:text-gray-300'
                } ${isCompact ? 'py-2 gap-1' : ''}`}
        >
            <Icon className={isCompact ? "w-4 h-4" : "w-5 h-5"} />
            <span className="text-[10px] font-mono uppercase font-bold">{label}</span>
        </button>
    );

    return (
        <AnimatePresence>
            {isProfileOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md" role="presentation">
                    <motion.div
                        ref={containerRef}
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-label="User Profile"
                        className={`bg-[#0a0a0a] border border-[var(--border-main)] rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] relative group transition-all duration-500 ease-in-out ${isCompact ? 'w-[600px] h-auto' : 'w-[500px]'
                            }`}
                    >
                        {/* Background Cybernetic Grid */}
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(157,78,221,0.02)_50%,transparent_75%,transparent)] bg-[size:20px_20px] pointer-events-none"></div>
                        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--amethyst-soft)] to-transparent opacity-50"></div>

                        {/* Header */}
                        <div className="h-14 border-b border-[#1f1f1f] flex items-center justify-between px-6 bg-[#111]">
                            <div className="flex items-center gap-2 text-[var(--amethyst-soft)]">
                                <ScanFace className="w-5 h-5" />
                                <span className="font-mono font-bold uppercase tracking-widest text-xs">Identity Fabrication</span>
                            </div>
                            <button onClick={() => actions.toggleProfile(false)} aria-label="Close profile" className="text-gray-500 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Main Content - Adaptive Grid */}
                        <div className={`flex gap-8 relative z-10 custom-scrollbar transition-all ${isCompact ? 'p-6 flex-row items-start' : 'p-8 flex-col'}`}>

                            {/* Avatar Section - Modular Resizing */}
                            <div className={`flex items-center transition-all ${isCompact ? 'flex-col gap-3 shrink-0' : 'justify-center gap-6'}`}>
                                <div className="relative group/avatar cursor-pointer" role="button" tabIndex={0} aria-label="Change avatar" onClick={() => fileInputRef.current?.click()} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}>
                                    <div className={`rounded-full border-2 border-[#333] group-hover/avatar:border-[var(--amethyst-soft)] overflow-hidden bg-[#050505] flex items-center justify-center transition-all shadow-[0_0_30px_rgba(0,0,0,0.5)] relative ${isCompact ? 'w-24 h-24' : 'w-32 h-32'
                                        }`}>
                                        {editAvatar ? (
                                            <img src={editAvatar} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className={isCompact ? "w-8 h-8 text-gray-700" : "w-12 h-12 text-gray-700"} />
                                        )}

                                        {isGenerating && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                                                <Loader2 className="w-8 h-8 text-[var(--amethyst-soft)] animate-spin" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Tech Ring Animation */}
                                    <div className="absolute -inset-3 border border-dashed border-[var(--amethyst-soft)]/30 rounded-full animate-[spin_10s_linear_infinite] pointer-events-none opacity-0 group-hover/avatar:opacity-100 transition-opacity"></div>

                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                    <div className="absolute bottom-0 right-0 bg-[#1f1f1f] p-1.5 rounded-full border border-[#333] shadow-lg group-hover/avatar:border-[var(--amethyst-soft)]">
                                        <Camera className="w-3 h-3 text-white" />
                                    </div>
                                </div>

                                <div className={`flex gap-3 ${isCompact ? 'flex-col w-full' : 'flex-col'}`}>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-4 py-2 bg-[#1f1f1f] hover:bg-[#333] border border-[#333] hover:border-white rounded text-[10px] font-mono text-gray-300 hover:text-white uppercase tracking-wider transition-all flex items-center gap-2 w-full justify-center"
                                    >
                                        <Upload className="w-3 h-3" />
                                        {isCompact ? 'Upload' : 'Upload Image'}
                                    </button>

                                    <button
                                        onClick={handleGenerateAvatar}
                                        disabled={isGenerating || !(editName || '').trim()}
                                        className="px-4 py-2 bg-[var(--amethyst-soft)]/10 hover:bg-[var(--amethyst-soft)]/20 border border-[var(--amethyst-soft)]/50 rounded text-[10px] font-mono text-[var(--amethyst-soft)] uppercase tracking-wider transition-all flex items-center gap-2 disabled:opacity-50 w-full justify-center"
                                    >
                                        <Sparkles className="w-3 h-3" />
                                        {isCompact ? 'Generate' : 'AI Generate'}
                                    </button>
                                </div>
                            </div>

                            {/* Details Form Area */}
                            <div className="space-y-4 flex-1 w-full">
                                <div>
                                    <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block mb-2">Designation</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="w-full bg-[#050505] border border-[#333] p-3 pl-10 text-white font-mono text-sm focus:border-[var(--amethyst-soft)] outline-none rounded-lg transition-colors"
                                            placeholder="Enter Operator Name..."
                                        />
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">
                                            <Fingerprint className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block mb-2">Role Protocol</label>
                                        <div className="relative group">
                                            <select
                                                value={editRole}
                                                onChange={(e) => setEditRole(e.target.value)}
                                                className="w-full bg-[#111] border border-[#222] p-3 text-xs font-mono text-[var(--cyan)] font-bold uppercase outline-none appearance-none rounded-lg cursor-pointer hover:border-[var(--amethyst-soft)] transition-colors"
                                            >
                                                {ROLES.map(role => (
                                                    <option key={role} value={role}>{role}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                                <ChevronDown className="w-3 h-3" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">Clearance</label>
                                            <span className="text-[10px] font-mono text-[#42be65] font-bold">Lvl {editClearance}</span>
                                        </div>
                                        <div className="h-10 bg-[#111] border border-[#222] rounded-lg p-2 flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map(l => (
                                                <button
                                                    key={l}
                                                    onClick={() => setEditClearance(l)}
                                                    className={`h-full flex-1 rounded transition-all ${l <= editClearance ? 'bg-[#42be65] shadow-[0_0_5px_#42be65]' : 'bg-[#333] hover:bg-[#444]'}`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Neural Uplink Credentials */}
                                <div>
                                    <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block mb-2">Neural Uplink (API Key)</label>
                                    <div className="relative">
                                        <input
                                            type="password"
                                            value={editApiKey}
                                            onChange={(e) => setEditApiKey(e.target.value)}
                                            className="w-full bg-[#050505] border border-[#333] p-3 pl-10 text-white font-mono text-sm focus:border-[var(--amethyst-soft)] outline-none rounded-lg transition-colors"
                                            placeholder="AI Studio Key (Optional)"
                                        />
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">
                                            <Key className="w-4 h-4" />
                                        </div>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] text-gray-600 font-mono">
                                            ENCRYPTED
                                        </div>
                                    </div>
                                </div>

                                {/* Theme Selector */}
                                <div>
                                    <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block mb-2">Theme</label>
                                    <div className="flex gap-4">
                                        <ThemeButton mode={AppTheme.DARK} icon={Moon} label="Dark" />
                                        <ThemeButton mode={AppTheme.CONTRAST} icon={Contrast} label="High Con.." />
                                        <ThemeButton mode={AppTheme.MIDNIGHT} icon={Activity} label="Midnight" />
                                    </div>
                                </div>

                                <button
                                    onClick={handleSave}
                                    disabled={isSaving || !(editName || '').trim()}
                                    className="w-full py-4 bg-[var(--amethyst-soft)] hover:bg-[#b06bf7] text-black font-bold font-mono text-xs uppercase tracking-[0.2em] rounded-lg transition-all shadow-[0_0_20px_rgba(157,78,221,0.4)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {isSaving ? 'ENCODING...' : 'SAVE IDENTITY'}
                                </button>
                            </div>

                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default UserProfileOverlay;