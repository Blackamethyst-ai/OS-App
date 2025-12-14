
import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store';
import { generateDecompositionMap, consensusEngine } from '../services/bicameralService';
import { promptSelectKey } from '../services/geminiService';
import { BrainCircuit, Zap, Layers, Cpu, ArrowRight, CheckCircle2, Loader2, GitBranch, AlertOctagon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TugOfWarChart } from './Visualizations/TugOfWarChart';
import { AgentGraveyard } from './Visualizations/AgentGraveyard';
import { SwarmStatus } from '../types';

const BicameralEngine: React.FC = () => {
    const { bicameral, setBicameralState, addLog } = useAppStore();
    const { goal, plan, ledger, isPlanning, isSwarming, swarmStatus } = bicameral;
    
    // Find active task
    const activeTask = plan.find(t => t.status === 'IN_PROGRESS');

    const runArchitecture = async () => {
        if (!goal.trim()) return;
        
        try {
            const hasKey = await window.aistudio?.hasSelectedApiKey();
            if (!hasKey) { await promptSelectKey(); return; }

            // Phase 1: Architect (Stateful)
            setBicameralState({ isPlanning: true, plan: [], ledger: [], error: null });
            
            const tasks = await generateDecompositionMap(goal);
            // Initialize tasks with PENDING status
            const initialTasks = tasks.map(t => ({ ...t, status: 'PENDING' as const }));
            setBicameralState({ plan: initialTasks, isPlanning: false });
            addLog('INFO', `ARCHITECT: Decomposed goal into ${initialTasks.length} atomic tasks.`);
            
            // Phase 2: Swarm (Stateless)
            setBicameralState({ isSwarming: true });
            
            // Execute Sequentially
            for (let i = 0; i < initialTasks.length; i++) {
                const task = initialTasks[i];
                
                // Update Task Status to IN_PROGRESS
                setBicameralState(prev => ({
                    plan: prev.plan.map(t => t.id === task.id ? { ...t, status: 'IN_PROGRESS' } : t)
                }));

                // Reset Swarm Status for this task
                setBicameralState(prev => ({
                    swarmStatus: {
                        taskId: task.id,
                        votes: {},
                        killedAgents: 0,
                        currentGap: 0,
                        targetGap: 3,
                        totalAttempts: 0
                    }
                }));
                
                // Run Consensus Engine with live callback
                const result = await consensusEngine(task, (statusUpdate: SwarmStatus) => {
                    setBicameralState(prev => ({ swarmStatus: statusUpdate }));
                });
                
                // Update Task Status to COMPLETED and Add to Ledger
                setBicameralState(prev => ({ 
                    plan: prev.plan.map(t => t.id === task.id ? { ...t, status: 'COMPLETED' } : t),
                    ledger: [...prev.ledger, result]
                }));
                
                const killedMsg = result.voteLedger.killedAgents > 0 ? ` (${result.voteLedger.killedAgents} KIA)` : '';
                addLog('SUCCESS', `SWARM: Task ${task.id} Consensus @ +${result.voteLedger.count - result.voteLedger.runnerUpCount}${killedMsg}`);
                
                // Artificial delay for visual pacing
                await new Promise(r => setTimeout(r, 500)); 
            }
            
            setBicameralState({ isSwarming: false });
            addLog('SUCCESS', 'BICAMERAL: Sequence complete.');

        } catch (err: any) {
            console.error(err);
            setBicameralState({ 
                error: err.message, 
                isPlanning: false, 
                isSwarming: false
            });
            addLog('ERROR', `BICAMERAL: ${err.message}`);
        }
    };

    return (
        <div className="h-full w-full bg-[#030303] flex font-sans overflow-hidden border border-[#1f1f1f] rounded-xl shadow-2xl relative">
            
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(157,78,221,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(157,78,221,0.02)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none"></div>

            {/* LEFT HEMISPHERE: THE ARCHITECT (State & Plan) */}
            <div className="w-1/3 border-r border-[#1f1f1f] flex flex-col bg-[#050505] relative z-10">
                <div className="p-6 border-b border-[#1f1f1f] bg-[#0a0a0a]">
                    <div className="flex items-center gap-2 mb-2">
                        <BrainCircuit className="w-5 h-5 text-[#9d4edd]" />
                        <h2 className="text-sm font-bold text-white font-mono uppercase tracking-widest">Architect Core</h2>
                    </div>
                    <p className="text-[10px] text-gray-500 font-mono mb-4">
                        Stateful Decomposition Engine (Gemini 3.0 Pro)
                    </p>
                    <textarea 
                        value={goal}
                        onChange={e => setBicameralState({ goal: e.target.value })}
                        placeholder="Define high-level directive..."
                        className="w-full bg-[#111] border border-[#333] p-3 rounded text-xs font-mono text-white outline-none focus:border-[#9d4edd] mb-3 h-24 resize-none placeholder:text-gray-700"
                    />
                    <button 
                        onClick={runArchitecture}
                        disabled={isPlanning || isSwarming || !goal.trim()}
                        className="w-full py-3 bg-[#9d4edd] text-black font-bold font-mono text-xs uppercase tracking-widest hover:bg-[#b06bf7] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isPlanning ? <Loader2 className="w-4 h-4 animate-spin"/> : <GitBranch className="w-4 h-4"/>}
                        {isPlanning ? 'Decomposing...' : 'Initialize Swarm'}
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                    {plan.map((task, i) => (
                        <motion.div 
                            key={task.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={`p-3 border rounded flex flex-col gap-1 transition-all
                                ${task.status === 'COMPLETED' ? 'border-[#42be65] bg-[#42be65]/10' : ''}
                                ${task.status === 'IN_PROGRESS' ? 'border-[#3b82f6] bg-[#3b82f6]/10 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'border-[#222] bg-[#111]'}
                            `}
                        >
                            <div className="flex justify-between items-center">
                                <span className={`text-[9px] font-mono ${task.status === 'IN_PROGRESS' ? 'text-[#3b82f6] animate-pulse' : 'text-gray-500'}`}>
                                    ATOM_{i.toString().padStart(3, '0')}
                                </span>
                                {task.status === 'COMPLETED' && <CheckCircle2 className="w-3 h-3 text-[#42be65]" />}
                                {task.status === 'IN_PROGRESS' && <Loader2 className="w-3 h-3 text-[#3b82f6] animate-spin" />}
                            </div>
                            <div className="text-xs text-gray-300 font-mono font-bold">{task.description}</div>
                        </motion.div>
                    ))}
                    {plan.length === 0 && !isPlanning && (
                        <div className="text-center mt-10 opacity-30">
                            <Layers className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                            <p className="text-[10px] font-mono uppercase text-gray-500">Awaiting Directive</p>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT HEMISPHERE: THE SWARM (Execution & Consensus) */}
            <div className="flex-1 bg-black relative flex flex-col items-center justify-center p-8 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-95">
                
                {activeTask ? (
                    <div className="w-full max-w-2xl space-y-8 z-10">
                        <div className="text-center space-y-2">
                            <div className="inline-block px-3 py-1 bg-[#3b82f6]/10 border border-[#3b82f6] text-[#3b82f6] text-[10px] rounded-full font-mono animate-pulse uppercase tracking-wider">
                                Swarm Active: Processing Atomic Task
                            </div>
                            <h1 className="text-2xl font-light text-gray-200 font-mono">
                                "{activeTask.description}"
                            </h1>
                        </div>

                        {/* 2. THE VISUALIZATION DASHBOARD */}
                        <div className="grid grid-cols-3 gap-4">
                            {/* Agent Graveyard (1 col) */}
                            <div className="col-span-1">
                                <AgentGraveyard killedCount={swarmStatus.killedAgents} />
                            </div>

                            {/* Consensus Chart (2 cols) */}
                            <div className="col-span-2">
                                <TugOfWarChart 
                                    votes={swarmStatus.votes} 
                                    confidenceGap={swarmStatus.targetGap || 3} 
                                />
                            </div>
                        </div>

                        {/* Terminal Output Log */}
                        <div className="h-32 bg-[#050505] border border-[#1f1f1f] rounded p-4 font-mono text-[10px] text-[#42be65] overflow-y-auto custom-scrollbar shadow-inner">
                            <div>{'>'} Initializing Swarm Protocol...</div>
                            <div>{'>'} Target Consensus Gap: {swarmStatus.targetGap}</div>
                            <div>{'>'} Spawning Agent {swarmStatus.totalAttempts}...</div>
                            {swarmStatus.killedAgents > 0 && (
                                <div className="text-red-500">{'>'} [WATCHDOG] Kill signal sent (Token Overflow/Bad JSON)</div>
                            )}
                            <div>{'>'} Current Leader Confidence: +{swarmStatus.currentGap}</div>
                        </div>
                    </div>
                ) : (
                    <div className="text-gray-600 font-light text-xl flex flex-col items-center">
                        <Zap className="w-16 h-16 mb-4 opacity-20" />
                        <span>System Idle. Awaiting Architect Instructions.</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BicameralEngine;
