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
            if (queryVector.length === 0) {
                addLog('ERROR', 'VECTOR_CORE: Failed to generate search embedding.');
                setIsSearching(false);
                return;
            }
            
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
                        await neuralVault.saveVector(id, embedding, { name: file.name });
                    }
                } catch (err: any) { 
                    console.error("Index fail:", err);
                    addLog('ERROR', `INGEST_FAIL: Vector indexing failed for ${file.name}`);
                }
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
                const scoreB = semanticResults.find(r => r.id === a.id)?.score || 0;
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
        <div className="flex h-full w-full font-sans bg-[var(--bg-main)] border border-[var(--border-main)] rounded-[2rem] overflow-hidden relative transition-colors duration-500">
            <div className="w-80 border-r border-[var(--border-main)] bg-[var(--bg-side)] backdrop-blur flex flex-col shrink-0">
                <div className="p-6 border-b border-[var(--border-main)] flex items-center justify-between bg-black/5">
                    <div className="flex items-center gap-3">
                        <Database className="w-5 h-5 text-[#9d4edd] animate-pulse" />
                        <span className="text-xs font-black font-mono uppercase tracking-[0.2em] text-[var(--text-main)]">Neural Vault</span>
                    </div>
                    {isIndexing && <Loader2 size={14} className="text-[#9d4edd] animate-spin" />}
                </div>
                <div className="p-4 border-b border-[var(--border-main)]">
                    <form onSubmit={handleVectorSearch} className="relative group">
                        <input 
                            value={searchQuery} 
                            onChange={e => setSearchQuery(e.target.value)} 
                            placeholder="Semantic Vector Search..." 
                            className="w-full bg-black/5 border border-[var(--border-main)] pl-4 pr-10 py-3 text-[11px] font-mono text-[var(--text-main)] focus:border-[#9d4edd] outline-none rounded-xl shadow-inner transition-all" 
                        />
                        <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                            {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                        </button>
                    </form>
                    {semanticResults && (
                        <button onClick={() => { setSearchQuery(''); setSemanticResults(null); }} className="mt-2 text-[9px] font-mono text-[#9d4edd] hover:underline uppercase tracking-widest">Reset Search</button>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {filteredArtifacts.map(art => {
                        const semResult = semanticResults?.find(r => r.id === art.id);
                        return (
                            <button 
                                key={art.id} 
                                onClick={() => { setSelectedArtifact(art); audio.playClick(); }} 
                                className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col gap-2 ${selectedArtifact?.id === art.id ? 'border-[#9d4edd] bg-[#9d4edd]/10' : 'border-transparent hover:bg-black/5'}`}
                            >
                                <div className="text-[11px] font-bold text-[var(--text-main)] truncate uppercase tracking-tight">{art.name}</div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] text-[var(--text-muted)] font-mono uppercase">{(art.analysis?.classification || 'RAW').substring(0, 15)}</span>
                                    {semResult && (
                                        <div className="flex items-center gap-1.5"><Zap size={8} className="text-[#10b981]" /><span className="text-[8px] text-[#10b981] font-bold">{Math.round(semResult.score * 100)}%</span></div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                    {filteredArtifacts.length === 0 && !isLoading && (
                        <div className="py-20 text-center opacity-20 flex flex-col items-center gap-4 text-[var(--text-muted)]">
                            <Search size={32} /><span className="text-[10px] font-mono uppercase">No semantic matches</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col relative bg-transparent">
                <div className="h-16 border-b border-[var(--border-main)] bg-[var(--bg-header)] backdrop-blur flex items-center justify-between px-8 shrink-0 z-20">
                    <div className="flex bg-black/5 p-1.5 rounded-xl border border-[var(--border-main)] shadow-inner">
                        {[
                            { id: 'GRID', icon: LayoutGrid, label: 'Matrix' },
                            { id: 'GRAPH', icon: BrainCircuit, label: 'Lattice' },
                            { id: 'XRAY', icon: Radar, label: 'Power X-Ray' }
                        ].map(btn => (
                            <button 
                                key={btn.id} 
                                onClick={() => { setViewMode(btn.id as any); audio.playClick(); }} 
                                className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all ${viewMode === btn.id ? 'bg-[var(--text-main)] text-[var(--bg-main)] shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5'}`}
                            >
                                <btn.icon size={14} /> {btn.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3 text-[var(--text-muted)] text-[10px] font-mono uppercase">
                            <Database size={14} /> Artifacts: {artifacts.length}
                        </div>
                        <label className="flex items-center gap-3 px-6 py-2.5 bg-[#9d4edd] text-black border border-transparent rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer shadow-lg hover:scale-105 active:scale-95 transition-all">
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
                                        className={`p-6 bg-[var(--bg-panel)] border rounded-[2rem] transition-all cursor-pointer group shadow-xl relative overflow-hidden ${selectedArtifact?.id === art.id ? 'border-[#9d4edd] ring-4 ring-[#9d4edd]/5' : 'border-[var(--border-main)] hover:border-[#9d4edd]/30'}`}
                                    >
                                        <div className="aspect-square bg-black/5 rounded-3xl flex items-center justify-center text-[var(--text-muted)] group-hover:text-[#9d4edd] transition-all mb-6 shadow-inner border border-[var(--border-main)] relative overflow-hidden">
                                            <FileIcon size={48} className="group-hover:scale-110 transition-transform duration-700" />
                                        </div>
                                        <div className="text-xs font-black text-[var(--text-main)] uppercase truncate font-mono mb-2 tracking-tight">{art.name}</div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[8px] text-[var(--text-muted)] font-mono uppercase tracking-widest">{(art.analysis?.classification || 'UNCLASSIFIED').substring(0, 12)}</span>
                                            <span className="text-[8px] text-[var(--text-muted)] opacity-50 font-mono">ID_{art.id.substring(0,6)}</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <AnimatePresence>
                {selectedArtifact && viewMode !== 'XRAY' && (
                    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed top-0 right-0 bottom-0 w-[480px] bg-[var(--bg-panel)] backdrop-blur-3xl border-l border-[var(--border-main)] z-[300] shadow-2xl flex flex-col p-10 gap-10">
                        <div className="flex justify-between items-start shrink-0">
                            <div className="space-y-1 text-[var(--text-main)]">
                                <h2 className="text-2xl font-black uppercase font-mono tracking-tighter truncate max-w-[320px]">{selectedArtifact.name}</h2>
                                <p className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-widest">{selectedArtifact.type} // {new Date(selectedArtifact.timestamp).toLocaleString()}</p>
                            </div>
                            <button onClick={() => setSelectedArtifact(null)} className="p-2 hover:bg-black/5 rounded-xl transition-all text-[var(--text-muted)] hover:text-[var(--text-main)]"><X size={24}/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-10 pr-2">
                            <div className="aspect-video bg-black/5 rounded-[2.5rem] border border-[var(--border-main)] flex items-center justify-center shadow-inner group/prev relative overflow-hidden text-[var(--text-muted)]">
                                <FileText size={80} className="group-hover:scale-110 transition-transform duration-1000" />
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest px-2">
                                    <Info size={14} className="text-[#9d4edd]" /> Intelligence Synthesis
                                </div>
                                <div className="p-8 bg-black/5 border border-[var(--border-main)] rounded-[2.5rem] text-[13px] font-mono text-[var(--text-main)] leading-relaxed italic border-l-4 border-l-[#9d4edd] shadow-inner">
                                    "{selectedArtifact.analysis?.summary || 'Structural integrity scan pending.'}"
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 shrink-0">
                            <button onClick={() => openHoloProjector({ id: selectedArtifact.id, title: selectedArtifact.name, type: 'TEXT', content: selectedArtifact.analysis?.summary || selectedArtifact.name })} className="w-full py-5 bg-[#9d4edd] text-black rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
                                <BrainCircuit size={18} /> Materialize Projection
                            </button>
                            <button onClick={async () => { if (confirm('Purge artifact?')) { await neuralVault.deleteArtifact(selectedArtifact.id); setSelectedArtifact(null); loadArtifacts(); audio.playError(); } }} className="w-full py-4 bg-transparent border border-[var(--border-main)] rounded-2xl text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-red-500 hover:border-red-500/30 transition-all flex items-center justify-center gap-2">
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