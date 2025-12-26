import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store';
import { generateDecompositionMap, consensusEngine } from '../services/bicameralService';
import { promptSelectKey, AGENT_DNA_BUILDER } from '../services/geminiService';
import { neuralVault } from '../services/persistenceService';
import { BrainCircuit, Zap, Layers, Cpu, ArrowRight, CheckCircle2, Loader2, GitBranch, GitCommit, AlertOctagon, Save, ExternalLink, Dna, Info, Settings2, Sliders, X, MessageSquareCode, ShieldCheck, Activity, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TugOfWarChart } from './Visualizations/TugOfWarChart';
import { AgentGraveyard } from './Visualizations/AgentGraveyard';
import { SwarmStatus, AgentDNA } from '../types';

const BicameralEngine: React.FC = () => {
    const { bicameral, setBicameralState, addLog } = useAppStore();
    const { goal, plan, ledger, isPlanning, isSwarming, swarmStatus } = bicameral;
    
    const [selectedDNA, setSelectedDNA] = useState<AgentDNA>(AGENT_DNA_BUILDER[1]); 
    const [agentWeights, setAgentWeights] = useState({ skepticism: 50, excitement: 80, alignment: 90 });
    const [showControls, setShowControls] = useState(false);
    const [customDirective, setCustomDirective] = useState('');
    
    const activeTask = plan.find(t => t.status === 'IN_PROGRESS');

    const runArchitecture = async () => {
        if (!goal?.trim()) return;
        
        try {
            const hasKey = await window.aistudio?.hasSelectedApiKey();
            if (!hasKey) { await promptSelectKey(); return; }

            setBicameralState({ isPlanning: true, plan: [], ledger: [], error: null });
            
            // Combine goal with custom directive for decomposition
            const fullGoal = `${goal}${customDirective ? `\n\nDIRECTIVE: ${customDirective}` : ''}\nAGENT_WEIGHTS: ${JSON.stringify(agentWeights)}`;
            const tasks = await generateDecompositionMap(fullGoal);
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
**Mental State Weighting:** Skepticism: ${agentWeights.skepticism}, Excitement: ${agentWeights.excitement}, Alignment: ${agentWeights.alignment}
${customDirective ? `**Custom Directive:** ${customDirective}` : ''}
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
                        <button onClick={() => setShowControls(!showControls)} className={`p-1.5 rounded transition-colors ${showControls ? 'bg-[#9d4edd] text-black' : 'hover:bg-white/5 text-gray-500'}`}>
                            <Settings2 size={16} />
                        </button>
                    </div>
                    
                    <AnimatePresence>
                        {showControls && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-6 space-y-6 overflow-hidden border-b border-white/5 pb-6">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <div className="text-[10px] font-black text-gray-200 uppercase tracking-widest">Logic Skepticism</div>
                                            <div className="text-[8px] text-gray-600 font-mono">Critical filtering of results</div>
                                        </div>
                                        <span className="text-xs font-black font-mono text-[#ef4444]">{agentWeights.skepticism}%</span>
                                    </div>
                                    <input type="range" className="w-full h-1 bg-[#222] rounded appearance-none accent-[#ef4444]" value={agentWeights.skepticism} onChange={e => setAgentWeights({...agentWeights, skepticism: parseInt(e.target.value)})} />
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <div className="text-[10px] font-black text-gray-200 uppercase tracking-widest">Neural Excitement</div>
                                            <div className="text-[8px] text-gray-600 font-mono">Creativity and risk bias</div>
                                        </div>
                                        <span className="text-xs font-black font-mono text-[#f59e0b]">{agentWeights.excitement}%</span>
                                    </div>
                                    <input type="range" className="w-full h-1 bg-[#222] rounded appearance-none accent-[#f59e0b]" value={agentWeights.excitement} onChange={e => setAgentWeights({...agentWeights, excitement: parseInt(e.target.value)})} />
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <div className="text-[10px] font-black text-gray-200 uppercase tracking-widest">OS Alignment</div>
                                            <div className="text-[8px] text-gray-600 font-mono">Core directive adherence</div>
                                        </div>
                                        <span className="text-xs font-black font-mono text-[#22d3ee]">{agentWeights.alignment}%</span>
                                    </div>
                                    <input type="range" className="w-full h-1 bg-[#222] rounded appearance-none accent-[#22d3ee]" value={agentWeights.alignment} onChange={e => setAgentWeights({...agentWeights, alignment: parseInt(e.target.value)})} />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[8px] font-mono text-gray-500 uppercase"><span>Active Overlay Directive</span> <Target size={10} className="text-[#9d4edd]" /></div>
                                    <input 
                                        type="text" 
                                        value={customDirective}
                                        onChange={e => setCustomDirective(e.target.value)}
                                        placeholder="Inject logic anchor for swarm..."
                                        className="w-full bg-black border border-[#333] px-3 py-2 rounded text-[10px] font-mono text-white outline-none focus:border-[#9d4edd] transition-colors"
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="mb-6">
                        <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block mb-3 font-bold flex items-center gap-2">
                            <Dna size={12} className="text-[#9d4edd]" /> Neural DNA Template
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {AGENT_DNA_BUILDER.map(dna => (
                                <button
                                    key={dna.id}
                                    onClick={() => setSelectedDNA(dna)}
                                    disabled={isSwarming}
                                    className={`p-3 border rounded-xl transition-all text-left flex flex-col gap-1 relative overflow-hidden group
                                        ${selectedDNA.id === dna.id ? 'bg-[#111] border-[var(--color)] shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]' : 'bg-black border-[#222] opacity-40 hover:opacity-100'}
                                    `}
                                    style={{ '--color': dna.color } as any}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dna.color }} />
                                        <span className={`text-[10px] font-bold font-mono uppercase ${selectedDNA.id === dna.id ? 'text-white' : 'text-gray-500'}`}>{dna.label}</span>
                                    </div>
                                    <span className="text-[8px] text-gray-600 font-mono leading-tight">{dna.role}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5 mb-4">
                        <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest font-bold">Goal Manifest</label>
                        <textarea 
                            value={goal || ''}
                            onChange={e => setBicameralState({ goal: e.target.value })}
                            disabled={isSwarming}
                            placeholder="Identify core mission objective..."
                            className="w-full bg-[#050505] border border-[#222] p-4 rounded-xl text-xs font-mono text-white outline-none h-24 resize-none focus:border-[#9d4edd] transition-all shadow-inner placeholder:text-gray-800"
                        />
                    </div>
                    
                    <button 
                        onClick={runArchitecture}
                        disabled={isPlanning || isSwarming || !goal?.trim()}
                        className="w-full py-4 bg-[#9d4edd] text-black font-black font-mono text-xs uppercase tracking-[0.2em] rounded-xl hover:bg-[#b06bf7] transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-[0_0_40px_rgba(157,78,221,0.3)] group"
                    >
                        {isPlanning ? <Loader2 className="w-4 h-4 animate-spin"/> : <GitBranch className="w-4 h-4 group-hover:scale-110 transition-transform"/>}
                        {isPlanning ? 'DECOMPOSING...' : 'INITIALIZE SWARM'}
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2 bg-[#030303]">
                    <div className="flex items-center gap-2 px-2 py-1 text-[8px] font-mono text-gray-600 uppercase tracking-widest border-b border-white/5 mb-3">
                        <Layers size={10} /> Atomic Task Queue
                    </div>
                    {plan.map((task, i) => (
                        <div key={task.id} className={`p-3 border rounded-xl flex flex-col gap-1 transition-all ${task.status === 'COMPLETED' ? 'border-[#42be65] bg-[#42be65]/5 shadow-[inset_0_0_10px_rgba(66,190,101,0.05)]' : task.status === 'IN_PROGRESS' ? 'border-[#3b82f6] bg-[#3b82f6]/10 animate-pulse' : 'border-[#222] bg-[#111]'}`}>
                            <div className="flex justify-between items-center text-[9px] font-mono">
                                <span className={task.status === 'IN_PROGRESS' ? 'text-[#3b82f6]' : 'text-gray-600'}>ATOM_{String(i).padStart(3,'0')}</span>
                                {task.status === 'COMPLETED' ? <CheckCircle2 className="w-3 h-3 text-[#42be65]" /> : task.status === 'IN_PROGRESS' ? <Activity className="w-3 h-3 text-[#3b82f6]" /> : null}
                            </div>
                            <div className="text-xs text-gray-300 font-mono truncate">{task.description}</div>
                        </div>
                    ))}
                    {plan.length === 0 && !isPlanning && (
                        <div className="h-full flex flex-col items-center justify-center opacity-10 py-12">
                            <GitCommit size={32} />
                            <p className="text-[10px] font-mono uppercase mt-2">Queue Empty</p>
                        </div>
                    )}
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
                            <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="inline-flex items-center gap-3 px-4 py-1 bg-[#111] border border-[#333] rounded-full">
                                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: selectedDNA.color }} />
                                <span className="text-[10px] font-mono font-black uppercase tracking-[0.2em]" style={{ color: selectedDNA.color }}>{selectedDNA.label} Build Active</span>
                            </motion.div>
                            <motion.h1 
                                key={activeTask.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-xl font-bold text-white font-mono leading-relaxed drop-shadow-lg"
                            >
                                "{activeTask.description}"
                            </motion.h1>
                            
                            {/* Consensus Progress Bar */}
                            <div className="w-full bg-[#111] h-1.5 rounded-full overflow-hidden border border-white/5 max-w-sm mx-auto">
                                <motion.div 
                                    className="h-full bg-gradient-to-r from-[#9d4edd] to-[#22d3ee] shadow-[0_0_10px_#9d4edd]"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${swarmStatus.consensusProgress || 0}%` }}
                                />
                            </div>
                            <div className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">Agreement Matrix Convergence</div>
                        </div>

                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-4"><AgentGraveyard killedCount={swarmStatus.killedAgents} /></div>
                            <div className="col-span-8"><TugOfWarChart votes={swarmStatus.votes} confidenceGap={swarmStatus.targetGap} /></div>
                        </div>

                        <div className="bg-[#050505] border border-[#1f1f1f] rounded-xl p-4 font-mono text-[10px] text-[#42be65] shadow-inner relative overflow-hidden h-32 backdrop-blur-sm group">
                            <div className="absolute top-2 right-4 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#42be65] animate-pulse shadow-[0_0_5px_#42be65]" />
                                <span className="text-[8px] text-gray-600">ENCLAVE_0xAF3_LIVE</span>
                            </div>
                            <div className="overflow-y-auto h-full custom-scrollbar space-y-1 pr-4">
                                <div>{'>'} UPLINK_STABLE :: AUTH_ACK</div>
                                <div>{'>'} DNA_VARIANT={selectedDNA.id}</div>
                                <div>{'>'} WEIGHTS :: S={agentWeights.skepticism} E={agentWeights.excitement} A={agentWeights.alignment}</div>
                                <div>{'>'} CURRENT_LEADER_MARGIN={swarmStatus.currentGap}</div>
                                <div>{'>'} TOTAL_AGENTS_SPAWNED={swarmStatus.totalAttempts}</div>
                                {swarmStatus.killedAgents > 0 && <div className="text-red-500 font-bold">{' > '} TERMINATION_PROTOCOL_ACTIVE :: {swarmStatus.killedAgents} VOIDED</div>}
                                {swarmStatus.consensusProgress === 100 && <div className="text-[#22d3ee] font-black">{' > '} CONSENSUS_LOCKED :: EXPORTING_LEDGER</div>}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center space-y-4 opacity-30 group cursor-default">
                        <div className="relative">
                            <div className="absolute inset-0 bg-[#9d4edd]/20 blur-[60px] animate-pulse"></div>
                            <Zap className="w-16 h-16 text-gray-500 mx-auto transition-transform group-hover:scale-110 relative z-10" />
                        </div>
                        <p className="font-mono text-sm uppercase tracking-[0.4em]">Bicameral Enclave Standing By</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BicameralEngine;
