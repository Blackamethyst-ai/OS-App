
import React from 'react';
import { motion } from 'framer-motion';
import { 
    HelpCircle, X, BrainCircuit, Activity, 
    HardDrive, Image as ImageIcon, Cpu, 
    Code, Mic, Settings, Info, Zap, 
    Shield, Network, FlaskConical, Command, History,
    BookOpen, Layers, GitBranch, Globe, Database, Terminal, Workflow
} from 'lucide-react';

interface HelpCenterProps {
    onClose: () => void;
}

const FeatureItem: React.FC<{ icon: any, title: string, description: string, color: string }> = ({ icon: Icon, title, description, color }) => (
    <div className="flex gap-4 p-4 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all group">
        <div className="p-2 rounded-lg shrink-0 transition-transform group-hover:scale-110" style={{ backgroundColor: `${color}15`, color }}>
            <Icon className="w-5 h-5" />
        </div>
        <div>
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-white mb-1 group-hover:text-[var(--accent)] transition-colors" style={{ '--accent': color } as any}>{title}</h3>
            <p className="text-[10px] text-gray-400 font-mono leading-relaxed">{description}</p>
        </div>
    </div>
);

const HelpCenter: React.FC<HelpCenterProps> = ({ onClose }) => {
    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
            onClick={onClose}
        >
            <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-5xl h-[85vh] bg-[#0a0a0a] border border-[#333] rounded-2xl overflow-hidden shadow-2xl flex flex-col relative"
            >
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(157,78,221,0.02)_50%,transparent_75%,transparent)] bg-[length:20px_20px] pointer-events-none"></div>
                
                <div className="h-16 border-b border-[#1f1f1f] bg-[#111] flex items-center justify-between px-8 relative z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        <HelpCircle className="w-5 h-5 text-[#9d4edd]" />
                        <h2 className="text-sm font-bold font-mono uppercase tracking-widest text-white">Sovereign OS Guide // Documentation</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-10 relative z-10 bg-black/40">
                    <div className="mb-12">
                        <div className="flex items-center gap-3 mb-6">
                            <Layers className="w-5 h-5 text-[#9d4edd]" />
                            <h2 className="text-lg font-black font-mono text-white uppercase tracking-[0.2em]">Core Operational Modules</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <FeatureItem icon={Activity} color="#9d4edd" title="Strategy Bridge" description="The Metaventions Stack. Orchestrate DePIN, physical AI, and autonomous finance layers through recursive feedback loops." />
                            <FeatureItem icon={FlaskConical} color="#22d3ee" title="Discovery Lab" description="Scientific synthesis. Transform research facts into hypotheses and unified theories with interactive 3D lattices." />
                            <FeatureItem icon={Cpu} color="#10b981" title="Hardware Core" description="Evolutionary infrastructure. Thermal simulations, supply chain components, and schematic analysis." />
                            <FeatureItem icon={ImageIcon} color="#d946ef" title="Asset Studio" description="Cinematic fabrication. Sequential storyboard generation and photorealistic renders with complex metadata." />
                            <FeatureItem icon={Code} color="#f1c21b" title="Code Studio" description="Autonomous logic. Draft, validate, and auto-heal code using neural feedback loops and persistent sessions." />
                            <FeatureItem icon={Mic} color="#3b82f6" title="Voice Mode" description="Neural uplink. Low-latency conversation with specialized hive agents and real-time screen awareness." />
                            <FeatureItem icon={Workflow} color="#f59e0b" title="Process Logic" description="Visual reasoning. Map distributed systems and generate autopoietic workflow protocols from ingested data." />
                            <FeatureItem icon={HardDrive} color="#6366f1" title="Memory Core" description="Neural Vault. Persistent storage for artifacts with automatic AI indexing and taxonomy generation." />
                            <FeatureItem icon={GitBranch} color="#ec4899" title="Bicameral Swarm" description="Consensus engine. High-velocity verification of complex goals through specialized agent voting cycles." />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="p-8 bg-[#050505] border border-[#222] rounded-2xl relative overflow-hidden group hover:border-[#9d4edd]/50 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Zap className="w-24 h-24 text-white" />
                            </div>
                            <div className="flex items-center gap-3 mb-6">
                                <Zap className="w-5 h-5 text-[#f1c21b]" />
                                <h3 className="text-sm font-bold font-mono uppercase text-white tracking-widest">Global Keyboard Protocols</h3>
                            </div>
                            <ul className="space-y-4 font-mono text-xs">
                                <li className="flex justify-between items-center text-gray-400 group/key">
                                    <span>Command Palette</span>
                                    <kbd className="bg-[#222] px-2 py-1 rounded border border-[#333] text-white shadow-lg">CMD + K</kbd>
                                </li>
                                <li className="flex justify-between items-center text-gray-400 group/key">
                                    <span>System Terminal (Quake Mode)</span>
                                    <kbd className="bg-[#222] px-2 py-1 rounded border border-[#333] text-white shadow-lg">~</kbd>
                                </li>
                                <li className="flex justify-between items-center text-gray-400 group/key">
                                    <span>Global System Search</span>
                                    <kbd className="bg-[#222] px-2 py-1 rounded border border-[#333] text-white shadow-lg">CMD + S</kbd>
                                </li>
                                <li className="flex justify-between items-center text-gray-400 group/key">
                                    <span>Toggle Voice Uplink</span>
                                    <kbd className="bg-[#222] px-2 py-1 rounded border border-[#333] text-white shadow-lg">CMD + SHIFT + V</kbd>
                                </li>
                                <li className="flex justify-between items-center text-gray-400 group/key">
                                    <span>Open Documentation</span>
                                    <kbd className="bg-[#222] px-2 py-1 rounded border border-[#333] text-white shadow-lg">F1</kbd>
                                </li>
                            </ul>
                        </div>

                        <div className="p-8 bg-[#050505] border border-[#222] rounded-2xl relative overflow-hidden group hover:border-[#22d3ee]/50 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Terminal className="w-24 h-24 text-white" />
                            </div>
                            <div className="flex items-center gap-3 mb-6">
                                <Info className="w-5 h-5 text-[#22d3ee]" />
                                <h3 className="text-sm font-bold font-mono uppercase text-white tracking-widest">Neural Integration Guidance</h3>
                            </div>
                            <p className="text-[10px] text-gray-400 font-mono leading-relaxed mb-6">
                                The Voice Core (Zephyr engine) maintains a high-fidelity mental model of the entire application. It can see your screen, navigate to any sector, and trigger local UI actions using its dynamic visual cortex.
                            </p>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 p-2 bg-white/5 rounded border border-white/10 text-[9px] font-mono text-gray-300">
                                    <Activity className="w-3.5 h-3.5 text-[#9d4edd]" />
                                    <span>"Analyze the current hardware thermal map"</span>
                                </div>
                                <div className="flex items-center gap-3 p-2 bg-white/5 rounded border border-white/10 text-[9px] font-mono text-gray-300">
                                    <Command className="w-3.5 h-3.5 text-[#22d3ee]" />
                                    <span>"Switch to light theme and navigate to dashboard"</span>
                                </div>
                                <div className="flex items-center gap-3 p-2 bg-white/5 rounded border border-white/10 text-[9px] font-mono text-gray-300">
                                    <Code className="w-3.5 h-3.5 text-[#f1c21b]" />
                                    <span>"Draft a rust backend for the sovereign vault"</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-14 bg-[#050505] border-t border-[#1f1f1f] px-8 flex items-center justify-between text-[10px] font-mono text-gray-600 shrink-0">
                    <div className="flex items-center gap-4">
                        <span className="uppercase tracking-[0.3em]">Sovereign Architecture OS // Proprietary Interface</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="uppercase tracking-widest">HIVE_LINK_OK</span>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default HelpCenter;
