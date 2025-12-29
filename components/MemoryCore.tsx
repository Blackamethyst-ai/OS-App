import React, { useEffect, useState, useMemo } from 'react';
import { neuralVault } from '../services/persistenceService';
import { 
    promptSelectKey, classifyArtifact, generateEmbedding, fileToGenerativePart
} from '../services/geminiService';
import { useAppStore } from '../store';
import { 
    File as FileIcon, Loader2, Search, 
    Database, X, Upload, Activity, FileText, BrainCircuit,
    LayoutGrid, Boxes, Info, Trash2, Radar, Zap, Code
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
                    summary: `Self-forged autonomous tool: ${t.id}`,
                    entities: ['Dynamic Capability', 'Autonomic Forge'],
                    ambiguityScore: 0,
                    classification: 'TOOL_MANIFEST'
                },
                tags: ['DYNAMIC_TOOL']
            }));

            const combined = [...files, ...toolArtifacts].sort((a, b) => b.timestamp - a.timestamp);
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
            color: a.type === 'TOOL_MANIFEST' ? '#10b981' : a.type.includes('image') ? '#d946ef' : '#9d4edd',
            data: a.analysis
        }));
    }, [filteredArtifacts]);

    return (
        <div className="flex h-full w-full font-sans bg-transparent border border-[var(--border-main)] rounded-[2.5rem] overflow-hidden relative transition-colors duration-500">
            <div className="w-80 border-r border-[var(--border-main)] bg-[var(--bg-header)] backdrop-blur-3xl flex flex-col shrink-0 z-20">
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-black/10">
                    <div className="flex items-center gap-4">
                        <Database className="w-5 h-5 text-[#9d4edd] animate-pulse" />
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
                        <button onClick={() => { setSearchQuery(''); setSemanticResults(null); }} className="mt-3 text-[9px] font-mono text-[#9d4edd] hover:text-white uppercase tracking-widest font-black transition-colors">Clear Result Cache</button>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {filteredArtifacts.map(art => {
                        const semResult = semanticResults?.find(r => r.id === art.id);
                        return (
                            <button 
                                key={art.id} 
                                onClick={() => { setSelectedArtifact(art); audio.playClick(); }} 
                                className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col gap-2 ${selectedArtifact?.id === art.id ? 'border-[#9d4edd]/50 bg-[#9d4edd]/5 shadow-xl' : 'border-transparent hover:bg-white/5'}`}
                            >
                                <div className="text-[11px] font-black text-white truncate uppercase tracking-tighter font-mono">{art.name}</div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] text-gray-500 font-mono uppercase tracking-widest">{(art.analysis?.classification || 'RAW_FRAGMENT').substring(0, 15)}</span>
                                    {semResult && (
                                        <div className="flex items-center gap-1.5"><Zap size={8} className="text-[#10b981]" /><span className="text-[9px] text-[#10b981] font-black font-mono">{Math.round(semResult.score * 100)}%</span></div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                    {filteredArtifacts.length === 0 && !isLoading && (
                        <div className="py-20 text-center opacity-10 flex flex-col items-center gap-6 grayscale">
                            <Search size={48} /><span className="text-[11px] font-mono uppercase tracking-[0.5em]">No logical matches</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col relative bg-transparent">
                <div className="h-16 border-b border-[var(--border-main)] bg-[var(--bg-header)] backdrop-blur-3xl flex items-center justify-between px-10 shrink-0 z-20">
                    <div className="flex bg-black/20 p-1.5 rounded-xl border border-white/5 shadow-inner">
                        {[
                            { id: 'GRID', icon: LayoutGrid, label: 'Matrix' },
                            { id: 'GRAPH', icon: BrainCircuit, label: 'Lattice' },
                            { id: 'XRAY', icon: Radar, label: 'Analysis' }
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
                            <Database size={14} /> Indexed: {artifacts.length}
                        </div>
                        <label className="flex items-center gap-4 px-8 py-2.5 bg-[#9d4edd] text-black border border-transparent rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer shadow-[0_0_30px_rgba(157,78,221,0.3)] hover:scale-105 active:scale-95 transition-all">
                            <Upload size={18} /> Ingest
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
                            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10 overflow-y-auto h-full custom-scrollbar pb-32">
                                {filteredArtifacts.map(art => (
                                    <motion.div 
                                        layout
                                        key={art.id} 
                                        onClick={() => { setSelectedArtifact(art); audio.playClick(); }} 
                                        className={`p-8 bg-transparent crystalline rounded-[3rem] transition-all cursor-pointer group shadow-2xl relative overflow-hidden ${selectedArtifact?.id === art.id ? 'border-white/40 ring-4 ring-white/5' : 'border-white/10 hover:border-white/30'}`}
                                    >
                                        <div className="aspect-square glass-action rounded-[2.5rem] flex items-center justify-center text-gray-600 group-hover:text-white transition-all mb-8 shadow-inner relative overflow-hidden">
                                            {art.type === 'TOOL_MANIFEST' ? <Code size={64} className="text-[#10b981]" /> : <FileIcon size={64} className="group-hover:scale-110 transition-transform duration-1000" />}
                                        </div>
                                        <div className="text-sm font-black text-white uppercase truncate font-mono mb-2 tracking-tight">{art.name}</div>
                                        <div className="flex justify-between items-center border-t border-white/5 pt-4">
                                            <span className="text-[9px] text-gray-500 font-mono uppercase tracking-widest">{(art.analysis?.classification || 'RAW').substring(0, 12)}</span>
                                            <span className="text-[8px] text-gray-700 font-mono">ID_{art.id.substring(0,4)}</span>
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
                    <motion.div 
                        initial={{ x: '100%' }} 
                        animate={{ x: 0 }} 
                        exit={{ x: '100%' }} 
                        className="fixed top-0 right-0 bottom-0 w-[520px] bg-[var(--bg-header)] backdrop-blur-3xl border-l border-white/10 z-[300] shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col p-12 gap-12 glass-drawer-edge"
                    >
                        <div className="flex justify-between items-start shrink-0">
                            <div className="space-y-2 text-white">
                                <h2 className="text-3xl font-black uppercase font-mono tracking-tighter truncate max-w-[360px] leading-tight">{selectedArtifact.name}</h2>
                                <p className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.4em]">{selectedArtifact.type} // {new Date(selectedArtifact.timestamp).toLocaleTimeString()}</p>
                            </div>
                            <button onClick={() => setSelectedArtifact(null)} className="p-3 hover:bg-white/5 rounded-2xl transition-all text-gray-500 hover:text-white"><X size={28}/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-12 pr-4">
                            <div className="aspect-video glass-action rounded-[3rem] flex items-center justify-center shadow-2xl group/prev relative overflow-hidden text-gray-700">
                                {selectedArtifact.type === 'TOOL_MANIFEST' ? <Code size={100} className="text-[#10b981]" /> : <FileText size={100} className="group-hover:scale-110 group-hover:text-white transition-all duration-1000" />}
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-4 text-[11px] font-black text-gray-500 uppercase tracking-[0.4em] px-2">
                                    <Info size={16} className="text-[#9d4edd]" /> Intelligent Manifest
                                </div>
                                <div className="p-10 bg-black/40 border border-white/5 rounded-[3.5rem] text-[15px] font-mono text-gray-300 leading-relaxed italic border-l-[6px] border-l-[#9d4edd] shadow-inner">
                                    "{selectedArtifact.analysis?.summary || 'Integrity scan pending in background daemon.'}"
                                </div>
                            </div>

                            {selectedArtifact.tags && selectedArtifact.tags.length > 0 && (
                                <div className="flex flex-wrap gap-3 px-2">
                                    {selectedArtifact.tags.map(tag => (
                                        <span key={tag} className="px-5 py-2 bg-white/5 rounded-full border border-white/10 text-[9px] font-black font-mono text-gray-500 uppercase tracking-widest">{tag}</span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-5 shrink-0 pt-10 border-t border-white/5">
                            <button onClick={() => openHoloProjector({ id: selectedArtifact.id, title: selectedArtifact.name, type: selectedArtifact.type === 'TOOL_MANIFEST' ? 'CODE' : 'TEXT', content: selectedArtifact.analysis?.summary || selectedArtifact.name })} className="w-full py-6 bg-[#9d4edd] text-black rounded-[2rem] text-[12px] font-black uppercase tracking-[0.5em] shadow-[0_20px_50px_rgba(157,78,221,0.4)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-5">
                                <BrainCircuit size={22} /> Project Manifest
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