import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store';
import { 
    promptSelectKey, AGENT_DNA_BUILDER
} from '../services/geminiService';
import { 
    FlaskConical, ArrowRight, Loader2, Users, Split, Dna, Sliders, Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { KnowledgeNode } from '../types';
import AgoraPanel from './AgoraPanel';
import BicameralEngine from './BicameralEngine'; 
import SuperLattice from './visualizations/SuperLattice';
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
        addLog('SUCCESS', `DNA_CALIBRATION: Applied ${dna.label} baseline parameters.`);
        audio.playSuccess();
    };

    return (
        <div className="h-full flex flex-col items-center justify-center p-12 bg-black/40">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-xl w-full bg-[#0a0a0a] border border-[#222] rounded-[3rem] p-12 shadow-[0_0_150px_rgba(0,0,0,1)] space-y-10 relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 p-8 opacity-[0.03]"><Dna size={160} /></div>
                <div className="text-center space-y-4 relative z-10">
                    <div className="w-20 h-20 bg-[#9d4edd]/10 border border-[#9d4edd]/30 rounded-[2rem] flex items-center justify-center mx-auto text-[#9d4edd] shadow-[0_0_40px_rgba(157,78,221,0.2)]">
                        <Sliders size={40} />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-2xl font-black text-white uppercase tracking-[0.2em]">Hive DNA Calibration</h2>
                        <p className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.4em]">Establish cognitive biases for the synthetic senate.</p>
                    </div>
                </div>

                <div className="space-y-10 relative z-10 px-4">
                    {[
                        { id: 'skepticism', label: 'Logical Skepticism', color: '#ef4444', desc: 'Systemic doubt and error-filtering priority.' },
                        { id: 'excitement', label: 'Neural Excitement', color: '#f59e0b', desc: 'Explorative reach and novel pattern bias.' },
                        { id: 'alignment', label: 'Directive Alignment', color: '#22d3ee', desc: 'Stability and core objective synchronization.' }
                    ].map(param => (
                        <div key={param.id} className="space-y-4">
                            <div className="flex justify-between items-end">
                                <div>
                                    <div className="text-[11px] font-black text-gray-200 uppercase tracking-widest">{param.label}</div>
                                    <div className="text-[9px] text-gray-600 font-mono mt-1">{param.desc}</div>
                                </div>
                                <span className="text-sm font-black font-mono" style={{ color: param.color }}>{(mentalState as any)[param.id]}%</span>
                            </div>
                            <div className="relative h-2 w-full bg-[#111] rounded-full overflow-hidden border border-white/5 shadow-inner">
                                <motion.div 
                                    className="h-full rounded-full"
                                    animate={{ width: `${(mentalState as any)[param.id]}%` }}
                                    style={{ backgroundColor: param.color, boxShadow: `0 0 20px ${param.color}60` }}
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

                <div className="pt-8 border-t border-white/5 flex flex-col gap-4 relative z-10">
                    <div className="text-[9px] font-black font-mono text-gray-600 uppercase tracking-widest mb-1 px-4">Calibration Baselines</div>
                    <div className="grid grid-cols-2 gap-4">
                        {AGENT_DNA_BUILDER.map(dna => (
                            <button 
                                key={dna.id}
                                onClick={() => applyBaseline(dna)}
                                className="p-4 bg-black/60 border border-[#222] hover:border-[#9d4edd] rounded-2xl text-left transition-all group shadow-xl"
                            >
                                <div className="text-[10px] font-black text-white uppercase mb-1 flex items-center justify-between">
                                    {dna.label}
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dna.color }} />
                                </div>
                                <div className="text-[8px] text-gray-600 font-mono leading-tight group-hover:text-gray-400 transition-colors uppercase tracking-tighter">{dna.role}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const BibliomorphicEngine: React.FC = () => {
  const { bibliomorphic, setBibliomorphicState, discovery, research, addResearchTask, voice } = useAppStore();
  const { setSector } = useSystemMind();
  
  const activeTab = bibliomorphic.activeTab || 'discovery'; 
  const setActiveTab = (tab: string) => setBibliomorphicState({ activeTab: tab });

  const [labPhase, setLabPhase] = useState<'CALIBRATION' | 'CRUCIBLE'>('CALIBRATION');

  const activeKnowledge = useMemo(() => {
      const nodes: KnowledgeNode[] = [];
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
  }, [research.tasks, discovery.hypotheses]);

  useEffect(() => {
      setSector(`NAV_BIBLIO_${activeTab.toUpperCase()}`);
  }, [activeTab, setSector]);

  const handleResearchDispatch = (input: string) => {
      if (!input.trim()) return;
      addResearchTask({ id: crypto.randomUUID(), query: input, status: 'QUEUED', progress: 0, logs: ['Initializing Science Protocol...'], timestamp: Date.now() });
      setLabPhase('CRUCIBLE'); 
  };

  return (
    <div className="h-full w-full bg-[#030303] text-white flex font-sans overflow-hidden border border-[#1f1f1f] rounded-[2rem] shadow-2xl relative">
      <div className="w-[320px] flex flex-col border-r border-[#1f1f1f] bg-[#0a0a0a] relative z-20 min-w-[320px]">
          <div className="h-16 flex items-center px-6 border-b border-[#1f1f1f] bg-white/[0.01]">
              <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_10px_white] animate-pulse"></div>
                  <span className="font-mono font-black text-white tracking-[0.2em] text-xs uppercase">Vision Sector</span>
              </div>
          </div>
          <div className="flex gap-1 p-3 border-b border-[#1f1f1f] bg-[#050505]">
              {[
                  { id: 'discovery', icon: FlaskConical, label: 'LAB' },
                  { id: 'dna', icon: Dna, label: 'DNA' },
                  { id: 'agora', icon: Users, label: 'AGORA' },
                  { id: 'bicameral', icon: Split, label: 'SWARM' },
              ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 flex flex-col items-center justify-center py-4 px-2 rounded-2xl transition-all ${activeTab === tab.id ? 'bg-[#1f1f1f] text-white border border-white/10 shadow-lg' : 'text-gray-600 hover:bg-[#111] hover:text-gray-400'}`}>
                      <tab.icon className="w-5 h-5 mb-1.5" />
                      <span className="text-[8px] font-black tracking-[0.2em]">{tab.label}</span>
                  </button>
              ))}
          </div>
          <div className="flex-1 overflow-hidden relative flex flex-col p-6 space-y-6">
              <AnimatePresence mode="wait">
                  {activeTab === 'discovery' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                        <div className="text-[11px] font-black font-mono text-gray-500 uppercase tracking-widest px-1">Synthesis Readout</div>
                        <div className="bg-[#111] p-5 rounded-[1.5rem] border border-[#222] shadow-inner">
                            <div className="flex justify-between text-[9px] font-mono text-gray-400 uppercase mb-3"><span>Knowledge Density</span><span>{Math.round((activeKnowledge.length/50)*100)}%</span></div>
                            <div className="h-1.5 bg-[#050505] rounded-full overflow-hidden border border-white/5"><div className="h-full bg-[#22d3ee] shadow-[0_0_8px_#22d3ee]" style={{ width: `${Math.min(100, (activeKnowledge.length/50)*100)}%` }} /></div>
                        </div>
                      </motion.div>
                  )}
                  {activeTab === 'dna' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                          <div className="text-[11px] font-black font-mono text-gray-500 uppercase tracking-widest px-1">Neural Profiling</div>
                          <div className="bg-[#111] p-6 rounded-[1.5rem] border border-[#222] space-y-5 shadow-inner">
                              <div className="flex justify-between items-center text-[10px] font-mono">
                                  <span className="text-gray-500 font-bold tracking-widest uppercase">Skepticism</span>
                                  <span className="text-[#ef4444] font-black">{voice.mentalState.skepticism}%</span>
                              </div>
                              <div className="flex justify-between items-center text-[10px] font-mono">
                                  <span className="text-gray-500 font-bold tracking-widest uppercase">Excitement</span>
                                  <span className="text-[#f59e0b] font-black">{voice.mentalState.excitement}%</span>
                              </div>
                              <div className="flex justify-between items-center text-[10px] font-mono">
                                  <span className="text-gray-500 font-bold tracking-widest uppercase">Alignment</span>
                                  <span className="text-[#22d3ee] font-black">{voice.mentalState.alignment}%</span>
                              </div>
                          </div>
                      </motion.div>
                  )}
              </AnimatePresence>
          </div>
      </div>

      <div className="flex-1 relative flex flex-col bg-black overflow-hidden">
          <AnimatePresence mode="wait">
              {activeTab === 'discovery' && (
                  <motion.div key="discovery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full relative">
                      <SuperLattice nodes={activeKnowledge} mode={labPhase === 'CRUCIBLE' ? 'ACTIVE' : 'FOCUS'} />
                      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-xl px-10 pointer-events-none">
                          <div className="bg-[#0a0a0a]/95 backdrop-blur-3xl border border-white/10 p-1.5 rounded-[2rem] shadow-[0_50px_100px_rgba(0,0,0,1)] flex items-center pointer-events-auto">
                              <input 
                                  className="flex-1 bg-transparent border-none outline-none px-8 py-5 text-base font-mono text-white placeholder:text-gray-800 uppercase tracking-widest"
                                  placeholder="Input strategic probe..."
                                  onKeyDown={e => e.key === 'Enter' && handleResearchDispatch((e.target as HTMLInputElement).value)}
                              />
                              <button className="p-5 bg-[#22d3ee] text-black rounded-2xl hover:bg-[#67e8f9] transition-all shadow-[0_0_30px_rgba(34,211,238,0.3)]"><ArrowRight size={24}/></button>
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
