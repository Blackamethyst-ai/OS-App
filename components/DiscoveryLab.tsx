
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../store';
import { generateHypotheses, simulateExperiment, generateTheory, promptSelectKey, compressKnowledge } from '../services/geminiService';
import { ScienceHypothesis, KnowledgeNode, CompressedAxiom } from '../types';
import { 
    FlaskConical, BrainCircuit, Search, Loader2, Beaker, 
    Activity, Zap, Sparkles, Database, Layers, GitBranch, 
    ChevronRight, ArrowRight, Minimize2, Trash2, CheckCircle2, Filter, Target, X, Unlock, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SuperLattice from './visualizations/SuperLattice';

const DiscoveryLab: React.FC = () => {
    const { discovery, setDiscoveryState, addLog, research, addResearchTask, cancelResearchTask } = useAppStore();
    const [input, setInput] = useState('');
    const [isCompressing, setIsCompressing] = useState(false);
    const [axioms, setAxioms] = useState<CompressedAxiom[]>([]);
    const [filterTaskId, setFilterTaskId] = useState<string | null>(null);
    
    const activeKnowledge = useMemo(() => {
        let nodes: KnowledgeNode[] = [];
        const tasksToInclude = filterTaskId ? research.tasks.filter(t => t.id === filterTaskId) : research.tasks;

        tasksToInclude.forEach(t => {
            nodes.push({ id: t.id, label: t.query, type: 'CONCEPT', connections: [], strength: 10 });
            if (t.findings) {
                t.findings.forEach(f => {
                    nodes.push({ id: f.id, label: f.fact, type: 'FACT', connections: [t.id], strength: f.confidence });
                });
            }
        });

        if (!filterTaskId) {
            discovery.hypotheses.forEach(h => {
                nodes.push({ id: h.id, label: h.statement, type: 'HYPOTHESIS', connections: [], strength: h.confidence });
            });
            axioms.forEach(a => {
                nodes.push({ id: a.id, label: a.statement, type: 'AXIOM', connections: a.sourceNodes, strength: 100 });
            });
        }

        return nodes;
    }, [research.tasks, discovery.hypotheses, axioms, filterTaskId]);

    const handleResearchDispatch = async (customQuery?: string) => {
        const query = customQuery || input;
        if (!query.trim()) return;
        const hasKey = await window.aistudio?.hasSelectedApiKey();
        if (!hasKey) { await promptSelectKey(); return; }
        addResearchTask({ id: crypto.randomUUID(), query, status: 'QUEUED', progress: 0, logs: ['Initiating Science Protocol...'], timestamp: Date.now() });
        if (!customQuery) setInput('');
        addLog('INFO', `SCIENCE_LAB: Research Agent dispatched for "${query}"`);
    };

    const handleCompress = async () => {
        if (activeKnowledge.length < 5) return;
        setIsCompressing(true);
        addLog('SYSTEM', 'COMPRESSION_CORE: Initializing Lossy Knowledge Distillation...');
        try {
            const result = await compressKnowledge(activeKnowledge);
            setAxioms(prev => [...prev, ...result]);
            addLog('SUCCESS', `COMPRESSION_COMPLETE: Lattice density increased by ~${Math.round(result.reduce((a,b)=>a+b.reductionFactor,0)/result.length)}%`);
        } catch (e) {
            addLog('ERROR', 'COMPRESSION_FAIL: Structural collision in logic model.');
        } finally {
            setIsCompressing(false);
        }
    };

    const handleGenerateHypotheses = async () => {
        if (activeKnowledge.length < 5) return;
        setDiscoveryState({ status: 'HYPOTHESIZING', isLoading: true });
        try {
            const allFacts = research.tasks.flatMap(t => t.findings?.map(f => f.fact) || []);
            const subset = allFacts.slice(0, 20);
            const hyps = await generateHypotheses(subset);
            setDiscoveryState({ hypotheses: hyps, status: 'IDLE', isLoading: false });
            addLog('SUCCESS', `SCIENCE_LAB: Generated ${hyps.length} hypotheses.`);
        } catch (e: any) {
            addLog('ERROR', `HYPOTHESIS_FAIL: ${e.message}`);
            setDiscoveryState({ status: 'ERROR', isLoading: false });
        }
    };

    return (
        <div className="h-full w-full bg-[#030303] flex flex-col relative overflow-hidden font-sans">
            <SuperLattice nodes={activeKnowledge} mode={filterTaskId ? 'FOCUS' : 'AMBIENT'} />

            <div className="h-16 border-b border-[#1f1f1f] bg-[#0a0a0a]/80 backdrop-blur-md flex items-center justify-between px-6 z-20 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-[#22d3ee]/10 border border-[#22d3ee] rounded shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                        <FlaskConical className="w-4 h-4 text-[#22d3ee]" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold font-mono uppercase tracking-widest text-white">Discovery Lab</h1>
                        <p className="text-[9px] text-gray-500 font-mono">Autonomous Science Protocol</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <AnimatePresence>
                        {filterTaskId && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-[#22d3ee]/10 border border-[#22d3ee]/40 rounded-lg text-[#22d3ee]"
                            >
                                <Lock size={12} className="animate-pulse" />
                                <span className="text-[9px] font-black font-mono uppercase tracking-widest">Mission Locked View</span>
                                <button onClick={() => setFilterTaskId(null)} className="ml-2 p-1 hover:bg-[#22d3ee] hover:text-black rounded transition-all"><X size={12} /></button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex gap-2">
                        <button 
                            onClick={handleCompress}
                            disabled={isCompressing || activeKnowledge.length < 5}
                            className="px-4 py-2 bg-[#9d4edd]/10 border border-[#9d4edd]/30 text-[#9d4edd] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#9d4edd] hover:text-black transition-all flex items-center gap-2"
                        >
                            {isCompressing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Minimize2 className="w-3 h-3" />}
                            Distill Axioms
                        </button>
                        <button onClick={handleGenerateHypotheses} disabled={discovery.isLoading} className="px-4 py-2 bg-[#22d3ee] text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#67e8f9] transition-all flex items-center gap-2">
                            {discovery.isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                            Hypothesize
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 relative z-10 p-6 flex gap-6 overflow-hidden">
                <div className="w-1/3 flex flex-col gap-4">
                    <div className="bg-[#050505]/80 backdrop-blur-xl border border-[#333] rounded-xl p-4 shadow-xl">
                        <div className="flex gap-2">
                            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleResearchDispatch()} placeholder="Enter research vector..." className="flex-1 bg-[#111] border border-[#333] p-2 text-xs text-white font-mono rounded outline-none focus:border-[#22d3ee]"/>
                            <button onClick={() => handleResearchDispatch()} className="p-2 bg-[#22d3ee] text-black rounded hover:bg-[#67e8f9] transition-all shadow-lg"><ArrowRight className="w-4 h-4" /></button>
                        </div>
                    </div>
                    
                    <div className="flex-1 bg-[#050505]/80 backdrop-blur-xl border border-[#333] rounded-xl overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-3 border-b border-[#333] bg-[#0a0a0a]/50 flex justify-between items-center text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                            <div className="flex items-center gap-2"><Activity size={14} className="text-[#f59e0b]" /> Active Probes</div>
                            {filterTaskId && (
                                <button onClick={() => setFilterTaskId(null)} className="text-[#22d3ee] hover:underline flex items-center gap-1"><Unlock size={12} /> Reset Hub</button>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                            {research.tasks.map(task => (
                                <div 
                                    key={task.id} 
                                    onClick={() => setFilterTaskId(task.id === filterTaskId ? null : task.id)}
                                    className={`bg-[#111] border p-3 rounded-lg group cursor-pointer transition-all hover:border-[#22d3ee] ${filterTaskId === task.id ? 'border-[#22d3ee] bg-[#22d3ee]/5 shadow-[0_0_15px_rgba(34,211,238,0.15)]' : 'border-[#222]'}`}
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-bold text-white truncate max-w-[150px] uppercase font-mono">{task.query}</span>
                                        {task.status !== 'COMPLETED' ? <Loader2 className="w-3 h-3 text-[#f59e0b] animate-spin" /> : <CheckCircle2 className="w-3 h-3 text-[#42be65]" />}
                                    </div>
                                    <div className="h-1 bg-[#333] rounded-full overflow-hidden mb-1"><div className="h-full bg-[#f59e0b]" style={{ width: `${task.progress}%` }} /></div>
                                    <div className="flex justify-between items-center">
                                        <div className="text-[8px] text-gray-600 font-mono truncate max-w-[140px]">{task.logs[task.logs.length-1]}</div>
                                        {filterTaskId === task.id && <span className="text-[7px] font-black text-[#22d3ee] animate-pulse">LOCK_ACTIVE</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex-1" />

                <div className="w-1/3 flex flex-col gap-4">
                    <div className="flex-1 bg-[#0a0a0a]/90 backdrop-blur-xl border border-[#333] rounded-xl overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-3 border-b border-[#333] flex justify-between items-center text-[10px] font-mono text-gray-500 uppercase">
                            <Minimize2 size={14} className="text-[#9d4edd]" /> Distilled Axioms
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar text-[11px]">
                            {axioms.map(axiom => (
                                <div key={axiom.id} className="p-4 bg-black/40 border border-[#9d4edd]/30 rounded-xl relative group hover:border-[#9d4edd] transition-all">
                                    <div className="absolute top-2 right-3 text-[8px] font-mono text-[#9d4edd]/60">DENSITY: {axiom.reductionFactor}%</div>
                                    <p className="text-gray-300 leading-relaxed font-mono italic">"{axiom.statement}"</p>
                                    <div className="mt-2 flex items-center gap-2">
                                        <CheckCircle2 size={10} className="text-[#42be65]" />
                                        <span className="text-[8px] text-gray-600 font-mono uppercase">SUPPORTED BY {axiom.sourceNodes.length} NODES</span>
                                    </div>
                                </div>
                            ))}
                            {axioms.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-gray-700 opacity-20 py-20">
                                    <Zap size={32} />
                                    <p className="text-[10px] font-mono uppercase mt-2">No Axioms Distilled</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DiscoveryLab;
