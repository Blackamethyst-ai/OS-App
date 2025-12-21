
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToolResult } from '../types';
import { Table, BarChart3, Info, ExternalLink, X, Database, Zap, Activity } from 'lucide-react';

interface DynamicWidgetProps {
    result: ToolResult | null;
    onClose: () => void;
}

/**
 * GEN_UI ENGINE
 * Automatically renders a specific interface based on the ToolResult hint.
 */
const DynamicWidget: React.FC<DynamicWidgetProps> = ({ result, onClose }) => {
    if (!result) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-[#0a0a0a]/90 backdrop-blur-2xl border border-[#333] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[600px] w-full"
            >
                {/* Header */}
                <div className="h-12 border-b border-[#1f1f1f] flex items-center justify-between px-6 bg-[#111]">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-[#9d4edd]/10 rounded-lg text-[#9d4edd]">
                            {result.uiHint === 'TABLE' ? <Database size={14} /> : 
                             result.uiHint === 'STAT' ? <Zap size={14} /> : 
                             <Activity size={14} />}
                        </div>
                        <span className="text-[10px] font-black font-mono text-white uppercase tracking-widest">
                            Output Matrix // {result.toolName}
                        </span>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Content Renderers */}
                <div className="flex-1 overflow-auto p-6 custom-scrollbar">
                    {result.uiHint === 'TABLE' && Array.isArray(result.data) && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left font-mono text-[11px] border-collapse">
                                <thead>
                                    <tr className="text-gray-500 border-b border-[#1f1f1f]">
                                        {Object.keys(result.data[0]).map(key => (
                                            <th key={key} className="py-2 px-3 uppercase tracking-tighter">{key}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="text-gray-300">
                                    {result.data.map((row, i) => (
                                        <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            {Object.values(row).map((val: any, j) => (
                                                <td key={j} className="py-2.5 px-3 truncate max-w-[200px]">{String(val)}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {result.uiHint === 'STAT' && (
                        <div className="grid grid-cols-2 gap-4">
                            {Object.entries(result.data).map(([key, val]) => (
                                <div key={key} className="bg-black/40 border border-[#1f1f1f] p-4 rounded-xl">
                                    <div className="text-[8px] text-gray-500 uppercase font-mono mb-1">{key}</div>
                                    <div className="text-xl font-black text-white font-mono">{String(val)}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {result.uiHint === 'MESSAGE' && (
                        <div className="p-4 bg-blue-900/10 border border-blue-900/30 rounded-xl text-blue-100 text-xs font-mono">
                            {result.data.message}
                        </div>
                    )}

                    {!result.uiHint && (
                        <pre className="text-[10px] font-mono text-gray-400 bg-black/60 p-4 rounded-xl">
                            {JSON.stringify(result.data, null, 2)}
                        </pre>
                    )}
                </div>

                {/* Footer */}
                <div className="h-8 border-t border-[#1f1f1f] bg-black/40 flex items-center justify-between px-6 text-[8px] font-mono text-gray-600">
                    <div className="flex gap-4">
                        <span>DATA_GROUNDING: LOCAL_ENCLAVE</span>
                        <span>AUTH: ROOT_VALID</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        SYNC_OK
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default DynamicWidget;
