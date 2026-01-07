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
import { Activity, Radio } from 'lucide-react';

interface TelemetryPoint {
  time: string;
  throughput: number;
  latency: number;
  ambiguityScore: number;
}

const fetchTelemetryData = async (): Promise<TelemetryPoint> => {
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
};

interface ContextVelocityChartProps {
  onDrillDown: (data: TelemetryPoint) => void;
}

const ContextVelocityChart: React.FC<ContextVelocityChartProps> = ({ onDrillDown }) => {
  const { theme, agents, voice, dashboard } = useAppStore();
  const [data, setData] = useState<TelemetryPoint[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // Derive 'Real' metrics from state
      const activeCount = agents.activeAgents.length;
      const thinkingCount = agents.activeAgents.filter(a => a.status === 'THINKING').length;
      const taskPendingCount = agents.activeAgents.reduce((acc, a) => acc + a.tasks.filter(t => t.status === 'PENDING').length, 0);

      // Throughput = Activity Level (Thinking + Tasks)
      // Latency = System Load (Inverse of throughput but spikes with heavy compute)
      const baseThroughput = 20 + (activeCount * 5) + (thinkingCount * 25) + (taskPendingCount * 2);
      const baseLatency = voice.isActive ? 45 : 120; // Voice implies low latency connection

      const point = {
        time: timeString,
        throughput: Math.min(100, baseThroughput + (Math.random() * 10 - 5)),
        latency: baseLatency + (thinkingCount * 40) + (Math.random() * 20),
        ambiguityScore: 5 + (dashboard.isOculusView ? 30 : 0) + (Math.random() * 5)
      };

      setData(prev => {
        const newData = [...prev, point];
        return newData.slice(-30);
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [agents, voice.isActive, dashboard.isOculusView]);

  return (
    <div className="w-full h-full min-h-[300px] bg-[var(--bg-card-top)] rounded-[3rem] border border-[var(--border-main)] p-8 flex flex-col transition-all duration-700 shadow-2xl overflow-hidden backdrop-blur-3xl relative group/chart">
      <div className="absolute inset-0 bg-black/10 pointer-events-none" />

      <div className="flex justify-between items-center mb-6 shrink-0 relative z-10">
        <div className="flex flex-col gap-1.5">
          <h3 className="text-[11px] font-black text-white uppercase tracking-[0.4em] font-mono leading-none flex items-center gap-3">
            <Activity size={16} className="text-[#9d4edd] animate-pulse" /> Context Velocity
          </h3>
          <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest pl-7">Temporal index // v4.0</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-1.5 bg-[#10b981]/5 border border-[#10b981]/20 rounded-full shadow-inner group-hover/chart:border-[#10b981]/40 transition-all">
          <Radio size={10} className="text-[#10b981] animate-pulse" />
          <span className="text-[9px] font-black font-mono text-[#10b981] uppercase tracking-widest leading-none">Live</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 w-full opacity-60 group-hover:opacity-100 transition-opacity relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 0, bottom: 0, left: -25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
            <XAxis dataKey="time" hide />
            <YAxis yAxisId="left" hide domain={[0, 100]} />
            <YAxis yAxisId="right" hide domain={[0, 500]} />
            <Tooltip
              cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 1 }}
              contentStyle={{
                backgroundColor: 'rgba(5,5,10,0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                fontSize: '11px',
                borderRadius: '20px',
                backdropFilter: 'blur(30px)',
                boxShadow: '0 30px 60px rgba(0,0,0,0.8)'
              }}
              itemStyle={{ fontFamily: 'Fira Code', textTransform: 'uppercase', padding: '4px 0' }}
            />
            <Bar yAxisId="left" dataKey="throughput" fill="var(--amethyst)" barSize={5} opacity={0.3} radius={[3, 3, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="latency" stroke="#ef4444" strokeWidth={3} dot={false} animationDuration={400} />
            <Line yAxisId="left" type="step" dataKey="ambiguityScore" stroke="var(--cyan)" strokeWidth={2} dot={false} animationDuration={600} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 pt-6 border-t border-white/5 flex justify-between items-center text-[9px] font-mono text-gray-600 uppercase tracking-[0.2em] shrink-0 relative z-10">
        <div className="flex gap-6 font-black">
          <span>Sync: <span className="text-white">OK</span></span>
          <span>Load: <span className="text-white">{data.length}P</span></span>
        </div>
        <span className="italic opacity-30 font-black tracking-widest">Feed_Stab_L0</span>
      </div>
    </div>
  );
};

export default ContextVelocityChart;