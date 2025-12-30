import React, { useEffect, useState, useMemo } from 'react';
import { neuralVault } from '../services/persistenceService';
import { 
    promptSelectKey, classifyArtifact, generateEmbedding, fileToGenerativePart
} from '../services/geminiService';
import { useAppStore } from '../store';
import { 
    File as FileIcon, Loader2, Search, 
    Database, X, Upload, Activity, FileText, BrainCircuit,
    LayoutGrid, Boxes, Info, Trash2, Radar, Zap, Code,
    Shield, FileJson, Clock, Tag, Box, Sparkles, FileSearch, Fingerprint
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StoredArtifact } from '../types';
import KnowledgeGraph from './KnowledgeGraph';
import PowerXRay from './PowerXRay';
import { audio } from '../services/audioService';
import { cn } from '../utils/cn';

const CLASSIFICATION_MAP: Record<string, { color: string, bg: string, icon: any }> = {
    'FINANCIAL': { color: '#10b981', bg: 'bg-[#10b981]/10', icon: Zap },
    'ARCHITECTURAL': { color: '#9d4edd', bg: 'bg-[#9d4edd]/10', icon: LayoutGrid },
    'LEGAL': { color: '#f59e0b', bg: 'bg-[#f59e0b]/10', icon: Shield },
    'LOGIC': { color: '#22d3ee', bg: 'bg-[#22d3ee]/10', icon: Code },
    'RESEARCH': { color: '#3b82f6', bg: 'bg-[#3b82f6]/10', icon: Radar },
    'TOOL_MANIFEST': { color: '#f97316', bg: 'bg-[#f97316]/10', icon: Box }
};

const MemoryCore: React.FC = () => {
    const { actions } = useAppStore();
    const { openHoloProjector, addLog } = actions;
    
    const [artifacts, setArtifacts] = useState<StoredArtifact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'GRID' | 'GRAPH' | 'XRAY' | 'TOOLS'>('GRID');
    
    const [semanticResults, setSemanticResults] = useState<{id: string, score: number}[] | null>(null);
    const [selectedArtifact, setSelectedArtifact] = useState<StoredArtifact | null>(null);
    const [isIndexing, setIsIndexing] = useState(false);

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

    const filteredArtifacts = useMemo(() => {
        let base = artifacts;
        if (viewMode === 'TOOLS') base = artifacts.filter(a => a.type === 'TOOL_MANIFEST');
        
        if (!semanticResults) return base;
        return base
            .filter(a => semanticResults.some(r => r.id === a.id))
            .sort((a, b) => {
                const scoreA = semanticResults.find(r => r.id === a.id)?.score || 0;
                const scoreB = semanticResults.find(r => r.id === a.id)?.score || 0;
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
            color: CLASSIFICATION_MAP[a.analysis?.classification || '']?.color || '#333',
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
                <div className="p-6 border-b border-white/5">
                    <form onSubmit={handleVectorSearch} className="relative group">
                        <input 
                            value={searchQuery} 
                            onChange={e => setSearchQuery(e.target.value)} 
                            placeholder="Semantic Probe..." 
                            className="w-full bg-black/40 border border-white/10 pl-10 pr-4 py-3 text-[11px] font-mono text-white focus:border-[#9d4edd] outline-none rounded-xl shadow-inner transition-all placeholder:text-gray-800" 
                        />
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700 group-focus-within:text-[#9d4edd] transition-colors" />
                        {isSearching && <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-[#9d4edd]" />}
                    </form>
                    {semanticResults && (
                        <button onClick={() => { setSearchQuery(''); setSemanticResults(null); }} className="mt-3 text-[9px] font-mono text-[#9d4edd] hover:text-white uppercase tracking-widest font-black transition-colors flex items-center gap-2"><X size={10} /> Reset Result Cache</button>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-black/20">
                    {filteredArtifacts.map(art => {
                        const semResult = semanticResults?.find(r => r.id === art.id);
                        const visual = CLASSIFICATION_MAP[art.analysis?.classification || ''] || { color: '#333', bg: 'bg-white/5', icon: FileIcon };
                        return (
                            <button 
                                key={art.id} 
                                onClick={() => { setSelectedArtifact(art); audio.playClick(); }} 
                                className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col gap-2 relative overflow-hidden group ${selectedArtifact?.id === art.id ? 'border-[#9d4edd]/50 bg-[#9d4edd]/5 shadow-xl' : 'border-transparent hover:bg-white/5'}`}
                            >
                                <div className="absolute left-0 top-0 w-1 h-full opacity-40" style={{ backgroundColor: visual.color }} />
                                <div className="text-[11px] font-black text-white truncate uppercase tracking-tighter font-mono group-hover:text-[#9d4edd] transition-colors">{art.name}</div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[8px] text-gray-600 font-mono uppercase tracking-widest flex items-center gap-1.5">
                                        <visual.icon size={10} style={{ color: visual.color }} />
                                        {art.analysis?.classification || 'RAW_FRAGMENT'}
                                    </span>
                                    {semResult && (
                                        <div className="flex items-center gap-1.5 bg-[#10b981]/10 px-1.5 rounded-full"><Zap size={8} className="text-[#10b981]" /><span className="text-[8px] text-[#10b981] font-black font-mono">{Math.round(semResult.score * 100)}%</span></div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                    {filteredArtifacts.length === 0 && !isLoading && (
                        <div className="py-20 text-center opacity-10 flex flex-col items-center gap-6 grayscale">
                            <Radar size={48} className="animate-pulse" /><span className="text-[10px] font-mono uppercase tracking-[0.5em]">Lattice Standby</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col relative bg-transparent">
                <div className="h-16 border-b border-[var(--border-main)] bg-[var(--bg-header)] backdrop-blur-3xl flex items-center justify-between px-10 shrink-0 z-20">
                    <div className="flex bg-black/20 p-1.5 rounded-xl border border-white/5 shadow-inner">
                        {[
                            { id: 'GRID', icon: LayoutGrid, label: 'The Matrix' },
                            { id: 'TOOLS', icon: Code, label: 'Evolved Skills' },
                            { id: 'GRAPH', icon: BrainCircuit, label: 'Neural Lattice' },
                            { id: 'XRAY', icon: Radar, label: 'Spectral Scan' }
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
                        <div className="flex items-center gap-3 text-gray-600 text-[10px] font-mono uppercase tracking-widest">
                            <Activity size={14} className="text-[#10b981] animate-pulse" /> Indexed: {artifacts.length} Fragments
                        </div>
                        <label className="flex items-center gap-4 px-8 py-2.5 bg-[#9d4edd] text-black border border-transparent rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer shadow-[0_0_30px_rgba(157,78,221,0.3)] hover:scale-105 active:scale-95 transition-all">
                            <Upload size={18} /> Ingest Artifact
                            <input type="file" multiple className="hidden" onChange={handleFileUpload} />
                        </label>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden relative">
                    <AnimatePresence mode="wait">
                        {viewMode === 'GRAPH' ? (
                            <motion.div key="graph" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                                <KnowledgeGraph nodes={graphNodes} onNodeClick={(n) => setSelectedArtifact(artifacts.find(a => a.id === n.id) || null)} />
                            </motion.div>
                        ) : viewMode === 'XRAY' ? (
                            <motion.div key="xray" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                                <PowerXRay availableSources={artifacts} />
                            </motion.div>
                        ) : (
                            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10 overflow-y-auto h-full custom-scrollbar pb-32 bg-black/5">
                                {filteredArtifacts.map(art => {
                                    const visual = CLASSIFICATION_MAP[art.analysis?.classification || ''] || { color: '#333', bg: 'bg-white/5', icon: FileIcon };
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
                                            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-all rotate-12 pointer-events-none">
                                                <visual.icon size={100} />
                                            </div>

                                            <div className="aspect-square glass-action rounded-[2.5rem] flex flex-col items-center justify-center transition-all mb-8 shadow-inner relative overflow-hidden">
                                                <visual.icon size={64} style={{ color: visual.color }} className="group-hover:scale-110 transition-transform duration-1000 shadow-[0_0_20px_currentColor]" />
                                                <div className="absolute bottom-4 flex gap-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse delay-75" />
                                                </div>
                                            </div>
                                            <div className="text-sm font-black text-white uppercase truncate font-mono mb-2 tracking-tighter group-hover:text-[#9d4edd] transition-colors">{art.name}</div>
                                            
                                            <div className="flex flex-wrap gap-2 mb-4 h-6 overflow-hidden">
                                                {Array.isArray(art.tags) && art.tags.slice(0, 3).map(tag => (
                                                    <span key={String(tag)} className="text-[7px] font-black font-mono text-gray-500 border border-white/5 bg-white/5 px-2 py-0.5 rounded uppercase tracking-tighter">{String(tag)}</span>
                                                ))}
                                            </div>

                                            <div className="flex justify-between items-center border-t border-white/5 pt-4">
                                                <div className={cn("px-2 py-0.5 rounded text-[8px] font-black font-mono uppercase tracking-widest", visual.bg)} style={{ color: visual.color }}>
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
                {selectedArtifact && viewMode !== 'XRAY' && (
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
                                    <div className="flex items-center gap-1.5 text-[8px] font-mono text-gray-500 uppercase tracking-widest">
                                        <Clock size={10} /> {new Date(selectedArtifact.timestamp).toLocaleTimeString()}
                                    </div>
                                    <div className="h-3 w-px bg-white/10" />
                                    <div className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">{selectedArtifact.type}</div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedArtifact(null)} className="p-3 hover:bg-white/5 rounded-2xl transition-all text-gray-500 hover:text-white border border-transparent hover:border-white/10"><X size={28}/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-12 pr-4">
                            <div className="aspect-video glass-action rounded-[3rem] flex items-center justify-center shadow-2xl group/prev relative overflow-hidden border border-white/5 bg-black/40">
                                {selectedArtifact.type === 'TOOL_MANIFEST' ? <Code size={100} className="text-[#f97316] drop-shadow-[0_0_20px_rgba(249,115,22,0.3)]" /> : <FileText size={100} className="text-white opacity-40 group-hover:scale-110 group-hover:opacity-100 transition-all duration-1000" />}
                                <div className="absolute bottom-6 right-8 flex gap-3">
                                     <div className="px-3 py-1 bg-[#9d4edd]/20 border border-[#9d4edd]/30 rounded-lg text-[8px] font-black text-[#9d4edd] uppercase">Forensic Scan Valid</div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-4 text-[11px] font-black text-gray-500 uppercase tracking-[0.4em] px-2">
                                    <Sparkles size={16} className="text-[#9d4edd]" /> Technical Summary
                                </div>
                                <div className="p-10 bg-black/60 border border-white/5 rounded-[3.5rem] text-[15px] font-mono text-gray-300 leading-relaxed italic border-l-[6px] border-l-[#9d4edd] shadow-inner relative overflow-hidden group/summary">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/summary:opacity-10 transition-opacity"><Info size={40} /></div>
                                    "{selectedArtifact.analysis?.summary || 'Integrity scan pending in background daemon.'}"
                                </div>
                            </div>

                            {selectedArtifact.analysis?.structural_intelligence && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4 text-[11px] font-black text-gray-500 uppercase tracking-[0.4em] px-2">
                                        <FileSearch size={16} className="text-[#22d3ee]" /> Structural Intelligence
                                    </div>
                                    <div className="p-8 bg-black/40 border border-white/5 rounded-[2.5rem] text-[13px] font-mono text-gray-400 whitespace-pre-wrap leading-relaxed shadow-inner">
                                        {selectedArtifact.analysis.structural_intelligence}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-6">
                                <div className="flex items-center gap-4 text-[11px] font-black text-gray-500 uppercase tracking-[0.4em] px-2">
                                    <Tag size={16} className="text-[#22d3ee]" /> Semantic Markers
                                </div>
                                <div className="flex flex-wrap gap-3 px-2">
                                    {Array.isArray(selectedArtifact.tags) && selectedArtifact.tags.length > 0 ? selectedArtifact.tags.map(tag => (
                                        <span key={String(tag)} className="px-5 py-2 bg-white/5 rounded-xl border border-white/10 text-[9px] font-black font-mono text-[#22d3ee] uppercase tracking-widest hover:border-[#22d3ee]/40 transition-colors">#{String(tag)}</span>
                                    )) : (
                                        <span className="text-[10px] font-mono text-gray-700 italic">No semantic markers extracted.</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-5 shrink-0 pt-10 border-t border-white/5">
                            <button onClick={() => openHoloProjector({ id: selectedArtifact.id, title: selectedArtifact.name, type: selectedArtifact.type === 'TOOL_MANIFEST' ? 'CODE' : 'TEXT', content: selectedArtifact.analysis?.summary || selectedArtifact.name })} className="w-full py-6 bg-[#9d4edd] text-black rounded-[2rem] text-[12px] font-black uppercase tracking-[0.5em] shadow-[0_20px_50px_rgba(157,78,221,0.4)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-5 group/project">
                                <BrainCircuit size={22} className="group-hover/project:rotate-12 transition-transform" /> Project Manifest
                            </button>
                            <button onClick={async () => { if (confirm('Irreversible purge?')) { await neuralVault.deleteArtifact(selectedArtifact.id); setSelectedArtifact(null); loadArtifacts(); audio.playError(); } }} className="w-full py-5 bg-transparent border border-white/10 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.4em] text-gray-600 hover:text-red-500 hover:border-red-500/30 transition-all flex items-center justify-center gap-3">
                                <Trash2 size={18} /> Purge Unit
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MemoryCore;