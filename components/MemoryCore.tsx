import React, { useEffect, useState, useMemo, useRef } from 'react';
import { neuralVault } from '../services/persistenceService';
import { generateTaxonomy, promptSelectKey, classifyArtifact, fileToGenerativePart, smartOrganizeArtifact, applyWorkflowToArtifacts } from '../services/geminiService';
import { useAppStore } from '../store';
import { HardDrive, Folder, File, RefreshCw, Wand2, Loader2, Grid, List, Search, Cpu, Database, Save, AlertCircle, Trash2, X, Upload, Edit2, Check, Sparkles, ShieldCheck, BarChart3, Activity, PieChart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ArtifactItem {
    id: string;
    name: string;
    type: string;
    tags: string[];
    timestamp: number;
    processingStatus?: 'PENDING' | 'ANALYZING' | 'COMPLETE';
}

const MemoryTelemetry: React.FC<{ artifacts: ArtifactItem[] }> = ({ artifacts }) => {
    const data = useMemo(() => {
        const types: Record<string, number> = {};
        artifacts.forEach(a => {
            const type = a.type.split('/')[1]?.toUpperCase() || 'UNKNOWN';
            types[type] = (types[type] || 0) + 1;
        });
        return Object.entries(types).map(([name, value]) => ({ name, value }));
    }, [artifacts]);

    const health = useMemo(() => {
        if (artifacts.length === 0) return 0;
        const taggedCount = artifacts.filter(a => a.tags.length > 0).length;
        return Math.round((taggedCount / artifacts.length) * 100);
    }, [artifacts]);

    return (
        <div className="p-4 bg-[#0a0a0a] border-b border-[#1f1f1f] flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black font-mono text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Activity className="w-3 h-3 text-[#9d4edd]" /> Vault Intelligence
                </h3>
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-gray-600 uppercase">Organization Health</span>
                    <span className={`text-[10px] font-black font-mono ${health > 70 ? 'text-[#42be65]' : 'text-[#f59e0b]'}`}>{health}%</span>
                </div>
            </div>
            
            <div className="h-20 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <XAxis dataKey="name" hide />
                        <YAxis hide />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#000', border: '1px solid #333', fontSize: '9px', fontFamily: 'monospace' }}
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        />
                        <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#9d4edd' : '#22d3ee'} fillOpacity={0.6} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="w-full bg-[#111] h-1 rounded-full overflow-hidden">
                <motion.div 
                    className="h-full bg-[#9d4edd] shadow-[0_0_10px_#9d4edd]" 
                    initial={{ width: 0 }}
                    animate={{ width: `${health}%` }}
                />
            </div>
        </div>
    );
};

const MemoryCore: React.FC = () => {
    const { openHoloProjector, addLog, process } = useAppStore();
    const [artifacts, setArtifacts] = useState<ArtifactItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isOrganizing, setIsOrganizing] = useState(false);
    const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Rename State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    // --- AUTONOMOUS PROCESSING QUEUE ---
    const processingRef = useRef(false);
    const [processingQueue, setProcessingQueue] = useState<string[]>([]); // Artifact IDs

    // Check for Active Workflow Protocol
    const activeWorkflow = process.generatedWorkflow;

    useEffect(() => {
        loadArtifacts();
    }, []);

    // Watch Queue and Trigger Analysis
    useEffect(() => {
        const processQueue = async () => {
            if (processingRef.current || processingQueue.length === 0) return;
            
            const targetId = processingQueue[0];
            processingRef.current = true;

            // Update UI state to show analyzing
            setArtifacts(prev => prev.map(a => a.id === targetId ? { ...a, processingStatus: 'ANALYZING' } : a));

            try {
                // 1. Fetch data
                const artifact = await neuralVault.getArtifactById(targetId);
                if (!artifact) throw new Error("Artifact not found");

                // 2. Prepare file data
                const buffer = await artifact.data.arrayBuffer();
                const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
                const fileData = {
                    inlineData: { data: base64, mimeType: artifact.type || 'application/octet-stream' },
                    name: artifact.name
                };

                // 3. AI Smart Organization (Cost effective Flash model)
                const hasKey = await window.aistudio?.hasSelectedApiKey();
                if (!hasKey) {
                    await promptSelectKey(); 
                }

                if (await window.aistudio?.hasSelectedApiKey()) {
                    const result = await smartOrganizeArtifact(fileData);
                    
                    // 4. Update Vault
                    await neuralVault.renameArtifact(targetId, result.name);
                    await neuralVault.updateArtifactTags(targetId, result.tags);
                    
                    // Log to console/store
                    addLog('SUCCESS', `AUTO_ORG: Renamed "${artifact.name}" -> "${result.name}" [${result.tags.join(', ')}]`);
                }

            } catch (e) {
                console.error("Auto-Processing Failed", e);
                addLog('ERROR', `AUTO_ORG_FAIL: Could not process ${targetId}`);
            } finally {
                // 5. Cleanup
                setProcessingQueue(prev => prev.slice(1));
                processingRef.current = false;
                await loadArtifacts(); // Refresh UI
            }
        };

        processQueue();
    }, [processingQueue]);

    const loadArtifacts = async () => {
        if (artifacts.length === 0) setIsLoading(true);
        try {
            const items = await neuralVault.getArtifacts();
            setArtifacts(prev => {
                return items.map(i => {
                    const existing = prev.find(p => p.id === i.id);
                    return {
                        id: i.id,
                        name: i.name,
                        type: i.type || 'unknown',
                        tags: i.tags || [],
                        timestamp: i.timestamp,
                        processingStatus: existing?.processingStatus
                    };
                });
            });
        } catch (e) {
            console.error("Vault Access Failed", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files) as File[];
            const newIds: string[] = [];
            
            for (const file of files) {
                try {
                    const id = await neuralVault.saveArtifact(file, null);
                    newIds.push(id);
                } catch (err) {
                    console.error("Upload failed for", file.name, err);
                }
            }
            
            await loadArtifacts();
            setProcessingQueue(prev => [...prev, ...newIds]);
        }
    };

    const handleOrganization = async () => {
        setIsOrganizing(true);
        try {
            const hasKey = await window.aistudio?.hasSelectedApiKey();
            if (!hasKey) { await promptSelectKey(); return; }

            // STRATEGY SPLIT: Workflow vs Generic Taxonomy
            if (activeWorkflow) {
                addLog('SYSTEM', 'ORG_PROTOCOL: Applying Active Workflow Rules...');
                
                // 1. Get simple list for AI
                const fileList = artifacts.map(a => ({ id: a.id, name: a.name, type: a.type }));
                
                // 2. Call new Service
                const updates = await applyWorkflowToArtifacts(fileList, activeWorkflow);
                
                // 3. Apply updates
                for (const update of updates) {
                    await neuralVault.renameArtifact(update.id, update.newName);
                    await neuralVault.updateArtifactTags(update.id, update.tags);
                    // Note: We don't have a real FS, so 'path' maps to tags for now or a virtual path tag
                    if (update.path && update.path !== '/') {
                        await neuralVault.updateArtifactTags(update.id, [`PATH:${update.path}`]);
                    }
                }
                addLog('SUCCESS', `ORG_COMPLETE: Processed ${updates.length} files via Protocol.`);

            } else {
                // Fallback to generic taxonomy
                const fileNames = artifacts.map(a => a.name);
                const taxonomyResult = await generateTaxonomy(fileNames);

                for (const category of taxonomyResult) {
                    for (const itemName of category.items) {
                        const artifact = artifacts.find(a => a.name === itemName);
                        if (artifact) {
                            await neuralVault.updateArtifactTags(artifact.id, [category.category]);
                        }
                    }
                }
                addLog('SUCCESS', 'ORG_COMPLETE: Generic taxonomy applied.');
            }
            
            await loadArtifacts(); 
        } catch (e: any) {
            console.error("Organization failed", e);
            addLog('ERROR', `ORG_FAIL: ${e.message}`);
        } finally {
            setIsOrganizing(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Permanently delete this artifact from the Neural Vault?")) {
            await neuralVault.deleteArtifact(id);
            await loadArtifacts();
        }
    };

    const startRenaming = (art: ArtifactItem, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingId(art.id);
        setEditName(art.name);
    };

    const saveRename = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (editingId && editName.trim()) {
            await neuralVault.renameArtifact(editingId, editName);
            setEditingId(null);
            await loadArtifacts();
        }
    };

    const handleArtifactClick = async (art: ArtifactItem) => {
        if (editingId) return; 
        
        const fullArt = await neuralVault.getArtifactById(art.id);
        if (fullArt) {
            let content: string | null = null;
            // CRITICAL FIX: Guard startsWith
            const fileType = fullArt.type || 'unknown';
            
            if (fileType.startsWith('image/')) {
                content = URL.createObjectURL(fullArt.data);
            } else {
                content = await fullArt.data.text();
            }
            
            openHoloProjector({
                id: art.id,
                title: art.name,
                type: fileType.startsWith('image/') ? 'IMAGE' : 'TEXT',
                content: content
            });
        }
    };

    const groupedArtifacts = useMemo(() => {
        const filtered = artifacts.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()));
        const groups: Record<string, ArtifactItem[]> = { 'Uncategorized': [] };
        
        filtered.forEach(a => {
            // Priority: Path Tag -> Normal Tag -> Uncategorized
            const pathTag = a.tags.find(t => t?.startsWith('PATH:'));
            const normalTag = a.tags.find(t => !t?.startsWith('PATH:'));
            
            const folder = pathTag ? pathTag.replace('PATH:', '') : (normalTag || 'Uncategorized');
            
            if (!groups[folder]) groups[folder] = [];
            groups[folder].push(a);
        });

        return groups;
    }, [artifacts, searchQuery]);

    const stats = useMemo(() => {
        const totalSize = artifacts.length; 
        const types = new Set(artifacts.map(a => a.type)).size;
        return { count: totalSize, types };
    }, [artifacts]);

    return (
        <div className="h-full w-full bg-[#030303] text-white flex flex-col overflow-hidden relative font-sans">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(157,78,221,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(157,78,221,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

            {/* Header */}
            <div className="h-16 border-b border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur z-20 flex items-center justify-between px-6">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-[#9d4edd]/10 border border-[#9d4edd] rounded">
                        <HardDrive className="w-4 h-4 text-[#9d4edd]" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold font-mono uppercase tracking-widest text-white">Neural Vault</h1>
                        <p className="text-[9px] text-gray-500 font-mono">Persistent Memory Core</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Active Workflow Indicator */}
                    {activeWorkflow && (
                        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-[#1f1f1f] border border-[#42be65]/50 rounded text-[9px] font-mono text-[#42be65] animate-pulse">
                            <ShieldCheck className="w-3 h-3" />
                            PROTOCOL ACTIVE
                        </div>
                    )}

                    {/* Stats */}
                    <div className="hidden md:flex gap-4 text-[9px] font-mono text-gray-500 border-r border-[#333] pr-4">
                        <div className="flex items-center gap-2">
                            <Database className="w-3 h-3 text-[#22d3ee]" />
                            <span>{stats.count} ARTIFACTS</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Cpu className="w-3 h-3 text-[#f59e0b]" />
                            <span>{stats.types} TYPES</span>
                        </div>
                        {processingQueue.length > 0 && (
                            <div className="flex items-center gap-2 text-[#9d4edd] animate-pulse">
                                <Sparkles className="w-3 h-3" />
                                <span>PROCESSING QUEUE: {processingQueue.length}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 bg-[#111] p-1 rounded border border-[#333]">
                        <Search className="w-3.5 h-3.5 text-gray-500 ml-2" />
                        <input 
                            type="text" 
                            placeholder="Search Memory..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-none outline-none text-[10px] font-mono w-40 text-white placeholder:text-gray-600"
                        />
                    </div>

                    <div className="flex bg-[#111] rounded border border-[#333] p-0.5">
                        <button onClick={() => setViewMode('GRID')} className={`p-1.5 rounded ${viewMode === 'GRID' ? 'bg-[#333] text-white' : 'text-gray-500 hover:text-gray-300'}`}><Grid className="w-3.5 h-3.5"/></button>
                        <button onClick={() => setViewMode('LIST')} className={`p-1.5 rounded ${viewMode === 'LIST' ? 'bg-[#333] text-white' : 'text-gray-500 hover:text-gray-300'}`}><List className="w-3.5 h-3.5"/></button>
                    </div>

                    <label className="flex items-center gap-2 px-3 py-1.5 bg-[#1f1f1f] hover:bg-[#22d3ee] hover:text-black border border-[#333] rounded text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer">
                        <Upload className="w-3 h-3" />
                        Upload
                        <input type="file" multiple className="hidden" onChange={handleFileUpload} />
                    </label>

                    <button 
                        onClick={handleOrganization}
                        disabled={isOrganizing || artifacts.length === 0}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider transition-all disabled:opacity-50
                            ${activeWorkflow 
                                ? 'bg-[#42be65] text-black hover:bg-[#5add7e] border border-[#42be65]' 
                                : 'bg-[#1f1f1f] hover:bg-[#9d4edd] hover:text-black border border-[#333]'}
                        `}
                    >
                        {isOrganizing ? <Loader2 className="w-3 h-3 animate-spin"/> : <Wand2 className="w-3 h-3"/>}
                        {isOrganizing ? 'Indexing...' : activeWorkflow ? 'Execute Protocol' : 'Auto-Organize'}
                    </button>
                </div>
            </div>

            {/* NEW: Telemetry Layer */}
            <MemoryTelemetry artifacts={artifacts} />

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 relative z-10">
                {isLoading && artifacts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500">
                        <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#9d4edd]" />
                        <p className="font-mono text-xs uppercase tracking-widest">Accessing Neural Lattice...</p>
                    </div>
                ) : artifacts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
                        <label className="group flex flex-col items-center justify-center cursor-pointer">
                            <div className="w-20 h-20 bg-[#111] rounded-full border border-[#333] flex items-center justify-center mb-6 group-hover:border-[#9d4edd] group-hover:scale-110 transition-all">
                                <Upload className="w-8 h-8 text-gray-500 group-hover:text-[#9d4edd]" />
                            </div>
                            <p className="font-mono text-xs uppercase tracking-widest group-hover:text-[#9d4edd] transition-colors">Initialize Memory Bank</p>
                            <p className="text-[9px] font-mono mt-2 text-gray-500">Click to upload persistent assets</p>
                            <input type="file" multiple className="hidden" onChange={handleFileUpload} />
                        </label>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(groupedArtifacts).map(([group, items]: [string, ArtifactItem[]]) => items.length > 0 && (
                            <div key={group} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center gap-2 mb-4 border-b border-[#333] pb-2">
                                    <Folder className="w-4 h-4 text-[#9d4edd]" />
                                    <h2 className="text-xs font-bold font-mono text-gray-300 uppercase tracking-widest">{group}</h2>
                                    <span className="text-[9px] text-gray-600 bg-[#111] px-1.5 rounded">{items.length}</span>
                                </div>
                                
                                <div className={`grid gap-4 ${viewMode === 'GRID' ? 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6' : 'grid-cols-1'}`}>
                                    {items.map((art) => (
                                        <motion.div
                                            key={art.id}
                                            layout
                                            onClick={() => handleArtifactClick(art)}
                                            whileHover={{ scale: 1.02, borderColor: '#9d4edd' }}
                                            whileTap={{ scale: 0.98 }}
                                            className={`
                                                group cursor-pointer bg-[#0a0a0a] border border-[#222] rounded-lg overflow-hidden transition-colors relative
                                                ${viewMode === 'LIST' ? 'flex items-center p-3 gap-4' : 'p-4 flex flex-col'}
                                                ${art.processingStatus === 'ANALYZING' ? 'ring-1 ring-[#9d4edd] animate-pulse' : ''}
                                            `}
                                        >
                                            {/* Status Overlay */}
                                            {art.processingStatus === 'ANALYZING' && (
                                                <div className="absolute inset-0 bg-black/50 z-20 flex flex-col items-center justify-center">
                                                    <Loader2 className="w-6 h-6 text-[#9d4edd] animate-spin mb-2" />
                                                    <span className="text-[8px] font-mono text-[#9d4edd] uppercase tracking-wider bg-black px-2 rounded">Neural Indexing</span>
                                                </div>
                                            )}

                                            <div className={`${viewMode === 'LIST' ? 'p-2' : 'mb-3 flex justify-center'} bg-[#111] rounded border border-[#333] text-gray-500 group-hover:text-[#9d4edd] transition-colors`}>
                                                <File className="w-6 h-6" />
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                {editingId === art.id ? (
                                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                        <input 
                                                            type="text" 
                                                            value={editName} 
                                                            onChange={(e) => setEditName(e.target.value)}
                                                            className="bg-[#111] border border-[#9d4edd] text-xs font-mono text-white p-1 rounded w-full outline-none"
                                                            autoFocus
                                                        />
                                                        <button onClick={saveRename} className="text-[#42be65]"><Check className="w-3 h-3"/></button>
                                                    </div>
                                                ) : (
                                                    <h3 className="text-xs font-bold text-gray-300 truncate font-mono group-hover:text-white transition-colors">{art.name}</h3>
                                                )}
                                                
                                                <div className="flex justify-between items-center mt-1">
                                                    <span className="text-[9px] text-gray-600 font-mono uppercase truncate">{art.type.split('/')[1] || 'UNKNOWN'}</span>
                                                    <span className="text-[8px] text-gray-700 font-mono">{new Date(art.timestamp).toLocaleDateString()}</span>
                                                </div>
                                            </div>

                                            {/* Hover Glow */}
                                            <div className="absolute inset-0 bg-[#9d4edd]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                                            
                                            {/* Actions */}
                                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={(e) => startRenaming(art, e)}
                                                    className="p-1.5 text-gray-600 hover:text-white bg-black/50 rounded hover:bg-[#111]"
                                                >
                                                    <Edit2 className="w-3 h-3" />
                                                </button>
                                                <button 
                                                    onClick={(e) => handleDelete(art.id, e)}
                                                    className="p-1.5 text-gray-600 hover:text-red-500 bg-black/50 rounded hover:bg-[#111]"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MemoryCore;