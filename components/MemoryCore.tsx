
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
import PowerXRay from './PowerXRay';
import { audio } from '../services/audioService';

const MemoryCore: React.FC = () => {
    const { openHoloProjector, addLog, setProcessState } = useAppStore();
    
    const [artifacts, setArtifacts] = useState<StoredArtifact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'GRID' | 'GRAPH' | 'XRAY' | 'VISION'>('GRAPH');
    
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
            if (!hasKey) { 
                await promptSelectKey(); 
                setIsSearching(false); 
                return; 
            }

            // 1. Generate embedding for query
            const queryVector = await generateEmbedding(searchQuery);
            if (queryVector.length === 0) throw new Error("Vector synthesis failed");

            // 2. Query IndexedDB for nearest neighbors
            const results = await neuralVault.searchVectors(queryVector, 10);
            
            // 3. Filter for high-confidence conceptual matches
            const highConfidence = results.filter(r => r.score > 0.4);
            setSemanticResults(highConfidence);
            
            addLog('SUCCESS', `VECTOR_CORE: Conceptual alignment found for ${highConfidence.length} nodes.`);
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
            addLog('SYSTEM', `INGEST_INIT: Securing ${files.length} artifacts in Neural Vault...`);
            
            for (const file of files) {
                try {
                    const hasKey = await window.aistudio?.hasSelectedApiKey();
                    if (!hasKey) { await promptSelectKey(); break; }

                    const fileData = await fileToGenerativePart(file);
                    
                    const analysisResult = await classifyArtifact(fileData);
                    const analysis = analysisResult.ok ? analysisResult.value : null;
                    
                    const artifactId = await neuralVault.saveArtifact(file, analysis);
                    
                    const summary = analysis?.summary || file.name;
                    const embedding = await generateEmbedding(summary);
                    if (embedding.length > 0) {
                        await neuralVault.saveVector(artifactId, embedding);
                    }

                    addLog('SUCCESS', `LATTICE_SYNC: "${file.name}" indexed semantically.`);
                } catch (err: any) {
                    addLog('ERROR', `INGEST_FAIL: ${err.message}`);
                }
            }
            
            setIsIndexing(false);
            loadArtifacts();
            audio.playSuccess();
        }
    };

    const graphNodes = useMemo<KnowledgeNode[]>(() => {
        return artifacts.map(art => {
            const semanticMatch = semanticResults?.find(r => r.id === art.id);
            return {
                id: art.id,
                label: art.name,
                type: 'CONCEPT',
                connections: [],
                strength: semanticMatch ? Math.round(semanticMatch.score * 100) : (100 - (art.analysis?.ambiguityScore || 0)),
                color: semanticMatch ? '#22d3ee' : (art.type === 'application/pdf' ? '#f59e0b' : '#9d4edd'),
                data: art.analysis || undefined,
                artifactRef: art
            };
        });
    }, [artifacts, semanticResults]);

    const filteredArtifacts = useMemo<StoredArtifact[]>(() => {
        if (semanticResults) {
            return semanticResults
                .map(res => artifacts.find(a => a.id === res.id))
                .filter(Boolean) as StoredArtifact[];
        }
        if (viewMode === 'VISION') {
            return artifacts.filter(a => 
                (a.analysis?.classification === 'RESEARCH_FINDING' || a.analysis?.classification === 'CONSENSUS_LEDGER') &&
                a.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        return artifacts.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [artifacts, searchQuery, semanticResults, viewMode]);

    const getScoreIcon = (score: number) => {
        if (score > 0.8) return <SignalHigh size={12} className="text-[#10b981]" />;
        if (score > 0.6) return <SignalMedium size={12} className="text-[#22d3ee]" />;
        return <SignalLow size={12} className="text-[#f59e0b]" />;
    };

    return (
        <div className="flex h-full w-full font-sans bg-[#030303] border border-[#1f1f1f] rounded-xl overflow-hidden relative">
            
            {/* Sidebar: Index & List */}
            <div className="w-80 border-r border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur flex flex-col shrink-0">
                <div className="p-6 border-b border-[#1f1f1f] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Brain className="w-5 h-5 text-[#9d4edd] animate-pulse" />
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
                            className="w-full bg-[#050505] border border-[#333] pl-4 pr-10 py-2.5 text-[10px] font-mono text-white focus:border-[#9d4edd] outline-none rounded-lg"
                        />
                        <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#9d4edd] transition-colors">
                            {isSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                        </button>
                    </form>
                    {semanticResults && (
                        <div className="mt-3 flex justify-between items-center px-1">
                            <span className="text-[8px] font-mono text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                                <ShieldCheck size={10}/> Vector Match Active
                            </span>
                            <button onClick={() => { setSemanticResults(null); setSearchQuery(''); }} className="text-[8px] font-mono text-gray-600 hover:text-white uppercase">Reset</button>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    <div className="text-[8px] font-mono text-gray-600 uppercase tracking-widest mb-3 flex justify-between items-center">
                        <span>Stored Objects</span>
                        <span>{filteredArtifacts.length}</span>
                    </div>
                    
                    {filteredArtifacts.map(art => {
                        const scoreObj = semanticResults?.find(r => r.id === art.id);
                        return (
                            <button 
                                key={art.id} 
                                onClick={() => setSelectedArtifact(art)} 
                                className={`w-full text-left p-3 rounded-xl border transition-all group flex flex-col gap-1.5
                                    ${selectedArtifact?.id === art.id ? 'border-[#9d4edd] bg-[#9d4edd]/5' : 'border-transparent hover:border-[#333] hover:bg-white/5'}
                                `}
                            >
                                <div className="flex justify-between items-center gap-2">
                                    <div className="text-[10px] font-bold text-gray-300 truncate uppercase group-hover:text-white transition-colors">{art.name}</div>
                                    {scoreObj && getScoreIcon(scoreObj.score)}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[8px] text-gray-600 font-mono uppercase tracking-tighter">
                                        {art.analysis?.classification || 'RAW_BUFFER'}
                                    </span>
                                    {scoreObj && (
                                        <span className="text-[8px] font-mono text-cyan-500 font-bold">{Math.round(scoreObj.score * 100)}% REL</span>
                                    )}
                                </div>
                            </button>
                        );
                    })}

                    {filteredArtifacts.length === 0 && (
                        <div className="py-20 text-center opacity-10 flex flex-col items-center gap-4">
                            <Database size={40} />
                            <span className="text-[10px] font-mono uppercase">Lattice Void</span>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-black/40 border-t border-[#1f1f1f]">
                    <div className="flex justify-between items-center text-[8px] font-mono text-gray-600 uppercase mb-3 px-1">
                        <span>Vault Health</span>
                        <span>NOMINAL</span>
                    </div>
                    <div className="h-1 w-full bg-[#111] rounded-full overflow-hidden mb-2">
                        <div className="h-full bg-[#9d4edd] w-[92%] shadow-[0_0_8px_#9d4edd]" />
                    </div>
                </div>
            </div>

            {/* Main Stage */}
            <div className="flex-1 flex flex-col relative">
                <div className="h-14 border-b border-[#1f1f1f] bg-[#0a0a0a] flex items-center justify-between px-6 shrink-0 z-20">
                    <div className="flex bg-[#111] p-1 rounded-xl border border-[#333]">
                        {[
                            { id: 'GRAPH', icon: BrainCircuit, label: 'Lattice' }, 
                            { id: 'GRID', icon: LayoutGrid, label: 'Matrix' }, 
                            { id: 'VISION', icon: Microscope, label: 'Vision' },
                            { id: 'XRAY', icon: Activity, label: 'X-Ray' }
                        ].map(btn => (
                            <button 
                                key={btn.id} 
                                onClick={() => { setViewMode(btn.id as any); audio.playClick(); }} 
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${viewMode === btn.id ? 'bg-[#1f1f1f] text-white border border-white/5 shadow-inner' : 'text-gray-600 hover:text-gray-300'}`}
                            >
                                <btn.icon size={12} /> {btn.label}
                            </button>
                        ))}
                    </div>
                    <label className="flex items-center gap-2 px-5 py-2 bg-[#9d4edd] text-black border border-transparent rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer shadow-[0_10px_30px_rgba(157,78,221,0.3)] hover:scale-105 active:scale-95 transition-all">
                        <Upload size={14} /> Ingest Artifact
                        <input type="file" multiple className="hidden" onChange={handleFileUpload} />
                    </label>
                </div>

                <div className="flex-1 overflow-hidden relative">
                    <AnimatePresence mode="wait">
                        {viewMode === 'GRAPH' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                                <KnowledgeGraph 
                                    nodes={graphNodes} 
                                    onNodeClick={(n: any) => { 
                                        setSelectedArtifact(n.artifactRef);
                                        audio.playClick();
                                    }} 
                                />
                            </motion.div>
                        )}
                        {(viewMode === 'GRID' || viewMode === 'VISION') && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 overflow-y-auto h-full custom-scrollbar">
                                {filteredArtifacts.map(art => (
                                    <div 
                                        key={art.id} 
                                        onClick={() => { setSelectedArtifact(art); audio.playClick(); }} 
                                        className={`p-6 bg-[#0a0a0a] border rounded-2xl transition-all cursor-pointer group shadow-2xl relative overflow-hidden
                                            ${selectedArtifact?.id === art.id ? 'border-[#9d4edd] ring-1 ring-[#9d4edd]/50' : 'border-[#222] hover:border-[#9d4edd]/50'}
                                        `}
                                    >
                                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#9d4edd]/20 to-transparent" />
                                        <div className="aspect-square bg-[#050505] rounded-xl flex items-center justify-center text-gray-700 group-hover:text-[#9d4edd] transition-colors mb-4 border border-white/5 shadow-inner">
                                            {viewMode === 'VISION' ? <Microscope size={32} /> : <FileIcon size={32} />}
                                        </div>
                                        <div className="text-[10px] font-black text-white uppercase truncate font-mono mb-1">{art.name}</div>
                                        <div className="text-[8px] text-gray-600 font-mono uppercase tracking-widest">{art.analysis?.classification || 'RAW'}</div>
                                    </div>
                                ))}
                                {filteredArtifacts.length === 0 && viewMode === 'VISION' && (
                                    <div className="col-span-full h-full flex flex-col items-center justify-center opacity-10 text-center space-y-4 py-20">
                                        <Microscope size={64} />
                                        <p className="font-mono text-sm uppercase tracking-widest">No Vision findings detected in current cache.</p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                        {viewMode === 'XRAY' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                                <PowerXRay availableSources={artifacts} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Inspect Sidepanel */}
            <AnimatePresence>
                {selectedArtifact && (
                    <motion.div 
                        initial={{ x: '100%' }} 
                        animate={{ x: 0 }} 
                        exit={{ x: '100%' }} 
                        className="fixed top-0 right-0 bottom-0 w-[450px] bg-[#0a0a0a]/98 backdrop-blur-2xl border-l border-white/10 z-[300] shadow-2xl flex flex-col"
                    >
                        <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <Eye size={16} className="text-[#9d4edd]" />
                                <span className="text-xs font-black text-white uppercase font-mono tracking-widest">Vector Inspector</span>
                            </div>
                            <button onClick={() => setSelectedArtifact(null)} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
                            <div className="aspect-video bg-black rounded-3xl border border-[#222] flex items-center justify-center text-gray-800 relative overflow-hidden shadow-inner group/preview">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(157,78,221,0.05)_0%,transparent_70%)] opacity-0 group-hover/preview:opacity-100 transition-opacity" />
                                <FileText size={64} className="group-hover/preview:scale-110 transition-transform duration-700" />
                                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                                    <span className="text-[9px] font-mono text-gray-600 bg-black/80 px-2 py-1 rounded">ID: {selectedArtifact.id.split('-')[0].toUpperCase()}</span>
                                    <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_8px_#10b981]" />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <h2 className="text-2xl font-black text-white uppercase font-mono tracking-tighter leading-none">{selectedArtifact.name}</h2>
                                <div className="flex gap-2">
                                    <span className="text-[8px] font-mono px-2 py-0.5 bg-[#9d4edd]/10 border border-[#9d4edd]/30 text-[#9d4edd] rounded uppercase">{selectedArtifact.type}</span>
                                    <span className="text-[8px] font-mono px-2 py-0.5 bg-white/5 border border-white/10 text-gray-500 rounded uppercase">Updated: {new Date(selectedArtifact.timestamp).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="p-6 bg-[#111] rounded-[2rem] border border-white/5 text-sm font-mono text-gray-300 leading-relaxed italic border-l-4 border-l-[#9d4edd] shadow-xl relative overflow-hidden group/summary">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/summary:opacity-10 transition-opacity"><QuoteIcon size={32}/></div>
                                "{selectedArtifact.analysis?.summary || 'No high-level intelligence summary synthesized for this artifact.'}"
                            </div>

                            <div className="space-y-4">
                                <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest px-1">Semantic Entities</div>
                                <div className="flex flex-wrap gap-2">
                                    {selectedArtifact.analysis?.entities?.map(ent => (
                                        <span key={ent} className="px-3 py-1 bg-black border border-[#333] rounded-full text-[9px] font-mono text-gray-400 hover:border-[#22d3ee] hover:text-[#22d3ee] transition-all cursor-default">{ent}</span>
                                    )) || <span className="text-[9px] text-gray-700 italic">None identified</span>}
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 pt-4">
                                <button className="w-full py-4 bg-[#9d4edd] text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-[0_20px_40px_rgba(157,78,221,0.2)] hover:bg-[#b06bf7] hover:scale-[1.02] transition-all flex items-center justify-center gap-3 active:scale-95 group">
                                    <GitBranch size={16} className="group-hover:rotate-12 transition-transform" />
                                    Branch Research Thread
                                </button>
                                <button 
                                    onClick={() => openHoloProjector({ id: selectedArtifact.id, title: selectedArtifact.name, type: 'TEXT', content: selectedArtifact.analysis?.summary || selectedArtifact.name })}
                                    className="w-full py-4 bg-[#111] text-white border border-[#333] rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/5 hover:border-white/20 transition-all flex items-center justify-center gap-3 active:scale-95"
                                >
                                    <Maximize size={16} />
                                    Open Holographic View
                                </button>
                                <button 
                                    onClick={async () => {
                                        if (confirm('Verify data deletion protocol?')) {
                                            await neuralVault.deleteArtifact(selectedArtifact.id);
                                            setSelectedArtifact(null);
                                            loadArtifacts();
                                            addLog('WARN', 'VAULT: Artifact purged from persistent storage.');
                                            audio.playError();
                                        }
                                    }}
                                    className="w-full py-4 bg-transparent text-red-900 border border-red-900/20 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-900/10 hover:text-red-500 hover:border-red-500/30 transition-all flex items-center justify-center gap-3"
                                >
                                    <Trash2 size={16} />
                                    Execute Purge
                                </button>
                            </div>
                        </div>
                        
                        <div className="h-10 bg-black border-t border-white/5 flex items-center justify-between px-6 text-[8px] font-mono text-gray-700 uppercase tracking-widest">
                            <span>Sovereign_OS // Core_Storage</span>
                            <span>AES_256_ENCRYPTED</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const QuoteIcon = ({ size, className }: { size?: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2H5c-1.25 0-2 .75-2 2v3c0 1.25.75 2 2 2h3c0 1.5-1 2.5-2 3.5-.5.5-1 1.5-1 2.5z" />
        <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2h-3c-1.25 0-2 .75-2 2v3c0 1.25.75 2 2 2h3c0 1.5-1 2.5-2 3.5-.5.5-1 1.5-1 2.5z" />
    </svg>
);

export default MemoryCore;
