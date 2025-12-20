
import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store';
import { generateDecompositionMap, consensusEngine } from '../services/bicameralService';
import { promptSelectKey, AGENT_DNA_BUILDER } from '../services/geminiService';
import { neuralVault } from '../services/persistenceService';
import { BrainCircuit, Zap, Layers, Cpu, ArrowRight, CheckCircle2, Loader2, GitBranch, AlertOctagon, Save, ExternalLink, Dna, Info, Settings2, Sliders } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TugOfWarChart } from './Visualizations/TugOfWarChart';
import { AgentGraveyard } from './Visualizations/AgentGraveyard';
import { SwarmStatus, AgentDNA } from '../types';

const BicameralEngine: React.FC = () => {
    const { bicameral, setBicameralState, addLog } = useAppStore();
    const { goal, plan, ledger, isPlanning, isSwarming, swarmStatus } = bicameral;
    
    const [selectedDNA, setSelectedDNA] = useState<AgentDNA>(AGENT_DNA_BUILDER[1]); 
    const [agentWeights, setAgentWeights] = useState({ logic: 80, creativity: 50, empathy: 30 });
    const [showControls, setShowControls] = useState(false);
    
    const activeTask = plan.find(t => t.status === 'IN_PROGRESS');

    const runArchitecture = async () => {
        if (!goal?.trim()) return;
        
        try {
            const hasKey = await window.aistudio?.hasSelectedApiKey();
            if (!hasKey) { await promptSelectKey(); return; }

            setBicameralState({ isPlanning: true, plan: [], ledger: [], error: null });
            
            const tasks = await generateDecompositionMap(goal);
            const initialTasks = tasks.map(t => ({ ...t, status: 'PENDING' as const }));
            setBicameralState({ 
                plan: initialTasks, 
                isPlanning: false,
                swarmStatus: { ...swarmStatus, activeDNA: selectedDNA.id }
            });
            
            addLog('INFO', `ARCHITECT: Decomposed goal using ${selectedDNA.label} build.`);
            
            setBicameralState({ isSwarming: true });
            
            for (let i = 0; i < initialTasks.length; i++) {
                const task = initialTasks[i];
                setBicameralState(prev => ({
                    plan: prev.plan.map(t => t.id === task.id ? { ...t, status: 'IN_PROGRESS' } : t)
                }));

                const result = await consensusEngine(task, (statusUpdate: SwarmStatus) => {
                    setBicameralState(prev => ({ 
                        swarmStatus: { ...statusUpdate, activeDNA: selectedDNA.id, consensusProgress: (statusUpdate.currentGap / statusUpdate.targetGap) * 100 } 
                    }));
                });
                
                const consensusContent = `
# BICAMERAL CONSENSUS [BUILD: ${selectedDNA.label}]
**Task ID:** ${task.id}
**DNA Logic:** ${selectedDNA.description}
**Confidence:** ${result.confidence}%
**Consensus State:** Weightings Logic: ${agentWeights.logic}, Creativity: ${agentWeights.creativity}
---
${result.output}
                `.trim();

                const blob = new Blob([consensusContent], { type: 'text/markdown' });
                const file = new File([blob], `CONSENSUS_${task.id}.md`, { type: 'text/markdown' });
                
                await neuralVault.saveArtifact(file, {
                    classification: 'CONSENSUS_LEDGER',
                    ambiguityScore: 100 - result.confidence,
                    entities: ['Bicameral Swarm', selectedDNA.label],
                    summary: `Swarm build ${selectedDNA.label} consensus for: ${task.description}`
                });

                setBicameralState(prev => ({ 
                    plan: prev.plan.map(t => t.id === task.id ? { ...t, status: 'COMPLETED' } : t),
                    ledger: [...prev.ledger, result]
                }));
                
                addLog('SUCCESS', `SWARM: Consensus Reached (+${result.voteLedger.count - result.voteLedger.runnerUpCount}).`);
            }
            
            setBicameralState({ isSwarming: false });

        } catch (err: any) {
            setBicameralState({ isPlanning: false, isSwarming: false });
            addLog('ERROR', `BICAMERAL: ${err.message}`);
        }
    };

    return (
        <div className="h-full w-full bg-[#030303] flex font-sans overflow-hidden border border-[#1f1f1f] rounded-xl shadow-2xl relative">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(157,78,221,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(157,78,221,0.02)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none"></div>

            {/* LEFT: ARCHITECT & DNA BUILDER */}
            <div className="w-1/3 border-r border-[#1f1f1f] flex flex-col bg-[#050505] relative z-10 shadow-2xl">
                <div className="p-6 border-b border-[#1f1f1f] bg-[#0a0a0a]">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <BrainCircuit className="w-5 h-5 text-[#9d4edd]" />
                            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-widest">Architect Core</h2>
                        </div>
                        <button onClick={() => setShowControls(!showControls)} className="p-1.5 hover:bg-white/5 rounded text-gray-500 transition-colors">
                            <Settings2 size={16} />
                        </button>
                    </div>
                    
                    <AnimatePresence>
                        {showControls && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-6 space-y-4 overflow-hidden border-b border-white/5 pb-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[8px] font-mono text-gray-500 uppercase"><span>Logic Weighting</span><span>{agentWeights.logic}%</span></div>
                                    <input type="range" className="w-full h-1 bg-[#222] rounded appearance-none accent-[#9d4edd]" value={agentWeights.logic} onChange={e => setAgentWeights({...agentWeights, logic: parseInt(e.target.value)})} />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[8px] font-mono text-gray-500 uppercase"><span>Creativity Variance</span><span>{agentWeights.creativity}%</span></div>
                                    <input type="range" className="w-full h-1 bg-[#222] rounded appearance-none accent-[#22d3ee]" value={agentWeights.creativity} onChange={e => setAgentWeights({...agentWeights, creativity: parseInt(e.target.value)})} />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="mb-6">
                        <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block mb-3">Neural DNA Template</label>
                        <div className="grid grid-cols-2 gap-2">
                            {AGENT_DNA_BUILDER.map(dna => (
                                <button
                                    key={dna.id}
                                    onClick={() => setSelectedDNA(dna)}
                                    disabled={isSwarming}
                                    className={`p-3 border rounded-xl transition-all text-left flex flex-col gap-1 relative overflow-hidden group
                                        ${selectedDNA.id === dna.id ? 'bg-[#111] border-[var(--color)]' : 'bg-black border-[#222] opacity-40 hover:opacity-100'}
                                    `}
                                    style={{ '--color': dna.color } as any}
                                >
                                    <div className="flex items-center gap-2">
                                        <Dna size={12} style={{ color: dna.color }} />
                                        <span className={`text-[10px] font-bold font-mono uppercase ${selectedDNA.id === dna.id ? 'text-white' : 'text-gray-500'}`}>{dna.label}</span>
                                    </div>
                                    <span className="text-[8px] text-gray-600 font-mono leading-tight">{dna.role}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <textarea 
                        value={goal || ''}
                        onChange={e => setBicameralState({ goal: e.target.value })}
                        disabled={isSwarming}
                        placeholder="Define mission directive..."
                        className="w-full bg-[#111] border border-[#222] p-3 rounded text-xs font-mono text-white outline-none mb-3 h-24 resize-none focus:border-[#9d4edd] transition-colors shadow-inner"
                    />
                    
                    <button 
                        onClick={runArchitecture}
                        disabled={isPlanning || isSwarming || !goal?.trim()}
                        className="w-full py-3 bg-[#9d4edd] text-black font-bold font-mono text-xs uppercase tracking-widest hover:bg-[#b06bf7] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_0_20px_rgba(157,78,221,0.2)]"
                    >
                        {isPlanning ? <Loader2 className="w-4 h-4 animate-spin"/> : <GitBranch className="w-4 h-4"/>}
                        {isPlanning ? 'DECOMPOSING...' : 'INITIALIZE SWARM'}
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                    {plan.map((task, i) => (
                        <div key={task.id} className={`p-3 border rounded-xl flex flex-col gap-1 transition-all ${task.status === 'COMPLETED' ? 'border-[#42be65] bg-[#42be65]/5 shadow-[inset_0_0_10px_rgba(66,190,101,0.05)]' : task.status === 'IN_PROGRESS' ? 'border-[#3b82f6] bg-[#3b82f6]/10 animate-pulse' : 'border-[#222] bg-[#111]'}`}>
                            <div className="flex justify-between items-center text-[9px] font-mono">
                                <span className={task.status === 'IN_PROGRESS' ? 'text-[#3b82f6]' : 'text-gray-600'}>ATOM_{String(i).padStart(3,'0')}</span>
                                {task.status === 'COMPLETED' && <CheckCircle2 className="w-3 h-3 text-[#42be65]" />}
                            </div>
                            <div className="text-xs text-gray-300 font-mono">{task.description}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT: THE SWARM VISUALIZER */}
            <div className="flex-1 bg-black relative flex flex-col items-center justify-center p-12 overflow-hidden">
                <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">
                    <Dna className="w-[800px] h-[800px] text-[#9d4edd] animate-[spin_60s_linear_infinite]" />
                </div>
                
                {activeTask ? (
                    <div className="w-full max-w-2xl space-y-8 z-10">
                        <div className="text-center space-y-4">
                            <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }} className="inline-flex items-center gap-3 px-4 py-1 bg-[#111] border border-[#333] rounded-full">
                                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: selectedDNA.color }} />
                                <span className="text-[10px] font-mono font-black uppercase tracking-[0.2em]" style={{ color: selectedDNA.color }}>{selectedDNA.label} Build Active</span>
                            </motion.div>
                            <h1 className="text-xl font-bold text-white font-mono leading-relaxed drop-shadow-lg">"{activeTask.description}"</h1>
                            
                            {/* Consensus Progress Bar */}
                            <div className="w-full bg-[#111] h-1.5 rounded-full overflow-hidden border border-white/5 max-w-sm mx-auto">
                                <motion.div 
                                    className="h-full bg-gradient-to-r from-[#9d4edd] to-[#22d3ee] shadow-[0_0_10px_#9d4edd]"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${swarmStatus.consensusProgress || 0}%` }}
                                />
                            </div>
                            <div className="text-[8px] font-mono text-gray-500 uppercase">Agreement Matrix Convergence</div>
                        </div>

                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-4"><AgentGraveyard killedCount={swarmStatus.killedAgents} /></div>
                            <div className="col-span-8"><TugOfWarChart votes={swarmStatus.votes} confidenceGap={swarmStatus.targetGap} /></div>
                        </div>

                        <div className="bg-[#050505] border border-[#1f1f1f] rounded-xl p-4 font-mono text-[10px] text-[#42be65] shadow-inner relative overflow-hidden h-32 backdrop-blur-sm">
                            <div className="absolute top-2 right-4 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#42be65] animate-pulse shadow-[0_0_5px_#42be65]" />
                                <span className="text-[8px] text-gray-600">ENCLAVE_LIVE</span>
                            </div>
                            <div className="overflow-y-auto h-full custom-scrollbar space-y-1">
                                <div>> UPLINK_STABLE :: ENCLAVE_0xAF3</div>
                                <div>> DNA_VARIANT=${selectedDNA.id}</div>
                                <div>> CURRENT_LEADER_MARGIN=${swarmStatus.currentGap}</div>
                                <div>> TOTAL_AGENTS_SPAWNED=${swarmStatus.totalAttempts}</div>
                                {swarmStatus.killedAgents > 0 && <div className="text-red-500 font-bold">> TERMINATION_PROTOCOL_ACTIVE :: ${swarmStatus.killedAgents} VOIDED</div>}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center space-y-4 opacity-30 group cursor-default">
                        <div className="relative">
                            <div className="absolute inset-0 bg-[#9d4edd]/20 blur-[60px] animate-pulse"></div>
                            <Zap className="w-16 h-16 text-gray-500 mx-auto transition-transform group-hover:scale-110 relative z-10" />
                        </div>
                        <p className="font-mono text-sm uppercase tracking-[0.4em]">Enclave Standing By</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BicameralEngine;
