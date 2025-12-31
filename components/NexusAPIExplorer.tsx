import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, Globe, Loader2, Sparkles, Code, GitBranch, 
    ChevronRight, Zap, ExternalLink, Box, Database, 
    Layers, Cpu, BookOpen, ShieldCheck, Terminal, Trash2, X, Activity,
    Filter, Share2, PlayCircle, Fingerprint, Waypoints, Gauge,
    Cloud, BrainCircuit, HardDrive, LayoutGrid, Network,
    Info, Bot
} from 'lucide-react';
import { GOOGLE_APIS, GoogleApiDefinition } from '../data/googleApis';
import { useAppStore } from '../store';
import { retryGeminiRequest, promptSelectKey } from '../services/geminiService';
import { dynamicRegistry } from '../services/DynamicToolRegistry';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { audio } from '../services/audioService';
import { cn } from '../utils/cn';
import { OperationalContext } from '../types';

const CATEGORIES = ['ALL', 'CLOUD', 'AI', 'WORKSPACE', 'DATA', 'CORE'];

const SchematicNode = ({ label, color, icon: Icon }: any) => (
    <div className="flex flex-col items-center gap-2">
        <div className={cn(
            "w-12 h-12 rounded-xl border flex items-center justify-center shadow-2xl relative group",
            "bg-black/60 border-white/10"
        )} style={{ color }}>
            <Icon size={20} className="group-hover:scale-110 transition-transform" />
            <div className="absolute -inset-1 rounded-xl blur-lg opacity-20 bg-current pointer-events-none" />
        </div>
        <span className="text-[7px] font-black font-mono uppercase tracking-widest text-gray-500">{label}</span>
    </div>
);

const NexusAPIExplorer: React.FC = () => {
    const { actions } = useAppStore();
    const { addLog, setProcessState, addAgent } = actions;
    const [query, setQuery] = useState('');
    const [activeCat, setActiveCat] = useState('ALL');
    const [selectedApi, setSelectedApi] = useState<GoogleApiDefinition | null>(null);
    const [isForging, setIsForging] = useState(false);
    const [isSearchingLive, setIsSearchingLive] = useState(false);
    const [generatedSchema, setGeneratedSchema] = useState<string | null>(null);
    const [liveSearchResults, setLiveSearchResults] = useState<any[]>([]);
    const [isCommitting, setIsCommitting] = useState(false);

    const filtered = useMemo(() => {
        return GOOGLE_APIS.filter(api => {
            const matchesQuery = api.title.toLowerCase().includes(query.toLowerCase()) || 
                                 api.description.toLowerCase().includes(query.toLowerCase());
            const matchesCat = activeCat === 'ALL' || api.category === activeCat;
            return matchesQuery && matchesCat;
        });
    }, [query, activeCat]);

    const handleLiveSearch = async () => {
        if (!query.trim()) return;
        setIsSearchingLive(true);
        audio.playClick();
        addLog('SYSTEM', `NEXUS_QUERY: Scanning global service mesh for "${query}"...`);
        
        try {
            if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); setIsSearchingLive(false); return; }
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response: GenerateContentResponse = await retryGeminiRequest(() => ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Deep technical API search: "${query}". Identify endpoints and capabilities. Output JSON array [{title, description, category}].`,
                config: { responseMimeType: 'application/json', tools: [{ googleSearch: {} }] }
            }));

            const results = JSON.parse(response.text || "[]");
            setLiveSearchResults(results);
            addLog('SUCCESS', `NEXUS_QUERY: Detected ${results.length} unmapped service vectors.`);
            audio.playSuccess();
        } catch (e: any) {
            addLog('ERROR', `NEXUS_QUERY_FAIL: Signal Dropout.`);
        } finally {
            setIsSearchingLive(false);
        }
    };

    const forgeCapability = async () => {
        if (!selectedApi) return;
        setIsForging(true);
        setGeneratedSchema(null);
        audio.playClick();
        addLog('SYSTEM', `NEXUS_FORGE: Fabricating autonomic tool manifest for [${selectedApi.title}]...`);

        try {
            if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); setIsForging(false); return; }
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const prompt = `
                ACT AS: Nexus Forge AI.
                TARGET: ${selectedApi.title}
                DATA: ${selectedApi.description}
                TASK: Forge a JSON MCP Tool Manifest.
                SCHEMATIC REQUIREMENTS:
                1. 'name': technical_underscore_string
                2. 'description': Concise functional summary
                3. 'parameters': Standard Type.OBJECT schema including at least 3 realistic properties.
                
                RETURN ONLY CLEAN JSON.
            `;

            const response: GenerateContentResponse = await retryGeminiRequest(() => ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            }));

            setGeneratedSchema(response.text || '{}');
            addLog('SUCCESS', `NEXUS_FORGE: Manifest synthesized. Ready for kernel injection.`);
            audio.playSuccess();
        } catch (e: any) {
            addLog('ERROR', `NEXUS_FORGE_FAIL: Integrity check failed.`);
        } finally {
            setIsForging(false);
        }
    };

    const handleCommitToOS = async () => {
        if (!selectedApi || !generatedSchema) return;
        setIsCommitting(true);
        audio.playClick();
        
        try {
            const manifest = JSON.parse(generatedSchema);
            const id = manifest.name || `nexus_tool_${Date.now()}`;
            
            const code = `
                // Dynamic Nexus Executor for ${selectedApi.title}
                os.log('SYSTEM', 'EXECUTING: ${id} protocol...');
                // Integration Logic Mocked for [${selectedApi.title}]
                return { status: 'OK', message: 'Nexus protocol executed successfully via Sovereign Swarm.', payload: args };
            `;

            await dynamicRegistry.registerDynamicTool(id, manifest, code);
            
            // Register a specialized autonomous agent for this forged capability
            const newAgent = {
                id: `node-${Date.now()}`,
                name: selectedApi.title.split(' ')[0] + ' Bot',
                role: 'Specialized Agent',
                context: OperationalContext.GENERAL_PURPOSE,
                status: 'IDLE' as const,
                memoryBuffer: [],
                capabilities: [id, 'Logical Synthesis'],
                currentMindset: { skepticism: 10, excitement: 80, alignment: 90 },
                energyLevel: 100,
                tasks: []
            };
            addAgent(newAgent);

            setProcessState((prev: any) => ({
                pendingAIAddition: {
                    id: `nexus-${Date.now()}`,
                    type: 'holographic',
                    position: { x: 900, y: 400 },
                    data: {
                        label: selectedApi.title,
                        subtext: 'MCP_INJECTED',
                        iconName: 'Zap',
                        color: '#22d3ee',
                        status: 'ACTIVE'
                    }
                }
            }));

            addLog('SUCCESS', `NEXUS_COMMIT: [${selectedApi.title}] crystallized as Autonomous Agent [${newAgent.name}].`);
            audio.playSuccess();
            setSelectedApi(null);
            setGeneratedSchema(null);
        } catch (e) {
            addLog('ERROR', 'COMMIT_FAIL: Register collision.');
        } finally {
            setIsCommitting(false);
        }
    };

    return (
        <div className="h-full w-full flex gap-8 p-10 overflow-hidden bg-transparent relative z-10 font-sans">
            <div className="w-[450px] bg-black/40 border border-white/5 rounded-[3rem] overflow-hidden flex flex-col shadow-2xl relative">
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
                
                <div className="p-8 border-b border-white/5 bg-white/[0.01] space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-[#9d4edd]/10 border border-[#9d4edd]/40 rounded-2xl shadow-xl">
                                <Globe className="w-5 h-5 text-[#9d4edd]" />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-white uppercase tracking-[0.4em]">Nexus Matrix</h2>
                                <p className="text-[8px] text-gray-500 font-mono uppercase tracking-widest mt-1">Registry Protocol v9.5</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleLiveSearch}
                            disabled={isSearchingLive || !query.trim()}
                            className="p-2.5 bg-black border border-white/10 rounded-xl hover:border-[#22d3ee] transition-all text-gray-500 hover:text-[#22d3ee] disabled:opacity-20 active:scale-95 shadow-lg"
                        >
                            {isSearchingLive ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                        </button>
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700 group-focus-within:text-[#9d4edd] transition-colors" />
                        <input 
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Probe Global Endpoints..."
                            className="w-full bg-black/60 border border-white/5 pl-12 pr-4 py-4 text-xs font-mono text-white focus:border-[#9d4edd] outline-none rounded-2xl shadow-inner transition-all placeholder:text-gray-800 uppercase"
                        />
                    </div>

                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2">
                        {CATEGORIES.map(cat => (
                            <button 
                                key={cat} 
                                onClick={() => setActiveCat(cat)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                                    activeCat === cat ? "bg-[#9d4edd] text-black border-[#9d4edd] shadow-lg" : "bg-black/40 border-white/5 text-gray-600 hover:text-white"
                                )}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3 bg-black/20">
                    <AnimatePresence>
                        {liveSearchResults.map((api, i) => (
                            <motion.button
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                key={`live-${i}`}
                                onClick={() => { setSelectedApi(api); setGeneratedSchema(null); audio.playClick(); }}
                                className={cn(
                                    "w-full text-left p-5 rounded-3xl transition-all flex items-center justify-between group border border-dashed relative overflow-hidden",
                                    selectedApi?.title === api.title ? "bg-[#22d3ee]/10 border-[#22d3ee] shadow-xl" : "bg-[#22d3ee]/5 border-[#22d3ee]/30 hover:border-[#22d3ee]"
                                )}
                            >
                                <div className="flex-1 min-w-0 pr-4 relative z-10">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-1 h-1 rounded-full bg-[#22d3ee] animate-pulse" />
                                        <span className="text-11px font-black text-white uppercase truncate">{api.title}</span>
                                    </div>
                                    <div className="text-8px text-gray-500 font-mono truncate uppercase tracking-tighter opacity-60 group-hover:opacity-100">{api.description}</div>
                                </div>
                                <Sparkles size={14} className="text-[#22d3ee] shrink-0 animate-pulse" />
                            </motion.button>
                        ))}
                    </AnimatePresence>

                    {filtered.map((api, i) => (
                        <button
                            key={i}
                            onClick={() => { setSelectedApi(api); setGeneratedSchema(null); audio.playClick(); }}
                            className={cn(
                                "w-full text-left p-5 rounded-3xl transition-all flex items-center justify-between group border relative overflow-hidden",
                                selectedApi?.title === api.title ? "bg-[#9d4edd]/10 border-[#9d4edd] shadow-xl" : "bg-transparent border-transparent hover:bg-white/[0.03] hover:border-white/5"
                            )}
                        >
                            <div className="flex-1 min-w-0 pr-4 relative z-10">
                                <div className="text-11px font-black text-gray-200 group-hover:text-white transition-colors truncate uppercase tracking-tighter">{api.title}</div>
                                <div className="text-8px text-gray-600 font-mono truncate uppercase mt-1 tracking-tighter">{api.description}</div>
                            </div>
                            <ChevronRight size={14} className={cn("shrink-0 transition-transform group-hover:translate-x-1", selectedApi?.title === api.title ? "text-[#9d4edd]" : "text-gray-800")} />
                        </button>
                    ))}
                </div>
                
                <div className="h-10 bg-black/80 border-t border-white/5 px-8 flex justify-between items-center text-[7px] font-mono text-gray-700 tracking-[0.2em] shrink-0 uppercase font-black">
                    <div className="flex gap-6">
                        <span>Lattice_Endpoints: {GOOGLE_APIS.length + liveSearchResults.length}</span>
                        <span className="text-[#10b981]">Auth: SECURE</span>
                    </div>
                    <span>Nexus_Core_</span>
                </div>
            </div>

            <div className="flex-1 bg-black/40 border border-white/5 rounded-[4rem] flex flex-col relative overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8)] group/forge">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(157,78,221,0.03)_0%,transparent_80%)] pointer-events-none" />
                
                <AnimatePresence mode="wait">
                    {selectedApi ? (
                        <motion.div 
                            key={selectedApi.title}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.02 }}
                            className="h-full flex flex-col p-12 z-10"
                        >
                            <div className="flex justify-between items-start mb-12">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                                            <span className="text-9px font-black text-[#9d4edd] uppercase tracking-[0.3em]">{selectedApi.category} Protocol</span>
                                        </div>
                                        <div className="h-1 w-12 bg-white/5 rounded-full" />
                                    </div>
                                    <h1 className="text-4xl font-black text-white font-mono tracking-tighter uppercase leading-none">{selectedApi.title}</h1>
                                </div>
                                <button onClick={() => setSelectedApi(null)} className="p-3 bg-white/5 hover:bg-red-500/20 text-gray-500 hover:text-red-500 rounded-2xl transition-all border border-transparent hover:border-red-500/30"><X size={24} /></button>
                            </div>

                            <div className="grid grid-cols-2 gap-10 mb-12">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 text-10px font-black text-gray-500 uppercase tracking-widest px-2">
                                        <Terminal size={14} className="text-[#9d4edd]" /> Capability Blueprint
                                    </div>
                                    <div className="p-8 bg-black/60 border border-white/5 rounded-[2.5rem] shadow-inner relative overflow-hidden group/summary">
                                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover/summary:opacity-10 transition-opacity"><Info size={60} /></div>
                                        <p className="text-sm text-gray-300 font-mono leading-relaxed italic border-l-4 border-[#9d4edd] pl-8">"{selectedApi.description}"</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 text-10px font-black text-gray-500 uppercase tracking-widest px-2">
                                        <Waypoints size={14} className="text-[#22d3ee]" /> Integration Schematic
                                    </div>
                                    <div className="bg-black/40 border border-white/5 rounded-[2.5rem] p-8 flex items-center justify-around relative shadow-inner">
                                        <SchematicNode label="Nexus" color="#9d4edd" icon={Globe} />
                                        <div className="flex-1 px-4 flex flex-col items-center gap-2">
                                            <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                                            <motion.div animate={{ x: [-20, 20] }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_10px_#10b981]" />
                                        </div>
                                        <SchematicNode label="Kernel" color="#22d3ee" icon={Cpu} />
                                        <div className="flex-1 px-4 flex flex-col items-center gap-2">
                                            <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                                            <motion.div animate={{ x: [20, -20] }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="w-1.5 h-1.5 rounded-full bg-[#f1c21b] shadow-[0_0_100px_#f1c21b]" />
                                        </div>
                                        <SchematicNode label="Swarm" color="#10b981" icon={Bot} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="flex justify-between items-end mb-4 px-2">
                                    <div className="flex items-center gap-3">
                                        <Code size={18} className="text-[#22d3ee]" />
                                        <span className="text-10px font-black text-gray-500 uppercase tracking-[0.4em]">MCP Capability Manifest</span>
                                    </div>
                                    {generatedSchema && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                                            <span className="text-9px font-mono text-[#10b981] font-bold uppercase">Ready for Injection</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 bg-black border border-white/5 rounded-[2.5rem] relative overflow-hidden group/code shadow-inner">
                                    <AnimatePresence mode="wait">
                                        {isForging ? (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-3xl z-20">
                                                <div className="relative mb-6">
                                                    <Loader2 size={40} className="text-[#9d4edd] animate-spin" />
                                                    <div className="absolute inset-0 blur-2xl bg-[#9d4edd]/30 animate-pulse" />
                                                </div>
                                                <p className="text-11px font-mono text-white animate-pulse tracking-[0.8em] uppercase">Synthesizing Protocol Logic...</p>
                                            </motion.div>
                                        ) : generatedSchema ? (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
                                                <pre className="p-10 font-mono text-11px text-gray-400 overflow-auto custom-scrollbar h-full selection:bg-[#9d4edd]/40 leading-relaxed">
                                                    {generatedSchema}
                                                </pre>
                                            </motion.div>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center opacity-10 group-hover/code:opacity-20 transition-all duration-1000">
                                                <Zap className="w-24 h-24 text-white mb-6" />
                                                <p className="text-xl font-mono uppercase tracking-[1em]">Awaiting Synthesis</p>
                                            </div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            <div className="mt-12 flex gap-6 shrink-0">
                                {!generatedSchema ? (
                                    <button 
                                        onClick={forgeCapability} 
                                        disabled={isForging}
                                        className="flex-1 py-6 bg-[#9d4edd] text-black rounded-[2rem] text-11px font-black uppercase tracking-[0.5em] hover:bg-[#b06bf7] transition-all shadow-[0_30px_80px_rgba(157,78,221,0.4)] flex items-center justify-center gap-5 active:scale-95 disabled:opacity-50"
                                    >
                                        <Sparkles size={20} /> Forge Protocol
                                    </button>
                                ) : (
                                    <>
                                        <button 
                                            onClick={forgeCapability}
                                            className="px-10 py-6 bg-white/5 border border-white/10 hover:border-white/30 text-gray-500 hover:text-white rounded-[2rem] text-10px font-black uppercase tracking-widest transition-all"
                                        >
                                            Re-Forge
                                        </button>
                                        <button 
                                            onClick={handleCommitToOS}
                                            disabled={isCommitting}
                                            className="flex-1 py-6 bg-[#10b981] text-black font-black font-mono text-11px uppercase tracking-[0.5em] rounded-[2rem] shadow-[0_30px_80px_rgba(16,185,129,0.4)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-5"
                                        >
                                            {isCommitting ? <Loader2 size={20} className="animate-spin" /> : <PlayCircle size={22} />}
                                            Commit to OS Swarm
                                        </button>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-20 opacity-10 group-hover/forge:opacity-20 transition-all duration-1000">
                            <div className="relative mb-12">
                                <Waypoints size={180} className="text-white animate-pulse" />
                                <div className="absolute inset-0 blur-[100px] bg-white/5" />
                            </div>
                            <h2 className="text-3xl font-black font-mono text-white mb-4 uppercase tracking-[0.8em]">Nexus Hub</h2>
                            <p className="text-xs font-mono text-gray-500 max-w-sm mx-auto uppercase tracking-widest leading-loose">Initialize endpoint selection to bridge global service intelligence into the Sovereign core.</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default NexusAPIExplorer;