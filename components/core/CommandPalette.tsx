import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAppStore } from '../../store';
import { AppMode, AppTheme } from '../../types';
import { audio } from '../../services/audioService';
import {
    Search, X, Command, Layers, Cpu, Mic, Split, Palette,
    Code, Terminal, Activity, Image, BookOpen, Shield, Zap,
    BrainCircuit, Settings, Keyboard, Compass, Database,
    Wallet, FlaskConical, Eye, Sparkles, Target, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const MotionDiv = motion.div as any;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ResultCategory = 'sector' | 'action' | 'shortcut';

interface PaletteItem {
    id: string;
    label: string;
    category: ResultCategory;
    icon: React.FC<{ className?: string; size?: number }>;
    shortcut?: string;
    onSelect: () => void;
}

// ---------------------------------------------------------------------------
// Sector icon mapping
// ---------------------------------------------------------------------------

const SECTOR_META: Record<string, { icon: React.FC<any>; shortcut?: string }> = {
    DASHBOARD:           { icon: Layers,        shortcut: '1' },
    METAVENTIONS_HUB:    { icon: Sparkles,      shortcut: '2' },
    BIBLIOMORPHIC:       { icon: BookOpen,       shortcut: '3' },
    PROCESS_MAP:         { icon: Activity,       shortcut: '4' },
    MEMORY_CORE:         { icon: Database,       shortcut: '5' },
    IMAGE_GEN:           { icon: Image,          shortcut: '6' },
    HARDWARE_ENGINEER:   { icon: Cpu,            shortcut: '7' },
    CODE_STUDIO:         { icon: Code,           shortcut: '8' },
    VOICE_MODE:          { icon: Mic,            shortcut: '9' },
    SYNTHESIS_BRIDGE:    { icon: Zap },
    BICAMERAL:           { icon: Split },
    AGENT_CONTROL:       { icon: BrainCircuit },
    AUTONOMOUS_FINANCE:  { icon: Wallet },
    AGENT_CORE_TEST:     { icon: FlaskConical },
    CPB_TEST:            { icon: Target },
    ARCHON:              { icon: Shield },
    META_LEARNING:       { icon: Eye },
    SOVEREIGN_GALLERY:   { icon: Globe },
    NEXUS:               { icon: Compass },
};

// ---------------------------------------------------------------------------
// Fuzzy match — all chars in query appear in order in target
// Returns matched char indices or null
// ---------------------------------------------------------------------------

function fuzzyMatch(query: string, target: string): number[] | null {
    const q = query.toLowerCase();
    const t = target.toLowerCase();
    const indices: number[] = [];
    let qi = 0;
    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
        if (t[ti] === q[qi]) {
            indices.push(ti);
            qi++;
        }
    }
    return qi === q.length ? indices : null;
}

// ---------------------------------------------------------------------------
// Highlighted label renderer
// ---------------------------------------------------------------------------

const HighlightedLabel: React.FC<{ text: string; indices: number[] }> = ({ text, indices }) => {
    const set = new Set(indices);
    return (
        <span>
            {text.split('').map((ch, i) =>
                set.has(i)
                    ? <span key={i} className="text-[var(--amethyst-soft)]">{ch}</span>
                    : <span key={i}>{ch}</span>
            )}
        </span>
    );
};

// ---------------------------------------------------------------------------
// Human-readable labels for enum keys
// ---------------------------------------------------------------------------

function humanize(key: string): string {
    return key
        .split('_')
        .map(w => w.charAt(0) + w.slice(1).toLowerCase())
        .join(' ');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CommandPalette: React.FC = () => {
    const { isCommandPaletteOpen, theme, isSidebarOpen, actions } = useAppStore();
    const { toggleCommandPalette, setMode, setTheme, setSidebarOpen } = actions;

    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // -----------------------------------------------------------------------
    // Build the full item catalogue
    // -----------------------------------------------------------------------

    const allItems = useMemo<PaletteItem[]>(() => {
        const items: PaletteItem[] = [];

        // Sectors — all 19 AppMode entries
        for (const key of Object.keys(AppMode) as (keyof typeof AppMode)[]) {
            const mode = AppMode[key];
            const meta = SECTOR_META[key] || { icon: Compass };
            items.push({
                id: `sector-${key}`,
                label: humanize(key),
                category: 'sector',
                icon: meta.icon,
                shortcut: meta.shortcut,
                onSelect: () => {
                    setMode(mode);
                    window.location.hash = mode;
                    audio.playTransition();
                    toggleCommandPalette(false);
                },
            });
        }

        // Actions
        const themeValues = Object.values(AppTheme);
        const currentIdx = themeValues.indexOf(theme);
        items.push({
            id: 'action-toggle-theme',
            label: 'Toggle Theme',
            category: 'action',
            icon: Palette,
            shortcut: 'T',
            onSelect: () => {
                const next = themeValues[(currentIdx + 1) % themeValues.length];
                setTheme(next);
                audio.playTransition();
                toggleCommandPalette(false);
            },
        });

        items.push({
            id: 'action-open-settings',
            label: 'Open Settings',
            category: 'action',
            icon: Settings,
            shortcut: ',',
            onSelect: () => {
                window.dispatchEvent(new CustomEvent('toggle-settings-panel'));
                toggleCommandPalette(false);
            },
        });

        items.push({
            id: 'action-toggle-sidebar',
            label: 'Toggle Sidebar',
            category: 'action',
            icon: Layers,
            shortcut: 'B',
            onSelect: () => {
                setSidebarOpen(!isSidebarOpen);
                toggleCommandPalette(false);
            },
        });

        // Shortcuts — reference list
        const shortcuts: { label: string; shortcut: string }[] = [
            { label: 'Command Palette',   shortcut: '\u2318K' },
            { label: 'Quick Search',      shortcut: '/' },
            { label: 'Close / Cancel',    shortcut: 'Esc' },
            { label: 'Navigate Results',  shortcut: '\u2191\u2193' },
            { label: 'Select Result',     shortcut: '\u21B5' },
        ];
        for (const s of shortcuts) {
            items.push({
                id: `shortcut-${s.label}`,
                label: s.label,
                category: 'shortcut',
                icon: Keyboard,
                shortcut: s.shortcut,
                onSelect: () => {},  // informational only
            });
        }

        return items;
    }, [theme, isSidebarOpen, setMode, setTheme, setSidebarOpen, toggleCommandPalette]);

    // -----------------------------------------------------------------------
    // Filtered + scored results (max 10)
    // -----------------------------------------------------------------------

    const filteredResults = useMemo(() => {
        if (!query.trim()) return allItems.slice(0, 10);

        const scored: { item: PaletteItem; indices: number[]; score: number }[] = [];
        for (const item of allItems) {
            const indices = fuzzyMatch(query, item.label);
            if (indices) {
                // Tighter matches (fewer gaps) score higher
                const spread = indices.length > 1 ? indices[indices.length - 1] - indices[0] : 0;
                const score = indices.length * 10 - spread;
                scored.push({ item, indices, score });
            }
        }
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, 10);
    }, [query, allItems]);

    // Wrap results for rendering
    const results = useMemo(() => {
        if (!query.trim()) {
            return allItems.slice(0, 10).map(item => ({ item, indices: [] as number[] }));
        }
        return filteredResults as { item: PaletteItem; indices: number[] }[];
    }, [query, allItems, filteredResults]);

    // -----------------------------------------------------------------------
    // Reset state when palette opens
    // -----------------------------------------------------------------------

    useEffect(() => {
        if (isCommandPaletteOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 30);
        }
    }, [isCommandPaletteOpen]);

    // Reset selected index when results change
    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    // -----------------------------------------------------------------------
    // Global keyboard: Cmd+K to open/close
    // -----------------------------------------------------------------------

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                toggleCommandPalette();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggleCommandPalette]);

    // -----------------------------------------------------------------------
    // Internal keyboard navigation
    // -----------------------------------------------------------------------

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        const count = results.length;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(i => (i + 1) % count);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(i => (i - 1 + count) % count);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (results[selectedIndex]) {
                results[selectedIndex].item.onSelect();
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            toggleCommandPalette(false);
        }
    }, [results, selectedIndex, toggleCommandPalette]);

    // Scroll selected item into view
    useEffect(() => {
        if (!listRef.current) return;
        const el = listRef.current.children[selectedIndex] as HTMLElement | undefined;
        el?.scrollIntoView({ block: 'nearest' });
    }, [selectedIndex]);

    // -----------------------------------------------------------------------
    // Category tag colors
    // -----------------------------------------------------------------------

    const categoryColor: Record<ResultCategory, string> = {
        sector:   'bg-[var(--cyan,#22d3ee)]/20 text-[var(--cyan,#22d3ee)]',
        action:   'bg-emerald-500/20 text-emerald-400',
        shortcut: 'bg-amber-500/20 text-amber-400',
    };

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    return (
        <AnimatePresence>
            {isCommandPaletteOpen && (
                <div
                    className="fixed inset-0 z-[1000] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
                    onClick={() => toggleCommandPalette(false)}
                    role="presentation"
                >
                    <MotionDiv
                        initial={{ opacity: 0, scale: 0.96, y: -16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: -10 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Command Palette"
                        className="w-full max-w-xl crystalline border border-[var(--border-main)] rounded-2xl shadow-[0_40px_120px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col"
                    >
                        {/* Search input */}
                        <div className="flex items-center px-5 py-4 border-b border-white/10 bg-white/[0.03]">
                            <Search className="w-5 h-5 text-[var(--amethyst-soft)] mr-3 shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Search sectors, actions, shortcuts..."
                                aria-label="Command search"
                                className="flex-1 bg-transparent border-none outline-none text-white font-mono text-sm placeholder:text-gray-500"
                                autoComplete="off"
                                spellCheck={false}
                            />
                            <button
                                onClick={() => toggleCommandPalette(false)}
                                aria-label="Close"
                                className="ml-3 p-1.5 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Results list */}
                        <div ref={listRef} className="max-h-[400px] overflow-y-auto custom-scrollbar">
                            {results.length === 0 && (
                                <div className="px-5 py-8 text-center text-gray-500 text-xs font-mono">
                                    No results for "{query}"
                                </div>
                            )}
                            {results.map((r, idx) => {
                                const Icon = r.item.icon;
                                const isActive = idx === selectedIndex;
                                return (
                                    <button
                                        key={r.item.id}
                                        onClick={() => r.item.onSelect()}
                                        onMouseEnter={() => setSelectedIndex(idx)}
                                        className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${
                                            isActive
                                                ? 'bg-white/[0.08] text-white'
                                                : 'text-gray-400 hover:bg-white/[0.05] hover:text-white'
                                        }`}
                                    >
                                        {/* Icon */}
                                        <div className={`w-8 h-8 flex items-center justify-center rounded-lg shrink-0 ${
                                            isActive
                                                ? 'bg-[var(--amethyst-soft)]/20 text-[var(--amethyst-soft)]'
                                                : 'bg-white/5 text-gray-500'
                                        }`}>
                                            <Icon className="w-4 h-4" />
                                        </div>

                                        {/* Label with highlighted chars */}
                                        <span className="flex-1 text-xs font-mono font-semibold truncate">
                                            {r.indices.length > 0
                                                ? <HighlightedLabel text={r.item.label} indices={r.indices} />
                                                : r.item.label
                                            }
                                        </span>

                                        {/* Category tag */}
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider shrink-0 ${categoryColor[r.item.category]}`}>
                                            {r.item.category}
                                        </span>

                                        {/* Shortcut hint */}
                                        {r.item.shortcut && (
                                            <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] font-mono text-gray-500 shrink-0">
                                                {r.item.shortcut}
                                            </kbd>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-2.5 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-[9px] font-mono text-gray-600">
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-white/5 rounded text-[8px]">&uarr;&darr;</kbd> Navigate</span>
                                <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-white/5 rounded text-[8px]">&crarr;</kbd> Select</span>
                                <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-white/5 rounded text-[8px]">Esc</kbd> Close</span>
                            </div>
                            <span className="text-gray-700">{results.length} result{results.length !== 1 ? 's' : ''}</span>
                        </div>
                    </MotionDiv>
                </div>
            )}
        </AnimatePresence>
    );
};

export default CommandPalette;
