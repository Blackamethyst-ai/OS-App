/**
 * HardwareEngine - GPU Detail Panel
 *
 * Expanded detail view showing BOM, specs, and price history for selected GPU.
 */

import React from 'react';
import { motion } from 'motion/react';
import { ExternalLink } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import type { GpuWithLiveData } from '../../../../types';

interface GpuDetailPanelProps {
    gpu: GpuWithLiveData;
    onFetchSupplyChain: (componentName: string) => void;
    onOpenProcurement: (gpu: GpuWithLiveData) => void;
}

export const GpuDetailPanel: React.FC<GpuDetailPanelProps> = ({
    gpu,
    onFetchSupplyChain,
    onOpenProcurement
}) => {
    // Generate mock price history data
    const priceHistoryData = React.useMemo(() => {
        const basePrice = gpu.livePrice?.price || gpu.msrp;
        const variance = basePrice * 0.08;
        return Array.from({ length: 20 }, (_, i) => ({
            t: i,
            v: basePrice - variance + Math.random() * variance * 2
        }));
    }, [gpu]);

    return (
        <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 220, opacity: 1 }}
            className="border-t border-white/10 bg-[#050505]/95 backdrop-blur-2xl -mx-6 -mb-6 p-6 flex gap-8 overflow-hidden shadow-2xl relative z-20 shrink-0"
        >
            {/* BOM Specification */}
            <div className="w-[280px] flex flex-col gap-3 shrink-0">
                <h4 className="text-[11px] font-black font-mono text-white uppercase tracking-tight">
                    {gpu.model} // BOM Specification
                </h4>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5">
                    {gpu.bom.map((item, i) => (
                        <div
                            key={i}
                            className="p-2.5 bg-black border border-white/5 rounded-xl flex items-center justify-between group/bom-item hover:border-[#22d3ee]/30 transition-all"
                        >
                            <span className="text-[9px] font-black text-gray-400 uppercase truncate">{item}</span>
                            <button
                                onClick={() => onFetchSupplyChain(item)}
                                className="p-1 text-gray-700 hover:text-[#22d3ee] rounded transition-all"
                                aria-label="View supply chain"
                            >
                                <ExternalLink size={10} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Technical Specs Panel */}
            <div className="w-[200px] flex flex-col gap-2 shrink-0">
                <h4 className="text-[11px] font-black font-mono text-white uppercase tracking-tight mb-1">Technical Specs</h4>
                <div className="grid grid-cols-2 gap-2 text-[8px] font-mono">
                    <div className="p-2 bg-black border border-white/5 rounded-lg">
                        <span className="text-gray-600 block">VRAM</span>
                        <span className="text-white font-bold">{gpu.specs.vram}</span>
                    </div>
                    <div className="p-2 bg-black border border-white/5 rounded-lg">
                        <span className="text-gray-600 block">TDP</span>
                        <span className="text-white font-bold">{gpu.specs.tdp}</span>
                    </div>
                    <div className="p-2 bg-black border border-white/5 rounded-lg">
                        <span className="text-gray-600 block">CORES</span>
                        <span className="text-white font-bold">{gpu.specs.cores}</span>
                    </div>
                    <div className="p-2 bg-black border border-white/5 rounded-lg">
                        <span className="text-gray-600 block">BOOST</span>
                        <span className="text-white font-bold">{gpu.specs.boostClock}</span>
                    </div>
                </div>
                <div className="mt-2 p-2 bg-black border border-white/5 rounded-lg">
                    <span className="text-gray-600 block text-[8px]">MTBF (Est.)</span>
                    <span className="text-[#10b981] font-bold text-sm">{gpu.mtbf.toLocaleString()}h</span>
                </div>
            </div>

            {/* Price History Chart */}
            <div className="flex-1 flex flex-col gap-4">
                <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-4">
                        <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Price History</span>
                        {gpu.livePrice?.source && (
                            <span className="text-[7px] font-mono text-gray-700">Source: {gpu.livePrice.source}</span>
                        )}
                    </div>
                    <button
                        onClick={() => onOpenProcurement(gpu)}
                        className="px-4 py-2 bg-[#10b981] text-black rounded-lg text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg"
                    >
                        Procure Unit
                    </button>
                </div>
                <div className="flex-1 bg-black rounded-2xl border border-white/5 p-4 relative overflow-hidden shadow-inner" style={{ minHeight: 100 }}>
                    <ResponsiveContainer width="100%" height={100} minWidth={1}>
                        <AreaChart data={priceHistoryData}>
                            <Area
                                type="monotone"
                                dataKey="v"
                                stroke="#10b981"
                                fill="rgba(16,185,129,0.08)"
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </motion.div>
    );
};

export default GpuDetailPanel;
