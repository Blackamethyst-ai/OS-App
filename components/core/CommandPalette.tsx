import { apiKeyService } from '../../services/apiKeyService';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../../store';
import { useSystemMind } from '../../stores/useSystemMind';
import { interpretIntent, predictNextActions, promptSelectKey } from '../../services/geminiService';
import { executeCapability } from '../../services/capabilities';
import { AppMode, SuggestedAction, AppTheme } from '../../types';
import { Command, Loader2, X, Sparkles, ChevronRight, Code, Cpu, Mic, Zap, Image, BookOpen, Layers, Terminal, Activity, Search, Shield, BrainCircuit, Split, Palette, History, User, HardDrive, Settings, FlaskConical, Target, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSemanticSearch } from '@antigravity/agent-core-sdk';

const MotionDiv = motion.div as any;

const CommandPalette: React.FC = () => {
    const {
        isCommandPaletteOpen,
        mode,
        system,
        user,
        actions
    } = useAppStore();

    const {
        toggleCommandPalette,
        setMode,
        setProcessState,
        setImageGenState,
        setCodeStudioState,
        setHardwareState,
        setVoiceState,
        setBibliomorphicState,
        setTheme,
        addResearchTask,
        setFocusedSelector,
        addLog
    } = actions;

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isPredicting, setIsPredicting] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [aiSuggestions, setAiSuggestions] = useState<SuggestedAction[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    // Knowledge search mode: triggers when input starts with ? or "know"
    const isKnowledgeMode = input.startsWith('?') || input.toLowerCase().startsWith('know ');
    const knowledgeQuery = isKnowledgeMode
        ? input.replace(/^\?/, '').replace(/^know\s+/i, '').trim()
        : '';

    const { results: knowledgeResults, isLoading: isSearching } = useSemanticSearch({
        query: knowledgeQuery,
        limit: 6,
        debounceMs: 300,
    });

    const staticSuggestions = useMemo(() => {
        const base = [
            { id: 'nav-dashboard', label: 'Navigate: Dashboard', command: 'Navigate to Dashboard', icon: Layers },
            { id: 'nav-hw', label: 'Navigate: Hardware Core', command: 'Navigate to Hardware', icon: Cpu },
            { id: 'nav-voice', label: 'Initialize Voice Core', command: 'Open Voice Mode', icon: Mic },
            { id: 'nav-bicameral', label: 'Engage Swarm Intelligence', command: 'Open Bicameral Engine', icon: Split },
            { id: 'theme-midnight', label: 'UI Skin: Midnight Blue', command: 'Switch to Midnight Theme', icon: Palette },
            { id: 'theme-amber', label: 'UI Skin: Amber Terminal', command: 'Switch to Amber Theme', icon: Palette },
        ];

        switch (mode) {
            case AppMode.CODE_STUDIO:
                return [
                    { id: 'code-gen', label: 'Generate React Hook', command: 'Write a custom React state hook', icon: Code },
                    { id: 'code-api', label: 'Create FastAPI Endpoint', command: 'Write a Python FastAPI router', icon: Terminal },
                    ...base
                ];
            case AppMode.IMAGE_GEN:
                return [
                    { id: 'img-4k', label: 'Set Resolution to 4K', command: 'Set image resolution to 4K', icon: Image },
                    { id: 'img-cyber', label: 'Generate Neo-Tokyo', command: 'Generate a futuristic cityscape with rain', icon: Sparkles },
                    ...base
                ];
            case AppMode.BIBLIOMORPHIC:
                return [
                    { id: 'biblio-hyp', label: 'Generate Hypotheses', command: 'Generate new hypotheses from research', icon: FlaskConical },
                    ...base
                ];
            default:
                return [
                    { id: 'gen-code', label: 'Open Studio', command: 'Open Code Studio', icon: Code },
                    { id: 'analyze-pwr', label: 'Analyze System Power', command: 'Analyze power systems', icon: Activity },
                    ...base
                ];
        }
    }, [mode]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isInput = target.matches('input, textarea, [contenteditable]');

            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                toggleCommandPalette();
            }

            if (e.key === '/' && !isInput && !isCommandPaletteOpen) {
                e.preventDefault();
                toggleCommandPalette(true);
            }

            if (e.key === 'Escape' && isCommandPaletteOpen) {
                e.preventDefault();
                toggleCommandPalette(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isCommandPaletteOpen, toggleCommandPalette]);

    // SYNCHRONIZED CLOCK: Register CommandPalette shortcuts as voice-accessible actions
    useEffect(() => {
        const systemMind = useSystemMind.getState();

        // Register command palette actions with SystemMind
        systemMind.registerActions([
            {
                id: 'cmd_toggle_palette',
                description: '[Keyboard] Toggle command palette (Cmd/Ctrl+K)',
                callback: async () => {
                    toggleCommandPalette();
                    return { success: true };
                },
                sectors: [],  // Global
                priority: 60
            },
            {
                id: 'cmd_open_palette',
                description: '[Keyboard] Open command palette',
                callback: async () => {
                    toggleCommandPalette(true);
                    return { success: true };
                },
                sectors: [],
                priority: 60
            },
            {
                id: 'cmd_close_palette',
                description: '[Keyboard] Close command palette',
                callback: async () => {
                    toggleCommandPalette(false);
                    return { success: true };
                },
                sectors: [],
                priority: 55
            },
            {
                id: 'cmd_theme_midnight',
                description: '[Theme] Switch to Midnight Core theme',
                callback: async () => {
                    setTheme(AppTheme.MIDNIGHT);
                    return { success: true, theme: 'MIDNIGHT' };
                },
                sectors: [],
                priority: 50
            },
            {
                id: 'cmd_theme_amber',
                description: '[Theme] Switch to Amber Protocol theme',
                callback: async () => {
                    setTheme(AppTheme.AMBER);
                    return { success: true, theme: 'AMBER' };
                },
                sectors: [],
                priority: 50
            },
            {
                id: 'cmd_theme_dark',
                description: '[Theme] Switch to Dark Mode theme',
                callback: async () => {
                    setTheme(AppTheme.DARK);
                    return { success: true, theme: 'DARK' };
                },
                sectors: [],
                priority: 50
            },
            {
                id: 'cmd_theme_neon',
                description: '[Theme] Switch to Neon Cyber theme',
                callback: async () => {
                    setTheme(AppTheme.NEON_CYBER);
                    return { success: true, theme: 'NEON_CYBER' };
                },
                sectors: [],
                priority: 50
            }
        ]);
    }, [toggleCommandPalette, setTheme]);

    useEffect(() => {
        if (isCommandPaletteOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
            setInput('');
            setResult(null);
            setAiSuggestions([]);

            const fetchSuggestions = async () => {
                setIsPredicting(true);
                try {
                    const hasKey = apiKeyService.hasGeminiKey();
                    if (hasKey) {
                        const lastLog = system.logs.length > 0 ? system.logs[system.logs.length - 1].message : undefined;
                        const suggestions = await predictNextActions(mode, {}, lastLog);
                        setAiSuggestions(suggestions);
                    }
                } catch (e) { addLog('ERROR', `AI Prediction Failed: ${e}`); }
                finally { setIsPredicting(false); }
            };
            fetchSuggestions();
        }
    }, [isCommandPaletteOpen, mode, system.logs, addLog]);

    const executeCommand = async () => {
        if (!input.trim()) return;
        setIsLoading(true);
        setResult(null);

        const lowInput = input.toLowerCase();

        // SYNCHRONIZED CLOCK: Notify SystemMind of command execution
        // This ensures voice context knows when keyboard commands are used
        try {
            const systemMind = useSystemMind.getState();
            systemMind.uplinkData('command_executed', {
                command: input,
                timestamp: Date.now(),
                source: 'command_palette'
            });
        } catch (e) {
            // SystemMind may not be initialized
        }

        if (lowInput.startsWith("focus ") || lowInput.startsWith("target ")) {
            const selector = input.split(' ').slice(1).join(' ');
            if (selector) {
                setFocusedSelector(selector);
                setResult(`Targeting element: ${selector}`);
                setTimeout(() => toggleCommandPalette(false), 800);
                setIsLoading(false);
                return;
            }
        }

        if (lowInput.includes('theme') || lowInput.includes('switch to')) {
            let theme: AppTheme | null = null;
            let msg = '';
            if (lowInput.includes('midnight')) { theme = AppTheme.MIDNIGHT; msg = 'Midnight Core Enabled'; }
            else if (lowInput.includes('amber')) { theme = AppTheme.AMBER; msg = 'Amber Protocol Engaged'; }
            else if (lowInput.includes('dark')) { theme = AppTheme.DARK; msg = 'Dark Mode Restored'; }
            else if (lowInput.includes('light')) { theme = AppTheme.LIGHT; msg = 'High Clarity Skin Active'; }
            else if (lowInput.includes('neon')) { theme = AppTheme.NEON_CYBER; msg = 'Neon Entropy Initialized'; }

            if (theme && msg) {
                // Use capabilities registry for theme switching (US-005)
                await executeCapability('ui_toggle_theme', { theme });
                setResult(msg);
                setTimeout(() => toggleCommandPalette(false), 800);
                setIsLoading(false);
                return;
            }
        }

        try {
            const hasKey = apiKeyService.hasGeminiKey();
            if (!hasKey) { await promptSelectKey(); setIsLoading(false); return; }

            if (lowInput.startsWith("research")) {
                const query = input.replace(/^research\s+/i, '').trim();
                if (query) {
                    addResearchTask({ id: crypto.randomUUID(), query, status: 'QUEUED', progress: 0, logs: ['Dispatched via Command Palette'], timestamp: Date.now() });
                    setResult(`Agent Dispatched: Researching "${query}"...`);
                    setTimeout(() => toggleCommandPalette(false), 1200);
                    setIsLoading(false);
                    return;
                }
            }

            // Fixed: Typed intent result from interpretIntent to resolve unknown property access
            const intent = await interpretIntent(input) as { action: string, target?: string, parameters?: any, reasoning: string };

            switch (intent.action) {
                case 'NAVIGATE':
                    if (intent.target) {
                        const targetMode = AppMode[intent.target as keyof typeof AppMode];
                        if (targetMode) {
                            if (targetMode === AppMode.BICAMERAL) {
                                setMode(AppMode.BIBLIOMORPHIC);
                                setBibliomorphicState({ activeTab: 'bicameral' });
                            } else {
                                setMode(targetMode);
                            }
                            setResult(`Redirecting to ${intent.target} Sector...`);
                            setTimeout(() => toggleCommandPalette(false), 800);
                        }
                    }
                    break;
                case 'FOCUS_ELEMENT':
                    // Fixed: Safely accessed parameters through explicit typing
                    if (intent.parameters?.selector) {
                        setFocusedSelector(intent.parameters.selector);
                        setResult(`Focusing UI context: ${intent.parameters.selector}`);
                        setTimeout(() => toggleCommandPalette(false), 800);
                    }
                    break;
                default:
                    setResult(`Protocol Executed: ${intent.action}`);
                    if (intent.reasoning) addLog('INFO', `COMMAND_LOG: ${intent.reasoning}`);
                    setTimeout(() => toggleCommandPalette(false), 1500);
            }

        } catch (err) {
            addLog('ERROR', `Command interpretation failure: ${err}`);
            setResult("Command interpretation failure.");
        } finally {
            setIsLoading(false);
        }
    };

    const getIcon = (name: string) => {
        switch (name) {
            case 'Zap': return Zap;
            case 'Code': return Code;
            case 'Search': return Search;
            case 'Cpu': return Cpu;
            case 'Image': return Image;
            case 'BookOpen': return BookOpen;
            case 'Shield': return Shield;
            case 'Terminal': return Terminal;
            case 'Palette': return Palette;
            case 'Target': return Target;
            default: return Sparkles;
        }
    };

    return (
        <AnimatePresence>
            {isCommandPaletteOpen && (
                <div className="fixed inset-0 z-[600] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-md" onClick={() => toggleCommandPalette(false)}>
                    <MotionDiv
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                        onClick={(e: any) => e.stopPropagation()}
                        className="w-full max-w-2xl crystalline border border-[var(--border-main)] rounded-[2rem] shadow-[0_60px_150px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col shimmer-edge"
                    >
                        <div className="flex items-center px-8 py-6 border-b border-white/10 bg-white/[0.03]">
                            <Command className="w-6 h-6 text-[#9d4edd] mr-5 animate-pulse" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && executeCommand()}
                                placeholder="Initialize global directive..."
                                className="flex-1 bg-transparent border-none outline-none text-white font-mono text-base placeholder:text-gray-600 uppercase tracking-widest"
                                autoComplete="off"
                            />
                            {isLoading && <Loader2 size={5} className="w-5 h-5 text-[#9d4edd] animate-spin ml-4" />}
                            <button onClick={() => toggleCommandPalette(false)} className="ml-5 p-2 text-gray-500 hover:text-white transition-colors glass-action rounded-xl"><X className="w-5 h-5" /></button>
                        </div>

                        {/* Knowledge Search Results */}
                        {isKnowledgeMode && knowledgeQuery.length > 1 && (
                            <div className="flex flex-col border-b border-white/10">
                                <div className="px-8 py-3 text-[9px] text-[#18E6FF] font-black font-mono uppercase tracking-[0.4em] flex items-center justify-between bg-[#18E6FF]/5 border-b border-white/10">
                                    <span className="flex items-center gap-3"><Database className="w-4 h-4" /> Knowledge_Base_Search</span>
                                    {isSearching && <Loader2 size={3.5} className="w-3.5 h-3.5 animate-spin" />}
                                </div>
                                <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                                    {knowledgeResults.length > 0 ? (
                                        knowledgeResults.map((r, i) => (
                                            <div key={i} className="px-8 py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors">
                                                <div className="text-[11px] text-white font-mono leading-relaxed mb-2">
                                                    {r.content.slice(0, 200)}{r.content.length > 200 ? '...' : ''}
                                                </div>
                                                <div className="flex items-center gap-4 text-[9px] font-mono">
                                                    <span className="px-2 py-0.5 bg-[#9d4edd]/20 text-[#9d4edd] rounded uppercase">{r.category}</span>
                                                    <span className="text-gray-500">{Math.round(r.similarity * 100)}% match</span>
                                                    {r.tags?.length > 0 && (
                                                        <span className="text-gray-600">{r.tags.slice(0, 3).join(', ')}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : !isSearching ? (
                                        <div className="px-8 py-6 text-gray-500 text-[11px] font-mono text-center">
                                            No results found for "{knowledgeQuery}"
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        )}

                        {!input && !isLoading && !result && (
                            <div className="flex flex-col">
                                {(aiSuggestions.length > 0 || isPredicting) && (
                                    <div className="bg-black/20">
                                        <div className="px-8 py-3 text-[9px] text-[#9d4edd] font-black font-mono uppercase tracking-[0.4em] flex items-center justify-between border-b border-white/10 bg-white/[0.05]">
                                            <span className="flex items-center gap-3"><BrainCircuit className="w-4 h-4" /> Predicted_Contextual_Signals</span>
                                            {isPredicting && <Loader2 size={3.5} className="w-3.5 h-3.5 animate-spin" />}
                                        </div>

                                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                            {aiSuggestions.map((s) => {
                                                const Icon = getIcon(s.iconName);
                                                return (
                                                    <button key={s.id} onClick={() => { setInput(s.command); inputRef.current?.focus(); }} className="w-full flex items-center px-8 py-5 hover:bg-white/[0.08] text-gray-400 hover:text-white transition-all group border-b border-white/5 last:border-0">
                                                        <div className="w-10 h-10 flex items-center justify-center rounded-2xl glass-action text-gray-500 border-white/10 mr-5 transition-all group-hover:bg-[#9d4edd] group-hover:text-black group-hover:border-[#9d4edd] shadow-lg"><Icon className="w-5 h-5" /></div>
                                                        <div className="flex-1 text-left min-w-0">
                                                            <div className="text-[11px] font-black font-mono group-hover:text-white uppercase tracking-wider">{s.label}</div>
                                                            <div className="text-[9px] text-gray-600 font-mono truncate lowercase opacity-60 mt-0.5">protocol.exec::{s.reasoning}</div>
                                                        </div>
                                                        <span className="text-[9px] font-mono text-[#9d4edd] opacity-0 group-hover:opacity-100 transition-all flex items-center gap-2 uppercase tracking-widest font-black">Invoke <ChevronRight className="w-3 h-3" /></span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="border-t border-white/10">
                                    <div className="px-8 py-3 text-[9px] text-gray-500 font-black font-mono uppercase tracking-[0.4em] bg-white/[0.03]">Static System Protocols</div>
                                    <div className="grid grid-cols-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                                        {staticSuggestions.map((s) => (
                                            <button key={s.id} onClick={() => { setInput(s.command); inputRef.current?.focus(); }} className="flex items-center px-8 py-4 hover:bg-white/[0.05] text-gray-500 hover:text-white transition-all group border-b border-r border-white/5">
                                                <div className="w-8 h-8 flex items-center justify-center rounded-xl glass-action text-gray-600 group-hover:text-[#9d4edd] mr-4 transition-all border-white/10 group-hover:border-[#9d4edd]/40"><s.icon size={14} /></div>
                                                <span className="text-[10px] font-mono font-black uppercase tracking-widest flex-1 text-left">{s.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="bg-white/[0.02] p-4 px-8 text-[9px] text-gray-600 font-black font-mono border-t border-white/10 flex justify-between items-center">
                            <div className="flex items-center gap-8">
                                <span className="flex items-center gap-2 group cursor-help hover:text-[#18E6FF] transition-colors" title="Type ? to search knowledge"><Database size={12} /> ?KNOW</span>
                                <span className="flex items-center gap-2 group cursor-help hover:text-white transition-colors"><History size={12} /> CACHED</span>
                                <span className="flex items-center gap-2 group cursor-help hover:text-white transition-colors"><Palette size={12} /> SKINS</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="px-2 py-1 glass-action rounded-lg uppercase text-[8px] border-white/10">Esc: Sever</span>
                                <span className="px-2 py-1 bg-[#9d4edd]/20 text-[#9d4edd] rounded-lg uppercase text-[8px] border border-[#9d4edd]/30">Enter: Commit</span>
                            </div>
                        </div>

                        {result && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-8 py-5 bg-[#9d4edd]/15 border-t border-[#9d4edd]/40 text-[#9d4edd] text-[11px] font-black font-mono uppercase tracking-widest flex items-center">
                                <Sparkles className="w-5 h-5 mr-4 animate-pulse" />
                                {result}
                            </motion.div>
                        )}
                    </MotionDiv>
                </div>
            )}
        </AnimatePresence>
    );
};

export default CommandPalette;