import React, { useEffect, useRef, useState, useMemo } from 'react';
import { neuralVault } from '../services/persistenceService';
import { 
    generateTaxonomy, promptSelectKey, smartOrganizeArtifact, 
    digitizeDocument, performSemanticSearch, classifyArtifact, discoverDeepLattice,
    generateVaultInsights, executeVaultDirective
} from '../services/geminiService';
import { useAppStore } from '../store';
import { 
    HardDrive, Folder, File as FileIcon, Wand2, Loader2, Grid, List, Search, 
    Database, Trash2, X, Upload, Scan, Sparkles, ShieldCheck, 
    Activity, Eye, FileText, BrainCircuit, Share2, Network, 
    Layers, Cpu, Zap, Radio, Globe, Terminal, History, GitBranch,
    ChevronRight, ChevronDown, Package, AlertCircle, Command,
    Filter, LayoutGrid, Boxes, Brain, Tag, Archive, Plus, Info, Target, GitCommit, FileJson, Bookmark, Maximize
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StoredArtifact, KnowledgeNode, NeuralLattice } from '../types';
import KnowledgeGraph from './KnowledgeGraph';
import PowerXRay from './PowerXRay';

const MemoryCore: React.FC = () => {
    const { openHoloProjector, addLog, setProcessState } = useAppStore();
    const processData = useAppStore(state => state.process);
    
    const [artifacts, setArtifacts] = useState<StoredArtifact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'GRID' | 'GRAPH' | 'XRAY'>('GRAPH');
    const [semanticResults, setSemanticResults] = useState<string[] | null>(null);
    const [selectedArtifact, setSelectedArtifact] = useState<StoredArtifact | null>(null);

    useEffect(() => { loadArtifacts(); }, []);

    const loadArtifacts = async () => {
        setIsLoading(true);
        const items = await neuralVault.getArtifacts();
        setArtifacts(items as StoredArtifact[]);
        setIsLoading(false);
    };

    const triggerSemanticSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) { setSemanticResults(null); return; }
        setIsSearching(true);
        addLog('SYSTEM', `VECTOR_SCAN: Executing semantic search for "${searchQuery}"...`);
        try {
            const hasKey = await window.aistudio?.hasSelectedApiKey();
            if (!hasKey) { await promptSelectKey(); setIsSearching(false); return; }
            const topIds = await performSemanticSearch(searchQuery, artifacts);
            setSemanticResults(topIds);
            addLog('SUCCESS', `VECTOR_SCAN: Identified ${topIds.length} semantic clusters.`);
        } catch (err: any) { addLog('ERROR', `SEARCH_FAIL: ${err.message}`); }
        finally { setIsSearching(false); }
    };

    const graphNodes = useMemo<KnowledgeNode[]>(() => {
        return artifacts.map(art => ({
            id: art.id,
            label: art.name,
            type: 'CONCEPT',
            connections: [],
            strength: 100 - (art.analysis?.ambiguityScore || 0),
            color: art.type === 'application/pdf' ? '#f59e0b' : '#9d4edd',
            data: art.analysis || undefined,
            artifactRef: art
        }));
    }, [artifacts]);

    const filteredArtifacts = useMemo<StoredArtifact[]>(() => {
        if (semanticResults) {
            return semanticResults.map(id => artifacts.find(a => a.id === id)).filter(Boolean) as StoredArtifact[];
        }
        return artifacts.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [artifacts, searchQuery, semanticResults]);

    return (
        <div className="flex h-full w-full font-sans bg-[#030303] border border-[#1f1f1f] rounded-xl overflow-hidden">
            <div className="w-80 border-r border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur flex flex-col shrink-0">
                <div className="p-6 border-b border-[#1f1f1f] flex items-center gap-3">
                    <Brain className="w-5 h-5 text-[#9d4edd] animate-pulse" />
                    <span className="text-xs font-black font-mono uppercase tracking-[0.2em] text-white">Neural Vault</span>
                </div>
                <div className="p-4 border-b border-[#1f1f1f]">
                    <form onSubmit={triggerSemanticSearch} className="relative group">
                        <input 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Semantic Search..."
                            className="w-full bg-[#050505] border border-[#333] pl-4 pr-10 py-2.5 text-[10px] font-mono text-white focus:border-[#9d4edd] outline-none rounded-lg"
                        />
                        <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#9d4edd]">
                            {isSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                        </button>
                    </form>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    <div className="text-[8px] font-mono text-gray-600 uppercase tracking-widest mb-3">Stored Vectors</div>
                    {filteredArtifacts.map(art => (
                        <button key={art.id} onClick={() => setSelectedArtifact(art)} className="w-full text-left p-3 rounded-xl border border-transparent hover:border-[#333] hover:bg-white/5 transition-all group">
                            <div className="text-[10px] font-bold text-gray-300 truncate uppercase group-hover:text-white transition-colors">{art.name}</div>
                            <div className="text-[8px] text-gray-600 font-mono mt-1 uppercase">{art.analysis?.classification || 'RAW_DATA'}</div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex flex-col relative">
                <div className="h-14 border-b border-[#1f1f1f] bg-[#0a0a0a] flex items-center justify-between px-6 shrink-0">
                    <div className="flex bg-[#111] p-1 rounded-xl border border-[#333]">
                        {[{ id: 'GRAPH', icon: BrainCircuit, label: 'Lattice' }, { id: 'GRID', icon: LayoutGrid, label: 'Matrix' }, { id: 'XRAY', icon: Activity, label: 'X-Ray' }].map(btn => (
                            <button key={btn.id} onClick={() => setViewMode(btn.id as any)} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${viewMode === btn.id ? 'bg-[#1f1f1f] text-white' : 'text-gray-600 hover:text-gray-300'}`}>
                                <btn.icon size={12} /> {btn.label}
                            </button>
                        ))}
                    </div>
                    <label className="flex items-center gap-2 px-5 py-2 bg-[#9d4edd] text-black border border-transparent rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer shadow-lg">
                        <Upload size={14} /> Ingest Artifact
                        <input type="file" multiple className="hidden" />
                    </label>
                </div>

                <div className="flex-1 overflow-hidden relative">
                    {viewMode === 'GRAPH' && <KnowledgeGraph nodes={graphNodes} onNodeClick={(n: any) => setSelectedArtifact(n.artifactRef)} />}
                    {viewMode === 'GRID' && (
                        <div className="p-8 grid grid-cols-4 gap-6 overflow-y-auto h-full custom-scrollbar">
                            {filteredArtifacts.map(art => (
                                <div key={art.id} onClick={() => setSelectedArtifact(art)} className="p-5 bg-[#0a0a0a] border border-[#222] rounded-2xl hover:border-[#9d4edd] transition-all cursor-pointer group shadow-xl">
                                    <div className="aspect-square bg-[#050505] rounded-xl flex items-center justify-center text-gray-700 group-hover:text-[#9d4edd] transition-colors mb-4"><FileIcon size={32} /></div>
                                    <div className="text-[10px] font-black text-white uppercase truncate font-mono">{art.name}</div>
                                </div>
                            ))}
                        </div>
                    )}
                    {viewMode === 'XRAY' && <PowerXRay availableSources={artifacts} />}
                </div>
            </div>

            <AnimatePresence>
                {selectedArtifact && (
                    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed top-0 right-0 bottom-0 w-[450px] bg-[#0a0a0a]/98 backdrop-blur-2xl border-l border-white/10 z-[300] shadow-2xl flex flex-col">
                        <div className="h-16 border-b border-white/5 flex items-center justify-between px-6">
                            <span className="text-xs font-black text-white uppercase font-mono tracking-widest">Inspecting Vector</span>
                            <button onClick={() => setSelectedArtifact(null)}><X size={20} className="text-gray-500 hover:text-white"/></button>
                        </div>
                        <div className="p-8 space-y-8 flex-1 overflow-y-auto">
                            <div className="aspect-video bg-black rounded-2xl border border-[#222] flex items-center justify-center text-gray-800"><FileText size={64}/></div>
                            <h2 className="text-xl font-black text-white uppercase font-mono">{selectedArtifact.name}</h2>
                            <div className="p-6 bg-[#111] rounded-2xl border border-white/5 text-sm font-mono text-gray-300 leading-relaxed italic border-l-4 border-l-[#9d4edd]">"{selectedArtifact.analysis?.summary || 'No summary available.'}"</div>
                            <div className="flex flex-col gap-3">
                                <button className="w-full py-4 bg-[#9d4edd] text-black text-[10px] font-black uppercase rounded-2xl shadow-xl hover:bg-[#b06bf7] transition-all"><GitBranch size={14} className="inline mr-2"/> Branch Research</button>
                                <button className="w-full py-4 bg-[#111] text-white border border-white/10 rounded-2xl text-[10px] font-black uppercase"><Maximize size={14} className="inline mr-2"/> Open Holo View</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MemoryCore;
