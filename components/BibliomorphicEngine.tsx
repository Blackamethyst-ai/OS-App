
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../store';
import { 
    fileToGenerativePart, analyzeBookDNA, promptSelectKey,
    generateHypotheses, simulateExperiment, crystallizeKnowledge, synthesizeNodes,
    compileResearchContext 
} from '../services/geminiService';
import { 
    BookOpen, Upload, Activity, MessageSquare, Send, Loader2, 
    Database, Archive, BoxSelect, X, Users, FlaskConical,
    Search, ArrowRight, XCircle, Sparkles, FileText, RotateCcw,
    Microscope, BrainCircuit, Link as LinkIcon, Radio, Settings, Play, CheckCircle2,
    Layers, GitBranch, Split
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookDNA, KnowledgeNode, ScienceHypothesis } from '../types';
import AgoraPanel from './AgoraPanel';
import BicameralEngine from './BicameralEngine'; // Import the engine
import SuperLattice from './visualizations/SuperLattice';
import { useVoiceExpose } from '../hooks/useVoiceExpose';
import { useSystemMind } from '../stores/useSystemMind';

const MotionDiv = motion.div as any;

// --- SUB-COMPONENTS (Local for layout cleanliness) ---

const CalibrationPanel = ({ onDispatch }: { onDispatch: (q: string) => void }) => {
    const [input, setInput] = useState('');
    return (
        <div className="flex flex-col items-center justify-center h-full max-w-xl mx-auto p-6">
            <div className="mb-8 text-center space-y-2">
                <div className="w-16 h-16 bg-[#111] rounded-full flex items-center justify-center border border-[#333] mx-auto shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                    <FlaskConical className="w-8 h-8 text-[#22d3ee]" />
                </div>
                <h2 className="text-2xl font-mono font-bold text-white uppercase tracking-widest">Protocol Calibration</h2>
                <p className="text-xs text-gray-500 font-mono">Define the research vector for the autonomous agents.</p>
            </div>
            
            <div className="w-full bg-[#0a0a0a] p-6 rounded-xl border border-[#333] space-y-6 shadow-2xl relative overflow-hidden group">
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
                            placeholder="e.g. 'Impact of Quantum Computing on Cryptography'"
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
                
                <div className="grid grid-cols-2 gap-4 relative z-10 pt-2 border-t border-[#222]">
                    <div>
                        <div className="flex justify-between text-[9px] text-gray-400 mb-1 font-mono">
                            <span>ENTROPY LEVEL</span>
                            <span className="text-[#9d4edd]">HIGH</span>
                        </div>
                        <div className="h-1 bg-[#333] rounded-full overflow-hidden">
                            <div className="h-full bg-[#9d4edd] w-[75%]"></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-[9px] text-gray-400 mb-1 font-mono">
                            <span>TOKEN BUDGET</span>
                            <span className="text-[#f59e0b]">2.4k</span>
                        </div>
                        <div className="h-1 bg-[#333] rounded-full overflow-hidden">
                            <div className="h-full bg-[#f59e0b] w-[40%]"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CrucibleFeed = ({ tasks }: { tasks: any[] }) => {
    return (
        <div className="h-full flex flex-col bg-[#050505]/80 backdrop-blur border-r border-[#333]">
            <div className="p-4 border-b border-[#333] flex justify-between items-center">
                <span className="text-[10px] font-mono text-[#f59e0b] uppercase tracking-widest flex items-center gap-2">
                    <Activity className="w-3 h-3" /> Agent Uplink
                </span>
                <span className="text-[9px] text-gray-600 font-mono animate-pulse">NET_OP: ACTIVE</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                <AnimatePresence>
                    {tasks.map(task => (
                        <motion.div 
                            key={task.id}
                            initial={{ opacity: 0, x: -10 }} 
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-[#111] border border-[#222] p-3 rounded group hover:border-[#f59e0b]/30 transition-colors"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] font-bold text-white truncate max-w-[180px] block">{task.query}</span>
                                {task.status === 'COMPLETED' ? <CheckCircle2 className="w-3 h-3 text-[#42be65]" /> : <Loader2 className="w-3 h-3 text-[#f59e0b] animate-spin" />}
                            </div>
                            <div className="w-full bg-[#333] h-1 rounded-full overflow-hidden mb-2">
                                <div className="h-full bg-[#f59e0b]" style={{ width: `${task.progress}%` }}></div>
                            </div>
                            <div className="text-[8px] font-mono text-gray-500 truncate">
                                {task.logs[task.logs.length - 1] || 'Initializing...'}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {tasks.length === 0 && (
                    <div className="text-center mt-10 text-gray-600 italic text-[10px]">No active agents.</div>
                )}
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
                            <p className="text-xs text-gray-500 font-mono mt-1">Crystallized from {hypotheses.length} validated hypotheses.</p>
                        </div>
                    </div>
                    <div className="prose prose-invert prose-sm font-serif leading-loose text-gray-300">
                        <div className="whitespace-pre-wrap">{theory}</div>
                    </div>
                    <div className="border-t border-[#333] pt-6 flex justify-between items-center text-[10px] font-mono text-gray-600">
                        <span>GENERATED BY BIBLIOMORPHIC ENGINE v2.5</span>
                        <span>CONFIDENCE: 94.2%</span>
                    </div>
                </motion.div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-[#9d4edd] blur-[50px] opacity-20 rounded-full"></div>
                        <BrainCircuit className="w-16 h-16 text-gray-400 relative z-10" />
                    </div>
                    <div>
                        <h3 className="text-lg text-gray-200 font-mono font-bold uppercase tracking-widest">
                            {hypotheses.length > 0 ? "Synthesis Ready" : "Protocol Awaiting Logic"}
                        </h3>
                        <p className="text-xs text-gray-500 mt-2 max-w-sm mx-auto font-mono">
                            {hypotheses.length} hypotheses verified. 
                            {hypotheses.length === 0 ? " Generate hypotheses from research data to proceed." : " Engage crystallization protocol to generate final artifact."}
                        </p>
                    </div>
                    <button 
                        onClick={hypotheses.length === 0 ? onGenerateHypotheses : onSynthesize}
                        disabled={isSynthesizing || isGeneratingHyps}
                        className="px-8 py-3 bg-[#9d4edd] text-black font-bold font-mono text-xs uppercase tracking-[0.2em] rounded hover:bg-[#b06bf7] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(157,78,221,0.3)] flex items-center gap-2"
                    >
                        {isSynthesizing || isGeneratingHyps ? <Loader2 className="w-4 h-4 animate-spin"/> : hypotheses.length === 0 ? <Sparkles className="w-4 h-4"/> : <Layers className="w-4 h-4"/>}
                        {isSynthesizing ? 'Crystallizing...' : isGeneratingHyps ? 'Generating Hypotheses...' : hypotheses.length === 0 ? 'Generate Hypotheses' : 'Begin Synthesis'}
                    </button>
                </div>
            )}
        </div>
    );
};

// --- MAIN COMPONENT ---

const BibliomorphicEngine: React.FC = () => {
  const { bibliomorphic, setBibliomorphicState, discovery, setDiscoveryState, research, addResearchTask, cancelResearchTask, addLog } = useAppStore();
  const { setSector } = useSystemMind();
  const [chatInput, setChatInput] = useState('');
  const [isChatProcessing, setIsChatProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Tab State
  const activeTab = bibliomorphic.activeTab || 'discovery'; // Default to Discovery now
  const setActiveTab = (tab: string) => setBibliomorphicState({ activeTab: tab });

  // Living Lab State
  const [labPhase, setLabPhase] = useState<'CALIBRATION' | 'CRUCIBLE' | 'CRYSTALLIZATION'>('CALIBRATION');
  
  // Graph State
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [bridgeLoading, setBridgeLoading] = useState(false);
  const [bridgeNodes, setBridgeNodes] = useState<KnowledgeNode[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, node: KnowledgeNode } | null>(null);

  // --- REPORT LOCATION TO SYSTEM MIND ---
  // This ensures the Voice Core knows exactly which sub-tab is active
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

  // --- 1. DATA COMPUTATION (The Knowledge Lattice) ---
  const activeKnowledge = useMemo(() => {
      const nodes: KnowledgeNode[] = [];
      
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
  }, [research.tasks, discovery.hypotheses, bridgeNodes]);

  // Voice Core Exposure
  useVoiceExpose('bibliomorphic-state', {
      activeTab,
      labPhase,
      nodeCount: activeKnowledge.length,
      activeTasks: research.tasks.filter(t => t.status === 'SEARCHING').length
  });

  // --- 2. HANDLERS ---

  const handleResearchDispatch = async (input: string) => {
      if (!input.trim()) return;
      const hasKey = await window.aistudio?.hasSelectedApiKey();
      if (!hasKey) { await promptSelectKey(); return; }

      addResearchTask({
          id: crypto.randomUUID(),
          query: input,
          status: 'QUEUED',
          progress: 0,
          logs: ['Initiating Science Protocol...'],
          timestamp: Date.now()
      });
      addLog('INFO', `SCIENCE_LAB: Research Agent dispatched for "${input}"`);
      setLabPhase('CRUCIBLE'); // Auto-transition
  };

  const handleGenerateHypotheses = async () => {
        const facts = activeKnowledge.filter(n => n.type === 'FACT').map(n => n.label);
        
        if (facts.length < 3) {
            addLog('WARN', 'SCIENCE_LAB: Insufficient data. Need more research findings.');
            return;
        }
        
        setDiscoveryState({ status: 'HYPOTHESIZING', isLoading: true });
        try {
            const subset = facts.slice(0, 20); // Token limit protection
            const hyps = await generateHypotheses(subset);
            setDiscoveryState({ hypotheses: hyps, status: 'IDLE', isLoading: false });
            addLog('SUCCESS', `SCIENCE_LAB: Generated ${hyps.length} hypotheses.`);
        } catch (e: any) {
            addLog('ERROR', `HYPOTHESIS_FAIL: ${e.message}`);
            setDiscoveryState({ status: 'ERROR', isLoading: false });
        }
    };

  const handleSynthesizeBridge = async () => {
      if (selectedNodes.length !== 2) return;
      setBridgeLoading(true);
      try {
          const hasKey = await window.aistudio?.hasSelectedApiKey();
          if (!hasKey) { await promptSelectKey(); setBridgeLoading(false); return; }

          const nodeA = activeKnowledge.find(n => n.id === selectedNodes[0])!;
          const nodeB = activeKnowledge.find(n => n.id === selectedNodes[1])!;

          const bridge = await synthesizeNodes(nodeA, nodeB);
          setBridgeNodes(prev => [...prev, bridge]);
          setSelectedNodes([]); 
          addLog('SUCCESS', `SYNAPSE: Bridge created "${bridge.label}"`);
      } catch (e: any) {
          addLog('ERROR', `SYNAPSE FAIL: ${e.message}`);
      } finally {
          setBridgeLoading(false);
      }
  };

  const runSynthesis = async () => {
      setDiscoveryState({ status: 'SYNTHESIZING', isLoading: true });
      try {
          // Upgrade: Use crystallizeKnowledge which is more robust and uses the graph
          const theory = await crystallizeKnowledge(activeKnowledge);
          setDiscoveryState({ theory, status: 'IDLE', isLoading: false });
          addLog('SUCCESS', 'CRYSTALLIZATION: Unified Theory Generated.');
      } catch (e) { 
          setDiscoveryState({ status: 'ERROR', isLoading: false }); 
          addLog('ERROR', 'Synthesis Failed.');
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setBibliomorphicState({ isLoading: true, error: null });
      try {
        const hasKey = await window.aistudio?.hasSelectedApiKey();
        if (!hasKey) { await promptSelectKey(); setBibliomorphicState({ isLoading: false }); return; }
        const fileData = await fileToGenerativePart(file);
        setBibliomorphicState({ activeBook: fileData });
        // Auto-switch to Agora if in Library mode
        if (activeTab === 'library') setActiveTab('agora');
        // Analyze
        const analysis = await analyzeBookDNA(fileData);
        setBibliomorphicState({ dna: analysis, isLoading: false, chatHistory: [{ role: 'model', text: `**Kernel initialized** for "${analysis.title}".`, timestamp: Date.now() }] });
      } catch (err: any) { setBibliomorphicState({ error: err.message, isLoading: false }); }
    }
  };

  // --- RENDER ---

  return (
    <div className="h-full w-full bg-[#030303] flex font-sans overflow-hidden border border-[#1f1f1f] rounded shadow-2xl relative" onClick={() => setContextMenu(null)}>
      
      {/* 1. CONTROL PLANE (Left) */}
      <div className="w-[320px] flex flex-col border-r border-[#1f1f1f] bg-[#0a0a0a] relative z-20 min-w-[320px]">
          <div className="h-14 flex items-center px-4 border-b border-[#1f1f1f]">
              <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-white rounded-full shadow-[0_0_10px_white]"></div>
                  <span className="font-mono font-bold text-white tracking-wider text-xs">BIBLIOMORPHIC</span>
              </div>
          </div>

          <div className="flex gap-1 p-2 border-b border-[#1f1f1f] bg-[#050505] overflow-x-auto">
              {[
                  { id: 'discovery', icon: FlaskConical, label: 'DISCOVERY LAB' },
                  { id: 'chat', icon: MessageSquare, label: 'NEURAL LINK' },
                  { id: 'agora', icon: Users, label: 'AGORA' },
                  { id: 'bicameral', icon: Split, label: 'BICAMERAL' },
                  { id: 'library', icon: Archive, label: 'ARCHIVES' },
              ].map(tab => (
                  <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex-1 flex flex-col items-center justify-center py-3 px-2 rounded-lg transition-all min-w-[60px]
                          ${activeTab === tab.id ? 'bg-[#1f1f1f] text-white' : 'text-gray-600 hover:bg-[#111] hover:text-gray-400'}
                      `}
                  >
                      <tab.icon className="w-4 h-4 mb-1" />
                      <span className="text-[7px] font-bold tracking-wider">{tab.label}</span>
                  </button>
              ))}
          </div>

          {/* Context Aware Sidebar */}
          <div className="flex-1 overflow-hidden relative flex flex-col">
              {activeTab === 'discovery' && (
                  <div className="h-full flex flex-col">
                      <div className="p-4 space-y-1">
                          <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2">Protocol Phase</p>
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
                                          ? 'bg-[#22d3ee]/10 text-[#22d3ee] border-[#22d3ee]/30' 
                                          : 'text-gray-500 hover:bg-[#111] border-transparent'}
                                  `}
                              >
                                  <sub.icon className="w-3 h-3" />
                                  {sub.label}
                              </button>
                          ))}
                      </div>
                      
                      <div className="mt-auto p-4 border-t border-[#1f1f1f]">
                          <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono mb-2">
                              <span>ACTIVE HYPOTHESES</span>
                              <span className="text-white">{discovery.hypotheses.length}</span>
                          </div>
                          {discovery.hypotheses.length > 0 && (
                              <button 
                                onClick={() => setLabPhase('CRYSTALLIZATION')}
                                className="w-full py-2 bg-[#1f1f1f] text-white text-[10px] font-bold uppercase rounded hover:bg-[#222]"
                              >
                                  View Synthesis
                              </button>
                          )}
                      </div>
                  </div>
              )}

              {activeTab === 'chat' && (
                  <div className="flex-1 flex flex-col p-4 gap-4">
                      {/* Reuse Chat Sidebar logic here if needed, or simplified upload */}
                      <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#333] rounded-xl hover:border-[#9d4edd] transition-colors cursor-pointer group">
                          <Upload className="w-6 h-6 text-gray-500 group-hover:text-[#9d4edd] mb-2" />
                          <span className="text-[10px] font-mono text-gray-500">Ingest Artifact</span>
                          <input type="file" onChange={handleFileUpload} className="hidden" />
                      </label>
                  </div>
              )}
              
              {activeTab === 'bicameral' && (
                  <div className="p-6 text-gray-500 text-[10px] font-mono">
                      <p className="mb-4">
                          The Bicameral Engine utilizes swarm consensus to decompose complex goals and verify outputs.
                      </p>
                      <p>
                          Agents: {Object.keys(useAppStore.getState().bicameral.swarmStatus.votes || {}).length > 0 ? 'ACTIVE' : 'IDLE'}
                      </p>
                  </div>
              )}
          </div>
      </div>

      {/* 2. VISUALIZATION PLANE (Right) */}
      <div className="flex-1 relative flex flex-col bg-black overflow-hidden">
          
          {activeTab === 'discovery' && (
              <>
                  {/* The SuperLattice Background (Always visible in background of Crucible/Crystallization) */}
                  <div className={`absolute inset-0 z-0 transition-opacity duration-1000 ${labPhase === 'CALIBRATION' ? 'opacity-20' : 'opacity-100'}`}>
                      <SuperLattice 
                          nodes={activeKnowledge} 
                          mode={labPhase === 'CRUCIBLE' ? 'ACTIVE' : labPhase === 'CRYSTALLIZATION' ? 'FOCUS' : 'AMBIENT'}
                          onNodeSelect={(n) => {
                              // Toggle Selection
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
                                  {selectedNodes.length} Node{selectedNodes.length > 1 ? 's' : ''} Selected
                              </span>
                              <div className="h-4 w-px bg-[#333]"></div>
                              <button 
                                  onClick={handleSynthesizeBridge}
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
                                  {/* Left Feed */}
                                  <div className="w-80 h-full">
                                      <CrucibleFeed tasks={research.tasks} />
                                  </div>
                                  {/* Right Space is interactable graph */}
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
                  {bibliomorphic.activeBook ? (
                      <AgoraPanel artifact={bibliomorphic.activeBook} />
                  ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-600 opacity-50">
                          <Users className="w-16 h-16 mb-4" />
                          <p className="text-xs font-mono uppercase tracking-widest">Active Source Required</p>
                      </div>
                  )}
              </div>
          )}

          {activeTab === 'bicameral' && (
              <div className="h-full bg-black relative">
                  {/* Render Bicameral Engine inside the right pane */}
                  {/* We remove the outer borders of BicameralEngine via css override or just nesting it */}
                  <div className="absolute inset-0">
                      <BicameralEngine />
                  </div>
              </div>
          )}

      </div>

      {/* Context Menu (Injected at Root level for z-index) */}
      <AnimatePresence>
          {contextMenu && (
              <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  style={{ top: contextMenu.y, left: contextMenu.x }}
                  className="fixed z-50 bg-[#0a0a0a] border border-[#333] rounded-lg shadow-2xl min-w-[180px] overflow-hidden"
              >
                  <div className="px-3 py-2 border-b border-[#222] bg-[#111]">
                      <span className="text-[9px] font-bold text-[#9d4edd] uppercase tracking-wider font-mono">
                          {contextMenu.node.type}
                      </span>
                  </div>
                  <button 
                      onClick={() => {
                          setBibliomorphicState({ activeTab: 'agora' }); // Switch to Agora
                          // Logic to inject would go here (requires updating store to pass 'seed' to Agora)
                          setContextMenu(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono text-gray-300 hover:bg-[#9d4edd] hover:text-black transition-colors group text-left"
                  >
                      <Radio className="w-3 h-3 text-[#9d4edd] group-hover:text-black" />
                      Debate this Concept
                  </button>
              </motion.div>
          )}
      </AnimatePresence>

    </div>
  );
};

export default BibliomorphicEngine;
