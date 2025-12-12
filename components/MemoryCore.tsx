import React, { useEffect, useState, useMemo, useRef } from 'react';
import { neuralVault } from '../services/persistenceService';
import { generateTaxonomy, promptSelectKey, classifyArtifact, fileToGenerativePart } from '../services/geminiService';
import { useAppStore } from '../store';
import { HardDrive, Folder, File, RefreshCw, Wand2, Loader2, Grid, List, Search, Cpu, Database, Save, AlertCircle, Trash2, X, Upload, Edit2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ArtifactItem {
    id: string;
    name: string;
    type: string;
    tags: string[];
    timestamp: number;
}

const MemoryCore: React.FC = () => {
    const { openHoloProjector } = useAppStore();
    const [artifacts, setArtifacts] = useState<ArtifactItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isOrganizing, setIsOrganizing] = useState(false);
    const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Rename State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    useEffect(() => {
        loadArtifacts();
    }, []);

    const loadArtifacts = async () => {
        setIsLoading(true);
        try {
            const items = await neuralVault.getArtifacts();
            setArtifacts(items.map(i => ({
                id: i.id,
                name: i.name,
                type: i.type,
                tags: i.tags || [],
                timestamp: i.timestamp
            })));
        } catch (e) {
            console.error("Vault Access Failed", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setIsLoading(true);
            const files = Array.from(e.target.files) as File[];
            
            for (const file of files) {
                try {
                    // 1. Basic Save
                    const id = await neuralVault.saveArtifact(file, null);
                    
                    // 2. Background Analysis (Optional but recommended for vault)
                    // We don't await this to keep UI snappy, or we can just save raw for now
                    // fileToGenerativePart(file).then(async (data) => {
                    //    const analysis = await classifyArtifact(data);
                    //    // Update DB with analysis (requires an update method or overwrite)
                    // });
                } catch (err) {
                    console.error("Upload failed for", file.name, err);
                }
            }
            await loadArtifacts();
        }
    };

    const handleAutoOrganize = async () => {
        setIsOrganizing(true);
        try {
            const hasKey = await window.aistudio?.hasSelectedApiKey();
            if (!hasKey) { await promptSelectKey(); return; }

            const fileNames = artifacts.map(a => a.name);
            const taxonomyResult = await generateTaxonomy(fileNames);

            // Apply tags to DB
            for (const category of taxonomyResult) {
                for (const itemName of category.items) {
                    const artifact = artifacts.find(a => a.name === itemName);
                    if (artifact) {
                        await neuralVault.updateArtifactTags(artifact.id, [category.category]);
                    }
                }
            }
            await loadArtifacts(); // Refresh
        } catch (e) {
            console.error("Organization failed", e);
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
        if (editingId) return; // Don't open if editing
        
        // Fetch full content for projection
        const fullArt = await neuralVault.getArtifactById(art.id);
        if (fullArt) {
            // Need to convert blob to string/url for HoloProjector
            let content: string | null = null;
            if (fullArt.type.startsWith('image/')) {
                content = URL.createObjectURL(fullArt.data);
            } else {
                content = await fullArt.data.text();
            }
            
            openHoloProjector({
                id: art.id,
                title: art.name,
                type: fullArt.type.startsWith('image/') ? 'IMAGE' : 'TEXT',
                content: content
            });
        }
    };

    // Filter and Group Logic
    const groupedArtifacts = useMemo(() => {
        const filtered = artifacts.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()));
        
        // Group by primary tag (folder)
        const groups: Record<string, ArtifactItem[]> = { 'Uncategorized': [] };
        
        filtered.forEach(a => {
            const folder = a.tags.length > 0 ? a.tags[0] : 'Uncategorized';
            if (!groups[folder]) groups[folder] = [];
            groups[folder].push(a);
        });

        return groups;
    }, [artifacts, searchQuery]);

    const stats = useMemo(() => {
        const totalSize = artifacts.length; // Placeholder, real size needs blob size
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
                        onClick={handleAutoOrganize}
                        disabled={isOrganizing || artifacts.length === 0}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#1f1f1f] hover:bg-[#9d4edd] hover:text-black border border-[#333] rounded text-[10px] font-mono uppercase tracking-wider transition-all disabled:opacity-50"
                    >
                        {isOrganizing ? <Loader2 className="w-3 h-3 animate-spin"/> : <Wand2 className="w-3 h-3"/>}
                        {isOrganizing ? 'Indexing...' : 'Auto-Organize'}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 relative z-10">
                {isLoading ? (
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
                                            `}
                                        >
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