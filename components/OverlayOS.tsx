import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Image as ImageIcon, Code, FileText, X, Maximize2, Trash2, Cpu, Activity, Download, Copy, ExternalLink, Zap, BrainCircuit, Radio, Loader2, GitBranch } from 'lucide-react';

// --- SYSTEM TERMINAL ---
const SystemTerminal: React.FC = () => {
    const { system, toggleTerminal, addLog, research, voice, bicameral, process, codeStudio, hardware } = useAppStore();
    const bottomRef = useRef<HTMLDivElement>(null);
    const [cmd, setCmd] = useState('');

    useEffect(() => {
        if (system.isTerminalOpen && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [system.logs, system.isTerminalOpen]);

    const handleCommand = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            const trimmed = cmd.trim();
            addLog('SYSTEM', `> ${trimmed}`);
            setCmd('');
            
            if (trimmed === 'clear') {
                // Not implemented in store for safety, but we could
            } else if (trimmed === 'help') {
                addLog('INFO', 'Available: help, clear, status, reboot');
            } else if (trimmed === 'status') {
                addLog('INFO', 'KERNEL: STABLE | UPTIME: 99.9%');
            }
        }
    };

    // Calculate Active Processes for "HTOP" View
    const activeResearch = research.tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'FAILED');
    const isSwarming = bicameral.isSwarming || bicameral.isPlanning;
    const isProcessing = process.isLoading;
    const isCompiling = codeStudio.isLoading || codeStudio.isExecuting;
    const isScanning = hardware.isLoading;

    return (
        <AnimatePresence>
            {system.isTerminalOpen && (
                <motion.div
                    initial={{ y: '-100%', opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: '-100%', opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                    className="fixed top-0 left-0 right-0 h-96 bg-[#050505]/95 backdrop-blur-md border-b border-[#9d4edd] z-[9999] shadow-2xl font-mono text-xs flex flex-col"
                >
                    {/* Header */}
                    <div className="h-8 bg-[#111] border-b border-[#333] flex items-center justify-between px-4 shrink-0">
                        <div className="flex items-center gap-2 text-[#9d4edd]">
                            <Terminal className="w-4 h-4" />
                            <span className="uppercase tracking-widest font-bold">System Mind // ROOT ACCESS</span>
                        </div>
                        <button onClick={() => toggleTerminal(false)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
                    </div>

                    {/* Process Monitor (HTOP Style) */}
                    <div className="bg-[#0a0a0a] border-b border-[#333] p-2 flex gap-4 shrink-0 overflow-x-auto">
                        {/* Voice Core Status */}
                        <div className={`flex items-center gap-2 px-3 py-1 rounded border ${voice.isActive ? 'border-[#22d3ee]/50 bg-[#22d3ee]/10 text-[#22d3ee]' : 'border-[#333] text-gray-500'}`}>
                            <Radio className={`w-3 h-3 ${voice.isActive ? 'animate-pulse' : ''}`} />
                            <span className="font-bold">VOICE_CORE: {voice.isActive ? 'ONLINE' : 'STANDBY'}</span>
                        </div>

                        {/* Research Agents */}
                        {activeResearch.length > 0 ? (
                            activeResearch.map(task => (
                                <div key={task.id} className="flex items-center gap-2 px-3 py-1 rounded border border-[#9d4edd]/50 bg-[#9d4edd]/10 text-[#9d4edd]">
                                    <BrainCircuit className="w-3 h-3 animate-spin" />
                                    <span className="font-bold truncate max-w-[150px]">RSRCH: {task.query}</span>
                                    <span className="text-[9px] opacity-70">{task.progress}%</span>
                                </div>
                            ))
                        ) : (
                            <div className="flex items-center gap-2 px-3 py-1 rounded border border-[#333] text-gray-600">
                                <BrainCircuit className="w-3 h-3" />
                                <span>RSRCH: IDLE</span>
                            </div>
                        )}

                        {/* Swarm Engine */}
                        {isSwarming && (
                            <div className="flex items-center gap-2 px-3 py-1 rounded border border-[#f59e0b]/50 bg-[#f59e0b]/10 text-[#f59e0b]">
                                <GitBranch className="w-3 h-3 animate-pulse" />
                                <span className="font-bold">SWARM: ACTIVE</span>
                            </div>
                        )}

                        {/* Compiler */}
                        {isCompiling && (
                            <div className="flex items-center gap-2 px-3 py-1 rounded border border-[#42be65]/50 bg-[#42be65]/10 text-[#42be65]">
                                <Code className="w-3 h-3 animate-pulse" />
                                <span className="font-bold">COMPILER: BUSY</span>
                            </div>
                        )}
                        
                        {/* Hardware */}
                        {isScanning && (
                            <div className="flex items-center gap-2 px-3 py-1 rounded border border-blue-500/50 bg-blue-500/10 text-blue-400">
                                <Cpu className="w-3 h-3 animate-spin" />
                                <span className="font-bold">HW_SCAN: RUNNING</span>
                            </div>
                        )}
                    </div>

                    {/* Logs */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar text-gray-300 font-mono text-[11px]">
                        {system.logs.map((log: any) => (
                            <div key={log.id} className="flex gap-3 hover:bg-[#111] transition-colors px-1">
                                <span className="text-gray-600 shrink-0">[{log.timestamp}]</span>
                                <span className={`shrink-0 font-bold w-16 text-right ${
                                    log.level === 'ERROR' ? 'text-red-500' : 
                                    log.level === 'WARN' ? 'text-yellow-500' : 
                                    log.level === 'SUCCESS' ? 'text-[#42be65]' :
                                    log.level === 'SYSTEM' ? 'text-[#9d4edd]' : 'text-blue-400'
                                }`}>{log.level}</span>
                                <span className="text-gray-500">::</span>
                                <span className={`break-all ${log.level === 'ERROR' ? 'text-red-300' : 'text-gray-300'}`}>
                                    {log.message}
                                </span>
                            </div>
                        ))}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="h-10 border-t border-[#333] flex items-center px-4 gap-2 bg-black">
                        <span className="text-[#9d4edd] font-bold animate-pulse">$</span>
                        <input 
                            type="text" 
                            value={cmd}
                            onChange={e => setCmd(e.target.value)}
                            onKeyDown={handleCommand}
                            className="flex-1 bg-transparent outline-none text-white font-mono placeholder:text-gray-700"
                            placeholder="Enter system command..."
                            autoFocus
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// --- QUANTUM DOCK ---
const QuantumDock: React.FC = () => {
    const { system, removeDockItem } = useAppStore();
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [previewItem, setPreviewItem] = useState<any | null>(null);

    const getIcon = (type: string) => {
        switch(type) {
            case 'IMAGE': return <ImageIcon className="w-5 h-5 text-pink-400" />;
            case 'CODE': return <Code className="w-5 h-5 text-yellow-400" />;
            case 'ANALYSIS': return <Activity className="w-5 h-5 text-green-400" />;
            default: return <FileText className="w-5 h-5 text-blue-400" />;
        }
    };

    if (system.dockItems.length === 0) return null;

    return (
        <>
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[50] flex items-end gap-3 px-4 py-3 bg-[#0a0a0a]/80 backdrop-blur-xl border border-[#333] rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                {system.dockItems.map((item: any) => (
                    <motion.div
                        key={item.id}
                        layout
                        onMouseEnter={() => setHoveredId(item.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => setPreviewItem(item)}
                        initial={{ opacity: 0, scale: 0, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        whileHover={{ scale: 1.2, y: -10, margin: "0 10px" }}
                        className="relative group cursor-pointer"
                    >
                        {/* Tooltip */}
                        <AnimatePresence>
                            {hoveredId === item.id && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: -45 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap bg-black border border-[#333] px-2 py-1 rounded text-[10px] font-mono text-white pointer-events-none"
                                >
                                    {item.label}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Icon */}
                        <div className="w-12 h-12 rounded-xl bg-[#1f1f1f] border border-[#333] group-hover:border-[#9d4edd] flex items-center justify-center shadow-lg transition-colors relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            {getIcon(item.type)}
                        </div>

                        {/* Remove Badge */}
                        <button 
                            onClick={(e) => { e.stopPropagation(); removeDockItem(item.id); }}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-black opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X size={10} />
                        </button>
                    </motion.div>
                ))}
            </div>

            {/* Preview Modal */}
            <AnimatePresence>
                {previewItem && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-12" onClick={() => setPreviewItem(null)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#0a0a0a] border border-[#333] rounded-xl overflow-hidden shadow-2xl max-w-4xl max-h-full flex flex-col"
                        >
                            <div className="h-12 border-b border-[#1f1f1f] flex items-center justify-between px-6 bg-[#111]">
                                <div className="flex items-center gap-2">
                                    {getIcon(previewItem.type)}
                                    <span className="text-sm font-bold font-mono text-white">{previewItem.label}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {previewItem.type === 'CODE' && (
                                        <button 
                                            onClick={() => navigator.clipboard.writeText(previewItem.content)}
                                            className="p-2 hover:bg-[#222] rounded text-gray-400 hover:text-white"
                                            title="Copy Code"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    )}
                                    {previewItem.type === 'IMAGE' && (
                                        <a 
                                            href={previewItem.content} 
                                            download="artifact.png"
                                            className="p-2 hover:bg-[#222] rounded text-gray-400 hover:text-white"
                                            title="Download"
                                        >
                                            <Download className="w-4 h-4" />
                                        </a>
                                    )}
                                    <button onClick={() => setPreviewItem(null)} className="p-2 hover:bg-red-900/50 rounded text-gray-400 hover:text-red-500">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-0 overflow-auto bg-black flex items-center justify-center min-h-[300px]">
                                {previewItem.type === 'IMAGE' ? (
                                    <img src={previewItem.content} className="max-w-full max-h-[70vh]" />
                                ) : previewItem.type === 'CODE' ? (
                                    <pre className="p-6 font-mono text-xs text-gray-300 whitespace-pre-wrap">
                                        {previewItem.content}
                                    </pre>
                                ) : (
                                    <div className="p-6 text-gray-400 font-mono text-sm">
                                        {JSON.stringify(previewItem.content, null, 2)}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

// --- GLOBAL OVERLAY MANAGER ---
const OverlayOS: React.FC = () => {
    const { addDockItem, imageGen, codeStudio, hardware, toggleTerminal } = useAppStore();
    
    // Global Keyboard Listeners
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === '`' || e.key === '~') {
                e.preventDefault();
                toggleTerminal();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggleTerminal]);

    // Watchers for Auto-Docking Artifacts
    // 1. Image Gen
    useEffect(() => {
        if (imageGen.generatedImage) {
            const promptStr = String(imageGen.generatedImage.prompt || 'UNNAMED_ASSET');
            addDockItem({
                id: `img-${Date.now()}`,
                type: 'IMAGE',
                label: `IMG: ${promptStr.substring(0, 10)}...`,
                content: imageGen.generatedImage.url,
                timestamp: Date.now()
            });
        }
    }, [imageGen.generatedImage, addDockItem]);

    // 2. Code Gen
    useEffect(() => {
        if (codeStudio.generatedCode) {
            addDockItem({
                id: `code-${Date.now()}`,
                type: 'CODE',
                label: `CODE: ${codeStudio.language || 'script'}`,
                content: codeStudio.generatedCode,
                timestamp: Date.now()
            });
        }
    }, [codeStudio.generatedCode, codeStudio.language, addDockItem]);

    return (
        <>
            <SystemTerminal />
            <QuantumDock />
        </>
    );
};

export default OverlayOS;