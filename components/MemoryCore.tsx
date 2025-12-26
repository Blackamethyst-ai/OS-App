import React, { useEffect, useState, useMemo } from 'react';
import { neuralVault } from '../services/persistenceService';
import { 
    promptSelectKey, classifyArtifact, generateEmbedding, fileToGenerativePart
} from '../services/geminiService';
import { useAppStore } from '../store';
import { 
    File as FileIcon, Loader2, Search, 
    Database, X, Upload, Activity, FileText, BrainCircuit,
    LayoutGrid, Boxes, Info, Trash2, Radar, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StoredArtifact } from '../types';
import KnowledgeGraph from './KnowledgeGraph';
import PowerXRay from './PowerXRay';
import { audio } from '../services/audioService';

const MemoryCore: React.FC = () => {
    const { openHoloProjector, addLog } = useAppStore();
    
    const [artifacts, setArtifacts] = useState<StoredArtifact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'GRID' | 'GRAPH' | 'XRAY'>('GRID');
    
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
        if (!searchQuery.trim()) { 
            setSemanticResults(null); 
            return; 
        }
        
        setIsSearching(true);
        addLog('SYSTEM', `VECTOR_CORE: Analyzing semantic intent for "${searchQuery}"...`);
        audio.playClick();

        try {
            const hasKey = await window.aistudio?.hasSelectedApiKey();
            if (!hasKey) { 
                await promptSelectKey(); 
                setIsSearching(false); 
                return; 
            }
            const queryVector = await generateEmbedding(searchQuery);
            const results = await neuralVault.searchVectors(queryVector, 15);
            const highConfidence = results.filter(r => r.score > 0.35);
            setSemanticResults(highConfidence);
            addLog('SUCCESS', `VECTOR_CORE: Located ${highConfidence.length} relevant neural fragments.`);
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
            addLog('SYSTEM', `INGEST: Committing ${files.length} artifacts to long-term memory...`);
            for (const file of files) {
                try {
                    const hasKey = await window.aistudio?.hasSelectedApiKey();
                    if (!hasKey) { await promptSelectKey(); break; }
                    
                    const fileData = await fileToGenerativePart(file);
                    const analysisRes = await classifyArtifact(fileData);
                    const analysis = analysisRes.ok ? analysisRes.value : null;
                    const id = await neuralVault.saveArtifact(file, analysis);
                    
                    const textForVector = analysis?.summary || file.name;
                    const embedding = await generateEmbedding(textForVector);
                    if (embedding.length > 0) {
                        await neuralVault.saveVector(id, embedding);
                    }
                } catch (err: any) { console.error("Index fail:", err); }
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

    const graphNodes = useMemo(() => {
        return filteredArtifacts.map(a => ({
            id: a.id,
            label: a.name,
            type: 'CONCEPT' as const,
            strength: a.analysis?.ambiguityScore ? 100 - a.analysis.ambiguityScore : 70,
            connections: a.tags?.map(t => t) || [],
            color: a.type.includes('image') ? '#d946ef' : '#9d4edd',
            data: a.analysis
        }));
    }, [filteredArtifacts]);

    return (
        <div className="flex h-full w-full font-sans bg-[#030303] border border-[#1f1f1f] rounded-[2rem] overflow-hidden relative">
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
                        <input 
                            value={searchQuery} 
                            onChange={e => setSearchQuery(e.target.value)} 
                            placeholder="Semantic Search..." 
                            className="w-full bg-[#050505] border border-[#333] pl-4 pr-10 py-3 text-[11px] font-mono text-white focus:border-[#9d4edd] outline-none rounded-xl shadow-inner transition-all" 
                        />
                        <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                            {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                        </button>
                    </form>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {filteredArtifacts.map(art => (
                        <button 
                            key={art.id} 
                            onClick={() => { setSelectedArtifact(art); audio.playClick(); }} 
                            className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col gap-2 ${selectedArtifact?.id === art.id ? 'border-[#9d4edd] bg-[#9d4edd]/10' : 'border-transparent hover:bg-white/5'}`}
                        >
                            <div className="text-[11px] font-bold text-gray-200 truncate uppercase tracking-tight">{art.name}</div>
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] text-gray-600 font-mono uppercase">{(art.analysis?.classification || 'RAW').substring(0, 15)}</span>
                                {semanticResults && (
                                    <span className="text-[8px] text-[#10b981] font-bold">
                                        {Math.round((semanticResults.find(r => r.id === art.id)?.score || 0) * 100)}%
                                    </span>
                                )}
                            </div>
                        </button>
                    ))}
                    {filteredArtifacts.length === 0 && !isLoading && (
                        <div className="py-20 text-center opacity-20 flex flex-col items-center gap-4">
                            <Search size={32} />
                            <span className="text-[10px] font-mono uppercase">No semantic matches</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Stage */}
            <div className="flex-1 flex flex-col relative bg-black/40">
                <div className="h-16 border-b border-[#1f1f1f] bg-[#0a0a0a]/80 backdrop-blur flex items-center justify-between px-8 shrink-0 z-20">
                    <div className="flex bg-[#111] p-1.5 rounded-xl border border-[#333] shadow-inner">
                        {[
                            { id: 'GRID', icon: LayoutGrid, label: 'Matrix' },
                            { id: 'GRAPH', icon: BrainCircuit, label: 'Lattice' },
                            { id: 'XRAY', icon: Radar, label: 'Power X-Ray' }
                        ].map(btn => (
                            <button 
                                key={btn.id} 
                                onClick={() => { setViewMode(btn.id as any); audio.playClick(); }} 
                                className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all ${viewMode === btn.id ? 'bg-[#1f1f1f] text-white border border-white/10 shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                <btn.icon size={14} /> {btn.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3 text-gray-500 text-[10px] font-mono uppercase">
                            <Database size={14} /> Artifacts: {artifacts.length}
                        </div>
                        <label className="flex items-center gap-3 px-6 py-2.5 bg-[#9d4edd] text-black border border-transparent rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer shadow-[0_10px_40px_rgba(157,78,221,0.3)] hover:scale-105 active:scale-95 transition-all">
                            <Upload size={16} /> Secure Ingest
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
                            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 overflow-y-auto h-full custom-scrollbar">
                                {filteredArtifacts.map(art => (
                                    <motion.div 
                                        layout
                                        key={art.id} 
                                        onClick={() => { setSelectedArtifact(art); audio.playClick(); }} 
                                        className={`p-6 bg-[#0a0a0a] border rounded-[2rem] transition-all cursor-pointer group shadow-2xl relative overflow-hidden ${selectedArtifact?.id === art.id ? 'border-[#9d4edd] ring-4 ring-[#9d4edd]/5' : 'border-[#222] hover:border-white/20'}`}
                                    >
                                        <div className="aspect-square bg-black rounded-3xl flex items-center justify-center text-gray-700 group-hover:text-[#9d4edd] transition-all mb-6 shadow-inner border border-white/5 relative overflow-hidden">
                                            <FileIcon size={48} className="group-hover:scale-110 transition-transform duration-700" />
                                            {art.type.includes('image') && (
                                                <div className="absolute inset-0 bg-gradient-to-tr from-[#d946ef]/10 to-transparent opacity-20" />
                                            )}
                                        </div>
                                        <div className="text-xs font-black text-white uppercase truncate font-mono mb-2 tracking-tight">{art.name}</div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[8px] text-gray-600 font-mono uppercase tracking-widest">{(art.analysis?.classification || 'UNCLASSIFIED').substring(0, 12)}</span>
                                            <span className="text-[8px] text-gray-800 font-mono">ID_{art.id.substring(0,6)}</span>
                                        </div>
                                    </motion.div>
                                ))}
                                {filteredArtifacts.length === 0 && (
                                    <div className="col-span-full h-full flex flex-col items-center justify-center opacity-10 py-32 grayscale">
                                        <Boxes size={120} className="animate-pulse" />
                                        <p className="text-2xl font-mono uppercase tracking-[0.8em]">Vault Standby</p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Inspector Sidepanel */}
            <AnimatePresence>
                {selectedArtifact && viewMode !== 'XRAY' && (
                    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed top-0 right-0 bottom-0 w-[480px] bg-[#0a0a0a]/98 backdrop-blur-3xl border-l border-white/10 z-[300] shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col p-10 gap-10">
                        <div className="flex justify-between items-start shrink-0">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black text-white uppercase font-mono tracking-tighter truncate max-w-[320px]">{selectedArtifact.name}</h2>
                                <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">{selectedArtifact.type} // {new Date(selectedArtifact.timestamp).toLocaleString()}</p>
                            </div>
                            <button onClick={() => setSelectedArtifact(null)} className="p-2 hover:bg-white/5 rounded-xl transition-all"><X size={24}/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-10 pr-2">
                            <div className="aspect-video bg-black rounded-[2.5rem] border border-white/5 flex items-center justify-center shadow-inner group/prev relative overflow-hidden">
                                <FileText size={80} className="text-gray-800 group-hover:scale-110 transition-transform duration-1000" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#9d4edd]/10 to-transparent opacity-0 group-hover/prev:opacity-100 transition-opacity" />
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">
                                    <Info size={14} className="text-[#9d4edd]" /> Intelligence Synthesis
                                </div>
                                <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[2.5rem] text-[13px] font-mono text-gray-300 leading-relaxed italic border-l-4 border-l-[#9d4edd] shadow-2xl">
                                    "{selectedArtifact.analysis?.summary || 'Structural integrity scan pending. No latent intelligence mapped in current buffer.'}"
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">
                                    <Activity size={14} className="text-[#22d3ee]" /> Technical Metadata
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-5 bg-black rounded-2xl border border-white/5">
                                        <div className="text-[8px] text-gray-600 uppercase mb-2">Classification</div>
                                        <div className="text-[11px] font-bold text-white uppercase">{selectedArtifact.analysis?.classification || 'RAW_BUFFER'}</div>
                                    </div>
                                    <div className="p-5 bg-black rounded-2xl border border-white/5">
                                        <div className="text-[8px] text-gray-600 uppercase mb-2">Entropy Score</div>
                                        <div className="text-[11px] font-bold text-white uppercase">{selectedArtifact.analysis?.ambiguityScore || 0}%</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 shrink-0">
                            <button 
                                onClick={() => openHoloProjector({ id: selectedArtifact.id, title: selectedArtifact.name, type: 'TEXT', content: selectedArtifact.analysis?.summary || selectedArtifact.name })} 
                                className="w-full py-5 bg-[#9d4edd] text-black rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                            >
                                <BrainCircuit size={18} /> Materialize Projection
                            </button>
                            <button 
                                onClick={async () => { if (confirm('Initiate sector purge for this artifact?')) { await neuralVault.deleteArtifact(selectedArtifact.id); setSelectedArtifact(null); loadArtifacts(); audio.playError(); } }} 
                                className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-red-500 hover:border-red-500/30 transition-all flex items-center justify-center gap-2"
                            >
                                <Trash2 size={16} /> Execute Purge
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MemoryCore;