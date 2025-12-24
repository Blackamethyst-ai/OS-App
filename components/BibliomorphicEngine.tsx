
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../store';
import { 
    fileToGenerativePart, analyzeBookDNA,
    generateHypotheses, simulateExperiment, generateTheory, promptSelectKey, compressKnowledge,
    synthesizeNodes, crystallizeKnowledge, classifyArtifact, AGENT_DNA_BUILDER
} from '../services/geminiService';
import { neuralVault } from '../services/persistenceService';
import { 
    BookOpen, Upload, Activity, MessageSquare, Send, Loader2, 
    Database, Archive, BoxSelect, X, Users, FlaskConical,
    Search, ArrowRight, XCircle, Sparkles, FileText, RotateCcw,
    Microscope, BrainCircuit, Link as LinkIcon, Radio, Settings, Play, CheckCircle2,
    Layers, GitBranch, Split, FileUp, Eye, ShieldCheck, Info, Sparkle, Plus, Scan, Zap, Brain, Sliders, Target, Network, Dna
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookDNA, KnowledgeNode, ScienceHypothesis, StoredArtifact, FileData } from '../types';
import AgoraPanel from './AgoraPanel';
import BicameralEngine from './BicameralEngine'; 
import SuperLattice from './visualizations/SuperLattice';
import { useVoiceExpose } from '../hooks/useVoiceExpose';
import { useSystemMind } from '../stores/useSystemMind';
import { audio } from '../services/audioService';

const DNABuilder = () => {
    const { voice, setVoiceState, addLog } = useAppStore();
    const { mentalState } = voice;

    const handleUpdate = (key: string, val: number) => {
        setVoiceState({ mentalState: { ...mentalState, [key]: val } });
    };

    const applyBaseline = (dna: any) => {
        let nextState = { skepticism: 50, excitement: 50, alignment: 50 };
        if (dna.id === 'SKEPTIC') nextState = { skepticism: 90, excitement: 20, alignment: 40 };
        if (dna.id === 'VISIONARY') nextState = { skepticism: 10, excitement: 95, alignment: 60 };
        if (dna.id === 'PRAGMATIST') nextState = { skepticism: 40, excitement: 40, alignment: 90 };
        if (dna.id === 'SYNTHESIZER') nextState = { skepticism: 50, excitement: 50, alignment: 80 };
        
        setVoiceState({ mentalState: nextState });
        addLog('SUCCESS', `DNA_CALIBRATION: Applied ${dna.label} baseline.`);
        audio.playSuccess();
    };

    return (
        <div className="h-full flex flex-col items-center justify-center p-12 bg-black/40">
            <div className="max-w-xl w-full bg-[#0a0a0a] border border-[#222] rounded-3xl p-10 shadow-2xl space-y-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5"><Dna size={128} /></div>
                <div className="text-center space-y-2 relative z-10">
                    <div className="w-16 h-16 bg-[#9d4edd]/10 border border-[#9d4edd] rounded-2xl flex items-center justify-center mx-auto text-[#9d4edd] shadow-[0_0_20px_rgba(157,78,221,0.2)]">
                        <Sliders size={32} />
                    </div>
                    <h2 className="text-xl font-black text-white uppercase tracking-widest">Agent DNA Calibration</h2>
                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.2em]">Define the cognitive parameters for the hive swarm.</p>
                </div>

                <div className="space-y-8 relative z-10">
                    {[
                        { id: 'skepticism', label: 'Logical Skepticism', color: '#ef4444', desc: 'Critical filtering and error detection bias.' },
                        { id: 'excitement', label: 'Creative Excitement', color: '#f59e0b', desc: 'Explorative reach and novel pattern recognition.' },
                        { id: 'alignment', label: 'System Alignment', color: '#22d3ee', desc: 'Core directive adherence and mechanical stability.' }
                    ].map(param => (
                        <div key={param.id} className="space-y-3">
                            <div className="flex justify-between items-end">
                                <div>
                                    <div className="text-[10px] font-black text-gray-200 uppercase tracking-widest">{param.label}</div>
                                    <div className="text-[8px] text-gray-600 font-mono">{param.desc}</div>
                                </div>
                                <span className="text-sm font-black font-mono" style={{ color: param.color }}>{(mentalState as any)[param.id]}%</span>
                            </div>
                            <div className="relative h-1.5 w-full bg-[#111] rounded-full overflow-hidden border border-white/5">
                                <motion.div 
                                    className="h-full rounded-full"
                                    animate={{ width: `${(mentalState as any)[param.id]}%` }}
                                    style={{ backgroundColor: param.color, boxShadow: `0 0 10px ${param.color}40` }}
                                />
                                <input 
                                    type="range" 
                                    min="0" max="100" 
                                    value={(mentalState as any)[param.id]} 
                                    onChange={e => handleUpdate(param.id, parseInt(e.target.value))}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="pt-6 border-t border-white/5 flex flex-col gap-3">
                    <div className="text-[8px] font-mono text-gray-600 uppercase tracking-widest mb-1">Calibration Presets</div>
                    <div className="grid grid-cols-2 gap-3">
                        {AGENT_DNA_BUILDER.map(dna => (
                            <button 
                                key={dna.id}
                                onClick={() => applyBaseline(dna)}
                                className="p-3 bg-[#111] border border-[#222] hover:border-[#9d4edd] rounded-xl text-left transition-all group"
                            >
                                <div className="text-[9px] font-black text-white uppercase mb-1">{dna.label}</div>
                                <div className="text-[7px] text-gray-600 font-mono leading-tight group-hover:text-gray-400 transition-colors">{dna.role}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const BibliomorphicEngine: React.FC = () => {
  const { bibliomorphic, setBibliomorphicState, discovery, setDiscoveryState, research, addResearchTask, addLog, openHoloProjector, voice } = useAppStore();
  const { setSector } = useSystemMind();
  
  const activeTab = bibliomorphic.activeTab || 'discovery'; 
  const setActiveTab = (tab: string) => setBibliomorphicState({ activeTab: tab });

  const [labPhase, setLabPhase] = useState<'CALIBRATION' | 'CRUCIBLE' | 'CRYSTALLIZATION'>('CALIBRATION');
  const [activeSources, setActiveSources] = useState<any[]>([]);
  const [isUploadingSource, setIsUploadingSource] = useState(false);

  const activeKnowledge = useMemo(() => {
      const nodes: KnowledgeNode[] = [];
      activeSources.forEach(s => {
          nodes.push({ id: s.id, label: s.name, type: 'BRIDGE', connections: [], strength: 100, color: '#22d3ee', data: s });
      });
      research.tasks.forEach(t => {
          nodes.push({ id: t.id, label: t.query, type: 'CONCEPT', connections: [], strength: 10 });
          if (t.findings) {
              t.findings.forEach(f => {
                  nodes.push({ id: f.id, label: f.fact, type: 'FACT', connections: [t.id], strength: f.confidence });
              });
          }
      });
      discovery.hypotheses.forEach(h => {
          nodes.push({ id: h.id, label: h.statement, type: 'HYPOTHESIS', connections: [], strength: h.confidence });
      });
      return nodes;
  }, [research.tasks, discovery.hypotheses, activeSources]);

  useEffect(() => {
      setSector(`NAV_BIBLIO_${activeTab.toUpperCase()}`);
  }, [activeTab, setSector]);

  const handleResearchDispatch = (input: string) => {
      if (!input.trim()) return;
      addResearchTask({ id: crypto.randomUUID(), query: input, status: 'QUEUED', progress: 0, logs: ['Initiating Science Protocol...'], timestamp: Date.now() });
      setLabPhase('CRUCIBLE'); 
  };

  return (
    <div className="h-full w-full bg-[#030303] text-white flex font-sans overflow-hidden border border-[#1f1f1f] rounded shadow-2xl relative">
      <div className="w-[320px] flex flex-col border-r border-[#1f1f1f] bg-[#0a0a0a] relative z-20 min-w-[320px]">
          <div className="h-14 flex items-center px-4 border-b border-[#1f1f1f]">
              <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-white rounded-full shadow-[0_0_10px_white] animate-pulse"></div>
                  <span className="font-mono font-bold text-white tracking-wider text-xs uppercase">Vision Sector</span>
              </div>
          </div>
          <div className="flex gap-1 p-2 border-b border-[#1f1f1f] bg-[#050505] overflow-x-auto">
              {[
                  { id: 'discovery', icon: FlaskConical, label: 'LAB' },
                  { id: 'dna', icon: Dna, label: 'DNA' },
                  { id: 'agora', icon: Users, label: 'AGORA' },
                  { id: 'bicameral', icon: Split, label: 'SWARM' },
              ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 flex flex-col items-center justify-center py-3 px-2 rounded-lg transition-all min-w-[60px] ${activeTab === tab.id ? 'bg-[#1f1f1f] text-white border border-white/10' : 'text-gray-600 hover:bg-[#111] hover:text-gray-400'}`}>
                      <tab.icon className="w-4 h-4 mb-1" />
                      <span className="text-[7px] font-black tracking-[0.2em]">{tab.label}</span>
                  </button>
              ))}
          </div>
          <div className="flex-1 overflow-hidden relative flex flex-col p-4 space-y-4">
              {activeTab === 'discovery' && (
                  <div className="space-y-4">
                    <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest px-1">Active Synthesis</div>
                    <div className="bg-[#111] p-4 rounded-xl border border-[#222]">
                        <div className="flex justify-between text-[8px] font-mono text-gray-500 uppercase mb-2"><span>Knowledge Density</span><span>{Math.round((activeKnowledge.length/50)*100)}%</span></div>
                        <div className="h-1 bg-[#222] rounded-full overflow-hidden"><div className="h-full bg-[#22d3ee]" style={{ width: `${Math.min(100, (activeKnowledge.length/50)*100)}%` }} /></div>
                    </div>
                  </div>
              )}
              {activeTab === 'dna' && (
                  <div className="space-y-4">
                      <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest px-1">Current Profile</div>
                      <div className="bg-[#111] p-4 rounded-xl border border-[#222] space-y-3">
                          <div className="flex justify-between items-center text-[9px] font-mono">
                              <span className="text-gray-500">SKEPTICISM</span>
                              <span className="text-[#ef4444] font-bold">{voice.mentalState.skepticism}%</span>
                          </div>
                          <div className="flex justify-between items-center text-[9px] font-mono">
                              <span className="text-gray-500">EXCITEMENT</span>
                              <span className="text-[#f59e0b] font-bold">{voice.mentalState.excitement}%</span>
                          </div>
                          <div className="flex justify-between items-center text-[9px] font-mono">
                              <span className="text-gray-500">ALIGNMENT</span>
                              <span className="text-[#22d3ee] font-bold">{voice.mentalState.alignment}%</span>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      </div>

      <div className="flex-1 relative flex flex-col bg-black overflow-hidden">
          <AnimatePresence mode="wait">
              {activeTab === 'discovery' && (
                  <motion.div key="discovery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full relative">
                      <SuperLattice nodes={activeKnowledge} mode={labPhase === 'CRUCIBLE' ? 'ACTIVE' : 'FOCUS'} />
                      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-lg px-8 pointer-events-none">
                          <div className="bg-[#0a0a0a]/95 backdrop-blur border border-[#333] p-1 rounded-2xl shadow-2xl flex items-center pointer-events-auto">
                              <input 
                                  className="flex-1 bg-transparent border-none outline-none px-6 py-4 text-sm font-mono text-white placeholder:text-gray-800 uppercase"
                                  placeholder="Input strategic probe..."
                                  onKeyDown={e => e.key === 'Enter' && handleResearchDispatch((e.target as HTMLInputElement).value)}
                              />
                              <button onClick={() => {}} className="p-4 bg-[#22d3ee] text-black rounded-xl hover:bg-[#67e8f9] transition-all"><ArrowRight size={20}/></button>
                          </div>
                      </div>
                  </motion.div>
              )}
              {activeTab === 'dna' && <motion.div key="dna" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full"><DNABuilder /></motion.div>}
              {activeTab === 'agora' && <motion.div key="agora" className="h-full"><AgoraPanel artifact={{ inlineData: { data: '', mimeType: 'text/plain' }, name: 'Synthetic Context' }} /></motion.div>}
              {activeTab === 'bicameral' && <motion.div key="bicameral" className="h-full"><BicameralEngine /></motion.div>}
          </AnimatePresence>
      </div>
    </div>
  );
};

export default BibliomorphicEngine;
