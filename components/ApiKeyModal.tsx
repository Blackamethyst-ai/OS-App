/**
 * API KEY MODAL
 * UI for managing API keys with validation and provider selection.
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, Check, Loader2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { apiKeyService } from '../services/apiKeyService';
import { audio } from '../services/audioService';

interface ApiKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PROVIDERS = [
    { id: 'gemini' as const, name: 'Gemini', color: '#4285F4', description: 'Google AI - Required for core features' },
    { id: 'claude' as const, name: 'Claude', color: '#cc785c', description: 'Anthropic - Coming soon' },
    { id: 'grok' as const, name: 'Grok', color: '#1DA1F2', description: 'xAI - Coming soon' },
];

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
    const [activeProvider, setActiveProvider] = useState<'gemini' | 'claude' | 'grok'>('gemini');
    const [inputValue, setInputValue] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [validationResult, setValidationResult] = useState<{ valid: boolean; error?: string } | null>(null);
    const [keyStatus, setKeyStatus] = useState(apiKeyService.getKeyStatus());

    useEffect(() => {
        const unsubscribe = apiKeyService.subscribe(() => {
            setKeyStatus(apiKeyService.getKeyStatus());
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        // Reset input when switching providers
        const currentKey = apiKeyService.getKey(activeProvider);
        setInputValue(currentKey || '');
        setValidationResult(null);
    }, [activeProvider]);

    const handleSave = async () => {
        if (!inputValue.trim()) return;

        setIsValidating(true);
        setValidationResult(null);

        if (activeProvider === 'gemini') {
            const result = await apiKeyService.validateGeminiKey(inputValue);
            setValidationResult(result);

            if (result.valid) {
                apiKeyService.setKey(activeProvider, inputValue);
                window.dispatchEvent(new CustomEvent('api-key-saved'));
                audio.playSuccess();
            } else {
                audio.playError();
            }
        } else {
            // For other providers, just save without validation for now
            apiKeyService.setKey(activeProvider, inputValue);
            setValidationResult({ valid: true });
            window.dispatchEvent(new CustomEvent('api-key-saved'));
            audio.playSuccess();
        }

        setIsValidating(false);
    };

    const handleRemove = () => {
        apiKeyService.removeKey(activeProvider);
        setInputValue('');
        setValidationResult(null);
        audio.playClick();
    };

    const activeProviderInfo = keyStatus.find(k => k.provider === activeProvider);

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
                                    <h2 className="text-sm font-black text-white uppercase tracking-wider">API Configuration</h2>
                                    <p className="text-[9px] text-gray-500 font-mono uppercase">Manage provider keys</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                                <X size={16} className="text-gray-500" />
                            </button>
                        </div>

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
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            <div className="text-[10px] text-gray-400 mb-4">
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
                                        <><Check size={14} /> Key validated successfully</>
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
                                    Cancel
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

                            {/* Help Link */}
                            <div className="text-center pt-2">
                                <a
                                    href="https://aistudio.google.com/app/apikey"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[9px] text-[var(--amethyst)] hover:underline"
                                >
                                    Get a Gemini API key from Google AI Studio →
                                </a>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ApiKeyModal;
