
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { neuralVault } from '../services/persistenceService';
import { generateTaxonomy, promptSelectKey, smartOrganizeArtifact, digitizeDocument } from '../services/geminiService';
import { useAppStore } from '../store';
import { HardDrive, Folder, File, Wand2, Loader2, Grid, List, Search, Database, Trash2, X, Upload, Scan, Sparkles, ShieldCheck, Activity, Eye, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StoredArtifact } from '../types';

const MemoryCore: React.FC = () => {
    const { openHoloProjector, addLog, process } = useAppStore();
    /**
     * Fix: Added StoredArtifact type to state.
     */
    const [artifacts, setArtifacts] = useState<StoredArtifact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDigitizing, setIsDigitizing] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => { loadArtifacts(); }, []);

    const loadArtifacts = async () => {
        setIsLoading(true);
        const items = await neuralVault.getArtifacts();
        setArtifacts(items as StoredArtifact[]);
        setIsLoading(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            /**
             * Fix: Correctly typed file array from FileList.
             */
            const files = Array.from(e.target.files) as File[];
            for (const file of files) {
                await neuralVault.saveArtifact(file, null);
                addLog('INFO', `VAULT: Secured "${file.name}"`);
            }
            await loadArtifacts();
        }
    };

    const handleDigitize = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDigitizing(id);
        addLog('SYSTEM', 'DIGITIZE_PROTOCOL: Initializing structural document parse...');
        try {
            const hasKey = await window.aistudio?.hasSelectedApiKey();
            if (!hasKey) { await promptSelectKey(); return; }

            /**
             * Fix: Cast art to StoredArtifact to resolve property access errors.
             */
            const art = await neuralVault.getArtifactById(id) as StoredArtifact | undefined;
            if (!art) throw new Error("Artifact not found");

            const buffer = await art.data.arrayBuffer();
            const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
            const fileData = { inlineData: { data: base64, mimeType: art.type }, name: art.name };

            const result = await digitizeDocument(fileData);
            
            openHoloProjector({
                id: `digi-${id}`,
                title: `Digitization: ${art.name}`,
                type: 'TEXT',
                content: `
# STRUCTURAL DIGITIZATION REPORT
**Source:** ${art.name}

## ABSTRACT
${result.abstract}

## LOGIC TOPOLOGY
\`\`\`mermaid
${result.logicModel}
\`\`\`

## KEY ENTITIES
${result.entities.map(ent => `- **${ent.name}** (${ent.type}): ${ent.significance}`).join('\n')}

## TABLE OF CONTENTS
${result.toc.map(item => `- ${item.title} (Page ${item.page})`).join('\n')}
                `.trim()
            });

            addLog('SUCCESS', `DIGITIZE_COMPLETE: Structured logic model generated for "${art.name}".`);
        } catch (err: any) {
            addLog('ERROR', `DIGITIZE_FAIL: ${err.message}`);
        } finally {
            setIsDigitizing(null);
        }
    };

    const filteredArtifacts = artifacts.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="h-full w-full bg-[#030303] text-white flex flex-col overflow-hidden relative font-sans">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(157,78,221,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(157,78,221,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

            <div className="h-16 border-b border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur z-20 flex items-center justify-between px-6">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-[#9d4edd]/10 border border-[#9d4edd] rounded"><HardDrive className="w-4 h-4 text-[#9d4edd]" /></div>
                    <h1 className="text-sm font-bold font-mono uppercase tracking-widest text-white">Neural Vault</h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-[#111] p-1 rounded border border-[#333]">
                        <Search className="w-3.5 h-3.5 text-gray-500 ml-2" />
                        <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent border-none outline-none text-[10px] font-mono w-40 text-white"/>
                    </div>
                    <label className="flex items-center gap-2 px-3 py-1.5 bg-[#1f1f1f] hover:bg-[#9d4edd] rounded text-[10px] font-mono uppercase transition-all cursor-pointer">
                        <Upload size={12} /> Ingest
                        <input type="file" multiple className="hidden" onChange={handleFileUpload} />
                    </label>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 relative z-10 custom-scrollbar">
                {isLoading ? (
                    <div className="col-span-full h-40 flex items-center justify-center text-gray-600 font-mono text-xs uppercase animate-pulse">Syncing Vault...</div>
                ) : filteredArtifacts.map(art => (
                    <motion.div 
                        key={art.id} 
                        whileHover={{ scale: 1.02 }}
                        className="bg-[#0a0a0a] border border-[#222] p-4 rounded-xl flex flex-col gap-4 relative group hover:border-[#9d4edd] transition-all"
                    >
                        <div className="p-3 bg-[#111] rounded-lg text-gray-500 flex justify-center group-hover:text-[#9d4edd] transition-colors">
                            {art.type === 'application/pdf' ? <FileText size={32} /> : <File size={32} />}
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-[11px] font-bold text-gray-300 truncate font-mono">{art.name}</h3>
                            <p className="text-[8px] text-gray-600 font-mono mt-1 uppercase">{art.type.split('/')[1]}</p>
                        </div>
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {art.type === 'application/pdf' && (
                                <button onClick={(e) => handleDigitize(art.id, e)} className="p-1.5 bg-[#22d3ee]/10 border border-[#22d3ee]/30 text-[#22d3ee] rounded-lg hover:bg-[#22d3ee] hover:text-black transition-all">
                                    {isDigitizing === art.id ? <Loader2 size={12} className="animate-spin" /> : <Scan size={12} />}
                                </button>
                            )}
                            <button onClick={async () => {
                                const fullArt = await neuralVault.getArtifactById(art.id) as StoredArtifact | undefined;
                                if (fullArt) openHoloProjector({ id: art.id, title: art.name, type: art.type.startsWith('image/') ? 'IMAGE' : 'TEXT', content: art.type.startsWith('image/') ? URL.createObjectURL(fullArt.data) : await fullArt.data.text() });
                            }} className="p-1.5 bg-[#9d4edd]/10 border border-[#9d4edd]/30 text-[#9d4edd] rounded-lg hover:bg-[#9d4edd] hover:text-black transition-all">
                                <Eye size={12} />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default MemoryCore;
