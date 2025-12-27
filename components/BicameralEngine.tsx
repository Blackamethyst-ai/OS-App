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
// Fixed: Added missing import for audio service
import { audio } from '../services/audioService';

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

            // Fix: Use the imported audio service for UI feedback
            audio.playClick();
            setBicameralState({ isPlanning: true, plan: [], ledger: [], error: null });
            
            // Combine goal with custom directive for decomposition
            const fullGoal = `${goal}${customDirective ? `\n\nDIRECTIVE: ${customDirective}` : ''}\nAGENT_WEIGHTS: ${JSON.stringify(agentWeights)}`;
            const tasks = await generateDecompositionMap(fullGoal);
            
            if (!tasks || tasks.length === 0) throw new Error("Decomposition returned null logic.");

            const initialTasks = tasks.map(t => ({ ...t, status: 'PENDING' as const }));
            setBicameralState({ 
                plan: initialTasks, 
                isPlanning: false,
                swarmStatus: { ...swarmStatus, activeDNA: selectedDNA.id }
            });
            
            addLog('INFO', `ARCHITECT: Decomposed goal using ${selectedDNA.label} build.`);
            
            setBicameralState({ isSwarming: true });
            
            // Process tasks sequentially in the swarm
            for (let i = 0; i < initialTasks.length; i++) {
                const task = initialTasks[i];
                
                // Set current task to in-progress
                setBicameralState(prev => ({
                    plan: prev.plan.map(t => t.id === task.id ? { ...t, status: 'IN_PROGRESS' } : t)
                }));

                try {
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
                } catch (taskErr) {
                    console.error("Task Swarm Fail", taskErr);
                    setBicameralState(prev => ({ 
                        plan: prev.plan.map(t => t.id === task.id ? { ...t, status: 'FAILED' } : t)
                    }));
                }
            }
            
            setBicameralState({ isSwarming: false });
            // Fix: Trigger success audio after sequence completion
            audio.playSuccess();

        } catch (err: any) {
            setBicameralState({ isPlanning: false, isSwarming: false, error: err.message });
            addLog('ERROR', `BICAMERAL: ${err.message}`);
            // Fix: Trigger error audio on exception
            audio.playError();
        }
    };

    return (
        <div className="h-full w-full bg-[#030303] flex font-sans overflow-hidden border border-[#1f1f1f] rounded-[2.5rem] shadow-2xl relative">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(157,78,221,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(157,78,221,0.02)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none"></div>

            {/* LEFT: ARCHITECT & DNA BUILDER */}
            <div className="w-[380px] border-r border-[#1f1f1f] flex flex-col bg-[#050505] relative z-10 shadow-2xl shrink-0">
                <div className="p-8 border-b border-[#1f1f1f] bg-[#0a0a0a]">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-[#9d4edd]/10 rounded-xl border border-[#9d4edd]/40">
                                <BrainCircuit className="w-5 h-5 text-[#9d4edd]" />
                            </div>
                            <h2 className="text-xs font-black text-white font-mono uppercase tracking-[0.3em]">Architect Core</h2>
                        </div>
                        <button onClick={() => setShowControls(!showControls)} className={`p-2 rounded-lg transition-all ${showControls ? 'bg-[#9d4edd] text-black shadow-lg shadow-[#9d4edd]/20' : 'hover:bg-white/5 text-gray-600'}`}>
                            <Settings2 size={18} />
                        </button>
                    </div>
                    
                    <AnimatePresence>
                        {showControls && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-8 space-y-8 overflow-hidden border-b border-white/5 pb-8">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <div className="text-[10px] font-black text-gray-200 uppercase tracking-widest">Logic Skepticism</div>
                                            <div className="text-[8px] text-gray-600 font-mono">Critical filtering intensity</div>
                                        </div>
                                        <span className="text-xs font-black font-mono text-[#ef4444]">{agentWeights.skepticism}%</span>
                                    </div>
                                    <input type="range" className="w-full h-1 bg-[#1a1a1a] rounded-full appearance-none accent-[#ef4444]" value={agentWeights.skepticism} onChange={e => setAgentWeights({...agentWeights, skepticism: parseInt(e.target.value)})} />
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <div className="text-[10px] font-black text-gray-200 uppercase tracking-widest">Neural Excitement</div>
                                            <div className="text-[8px] text-gray-600 font-mono">Creativity and risk bias</div>
                                        </div>
                                        <span className="text-xs font-black font-mono text-[#f59e0b]">{agentWeights.excitement}%</span>
                                    </div>
                                    <input type="range" className="w-full h-1 bg-[#1a1a1a] rounded-full appearance-none accent-[#f59e0b]" value={agentWeights.excitement} onChange={e => setAgentWeights({...agentWeights, excitement: parseInt(e.target.value)})} />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[8px] font-mono text-gray-500 uppercase tracking-widest px-1"><span>Active Directive Overlay</span> <Target size(10) className="text-[#9d4edd]" /></div>
                                    <input 
                                        type="text" 
                                        value={customDirective}
                                        onChange={e => setCustomDirective(e.target.value)}
                                        placeholder="Inject logic anchor for swarm..."
                                        className="w-full bg-black border border-[#333] px-4 py-2.5 rounded-xl text-[10px] font-mono text-white outline-none focus:border-[#9d4edd] transition-colors"
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="mb-8">
                        <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block mb-4 font-black flex items-center gap-2">
                            <Dna size={14} className="text-[#9d4edd]" /> Swarm DNA Profile
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {AGENT_DNA_BUILDER.map(dna => (
                                <button
                                    key={dna.id}
                                    onClick={() => setSelectedDNA(dna)}
                                    disabled={isSwarming}
                                    className={`p-4 border rounded-2xl transition-all text-left flex flex-col gap-1 relative overflow-hidden group
                                        ${selectedDNA.id === dna.id ? 'bg-[#111] border-[var(--color)] shadow-2xl' : 'bg-black border-[#222] opacity-30 hover:opacity-100'}
                                    `}
                                    style={{ '--color': dna.color } as any}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dna.color }} />
                                        <span className={`text-[10px] font-black font-mono uppercase ${selectedDNA.id === dna.id ? 'text-white' : 'text-gray-500'}`}>{dna.label}</span>
                                    </div>
                                    <span className="text-[8px] text-gray-600 font-mono leading-tight tracking-tighter uppercase">{dna.role}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 mb-6">
                        <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest font-black px-1">Goal Manifest</label>
                        <textarea 
                            value={goal || ''}
                            onChange={e => setBicameralState({ goal: e.target.value })}
                            disabled={isSwarming}
                            placeholder="Specify primary system goal..."
                            className="w-full bg-[#050505] border border-[#222] p-5 rounded-[1.5rem] text-xs font-mono text-white outline-none h-28 resize-none focus:border-[#9d4edd] transition-all shadow-inner placeholder:text-gray-800"
                        />
                    </div>
                    
                    <button 
                        onClick={runArchitecture}
                        disabled={isPlanning || isSwarming || !goal?.trim()}
                        className="w-full py-5 bg-[#9d4edd] text-black font-black font-mono text-[11px] uppercase tracking-[0.4em] rounded-2xl hover:bg-[#b06bf7] transition-all flex items-center justify-center gap-4 disabled:opacity-50 shadow-[0_20px_60px_rgba(157,78,221,0.4)] active:scale-95 group"
                    >
                        {isPlanning || isSwarming ? <Loader2 className="w-5 h-5 animate-spin"/> : <GitBranch className="w-5 h-5 group-hover:scale-110 transition-transform"/>}
                        {isPlanning ? 'DECOMPOSING...' : isSwarming ? 'SWARM_LIVE' : 'INITIALIZE CONSENSUS'}
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3 bg-[#030303]">
                    <div className="flex items-center justify-between px-2 mb-4">
                        <div className="flex items-center gap-3 text-[10px] font-black font-mono text-gray-500 uppercase tracking-widest">
                            <Layers size={14} /> Neural Queue
                        </div>
                        {isSwarming && (
                             <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_10px_#10b981]" />
                                <span className="text-[8px] font-mono text-[#10b981] font-black uppercase">Simulating</span>
                            </div>
                        )}
                    </div>
                    {plan.map((task, i) => (
                        <motion.div 
                            key={task.id} 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`p-4 border rounded-2xl flex flex-col gap-2 transition-all duration-700 ${task.status === 'COMPLETED' ? 'border-[#42be65]/40 bg-[#42be65]/5 opacity-60' : task.status === 'IN_PROGRESS' ? 'border-[#9d4edd] bg-[#9d4edd]/5 shadow-[0_0_20px_rgba(157,78,221,0.1)]' : 'border-white/5 bg-[#0a0a0a]'}`}
                        >
                            <div className="flex justify-between items-center text-[9px] font-mono font-black">
                                <span className={task.status === 'IN_PROGRESS' ? 'text-[#9d4edd]' : 'text-gray-700'}>NODE_PROTOCOL_{String(i).padStart(3,'0')}</span>
                                {task.status === 'COMPLETED' ? <CheckCircle2 className="w-4 h-4 text-[#42be65]" /> : task.status === 'IN_PROGRESS' ? <Activity className="w-4 h-4 text-[#9d4edd] animate-pulse" /> : <GitCommit size={14} className="text-gray-800" />}
                            </div>
                            <div className="text-[11px] text-gray-300 font-mono leading-relaxed truncate">{task.description}</div>
                        </motion.div>
                    ))}
                    {plan.length === 0 && !isPlanning && (
                        <div className="h-full flex flex-col items-center justify-center opacity-10 py-32 grayscale">
                            <GitCommit size={64} className="mb-8" />
                            <p className="text-sm font-mono uppercase tracking-[1em]">Queue Empty</p>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: THE SWARM VISUALIZER */}
            <div className="flex-1 bg-black relative flex flex-col items-center justify-center p-20 overflow-hidden">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
                    <Dna className="w-[900px] h-[900px] text-[#9d4edd] animate-[spin_100s_linear_infinite]" />
                </div>
                
                {activeTask ? (
                    <div className="w-full max-w-3xl space-y-12 z-10">
                        <div className="text-center space-y-6">
                            <motion.div initial={{ y: -15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="inline-flex items-center gap-5 px-6 py-2 bg-[#0a0a0a] border border-white/10 rounded-full shadow-2xl">
                                <div className="w-2.5 h-2.5 rounded-full animate-pulse shadow-[0_0_15px_currentColor]" style={{ backgroundColor: selectedDNA.color, color: selectedDNA.color }} />
                                <span className="text-[11px] font-mono font-black uppercase tracking-[0.4em]" style={{ color: selectedDNA.color }}>{selectedDNA.label} Build Active</span>
                            </motion.div>
                            <motion.h1 
                                key={activeTask.id}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-2xl font-black text-white font-mono leading-relaxed drop-shadow-[0_10px_30px_rgba(0,0,0,1)]"
                            >
                                "{activeTask.description}"
                            </motion.h1>
                            
                            <div className="space-y-4">
                                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5 max-w-md mx-auto p-0.5 shadow-inner">
                                    <motion.div 
                                        className="h-full bg-gradient-to-r from-[#9d4edd] via-[#22d3ee] to-[#10b981] shadow-[0_0_20px_#9d4edd]"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${swarmStatus.consensusProgress || 0}%` }}
                                        transition={{ duration: 0.8 }}
                                    />
                                </div>
                                <div className="text-[9px] font-black font-mono text-gray-600 uppercase tracking-[0.6em]">Consensus Convergent Node v9.4</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-12 gap-8 h-48">
                            <div className="col-span-4"><AgentGraveyard killedCount={swarmStatus.killedAgents} /></div>
                            <div className="col-span-8"><TugOfWarChart votes={swarmStatus.votes} confidenceGap={swarmStatus.targetGap} /></div>
                        </div>

                        <div className="bg-[#050505] border border-white/5 rounded-[2.5rem] p-8 font-mono text-[11px] text-[#42be65] shadow-[inset_0_0_50px_rgba(0,0,0,1)] relative overflow-hidden h-44 backdrop-blur-xl group">
                            <div className="absolute top-4 right-8 flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-[#42be65] animate-pulse shadow-[0_0_10px_#42be65]" />
                                <span className="text-[9px] font-black text-gray-700 uppercase tracking-widest">Enclave_Live_Feed</span>
                            </div>
                            <div className="overflow-y-auto h-full custom-scrollbar space-y-1.5 pr-6">
                                <div className="opacity-40">[{new Date().toLocaleTimeString()}] UPLINK_STABLE // AUTH_ACK_L0</div>
                                <div className="flex gap-4"><span className="text-gray-600 shrink-0">{">"} DNA_VARIANT:</span> <span className="text-white font-bold">{selectedDNA.id}</span></div>
                                <div className="flex gap-4"><span className="text-gray-600 shrink-0">{">"} WEIGHTS:</span> <span className="text-white font-bold tracking-widest">S:{agentWeights.skepticism} E:{agentWeights.excitement} A:{agentWeights.alignment}</span></div>
                                <div className="flex gap-4"><span className="text-gray-600 shrink-0">{">"} MARGIN_THRESHOLD:</span> <span className="text-[#10b981] font-black">+{swarmStatus.currentGap}</span></div>
                                <div className="flex gap-4"><span className="text-gray-600 shrink-0">{">"} SPAWNED_NODES:</span> <span className="text-white">{swarmStatus.totalAttempts}</span></div>
                                {swarmStatus.killedAgents > 0 && <div className="text-red-500 font-black animate-pulse">{" > "} CRITICAL_PURGE :: {swarmStatus.killedAgents} AGENTS_VOIDED_FOR_DRIFT</div>}
                                {swarmStatus.consensusProgress === 100 && <div className="text-[#22d3ee] font-black bg-[#22d3ee]/10 px-2 py-0.5 rounded w-fit">{" > "} CONSENSUS_LOCKED_STABLE // ARCHIVING_LEDGER...</div>}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center space-y-10 opacity-10 group cursor-default">
                        <div className="relative">
                            <div className="absolute inset-0 bg-[#9d4edd]/20 blur-[120px] animate-pulse"></div>
                            <Zap size={120} className="text-gray-500 mx-auto transition-transform group-hover:scale-125 duration-1000 relative z-10" />
                        </div>
                        <p className="font-mono text-2xl uppercase tracking-[1.2em] text-white">Bicameral Core Standby</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BicameralEngine;