import React, { useEffect, useRef, useState, useMemo } from 'react';
import { neuralVault } from '../services/persistenceService';
import { 
    generateTaxonomy, promptSelectKey, smartOrganizeArtifact, 
    digitizeDocument, performSemanticSearch, classifyArtifact, discoverDeepLattice,
    generateVaultInsights, executeVaultDirective, generateEmbedding, fileToGenerativePart
} from '../services/geminiService';
import { useAppStore } from '../store';
import { 
    HardDrive, Folder, File as FileIcon, Wand2, Loader2, Grid, List, Search, 
    Database, Trash2, X, Upload, Scan, Sparkles, ShieldCheck, 
    Activity, Eye, FileText, BrainCircuit, Share2, Network, 
    Layers, Cpu, Zap, Radio, Globe, Terminal, History, GitBranch,
    ChevronRight, ChevronDown, Package, AlertCircle, Command,
    Filter, LayoutGrid, Boxes, Brain, Tag, Archive, Plus, Info, Target, GitCommit, FileJson, Bookmark, Maximize,
    SignalHigh, SignalMedium, SignalLow, Microscope
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StoredArtifact, KnowledgeNode, NeuralLattice } from '../types';
import KnowledgeGraph from './KnowledgeGraph';
import { audio } from '../services/audioService';

const MemoryCore: React.FC = () => {
    const { openHoloProjector, addLog, setProcessState } = useAppStore();
    
    const [artifacts, setArtifacts] = useState<StoredArtifact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'GRID' | 'GRAPH' | 'XRAY'>('GRID');
    
    // Semantic State
    const [semanticResults, setSemanticResults] = useState<{id: string, score: number}[] | null>(null);
    const [selectedArtifact, setSelectedArtifact] = useState<StoredArtifact | null>(null);
    const [isIndexing, setIsIndexing] = useState(false);

    useEffect(() => { loadArtifacts(); }, []);

    const loadArtifacts = async () => {
        setIsLoading(true);
        const items = await neuralVault.getArtifacts();
        setArtifacts(items as StoredArtifact[]);
        setIsLoading(false);
    };

    const handleVectorSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) { setSemanticResults(null); return; }
        
        setIsSearching(true);
        addLog('SYSTEM', `VECTOR_CORE: Searching semantic manifold for "${searchQuery}"...`);
        audio.playClick();

        try {
            const hasKey = await window.aistudio?.hasSelectedApiKey();
            if (!hasKey) { await promptSelectKey(); setIsSearching(false); return; }
            const queryVector = await generateEmbedding(searchQuery);
            const results = await neuralVault.searchVectors(queryVector, 10);
            const highConfidence = results.filter(r => r.score > 0.4);
            setSemanticResults(highConfidence);
            addLog('SUCCESS', `VECTOR_CORE: Alignment confirmed for ${highConfidence.length} nodes.`);
            audio.playSuccess();
        } catch (err: any) { 
            addLog('ERROR', `SEARCH_FAIL: ${err.message}`); 
            audio.playError();
        } finally { setIsSearching(false); }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setIsIndexing(true);
            const files = Array.from(e.target.files) as File[];
            addLog('SYSTEM', `INGEST: Indexing ${files.length} artifacts...`);
            for (const file of files) {
                try {
                    if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); break; }
                    const fileData = await fileToGenerativePart(file);
                    const analysisRes = await classifyArtifact(fileData);
                    const analysis = analysisRes.ok ? analysisRes.value : null;
                    const id = await neuralVault.saveArtifact(file, analysis);
                    const embedding = await generateEmbedding(analysis?.summary || file.name);
                    if (embedding.length > 0) await neuralVault.saveVector(id, embedding);
                } catch (err: any) { console.error(err); }
            }
            setIsIndexing(false);
            loadArtifacts();
            audio.playSuccess();
        }
    };

    const filteredArtifacts = useMemo(() => {
        if (!semanticResults) return artifacts;
        return artifacts
            .filter(a => semanticResults.some(r => r.id === a.id))
            .sort((a, b) => {
                const scoreA = semanticResults.find(r => r.id === a.id)?.score || 0;
                const scoreB = semanticResults.find(r => r.id === b.id)?.score || 0;
                return scoreB - scoreA;
            });
    }, [artifacts, semanticResults]);

    return (
        <div className="flex h-full w-full font-sans bg-[#030303] border border-[#1f1f1f] rounded-xl overflow-hidden relative">
            {/* Sidebar: Vault Index */}
            <div className="w-80 border-r border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur flex flex-col shrink-0">
                <div className="p-6 border-b border-[#1f1f1f] flex items-center justify-between bg-white/[0.01]">
                    <div className="flex items-center gap-3">
                        <Database className="w-5 h-5 text-[#9d4edd] animate-pulse" />
                        <span className="text-xs font-black font-mono uppercase tracking-[0.2em] text-white">Neural Vault</span>
                    </div>
                    {isIndexing && <Loader2 size={14} className="text-[#9d4edd] animate-spin" />}
                </div>
                <div className="p-4 border-b border-[#1f1f1f]">
                    <form onSubmit={handleVectorSearch} className="relative group">
                        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Vector Search..." className="w-full bg-[#050505] border border-[#333] pl-4 pr-10 py-2.5 text-[10px] font-mono text-white focus:border-[#9d4edd] outline-none rounded-lg shadow-inner" />
                        <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">{isSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}</button>
                    </form>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {artifacts.map(art => (
                        <button key={art.id} onClick={() => setSelectedArtifact(art)} className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1 ${selectedArtifact?.id === art.id ? 'border-[#9d4edd] bg-[#9d4edd]/5' : 'border-transparent hover:bg-white/5'}`}>
                            <div className="text-[10px] font-bold text-gray-300 truncate uppercase">{art.name}</div>
                            <span className="text-[8px] text-gray-600 font-mono uppercase">{art.analysis?.classification || 'RAW'}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Stage */}
            <div className="flex-1 flex flex-col relative">
                <div className="h-14 border-b border-[#1f1f1f] bg-[#0a0a0a] flex items-center justify-between px-6 shrink-0 z-20">
                    <div className="flex bg-[#111] p-1 rounded-xl border border-[#333] shadow-inner">
                        {[
                            { id: 'GRID', icon: LayoutGrid, label: 'Matrix' },
                            { id: 'GRAPH', icon: BrainCircuit, label: 'Lattice' },
                            { id: 'XRAY', icon: Activity, label: 'X-Ray' }
                        ].map(btn => (
                            <button key={btn.id} onClick={() => { setViewMode(btn.id as any); audio.playClick(); }} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${viewMode === btn.id ? 'bg-[#1f1f1f] text-white border border-white/5' : 'text-gray-600 hover:text-gray-300'}`}>
                                <btn.icon size={12} /> {btn.label}
                            </button>
                        ))}
                    </div>
                    <label className="flex items-center gap-2 px-5 py-2 bg-[#9d4edd] text-black border border-transparent rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer shadow-[0_10px_30px_rgba(157,78,221,0.3)] hover:scale-105 transition-all">
                        <Upload size={14} /> Ingest Artifact
                        <input type="file" multiple className="hidden" onChange={handleFileUpload} />
                    </label>
                </div>

                <div className="flex-1 overflow-hidden relative">
                    <AnimatePresence mode="wait">
                        {viewMode === 'GRAPH' ? (
                            <motion.div key="graph" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                                <KnowledgeGraph nodes={artifacts.map(a => ({ id: a.id, label: a.name, type: 'CONCEPT', strength: 80, connections: [] }))} onNodeClick={(n) => setSelectedArtifact(artifacts.find(a => a.id === n.id) || null)} />
                            </motion.div>
                        ) : viewMode === 'GRID' ? (
                            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 grid grid-cols-2 md:grid-cols-4 gap-6 overflow-y-auto h-full custom-scrollbar">
                                {filteredArtifacts.map(art => (
                                    <div key={art.id} onClick={() => setSelectedArtifact(art)} className={`p-6 bg-[#0a0a0a] border rounded-2xl transition-all cursor-pointer group shadow-2xl relative overflow-hidden ${selectedArtifact?.id === art.id ? 'border-[#9d4edd]' : 'border-[#222] hover:border-white/20'}`}>
                                        <div className="aspect-square bg-black rounded-xl flex items-center justify-center text-gray-700 group-hover:text-[#9d4edd] transition-colors mb-4 shadow-inner border border-white/5"><FileIcon size={32} /></div>
                                        <div className="text-[10px] font-black text-white uppercase truncate font-mono mb-1">{art.name}</div>
                                        <div className="text-[8px] text-gray-600 font-mono uppercase">{art.analysis?.classification || 'RAW'}</div>
                                    </div>
                                ))}
                            </motion.div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-700 font-mono text-sm opacity-20 uppercase tracking-[0.4em]">X-Ray Mode Standby</div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Inspector Sidepanel */}
            <AnimatePresence>
                {selectedArtifact && (
                    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed top-0 right-0 bottom-0 w-[450px] bg-[#0a0a0a]/98 backdrop-blur-3xl border-l border-white/10 z-[300] shadow-2xl flex flex-col p-8 gap-8">
                        <div className="flex justify-between items-center shrink-0">
                            <h2 className="text-xl font-black text-white uppercase font-mono tracking-tighter truncate pr-6">{selectedArtifact.name}</h2>
                            <button onClick={() => setSelectedArtifact(null)} className="p-2 hover:bg-white/5 rounded-xl"><X size={20}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8">
                            <div className="aspect-video bg-black rounded-3xl border border-white/5 flex items-center justify-center shadow-inner group/prev relative">
                                <FileText size={64} className="text-gray-800 group-hover:scale-110 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#9d4edd]/5 to-transparent opacity-0 group-hover/prev:opacity-100 transition-opacity" />
                            </div>
                            <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl text-sm font-mono text-gray-400 leading-relaxed italic border-l-4 border-l-[#9d4edd]">"{selectedArtifact.analysis?.summary || 'No intelligence synthesized.'}"</div>
                            <div className="flex flex-col gap-3">
                                <button onClick={() => openHoloProjector({ id: selectedArtifact.id, title: selectedArtifact.name, type: 'TEXT', content: selectedArtifact.analysis?.summary || selectedArtifact.name })} className="w-full py-4 bg-[#9d4edd] text-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all">Project Hologram</button>
                                <button onClick={async () => { if (confirm('Purge from vault?')) { await neuralVault.deleteArtifact(selectedArtifact.id); setSelectedArtifact(null); loadArtifacts(); } }} className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-red-500 hover:border-red-500/20 transition-all">Execute Purge</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MemoryCore;
