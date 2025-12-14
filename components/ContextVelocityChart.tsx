
import React, { useState, useEffect } from 'react';
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

// Service: Hybrid Telemetry Fetcher
const fetchTelemetryData = async (): Promise<TelemetryPoint> => {
  try {
      // Attempt to hit the hypothetical endpoint
      const response = await fetch('/api/telemetry');
      if (!response.ok) throw new Error('Telemetry API Unavailable');
      return await response.json();
  } catch (err) {
      // Fallback: Simulation Engine (for demo environment)
      // Mocking network latency
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      // Generate probabilistic anomalies
      const isSpike = Math.random() > 0.9;
      
      return {
        time: timeString,
        throughput: Math.floor(Math.random() * 40) + 30, // Random load between 30-70
        latency: isSpike ? Math.floor(Math.random() * 300) + 250 : Math.floor(Math.random() * 80) + 90, // Spikes > 200ms
        ambiguityScore: Math.floor(Math.random() * 20)
      };
  }
};

interface ContextVelocityChartProps {
    onDrillDown: (data: TelemetryPoint) => void;
}

const ContextVelocityChart: React.FC<ContextVelocityChartProps> = ({ onDrillDown }) => {
  const [data, setData] = useState<TelemetryPoint[]>([]);
  const [isLive, setIsLive] = useState(true);

  // Poll for real-time updates
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(async () => {
      const point = await fetchTelemetryData();
      setData(prev => {
        const newData = [...prev, point];
        return newData.slice(-30); // Keep last 30 points
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isLive]);

  return (
    <div className="w-full h-full bg-[#0a0a0a] rounded-lg border border-[#1f1f1f] p-4 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">
          Context Velocity
        </h3>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-[10px] text-gray-500 font-mono">{isLive ? 'LIVE' : 'PAUSED'}</span>
        </div>
      </div>
      
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} onClick={(e: any) => e && e.activePayload && onDrillDown(e.activePayload[0].payload)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
            <XAxis dataKey="time" hide />
            <YAxis yAxisId="left" stroke="#444" tick={{fontSize: 10, fontFamily: 'monospace'}} width={30} />
            <YAxis yAxisId="right" orientation="right" stroke="#444" tick={{fontSize: 10, fontFamily: 'monospace'}} width={30} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#111', borderColor: '#333', fontSize: '12px' }}
              itemStyle={{ fontFamily: 'monospace' }}
            />
            <Bar yAxisId="left" dataKey="throughput" fill="#3b82f6" barSize={4} opacity={0.6} name="Throughput" />
            <Line yAxisId="right" type="monotone" dataKey="latency" stroke="#ef4444" strokeWidth={2} dot={false} name="Latency (ms)" />
            <Line yAxisId="left" type="monotone" dataKey="ambiguityScore" stroke="#f59e0b" strokeWidth={1} dot={false} name="Ambiguity" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ContextVelocityChart;
