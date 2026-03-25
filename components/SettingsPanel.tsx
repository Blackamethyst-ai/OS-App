/**
 * SETTINGS PANEL
 * Full settings panel that slides in from the right.
 * Sections: API Keys, Appearance, About.
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Key, Palette, Info, Settings, ExternalLink, Keyboard, Check } from 'lucide-react';
import { apiKeyService } from '../services/apiKeyService';
import { useAppStore } from '../store';
import { AppTheme } from '../types';
import { audio } from '../services/audioService';
import { DEFAULT_NAV_CONFIG } from '../config/navigation';

type SettingsTab = 'api-keys' | 'appearance' | 'about';

const PROVIDER_META: Record<string, { label: string; color: string }> = {
    gemini:      { label: 'Gemini',      color: '#4285F4' },
    claude:      { label: 'Claude',      color: '#cc785c' },
    grok:        { label: 'Grok',        color: '#1DA1F2' },
    eleven_labs: { label: 'ElevenLabs',  color: '#1f2937' },
    deepgram:    { label: 'Deepgram',    color: '#13EF93' },
};

const THEME_OPTIONS: { id: AppTheme; label: string; color: string }[] = [
    { id: AppTheme.DARK,           label: 'Void Core',       color: 'var(--amethyst-soft)' },
    { id: AppTheme.LIGHT,          label: 'High Light',      color: '#0B1020' },
    { id: AppTheme.MIDNIGHT,       label: 'Midnight',        color: 'var(--azure-blue)' },
    { id: AppTheme.AMBER,          label: 'Amber Protocol',  color: 'var(--amber)' },
    { id: AppTheme.SOLARIZED,      label: 'Solarized',       color: '#2aa198' },
    { id: AppTheme.NEON_CYBER,     label: 'Neon Cyber',      color: '#d946ef' },
    { id: AppTheme.CONTRAST,       label: 'High Contrast',   color: '#ffffff' },
    { id: AppTheme.CUSTOM,         label: 'Custom Skin',     color: 'var(--amethyst-soft)' },
];

const KEYBOARD_SHORTCUTS = [
    { keys: '\u2318 1', action: 'Dashboard' },
    { keys: '\u2318 2', action: 'Ecosystem' },
    { keys: '\u2318 3', action: 'Voice Core' },
    { keys: '\u2318 4', action: 'Swarm' },
    { keys: '\u2318 5', action: 'Cinema' },
    { keys: '\u2318 6', action: 'Logic' },
    { keys: '\u2318 7', action: 'Memory' },
    { keys: '\u2318 8', action: 'Hardware' },
    { keys: '\u2318 9', action: 'Treasury' },
    { keys: '\u2318 0', action: 'Archon' },
    { keys: '\u2318 K', action: 'Command Palette' },
    { keys: 'Esc',     action: 'Close overlay' },
];

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenApiKeyModal: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose, onOpenApiKeyModal }) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('api-keys');
    const [keyStatus, setKeyStatus] = useState(apiKeyService.getKeyStatus());
    const theme = useAppStore(s => s.theme);
    const actions = useAppStore(s => s.actions);

    // Subscribe to key status changes
    useEffect(() => {
        const unsubscribe = apiKeyService.subscribe(() => {
            setKeyStatus(apiKeyService.getKeyStatus());
        });
        return unsubscribe;
    }, []);

    // Refresh key status when panel opens
    useEffect(() => {
        if (isOpen) {
            setKeyStatus(apiKeyService.getKeyStatus());
        }
    }, [isOpen]);

    // Escape to close
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
        { id: 'api-keys',   label: 'API Keys',   icon: <Key size={14} /> },
        { id: 'appearance', label: 'Appearance',  icon: <Palette size={14} /> },
        { id: 'about',      label: 'About',       icon: <Info size={14} /> },
    ];

    const handleThemeSelect = (id: AppTheme) => {
        if (typeof actions.setTheme === 'function') {
            actions.setTheme(id);
            audio.playClick();
        }
    };

    // Filter to only the 5 providers we want to display
    const displayProviders = ['gemini', 'claude', 'grok', 'eleven_labs', 'deepgram'];

    const renderApiKeys = () => (
        <div className="space-y-3">
            <div className="px-1 mb-4">
                <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">
                    Provider status overview
                </p>
            </div>

            {displayProviders.map((providerId) => {
                const status = keyStatus.find(k => k.provider === providerId);
                const meta = PROVIDER_META[providerId];
                if (!meta) return null;
                const configured = status?.configured ?? false;
                const masked = status?.masked ?? '';

                return (
                    <div
                        key={providerId}
                        className="flex items-center gap-4 px-4 py-3.5 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-white/10 transition-all group"
                    >
                        {/* Status dot */}
                        <div
                            className="w-2.5 h-2.5 rounded-full shrink-0 transition-all"
                            style={{
                                backgroundColor: configured ? 'var(--plasma-green)' : '#4b5563',
                                boxShadow: configured ? '0 0 8px var(--plasma-green)' : 'none',
                            }}
                        />

                        {/* Provider info */}
                        <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-black font-mono text-white uppercase tracking-wider">
                                {meta.label}
                            </div>
                            <div className="text-[9px] font-mono text-gray-600 truncate">
                                {configured ? masked : 'Not configured'}
                            </div>
                        </div>

                        {/* Edit button */}
                        <button
                            onClick={() => {
                                onOpenApiKeyModal();
                                audio.playClick();
                            }}
                            className="px-3 py-1.5 text-[9px] font-black font-mono uppercase tracking-wider text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[var(--amethyst)]/30 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        >
                            {configured ? 'Edit' : 'Add'}
                        </button>
                    </div>
                );
            })}

            <button
                onClick={() => {
                    onOpenApiKeyModal();
                    audio.playClick();
                }}
                className="w-full mt-4 py-3 bg-[var(--amethyst)]/10 hover:bg-[var(--amethyst)]/20 border border-[var(--amethyst)]/20 hover:border-[var(--amethyst)]/40 rounded-2xl text-[10px] font-black font-mono uppercase tracking-wider text-[var(--amethyst)] transition-all flex items-center justify-center gap-2"
            >
                <Key size={14} />
                Manage All Keys
            </button>
        </div>
    );

    const renderAppearance = () => (
        <div className="space-y-8">
            {/* Theme selector */}
            <div className="space-y-3">
                <div className="px-1">
                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Interface Theme</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {THEME_OPTIONS.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => handleThemeSelect(t.id)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left ${
                                theme === t.id
                                    ? 'bg-white/10 border border-white/20 text-white'
                                    : 'bg-white/[0.02] border border-white/5 text-gray-400 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <div
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: t.color }}
                            />
                            <span className="text-[10px] font-black font-mono uppercase tracking-wider truncate">
                                {t.label}
                            </span>
                            {theme === t.id && (
                                <Check size={12} className="ml-auto text-[var(--amethyst)] shrink-0" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Keyboard shortcuts */}
            <div className="space-y-3">
                <div className="px-1">
                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest flex items-center gap-2">
                        <Keyboard size={12} />
                        Keyboard Shortcuts
                    </p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
                    {KEYBOARD_SHORTCUTS.map((shortcut, i) => (
                        <div
                            key={i}
                            className={`flex items-center justify-between px-4 py-2.5 ${
                                i < KEYBOARD_SHORTCUTS.length - 1 ? 'border-b border-white/[0.03]' : ''
                            }`}
                        >
                            <span className="text-[10px] font-mono text-gray-400">{shortcut.action}</span>
                            <kbd className="px-2.5 py-1 bg-black/60 border border-white/10 rounded-lg text-[9px] font-mono font-bold text-gray-300 tracking-wider">
                                {shortcut.keys}
                            </kbd>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderAbout = () => (
        <div className="space-y-6">
            {/* App identity */}
            <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-[var(--amethyst)]/10 border border-[var(--amethyst)]/20 rounded-3xl flex items-center justify-center">
                    <Settings size={28} className="text-[var(--amethyst)]" />
                </div>
                <h3 className="text-lg font-black text-white uppercase tracking-wider">
                    Metaventions AI
                </h3>
                <p className="text-[10px] font-mono text-gray-500 mt-1">
                    Sovereign Cognitive Operating System
                </p>
            </div>

            {/* Info grid */}
            <div className="space-y-2">
                {[
                    { label: 'Version',  value: '1.0.0' },
                    { label: 'Build',    value: `${DEFAULT_NAV_CONFIG.length} sectors` },
                    { label: 'Engine',   value: 'React 19 + Vite' },
                    { label: 'Runtime',  value: 'Agentic Kernel' },
                ].map((item) => (
                    <div
                        key={item.label}
                        className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border border-white/5 rounded-2xl"
                    >
                        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">{item.label}</span>
                        <span className="text-[11px] font-mono font-bold text-white">{item.value}</span>
                    </div>
                ))}
            </div>

            {/* Link */}
            <a
                href="https://app.metaventionsai.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-[var(--amethyst)]/10 hover:bg-[var(--amethyst)]/20 border border-[var(--amethyst)]/20 hover:border-[var(--amethyst)]/40 rounded-2xl text-[10px] font-black font-mono uppercase tracking-wider text-[var(--amethyst)] transition-all"
            >
                <ExternalLink size={14} />
                app.metaventionsai.com
            </a>

            {/* Footer */}
            <div className="text-center pt-4 border-t border-white/5">
                <p className="text-[8px] font-mono text-gray-700 uppercase tracking-widest">
                    Built with sovereign intent
                </p>
            </div>
        </div>
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[499]"
                        onClick={onClose}
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: 420, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 420, opacity: 0 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                        className="fixed right-0 top-0 bottom-0 z-[500] w-[420px] bg-black/95 backdrop-blur-3xl border-l border-white/10 shadow-2xl flex flex-col"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Settings"
                    >
                        {/* Subtle top gradient line */}
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[var(--amethyst)]/40 to-transparent" />

                        {/* Header */}
                        <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-black/20 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[var(--amethyst)]/15 rounded-xl">
                                    <Settings size={18} className="text-[var(--amethyst)]" />
                                </div>
                                <span className="text-xs font-black font-mono text-white uppercase tracking-[0.2em]">
                                    Settings
                                </span>
                            </div>
                            <button
                                onClick={onClose}
                                aria-label="Close settings"
                                className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Tab buttons */}
                        <div className="flex gap-1 px-4 py-3 border-b border-white/5 bg-black/10">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => { setActiveTab(tab.id); audio.playClick(); }}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black font-mono uppercase tracking-wider transition-all ${
                                        activeTab === tab.id
                                            ? 'bg-white/10 text-white border border-white/15'
                                            : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'
                                    }`}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto no-scrollbar p-6">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    {activeTab === 'api-keys' && renderApiKeys()}
                                    {activeTab === 'appearance' && renderAppearance()}
                                    {activeTab === 'about' && renderAbout()}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Footer */}
                        <div className="h-10 border-t border-white/5 bg-black/40 flex items-center justify-center px-6 shrink-0">
                            <span className="text-[8px] font-mono text-gray-700 uppercase tracking-widest">
                                Settings // Metaventions OS v1.0
                            </span>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default SettingsPanel;
