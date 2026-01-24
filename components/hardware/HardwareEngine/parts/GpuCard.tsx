/**
 * HardwareEngine - GPU Card
 *
 * Individual GPU component card for the procurement grid.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Box, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import type { GpuWithLiveData } from '../../../../types';

interface GpuCardProps {
    gpu: GpuWithLiveData;
    isSelected: boolean;
    isFetchingPrice: boolean;
    onSelect: (gpu: GpuWithLiveData) => void;
}

export const GpuCard: React.FC<GpuCardProps> = ({
    gpu,
    isSelected,
    isFetchingPrice,
    onSelect
}) => {
    const displayPrice = gpu.livePrice?.price || gpu.msrp;
    const stockStatus = gpu.livePrice?.stock || (gpu.era === 'SILICON' ? 'IN_STOCK' : 'LIMITED');
    const priceTrend = gpu.livePrice?.trend || 0;

    return (
        <motion.div
            onClick={() => onSelect(gpu)}
            className={`p-5 bg-[#0a0a0a] border rounded-2xl cursor-pointer transition-all relative overflow-hidden group/gpu ${isSelected ? 'border-[#22d3ee] shadow-xl' : 'border-white/5 hover:border-white/15'}`}
        >
            <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-white/5 rounded-xl text-gray-600 group-hover/gpu:text-[#22d3ee] transition-all">
                        <Box size={18} />
                    </div>
                    {gpu.era === 'SILICON' && (
                        <span className="text-[7px] font-mono text-gray-700 uppercase tracking-widest px-2 py-0.5 bg-white/5 rounded">
                            {gpu.tier}
                        </span>
                    )}
                </div>
                <div className={`px-3 py-1 rounded-md text-[8px] font-medium font-mono uppercase tracking-widest border transition-colors ${
                    stockStatus === 'IN_STOCK'
                        ? 'text-[#10b981]/80 bg-[#10b981]/5 border-[#10b981]/20'
                        : stockStatus === 'LIMITED'
                            ? 'text-gray-400 bg-white/5 border-white/10'
                            : 'text-gray-500 bg-white/[0.02] border-white/5'
                }`}>
                    {stockStatus === 'IN_STOCK' ? 'Available' : stockStatus === 'LIMITED' ? 'Low Stock' : 'Unavailable'}
                </div>
            </div>

            <h3 className="text-[13px] font-black text-white uppercase font-mono tracking-tighter mb-1">{gpu.model}</h3>
            <p className="text-[8px] text-gray-600 font-mono uppercase tracking-widest mb-1">{gpu.manufacturer} // {gpu.arch}</p>
            <p className="text-[7px] text-gray-700 font-mono mb-6">{gpu.specs.vram} {gpu.specs.vramType} • {gpu.specs.tdp}</p>

            <div className="flex justify-between items-end border-t border-white/5 pt-4">
                <div>
                    <span className="text-[7px] font-mono text-gray-600 uppercase tracking-widest block mb-1">
                        {gpu.livePrice ? 'Market Price' : 'MSRP'}
                    </span>
                    <div className="flex items-center gap-2">
                        <span className="text-base font-black font-mono text-[#10b981] tracking-tighter">
                            ${displayPrice.toLocaleString()}
                        </span>
                        {priceTrend !== 0 && (
                            <span className={`text-[9px] font-mono flex items-center gap-0.5 ${priceTrend > 0 ? 'text-amber-400/70' : 'text-[#10b981]/70'}`}>
                                {priceTrend > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                {Math.abs(priceTrend).toFixed(1)}%
                            </span>
                        )}
                    </div>
                </div>
                {isFetchingPrice && isSelected && (
                    <Loader2 size={14} className="text-[#22d3ee] animate-spin" />
                )}
            </div>
        </motion.div>
    );
};

export default GpuCard;
