
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../store';
import { generateHypotheses, simulateExperiment, generateTheory, promptSelectKey } from '../services/geminiService';
import { ScienceHypothesis, FactChunk, KnowledgeNode, ResearchTask } from '../types';
import { 
    FlaskConical, Atom, BrainCircuit, Search, Play, CheckCircle2, 
    XCircle, FileText, Loader2, Beaker, Network, Microscope, 
    Activity, Zap, Sparkles, Database, Layers, Target, GitBranch, 
    Cpu, Globe, ChevronRight, Maximize2, RotateCcw, ArrowRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- SUB-COMPONENT: SUPER LATTICE (The Visualization Core) ---
const SuperLattice: React.FC<{ nodes: KnowledgeNode[] }> = ({ nodes }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container || !canvas.parentElement) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let time = 0;

        // Dynamic node mapping based on inputs
        // We use a stable seed map to prevent jitter on re-renders
        const renderedNodes = nodes.map((n, i) => {
            // Spherical Fibonacci Lattice distribution for even sphere coverage
            const samples = nodes.length;
            const phi = Math.PI * (3 - Math.sqrt(5)); // Golden Angle
            const y = 1 - (i / (samples - 1)) * 2; // y goes from 1 to -1
            const radius = Math.sqrt(1 - y * y);
            const theta = phi * i;

            const x = Math.cos(theta) * radius;
            const z = Math.sin(theta) * radius;

            return {
                ...n,
                x: 0, y: 0, z: 0, // Projected 2D coords
                baseX: x, baseY: y, baseZ: z, // 3D Unit coords
                color: n.type === 'HYPOTHESIS' ? '#f59e0b' : n.type === 'CONCEPT' ? '#9d4edd' : '#22d3ee'
            };
        });

        const render = () => {
            time += 0.002;
            
            // Handle Resize
            canvas.width = container.offsetWidth;
            canvas.height = container.offsetHeight;
            
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            const globeRadius = Math.min(cx, cy) * 0.65; // Base size

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 1. Rotation Matrix (Slow spin)
            const rotX = time * 0.5;
            const rotY = time * 0.8;

            // 2. Project Nodes
            renderedNodes.forEach(n => {
                // Rotate around Y
                let x1 = n.baseX * Math.cos(rotY) - n.baseZ * Math.sin(rotY);
                let z1 = n.baseZ * Math.cos(rotY) + n.baseX * Math.sin(rotY);
                
                // Rotate around X
                let y1 = n.baseY * Math.cos(rotX) - z1 * Math.sin(rotX);
                let z2 = z1 * Math.cos(rotX) + n.baseY * Math.sin(rotX);

                const scale = 300 / (300 + z2); // Perspective division
                
                n.x = cx + x1 * globeRadius * scale;
                n.y = cy + y1 * globeRadius * scale;
                n.z = z2; // Store depth for sorting
                (n as any).scale = scale;
            });

            // 3. Sort by Depth (Painter's Algorithm)
            renderedNodes.sort((a, b) => b.z - a.z);

            // 4. Draw Connections (Distance based)
            ctx.lineWidth = 0.5;
            for (let i = 0; i < renderedNodes.length; i++) {
                const n1 = renderedNodes[i];
                // Only draw connections for nodes roughly in front
                if ((n1 as any).scale < 0.6) continue; 

                for (let j = i + 1; j < renderedNodes.length; j++) {
                    const n2 = renderedNodes[j];
                    const dist = Math.sqrt((n1.x - n2.x) ** 2 + (n1.y - n2.y) ** 2);
                    
                    // Connect if close enough on screen
                    if (dist < 100) {
                        const alpha = (1 - dist / 100) * 0.3 * ((n1 as any).scale);
                        ctx.strokeStyle = `rgba(34, 211, 238, ${alpha})`;
                        ctx.beginPath();
                        ctx.moveTo(n1.x, n1.y);
                        ctx.lineTo(n2.x, n2.y);
                        ctx.stroke();
                    }
                }
            }

            // 5. Draw Nodes
            renderedNodes.forEach(n => {
                const s = (n as any).scale;
                const size = (n.type === 'HYPOTHESIS' ? 6 : n.type === 'CONCEPT' ? 4 : 2) * s;
                const alpha = Math.max(0.1, s); // Fade out back nodes

                ctx.beginPath();
                ctx.arc(n.x, n.y, size, 0, Math.PI * 2);
                ctx.fillStyle = n.color;
                ctx.globalAlpha = alpha;
                ctx.fill();
                
                // Active Glow
                if (Math.random() > 0.99) {
                    ctx.shadowBlur = 10 * s;
                    ctx.shadowColor = '#fff';
                    ctx.fillStyle = '#fff';
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }

                // Labels (Only for front-facing, important nodes)
                if (s > 0.8 && (n.type !== 'FACT' || renderedNodes.length < 20)) {
                    ctx.fillStyle = '#fff';
                    ctx.font = `${9 * s}px Fira Code`;
                    ctx.textAlign = 'center';
                    ctx.fillText(n.label.substring(0, 15), n.x, n.y - (10 * s));
                }
                ctx.globalAlpha = 1;
            });

            animationFrameId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationFrameId);
    }, [nodes]);

    return (
        <div ref={containerRef} className="absolute inset-0 z-0 bg-black">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.05)_0%,transparent_70%)] pointer-events-none"></div>
            <canvas ref={canvasRef} className="w-full h-full opacity-80" />
        </div>
    );
};

// --- MAIN COMPONENT: DISCOVERY SUPERLAB ---
const DiscoveryLab: React.FC = () => {
    const { discovery, setDiscoveryState, addLog, research, addResearchTask, cancelResearchTask } = useAppStore();
    const [input, setInput] = useState('');
    
    // Live Knowledge Integration:
    // We map *active research findings* directly to the Knowledge Lattice
    const activeKnowledge = useMemo(() => {
        const nodes: KnowledgeNode[] = [];
        
        // 1. Root Concepts (Task Queries)
        research.tasks.forEach(t => {
            nodes.push({
                id: t.id,
                label: t.query,
                type: 'CONCEPT',
                connections: [],
                strength: 10
            });
            
            // 2. Findings (Facts)
            if (t.findings) {
                t.findings.forEach(f => {
                    nodes.push({
                        id: f.id,
                        label: f.fact,
                        type: 'FACT',
                        connections: [t.id],
                        strength: f.confidence
                    });
                });
            }
        });

        // 3. Generated Hypotheses
        discovery.hypotheses.forEach(h => {
            nodes.push({
                id: h.id,
                label: h.statement,
                type: 'HYPOTHESIS',
                connections: [], // Could link to supporting facts later
                strength: h.confidence
            });
        });

        return nodes;
    }, [research.tasks, discovery.hypotheses]);

    const activeTasks = research.tasks.filter(t => ['QUEUED', 'PLANNING', 'SEARCHING', 'SYNTHESIZING'].includes(t.status));

    const handleResearchDispatch = async (customQuery?: string) => {
        const query = customQuery || input;
        if (!query.trim()) return;
        
        const hasKey = await window.aistudio?.hasSelectedApiKey();
        if (!hasKey) { await promptSelectKey(); return; }

        addResearchTask({
            id: crypto.randomUUID(),
            query: query,
            status: 'QUEUED',
            progress: 0,
            logs: ['Initiating Science Protocol...'],
            timestamp: Date.now()
        });
        
        if (!customQuery) setInput('');
        addLog('INFO', `SCIENCE_LAB: Research Agent dispatched for "${query}"`);
    };

    const handleGenerateHypotheses = async () => {
        if (activeKnowledge.length < 5) {
            addLog('WARN', 'SCIENCE_LAB: Insufficient data points for hypothesis generation.');
            return;
        }
        
        setDiscoveryState({ status: 'HYPOTHESIZING', isLoading: true });
        try {
            // Extract facts from research tasks
            const allFacts = research.tasks.flatMap(t => t.findings?.map(f => f.fact) || []);
            const subset = allFacts.slice(0, 20); // Limit context window
            
            const hyps = await generateHypotheses(subset);
            setDiscoveryState({ hypotheses: hyps, status: 'IDLE', isLoading: false });
            addLog('SUCCESS', `SCIENCE_LAB: Generated ${hyps.length} valid hypotheses.`);
        } catch (e: any) {
            addLog('ERROR', `HYPOTHESIS_FAIL: ${e.message}`);
            setDiscoveryState({ status: 'ERROR', isLoading: false });
        }
    };

    const runSimulation = async (h: ScienceHypothesis) => {
        setDiscoveryState({ 
            activeHypothesisId: h.id,
            status: 'SIMULATING' 
        });
        
        try {
            const facts = research.tasks.flatMap(t => t.findings?.map(f => f.fact) || []).join('\n');
            const result = await simulateExperiment(h, facts);
            
            const updatedHyps = discovery.hypotheses.map(hyp => 
                hyp.id === h.id ? { ...hyp, status: 'VALIDATED' as const, simulationResult: result } : hyp
            );
            
            setDiscoveryState({ 
                hypotheses: updatedHyps,
                status: 'IDLE',
                activeHypothesisId: null
            });
            addLog('SUCCESS', `SCIENCE_LAB: Simulation complete for ${h.id}`);
        } catch (e) {
            setDiscoveryState({ status: 'ERROR' });
        }
    };

    const runSynthesis = async () => {
        setDiscoveryState({ status: 'SYNTHESIZING', isLoading: true });
        try {
            const theory = await generateTheory(discovery.hypotheses);
            setDiscoveryState({ theory, status: 'IDLE', isLoading: false });
        } catch (e) {
            setDiscoveryState({ status: 'ERROR', isLoading: false });
        }
    };

    return (
        <div className="h-full w-full bg-[#030303] flex flex-col relative overflow-hidden font-sans">
            
            {/* LAYER 0: The Super Lattice (Background) */}
            <SuperLattice nodes={activeKnowledge} />

            {/* LAYER 1: Header / HUD */}
            <div className="h-16 border-b border-[#1f1f1f] bg-[#0a0a0a]/80 backdrop-blur-md flex items-center justify-between px-6 z-20 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-[#22d3ee]/10 border border-[#22d3ee] rounded shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                        <FlaskConical className="w-4 h-4 text-[#22d3ee]" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold font-mono uppercase tracking-widest text-white flex items-center gap-2">
                            Science Superlab <span className="text-[#22d3ee] text-[10px]">v2.0</span>
                        </h1>
                        <p className="text-[9px] text-gray-500 font-mono">Autonomous Discovery Engine</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex gap-4 text-[9px] font-mono text-gray-500 border-r border-[#333] pr-4">
                        <div className="flex items-center gap-2">
                            <Database className="w-3 h-3 text-[#f59e0b]" />
                            <span>{activeKnowledge.length} NODES</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Cpu className="w-3 h-3 text-[#9d4edd]" />
                            <span>{activeTasks.length} AGENTS ACTIVE</span>
                        </div>
                    </div>
                    
                    <div className={`flex items-center gap-2 px-3 py-1 rounded border text-[10px] font-mono uppercase tracking-wider backdrop-blur-md
                        ${discovery.status === 'IDLE' ? 'border-[#333] bg-black/50 text-gray-500' : 'border-[#22d3ee] text-[#22d3ee] bg-[#22d3ee]/10'}
                    `}>
                        {discovery.status !== 'IDLE' && <Loader2 className="w-3 h-3 animate-spin" />}
                        {discovery.status}
                    </div>
                </div>
            </div>

            {/* LAYER 2: Glassmorphic Panels */}
            <div className="flex-1 relative z-10 p-6 flex gap-6 overflow-hidden">
                
                {/* LEFT PANE: Intel Uplink (Research Control) */}
                <div className="w-1/3 min-w-[320px] flex flex-col gap-4">
                    
                    {/* Input Console */}
                    <div className="bg-[#050505]/80 backdrop-blur-xl border border-[#333] rounded-xl p-4 shadow-xl flex flex-col gap-3">
                        <label className="text-[9px] font-mono text-[#22d3ee] uppercase tracking-wider flex items-center gap-2">
                            <Search className="w-3 h-3" /> Research Vector
                        </label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleResearchDispatch()}
                                placeholder="Target subject (e.g. 'Graphene Superconductors')"
                                className="flex-1 bg-[#111] border border-[#333] p-2 text-xs text-white font-mono rounded outline-none focus:border-[#22d3ee] focus:bg-black transition-colors"
                            />
                            <button 
                                onClick={() => handleResearchDispatch()}
                                className="p-2 bg-[#22d3ee] text-black hover:bg-[#67e8f9] rounded transition-all shadow-[0_0_10px_rgba(34,211,238,0.3)]"
                            >
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Agent Status Feed */}
                    <div className="flex-1 bg-[#050505]/80 backdrop-blur-xl border border-[#333] rounded-xl overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-3 border-b border-[#333] bg-[#0a0a0a]/50 flex justify-between items-center">
                            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <Network className="w-3 h-3 text-[#f59e0b]" /> Active Agents
                            </span>
                            <span className="text-[9px] text-gray-600 font-mono">NET_OP</span>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                            {activeTasks.length === 0 && (
                                <div className="text-center text-gray-600 mt-10">
                                    <Globe className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-[10px] font-mono">No active probes.</p>
                                </div>
                            )}
                            <AnimatePresence>
                                {activeTasks.map(task => (
                                    <motion.div 
                                        key={task.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="bg-[#111]/80 border border-[#222] p-3 rounded group hover:border-[#f59e0b]/50 transition-colors"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <Loader2 className="w-3 h-3 text-[#f59e0b] animate-spin" />
                                                <span className="text-[10px] font-bold text-white truncate max-w-[150px]">{task.query}</span>
                                            </div>
                                            <button onClick={() => cancelResearchTask(task.id)} className="text-gray-600 hover:text-red-500"><XCircle className="w-3 h-3" /></button>
                                        </div>
                                        <div className="w-full bg-[#333] h-1 rounded-full overflow-hidden mb-2">
                                            <div className="h-full bg-[#f59e0b]" style={{ width: `${task.progress}%` }}></div>
                                        </div>
                                        <div className="text-[9px] font-mono text-gray-500 truncate">
                                            {task.logs[task.logs.length - 1]}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* CENTER SPACE (Graph Visibility) */}
                <div className="flex-1 pointer-events-none">
                    {/* Just transparent space for the graph to shine through */}
                </div>

                {/* RIGHT PANE: Logic Core (Hypothesis & Theory) */}
                <div className="w-1/3 min-w-[350px] flex flex-col gap-4">
                    
                    {/* Theory Terminal */}
                    <div className="flex-1 bg-[#050505]/90 backdrop-blur-xl border border-[#333] rounded-xl overflow-hidden flex flex-col shadow-2xl relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#9d4edd]/5 rounded-full blur-3xl pointer-events-none"></div>
                        
                        <div className="p-3 border-b border-[#333] bg-[#0a0a0a]/50 flex justify-between items-center">
                            <span className="text-[10px] font-mono text-[#9d4edd] uppercase tracking-widest flex items-center gap-2">
                                <BrainCircuit className="w-3 h-3" /> Logic Core
                            </span>
                            <div className="flex gap-2">
                                {discovery.theory && <button className="p-1 hover:text-white text-gray-500"><FileText className="w-3 h-3"/></button>}
                                <button onClick={() => setDiscoveryState({ hypotheses: [], theory: null })} className="p-1 hover:text-white text-gray-500"><RotateCcw className="w-3 h-3"/></button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                            {discovery.theory ? (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                                    <div className="flex items-center gap-2 text-[#9d4edd] mb-2">
                                        <Sparkles className="w-4 h-4" />
                                        <h3 className="text-xs font-bold uppercase tracking-wider">Unified Theory</h3>
                                    </div>
                                    <div className="prose prose-invert prose-xs font-mono text-gray-300 leading-relaxed whitespace-pre-wrap">
                                        {discovery.theory}
                                    </div>
                                </motion.div>
                            ) : discovery.hypotheses.length > 0 ? (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-mono text-gray-500 uppercase">Generated Hypotheses</span>
                                        <button 
                                            onClick={runSynthesis}
                                            disabled={discovery.hypotheses.filter(h => h.status === 'VALIDATED').length === 0}
                                            className="text-[9px] text-black bg-[#9d4edd] px-2 py-1 rounded font-bold uppercase disabled:opacity-50 hover:bg-[#b06bf7] transition-colors"
                                        >
                                            Synthesize
                                        </button>
                                    </div>
                                    <AnimatePresence>
                                        {discovery.hypotheses.map((h, i) => (
                                            <motion.div
                                                key={h.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                className={`p-3 rounded border text-xs font-mono transition-all group
                                                    ${h.status === 'VALIDATED' ? 'bg-[#42be65]/10 border-[#42be65]/30' : 
                                                      h.status === 'TESTING' ? 'bg-[#f59e0b]/10 border-[#f59e0b]/30' : 
                                                      'bg-[#111]/50 border-[#333] hover:border-[#9d4edd]'}
                                                `}
                                            >
                                                <div className="flex justify-between mb-2">
                                                    <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border
                                                        ${h.status === 'VALIDATED' ? 'text-[#42be65] border-[#42be65]/30' : 'text-gray-500 border-gray-700'}
                                                    `}>{h.status}</span>
                                                    <span className="text-[8px] text-gray-600">CONF: {(h.confidence * 100).toFixed(0)}%</span>
                                                </div>
                                                <p className="text-gray-300 leading-relaxed mb-2">{h.statement}</p>
                                                
                                                <div className="flex gap-2">
                                                    {h.status === 'PROPOSED' && (
                                                        <button 
                                                            onClick={() => runSimulation(h)}
                                                            className="flex-1 py-1.5 bg-[#1f1f1f] hover:bg-[#22d3ee] hover:text-black border border-[#333] rounded text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                                                        >
                                                            <Beaker className="w-3 h-3" /> Simulate
                                                        </button>
                                                    )}
                                                    
                                                    {/* Research Branching Feature */}
                                                    <button 
                                                        onClick={() => handleResearchDispatch(`Deep dive into: ${h.statement}`)}
                                                        className="flex-1 py-1.5 bg-[#111] hover:bg-[#9d4edd] hover:text-black border border-[#333] rounded text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all opacity-0 group-hover:opacity-100"
                                                        title="Pivot research into this hypothesis vector"
                                                    >
                                                        <GitBranch className="w-3 h-3" /> Branch Vector
                                                    </button>
                                                </div>
                                                
                                                {h.simulationResult && (
                                                    <div className="mt-2 p-2 bg-black/50 rounded border border-[#222] text-[9px] text-gray-400">
                                                        <span className="text-[#42be65]">RESULT:</span> {h.simulationResult.substring(0, 100)}...
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
                                    <Microscope className="w-12 h-12 mb-4" />
                                    <p className="text-[10px] font-mono uppercase tracking-widest text-center">
                                        Logic Core Idle
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Generation Trigger */}
                        {discovery.hypotheses.length === 0 && (
                            <div className="p-4 border-t border-[#333] bg-[#0a0a0a]/80">
                                <button 
                                    onClick={handleGenerateHypotheses}
                                    disabled={activeKnowledge.length < 3 || discovery.isLoading}
                                    className="w-full py-3 bg-[#9d4edd] hover:bg-[#b06bf7] text-black font-bold font-mono text-xs uppercase tracking-widest rounded transition-all shadow-[0_0_20px_rgba(157,78,221,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {discovery.isLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4" />}
                                    Generate Hypotheses
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DiscoveryLab;
