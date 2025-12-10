
import React, { useState, useEffect } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
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

    const intervalId = setInterval(async () => {
        try {
            const newPoint = await fetchTelemetryData();
            setData(prev => {
                const newData = [...prev, newPoint];
                // Keep a rolling window of 20 points
                if (newData.length > 20) newData.shift();
                return newData;
            });
        } catch (err) {
            console.error("Telemetry Stream Error:", err);
        }
    }, 2000); // 2 second refresh rate

    // Initial fetch
    fetchTelemetryData().then(point => setData([point]));

    return () => clearInterval(intervalId);
  }, [isLive]);

  return (
    <div className="h-full w-full bg-[#0a0a0a]/90 backdrop-blur border-t border-[#1f1f1f] flex flex-col relative z-30">
        
      <div className="px-4 py-2 flex items-center justify-between border-b border-[#1f1f1f]">
        <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-[#9d4edd] animate-pulse shadow-[0_0_8px_#9d4edd]' : 'bg-gray-600'}`}></span>
            <h3 className="text-[10px] font-bold text-white uppercase tracking-[0.2em] font-mono">
            Process Health // Telemetry
            </h3>
        </div>
        <div className="flex items-center gap-4">
             <div className="flex items-center gap-1.5">
                <span className="w-2 h-0.5 bg-[#8884d8]"></span>
                <span className="text-[9px] text-gray-500 font-mono uppercase">Latency (ms)</span>
             </div>
             <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-[#333]"></span>
                <span className="text-[9px] text-gray-500 font-mono uppercase">Throughput</span>
             </div>
             <span className="text-[9px] text-[#ef4444] font-mono border border-[#ef4444]/30 px-1 rounded bg-[#ef4444]/10">SLA: 200ms</span>
             <button 
                onClick={() => setIsLive(!isLive)}
                className="text-[9px] text-gray-500 hover:text-white font-mono uppercase border border-[#333] px-2 rounded"
             >
                {isLive ? 'PAUSE' : 'RESUME'}
             </button>
        </div>
      </div>
      
      <div className="flex-1 p-2 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart 
            data={data}
            onClick={(state: any) => {
                if (state && state.activePayload && state.activePayload.length > 0) {
                    onDrillDown(state.activePayload[0].payload);
                }
            }}
          >
            <defs>
              <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#9d4edd" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#9d4edd" stopOpacity={0}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid stroke="#1f1f1f" strokeDasharray="3 3" vertical={false} />
            
            <XAxis 
              dataKey="time" 
              stroke="#666" 
              tick={{fontSize: 9, fontFamily: 'Fira Code', fill: '#666'}} 
              tickLine={false}
              axisLine={{ stroke: '#333' }}
              interval="preserveStartEnd"
            />
            
            <YAxis 
              yAxisId="left" 
              orientation="left" 
              stroke="#666" 
              tick={{fontSize: 9, fontFamily: 'Fira Code', fill: '#666'}}
              tickLine={false}
              axisLine={false}
              label={{ value: 'LATENCY (ms)', angle: -90, position: 'insideLeft', fill: '#444', fontSize: 8, fontFamily: 'Fira Code' }}
            />
            
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              stroke="#666" 
              tick={{fontSize: 9, fontFamily: 'Fira Code', fill: '#666'}}
              tickLine={false}
              axisLine={false}
            />

            <Tooltip 
              contentStyle={{ 
                  backgroundColor: '#030303', 
                  borderColor: '#333', 
                  fontFamily: 'Fira Code',
                  fontSize: '10px',
                  color: '#ccc',
                  textTransform: 'uppercase'
              }}
              itemStyle={{ color: '#9d4edd' }}
              cursor={{ stroke: '#9d4edd', strokeWidth: 1, strokeDasharray: '4 4' }}
            />

            {/* The Governance Threshold: Visualizing the "Rule" */}
            <ReferenceLine 
              yAxisId="left" 
              y={200} 
              stroke="#EF4444" 
              strokeDasharray="3 3" 
              label={{ position: 'insideTopRight', value: 'MAX TOLERANCE', fill: '#EF4444', fontSize: 9, fontFamily: 'Fira Code' }} 
            />

            {/* Throughput Bar: Raw Pressure */}
            <Bar 
              yAxisId="right" 
              dataKey="throughput" 
              barSize={20} 
              fill="#1f1f1f" 
              radius={[2, 2, 0, 0]} 
              activeBar={{ fill: '#333' }}
              isAnimationActive={false}
            />

            {/* Latency Line: Operational Friction */}
            <Line 
              yAxisId="left" 
              type="monotone" 
              dataKey="latency" 
              stroke="#9d4edd" 
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 1, fill: '#0a0a0a', stroke: '#9d4edd' }}
              activeDot={{ r: 6, stroke: '#fff', strokeWidth: 0, fill: '#9d4edd' }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ContextVelocityChart;
