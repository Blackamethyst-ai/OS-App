import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { neuralVault } from '../services/persistenceService';
import { generateAvatar, promptSelectKey } from '../services/geminiService';
import { motion, AnimatePresence } from 'framer-motion';
import { User, X, Camera, Save, ShieldCheck, Loader2, Fingerprint, ScanFace, Sparkles, ChevronDown, Upload, Sun, Moon, Contrast } from 'lucide-react';
import { audio } from '../services/audioService';
import { AppTheme } from '../types';

const ROLES = ['ARCHITECT', 'OPERATOR', 'SENTINEL', 'NETRUNNER', 'OVERWATCH'];

const UserProfileOverlay: React.FC = () => {
    const { isProfileOpen, toggleProfile, user, setUserProfile, addLog, theme, setTheme } = useAppStore();
    
    // Local state for editing
    const [editName, setEditName] = useState(user.displayName || '');
    const [editRole, setEditRole] = useState(user.role);
    const [editClearance, setEditClearance] = useState(user.clearanceLevel);
    const [editAvatar, setEditAvatar] = useState<string | null>(user.avatar);
    
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync local state when store updates (e.g. initial load)
    useEffect(() => {
        setEditName(user.displayName || '');
        setEditAvatar(user.avatar);
        setEditRole(user.role);
        setEditClearance(user.clearanceLevel);
    }, [user, isProfileOpen]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            
            // Validation: Size < 5MB
            if (file.size > 5 * 1024 * 1024) {
                addLog('ERROR', 'UPLOAD_FAIL: Image exceeds 5MB limit.');
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
            const hasKey = await window.aistudio?.hasSelectedApiKey();
            if (!hasKey) {
                await promptSelectKey();
                setIsGenerating(false);
                return;
            }
            const avatarUrl = await generateAvatar(editRole, editName);
            setEditAvatar(avatarUrl);
            audio.playSuccess();
        } catch (err: any) {
            console.error("Avatar Gen Error:", err);
            addLog('ERROR', `AVATAR_GEN: ${err.message}`);
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
            setUserProfile(newProfile);
            
            // 2. Persist to DB
            await neuralVault.saveProfile(newProfile);
            
            addLog('SUCCESS', `PROFILE_UPDATE: Identity confirmed for [${editName}]`);
            audio.playSuccess();
            
            setTimeout(() => {
                setIsSaving(false);
                toggleProfile(false);
            }, 800);
        } catch (err) {
            console.error("Profile Save Error", err);
            addLog('ERROR', "PROFILE_SAVE_FAILED: Write access denied");
            setIsSaving(false);
            audio.playError();
        }
    };

    const ThemeButton = ({ mode, icon: Icon, label }: { mode: AppTheme, icon: any, label: string }) => (
        <button
            onClick={() => { setTheme(mode); audio.playClick(); }}
            className={`flex-1 py-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${
                theme === mode 
                ? 'bg-[#9d4edd] text-black border-[#9d4edd] shadow-lg scale-105' 
                : 'bg-[#111] text-gray-500 border-[#333] hover:border-gray-500 hover:text-gray-300'
            }`}
        >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-mono uppercase font-bold">{label}</span>
        </button>
    );

    return (
        <AnimatePresence>
            {isProfileOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-[500px] bg-[#0a0a0a] border border-[#333] rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] relative group"
                    >
                        {/* Background Cybernetic Grid */}
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(157,78,221,0.02)_50%,transparent_75%,transparent)] bg-[size:20px_20px] pointer-events-none"></div>
                        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-[#9d4edd] to-transparent opacity-50"></div>

                        {/* Header */}
                        <div className="h-14 border-b border-[#1f1f1f] flex items-center justify-between px-6 bg-[#111]">
                            <div className="flex items-center gap-2 text-[#9d4edd]">
                                <ScanFace className="w-5 h-5" />
                                <span className="font-mono font-bold uppercase tracking-widest text-xs">Identity Fabrication</span>
                            </div>
                            <button onClick={() => toggleProfile(false)} className="text-gray-500 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Main Content */}
                        <div className="p-8 flex flex-col gap-8 relative z-10 max-h-[80vh] overflow-y-auto custom-scrollbar">
                            
                            {/* Avatar Section */}
                            <div className="flex justify-center gap-6 items-center">
                                <div className="relative group/avatar cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                    <div className="w-32 h-32 rounded-full border-2 border-[#333] group-hover/avatar:border-[#9d4edd] overflow-hidden bg-[#050505] flex items-center justify-center transition-all shadow-[0_0_30px_rgba(0,0,0,0.5)] relative">
                                        {editAvatar ? (
                                            <img src={editAvatar} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-12 h-12 text-gray-700" />
                                        )}
                                        
                                        {isGenerating && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                                                <Loader2 className="w-8 h-8 text-[#9d4edd] animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Tech Ring Animation */}
                                    <div className="absolute -inset-3 border border-dashed border-[#9d4edd]/30 rounded-full animate-[spin_10s_linear_infinite] pointer-events-none opacity-0 group-hover/avatar:opacity-100 transition-opacity"></div>
                                    
                                    <input 
                                        ref={fileInputRef}
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*" 
                                        onChange={handleFileChange}
                                    />
                                    <div className="absolute bottom-0 right-0 bg-[#1f1f1f] p-1.5 rounded-full border border-[#333] shadow-lg group-hover/avatar:border-[#9d4edd]">
                                        <Camera className="w-3 h-3 text-white" />
                                    </div>
                                </div>
                                
                                <div className="flex flex-col gap-3">
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-4 py-2 bg-[#1f1f1f] hover:bg-[#333] border border-[#333] hover:border-white rounded text-[10px] font-mono text-gray-300 hover:text-white uppercase tracking-wider transition-all flex items-center gap-2 w-full justify-center"
                                    >
                                        <Upload className="w-3 h-3" />
                                        Upload Image
                                    </button>

                                    <button 
                                        onClick={handleGenerateAvatar}
                                        disabled={isGenerating || !(editName || '').trim()}
                                        className="px-4 py-2 bg-[#9d4edd]/10 hover:bg-[#9d4edd]/20 border border-[#9d4edd]/50 rounded text-[10px] font-mono text-[#9d4edd] uppercase tracking-wider transition-all flex items-center gap-2 disabled:opacity-50 w-full justify-center"
                                    >
                                        <Sparkles className="w-3 h-3" />
                                        AI Generate
                                    </button>
                                </div>
                            </div>

                            {/* Details Form */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block mb-2">Designation (Display Name)</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="w-full bg-[#050505] border border-[#333] p-3 pl-10 text-white font-mono text-sm focus:border-[#9d4edd] outline-none rounded-lg transition-colors"
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
                                                className="w-full bg-[#111] border border-[#222] p-3 text-xs font-mono text-[#22d3ee] font-bold uppercase outline-none appearance-none rounded-lg cursor-pointer hover:border-[#9d4edd] transition-colors"
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
                                            <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">Clearance Level</label>
                                            <span className="text-[10px] font-mono text-[#42be65] font-bold">Lvl {editClearance}</span>
                                        </div>
                                        <div className="h-10 bg-[#111] border border-[#222] rounded-lg p-2 flex items-center gap-1">
                                            {[1,2,3,4,5].map(l => (
                                                <button
                                                    key={l}
                                                    onClick={() => setEditClearance(l)}
                                                    className={`h-full flex-1 rounded transition-all ${l <= editClearance ? 'bg-[#42be65] shadow-[0_0_5px_#42be65]' : 'bg-[#333] hover:bg-[#444]'}`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Theme Selector */}
                            <div>
                                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block mb-2">Visual Interface Theme</label>
                                <div className="flex gap-4">
                                    <ThemeButton mode={AppTheme.DARK} icon={Moon} label="Dark Mode" />
                                    <ThemeButton mode={AppTheme.LIGHT} icon={Sun} label="Light Mode" />
                                    <ThemeButton mode={AppTheme.CONTRAST} icon={Contrast} label="High Contrast" />
                                </div>
                            </div>

                            <button 
                                onClick={handleSave}
                                disabled={isSaving || !(editName || '').trim()}
                                className="w-full py-4 bg-[#9d4edd] hover:bg-[#b06bf7] text-black font-bold font-mono text-xs uppercase tracking-[0.2em] rounded-lg transition-all shadow-[0_0_20px_rgba(157,78,221,0.4)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4" />}
                                {isSaving ? 'ENCODING...' : 'SAVE IDENTITY'}
                            </button>

                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default UserProfileOverlay;