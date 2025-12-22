
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

const ArtifactDetailPanel: React.FC<{ art: StoredArtifact, onClose: () => void, onDigitize: any }> = ({ art, onClose, onDigitize }) => {
    const { addResearchTask, addLog, openHoloProjector } = useAppStore();
    
    const handleBranch = () => {
        const query = `Strategic analysis of ${art.name}: ${art.analysis?.summary.substring(0, 50)}...`;
        addResearchTask({
            id: crypto.randomUUID(),
            query,
            status: 'QUEUED',
            progress: 0,
            logs: [`Branched from artifact: ${art.id}`],
            timestamp: Date.now()
        });
        addLog('SUCCESS', `LATTICE_BRANCH: New research task initialized for "${art.name}"`);
        onClose();
    };

    return (
        <motion.div 
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            className="fixed top-0 right-0 bottom-0 w-[450px] bg-[#0a0a0a]/98 backdrop-blur-2xl border-l border-white/10 z-[300] shadow-[-20px_0_60px_rgba(0,0,0,0.8)] flex flex-col"
        >
            <div className="h-16 border-b border-white/5 bg-white/[0.02] flex items-center justify-between px-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#9d4edd]/20 rounded-lg text-[#9d4edd]">
                        <Info size={18} />
                    </div>
                    <div>
                        <h3 className="text-xs font-black font-mono text-white uppercase tracking-widest">Artifact Insight</h3>
                        <p className="text-[8px] text-gray-500 font-mono tracking-tighter uppercase">{art.id.split('-')[0]}</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <X size={20} className="text-gray-500 hover:text-white" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-10">
                {/* Meta Header */}
                <div className="space-y-4">
                    <div className="aspect-video bg-black border border-[#222] rounded-2xl flex items-center justify-center relative overflow-hidden group">
                        {art.type.startsWith('image/') ? (
                            <img src={URL.createObjectURL(art.data)} className="w-full h-full object-contain" />
                        ) : (
                            <div className="flex flex-col items-center gap-3 opacity-30">
                                <FileText size={48} />
                                <span className="text-[10px] font-mono uppercase tracking-[0.4em]">{art.type.split('/')[1]}</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button onClick={() => openHoloProjector({ id: art.id, title: art.name, type: art.type.startsWith('image/') ? 'IMAGE' : 'TEXT', content: art.type.startsWith('image/') ? URL.createObjectURL(art.data) : '' })} className="p-3 bg-white text-black rounded-full shadow-2xl hover:scale-110 transition-transform">
                                <Maximize size={20} />
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-black text-white font-mono uppercase tracking-tighter">{art.name}</h2>
                        <span className="text-[8px] font-mono text-gray-600 uppercase border border-white/10 px-2 py-1 rounded">{new Date(art.timestamp).toLocaleDateString()}</span>
                    </div>
                </div>

                {/* Analysis Core */}
                {art.analysis ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-[#111] border border-white/5 rounded-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-3 opacity-5"><Activity size={24} /></div>
                                <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest block mb-1">Ambiguity Score</span>
                                <span className="text-xl font-black font-mono text-white">{art.analysis.ambiguityScore}%</span>
                            </div>
                            <div className="p-4 bg-[#111] border border-white/5 rounded-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-3 opacity-5"><ShieldCheck size={24} /></div>
                                <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest block mb-1">Classification</span>
                                <span className="text-xs font-black font-mono text-[#9d4edd] uppercase">{art.analysis.classification}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest flex items-center gap-2">
                                <FileJson size={10} /> Neural Summary
                            </span>
                            <div className="p-4 bg-black/40 border border-white/5 rounded-2xl text-xs font-mono text-gray-300 leading-relaxed italic border-l-4 border-l-[#9d4edd]">
                                "{art.analysis.summary}"
                            </div>
                        </div>

                        <div className="space-y-2">
                            <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest flex items-center gap-2">
                                <Tag size={10} /> Entity Map
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {art.analysis.entities.map((ent, i) => (
                                    <span key={i} className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[9px] font-mono text-[#22d3ee] uppercase hover:bg-[#22d3ee]/10 hover:border-[#22d3ee]/40 transition-colors cursor-default">
                                        #{ent}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-12 text-center border border-dashed border-white/10 rounded-3xl opacity-30">
                        <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin" />
                        <p className="text-[10px] font-mono uppercase tracking-widest leading-relaxed">Identity de-scrambling in progress...<br/>Waiting for neural indexing ACK</p>
                    </div>
                )}

                {/* Tactical Actions */}
                <div className="pt-8 border-t border-white/5 space-y-3">
                    <button 
                        onClick={(e) => onDigitize(art.id, e)}
                        className="w-full py-4 bg-[#111] border border-white/10 hover:border-[#22d3ee] hover:text-[#22d3ee] text-white text-[10px] font-black uppercase rounded-2xl transition-all flex items-center justify-center gap-3 group"
                    >
                        <Scan size={14} className="group-hover:rotate-180 transition-transform duration-700" /> Full Structural Digitization
                    </button>
                    <button 
                        onClick={handleBranch}
                        className="w-full py-4 bg-[#9d4edd]/10 border border-[#9d4edd]/30 hover:bg-[#9d4edd] hover:text-black text-[#9d4edd] text-[10px] font-black uppercase rounded-2xl transition-all flex items-center justify-center gap-3 group"
                    >
                        <GitBranch size={14} className="group-hover:translate-x-1 transition-transform" /> Branch Research Task
                    </button>
                    <button 
                        onClick={onClose}
                        className="w-full py-4 bg-black border border-white/5 text-gray-700 hover:text-red-500 hover:border-red-500/30 text-[10px] font-black uppercase rounded-2xl transition-all flex items-center justify-center gap-3 group"
                    >
                        <Trash2 size={14} /> Purge Artifact
                    </button>
                </div>
            </div>

            <div className="h-10 bg-black border-t border-white/5 flex items-center justify-center text-[8px] font-mono text-gray-700 uppercase tracking-[0.4em]">
                Secure Enclave Protocol // Metaventions OS
            </div>
        </motion.div>
    );
};

const MemoryCore: React.FC = () => {
    const { openHoloProjector, addLog, setProcessState } = useAppStore();
    const processData = useAppStore(state => state.process);
    
    const vaultInsights: any[] = (processData as any)?.vaultInsights || [];

    const [artifacts, setArtifacts] = useState<StoredArtifact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [isIndexing, setIsIndexing] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'GRID' | 'GRAPH' | 'LATTICE' | 'STACKS' | 'XRAY'>('GRID');
    const [semanticResults, setSemanticResults] = useState<string[] | null>(null);
    const [selectedArtifact, setSelectedArtifact] = useState<StoredArtifact | null>(null);
    const [isAnalyzingVault, setIsAnalyzingVault] = useState(false);

    useEffect(() => { loadArtifacts(); }, []);

    const loadArtifacts = async () => {
        setIsLoading(true);
        const items = await neuralVault.getArtifacts();
        setArtifacts(items as StoredArtifact[]);
        setIsLoading(false);
        if (items.length > 2) analyzeVaultContext(items as StoredArtifact[]);
    };

    const analyzeVaultContext = async (items: StoredArtifact[]) => {
        setIsAnalyzingVault(true);
        try {
            const hasKey = await window.aistudio?.hasSelectedApiKey();
            if (!hasKey) return;
            const insights = await generateVaultInsights(items);
            setProcessState({ vaultInsights: insights });
        } catch (e) {
            console.error("Vault analysis failed", e);
        } finally {
            setIsAnalyzingVault(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files) as File[];
            addLog('SYSTEM', `VAULT_INGEST: Buffering ${files.length} primary units...`);
            
            for (const file of files) {
                const id = await neuralVault.saveArtifact(file, null);
                autonomicIndex(id, file);
            }
            await loadArtifacts();
        }
    };

    const autonomicIndex = async (id: string, file: File) => {
        setIsIndexing(prev => new Set(prev).add(id));
        try {
            const hasKey = await window.aistudio?.hasSelectedApiKey();
            if (!hasKey) { await promptSelectKey(); return; }

            const reader = new FileReader();
            const fileDataPromise = new Promise<string>((resolve) => {
                reader.onload = () => resolve((reader.result as string).split(',')[1]);
                reader.readAsDataURL(file);
            });
            const base64 = await fileDataPromise;
            const generativeFile = { inlineData: { data: base64, mimeType: file.type }, name: file.name };

            const analysis = await classifyArtifact(generativeFile);
            const org = await smartOrganizeArtifact({ name: file.name });
            
            const artifact = await neuralVault.getArtifactById(id);
            if (artifact) {
                artifact.analysis = analysis;
                artifact.tags = [...new Set([...(artifact.tags || []), ...analysis.entities, ...(org.tags || [])])];
                artifact.metadata = { ...artifact.metadata, suggestedFolder: org.folder };
                
                const updatedFile = new File([artifact.data], artifact.name, { type: artifact.type });
                await neuralVault.saveArtifact(updatedFile, artifact.analysis);
            }

            addLog('SUCCESS', `NEURAL_INDEX: Artifact "${file.name}" finalized.`);
            await loadArtifacts();
        } catch (err: any) {
            addLog('ERROR', `INDEX_FAIL: ${err.message}`);
        } finally {
            setIsIndexing(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    const handleVaultDirective = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.startsWith('/') && !searchQuery.includes(' ')) {
            triggerSemanticSearch(e);
            return;
        }

        setIsSearching(true);
        addLog('SYSTEM', `COMMAND_VECTOR: Executing directive "${searchQuery}"...`);
        try {
            const hasKey = await window.aistudio?.hasSelectedApiKey();
            if (!hasKey) { await promptSelectKey(); setIsSearching(false); return; }

            const command = await executeVaultDirective(searchQuery, artifacts);
            
            if (command.operation === 'BATCH_TAG') {
                for (const id of (command.targetIds as string[])) {
                    await neuralVault.updateArtifactTags(id, [command.parameters.value]);
                }
                addLog('SUCCESS', `VAULT_OP: Applied tag #${command.parameters.value} to ${command.targetIds.length} items.`);
            } else if (command.operation === 'ARCHIVE') {
                addLog('INFO', `VAULT_OP: Moving ${command.targetIds.length} artifacts to deep archival.`);
            }

            setSearchQuery('');
            await loadArtifacts();
        } catch (err: any) {
            addLog('ERROR', `COMMAND_FAIL: ${err.message}`);
        } finally {
            setIsSearching(false);
        }
    };

    const triggerSemanticSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) {
            setSemanticResults(null);
            return;
        }

        setIsSearching(true);
        addLog('SYSTEM', `SEMANTIC_QUERY: Initializing vector search for "${searchQuery}"...`);
        try {
            const hasKey = await window.aistudio?.hasSelectedApiKey();
            if (!hasKey) { await promptSelectKey(); setIsSearching(false); return; }

            const topIds = await performSemanticSearch(searchQuery, artifacts);
            setSemanticResults(topIds);
            if (topIds.length > 0) {
                addLog('SUCCESS', `SEMANTIC_QUERY: Identified ${topIds.length} high-relevance clusters.`);
            } else {
                addLog('WARN', 'SEMANTIC_QUERY: No semantic matches found in vault.');
            }
        } catch (err: any) {
            addLog('ERROR', `SEARCH_FAIL: ${err.message}`);
        } finally {
            setIsSearching(false);
        }
    };

    const handleDigitize = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        addLog('SYSTEM', 'DIGITIZE_PROTOCOL: Initializing full structural parse...');
        try {
            const hasKey = await window.aistudio?.hasSelectedApiKey();
            if (!hasKey) { await promptSelectKey(); return; }

            const art = await neuralVault.getArtifactById(id) as StoredArtifact | undefined;
            if (!art) throw new Error("Artifact lost.");

            const buffer = await art.data.arrayBuffer();
            const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
            const fileData = { inlineData: { data: base64, mimeType: art.type }, name: art.name };

            const result = await digitizeDocument(fileData);
            
            openHoloProjector({
                id: `digi-${id}`,
                title: `Digitization: ${art.name}`,
                type: 'TEXT',
                content: `# DIGITIZATION REPORT\n${result.abstract}\n\n## SCHEMA\n\`\`\`mermaid\n${result.logicModel}\n\`\`\``
            });

            addLog('SUCCESS', `DIGITIZE_COMPLETE: Multi-layer model generated.`);
        } catch (err: any) {
            addLog('ERROR', `DIGITIZE_FAIL: ${err.message}`);
        }
    };

    const filteredArtifacts = useMemo<StoredArtifact[]>(() => {
        if (semanticResults) {
            return semanticResults
                .map(id => artifacts.find(a => a.id === id))
                .filter(Boolean) as StoredArtifact[];
        }

        return artifacts.filter(a => 
            a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            a.analysis?.classification?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [artifacts, searchQuery, semanticResults]);

    const stacks = useMemo<Record<string, StoredArtifact[]>>(() => {
        const groups: Record<string, StoredArtifact[]> = {};
        filteredArtifacts.forEach(art => {
            const category = art.analysis?.classification || 'UNSORTED';
            if (!groups[category]) groups[category] = [];
            groups[category].push(art);
        });
        return groups;
  }, [filteredArtifacts]);

    const graphNodes = useMemo<KnowledgeNode[]>(() => {
        return artifacts.map(art => ({
            id: art.id,
            label: art.name,
            type: 'CONCEPT',
            connections: [],
            strength: 100 - (art.analysis?.ambiguityScore || 0),
            color: art.type === 'application/pdf' ? '#f59e0b' : '#9d4edd',
            data: art.analysis,
            artifactRef: art // Pass full ref for graph interaction
        }));
    }, [artifacts]);

    return (
        <div className="flex h-full w-full font-sans">
            {/* Left: Intelligence Nexus */}
            <div className="w-80 border-r border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur flex flex-col z-20 shrink-0">
                <div className="p-6 border-b border-[#1f1f1f] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Brain className="w-5 h-5 text-[#9d4edd] animate-pulse" />
                        <span className="text-xs font-black font-mono uppercase tracking-[0.2em] text-white">Mind Nexus</span>
                    </div>
                    {isAnalyzingVault && <Loader2 className="w-4 h-4 text-[#9d4edd] animate-spin" />}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                    {vaultInsights.length === 0 ? (
                        <div className="text-center py-12 opacity-20">
                            <Activity className="w-8 h-8 mx-auto mb-4" />
                            <p className="text-[10px] font-mono uppercase">Lattice Stabilizing...</p>
                        </div>
                    ) : (
                        vaultInsights.map((insight: any) => (
                            <motion.div 
                                initial={{ opacity: 0, x: -20 }} 
                                animate={{ opacity: 1, x: 0 }}
                                key={insight.id} 
                                className="bg-[#111] border border-[#222] p-4 rounded-xl hover:border-[#9d4edd]/50 transition-all group"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    {insight.type === 'DEDUPE' ? <Boxes className="w-3 h-3 text-[#22d3ee]" /> :
                                     insight.type === 'TAG' ? <Tag className="w-3 h-3 text-[#f59e0b]" /> :
                                     insight.type === 'BRIDGE' ? <Network className="w-3 h-3 text-[#9d4edd]" /> :
                                     <Archive className="w-3 h-3 text-gray-500" />}
                                    <span className="text-[8px] font-black font-mono text-gray-500 uppercase tracking-widest">{insight.type} OPTIMIZATION</span>
                                </div>
                                <p className="text-[10px] text-gray-300 font-mono leading-relaxed mb-3">{insight.message}</p>
                                <button 
                                    onClick={() => addLog('SYSTEM', `Executing: ${insight.action}`)}
                                    className="w-full py-1.5 bg-[#1f1f1f] border border-[#333] hover:border-[#9d4edd] text-[9px] font-bold font-mono uppercase rounded-lg transition-all text-[#9d4edd]"
                                >
                                    Execute Fix
                                </button>
                            </motion.div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t border-[#1f1f1f] bg-[#050505]">
                    <div className="flex justify-between text-[9px] font-mono text-gray-600 mb-2 uppercase tracking-widest">
                        <span>Lattice Density</span>
                        <span>{Math.round((artifacts.length / 500) * 100)}%</span>
                    </div>
                    <div className="h-1 bg-[#111] rounded-full overflow-hidden">
                        <div className="h-full bg-[#9d4edd] w-[12%] shadow-[0_0_10px_#9d4edd]" />
                    </div>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex flex-col relative z-10">
                {/* Header */}
                <div className="h-16 border-b border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur-md flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center gap-6 flex-1">
                        <div className="flex bg-[#111] p-1 rounded-xl border border-[#333]">
                            {[
                                { id: 'GRID', icon: LayoutGrid, label: 'Matrix' },
                                { id: 'STACKS', icon: Boxes, label: 'Stacks' },
                                { id: 'GRAPH', icon: BrainCircuit, label: 'Graph' },
                                { id: 'XRAY', icon: Activity, label: 'X-Ray' }
                            ].map(btn => (
                                <button key={btn.id} onClick={() => setViewMode(btn.id as any)} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${viewMode === btn.id ? 'bg-[#1f1f1f] text-white shadow-lg' : 'text-gray-600 hover:text-gray-300'}`}>
                                    <btn.icon size={12} /> {btn.label}
                                </button>
                            ))}
                        </div>
                        
                        {viewMode !== 'XRAY' && (
                            <form onSubmit={handleVaultDirective} className="flex-1 max-w-xl flex items-center gap-2 bg-[#111] p-1 rounded-xl border border-[#333] group focus-within:border-[#9d4edd] transition-colors">
                                <div className="flex items-center gap-2 ml-2">
                                    {semanticResults ? (
                                        <button onClick={() => setSemanticResults(null)} className="p-1.5 bg-[#22d3ee]/20 text-[#22d3ee] rounded-lg hover:bg-[#22d3ee] hover:text-black transition-all">
                                            <X size={12} />
                                        </button>
                                    ) : (
                                        <BrainCircuit className="w-3.5 h-3.5 text-gray-500 group-focus-within:text-[#9d4edd]" />
                                    )}
                                </div>
                                <input 
                                    type="text" 
                                    placeholder={semanticResults ? "Filtering by semantic meaning..." : "Semantic search or vault directive..."} 
                                    value={searchQuery} 
                                    onChange={(e) => setSearchQuery(e.target.value)} 
                                    className="bg-transparent border-none outline-none text-[11px] font-mono flex-1 text-white placeholder:text-gray-700 uppercase"
                                />
                                <button type="submit" disabled={isSearching} className="px-3 py-1 bg-[#1f1f1f] border border-[#333] rounded-lg text-[9px] font-bold text-[#9d4edd] hover:text-white transition-colors">
                                    {isSearching ? <Loader2 size={12} className="animate-spin" /> : 'EXEC'}
                                </button>
                            </form>
                        )}
                    </div>

                    {viewMode !== 'XRAY' && (
                        <div className="flex items-center gap-4 ml-6">
                            <label className="flex items-center gap-2 px-5 py-2 bg-[#9d4edd] hover:bg-[#b06bf7] text-black border border-transparent rounded-xl text-[10px] font-black font-mono uppercase tracking-widest transition-all cursor-pointer shadow-[0_0_20px_rgba(157,78,221,0.4)]">
                                <Upload size={14} /> Ingest
                                <input type="file" multiple className="hidden" onChange={handleFileUpload} />
                            </label>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-hidden">
                    {viewMode === 'XRAY' ? (
                        <div className="h-full w-full">
                            <PowerXRay availableSources={artifacts} />
                        </div>
                    ) : viewMode === 'STACKS' ? (
                        <div className="p-8 space-y-12 overflow-y-auto h-full custom-scrollbar">
                            {(Object.entries(stacks) as [string, StoredArtifact[]][]).map(([name, items]) => (
                                <div key={name}>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-1.5 h-6 bg-[#9d4edd] rounded-full" />
                                        <h2 className="text-sm font-black font-mono uppercase tracking-[0.2em] text-white">{name} <span className="text-gray-600 ml-2">({items.length})</span></h2>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                                        {items.map(art => (
                                            <ArtifactCard key={art.id} art={art} onSelect={() => setSelectedArtifact(art)} isIndexing={isIndexing.has(art.id)} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : viewMode === 'GRID' ? (
                        <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 overflow-y-auto h-full custom-scrollbar">
                            {filteredArtifacts.map(art => (
                                <ArtifactCard key={art.id} art={art} onSelect={() => setSelectedArtifact(art)} isIndexing={isIndexing.has(art.id)} />
                            ))}
                        </div>
                    ) : (
                        <div className="h-full">
                            <KnowledgeGraph nodes={graphNodes} onNodeClick={(node: any) => setSelectedArtifact(node.artifactRef)} />
                        </div>
                    )}
                </div>

                {viewMode !== 'XRAY' && (
                    <div className="h-10 border-t border-[#1f1f1f] bg-[#0a0a0a] flex items-center px-6 justify-between text-[9px] font-mono text-gray-600 uppercase tracking-widest shrink-0">
                        <div className="flex gap-8">
                            <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_5px_#10b981]" /> VAULT_INTEGRITY: 100%</span>
                            <span className="flex items-center gap-2"><Database size={12} /> {artifacts.length} SECTORS INDEXED</span>
                        </div>
                        <div className="flex items-center gap-6">
                            <span className="flex items-center gap-2 text-[#22d3ee] font-black"><Activity size={12} /> SYNC: STABLE</span>
                            <span className="text-gray-800 font-black tracking-[0.3em]">KERN_V4.2.1-VAULT</span>
                        </div>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {selectedArtifact && (
                    <ArtifactDetailPanel 
                        art={selectedArtifact} 
                        onClose={() => setSelectedArtifact(null)} 
                        onDigitize={handleDigitize} 
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

const ArtifactCard = ({ art, onSelect, isIndexing }: any) => {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02, translateY: -5 }}
            onClick={onSelect}
            className={`bg-[#0a0a0a] border border-[#222] p-5 rounded-2xl flex flex-col gap-4 relative group hover:border-[#9d4edd] transition-all shadow-xl cursor-pointer ${isIndexing ? 'animate-pulse' : ''}`}
        >
            <div className="absolute top-4 left-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <div className={`w-2 h-2 rounded-full shadow-[0_0_10px_currentColor] animate-pulse ${art.type === 'application/pdf' ? 'text-amber-500' : 'text-[#22d3ee]'}`} />
                {art.analysis && <ShieldCheck className="w-3 h-3 text-[#10b981]" />}
            </div>
            
            <div className="aspect-square bg-[#050505] border border-white/5 rounded-xl flex items-center justify-center text-gray-600 group-hover:text-[#9d4edd] transition-colors relative overflow-hidden shadow-inner">
                {art.type === 'application/pdf' ? <FileText size={48} /> : <FileIcon size={48} />}
                <div className="absolute inset-0 bg-gradient-to-tr from-[#9d4edd]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            
            <div className="min-w-0 flex-1">
                <h3 className="text-[11px] font-black text-gray-200 truncate font-mono uppercase tracking-wider mb-1">{art.name}</h3>
                <div className="flex flex-wrap gap-1">
                    {art.analysis?.classification && (
                        <span className="text-[7px] px-1.5 py-0.5 rounded bg-[#9d4edd]/10 border border-[#9d4edd]/20 text-[#9d4edd] font-mono font-bold uppercase tracking-tighter">{art.analysis.classification}</span>
                    )}
                </div>
            </div>
            
            <div className="flex justify-between items-center mt-auto pt-4 border-t border-white/5">
                <span className="text-[8px] font-mono text-gray-600">{new Date(art.timestamp).toLocaleDateString()}</span>
                <div className="flex gap-2">
                    <div className="text-[#9d4edd] opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight size={14} /></div>
                </div>
            </div>
        </motion.div>
    );
};

export default MemoryCore;
