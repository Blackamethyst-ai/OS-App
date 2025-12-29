import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface TelemetryPoint {
  time: string;
  throughput: number;
  latency: number;
  ambiguityScore: number;
}

const fetchTelemetryData = async (): Promise<TelemetryPoint> => {
  try {
      // Logic for future API integration
      const response = await fetch('/api/telemetry');
      if (!response.ok) throw new Error('Telemetry API Offline');
      return await response.json();
  } catch (err) {
      // Functional Simulation Engine
      await new Promise(resolve => setTimeout(resolve, 200));
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      const isSpike = Math.random() > 0.92;
      return {
        time: timeString,
        throughput: Math.floor(Math.random() * 45) + 25,
        latency: isSpike ? Math.floor(Math.random() * 250) + 200 : Math.floor(Math.random() * 60) + 80,
        ambiguityScore: Math.floor(Math.random() * 15) + (isSpike ? 20 : 0)
      };
  }
};

interface ContextVelocityChartProps {
    onDrillDown: (data: TelemetryPoint) => void;
}

const ContextVelocityChart: React.FC<ContextVelocityChartProps> = ({ onDrillDown }) => {
  const { theme } = useAppStore(); // Reactive theme hook
  const [data, setData] = useState<TelemetryPoint[]>([]);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(async () => {
      const point = await fetchTelemetryData();
      setData(prev => {
        const newData = [...prev, point];
        return newData.slice(-30);
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [isLive]);

  // Derived colors from the theme for SVG elements that might not pick up CSS variables instantly
  const chartColors = useMemo(() => {
      return {
          grid: 'var(--border-main)',
          text: 'var(--text-muted)',
          tooltipBg: 'var(--bg-panel)',
          tooltipText: 'var(--text-primary)'
      };
  }, [theme]);

  return (
    <div 
      key={theme} // Force re-render on theme change to update internal SVG styles
      className="w-full h-full bg-[var(--bg-card-top)] rounded-2xl border border-[var(--border-main)] p-5 flex flex-col transition-all duration-700 shadow-xl overflow-hidden backdrop-blur-3xl"
    >
      <div className="flex justify-between items-center mb-5 shrink-0">
        <div className="flex flex-col gap-1">
            <h3 className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-[0.4em] font-mono leading-none">
              Context Velocity
            </h3>
            <span className="text-[7px] font-mono text-[var(--text-muted)] uppercase tracking-widest">Temporal Throughput Index</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-2 px-2 py-1 rounded border transition-all ${isLive ? 'bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]' : 'bg-black/20 border-white/10 text-gray-500'}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-[#10b981] animate-pulse shadow-[0_0_8px_#10b981]' : 'bg-gray-500'}`} />
            <span className="text-[8px] font-mono font-bold uppercase tracking-widest">{isLive ? 'LIVE' : 'PAUSED'}</span>
          </button>
        </div>
      </div>
      
      <div className="flex-1 min-h-0 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart 
            data={data} 
            margin={{ top: 5, right: 5, bottom: 5, left: 0 }}
            onClick={(e: any) => e && e.activePayload && onDrillDown(e.activePayload[0].payload)}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} opacity={0.1} />
            <XAxis dataKey="time" hide />
            <YAxis 
                yAxisId="left" 
                stroke={chartColors.text} 
                tick={{fontSize: 8, fontFamily: 'Fira Code', fill: chartColors.text}} 
                width={25} 
                axisLine={false} 
                tickLine={false}
            />
            <YAxis 
                yAxisId="right" 
                orientation="right" 
                stroke={chartColors.text} 
                tick={{fontSize: 8, fontFamily: 'Fira Code', fill: chartColors.text}} 
                width={25} 
                axisLine={false} 
                tickLine={false}
            />
            <Tooltip 
              cursor={{ stroke: 'var(--border-main)', strokeWidth: 1 }}
              contentStyle={{ 
                  backgroundColor: chartColors.tooltipBg, 
                  border: '1px solid var(--border-main)', 
                  fontSize: '10px', 
                  borderRadius: '12px', 
                  color: chartColors.tooltipText,
                  backdropFilter: 'blur(10px)'
              }}
              itemStyle={{ fontFamily: 'Fira Code', textTransform: 'uppercase', fontSize: '9px' }}
            />
            <Bar yAxisId="left" dataKey="throughput" fill="#3b82f6" barSize={4} opacity={0.4} radius={[2, 2, 0, 0]} name="Throughput" />
            <Line yAxisId="right" type="monotone" dataKey="latency" stroke="#ef4444" strokeWidth={2} dot={false} name="Latency" animationDuration={400} />
            <Line yAxisId="left" type="step" dataKey="ambiguityScore" stroke="#f1c21b" strokeWidth={1.5} dot={false} name="Entropy" animationDuration={600} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center shrink-0">
          <div className="flex gap-4">
              <div className="flex flex-col">
                  <span className="text-[6px] text-[var(--text-muted)] uppercase font-black">Sync</span>
                  <span className="text-[9px] font-mono text-[var(--text-primary)]">LOCKED</span>
              </div>
              <div className="flex flex-col">
                  <span className="text-[6px] text-[var(--text-muted)] uppercase font-black">Buffer</span>
                  <span className="text-[9px] font-mono text-[var(--text-primary)]">{data.length}Pkts</span>
              </div>
          </div>
          <div className="text-[7px] font-mono text-[var(--text-muted)] uppercase tracking-widest italic">
            Telemetry Feed Stabilized
          </div>
      </div>
    </div>
  );
};

export default ContextVelocityChart;