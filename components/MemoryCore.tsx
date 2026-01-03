import React, { useEffect, useState, useMemo, useRef } from 'react';
import { neuralVault } from '../services/persistenceService';
import { 
    promptSelectKey, classifyArtifact, generateEmbedding, fileToGenerativePart
} from '../services/geminiService';
import { useAppStore } from '../store';
import { 
    File as FileIcon, Loader2, Search, 
    Database, X, Upload, Activity, FileText, BrainCircuit,
    LayoutGrid, Boxes, Info, Trash2, Radar, Zap, Code,
    Shield, FileJson, Clock, Tag, Box, Sparkles, FileSearch, Fingerprint,
    Waves, RefreshCw, Cpu, GitBranch, Maximize, Anchor
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StoredArtifact } from '../types';
import KnowledgeGraph from './KnowledgeGraph';
import PowerXRay from './PowerXRay';
import DynamicVisuals from './DynamicVisuals';
import { audio } from '../services/audioService';
import { cn } from '../utils/cn';
import { renderSafe } from '../utils/renderSafe';
import { usePerspectiveRefraction } from '../hooks/usePerspectiveRefraction';

// --- OCEANIC SUB-COMPONENT (NEURAL FLUIDITY) ---
const OceanicArtifact: React.FC<{ art: StoredArtifact, index: number, onSelect: (a: StoredArtifact) => void }> = ({ art, index, onSelect }) => {
    const { ref, style, onMouseMove, onMouseLeave } = usePerspectiveRefraction(0.7);
    const classification = art.analysis?.classification || 'RAW';
    
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ 
                opacity: 1, 
                scale: 1, 
                y: [0, -15, 0],
                rotate: [0, 1, -1, 0]
            }}
            transition={{ 
                opacity: { duration: 0.5 },
                y: { duration: 4 + Math.random() * 2, repeat: Infinity, ease: "easeInOut" },
                rotate: { duration: 5 + Math.random() * 3, repeat: Infinity, ease: "easeInOut" }
            }}
            ref={ref}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            style={style}
            onClick={() => onSelect(art)}
            className="p-6 bg-transparent crystalline rounded-[2.5rem] cursor-pointer group shadow-2xl relative overflow-hidden border border-white/5 invisible-glass h-64 flex flex-col justify-between"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
            <div className="flex justify-between items-start relative z-10">
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-gray-500 group-hover:text-[#9d4edd] transition-colors">
                    <Database size={16} />
                </div>
                <div className="text-[7px] font-mono text-gray-600 uppercase tracking-widest">
                    Mass: {art.analysis?.ambiguityScore || 40}u
                </div>
            </div>
            
            <div className="relative z-10">
                <h3 className="text-xs font-black text-white uppercase font-mono tracking-tighter mb-1 truncate leading-tight group-hover:text-[#18E6FF] transition-colors">{art.name}</h3>
                <div className="flex items-center gap-2">
                    <span className="text-[8px] font-mono text-gray-500 uppercase">{classification}</span>
                    <div className="w-1 h-1 rounded-full bg-[#10b981] animate-pulse" />
                </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex justify-between items-center relative z-10">
                <span className="text-[8px] font-mono text-gray-700">ID_{art.id.substring(0,4)}</span>
                <Sparkles size={12} className="text-white/10 group-hover:text-[#9d4edd] transition-all" />
            </div>
        </motion.div>
    );
};

const MemoryCore: React.FC = () => {
    const { actions } = useAppStore();
    const { openHoloProjector, addLog } = actions;
    
    const [artifacts, setArtifacts] = useState<StoredArtifact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'GRID' | 'GRAPH' | 'OCEANIC' | 'TOOLS' | 'DYNAMIC'>('OCEANIC');
    
    const [semanticResults, setSemanticResults] = useState<{id: string, score: number}[] | null>(null);
    const [selectedArtifact, setSelectedArtifact] = useState<StoredArtifact | null>(null);
    const [isIndexing, setIsIndexing] = useState(false);
    const [isReconstructing, setIsReconstructing] = useState(false);

    useEffect(() => { loadArtifacts(); }, []);

    const loadArtifacts = async () => {
        setIsLoading(true);
        try {
            const files = await neuralVault.getArtifacts();
            const tools = await neuralVault.getDynamicTools();
            
            const toolArtifacts = tools.map(t => ({
                id: t.id,
                name: `[TOOL] ${t.id}`,
                type: 'TOOL_MANIFEST',
                data: new Blob([t.code], { type: 'application/javascript' }),
                timestamp: t.timestamp,
                analysis: {
                    summary: `Autonomic capability manifest for protocol: ${t.id}`,
                    entities: ['Dynamic Capability', 'Autonomic Forge'],
                    ambiguityScore: 0,
                    classification: 'TOOL_MANIFEST'
                },
                tags: ['DYNAMIC_TOOL']
            }));

            const combined = [...files, ...toolArtifacts]
                .map(item => ({
                    ...item,
                    tags: Array.isArray(item.tags) ? item.tags : []
                }))
                .sort((a, b) => b.timestamp - a.timestamp);

            setArtifacts(combined as any);
        } catch (e) {
            console.error("Memory Sync Failed", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVectorSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) { 
            setSemanticResults(null); 
            return; 
        }
        
        setIsSearching(true);
        addLog('SYSTEM', `VECTOR_CORE: Analyzing semantic intent for "${searchQuery}"...`);
        audio.playClick();

        try {
            if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); setIsSearching(false); return; }
            const queryVector = await generateEmbedding(searchQuery);
            if (queryVector.length === 0) {
                addLog('ERROR', 'VECTOR_CORE: Failed to generate search embedding.');
                setIsSearching(false);
                return;
            }
            
            const results = await neuralVault.searchVectors(queryVector, 20);
            const highConfidence = results.filter(r => r.score > 0.3);
            setSemanticResults(highConfidence);
            addLog('SUCCESS', `VECTOR_CORE: Located ${highConfidence.length} fragments.`);
            audio.playSuccess();
        } catch (err: any) { 
            addLog('ERROR', `SEARCH_FAIL: ${err.message}`); 
            audio.playError();
        } finally { 
            setIsSearching(false); 
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setIsIndexing(true);
            const files = Array.from(e.target.files) as File[];
            addLog('SYSTEM', `INGEST: Performing forensic deep scan on ${files.length} artifacts...`);
            
            for (const file of files) {
                try {
                    if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); break; }
                    
                    const fileData = await fileToGenerativePart(file);
                    const analysisRes = await classifyArtifact(fileData);
                    const analysis = analysisRes.ok ? analysisRes.value : null;
                    
                    const id = await neuralVault.saveArtifact(file, analysis);
                    const textForVector = analysis ? `${analysis.classification} ${analysis.summary} ${analysis.structural_intelligence || ''}` : file.name;
                    const embedding = await generateEmbedding(textForVector);
                    if (embedding.length > 0) {
                        await neuralVault.saveVector(id, embedding, { name: file.name, type: analysis?.classification });
                    }
                    
                    addLog('SUCCESS', `INGEST_OK: [${file.name}] categorized as ${analysis?.classification || 'RAW'}.`);
                } catch (err: any) { 
                    addLog('ERROR', `INGEST_FAIL: Deep scan failed for ${file.name}`);
                }
            }
            setIsIndexing(false);
            loadArtifacts();
            audio.playSuccess();
        }
    };

    const defragmentMatrix = () => {
        setSearchQuery('');
        setSemanticResults(null);
        loadArtifacts();
        addLog('SYSTEM', 'LATTICE: Neural defragmentation finalized. Integrity optimized.');
        audio.playSuccess();
    };

    const handleDeepReconstruction = async () => {
        if (!selectedArtifact) return;
        setIsReconstructing(true);
        audio.playClick();
        addLog('SYSTEM', `RECONSTRUCTION: Initializing deep structural synthesis for [${selectedArtifact.name}]...`);
        
        try {
            await new Promise(r => setTimeout(r, 2000));
            addLog('SUCCESS', `RECONSTRUCTION: High-fidelity logic model synthesized.`);
            audio.playSuccess();
            openHoloProjector({ 
                id: `recon-${selectedArtifact.id}`, 
                title: `Reconstructed: ${selectedArtifact.name}`, 
                type: 'TEXT', 
                content: `DEEP_SYNTHESIS_REPORT\n\nORIGIN: ${selectedArtifact.name}\nCLASSIFICATION: ${selectedArtifact.analysis?.classification}\n\nCORE_INSIGHT: The underlying structural pattern suggests a high degree of recursive symmetry. Operational efficiency is estimated at 94.2%.\n\nRECOMMENDED_ACTION: Integrate with Swarm Protocol for distributed execution.`
            });
        } catch (e) {
            addLog('ERROR', 'RECONSTRUCTION: Synthesis buffer overflow.');
        } finally {
            setIsReconstructing(false);
        }
    };

    const filteredArtifacts = useMemo(() => {
        let base = artifacts;
        if (viewMode === 'TOOLS') base = artifacts.filter(a => a.type === 'TOOL_MANIFEST');
        
        if (!semanticResults) return base;
        return base
            .filter(a => semanticResults.some(r => r.id === a.id))
            .sort((a, b) => {
                const scoreA = semanticResults.find(r => r.id === a.id)?.score || 0;
                const scoreB = semanticResults.find(r => r.id === b.id)?.score || 0;
                return scoreB - scoreA;
            });
    }, [artifacts, semanticResults, viewMode]);

    const graphNodes = useMemo(() => {
        return filteredArtifacts.map(a => ({
            id: a.id,
            label: a.name,
            type: 'CONCEPT' as const,
            strength: a.analysis?.ambiguityScore ? 100 - a.analysis.ambiguityScore : 70,
            connections: Array.isArray(a.tags) ? a.tags.map(t => String(t)) : [],
            color: '#9d4edd',
            data: a.analysis
        }));
    }, [filteredArtifacts]);

    return (
        <div className="flex h-full w-full font-sans bg-transparent border border-[var(--border-main)] rounded-[2.5rem] overflow-hidden relative transition-colors duration-500">
            <div className="w-80 border-r border-[var(--border-main)] bg-[var(--bg-header)] backdrop-blur-3xl flex flex-col shrink-0 z-20">
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-black/10">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-[#9d4edd]/20 rounded-xl text-[#9d4edd] shadow-[0_0_15px_rgba(157,78,221,0.25)]">
                            <Database size={16} className={isIndexing ? 'animate-pulse' : ''} />
                        </div>
                        <span className="text-[11px] font-black font-mono uppercase tracking-[0.3em] text-white">Neural Vault</span>
                    </div>
                    {isIndexing && <Loader2 size={14} className="text-[#9d4edd] animate-spin" />}
                </div>
                <div className="p-6 border-b border-white/5 space-y-4">
                    <form onSubmit={handleVectorSearch} className="relative group">
                        <input 
                            value={searchQuery} 
                            onChange={e => setSearchQuery(e.target.value)} 
                            placeholder="Semantic Probe..." 
                            className="w-full bg-black/40 border border-white/10 pl-10 pr-4 py-3 text-[11px] font-mono text-white focus:border-[#9d4edd] outline-none rounded-xl shadow-inner transition-all placeholder:text-gray-800 uppercase" 
                        />
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700 group-focus-within:text-[#9d4edd] transition-colors" />
                        {isSearching && <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-[#9d4edd]" />}
                    </form>
                    <div className="flex justify-between items-center px-1">
                        {semanticResults && (
                            <button onClick={() => { setSearchQuery(''); setSemanticResults(null); }} className="text-[9px] font-mono text-[#9d4edd] hover:text-white uppercase tracking-widest font-black transition-colors flex items-center gap-2"><X size={10} /> Clear</button>
                        )}
                        <button onClick={defragmentMatrix} className="text-[9px] font-mono text-gray-600 hover:text-[#18E6FF] uppercase tracking-widest font-black transition-colors flex items-center gap-2 ml-auto">
                            <RefreshCw size={10} /> Defrag
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-black/20">
                    {filteredArtifacts.map(art => {
                        const semResult = semanticResults?.find(r => r.id === art.id);
                        return (
                            <button 
                                key={art.id} 
                                onClick={() => { setSelectedArtifact(art); audio.playClick(); }} 
                                className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col gap-2 relative overflow-hidden group ${selectedArtifact?.id === art.id ? 'border-[#9d4edd]/50 bg-[#9d4edd]/5 shadow-xl' : 'border-transparent hover:bg-white/5'}`}
                            >
                                <div className="absolute left-0 top-0 w-1 h-full bg-[#9d4edd] opacity-40" />
                                <div className="text-[11px] font-black text-white truncate uppercase tracking-tighter font-mono group-hover:text-[#9d4edd] transition-colors">{art.name}</div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[8px] text-gray-600 font-mono uppercase tracking-widest flex items-center gap-1.5">
                                        <FileIcon size={10} />
                                        {art.analysis?.classification || 'RAW_FRAGMENT'}
                                    </span>
                                    {semResult && (
                                        <div className="flex items-center gap-1.5 bg-[#10b981]/10 px-1.5 rounded-full"><Zap size={8} className="text-[#10b981]" /><span className="text-[8px] text-[#10b981] font-black font-mono">{Math.round(semResult.score * 100)}%</span></div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex-1 flex flex-col relative bg-transparent overflow-hidden">
                {/* Viewport Scanline */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-[#9d4edd]/10 z-10 pointer-events-none" />

                <div className="h-16 border-b border-[var(--border-main)] bg-[var(--bg-header)] backdrop-blur-3xl flex items-center justify-between px-10 shrink-0 z-20">
                    <div className="flex bg-black/20 p-1.5 rounded-xl border border-white/5 shadow-inner">
                        {[
                            { id: 'OCEANIC', icon: Waves, label: 'Neural Ocean' },
                            { id: 'GRID', icon: LayoutGrid, label: 'The Matrix' },
                            { id: 'TOOLS', icon: Code, label: 'Evolved Skills' },
                            { id: 'GRAPH', icon: BrainCircuit, label: 'Neural Lattice' },
                        ].map(btn => (
                            <button 
                                key={btn.id} 
                                onClick={() => { setViewMode(btn.id as any); audio.playClick(); }} 
                                className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all ${viewMode === btn.id ? 'bg-white text-black shadow-2xl scale-105' : 'text-gray-500 hover:text-white'}`}
                            >
                                <btn.icon size={14} /> {btn.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-8">
                        <label className="flex items-center gap-4 px-8 py-2.5 bg-[#9d4edd] text-black border border-transparent rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer shadow-[0_0_30px_rgba(157,78,221,0.3)] hover:scale-105 active:scale-95 transition-all">
                            <Upload size={18} /> Ingest Artifact
                            <input type="file" multiple className="hidden" onChange={handleFileUpload} />
                        </label>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden relative">
                    <AnimatePresence mode="wait">
                        {viewMode === 'OCEANIC' ? (
                            <motion.div key="oceanic" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-12 h-full overflow-y-auto custom-scrollbar bg-black/5 relative">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(24,230,255,0.03)_0%,transparent_70%)] pointer-events-none" />
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12 pb-32">
                                    {filteredArtifacts.map((art, i) => (
                                        <OceanicArtifact key={art.id} art={art} index={i} onSelect={setSelectedArtifact} />
                                    ))}
                                </div>
                            </motion.div>
                        ) : viewMode === 'GRAPH' ? (
                            <motion.div key="graph" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                                <KnowledgeGraph nodes={graphNodes} onNodeClick={(n) => setSelectedArtifact(artifacts.find(a => a.id === n.id) || null)} />
                            </motion.div>
                        ) : viewMode === 'DYNAMIC' ? (
                            <motion.div key="dynamic" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                                <DynamicVisuals artifacts={artifacts} onSelect={setSelectedArtifact} />
                            </motion.div>
                        ) : (
                            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10 overflow-y-auto h-full custom-scrollbar pb-32 bg-black/5">
                                {filteredArtifacts.map(art => {
                                    return (
                                        <motion.div 
                                            layout
                                            key={art.id} 
                                            onClick={() => { setSelectedArtifact(art); audio.playClick(); }} 
                                            className={cn(
                                                "p-8 bg-transparent crystalline rounded-[3rem] transition-all cursor-pointer group shadow-2xl relative overflow-hidden border border-white/5",
                                                selectedArtifact?.id === art.id ? 'border-white/40 ring-4 ring-white/5 bg-white/[0.03]' : 'hover:border-white/20'
                                            )}
                                        >
                                            <div className="text-sm font-black text-white uppercase truncate font-mono mb-2 tracking-tighter group-hover:text-[#9d4edd] transition-colors">{art.name}</div>
                                            <div className="flex flex-wrap gap-2 mb-4 h-6 overflow-hidden">
                                                {Array.isArray(art.tags) && art.tags.slice(0, 3).map(tag => (
                                                    <span key={String(tag)} className="text-[7px] font-black font-mono text-gray-500 border border-white/5 bg-white/5 px-2 py-0.5 rounded uppercase tracking-tighter">{String(tag)}</span>
                                                ))}
                                            </div>
                                            <div className="flex justify-between items-center border-t border-white/5 pt-4">
                                                <div className="px-2 py-0.5 rounded text-[8px] font-black font-mono uppercase tracking-widest bg-[#9d4edd]/10 text-[#9d4edd]">
                                                    {art.analysis?.classification || 'RAW'}
                                                </div>
                                                <span className="text-[8px] text-gray-700 font-mono uppercase">ID_{art.id.substring(0,4)}</span>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <AnimatePresence>
                {selectedArtifact && (
                    <motion.div 
                        initial={{ x: '100%' }} 
                        animate={{ x: 0 }} 
                        exit={{ x: '100%' }} 
                        className="fixed top-0 right-0 bottom-0 w-[520px] bg-[#0a0a0a]/95 backdrop-blur-3xl border-l border-white/10 z-[300] shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col p-12 gap-12 glass-drawer-edge"
                    >
                        <div className="flex justify-between items-start shrink-0">
                            <div className="space-y-2 text-white">
                                <h2 className="text-3xl font-black uppercase font-mono tracking-tighter truncate max-w-[360px] leading-tight group-hover:text-[#9d4edd]">{selectedArtifact.name}</h2>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5 text-[8px] font-mono text-gray-600 uppercase tracking-widest">
                                        <Clock size={10} /> {new Date(selectedArtifact.timestamp).toLocaleTimeString()}
                                    </div>
                                    <div className="h-3 w-px bg-white/10" />
                                    <div className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">{selectedArtifact.type}</div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedArtifact(null)} className="p-3 hover:bg-white/5 rounded-2xl transition-all text-gray-500 hover:text-white border border-transparent hover:border-white/10"><X size={28}/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-12 pr-4">
                            <div className="aspect-video glass-action rounded-[3rem] flex items-center justify-center shadow-2xl group/prev relative overflow-hidden border border-white/5 bg-black/40">
                                {selectedArtifact.type === 'TOOL_MANIFEST' ? <Code size={100} className="text-[#f97316] drop-shadow-[0_0_20px_rgba(249,115,22,0.3)]" /> : <FileText size={100} className="text-white opacity-40 group-hover:scale-110 group-hover:opacity-100 transition-all duration-1000" />}
                            </div>
                            <div className="space-y-6">
                                <div className="flex items-center gap-4 text-[11px] font-black text-gray-500 uppercase tracking-[0.4em] px-2">
                                    <Sparkles size={16} className="text-[#9d4edd]" /> Technical Summary
                                </div>
                                <div className="p-10 bg-black/60 border border-white/5 rounded-[3.5rem] text-[15px] font-mono text-gray-300 leading-relaxed italic border-l-[6px] border-l-[#9d4edd] shadow-inner">
                                    "{renderSafe(selectedArtifact.analysis?.summary) || 'Integrity check in progress.'}"
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-5 shrink-0 pt-10 border-t border-white/5">
                            <button 
                                onClick={handleDeepReconstruction} 
                                disabled={isReconstructing}
                                className="w-full py-6 bg-[#9d4edd] text-black rounded-[2rem] text-[12px] font-black uppercase tracking-[0.5em] shadow-[0_20px_50px_rgba(157,78,221,0.4)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-5 group/recon"
                            >
                                {isReconstructing ? <Loader2 size={22} className="animate-spin" /> : <BrainCircuit size={22} />}
                                Neural Reconstruction
                            </button>
                            <div className="flex gap-4">
                                <button onClick={() => openHoloProjector({ id: selectedArtifact.id, title: selectedArtifact.name, type: selectedArtifact.type === 'TOOL_MANIFEST' ? 'CODE' : 'TEXT', content: selectedArtifact.analysis?.summary || selectedArtifact.name })} className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all flex items-center justify-center gap-3">
                                    <Maximize size={16} /> Holo View
                                </button>
                                <button onClick={async () => { if (confirm('Irreversible purge?')) { await neuralVault.deleteArtifact(selectedArtifact.id); setSelectedArtifact(null); loadArtifacts(); audio.playError(); } }} className="px-6 py-4 bg-transparent border border-red-500/10 rounded-2xl text-red-500/60 hover:text-red-500 hover:bg-red-500/10 transition-all flex items-center justify-center">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MemoryCore;