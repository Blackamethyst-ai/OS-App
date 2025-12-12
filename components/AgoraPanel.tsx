import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SyntheticPersona, DebateTurn, SimulationReport, FileData } from '../types';
import { generatePersonas, runDebateTurn, synthesizeReport } from '../services/agoraService';
import { Users, Play, Square, Loader2, MessageSquare, AlertCircle, CheckCircle } from 'lucide-react';

interface AgoraPanelProps {
    artifact: FileData;
}

const AgoraPanel: React.FC<AgoraPanelProps> = ({ artifact }) => {
    const [status, setStatus] = useState<'IDLE' | 'GEN_PERSONAS' | 'DEBATING' | 'SYNTHESIZING' | 'COMPLETE'>('IDLE');
    const [personas, setPersonas] = useState<SyntheticPersona[]>([]);
    const [history, setHistory] = useState<DebateTurn[]>([]);
    const [report, setReport] = useState<SimulationReport | null>(null);
    const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll chat
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [history]);

    const startSimulation = async () => {
        setStatus('GEN_PERSONAS');
        try {
            // 1. Create Agents
            const agents = await generatePersonas(artifact);
            setPersonas(agents);
            
            // 2. Start Loop
            setStatus('DEBATING');
            let currentHistory: DebateTurn[] = [];
            
            // Run 6 turns (2 rounds for 3 agents)
            for (let i = 0; i < 6; i++) {
                const speaker = agents[i % agents.length];
                setActiveSpeakerId(speaker.id);
                
                // Add artificial delay for "thinking" visualization
                await new Promise(r => setTimeout(r, 1500)); 
                
                const turn = await runDebateTurn(speaker, currentHistory, artifact);
                currentHistory = [...currentHistory, turn];
                setHistory(prev => [...prev, turn]);
            }
            
            setActiveSpeakerId(null);

            // 3. Synthesis
            setStatus('SYNTHESIZING');
            const finalReport = await synthesizeReport(currentHistory);
            setReport(finalReport);
            setStatus('COMPLETE');

        } catch (e) {
            console.error(e);
            setStatus('IDLE'); // Reset on fail
        }
    };

    return (
        <div className="flex h-full bg-[#050505]">
            {/* LEFT: VISUALIZER (The Table) */}
            <div className="w-1/2 flex flex-col items-center justify-center relative border-r border-[#1f1f1f] p-8">
                {status === 'IDLE' ? (
                    <div className="text-center">
                        <Users className="w-16 h-16 text-gray-700 mb-4 mx-auto" />
                        <h2 className="text-xl font-mono text-white mb-2 uppercase">Agora Simulation</h2>
                        <p className="text-xs text-gray-500 max-w-sm mx-auto mb-8">
                            Initialize synthetic focus group. Three autonomous personas will debate the viability of this artifact.
                        </p>
                        <button 
                            onClick={startSimulation}
                            className="px-6 py-3 bg-[#9d4edd] text-black font-bold font-mono uppercase tracking-widest hover:bg-[#b06bf7] transition-all"
                        >
                            Initialize Agents
                        </button>
                    </div>
                ) : (
                    <div className="relative w-full h-full flex items-center justify-center">
                        {/* Central Table */}
                        <div className="w-32 h-32 rounded-full border-2 border-[#333] flex items-center justify-center relative bg-[#0a0a0a]">
                            <div className="text-center">
                                <div className="text-[10px] font-mono text-gray-500 uppercase">Status</div>
                                <div className="text-xs font-bold text-[#9d4edd] animate-pulse">{status}</div>
                            </div>
                        </div>

                        {/* Agents Orbiting */}
                        {personas.map((p, i) => {
                            const angle = (i / personas.length) * 2 * Math.PI - Math.PI / 2;
                            const radius = 140;
                            const x = Math.cos(angle) * radius;
                            const y = Math.sin(angle) * radius;
                            const isActive = activeSpeakerId === p.id;

                            return (
                                <motion.div
                                    key={p.id}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ 
                                        scale: isActive ? 1.2 : 1, 
                                        opacity: 1,
                                        x, y
                                    }}
                                    className="absolute w-20 h-20 flex flex-col items-center justify-center"
                                >
                                    <div 
                                        className={`w-12 h-12 rounded-full border-2 flex items-center justify-center bg-[#111] transition-all duration-300
                                            ${isActive ? 'shadow-[0_0_20px_var(--avatar-color)]' : 'border-gray-700'}
                                        `}
                                        style={{ 
                                            borderColor: isActive ? p.avatar_color : undefined,
                                            '--avatar-color': p.avatar_color
                                        } as any}
                                    >
                                        <span className="text-xs font-bold" style={{ color: p.avatar_color }}>
                                            {p.name.charAt(0)}
                                        </span>
                                    </div>
                                    <span className="mt-2 text-[9px] font-mono text-gray-400 uppercase bg-black px-1 rounded">
                                        {p.role}
                                    </span>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* RIGHT: TRANSCRIPT & REPORT */}
            <div className="w-1/2 flex flex-col bg-[#080808]">
                {/* Header */}
                <div className="h-12 border-b border-[#1f1f1f] flex items-center px-4 bg-[#0a0a0a]">
                    <MessageSquare className="w-4 h-4 text-gray-500 mr-2" />
                    <span className="text-xs font-mono uppercase text-gray-400">Live Transcript</span>
                </div>

                {/* Chat Log */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3" ref={scrollRef}>
                    {history.map((turn) => {
                        const persona = personas.find(p => p.id === turn.personaId);
                        return (
                            <motion.div 
                                key={turn.id}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="text-xs font-mono"
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold" style={{ color: persona?.avatar_color }}>
                                        {persona?.name}
                                    </span>
                                    <span className="text-[9px] text-gray-600">
                                        {persona?.role}
                                    </span>
                                </div>
                                <div className="bg-[#111] border border-[#222] p-2 rounded text-gray-300 leading-relaxed">
                                    {turn.text}
                                </div>
                            </motion.div>
                        );
                    })}
                    {status === 'DEBATING' && (
                        <div className="flex items-center gap-2 text-xs text-gray-500 animate-pulse mt-4">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Agents deliberating...
                        </div>
                    )}
                </div>

                {/* Report Card (Appears at end) */}
                {report && (
                    <motion.div 
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        className="h-1/2 border-t border-[#1f1f1f] bg-[#0c0c0c] p-6 overflow-y-auto"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold font-mono text-white uppercase">Viability Report</h3>
                            <div className={`text-xl font-bold font-mono ${report.viabilityScore > 70 ? 'text-[#42be65]' : 'text-[#f59e0b]'}`}>
                                {report.viabilityScore}/100
                            </div>
                        </div>
                        
                        <div className="space-y-4 text-xs font-mono text-gray-400">
                            <div>
                                <div className="text-[#9d4edd] uppercase mb-1">Consensus</div>
                                <p>{report.consensus}</p>
                            </div>
                            
                            <div>
                                <div className="text-red-400 uppercase mb-1 flex items-center gap-2">
                                    <AlertCircle className="w-3 h-3" /> Friction Points
                                </div>
                                <ul className="list-disc pl-4 space-y-1">
                                    {report.majorFrictionPoints.map((pt, i) => <li key={i}>{pt}</li>)}
                                </ul>
                            </div>

                            <div>
                                <div className="text-[#42be65] uppercase mb-1 flex items-center gap-2">
                                    <CheckCircle className="w-3 h-3" /> Recommended Fixes
                                </div>
                                <ul className="list-disc pl-4 space-y-1">
                                    {report.actionableFixes.map((pt, i) => <li key={i}>{pt}</li>)}
                                </ul>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default AgoraPanel;