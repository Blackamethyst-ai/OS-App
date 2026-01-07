import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, Shield, Cpu, Zap, Radio, Globe,
    ArrowRight, Loader2, AlertTriangle, CheckCircle2,
    Layers, Terminal, Play
} from 'lucide-react';
import { useAppStore } from '../store';
import { metaventionService, LayerAnalysis } from '../services/metaventionService';
import { audio } from '../services/audioService';
import { cn } from '../utils/cn';

const LAYERS = [
    { id: 'LAYER_DEPIN', label: 'Physical Infra', icon: Globe, color: '#f59e0b' },
    { id: 'LAYER_AI', label: 'Swarm Intel', icon: Cpu, color: '#9d4edd' },
    { id: 'LAYER_FINANCE', label: 'Capital Flow', icon: Activity, color: '#10b981' }
];

export const StrategicConsole: React.FC = () => {
    const { actions, agents } = useAppStore();
    const [selectedLayer, setSelectedLayer] = useState<string>(LAYERS[0].id);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<LayerAnalysis | null>(null);

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        setAnalysis(null);
        actions.addLog('SYSTEM', `LAYER_SCAN: Initiating deep probe on [${selectedLayer}]...`);
        audio.playClick();

        try {
            const result = await metaventionService.analyzeLayer(selectedLayer);
            setAnalysis(result);
            actions.addLog('SUCCESS', `LAYER_SCAN: Analysis complete. Integrity: ${result.integrity}%`);
            audio.playSuccess();
        } catch (e) {
            actions.addLog('ERROR', 'LAYER_SCAN: Probe failed.');
            audio.playError();
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleGenerateProtocol = async () => {
        if (!analysis) return;
        setIsAnalyzing(true);
        actions.addLog('SYSTEM', 'PROTOCOL_SYNTHESIS: Generative strategy formulation active...');

        try {
            const protocol = await metaventionService.generateStrategy(selectedLayer, JSON.stringify(analysis));
            actions.addLog('SUCCESS', `PROTOCOL_SYNTHESIS: [${protocol.title}] ready for deployment.`);

            // Auto-deploy to swarm
            if (protocol.steps && protocol.steps.length > 0) {
                const activeNodes = agents.activeAgents.filter(a => a.status !== 'SLEEPING');
                if (activeNodes.length > 0) {
                    protocol.steps.forEach((step, i) => {
                        const agent = activeNodes[i % activeNodes.length];
                        const newTask = {
                            id: `m-task-${Date.now()}-${i}`,
                            description: `STRATUM_OP: ${step}`,
                            instruction: step,
                            isolated_input: '',
                            weight: 2,
                            status: 'PENDING' as const
                        };
                        // Direct store mutation via action
                        actions.updateAgent(agent.id, { tasks: [...agent.tasks, newTask] });
                    });
                    actions.addLog('INFO', `SWARM_SYNC: ${protocol.steps.length} vectors distributed to neural lattice.`);
                }
            }

            setAnalysis(null); // Reset after generation
            audio.playSuccess();
        } catch (e) {
            audio.playError();
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="crystalline rounded-[2.5rem] p-6 shadow-2xl flex flex-col gap-6 group/console invisible-glass border border-white/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.02)_0%,transparent_70%)] pointer-events-none" />
            <div className="flex items-center justify-between border-b border-white/5 pb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <Terminal size={14} className="text-[#22d3ee] animate-pulse" />
                    <span className="text-[10px] font-black font-mono text-white uppercase tracking-[0.3em]">Command Deck</span>
                </div>
                <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                </div>
            </div>

            {/* Layer Selector */}
            <div className="space-y-2">
                <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest block pl-1">Target Stratum</span>
                <div className="flex flex-col gap-1">
                    {LAYERS.map(layer => (
                        <button
                            key={layer.id}
                            onClick={() => { setSelectedLayer(layer.id); audio.playClick(); }}
                            className={cn(
                                "flex items-center gap-3 p-3 rounded-xl transition-all border text-left",
                                selectedLayer === layer.id
                                    ? "bg-white/10 border-white/20 text-white"
                                    : "bg-transparent border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5"
                            )}
                        >
                            <layer.icon size={14} style={{ color: selectedLayer === layer.id ? layer.color : undefined }} />
                            <span className="text-[9px] font-black font-mono uppercase tracking-widest">{layer.label}</span>
                            {selectedLayer === layer.id && <ArrowRight size={10} className="ml-auto opacity-50" />}
                        </button>
                    ))}
                </div>
            </div>

            {/* Analysis View */}
            <AnimatePresence mode="wait">
                {analysis ? (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4"
                    >
                        <div className="p-4 bg-black/40 rounded-xl border border-white/5 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-[9px] text-gray-400 font-mono uppercase">Integrity</span>
                                <span className={cn(
                                    "text-lg font-black font-mono",
                                    analysis.integrity > 80 ? "text-[#10b981]" : "text-[#ef4444]"
                                )}>{analysis.integrity}%</span>
                            </div>

                            <div className="space-y-1">
                                {analysis.threats.slice(0, 2).map((t, i) => (
                                    <div key={i} className="flex items-center gap-2 text-[8px] text-[#ef4444] font-mono uppercase">
                                        <AlertTriangle size={8} /> {t}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleGenerateProtocol}
                            disabled={isAnalyzing}
                            className="w-full py-3 bg-[#22d3ee] hover:bg-[#18E6FF] text-black rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                            Deploy Counter-Strategy
                        </button>
                    </motion.div>
                ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <button
                            onClick={handleAnalyze}
                            disabled={isAnalyzing}
                            className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 group"
                        >
                            {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Activity size={12} className="group-hover:text-[#9d4edd] transition-colors" />}
                            Run Stratum Diagnostics
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
