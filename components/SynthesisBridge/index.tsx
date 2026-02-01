/**
 * SYNTHESIS BRIDGE
 *
 * Tactical Process Command Deck for forging sovereign technical manifests.
 * Supports PARA protocol, systems architecture, git operations, and code sovereignty.
 */

import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { motion, AnimatePresence } from 'framer-motion';
import {
    GitMerge, Target, RefreshCw, HardDrive,
    FolderTree, Cloud, Globe, Network, Shield, Aperture,
    ShieldCheck, Gauge, Loader2, DatabaseZap, BookOpen
} from 'lucide-react';
import { Github } from 'lucide-react';
import { promptSelectKey, generateStructuredWorkflow } from '../../services/geminiService';
import { KNOWLEDGE_LAYERS } from '../../data/knowledgeLayers';
import { audio } from '../../services/audioService';
import { cn } from '../../utils/cn';
import { TechnicalManifest } from '../../types';

// Extracted sub-components
import { DomainCard, ProposalQueue, ImplementationDeck } from './parts';

const SynthesisBridge: React.FC = () => {
    const { actions, knowledge, dashboard } = useAppStore();
    const { addLog, archiveIntervention, deployStrategyToLattice } = actions;

    const [processType, setProcessType] = useState<'DRIVE' | 'SYSTEM' | 'CODE' | 'OPS'>('DRIVE');
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<TechnicalManifest | null>(null);
    const [customIntent, setCustomIntent] = useState('');

    const PRESETS = [
        { id: 'para_ritual', label: 'PARA 2.0 Imperial Ritual', type: 'DRIVE', description: 'Architect a Tier-1 recursive PARA file hierarchy with semantic linking and strict date-stamped naming conventions.', icon: FolderTree, complexity: 'IMPERIAL' },
        { id: 'vault_indexing', label: 'Asset Indexing Pipeline', type: 'DRIVE', description: 'Forge an automated multi-modal workflow for indexing raw production assets into the Neural Vault.', icon: DatabaseZap, complexity: 'PRODUCTION' },
        { id: 'git_sync', label: 'Git Sovereignty Protocol', type: 'OPS', description: 'Establishing a secure git lifecycle for Metaventions assets: Stage, Atomic Commit, Signed Push.', icon: Github, complexity: 'SOVEREIGN' },
        { id: 'lattice_infra', label: 'Decentralized Lattice', type: 'SYSTEM', description: 'Forge a high-fidelity sovereign cloud manifest featuring edge refraction and self-healing node clusters.', icon: Globe, complexity: 'SOVEREIGN' },
        { id: 'distributed_ops', label: 'Distributed Systems Blueprint', type: 'SYSTEM', description: 'Architect a globally distributed operational process for multi-agent sync and cross-sector coordination.', icon: Network, complexity: 'CRITICAL' },
        { id: 'ts_fortress', label: 'Type Sovereignty', type: 'CODE', description: 'Imperial protocol for React/TypeScript structural integrity. Enforces generic inheritance and strict typing.', icon: Shield, complexity: 'STABLE' },
    ];

    const generateBlueprint = async (presetPrompt?: string) => {
        setIsGenerating(true);
        setResult(null);
        audio.playClick();
        addLog('SYSTEM', `SYNC_INIT: Initializing Imperial Logic Forge for ${processType}...`);

        try {
            const hasKey = await promptSelectKey();
            if (!hasKey) { setIsGenerating(false); return; }

            const activeLayers = (knowledge.activeLayers || []).map(id => KNOWLEDGE_LAYERS[id]?.label || id).join(', ');

            const directive = presetPrompt || (processType === 'DRIVE'
                ? "Forge a professional PARA 2.0 Imperial Drive Organization. STRUCTURE: Inbox, Projects, Areas, Resources, Archives. NAMING: [TYPE]_[DATE]_[PROJECT]. Provide deep metadata for entropy scores."
                : processType === 'SYSTEM'
                    ? "Synthesize an ultra-fidelity Systems Architecture manifest. Domain: Decentralized Lattice. Include IaC Terraform/HCL execution steps and terminal logOutput."
                    : processType === 'OPS'
                        ? "Generate a structured GitHub Sync Protocol. STEPS: 1. Status Audit, 2. Atomic Staging, 3. Signed Commit, 4. Upstream Push. Include CLI command sequences."
                        : "Forge a React/TypeScript Type-Safety Manifesto. Use absolute technical nomenclature and eliminate all implicit 'any' types.");

            const workflow = await generateStructuredWorkflow([], 'SOVEREIGN_CORE', processType === 'DRIVE' ? 'DIRECTORY' : 'SYSTEM_FLOW', {
                prompt: `${directive}. User Intent: ${customIntent}. Context Layers: ${activeLayers}.`,
                domain: 'Decentralized Lattice',
                fidelity: 90
            });

            setResult(workflow);
            actions.setDashboardState({ activeManifest: workflow });

            addLog('SUCCESS', `SYNC_COMPLETE: ${workflow.title} manifest locked and verified.`);
            audio.playSuccess();
        } catch (e: any) {
            addLog('ERROR', `SYNC_FAIL: ${e.message}`);
            audio.playError();
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="h-full w-full bg-[var(--bg-app)] flex flex-col font-sans overflow-hidden transition-all duration-700 border border-[var(--border-main)] rounded-[2rem]">
        {/* Command Header HUD */}
        <div className="h-20 border-b border-white/5 bg-[#0a0a0c]/90 backdrop-blur-3xl z-30 flex items-center justify-between px-12 shrink-0 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[var(--amethyst)]/60 to-transparent" />

            <div className="flex items-center gap-10">
                <div className="flex items-center gap-5">
                    <div className="p-3 bg-[var(--amethyst)]/10 border border-[var(--amethyst)]/40 rounded-2xl shadow-xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <GitMerge size={24} className="text-[var(--amethyst)] group-hover:rotate-180 transition-transform duration-700" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-white uppercase tracking-[0.4em] leading-none">Synthesis Bridge</h1>
                        <p className="text-[9px] text-gray-500 font-mono uppercase tracking-[0.3em] mt-2 block opacity-60">Tactical Process Command Deck // v9.5-Zenith</p>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-12">
                <div className="flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-4 bg-black/40 px-5 py-1 rounded-full border border-white/5 shadow-inner">
                        <span className="text-[10px] font-black font-mono text-[var(--plasma-green)] uppercase tracking-widest shimmer-text leading-none">Stable Link</span>
                        <div className="w-2 h-2 rounded-full bg-[var(--plasma-green)] animate-pulse shadow-[0_0_12px_var(--plasma-green)]" />
                    </div>
                </div>
            </div>
        </div>

        <div className="flex-1 flex overflow-hidden p-10 gap-8 relative z-10">
            <div className="w-[380px] flex flex-col gap-4 shrink-0 overflow-y-auto custom-scrollbar pr-2 border-r border-[var(--border-main)]">
                <div className="p-5 bg-[#0a0a0c]/60 border border-[var(--border-main)] rounded-[2.5rem] shadow-[0_30px_80px_rgba(0,0,0,0.7)] backdrop-blur-3xl relative overflow-hidden group/sector shrink-0">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent from-[var(--cyan)] via-[var(--cyan)]/30 to-transparent" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(123,44,255,0.02)_0%,transparent_70%)]" />
                    <div className="flex items-center gap-3 mb-4 px-1 relative z-10 shrink-0">
                        <Target size={18} className="text-[var(--amethyst)] animate-pulse" />
                        <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.5em]">Forge Sector</span>
                    </div>
                    <div className="space-y-2 relative z-10">
                        <DomainCard
                            label="PARA Protocol" sub="DATA TAXONOMY" icon={HardDrive} color="var(--amethyst)"
                            active={processType === 'DRIVE'} onClick={() => { setProcessType('DRIVE'); audio.playClick(); }}
                        />
                        <DomainCard
                            label="Systems Lattice" sub="ARCHITECTURE" icon={Cloud} color="var(--cyan)"
                            active={processType === 'SYSTEM'} onClick={() => { setProcessType('SYSTEM'); audio.playClick(); }}
                        />
                        <DomainCard
                            label="Git Sovereign" sub="OPERATIONS" icon={Github} color="var(--plasma-green)"
                            active={processType === 'OPS'} onClick={() => { setProcessType('OPS'); audio.playClick(); }}
                        />
                        <DomainCard
                            label="Type Sovereignty" sub="TECHNICAL STACK" icon={Shield} color="var(--executive-gold)"
                            active={processType === 'CODE'} onClick={() => { setProcessType('CODE'); audio.playClick(); }}
                        />
                    </div>
                </div>

                <ProposalQueue />

                <div className="p-5 bg-[#0a0a0c]/60 border border-white/5 rounded-[2.5rem] shadow-2xl backdrop-blur-3xl relative overflow-hidden group/ritual shrink-0">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.01)_0%,transparent_70%)]" />
                    <div className="flex items-center justify-between mb-4 px-1 relative z-10 shrink-0">
                        <div className="flex items-center gap-3">
                            <BookOpen size={18} className="text-gray-500" />
                            <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.5em]">Imperial Rituals</span>
                        </div>
                        <span className="text-[7px] font-mono text-gray-700 uppercase tracking-widest">v9.5_Manifest</span>
                    </div>
                    <div className="space-y-3 relative z-10 overflow-y-auto max-h-[320px] custom-scrollbar pr-1">
                        {PRESETS.map(preset => (
                            <button
                                key={preset.id}
                                onClick={() => { setProcessType(preset.type as any); setCustomIntent(preset.description); generateBlueprint(preset.description); }}
                                className={cn(
                                    "w-full p-4 rounded-xl text-left transition-all group border shadow-xl flex flex-col gap-2 relative overflow-hidden",
                                    "bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]"
                                )}
                            >
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <preset.icon size={14} className="text-[var(--amethyst)] group-hover:scale-110 transition-transform" />
                                        <div className="text-[10px] font-black text-white uppercase font-mono truncate tracking-tight">{preset.label}</div>
                                    </div>
                                    <span className="text-[6px] font-black font-mono text-gray-700 uppercase border border-white/5 px-1.5 py-0.5 rounded">{preset.complexity}</span>
                                </div>
                                <div className="text-[8px] text-gray-600 font-mono line-clamp-2 uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity leading-relaxed">{preset.description}</div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4 pt-1 shrink-0">
                    <textarea
                        value={customIntent}
                        onChange={e => setCustomIntent(e.target.value)}
                        placeholder="Input operational requirements..."
                        className="w-full h-32 bg-black/60 border border-white/5 rounded-[2rem] p-5 text-[10px] font-mono text-gray-300 outline-none focus:border-[var(--amethyst)]/60 transition-all placeholder:text-gray-800 shadow-inner resize-none"
                        data-voice-id="synthesis-intent-input"
                        aria-label="Synthesis intent input"
                    />
                    <button
                        onClick={() => generateBlueprint()}
                        disabled={isGenerating}
                        className="w-full py-4 bg-[var(--amethyst)] hover:brightness-125 text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.5em] transition-all shadow-[0_15px_40px_rgba(var(--amethyst),0.2)] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4 group/gen"
                        data-voice-id="synthesis-forge-button"
                        aria-label="Forge synthesis protocol"
                    >
                        {isGenerating ? <Loader2 size={15} className="w-5 h-5 animate-spin" /> : <RefreshCw size={18} className="group-hover/gen:rotate-180 transition-transform duration-700" />}
                        {isGenerating ? 'Synthesizing...' : 'Forge Protocol'}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-5">
                <AnimatePresence mode="wait">
                    {(result || dashboard.activeManifest) ? (
                        <ImplementationDeck
                            key="active-deck"
                            data={(result || dashboard.activeManifest) as TechnicalManifest}
                            onArchive={(d) => { archiveIntervention({ ...d, timestamp: Date.now() }); audio.playSuccess(); }}
                            onDeploy={(d) => { deployStrategyToLattice(d); addLog('SUCCESS', `PROTOCOL_ENGAGED: Structural transformation sequence initiated.`); audio.playSuccess(); }}
                        />
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="h-full flex flex-col items-center justify-center text-center p-20 gap-10 grayscale opacity-10 group hover:grayscale-0 hover:opacity-25 transition-all duration-1000"
                        >
                            <div className="relative">
                                <Aperture size={180} className="text-white animate-[spin_20s_linear_infinite]" />
                                <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.5, 0.1] }} transition={{ duration: 8, repeat: Infinity }} className="absolute inset-0 bg-[#7B2CFF]/20 blur-[150px] rounded-full" />
                            </div>
                            <div className="space-y-6">
                                <h3 className="text-4xl font-black font-mono text-white uppercase tracking-[1em] leading-none">Bridge Standby</h3>
                                <p className="text-[10px] font-mono text-gray-500 max-w-md mx-auto uppercase tracking-[0.4em] leading-loose">Select a template or input operational intent to forge a sovereign technical manifest.</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>

        {/* Global HUD Status Strip */}
        <div className="h-10 bg-[#020204]/95 border-t border-white/5 px-12 flex items-center justify-between text-[9px] font-mono text-gray-700 shrink-0 relative z-[60] backdrop-blur-4xl uppercase font-black tracking-widest">
            <div className="flex gap-16 items-center">
                <div className="flex items-center gap-3 text-[#10b981] group cursor-pointer leading-none">
                    <ShieldCheck size={16} className="group-hover:scale-110 transition-transform" />
                    <span className="shimmer-text">Sync_Stable</span>
                </div>
            </div>
            <div className="flex items-center gap-12">
                <div className="flex items-center gap-4 text-gray-600 leading-none">
                    <Gauge size={14} />
                    <span>Core_Load: 12.4%</span>
                </div>
                <div className="h-6 w-px bg-white/10" />
                <span className="tracking-[0.8em] opacity-40 leading-none uppercase">Strategic Command Deck</span>
                <div className="h-6 w-px bg-white/10" />
                <span className="text-gray-500 tracking-[0.4em] leading-none uppercase">ZENITH_OS_V9.5</span>
            </div>
        </div>
    </div>
    );
};

export default SynthesisBridge;
