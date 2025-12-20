import React, { useEffect, useRef, useState, useMemo } from 'react';
import { neuralVault } from '../services/persistenceService';
import { 
    generateTaxonomy, promptSelectKey, smartOrganizeArtifact, 
    digitizeDocument, performSemanticSearch, classifyArtifact, discoverDeepLattice
} from '../services/geminiService';
import { useAppStore } from '../store';
/* Fix: Rename 'File' icon to 'FileIcon' to prevent shadowing the global 'File' constructor */
import { 
    HardDrive, Folder, File as FileIcon, Wand2, Loader2, Grid, List, Search, 
    Database, Trash2, X, Upload, Scan, Sparkles, ShieldCheck, 
    Activity, Eye, FileText, BrainCircuit, Share2, Network, 
    Layers, Cpu, Zap, Radio, Globe, Terminal, History, GitBranch
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StoredArtifact, KnowledgeNode, NeuralLattice } from '../types';
import KnowledgeGraph from './KnowledgeGraph';

const MemoryCore: React.FC = () => {
    const { openHoloProjector, addLog, process } = useAppStore();
    const [artifacts, setArtifacts] = useState<StoredArtifact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isIndexing, setIsIndexing] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [viewMode, setViewMode] = useState<'GRID' | 'GRAPH' | 'LATTICE'>('GRID');
    const [semanticResults, setSemanticResults] = useState<string[] | null>(null);
    const [lattice, setLattice] = useState<NeuralLattice | null>(null);
    const [isGeneratingLattice, setIsGeneratingLattice] = useState(false);

    useEffect(() => { loadArtifacts(); }, []);

    const loadArtifacts = async () => {
        setIsLoading(true);
        const items = await neuralVault.getArtifacts();
        setArtifacts(items as StoredArtifact[]);
        setIsLoading(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files) as File[];
            addLog('SYSTEM', `VAULT_INGEST: Buffering ${files.length} artifacts...`);
            
            for (const file of files) {
                const id = await neuralVault.saveArtifact(file, null);
                autonomicIndex(id, file);
            }
            await loadArtifacts();
        }
    };

    /**
     * EXTRAORDINARY PIPELINE: Automatic Scan -> Tag -> Classify -> Digitize on ingest
     */
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

            // 1. Semantic Classification & Summarization
            const analysis = await classifyArtifact(generativeFile);
            
            // 2. Intelligent Placement Logic
            const org = await smartOrganizeArtifact({ name: file.name });
            
            // 3. Persist Updated Metadata
            const artifact = await neuralVault.getArtifactById(id);
            if (artifact) {
                artifact.analysis = analysis;
                artifact.tags = [...new Set([...(artifact.tags || []), ...analysis.entities, ...(org.tags || [])])];
                artifact.metadata = { ...artifact.metadata, suggestedFolder: org.folder };
                
                /* Correct use of browser global File constructor */
                const updatedFile = new File([artifact.data], artifact.name, { type: artifact.type });
                await neuralVault.saveArtifact(updatedFile, artifact.analysis);
            }

            addLog('SUCCESS', `NEURAL_INDEX: Artifact "${file.name}" finalized. Class: ${analysis.classification}.`);
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

    const runLatticeDiscovery = async () => {
        if (artifacts.length < 3) {
            addLog('WARN', 'LATTICE: Minimum 3 artifacts required for semantic mapping.');
            return;
        }
        setIsGeneratingLattice(true);
        addLog('SYSTEM', 'LATTICE_DISCOVERY: Analyzing cross-artifact semantic vectors...');
        try {
            const hasKey = await window.aistudio?.hasSelectedApiKey();
            if (!hasKey) { await promptSelectKey(); return; }

            const discovery = await discoverDeepLattice(artifacts);
            setLattice(discovery);
            setViewMode('LATTICE');
            addLog('SUCCESS', `LATTICE_ACTIVE: Isolated ${discovery.clusters.length} hubs and mapped ${discovery.bridges.length} relationships.`);
        } catch (err: any) {
            addLog('ERROR', `LATTICE_FAIL: ${err.message}`);
        } finally {
            setIsGeneratingLattice(false);
        }
    };

    const triggerSemanticSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) {
            setSemanticResults(null);
            return;
        }

        setIsSearching(true);
        addLog('SYSTEM', `VECTOR_PROBE: Performing semantic rank for "${searchQuery}"...`);
        try {
            const hasKey = await window.aistudio?.hasSelectedApiKey();
            if (!hasKey) { await promptSelectKey(); setIsSearching(false); return; }

            const topIds = await performSemanticSearch(searchQuery, artifacts);
            setSemanticResults(topIds);
            addLog('SUCCESS', `VECTOR_PROBE: Found ${topIds.length} semantically relevant artifacts.`);
        } catch (err: any) {
            addLog('ERROR', `SEARCH_FAIL: ${err.message}`);
        } finally {
            setIsSearching(false);
        }
    };

    const handleDigitize = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        addLog('SYSTEM', 'DIGITIZE_PROTOCOL: Initializing full structural document parse...');
        try {
            const hasKey = await window.aistudio?.hasSelectedApiKey();
            if (!hasKey) { await promptSelectKey(); return; }

            const art = await neuralVault.getArtifactById(id) as StoredArtifact | undefined;
            if (!art) throw new Error("Artifact reference lost.");

            const buffer = await art.data.arrayBuffer();
            const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
            const fileData = { inlineData: { data: base64, mimeType: art.type }, name: art.name };

            const result = await digitizeDocument(fileData);
            
            openHoloProjector({
                id: `digi-${id}`,
                title: `Digitization Report: ${art.name}`,
                type: 'TEXT',
                content: `
# STRUCTURAL DIGITIZATION REPORT
**Source Artifact:** ${art.name}

## SUMMARY ABSTRACT
${result.abstract}

## LOGIC TOPOLOGY (MERMAID)
\`\`\`mermaid
${result.logicModel}
\`\`\`

## KEY ENTITIES & SIGNIFICANCE
${result.entities.map(ent => `- **${ent.name}** (${ent.type}): ${ent.significance}`).join('\n')}

## NAVIGATION TOPOLOGY (TOC)
${result.toc.map(item => `- ${item.title} (Index: ${item.page})`).join('\n')}
                `.trim()
            });

            addLog('SUCCESS', `DIGITIZE_COMPLETE: Multi-layer model generated for "${art.name}".`);
        } catch (err: any) {
            addLog('ERROR', `DIGITIZE_FAIL: ${err.message}`);
        }
    };

    const graphNodes = useMemo(() => {
        if (viewMode === 'LATTICE' && lattice) {
            const nodes: KnowledgeNode[] = [];
            lattice.clusters.forEach(c => {
                nodes.push({ id: c.id, label: c.label.toUpperCase(), type: 'CLUSTER', connections: [], strength: 100, color: c.color, data: { summary: c.description } });
                c.memberIds.forEach(mId => {
                    const art = artifacts.find(a => a.id === mId);
                    if (art) nodes.push({ id: art.id, label: art.name, type: 'CONCEPT', connections: [c.id], strength: 80, color: c.color, data: art.analysis });
                });
            });
            lattice.bridges.forEach(b => {
                const source = nodes.find(n => n.id === b.sourceId);
                if (source) source.connections.push(b.targetId);
            });
            return nodes;
        }
        return artifacts.map(art => ({
            id: art.id,
            label: art.name,
            type: (art.analysis?.classification as any) || 'CONCEPT',
            connections: [],
            strength: 80,
            color: art.type === 'application/pdf' ? '#f59e0b' : art.type.startsWith('image') ? '#d946ef' : '#22d3ee',
            data: art.analysis
        } as KnowledgeNode));
    }, [artifacts, viewMode, lattice]);

    const filteredArtifacts = useMemo(() => {
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

    return (
        <div className="h-full w-full bg-[#030303] text-white flex flex-col overflow-hidden relative font-sans">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(157,78,221,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(157,78,221,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

            {/* Header / Controls */}
            <div className="h-16 border-b border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur z-20 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-[#9d4edd]/10 border border-[#9d4edd] rounded shadow-[0_0_15px_rgba(157,78,221,0.3)]">
                            <HardDrive className="w-4 h-4 text-[#9d4edd]" />
                        </div>
                        <h1 className="text-sm font-bold font-mono uppercase tracking-widest text-white">Neural Vault</h1>
                    </div>
                    
                    <div className="flex bg-[#111] p-1 rounded border border-[#333]">
                        <button onClick={() => setViewMode('GRID')} className={`px-4 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${viewMode === 'GRID' ? 'bg-[#1f1f1f] text-white shadow-lg' : 'text-gray-600 hover:text-gray-300'}`}>
                            <Grid size={12} /> Matrix
                        </button>
                        <button onClick={() => setViewMode('GRAPH')} className={`px-4 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${viewMode === 'GRAPH' ? 'bg-[#1f1f1f] text-white shadow-lg' : 'text-gray-600 hover:text-gray-300'}`}>
                            <BrainCircuit size={12} /> Graph
                        </button>
                        <button onClick={() => setViewMode('LATTICE')} className={`px-4 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${viewMode === 'LATTICE' ? 'bg-[#1f1f1f] text-white shadow-lg' : 'text-gray-600 hover:text-gray-300'}`}>
                            <Network size={12} /> Lattice
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button 
                        onClick={runLatticeDiscovery}
                        disabled={isGeneratingLattice || artifacts.length < 3}
                        className={`flex items-center gap-2 px-4 py-2 border border-[#9d4edd]/30 rounded-xl text-[10px] font-bold font-mono uppercase tracking-widest transition-all ${isGeneratingLattice ? 'bg-[#9d4edd]/10 text-[#9d4edd]' : 'bg-[#111] text-gray-500 hover:text-[#9d4edd] hover:border-[#9d4edd]'}`}
                    >
                        {isGeneratingLattice ? <Loader2 size={14} className="animate-spin" /> : <GitBranch size={14} />}
                        Cross-Reference
                    </button>
                    
                    <form onSubmit={triggerSemanticSearch} className="flex items-center gap-2 bg-[#111] p-1 rounded border border-[#333] group focus-within:border-[#9d4edd] transition-colors">
                        <Search className="w-3.5 h-3.5 text-gray-500 ml-2 group-focus-within:text-[#9d4edd]" />
                        <input 
                            type="text" 
                            placeholder="Semantic search (Gemini Ranked)..." 
                            value={searchQuery} 
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                if (!e.target.value) setSemanticResults(null);
                            }} 
                            className="bg-transparent border-none outline-none text-[10px] font-mono w-64 text-white placeholder:text-gray-700"
                        />
                        <button type="submit" disabled={isSearching} className="p-1 text-[#9d4edd] hover:text-white transition-colors mr-1">
                            {isSearching ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        </button>
                    </form>
                    
                    <label className="flex items-center gap-2 px-4 py-2 bg-[#9d4edd] hover:bg-[#b06bf7] text-black border border-transparent rounded-xl text-[10px] font-bold font-mono uppercase tracking-widest transition-all cursor-pointer shadow-[0_0_20px_rgba(157,78,221,0.4)]">
                        <Upload size={14} /> Ingest Artifact
                        <input type="file" multiple className="hidden" onChange={handleFileUpload} />
                    </label>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 relative z-10 overflow-hidden">
                {viewMode === 'GRID' ? (
                    <div className="h-full overflow-y-auto p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 custom-scrollbar">
                        {isLoading ? (
                            <div className="col-span-full h-64 flex flex-col items-center justify-center text-gray-600 font-mono text-xs uppercase animate-pulse gap-4">
                                <Loader2 className="w-8 h-8 animate-spin" />
                                Synchronizing Vault Topography...
                            </div>
                        ) : filteredArtifacts.length === 0 ? (
                            <div className="col-span-full h-64 flex flex-col items-center justify-center opacity-20 grayscale">
                                <Database size={64} />
                                <p className="text-xs font-mono uppercase mt-6 tracking-[0.4em]">Vault Memory Empty</p>
                            </div>
                        ) : filteredArtifacts.map(art => {
                            const isIndexingThis = isIndexing.has(art.id);
                            return (
                                <motion.div 
                                    key={art.id} 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    whileHover={{ scale: 1.02 }}
                                    className={`bg-[#0a0a0a] border border-[#222] p-5 rounded-2xl flex flex-col gap-4 relative group hover:border-[#9d4edd] transition-all shadow-xl ${isIndexingThis ? 'animate-pulse' : ''}`}
                                >
                                    {isIndexingThis && (
                                        <div className="absolute inset-0 bg-[#9d4edd]/10 backdrop-blur-[1px] flex flex-col items-center justify-center z-30 rounded-2xl">
                                            <Radio className="w-8 h-8 text-[#9d4edd] animate-ping mb-2" />
                                            <span className="text-[8px] font-mono text-[#9d4edd] font-black uppercase tracking-widest text-center px-4">Autonomous Processing...</span>
                                        </div>
                                    )}

                                    <div className="absolute top-4 left-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                        <div className={`w-2 h-2 rounded-full shadow-[0_0_10px_currentColor] animate-pulse ${art.type === 'application/pdf' ? 'text-amber-500' : 'text-[#22d3ee]'}`} />
                                        {art.analysis && <ShieldCheck className="w-3 h-3 text-[#10b981]" />}
                                    </div>
                                    
                                    <div className="aspect-square bg-[#050505] border border-white/5 rounded-xl flex items-center justify-center text-gray-600 group-hover:text-[#9d4edd] transition-colors relative overflow-hidden shadow-inner">
                                        <div className="absolute inset-0 bg-gradient-to-tr from-[#9d4edd]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        {art.type === 'application/pdf' ? <FileText size={48} className="drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]" /> : <FileIcon size={48} className="drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]" />}
                                    </div>
                                    
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-[11px] font-black text-gray-200 truncate font-mono uppercase tracking-wider mb-1">{art.name}</h3>
                                        <div className="flex flex-wrap gap-1">
                                            <span className="text-[7px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-gray-500 font-mono font-bold uppercase">{art.type.split('/')[1] || 'binary'}</span>
                                            {art.analysis?.classification && (
                                                <span className="text-[7px] px-1.5 py-0.5 rounded bg-[#9d4edd]/10 border border-[#9d4edd]/20 text-[#9d4edd] font-mono font-bold uppercase tracking-tighter">{art.analysis.classification}</span>
                                            )}
                                        </div>
                                        <p className="text-[9px] text-gray-600 font-mono line-clamp-2 mt-2 leading-relaxed italic">{art.analysis?.summary || 'Scanning content for semantic traces...'}</p>
                                    </div>
                                    
                                    <div className="flex justify-between items-center mt-auto pt-4 border-t border-white/5">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-mono text-gray-600">{new Date(art.timestamp).toLocaleDateString()}</span>
                                            {art.metadata?.suggestedFolder && (
                                                <span className="text-[7px] font-mono text-gray-500 flex items-center gap-1 uppercase">
                                                    <Folder size={8} /> {art.metadata.suggestedFolder}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {art.type === 'application/pdf' && (
                                                <button onClick={(e) => handleDigitize(art.id, e)} className="p-2 bg-[#22d3ee]/10 border border-[#22d3ee]/30 text-[#22d3ee] rounded-lg hover:bg-[#22d3ee] hover:text-black transition-all" title="Digitize Structure">
                                                    <Scan size={12} />
                                                </button>
                                            )}
                                            <button onClick={async () => {
                                                const fullArt = await neuralVault.getArtifactById(art.id) as StoredArtifact | undefined;
                                                if (fullArt) openHoloProjector({ 
                                                    id: art.id, 
                                                    title: art.name, 
                                                    type: art.type.startsWith('image/') ? 'IMAGE' : 'TEXT', 
                                                    content: art.type.startsWith('image/') ? URL.createObjectURL(fullArt.data) : await fullArt.data.text() 
                                                });
                                            }} className="p-2 bg-[#9d4edd]/10 border border-[#9d4edd]/30 text-[#9d4edd] rounded-lg hover:bg-[#9d4edd] hover:text-black transition-all" title="Holo Inspect">
                                                <Eye size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="h-full p-8 relative">
                        <KnowledgeGraph nodes={graphNodes} />
                        {viewMode === 'LATTICE' && (
                            <div className="absolute top-8 left-8 z-20 pointer-events-none">
                                <div className="bg-black/80 backdrop-blur-xl border border-[#9d4edd]/40 p-5 rounded-2xl shadow-2xl max-w-sm">
                                    <h3 className="text-xs font-black text-white font-mono uppercase tracking-[0.3em] flex items-center gap-3 mb-3">
                                        <Network className="w-5 h-5 text-[#9d4edd]" /> Semantic Topology
                                    </h3>
                                    <p className="text-[10px] text-gray-400 font-mono leading-relaxed">
                                        Autonomous grouping based on latent thematic resonance. High-density nodes indicate clusters of related logic. Bridges identify cross-domain knowledge bridges discovered by agent synthesis.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Diagnostic Footer */}
            <div className="h-12 border-t border-[#1f1f1f] bg-[#0a0a0a] flex items-center px-6 justify-between text-[9px] font-mono text-gray-600 uppercase tracking-widest shrink-0">
                <div className="flex gap-8">
                    <span className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_5px_#10b981]" /> 
                        MEMORY_INTEGRITY: 100%
                    </span>
                    <span className="flex items-center gap-2">
                        <Database size={12} /> {artifacts.length} SECTORS INDEXED
                    </span>
                    <span className="flex items-center gap-2 text-[#9d4edd] font-bold">
                        <Zap size={12} className="text-[#9d4edd]" /> AUTONOMIC_INDEXING: ACTIVE
                    </span>
                </div>
                <div className="flex items-center gap-6">
                    <span className="flex items-center gap-2 text-[#22d3ee] font-black"><Activity size={12} /> SYNC: STABLE</span>
                    <span className="text-gray-800 font-black">KERN_V4.2.1-VAULT</span>
                </div>
            </div>
        </div>
    );
};

export default MemoryCore;