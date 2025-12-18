import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, Globe, Loader2, Sparkles, Code, GitBranch, 
    ChevronRight, Zap, ExternalLink, Box, Database, 
    Layers, Cpu, BookOpen, ShieldCheck, Terminal, Trash2, X
} from 'lucide-react';
import { GOOGLE_APIS, GoogleApiDefinition } from '../data/googleApis';
import { useAppStore } from '../store';
import { retryGeminiRequest, promptSelectKey } from '../services/geminiService';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';

const NexusAPIExplorer: React.FC = () => {
    const { addLog, setProcessState } = useAppStore();
    const [query, setQuery] = useState('');
    const [selectedApi, setSelectedApi] = useState<GoogleApiDefinition | null>(null);
    const [isForging, setIsForging] = useState(false);
    const [generatedSchema, setGeneratedSchema] = useState<string | null>(null);

    const filtered = useMemo(() => {
        return GOOGLE_APIS.filter(api => 
            api.title.toLowerCase().includes(query.toLowerCase()) || 
            api.description.toLowerCase().includes(query.toLowerCase())
        );
    }, [query]);

    const forgeMcpTool = async () => {
        if (!selectedApi) return;
        setIsForging(true);
        setGeneratedSchema(null);
        addLog('SYSTEM', `NEXUS_FORGE: Synthesizing MCP manifest for ${selectedApi.title}...`);

        try {
            const hasKey = await window.aistudio?.hasSelectedApiKey();
            if (!hasKey) { await promptSelectKey(); setIsForging(false); return; }

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `
                ROLE: System Integration Architect.
                OBJECTIVE: Forge an MCP-compatible JSON Tool Definition for the following Google API.
                
                API TITLE: ${selectedApi.title}
                DESCRIPTION: ${selectedApi.description}
                
                REQUIREMENT:
                Generate a standards-compliant JSON schema that the Google Gemini Live API can use as a "tool".
                Include 'name', 'description', and 'parameters' (type: OBJECT).
                The parameters should be realistic based on the API description.
                
                RETURN ONLY RAW JSON.
            `;

            const response: GenerateContentResponse = await retryGeminiRequest(() => ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            }));

            setGeneratedSchema(response.text);
            addLog('SUCCESS', `NEXUS_FORGE: MCP definition finalized for ${selectedApi.title}.`);
        } catch (e: any) {
            addLog('ERROR', `NEXUS_FORGE_FAIL: ${e.message}`);
        } finally {
            setIsForging(false);
        }
    };

    const injectToMap = () => {
        if (!selectedApi || !generatedSchema) return;
        
        try {
            const schema = JSON.parse(generatedSchema);
            const newNode = {
                id: `nexus-${Date.now()}`,
                type: 'holographic',
                position: { x: 800, y: 300 },
                data: {
                    label: selectedApi.title,
                    subtext: 'MCP PLUGGED',
                    iconName: selectedApi.category === 'AI' ? 'BrainCircuit' : 'Cpu',
                    color: '#9d4edd',
                    status: 'ACTIVE',
                    description: `Autonomous integration for ${selectedApi.title}. Schema: ${JSON.stringify(schema).substring(0, 50)}...`
                }
            };

            // This triggers an additive update to the ReactFlow state handled in the parent logic
            setProcessState((prev: any) => ({
                pendingAIAddition: newNode 
            }));

            addLog('SUCCESS', `LATTICE_SYNC: ${selectedApi.title} Crystallized as Nexus Node.`);
            setSelectedApi(null);
            setGeneratedSchema(null);
        } catch (e) {
            addLog('ERROR', 'INJECTION_FAIL: Manifest corruption.');
        }
    };

    return (
        <div className="h-full flex gap-6 p-6 overflow-hidden">
            {/* Left: Search & List */}
            <div className="w-[450px] bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl overflow-hidden flex flex-col shadow-2xl">
                <div className="p-4 border-b border-[#1f1f1f] bg-[#111]">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-[#9d4edd]/10 border border-[#9d4edd]/30 rounded">
                            <Globe className="w-4 h-4 text-[#9d4edd]" />
                        </div>
                        <h2 className="text-xs font-bold font-mono text-white uppercase tracking-widest">Nexus API Registry</h2>
                    </div>
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-[#22d3ee] transition-colors" />
                        <input 
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search Google Ecosystem..."
                            className="w-full bg-[#050505] border border-[#333] pl-10 pr-4 py-2.5 text-xs font-mono text-white focus:border-[#22d3ee] outline-none rounded-lg"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {filtered.map((api, i) => (
                        <button
                            key={i}
                            onClick={() => setSelectedApi(api)}
                            className={`w-full text-left p-3 rounded-lg transition-all flex items-center justify-between group
                                ${selectedApi?.title === api.title ? 'bg-[#9d4edd]/10 border border-[#9d4edd]/30' : 'hover:bg-[#111] border border-transparent'}
                            `}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-bold text-gray-200 group-hover:text-white transition-colors">{api.title}</div>
                                <div className="text-[9px] text-gray-600 font-mono truncate">{api.description}</div>
                            </div>
                            <ChevronRight className={`w-3 h-3 ${selectedApi?.title === api.title ? 'text-[#9d4edd]' : 'text-gray-700'}`} />
                        </button>
                    ))}
                </div>
                
                <div className="p-3 bg-[#080808] border-t border-[#1f1f1f] flex justify-between text-[8px] font-mono text-gray-600">
                    <span>REGISTRY_COUNT: {GOOGLE_APIS.length}</span>
                    <span>PROTOCOL: MCP_v1</span>
                </div>
            </div>

            {/* Right: Preview & Forge */}
            <div className="flex-1 bg-[#050505] border border-[#1f1f1f] rounded-xl flex flex-col relative overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(157,78,221,0.05)_0%,transparent_70%)] pointer-events-none"></div>
                
                <AnimatePresence mode="wait">
                    {selectedApi ? (
                        <motion.div 
                            key={selectedApi.title}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex-1 flex flex-col p-8 z-10"
                        >
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <span className="text-[10px] font-black text-[#9d4edd] uppercase tracking-[0.4em] block mb-2">{selectedApi.category} PROTOCOL</span>
                                    <h1 className="text-3xl font-black text-white font-mono tracking-tighter uppercase">{selectedApi.title}</h1>
                                </div>
                                <button onClick={() => setSelectedApi(null)} className="p-2 text-gray-600 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                            </div>

                            <div className="bg-[#0a0a0a] border border-[#222] p-6 rounded-2xl mb-8">
                                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Terminal className="w-3 h-3" /> Core description
                                </h3>
                                <p className="text-sm text-gray-300 font-mono leading-relaxed">{selectedApi.description}</p>
                            </div>

                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-[10px] font-bold text-[#22d3ee] uppercase tracking-widest flex items-center gap-2">
                                        <Code className="w-4 h-4" /> MCP Manifest Forging
                                    </h3>
                                    {generatedSchema && (
                                        <button onClick={injectToMap} className="text-[10px] font-bold text-[#42be65] font-mono hover:underline uppercase flex items-center gap-2">
                                            <GitBranch className="w-3 h-3" /> Inject into Process Lattice
                                        </button>
                                    )}
                                </div>

                                <div className="flex-1 bg-black border border-[#1f1f1f] rounded-xl relative overflow-hidden group/code">
                                    {isForging ? (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-20">
                                            <Loader2 className="w-10 h-10 text-[#9d4edd] animate-spin mb-4" />
                                            <p className="text-[10px] font-mono text-[#9d4edd] animate-pulse tracking-widest uppercase">Synthesizing Tool Metadata...</p>
                                        </div>
                                    ) : generatedSchema ? (
                                        <pre className="p-6 font-mono text-[11px] text-gray-400 overflow-auto custom-scrollbar h-full selection:bg-[#9d4edd]/30">
                                            {generatedSchema}
                                        </pre>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center opacity-20 group-hover/code:opacity-40 transition-opacity">
                                            <Zap className="w-16 h-16 text-gray-400 mb-4" />
                                            <p className="text-xs font-mono uppercase tracking-[0.2em]">Ready for spectral synthesis</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {!generatedSchema && (
                                <button 
                                    onClick={forgeMcpTool}
                                    disabled={isForging}
                                    className="w-full py-5 mt-8 bg-[#9d4edd] text-black font-black font-mono text-xs uppercase tracking-[0.3em] rounded-xl hover:bg-[#b06bf7] transition-all shadow-[0_0_40px_rgba(157,78,221,0.3)] flex items-center justify-center gap-4"
                                >
                                    {isForging ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
                                    Forge MCP Tool definition
                                </button>
                            )}
                        </motion.div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-20 opacity-30">
                            <div className="w-32 h-32 rounded-full border-2 border-dashed border-gray-700 flex items-center justify-center mb-8 relative">
                                <Layers className="w-12 h-12 text-gray-600" />
                                <div className="absolute inset-0 rounded-full border border-[#9d4edd]/20 animate-ping"></div>
                            </div>
                            <h2 className="text-xl font-bold font-mono text-white mb-2 uppercase tracking-widest">Select Nexus Target</h2>
                            <p className="text-xs text-gray-500 font-mono max-w-sm">Choose a Google API from the registry to forge a spectral tool manifest for autonomic integration.</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default NexusAPIExplorer;