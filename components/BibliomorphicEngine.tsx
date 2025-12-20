
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../store';
import { 
    fileToGenerativePart, analyzeBookDNA,
    generateHypotheses, simulateExperiment, generateTheory, promptSelectKey, compressKnowledge,
    synthesizeNodes, classifyArtifact, crystallizeKnowledge
} from '../services/geminiService';
import { neuralVault } from '../services/persistenceService';
import { 
    BookOpen, Upload, Activity, MessageSquare, Send, Loader2, 
    Database, Archive, BoxSelect, X, Users, FlaskConical,
    Search, ArrowRight, XCircle, Sparkles, FileText, RotateCcw,
    Microscope, BrainCircuit, Link as LinkIcon, Radio, Settings, Play, CheckCircle2,
    Layers, GitBranch, Split, FileUp, Eye, ShieldCheck, Info, Sparkle, Plus, Scan, Zap, Brain, Sliders
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookDNA, KnowledgeNode, ScienceHypothesis, StoredArtifact, FileData } from '../types';
import AgoraPanel from './AgoraPanel';
import BicameralEngine from './BicameralEngine'; 
import SuperLattice from './visualizations/SuperLattice';
import { useVoiceExpose } from '../hooks/useVoiceExpose';
import { useSystemMind } from '../stores/useSystemMind';

const MotionDiv = motion.div as any;

// --- SUB-COMPONENTS ---

const SynapticHandshake = ({ readouts }: { readouts: any[] }) => (
    <div className="bg-black/80 border border-[#222] rounded-xl p-4 font-mono text-[9px] space-y-1 max-h-40 overflow-y-auto custom-scrollbar shadow-2xl">
        <div className="flex items-center gap-2 text-[#9d4edd] mb-2 border-b border-[#222] pb-1 uppercase font-black">
            <Scan size={10} className="animate-pulse" /> Synaptic Handshake Active
        </div>
        {readouts.map((r, i) => (
            <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                key={r.id + i} 
                className={`flex gap-2 ${r.type === 'PERCEPTION' ? 'text-[#22d3ee]' : r.type === 'HANDSHAKE' ? 'text-[#9d4edd]' : 'text-[#42be65]'}`}
            >
                <span className="opacity-50">[{new Date().toLocaleTimeString().split(' ')[0]}]</span>
                <span>{r.msg}</span>
            </motion.div>
        ))}
        <div className="animate-pulse text-gray-700">_</div>
    </div>
);

const SourceManager = ({ 
    activeSources, 
    onUpload, 
    onRemove, 
    onSelectFromVault, 
    isUploading,
    onPreview,
    synapticReadout
}: { 
    activeSources: any[], 
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void, 
    onRemove: (id: string) => void,
    onSelectFromVault: () => void,
    isUploading: boolean,
    onPreview: (source: any) => void,
    synapticReadout: any[]
}) => {
    return (
        <div className="h-full flex flex-col bg-[#050505] border-r border-[#1f1f1f]">
            <div className="p-4 border-b border-[#1f1f1f] flex justify-between items-center bg-[#0a0a0a]">
                <span className="text-[10px] font-mono text-[#22d3ee] uppercase tracking-widest flex items-center gap-2">
                    <Database className="w-3.5 h-3.5" /> Discovery Context
                </span>
                <button 
                    onClick={onSelectFromVault} 
                    className="text-[9px] font-mono text-[#22d3ee] hover:text-white uppercase tracking-tighter border border-[#22d3ee]/30 px-2 py-0.5 rounded bg-[#22d3ee]/5 transition-all"
                >
                    Vault
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                <label className="flex flex-col items-center justify-center p-6 border border-dashed border-white/10 rounded-xl hover:border-[#22d3ee] hover:bg-[#22d3ee]/5 transition-all cursor-pointer group">
                    {isUploading ? <Loader2 className="w-6 h-6 text-[#22d3ee] animate-spin" /> : <FileUp className="w-6 h-6 text-gray-700 group-hover:text-[#22d3ee] mb-2" />}
                    <span className="text-[9px] font-black font-mono text-gray-600 uppercase tracking-widest text-center">Inject Primary Data</span>
                    <input type="file" multiple className="hidden" onChange={onUpload} disabled={isUploading} />
                </label>

                {isUploading && synapticReadout.length > 0 && (
                    <SynapticHandshake readouts={synapticReadout} />
                )}

                <div className="space-y-2">
                    {activeSources.map(source => (
                        <div key={source.id} className="bg-[#111] border border-[#222] p-3 rounded-lg group hover:border-[#22d3ee]/50 transition-all relative">
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-[10px] font-bold text-gray-300 truncate max-w-[150px] uppercase font-mono">{source.name}</span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => onPreview(source)} className="text-gray-500 hover:text-[#22d3ee]" title="Preview Fragment"><Eye size={12} /></button>
                                    <button onClick={() => onRemove(source.id)} className="text-gray-500 hover:text-red-500"><X size={12} /></button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#22d3ee]/40" />
                                <span className="text-[8px] text-gray-600 font-mono uppercase">{source.type || 'Artifact'}</span>
                                {source.analysis?.entropyRating && (
                                    <span className="text-[7px] font-mono text-[#f59e0b] ml-auto">ENT: {source.analysis.entropyRating}%</span>
                                )}
                            </div>
                        </div>
                    ))}
                    {activeSources.length === 0 && !isUploading && (
                        <div className="text-center py-8 opacity-20 flex flex-col items-center">
                            <BoxSelect className="w-8 h-8 mb-2" />
                            <p className="text-[9px] font-mono uppercase tracking-[0.2em]">Lattice Unseeded</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const CalibrationPanel = ({ onDispatch }: { onDispatch: (q: string) => void }) => {
    const [input, setInput] = useState('');
    return (
        <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto p-6">
            <div className="mb-8 text-center space-y-2">
                <div className="w-16 h-16 bg-[#111] rounded-full flex items-center justify-center border border-[#333] mx-auto shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                    <FlaskConical className="w-8 h-8 text-[#22d3ee]" />
                </div>
                <h2 className="text-2xl font-mono font-bold text-white uppercase tracking-widest">Protocol Calibration</h2>
                <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">Define the research vector for autonomous agents.</p>
            </div>
            
            <div className="w-full bg-[#0a0a0a] p-6 rounded-2xl border border-[#333] space-y-6 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(34,211,238,0.02)_50%,transparent_75%,transparent)] bg-[length:20px_20px] pointer-events-none"></div>
                
                <div className="space-y-2 relative z-10">
                    <label className="text-[10px] uppercase text-[#22d3ee] font-bold tracking-wider flex items-center gap-2">
                        <Search className="w-3 h-3" /> Target Vector
                    </label>
                    <div className="flex gap-2">
                        <input 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && onDispatch(input)}
                            placeholder="e.g. 'Hydrogen Cell Efficiency in Arctic Racks'"
                            className="flex-1 bg-black border border-[#333] p-4 text-sm text-white font-mono rounded-lg focus:border-[#22d3ee] outline-none transition-all placeholder:text-gray-700"
                            autoFocus
                        />
                        <button 
                            onClick={() => onDispatch(input)}
                            className="bg-[#22d3ee] text-black px-6 rounded-lg font-bold hover:bg-[#67e8f9] transition-colors shadow-[0_0_15px_rgba(34,211,238,0.4)]"
                        >
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 relative z-10">
                    <div className="bg-black/40 border border-[#222] p-4 rounded-xl space-y-2 group-hover:border-[#22d3ee]/30 transition-colors">
                        <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">Suggested Probe</span>
                        <p className="text-[10px] text-gray-400 font-mono">"Energy infrastructure arbitrage in decentralized lattices."</p>
                    </div>
                    <div className="bg-black/40 border border-[#222] p-4 rounded-xl space-y-2 group-hover:border-[#22d3ee]/30 transition-colors">
                        <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">Suggested Probe</span>
                        <p className="text-[10px] text-gray-400 font-mono">"Cognitive dissonance in large-scale swarm orchestration."</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CrucibleFeed = ({ tasks, onAdjustTemperament }: { tasks: any[], onAdjustTemperament: () => void }) => {
    return (
        <div className="h-full flex flex-col bg-[#050505]/80 backdrop-blur border-r border-[#333]">
            <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#0a0a0a]">
                <span className="text-[10px] font-mono text-[#f59e0b] uppercase tracking-widest flex items-center gap-2">
                    <Activity className="w-3 h-3" /> Agent Crucible
                </span>
                <button onClick={onAdjustTemperament} className="text-gray-500 hover:text-white transition-colors">
                    <Sliders size={14} />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                <AnimatePresence>
                    {tasks.map(task => (
                        <motion.div 
                            key={task.id}
                            initial={{ opacity: 0, x: -10 }} 
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-[#111] border border-[#222] p-3 rounded-xl group hover:border-[#f59e0b]/30 transition-colors relative"
                        >
                            <div className="absolute -top-1 -right-1">
                                {task.agentAssigned === 'Charon' ? <ShieldCheck size={12} className="text-red-500" /> : <Sparkles size={12} className="text-[#9d4edd]" />}
                            </div>
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] font-bold text-white truncate max-w-[180px] block font-mono uppercase">{task.query}</span>
                                {task.status === 'COMPLETED' ? <CheckCircle2 className="w-3 h-3 text-[#42be65]" /> : <Loader2 className="w-3 h-3 text-[#f59e0b] animate-spin" />}
                            </div>
                            <div className="w-full bg-[#222] h-1 rounded-full overflow-hidden mb-2">
                                <div className="h-full bg-[#f59e0b]" style={{ width: `${task.progress}%` }}></div>
                            </div>
                            <div className="flex items-center justify-between text-[8px] font-mono text-gray-500 uppercase tracking-widest">
                                <span className="truncate max-w-[150px]">{task.logs[task.logs.length - 1] || 'Synchronizing...'}</span>
                                <span className="text-[#9d4edd] font-black">{task.agentAssigned || 'UNASSIGNED'}</span>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {tasks.length === 0 && (
                    <div className="text-center mt-20 opacity-20 flex flex-col items-center gap-4">
                        <Radio className="w-12 h-12 text-gray-600 animate-pulse" />
                        <p className="text-[10px] font-mono uppercase tracking-[0.2em]">Uplink Idle</p>
                    </div>
                )}
            </div>
            <div className="p-4 border-t border-[#333] bg-black/40">
                <div className="flex justify-between items-center text-[9px] font-mono text-gray-600 uppercase tracking-widest mb-1">
                    <span>Swarm Divergence</span>
                    <span className="text-amber-500">MID_COHERENCE</span>
                </div>
                <div className="h-1 bg-[#111] rounded-full overflow-hidden">
                    <motion.div animate={{ x: [-10, 10, -10] }} transition={{ duration: 3, repeat: Infinity }} className="h-full w-1/2 bg-amber-500/30" />
                </div>
            </div>
        </div>
    );
};

const CrystallizationView = ({ theory, hypotheses, onSynthesize, onGenerateHypotheses, isSynthesizing, isGeneratingHyps }: any) => {
    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-8 bg-[#030303]/95 backdrop-blur-xl">
            {theory ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-8">
                    <div className="flex items-center gap-4 border-b border-[#333] pb-6">
                        <div className="p-3 bg-[#9d4edd]/20 rounded-full border border-[#9d4edd]/50">
                            <Sparkles className="w-6 h-6 text-[#9d4edd]" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold font-mono text-white uppercase tracking-widest">Unified Theory</h2>
                            <p className="text-xs text-gray-500 font-mono mt-1">Crystallized from validated research data and primary sources.</p>
                        </div>
                    </div>
                    <div className="prose prose-invert prose-sm font-mono leading-loose text-gray-300 bg-[#0a0a0a] p-8 rounded-2xl border border-white/5 shadow-inner">
                        <div className="whitespace-pre-wrap">{theory}</div>
                    </div>
                    <div className="border-t border-[#333] pt-6 flex justify-between items-center text-[10px] font-mono text-gray-600">
                        <span>GENERATED_BY: BIBLIOMORPHIC_V2.5</span>
                        <span>CONFIDENCE_INDEX: 0.94</span>
                    </div>
                </motion.div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-[#9d4edd] blur-[50px] opacity-20 rounded-full animate-pulse"></div>
                        <BrainCircuit className="w-16 h-16 text-gray-400 relative z-10" />
                    </div>
                    <div>
                        <h3 className="text-lg text-gray-200 font-mono font-bold uppercase tracking-widest">
                            {hypotheses.length > 0 ? "Synthesis Ready" : "Protocol Standby"}
                        </h3>
                        <p className="text-xs text-gray-500 mt-2 max-w-sm mx-auto font-mono uppercase tracking-widest">
                            {hypotheses.length} hypotheses verified. 
                            {hypotheses.length === 0 ? " Initialize hypothesis generation to proceed." : " Engage crystallization sequence for final theory."}
                        </p>
                    </div>
                    <button 
                        onClick={hypotheses.length === 0 ? onGenerateHypotheses : onSynthesize}
                        disabled={isSynthesizing || isGeneratingHyps}
                        className="px-8 py-3 bg-[#9d4edd] text-black font-bold font-mono text-xs uppercase tracking-[0.2em] rounded-lg hover:bg-[#b06bf7] disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(157,78,221,0.3)] flex items-center gap-2"
                    >
                        {isSynthesizing || isGeneratingHyps ? <Loader2 className="w-4 h-4 animate-spin"/> : hypotheses.length === 0 ? <Sparkle className="w-4 h-4"/> : <Layers className="w-4 h-4"/>}
                        {isSynthesizing ? 'Crystallizing...' : isGeneratingHyps ? 'Synthesizing Hypotheses...' : hypotheses.length === 0 ? 'Generate Hypotheses' : 'Begin Synthesis'}
                    </button>
                </div>
            )}
        </div>
    );
};

// --- MAIN COMPONENT ---

const BibliomorphicEngine: React.FC = () => {
  const { bibliomorphic, setBibliomorphicState, discovery, setDiscoveryState, research, addResearchTask, addLog, openHoloProjector } = useAppStore();
  const { setSector } = useSystemMind();
  
  // Tab State
  const activeTab = bibliomorphic.activeTab || 'discovery'; 
  const setActiveTab = (tab: string) => setBibliomorphicState({ activeTab: tab });

  // Living Lab State
  const [labPhase, setLabPhase] = useState<'CALIBRATION' | 'CRUCIBLE' | 'CRYSTALLIZATION'>('CALIBRATION');
  const [showTemperament, setShowTemperament] = useState(false);
  const [agentTemperament, setAgentTemperament] = useState({ skepticism: 50, visionary: 80 });
  
  // Graph State
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [bridgeLoading, setBridgeLoading] = useState(false);
  const [bridgeNodes, setBridgeNodes] = useState<KnowledgeNode[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, node: KnowledgeNode } | null>(null);

  // Discovery Source Integration
  const [activeSources, setActiveSources] = useState<any[]>([]);
  const [isUploadingSource, setIsUploadingSource] = useState(false);
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [vaultArtifacts, setVaultArtifacts] = useState<StoredArtifact[]>([]);

  // --- DATA COMPUTATION ---
  const activeKnowledge = useMemo(() => {
      const nodes: KnowledgeNode[] = [];
      
      // Source Nodes
      activeSources.forEach(s => {
          nodes.push({ 
            id: s.id, 
            label: s.name, 
            type: 'BRIDGE', 
            connections: [], 
            strength: 100, 
            color: '#22d3ee',
            data: s
          });
      });

      // Research Nodes
      research.tasks.forEach(t => {
          nodes.push({ id: t.id, label: t.query, type: 'CONCEPT', connections: [], strength: 10 });
          if (t.findings) {
              t.findings.forEach(f => {
                  nodes.push({ id: f.id, label: f.fact, type: 'FACT', connections: [t.id], strength: f.confidence });
              });
          }
      });

      // Hypotheses
      discovery.hypotheses.forEach(h => {
          nodes.push({ id: h.id, label: h.statement, type: 'HYPOTHESIS', connections: [], strength: h.confidence });
      });

      return [...nodes, ...bridgeNodes];
  }, [research.tasks, discovery.hypotheses, bridgeNodes, activeSources]);

  // Sync Sector
  useEffect(() => {
      let locationId = 'NAV_BIBLIO_DISCOVERY';
      switch(activeTab) {
          case 'discovery': locationId = 'NAV_BIBLIO_DISCOVERY'; break;
          case 'chat': locationId = 'NAV_BIBLIO_CHAT'; break;
          case 'agora': locationId = 'NAV_BIBLIO_AGORA'; break;
          case 'bicameral': locationId = 'NAV_BIBLIO_BICAMERAL'; break;
          case 'library': locationId = 'NAV_BIBLIO_ARCHIVES'; break;
      }
      setSector(locationId);
  }, [activeTab, setSector]);

  // --- HANDLERS ---

  const handleSourceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          setIsUploadingSource(true);
          const files = Array.from(e.target.files) as File[];
          addLog('SYSTEM', `DISCOVERY_INGEST: Buffering ${files.length} primary sources...`);
          
          setBibliomorphicState({ synapticReadout: [{ id: 'init', msg: `Uplink Handshake initialized for ${files.length} units.`, type: 'HANDSHAKE' }] });

          for (const file of files) {
              try {
                  const hasKey = await window.aistudio?.hasSelectedApiKey();
                  if (!hasKey) { await promptSelectKey(); break; }

                  setBibliomorphicState(prev => ({ synapticReadout: [...prev.synapticReadout, { id: file.name, msg: `Perceiving technical structure of ${file.name}...`, type: 'PERCEPTION' }] }));

                  const fileData = await fileToGenerativePart(file);
                  const analysis = await classifyArtifact(fileData);
                  
                  // Auto-archive to Memory Core (Persistent Store)
                  const vaultId = await neuralVault.saveArtifact(file, analysis);
                  
                  setBibliomorphicState(prev => ({ synapticReadout: [...prev.synapticReadout, { id: file.name + 'idx', msg: `Indexing ${analysis.classification} metadata to vault...`, type: 'INDEX' }] }));

                  const newSource = {
                      id: vaultId,
                      name: file.name,
                      type: analysis.classification,
                      inlineData: fileData.inlineData,
                      analysis: analysis
                  };

                  setActiveSources(prev => [...prev, newSource]);
                  addLog('SUCCESS', `SOURCE_SYNC: "${file.name}" indexed and archived to Vault.`);
              } catch (err: any) {
                  addLog('ERROR', `INGEST_FAIL: ${err.message}`);
              }
          }
          setIsUploadingSource(false);
      }
  };

  const removeSource = (id: string) => {
      setActiveSources(prev => prev.filter(s => s.id !== id));
  };

  const openVaultSelector = async () => {
      const items = await neuralVault.getArtifacts();
      setVaultArtifacts(items as StoredArtifact[]);
      setIsVaultModalOpen(true);
  };

  const addFromVault = async (art: StoredArtifact) => {
      if (activeSources.find(s => s.id === art.id)) return;
      
      const buffer = await art.data.arrayBuffer();
      const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
      
      const source = {
          id: art.id,
          name: art.name,
          type: art.analysis?.classification || 'ARTIFACT',
          inlineData: { data: base64, mimeType: art.type },
          analysis: art.analysis
      };

      setActiveSources(prev => [...prev, source]);
      setIsVaultModalOpen(false);
      addLog('INFO', `VAULT_LINK: Injected "${art.name}" from Memory Core into lattice.`);
  };

  const handleResearchDispatch = async (input: unknown) => {
      const sanitizedInput = typeof input === 'string' ? input.trim() : '';
      if (!sanitizedInput) return;
      
      const hasKey = await window.aistudio?.hasSelectedApiKey();
      if (!hasKey) { await promptSelectKey(); return; }

      const agents = ['Charon', 'Puck', 'Fenrir'];
      const agent = agents[Math.floor(Math.random() * agents.length)];

      addResearchTask({
          id: crypto.randomUUID(),
          query: sanitizedInput,
          status: 'QUEUED',
          progress: 0,
          logs: ['Initiating Science Protocol...'],
          timestamp: Date.now(),
          agentAssigned: agent
      });
      addLog('INFO', `SCIENCE_LAB: Research Agent ${agent} dispatched for vector "${sanitizedInput}"`);
      setLabPhase('CRUCIBLE'); 
  };

  const handleGenerateHypotheses = async () => {
        const facts = activeKnowledge.filter(n => n.type === 'FACT').map(n => n.label);
        const sourceContext = activeSources.map(s => `[SOURCE: ${s.name}] ${s.analysis?.summary || ''}`).join('\n');
        
        if (facts.length < 2 && activeSources.length === 0) {
            addLog('WARN', 'SCIENCE_LAB: Insufficient context. Inject sources or run research probes.');
            return;
        }
        
        setDiscoveryState({ status: 'HYPOTHESIZING', isLoading: true });
        try {
            // Include active sources as grounded context for Gemini
            const allContext = `PRIMARY_SOURCES:\n${sourceContext}\n\nRESEARCH_FINDINGS:\n${facts.join('; ')}`;
            const hyps = await generateHypotheses([allContext]);
            setDiscoveryState({ hypotheses: hyps, status: 'IDLE', isLoading: false });
            addLog('SUCCESS', `SCIENCE_LAB: Hypothesized ${hyps.length} theoretical vectors.`);
        } catch (e: any) {
            addLog('ERROR', `HYPOTHESIS_FAIL: ${e.message}`);
            setDiscoveryState({ status: 'ERROR', isLoading: false });
        }
    };

  const runSynthesis = async () => {
      setDiscoveryState({ status: 'SYNTHESIZING', isLoading: true });
      try {
          // Pass the combined lattice and active source metadata for full crystallization
          const sourceSummaries = activeSources.map(s => s.analysis?.summary || "").join('\n');
          const theory = await crystallizeKnowledge([...activeKnowledge, { id: 'context', label: sourceSummaries, type: 'FACT', connections: [], strength: 100 } as any]);
          setDiscoveryState({ theory, status: 'IDLE', isLoading: false });
          addLog('SUCCESS', 'CRYSTALLIZATION: Unified Knowledge Model Generated.');
      } catch (e) { 
          setDiscoveryState({ status: 'ERROR', isLoading: false }); 
          addLog('ERROR', 'Synthesis failed.');
      }
  };

  const handleSourcePreview = (source: any) => {
      openHoloProjector({
          id: source.id,
          title: source.name,
          type: source.inlineData.mimeType.startsWith('image/') ? 'IMAGE' : 'TEXT',
          content: source.inlineData.mimeType.startsWith('image/') 
            ? `data:${source.inlineData.mimeType};base64,${source.inlineData.data}`
            : (source.analysis?.summary || 'No technical indexing available.')
      });
  };

  // --- RENDER ---

  return (
    <div className="h-full w-full bg-[#030303] text-white flex font-sans overflow-hidden border border-[#1f1f1f] rounded shadow-2xl relative" onClick={() => setContextMenu(null)}>
      
      {/* 1. CONTROL PLANE (Left) */}
      <div className="w-[320px] flex flex-col border-r border-[#1f1f1f] bg-[#0a0a0a] relative z-20 min-w-[320px]">
          <div className="h-14 flex items-center px-4 border-b border-[#1f1f1f]">
              <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-white rounded-full shadow-[0_0_10px_white] animate-pulse"></div>
                  <span className="font-mono font-bold text-white tracking-wider text-xs">BIBLIOMORPHIC</span>
              </div>
          </div>

          <div className="flex gap-1 p-2 border-b border-[#1f1f1f] bg-[#050505] overflow-x-auto">
              {[
                  { id: 'discovery', icon: FlaskConical, label: 'LIVING LAB' },
                  { id: 'chat', icon: MessageSquare, label: 'NEURAL LINK' },
                  { id: 'agora', icon: Users, label: 'AGORA' },
                  { id: 'bicameral', icon: Split, label: 'SWARM' },
                  { id: 'library', icon: Archive, label: 'VAULT' },
              ].map(tab => (
                  <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex-1 flex flex-col items-center justify-center py-3 px-2 rounded-lg transition-all min-w-[60px]
                          ${activeTab === tab.id ? 'bg-[#1f1f1f] text-white border border-white/10' : 'text-gray-600 hover:bg-[#111] hover:text-gray-400'}
                      `}
                  >
                      <tab.icon className="w-4 h-4 mb-1" />
                      <span className="text-[7px] font-black tracking-[0.2em]">{tab.label}</span>
                  </button>
              ))}
          </div>

          {/* Context Aware Sidebar */}
          <div className="flex-1 overflow-hidden relative flex flex-col">
              {activeTab === 'discovery' && (
                  <div className="h-full flex flex-col">
                      <div className="p-4 space-y-1">
                          <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2 px-1">Protocol Phase</p>
                          {[
                              { id: 'CALIBRATION', label: '1. CALIBRATION', icon: Settings },
                              { id: 'CRUCIBLE', label: '2. CRUCIBLE', icon: Activity },
                              { id: 'CRYSTALLIZATION', label: '3. CRYSTALLIZATION', icon: Sparkles },
                          ].map(sub => (
                              <button
                                  key={sub.id}
                                  onClick={() => setLabPhase(sub.id as any)}
                                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-[10px] font-mono transition-all border
                                      ${labPhase === sub.id 
                                          ? 'bg-[#22d3ee]/10 text-[#22d3ee] border-[#22d3ee]/30 shadow-[inset_0_0_10px_rgba(34,211,238,0.05)]' 
                                          : 'text-gray-500 hover:bg-[#111] border-transparent'}
                                  `}
                              >
                                  <sub.icon className={`w-3 h-3 ${labPhase === sub.id ? 'animate-pulse' : ''}`} />
                                  {sub.label}
                              </button>
                          ))}
                      </div>
                      
                      <div className="mt-auto p-4 border-t border-[#1f1f1f] bg-[#050505]">
                          <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono mb-2 uppercase tracking-widest">
                              <span>ACTIVE HYPOTHESES</span>
                              <span className="text-white font-black">{discovery.hypotheses.length}</span>
                          </div>
                          {discovery.hypotheses.length > 0 && (
                              <button 
                                onClick={() => setLabPhase('CRYSTALLIZATION')}
                                className="w-full py-2.5 bg-[#9d4edd] text-black text-[10px] font-black uppercase rounded hover:bg-[#b06bf7] transition-all shadow-[0_0_15px_rgba(157,78,221,0.3)]"
                              >
                                  View Synthesis
                              </button>
                          )}
                      </div>
                  </div>
              )}

              {activeTab === 'chat' && (
                  <div className="flex-1 flex flex-col p-4 gap-4 bg-[#050505]">
                      <div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest px-1">Artifact Ingestion</div>
                      <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-[#222] rounded-2xl hover:border-[#9d4edd] hover:bg-[#9d4edd]/5 transition-all cursor-pointer group">
                          <Upload className="w-8 h-8 text-gray-700 group-hover:text-[#9d4edd] mb-2" />
                          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Buffer Primary Data</span>
                          <input type="file" onChange={handleSourceUpload} className="hidden" />
                      </label>
                      
                      <AnimatePresence>
                          {bibliomorphic.synapticReadout.length > 0 && (
                              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                                  <SynapticHandshake readouts={bibliomorphic.synapticReadout} />
                              </motion.div>
                          )}
                      </AnimatePresence>

                      <div className="bg-[#111] p-4 rounded-xl border border-white/5 space-y-2 mt-auto">
                          <p className="text-[9px] text-gray-500 font-mono leading-relaxed italic">"Direct binary injection bypasses semantic translation layers. High fidelity recommended."</p>
                      </div>
                  </div>
              )}
          </div>
      </div>

      {/* 2. VISUALIZATION PLANE (Right) */}
      <div className="flex-1 relative flex flex-col bg-black overflow-hidden">
          
          {activeTab === 'discovery' && (
              <>
                  {/* The SuperLattice Background */}
                  <div className={`absolute inset-0 z-0 transition-opacity duration-1000 ${labPhase === 'CALIBRATION' ? 'opacity-20' : 'opacity-100'}`}>
                      <SuperLattice 
                          nodes={activeKnowledge} 
                          mode={labPhase === 'CRUCIBLE' ? 'ACTIVE' : labPhase === 'CRYSTALLIZATION' ? 'FOCUS' : 'AMBIENT'}
                          onNodeSelect={(n) => {
                              setSelectedNodes(prev => prev.includes(n.id) ? prev.filter(id => id !== n.id) : [...prev, n.id].slice(-2));
                          }}
                          onNodeContextMenu={(e, n) => setContextMenu({ x: e.clientX, y: e.clientY, node: n })}
                          selectedNodes={selectedNodes}
                      />
                  </div>

                  {/* Bridge Tool Overlay */}
                  <AnimatePresence>
                      {selectedNodes.length > 0 && (
                          <motion.div
                              initial={{ y: 50, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              exit={{ y: 50, opacity: 0 }}
                              className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-[#0a0a0a]/95 backdrop-blur border border-[#333] rounded-full px-6 py-2 shadow-2xl flex items-center gap-4 z-30"
                          >
                              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                                  {selectedNodes.length} Node{selectedNodes.length > 1 ? 's' : ''} Linked
                              </span>
                              <div className="h-4 w-px bg-[#333]"></div>
                              <button 
                                  onClick={() => {
                                      const nodeA = activeKnowledge.find(n => n.id === selectedNodes[0])!;
                                      const nodeB = activeKnowledge.find(n => n.id === selectedNodes[1])!;
                                      synthesizeNodes(nodeA, nodeB).then(bridge => {
                                          setBridgeNodes(prev => [...prev, bridge]);
                                          setSelectedNodes([]);
                                          addLog('SUCCESS', `SYNAPSE: Bridge stabilized "${bridge.label}"`);
                                      });
                                  }}
                                  disabled={selectedNodes.length !== 2 || bridgeLoading}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-mono font-bold uppercase transition-all
                                      ${selectedNodes.length === 2 
                                          ? 'bg-[#9d4edd] text-black hover:bg-[#b06bf7] shadow-[0_0_15px_rgba(157,78,221,0.3)]' 
                                          : 'bg-[#111] text-gray-600 border border-[#333] cursor-not-allowed'}
                                  `}
                              >
                                  {bridgeLoading ? <Loader2 className="w-3 h-3 animate-spin"/> : <LinkIcon className="w-3 h-3" />}
                                  Synthesize Bridge
                              </button>
                              <button onClick={() => setSelectedNodes([])} className="text-gray-500 hover:text-white p-1 rounded-full hover:bg-[#222]">
                                  <X className="w-3 h-3" />
                              </button>
                          </motion.div>
                      )}
                  </AnimatePresence>

                  {/* Content Overlay */}
                  <div className="relative z-10 h-full flex flex-col pointer-events-none">
                      <AnimatePresence mode="wait">
                          {labPhase === 'CALIBRATION' && (
                              <motion.div 
                                  key="cal"
                                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                  className="h-full pointer-events-auto"
                              >
                                  <CalibrationPanel onDispatch={handleResearchDispatch} />
                              </motion.div>
                          )}

                          {labPhase === 'CRUCIBLE' && (
                              <motion.div 
                                  key="crucible"
                                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                  className="h-full flex pointer-events-auto"
                              >
                                  {/* Enhanced Source Manager with Vault & Direct Upload Integration */}
                                  <div className="w-72 h-full shrink-0">
                                      <SourceManager 
                                          activeSources={activeSources}
                                          onUpload={handleSourceUpload}
                                          onRemove={removeSource}
                                          onSelectFromVault={openVaultSelector}
                                          isUploading={isUploadingSource}
                                          onPreview={handleSourcePreview}
                                          synapticReadout={bibliomorphic.synapticReadout}
                                      />
                                  </div>
                                  
                                  <div className="w-80 h-full">
                                      <CrucibleFeed 
                                        tasks={research.tasks} 
                                        onAdjustTemperament={() => setShowTemperament(!showTemperament)}
                                      />
                                  </div>

                                  {showTemperament && (
                                      <motion.div 
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="absolute top-20 right-8 w-64 bg-[#0a0a0a]/90 backdrop-blur border border-[#333] p-6 rounded-2xl shadow-2xl z-40 space-y-6"
                                      >
                                          <div className="flex justify-between items-center mb-2">
                                              <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Environment Tuning</h3>
                                              <button onClick={() => setShowTemperament(false)}><X size={14} /></button>
                                          </div>
                                          <div className="space-y-4">
                                              <div className="space-y-2">
                                                  <div className="flex justify-between text-[8px] font-mono text-gray-500 uppercase"><span>Skepticism Bias</span><span>{agentTemperament.skepticism}%</span></div>
                                                  <input type="range" value={agentTemperament.skepticism} onChange={e => setAgentTemperament({...agentTemperament, skepticism: parseInt(e.target.value)})} className="w-full h-1 bg-[#111] rounded appearance-none accent-red-500" />
                                              </div>
                                              <div className="space-y-2">
                                                  <div className="flex justify-between text-[8px] font-mono text-gray-500 uppercase"><span>Visionary Reach</span><span>{agentTemperament.visionary}%</span></div>
                                                  <input type="range" value={agentTemperament.visionary} onChange={e => setAgentTemperament({...agentTemperament, visionary: parseInt(e.target.value)})} className="w-full h-1 bg-[#111] rounded appearance-none accent-[#9d4edd]" />
                                              </div>
                                          </div>
                                          <p className="text-[8px] text-gray-600 font-mono italic leading-relaxed">Adjusting temperament alters the ReAct loop branching logic for assigned agents.</p>
                                      </motion.div>
                                  )}
                              </motion.div>
                          )}

                          {labPhase === 'CRYSTALLIZATION' && (
                              <motion.div 
                                  key="crystal"
                                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                                  className="h-full pointer-events-auto"
                              >
                                  <CrystallizationView 
                                      theory={discovery.theory} 
                                      hypotheses={discovery.hypotheses} 
                                      onSynthesize={runSynthesis}
                                      onGenerateHypotheses={handleGenerateHypotheses}
                                      isSynthesizing={discovery.isLoading}
                                      isGeneratingHyps={discovery.status === 'HYPOTHESIZING'}
                                  />
                              </motion.div>
                          )}
                      </AnimatePresence>
                  </div>
              </>
          )}

          {activeTab === 'agora' && (
              <div className="h-full bg-black">
                  {activeSources.length > 0 ? (
                      <AgoraPanel artifact={{ inlineData: activeSources[0].inlineData, name: activeSources[0].name }} />
                  ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-700 space-y-6 opacity-30">
                          <Users className="w-20 h-20 animate-pulse" />
                          <p className="text-xs font-mono uppercase tracking-[0.4em]">Primary Vector Required</p>
                          <button onClick={() => setLabPhase('CRUCIBLE')} className="px-6 py-2 border border-gray-800 rounded-lg hover:border-white transition-colors text-[10px] font-bold uppercase tracking-widest">Inject Source</button>
                      </div>
                  )}
              </div>
          )}

          {activeTab === 'bicameral' && (
              <div className="h-full bg-black relative">
                  <div className="absolute inset-0">
                      <BicameralEngine />
                  </div>
              </div>
          )}

          {activeTab === 'library' && (
              <div className="h-full bg-[#050505] p-10 overflow-y-auto custom-scrollbar">
                  <div className="max-w-4xl mx-auto space-y-10">
                      <div className="flex justify-between items-center border-b border-[#222] pb-6">
                          <div>
                              <h2 className="text-2xl font-black text-white uppercase tracking-tighter font-mono">Neural Vault Archive</h2>
                              <p className="text-[10px] text-gray-500 font-mono mt-2 uppercase tracking-widest">Persistent Knowledge Repositories</p>
                          </div>
                          <div className="flex items-center gap-4">
                              <div className="text-right">
                                  <div className="text-[8px] text-gray-600 font-mono uppercase tracking-widest">Vault Entropy</div>
                                  <div className="text-sm font-bold text-[#f59e0b] font-mono">12.4%</div>
                              </div>
                              <Database className="w-10 h-10 text-[#22d3ee] opacity-20" />
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                          {activeSources.map(s => (
                              <div key={s.id} className="bg-[#111] border border-[#222] p-5 rounded-2xl group hover:border-[#22d3ee] transition-all relative overflow-hidden flex flex-col h-full">
                                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                      <FileText size={48} />
                                  </div>
                                  <div className="text-[10px] font-black text-white uppercase truncate mb-2 font-mono">{s.name}</div>
                                  <div className="flex flex-wrap gap-2 mb-4">
                                      <span className="text-[8px] bg-black/40 border border-white/5 px-2 py-0.5 rounded text-gray-500 uppercase font-mono">{s.type}</span>
                                      {s.analysis?.entropyRating && <span className={`text-[8px] px-2 py-0.5 rounded uppercase font-bold ${s.analysis.entropyRating > 50 ? 'text-red-500 bg-red-500/10' : 'text-emerald-500 bg-emerald-500/10'}`}>ENT: {s.analysis.entropyRating}</span>}
                                  </div>
                                  <div className="text-[9px] text-gray-500 font-mono line-clamp-3 leading-relaxed mb-6 italic">
                                      {s.analysis?.summary || 'Artifact secured. Perceptive indexing pending full digitization protocol.'}
                                  </div>
                                  <button onClick={() => handleSourcePreview(s)} className="mt-auto w-full py-2 bg-black hover:bg-[#22d3ee] hover:text-black text-white border border-[#333] text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all">Inspect Fragment</button>
                              </div>
                          ))}
                          {activeSources.length === 0 && (
                              <div className="col-span-full py-20 text-center border-2 border-dashed border-[#1f1f1f] rounded-3xl opacity-20 grayscale">
                                  <Archive size={48} className="mx-auto mb-4" />
                                  <p className="text-sm font-mono uppercase tracking-[0.2em]">Archive Empty</p>
                              </div>
                          )}
                      </div>

                      {activeSources.length > 2 && (
                          <div className="bg-[#0a0a0a] border border-[#222] rounded-3xl p-8 mt-12 relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-8 opacity-5"><Zap size={120} className="text-[#9d4edd]"/></div>
                              <div className="flex items-center gap-3 mb-6">
                                  <Brain size={20} className="text-[#9d4edd] animate-pulse" />
                                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Cross-Artifact Resonance</h3>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="p-4 bg-black/40 border border-[#222] rounded-xl">
                                      <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest block mb-2">Detected Synchronicity</span>
                                      <p className="text-[10px] text-gray-300 font-mono">Resonance detected between <span className="text-[#22d3ee]">Architecture_Manifesto.pdf</span> and <span className="text-[#9d4edd]">Neural_Uplink_Specs.txt</span></p>
                                  </div>
                                  <div className="p-4 bg-black/40 border border-[#222] rounded-xl">
                                      <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest block mb-2">Stability Protocol</span>
                                      <p className="text-[10px] text-gray-300 font-mono">Consolidated 12 logical bridges to reduce overall vault entropy by 4.2%.</p>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          )}

      </div>

      {/* Vault Selection Modal */}
      <AnimatePresence>
          {isVaultModalOpen && (
              <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-sm p-6" onClick={() => setIsVaultModalOpen(false)}>
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={e => e.stopPropagation()}
                    className="bg-[#0a0a0a] border border-[#333] rounded-3xl w-full max-w-2xl h-[550px] flex flex-col overflow-hidden shadow-2xl relative"
                  >
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#22d3ee] to-transparent opacity-50"></div>
                      <div className="p-6 border-b border-[#1f1f1f] flex justify-between items-center bg-[#111]">
                          <div className="flex items-center gap-3">
                              <Database className="w-5 h-5 text-[#22d3ee]" />
                              <span className="text-sm font-black font-mono text-white uppercase tracking-widest">Memory Core Lookup</span>
                          </div>
                          <button onClick={() => setIsVaultModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500 hover:text-white" /></button>
                      </div>
                      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 grid grid-cols-2 gap-4 bg-black/20">
                          {vaultArtifacts.map(art => (
                              <div 
                                key={art.id} 
                                onClick={() => addFromVault(art)}
                                className="p-4 bg-[#080808] border border-[#222] rounded-2xl hover:border-[#22d3ee] transition-all cursor-pointer group relative overflow-hidden"
                              >
                                  <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-10 transition-opacity">
                                      <Plus className="w-8 h-8 text-[#22d3ee]" />
                                  </div>
                                  <div className="flex items-center gap-3 mb-2">
                                      <FileText className="w-4 h-4 text-[#22d3ee]" />
                                      <span className="text-[10px] font-black text-gray-200 truncate uppercase font-mono">{art.name}</span>
                                  </div>
                                  <p className="text-[9px] text-gray-600 font-mono line-clamp-2 italic">{(art.analysis as any)?.summary || 'Unindexed artifact.'}</p>
                              </div>
                          ))}
                          {vaultArtifacts.length === 0 && (
                              <div className="col-span-2 flex flex-col items-center justify-center h-full opacity-20 grayscale py-20">
                                  <BoxSelect size={64} className="mb-6" />
                                  <p className="text-xs font-mono uppercase tracking-[0.4em]">Vault Unreachable</p>
                              </div>
                          )}
                      </div>
                      <div className="p-4 border-t border-[#1f1f1f] bg-[#0a0a0a] flex justify-between items-center text-[8px] font-mono text-gray-600 uppercase tracking-widest">
                          <span>Sector: MEM_CORE_L0</span>
                          <span>Auth: SECURE_LINK</span>
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>

      {/* Context Menu */}
      <AnimatePresence>
          {contextMenu && (
              <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  style={{ top: contextMenu.y, left: contextMenu.x }}
                  className="fixed z-[400] bg-[#0a0a0a]/95 backdrop-blur-2xl border border-[#333] rounded-xl shadow-2xl min-w-[200px] overflow-hidden p-1"
              >
                  <div className="px-3 py-1.5 border-b border-[#222] mb-1">
                      <span className="text-[8px] font-black text-[#9d4edd] uppercase tracking-widest font-mono">
                          {contextMenu.node.type}
                      </span>
                  </div>
                  <button 
                      onClick={() => {
                          if (contextMenu.node.data) handleSourcePreview(contextMenu.node.data);
                          setContextMenu(null);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-mono font-bold text-gray-300 hover:bg-[#9d4edd] hover:text-black transition-all rounded-lg group"
                  >
                      <Eye className="w-3.5 h-3.5 text-[#9d4edd] group-hover:text-black" />
                      Inspect Fragment
                  </button>
                  <button 
                      onClick={() => {
                          setBibliomorphicState({ activeTab: 'agora' }); 
                          setContextMenu(null);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-mono font-bold text-gray-300 hover:bg-[#9d4edd] hover:text-black transition-all rounded-lg group"
                  >
                      <Radio className="w-3.5 h-3.5 text-[#9d4edd] group-hover:text-black" />
                      Debate Vector
                  </button>
              </motion.div>
          )}
      </AnimatePresence>

    </div>
  );
};

export default BibliomorphicEngine;
