
import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store';
import { generateDecompositionMap, consensusEngine } from '../services/bicameralService';
import { promptSelectKey, AGENT_DNA_BUILDER } from '../services/geminiService';
import { neuralVault } from '../services/persistenceService';
import { BrainCircuit, Zap, Layers, Cpu, ArrowRight, CheckCircle2, Loader2, GitBranch, AlertOctagon, Save, ExternalLink, Dna, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TugOfWarChart } from './Visualizations/TugOfWarChart';
import { AgentGraveyard } from './Visualizations/AgentGraveyard';
import { SwarmStatus, AgentDNA } from '../types';

const BicameralEngine: React.FC = () => {
    const { bicameral, setBicameralState, addLog } = useAppStore();
    const { goal, plan, ledger, isPlanning, isSwarming, swarmStatus } = bicameral;
    
    const [selectedDNA, setSelectedDNA] = useState<AgentDNA>(AGENT_DNA_BUILDER[1]); // Default Synthesist
    
    const activeTask = plan.find(t => t.status === 'IN_PROGRESS');
    const isExternalProtocol = goal?.includes('[RESEARCH PROTOCOL]');

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
                    setBicameralState(prev => ({ swarmStatus: { ...statusUpdate, activeDNA: selectedDNA.id } }));
                });
                
                const consensusContent = `
# BICAMERAL CONSENSUS [BUILD: ${selectedDNA.label}]
**Task ID:** ${task.id}
**DNA Logic:** ${selectedDNA.description}
**Confidence:** ${result.confidence}%

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
                
                addLog('SUCCESS', `SWARM: Consensus [${selectedDNA.role}] Reached (+${result.voteLedger.count - result.voteLedger.runnerUpCount}).`);
                await new Promise(r => setTimeout(r, 500)); 
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
                    <div className="flex items-center gap-2 mb-2">
                        <BrainCircuit className="w-5 h-5 text-[#9d4edd]" />
                        <h2 className="text-sm font-bold text-white font-mono uppercase tracking-widest">Architect Core</h2>
                    </div>
                    
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
                                    {selectedDNA.id === dna.id && (
                                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[var(--color)] to-transparent" />
                                    )}
                                    <div className="flex items-center gap-2">
                                        <Dna size={12} style={{ color: dna.color }} />
                                        <span className={`text-[10px] font-bold font-mono uppercase ${selectedDNA.id === dna.id ? 'text-white' : 'text-gray-500'}`}>{dna.label}</span>
                                    </div>
                                    <span className="text-[8px] text-gray-600 font-mono leading-tight group-hover:text-gray-400">{dna.role}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <textarea 
                        value={goal || ''}
                        onChange={e => setBicameralState({ goal: e.target.value })}
                        disabled={isExternalProtocol || isSwarming}
                        placeholder="Define mission directive..."
                        className="w-full bg-[#111] border border-[#222] p-3 rounded text-xs font-mono text-white outline-none mb-3 h-24 resize-none focus:border-[#9d4edd] transition-colors"
                    />
                    
                    <button 
                        onClick={runArchitecture}
                        disabled={isPlanning || isSwarming || !goal?.trim()}
                        className="w-full py-3 bg-[#9d4edd] text-black font-bold font-mono text-xs uppercase tracking-widest hover:bg-[#b06bf7] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isPlanning ? <Loader2 className="w-4 h-4 animate-spin"/> : <GitBranch className="w-4 h-4"/>}
                        {isPlanning ? 'DECOMPOSING...' : 'INITIALIZE SWARM'}
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                    {plan.map((task, i) => (
                        <div key={task.id} className={`p-3 border rounded-xl flex flex-col gap-1 transition-all ${task.status === 'COMPLETED' ? 'border-[#42be65] bg-[#42be65]/5' : task.status === 'IN_PROGRESS' ? 'border-[#3b82f6] bg-[#3b82f6]/10' : 'border-[#222] bg-[#111]'}`}>
                            <div className="flex justify-between items-center text-[9px] font-mono">
                                <span className={task.status === 'IN_PROGRESS' ? 'text-[#3b82f6] animate-pulse' : 'text-gray-600'}>ATOM_{String(i).padStart(3,'0')}</span>
                                {task.status === 'COMPLETED' && <CheckCircle2 className="w-3 h-3 text-[#42be65]" />}
                            </div>
                            <div className="text-xs text-gray-300 font-mono">{task.description}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT: THE SWARM VISUALIZER */}
            <div className="flex-1 bg-black relative flex flex-col items-center justify-center p-12 overflow-hidden">
                <div className="absolute inset-0 opacity-10 pointer-events-none flex items-center justify-center">
                    <Dna className="w-[800px] h-[800px] text-[#9d4edd] animate-[spin_60s_linear_infinite]" />
                </div>
                
                {activeTask ? (
                    <div className="w-full max-w-2xl space-y-8 z-10">
                        <div className="text-center space-y-4">
                            <motion.div 
                                animate={{ scale: [1, 1.05, 1] }} 
                                transition={{ duration: 2, repeat: Infinity }}
                                className="inline-flex items-center gap-3 px-4 py-1 bg-[#111] border border-[#333] rounded-full"
                            >
                                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: selectedDNA.color }} />
                                <span className="text-[10px] font-mono font-black uppercase tracking-[0.2em]" style={{ color: selectedDNA.color }}>
                                    {selectedDNA.label} Build Active
                                </span>
                            </motion.div>
                            <h1 className="text-xl font-bold text-white font-mono leading-relaxed">"{activeTask.description}"</h1>
                        </div>

                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-4"><AgentGraveyard killedCount={swarmStatus.killedAgents} /></div>
                            <div className="col-span-8"><TugOfWarChart votes={swarmStatus.votes} confidenceGap={swarmStatus.targetGap} /></div>
                        </div>

                        <div className="bg-[#050505] border border-[#1f1f1f] rounded-xl p-4 font-mono text-[10px] text-[#42be65] shadow-inner relative overflow-hidden h-32">
                            <div className="absolute top-2 right-4 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#42be65] animate-pulse" />
                                <span className="text-[8px] text-gray-600">ENCLAVE_LIVE</span>
                            </div>
                            <div className="overflow-y-auto h-full custom-scrollbar space-y-1">
                                <div>> SWARM_INITIALIZED :: DNA_VARIANT=${selectedDNA.id}</div>
                                <div>> TARGET_GAP=${swarmStatus.targetGap}</div>
                                <div>> CURRENT_LEADER_MARGIN=${swarmStatus.currentGap}</div>
                                <div>> TOTAL_AGENTS_SPAWNED=${swarmStatus.totalAttempts}</div>
                                {swarmStatus.killedAgents > 0 && <div className="text-red-500 font-bold">> SECURITY_TRAP_TRIGGERED :: ${swarmStatus.killedAgents} VOIDED</div>}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center space-y-4 opacity-30 group cursor-default">
                        <Zap className="w-16 h-16 text-gray-500 mx-auto transition-transform group-hover:scale-110" />
                        <p className="font-mono text-sm uppercase tracking-[0.4em]">Enclave Standing By</p>
                        <div className="flex justify-center gap-6 text-[10px] font-mono">
                            <span className="flex items-center gap-2"><CheckCircle2 size={12}/> VALIDATION_READY</span>
                            <span className="flex items-center gap-2"><Info size={12}/> ADK_ENABLED</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BicameralEngine;
