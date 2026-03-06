/**
 * HardwareEngine - Telemetry Sidebar
 *
 * Right sidebar with hardware parameters, CapEx management, thermal display, and AI analysis tools.
 */

import React from 'react';
import {
    SlidersHorizontal, DollarSign, Thermometer, FlaskConical,
    Loader2, Microscope, FileText, Target
} from 'lucide-react';
import type { GpuWithLiveData } from '../../../../types';
import { PerformanceMixer, NeuralThermalGrid } from './effects';

interface FinTelemetry {
    totalBomCost: number;
    roiProjection: number;
}

interface TelemetrySidebarProps {
    // Hardware parameters
    clockSpeed: number;
    voltage: number;
    fanSpeed: number;
    onClockSpeedChange: (value: number) => void;
    onVoltageChange: (value: number) => void;
    onFanSpeedChange: (value: number) => void;
    eraColor: string;

    // Financial
    finTelemetry: FinTelemetry;
    selectedGpu: GpuWithLiveData | null;
    maintenanceEst: number;

    // Thermal
    stressLevel: number;
    powerDraw: string;
    mtbf: number;

    // AI Analysis state
    isResearchingComponents: boolean;
    isGeneratingManifest: boolean;
    isAnalyzingImpact: boolean;
    componentResearch: string | object | null;
    deploymentManifest: string | object | null;
    crossSectorImpact: string | object | null;

    // Handlers
    onResearchComponents: () => void;
    onGenerateManifest: () => void;
    onAnalyzeImpact: () => void;
}

export const TelemetrySidebar: React.FC<TelemetrySidebarProps> = ({
    clockSpeed, voltage, fanSpeed,
    onClockSpeedChange, onVoltageChange, onFanSpeedChange,
    eraColor, finTelemetry, selectedGpu, maintenanceEst,
    stressLevel, powerDraw, mtbf,
    isResearchingComponents, isGeneratingManifest, isAnalyzingImpact,
    componentResearch, deploymentManifest, crossSectorImpact,
    onResearchComponents, onGenerateManifest, onAnalyzeImpact
}) => (
    <div className="w-[320px] border-l border-[#1f1f1f] bg-[#050505] flex flex-col shrink-0 z-30 shadow-2xl relative">
        {/* Hardware Parameters */}
        <div className="p-5 border-b border-white/5 bg-white/[0.01]">
            <div className="flex items-center justify-between mb-5 px-1">
                <div className="flex items-center gap-2.5">
                    <SlidersHorizontal size={14} className="text-[var(--cyan)]" />
                    <h2 className="text-[10px] font-black text-white uppercase tracking-widest">Hardware Parameters</h2>
                </div>
            </div>
            <div className="space-y-2">
                <PerformanceMixer label="CPU FREQUENCY" value={clockSpeed} unit="GHz" min={1.2} max={6.4} color={eraColor} onValueChange={onClockSpeedChange} />
                <PerformanceMixer label="POWER VOLTAGE" value={voltage} unit="v" min={0.7} max={1.65} color="#ef4444" onValueChange={onVoltageChange} />
                <PerformanceMixer label="COOLING ARRAY" value={fanSpeed} unit=" RPM" min={0} max={6000} color="#9d4edd" onValueChange={onFanSpeedChange} />
            </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-8">
            {/* CapEx Management */}
            <div className="space-y-3">
                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-1.5 px-1">
                    <DollarSign size={12} className="text-[var(--plasma-green)]" /> CapEx Management
                </span>
                <div className="p-5 bg-[#0a1a0a] border border-[var(--plasma-green)]/20 rounded-2xl space-y-3 relative overflow-hidden shadow-xl">
                    <div className="grid grid-cols-2 gap-3 relative z-10">
                        <div className="space-y-1">
                            <span className="text-[7px] font-mono text-gray-600 uppercase tracking-widest">Projected Cost</span>
                            <div className="text-lg font-black font-mono text-white tracking-tighter">
                                ${finTelemetry.totalBomCost > 0
                                    ? finTelemetry.totalBomCost.toLocaleString()
                                    : selectedGpu
                                        ? (selectedGpu.livePrice?.price || selectedGpu.msrp).toLocaleString()
                                        : '--'}
                            </div>
                        </div>
                        <div className="space-y-1 text-right">
                            <span className="text-[7px] font-mono text-gray-600 uppercase tracking-widest">Efficiency Yield</span>
                            <div className="text-lg font-black font-mono text-[var(--plasma-green)] tracking-tighter">
                                {finTelemetry.roiProjection > 0 ? `+${finTelemetry.roiProjection}%` : '--'}
                            </div>
                        </div>
                    </div>
                    <div className="pt-2 border-t border-[var(--plasma-green)]/10">
                        <div className="flex justify-between items-center">
                            <span className="text-[7px] font-mono text-gray-600 uppercase tracking-widest">Annual Maintenance Est.</span>
                            <div className="text-sm font-black font-mono text-amber-500/80">
                                ${maintenanceEst > 0 ? maintenanceEst.toLocaleString() : '--'}/yr
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Thermal Distribution */}
            <div className="space-y-3 px-1">
                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-1.5">
                    <Thermometer size={12} /> Thermal Distribution
                </span>
                <NeuralThermalGrid stressLevel={stressLevel} />
            </div>

            {/* AI Analysis Tools */}
            <div className="space-y-3">
                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-1.5 px-1">
                    <FlaskConical size={12} className="text-[var(--amethyst-soft)]" /> AI Analysis
                </span>
                <div className="space-y-2">
                    <button
                        onClick={onResearchComponents}
                        disabled={!selectedGpu || isResearchingComponents}
                        className="w-full p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-3 hover:border-[var(--amethyst-soft)]/30 hover:bg-[var(--amethyst-soft)]/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
                    >
                        {isResearchingComponents ? (
                            <Loader2 size={14} className="text-[var(--amethyst-soft)] animate-spin" />
                        ) : (
                            <Microscope size={14} className="text-gray-600 group-hover:text-[var(--amethyst-soft)] transition-colors" />
                        )}
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">Research Components</span>
                    </button>
                    <button
                        onClick={onGenerateManifest}
                        disabled={!selectedGpu || isGeneratingManifest}
                        className="w-full p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-3 hover:border-[var(--cyan)]/30 hover:bg-[var(--cyan)]/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
                    >
                        {isGeneratingManifest ? (
                            <Loader2 size={14} className="text-[var(--cyan)] animate-spin" />
                        ) : (
                            <FileText size={14} className="text-gray-600 group-hover:text-[var(--cyan)] transition-colors" />
                        )}
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">Generate Manifest</span>
                    </button>
                    <button
                        onClick={onAnalyzeImpact}
                        disabled={!selectedGpu || isAnalyzingImpact}
                        className="w-full p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-3 hover:border-[var(--plasma-green)]/30 hover:bg-[var(--plasma-green)]/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
                    >
                        {isAnalyzingImpact ? (
                            <Loader2 size={14} className="text-[var(--plasma-green)] animate-spin" />
                        ) : (
                            <Target size={14} className="text-gray-600 group-hover:text-[var(--plasma-green)] transition-colors" />
                        )}
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">Analyze Impact</span>
                    </button>
                </div>

                {/* Analysis Results Preview */}
                {(componentResearch || deploymentManifest || crossSectorImpact) && (
                    <div className="p-3 bg-[#0a0a0a] border border-white/10 rounded-xl space-y-2">
                        <span className="text-[7px] text-gray-600 uppercase tracking-widest">Latest Analysis</span>
                        {componentResearch && (
                            <div className="text-[8px] text-gray-400 truncate">
                                <span className="text-[var(--amethyst-soft)]">Components:</span> {typeof componentResearch === 'string' ? componentResearch.slice(0, 50) : 'Complete'}...
                            </div>
                        )}
                        {deploymentManifest && (
                            <div className="text-[8px] text-gray-400 truncate">
                                <span className="text-[var(--cyan)]">Manifest:</span> {typeof deploymentManifest === 'string' ? deploymentManifest.slice(0, 50) : 'Generated'}...
                            </div>
                        )}
                        {crossSectorImpact && (
                            <div className="text-[8px] text-gray-400 truncate">
                                <span className="text-[var(--plasma-green)]">Impact:</span> {typeof crossSectorImpact === 'string' ? crossSectorImpact.slice(0, 50) : 'Analyzed'}...
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

        {/* System Status Footer */}
        <div className="p-6 border-t border-white/5 bg-black shrink-0 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center text-[8px] font-medium font-mono text-gray-600 uppercase tracking-widest">
                <span>System Status</span>
                <span className="text-[var(--cyan)]/70">Operational</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white/[0.01] border border-white/5 rounded-xl flex flex-col gap-1">
                    <span className="text-[7px] text-gray-600 uppercase font-mono tracking-widest">Unit Wattage</span>
                    <span className="text-sm font-black font-mono text-white">{powerDraw}W</span>
                </div>
                <div className="p-3 bg-white/[0.01] border border-white/5 rounded-xl flex flex-col gap-1">
                    <span className="text-[7px] text-gray-600 uppercase font-mono tracking-widest">Estimated Life</span>
                    <span className="text-sm font-black font-mono text-[var(--plasma-green)]">{mtbf.toLocaleString()}h</span>
                </div>
            </div>
        </div>
    </div>
);

export default TelemetrySidebar;
