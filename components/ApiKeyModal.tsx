/**
 * API KEY MODAL
 * UI for managing API keys with encryption vault and master password.
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, Check, Loader2, AlertTriangle, Eye, EyeOff, Lock, Shield, Unlock } from 'lucide-react';
import { apiKeyService } from '../services/apiKeyService';
import { audio } from '../services/audioService';

interface ApiKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type ModalView = 'create-vault' | 'unlock-vault' | 'manage-keys';

const PROVIDERS = [
    { id: 'gemini' as const, name: 'Gemini', color: '#4285F4', description: 'Google AI - Required for core features' },
    { id: 'claude' as const, name: 'Claude', color: '#cc785c', description: 'Anthropic - Advanced reasoning' },
    { id: 'openai' as const, name: 'OpenAI', color: '#10a37f', description: 'GPT models - Coming soon' },
    { id: 'grok' as const, name: 'Grok', color: '#1DA1F2', description: 'xAI - Coming soon' },
    { id: 'eleven_labs' as const, name: 'ElevenLabs', color: '#1f2937', description: 'Neural Voice Synthesis (Creator)' },
    { id: 'deepgram' as const, name: 'Deepgram', color: '#13EF93', description: 'Streaming STT (Nova-3)' },
];

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
    const [view, setView] = useState<ModalView>('create-vault');
    const [masterPassword, setMasterPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const [activeProvider, setActiveProvider] = useState<'gemini' | 'claude' | 'openai' | 'grok' | 'eleven_labs' | 'deepgram'>('gemini');
    const [inputValue, setInputValue] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [validationResult, setValidationResult] = useState<{ valid: boolean; error?: string } | null>(null);
    const [keyStatus, setKeyStatus] = useState(apiKeyService.getKeyStatus());

    // Determine initial view based on vault status
    useEffect(() => {
        if (isOpen) {
            if (apiKeyService.isVaultUnlocked()) {
                setView('manage-keys');
            } else if (apiKeyService.hasVault()) {
                setView('unlock-vault');
            } else {
                setView('create-vault');
            }
            setMasterPassword('');
            setConfirmPassword('');
            setPasswordError('');
        }
    }, [isOpen]);

    useEffect(() => {
        const unsubscribe = apiKeyService.subscribe(() => {
            setKeyStatus(apiKeyService.getKeyStatus());
            if (apiKeyService.isVaultUnlocked()) {
                setView('manage-keys');
            }
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        if (view === 'manage-keys') {
            const currentKey = apiKeyService.getKey(activeProvider);
            setInputValue(currentKey || '');
            setValidationResult(null);
        }
    }, [activeProvider, view]);

    const handleCreateVault = async () => {
        if (masterPassword.length < 8) {
            setPasswordError('Password must be at least 8 characters');
            return;
        }
        if (masterPassword !== confirmPassword) {
            setPasswordError('Passwords do not match');
            return;
        }

        setIsProcessing(true);
        setPasswordError('');

        const success = await apiKeyService.createVault(masterPassword);
        if (success) {
            audio.playSuccess();
            setView('manage-keys');
        } else {
            setPasswordError('Failed to create vault');
            audio.playError();
        }

        setIsProcessing(false);
    };

    const handleUnlockVault = async () => {
        if (!masterPassword) {
            setPasswordError('Please enter your master password');
            return;
        }

        setIsProcessing(true);
        setPasswordError('');

        const success = await apiKeyService.unlockVault(masterPassword);
        if (success) {
            audio.playSuccess();
            setView('manage-keys');
        } else {
            setPasswordError('Invalid master password');
            audio.playError();
        }

        setIsProcessing(false);
    };

    const handleSave = async () => {
        if (!inputValue.trim()) return;

        setIsValidating(true);
        setValidationResult(null);

        let result: { valid: boolean; error?: string } | null = null;

        // Validate based on provider
        if (activeProvider === 'gemini') {
            result = await apiKeyService.validateGeminiKey(inputValue);
        } else if (activeProvider === 'eleven_labs') {
            result = await apiKeyService.validateElevenLabsKey(inputValue);
        } else if (activeProvider === 'deepgram') {
            result = await apiKeyService.validateDeepgramKey(inputValue);
        } else if (activeProvider === 'openai') {
            result = await apiKeyService.validateOpenAIKey(inputValue);
        }

        if (result) {
            setValidationResult(result);
            if (result.valid) {
                await apiKeyService.setKey(activeProvider, inputValue);
                window.dispatchEvent(new CustomEvent('api-key-saved'));
                audio.playSuccess();
            } else {
                audio.playError();
            }
        } else {
            // No validation available - just save
            await apiKeyService.setKey(activeProvider, inputValue);
            setValidationResult({ valid: true });
            window.dispatchEvent(new CustomEvent('api-key-saved'));
            audio.playSuccess();
        }

        setIsValidating(false);
    };

    const handleRemove = async () => {
        await apiKeyService.removeKey(activeProvider);
        setInputValue('');
        setValidationResult(null);
        audio.playClick();
    };

    const handleLock = () => {
        apiKeyService.lockVault();
        setView('unlock-vault');
        setMasterPassword('');
        audio.playClick();
    };

    const handleResetVault = () => {
        if (confirm('⚠️ This will permanently delete all stored API keys. Are you sure?')) {
            apiKeyService.resetVault();
            setView('create-vault');
            setMasterPassword('');
            setConfirmPassword('');
            audio.playClick();
        }
    };

    const activeProviderInfo = keyStatus.find(k => k.provider === activeProvider);

    const renderVaultSetup = () => (
        <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-[var(--amethyst)]/20 rounded-2xl">
                    <Shield size={24} className="text-[var(--amethyst)]" />
                </div>
                <div>
                    <h3 className="text-sm font-black text-white uppercase">Create Secure Vault</h3>
                    <p className="text-[9px] text-gray-500">Your API keys will be encrypted with AES-256</p>
                </div>
            </div>

            <div className="bg-[#10b981]/10 border border-[#10b981]/20 rounded-xl p-3 text-[10px] text-[#10b981]">
                <strong>🔐 Military-grade encryption:</strong> Your keys are encrypted using AES-GCM with PBKDF2 key derivation (100,000 iterations). Even if someone accesses your browser storage, they cannot read your API keys without the master password.
            </div>

            <div className="space-y-3">
                <div className="relative">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={masterPassword}
                        onChange={(e) => {
                            setMasterPassword(e.target.value);
                            setPasswordError('');
                        }}
                        placeholder="Create master password (min 8 chars)"
                        className="w-full px-4 py-3 pr-12 bg-black/60 border border-white/10 rounded-xl text-sm font-mono text-white placeholder:text-gray-700 focus:border-[var(--amethyst)]/50 focus:outline-none transition-colors"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-600 hover:text-gray-400"
                    >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>

                <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setPasswordError('');
                    }}
                    placeholder="Confirm master password"
                    className="w-full px-4 py-3 bg-black/60 border border-white/10 rounded-xl text-sm font-mono text-white placeholder:text-gray-700 focus:border-[var(--amethyst)]/50 focus:outline-none transition-colors"
                />
            </div>

            {passwordError && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-[10px]"
                >
                    <AlertTriangle size={14} /> {passwordError}
                </motion.div>
            )}

            <div className="flex gap-3 pt-2">
                <button
                    onClick={onClose}
                    className="flex-1 py-3 bg-white/5 rounded-xl text-[10px] font-black uppercase text-gray-400 hover:bg-white/10 transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleCreateVault}
                    disabled={!masterPassword || !confirmPassword || isProcessing}
                    className="flex-1 py-3 bg-[var(--amethyst)] rounded-xl text-[10px] font-black uppercase text-black hover:bg-[var(--amethyst)]/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isProcessing ? (
                        <><Loader2 size={14} className="animate-spin" /> Creating...</>
                    ) : (
                        <><Lock size={14} /> Create Vault</>
                    )}
                </button>
            </div>
        </div>
    );

    const renderVaultUnlock = () => (
        <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-amber-500/20 rounded-2xl">
                    <Lock size={24} className="text-amber-500" />
                </div>
                <div>
                    <h3 className="text-sm font-black text-white uppercase">Unlock Vault</h3>
                    <p className="text-[9px] text-gray-500">Enter your master password to access keys</p>
                </div>
            </div>

            <div className="relative">
                <input
                    type={showPassword ? 'text' : 'password'}
                    value={masterPassword}
                    onChange={(e) => {
                        setMasterPassword(e.target.value);
                        setPasswordError('');
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleUnlockVault()}
                    placeholder="Enter master password"
                    className="w-full px-4 py-3 pr-12 bg-black/60 border border-white/10 rounded-xl text-sm font-mono text-white placeholder:text-gray-700 focus:border-amber-500/50 focus:outline-none transition-colors"
                    autoFocus
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-600 hover:text-gray-400"
                >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>

            {passwordError && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-[10px]"
                >
                    <AlertTriangle size={14} /> {passwordError}
                </motion.div>
            )}

            <div className="flex gap-3 pt-2">
                <button
                    onClick={onClose}
                    className="flex-1 py-3 bg-white/5 rounded-xl text-[10px] font-black uppercase text-gray-400 hover:bg-white/10 transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleUnlockVault}
                    disabled={!masterPassword || isProcessing}
                    className="flex-1 py-3 bg-amber-500 rounded-xl text-[10px] font-black uppercase text-black hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isProcessing ? (
                        <><Loader2 size={14} className="animate-spin" /> Unlocking...</>
                    ) : (
                        <><Unlock size={14} /> Unlock</>
                    )}
                </button>
            </div>

            <div className="text-center pt-2">
                <button
                    onClick={handleResetVault}
                    className="text-[9px] text-red-400/60 hover:text-red-400 transition-colors"
                >
                    Forgot password? Reset vault
                </button>
            </div>
        </div>
    );

    const renderKeyManagement = () => (
        <>
            {/* Provider Tabs */}
            <div className="flex gap-2 px-6 py-3 border-b border-white/5 bg-black/40">
                {PROVIDERS.map(provider => {
                    const status = keyStatus.find(k => k.provider === provider.id);
                    return (
                        <button
                            key={provider.id}
                            onClick={() => setActiveProvider(provider.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeProvider === provider.id
                                ? 'bg-white/10 text-white border border-white/20'
                                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                }`}
                        >
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: status?.configured ? '#10b981' : '#6b7280' }}
                            />
                            {provider.name}
                        </button>
                    );
                })}
                <button
                    onClick={handleLock}
                    className="ml-auto flex items-center gap-1 px-3 py-2 rounded-xl text-[9px] font-bold uppercase text-amber-500/60 hover:text-amber-500 hover:bg-amber-500/10 transition-all"
                    title="Lock vault"
                >
                    <Lock size={12} /> Lock
                </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-[10px] text-gray-400 mb-4">
                    <Shield size={12} className="text-[#10b981]" />
                    <span className="text-[#10b981]">Vault unlocked</span>
                    <span className="text-gray-600">•</span>
                    {PROVIDERS.find(p => p.id === activeProvider)?.description}
                </div>

                {/* Key Input */}
                <div className="relative">
                    <input
                        type={showKey ? 'text' : 'password'}
                        value={inputValue}
                        onChange={(e) => {
                            setInputValue(e.target.value);
                            setValidationResult(null);
                        }}
                        placeholder={`Enter ${activeProvider.toUpperCase()} API Key`}
                        className="w-full px-4 py-3 pr-12 bg-black/60 border border-white/10 rounded-xl text-sm font-mono text-white placeholder:text-gray-700 focus:border-[var(--amethyst)]/50 focus:outline-none transition-colors"
                    />
                    <button
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-600 hover:text-gray-400"
                    >
                        {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>

                {/* Validation Result */}
                {validationResult && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg ${validationResult.valid
                            ? 'bg-[#10b981]/20 text-[#10b981]'
                            : 'bg-red-500/20 text-red-400'
                            }`}
                    >
                        {validationResult.valid ? (
                            <><Check size={14} /> Key validated & encrypted successfully</>
                        ) : (
                            <><AlertTriangle size={14} /> {validationResult.error}</>
                        )}
                    </motion.div>
                )}

                {/* Current Key Status */}
                {activeProviderInfo?.configured && (
                    <div className="flex items-center justify-between px-4 py-2 bg-white/5 rounded-lg">
                        <span className="text-[10px] text-gray-400 font-mono">
                            Current: {activeProviderInfo.masked}
                        </span>
                        <button
                            onClick={handleRemove}
                            className="text-[9px] text-red-400 hover:text-red-300 uppercase font-bold"
                        >
                            Remove
                        </button>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-white/5 rounded-xl text-[10px] font-black uppercase text-gray-400 hover:bg-white/10 transition-colors"
                    >
                        Done
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!inputValue.trim() || isValidating}
                        className="flex-1 py-3 bg-[var(--amethyst)] rounded-xl text-[10px] font-black uppercase text-black hover:bg-[var(--amethyst)]/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isValidating ? (
                            <><Loader2 size={14} className="animate-spin" /> Validating...</>
                        ) : (
                            'Save Key'
                        )}
                    </button>
                </div>

                {/* Help Links */}
                <div className="text-center pt-2">
                    {activeProvider === 'gemini' && (
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[9px] text-[var(--amethyst)] hover:underline">
                            Get a Gemini API key from Google AI Studio →
                        </a>
                    )}
                    {activeProvider === 'claude' && (
                        <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-[9px] text-[var(--amethyst)] hover:underline">
                            Get a Claude API key from Anthropic Console →
                        </a>
                    )}
                    {activeProvider === 'openai' && (
                        <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-[9px] text-[var(--amethyst)] hover:underline">
                            Get an OpenAI API key from OpenAI Platform →
                        </a>
                    )}
                    {activeProvider === 'grok' && (
                        <a href="https://console.x.ai/" target="_blank" rel="noopener noreferrer" className="text-[9px] text-[var(--amethyst)] hover:underline">
                            Get a Grok API key from xAI Console →
                        </a>
                    )}
                    {activeProvider === 'eleven_labs' && (
                        <a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" rel="noopener noreferrer" className="text-[9px] text-[var(--amethyst)] hover:underline">
                            Get an ElevenLabs API key from your profile →
                        </a>
                    )}
                    {activeProvider === 'deepgram' && (
                        <a href="https://console.deepgram.com/project" target="_blank" rel="noopener noreferrer" className="text-[9px] text-[var(--amethyst)] hover:underline">
                            Get a Deepgram API key from Deepgram Console →
                        </a>
                    )}
                </div>
            </div>
        </>
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-xl"
                    onClick={(e) => e.target === e.currentTarget && onClose()}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="w-[500px] bg-[#0a0a0c] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[var(--amethyst)]/20 rounded-xl">
                                    <Key size={18} className="text-[var(--amethyst)]" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black text-white uppercase tracking-wider">
                                        {view === 'create-vault' && 'Secure Vault Setup'}
                                        {view === 'unlock-vault' && 'Vault Locked'}
                                        {view === 'manage-keys' && 'API Configuration'}
                                    </h2>
                                    <p className="text-[9px] text-gray-500 font-mono uppercase">
                                        {view === 'create-vault' && 'One-time setup'}
                                        {view === 'unlock-vault' && 'Authentication required'}
                                        {view === 'manage-keys' && 'Encrypted storage'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                                <X size={16} className="text-gray-500" />
                            </button>
                        </div>

                        {/* Dynamic Content */}
                        {view === 'create-vault' && renderVaultSetup()}
                        {view === 'unlock-vault' && renderVaultUnlock()}
                        {view === 'manage-keys' && renderKeyManagement()}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ApiKeyModal;
