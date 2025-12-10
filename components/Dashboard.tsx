
import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { generateArchitectureImage, promptSelectKey, fileToGenerativePart } from '../services/geminiService';
import { AspectRatio, ImageSize } from '../types';
import { Activity, Shield, Zap, Image as ImageIcon, Sparkles, RefreshCw, Cpu, Clock, Users, ArrowUpRight, Upload, X, Globe, ScanFace, Terminal, Database, Lock, Wifi, AlertCircle } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { dashboard, setDashboardState } = useAppStore();
  const [time, setTime] = useState(new Date());

  // Live Telemetry State
  const [telemetry, setTelemetry] = useState({
      cpu: 12,
      net: 1.2,
      mem: 64,
      memCache: 15,
      temp: 42,
      packetLoss: 0.01,
      agents: [1, 1, 1, 0] // 1=Active, 0=Idle
  });

  const [logs, setLogs] = useState<string[]>([
      "SYSTEM_INIT: Core services online",
      "NET_LINK: Uplink established (secure)",
      "AGENT_01: Context sync complete"
  ]);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Telemetry Simulation Loop
  useEffect(() => {
      const interval = setInterval(() => {
          setTelemetry(prev => ({
              cpu: Math.max(5, Math.min(95, prev.cpu + (Math.random() * 10 - 5))),
              net: Math.max(0.1, Math.min(10.0, prev.net + (Math.random() * 0.4 - 0.2))),
              mem: Math.max(20, Math.min(90, prev.mem + (Math.random() * 4 - 2))),
              memCache: Math.max(5, Math.min(20, prev.memCache + (Math.random() * 2 - 1))),
              temp: Math.max(35, Math.min(85, prev.temp + (Math.random() * 2 - 1))),
              packetLoss: Math.random() > 0.95 ? Math.random() * 0.5 : 0,
              agents: prev.agents.map(a => Math.random() > 0.98 ? (a === 1 ? 0 : 1) : a)
          }));
      }, 2000);
      return () => clearInterval(interval);
  }, []);

  // Log Simulation Loop
  useEffect(() => {
      const messages = [
          "PACKET_IN: 0x4F verified",
          "THERMAL: Fan curve adjusted",
          "MEM_GC: Garbage collection cycle",
          "AGENT_02: Reasoning complete",
          "NET_HB: Heartbeat ACK",
          "STORAGE: Block committed",
          "CRYPT: Key rotation pending",
          "KERNEL: Task scheduled [ID:992]"
      ];
      
      const interval = setInterval(() => {
          const msg = messages[Math.floor(Math.random() * messages.length)];
          const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
          setLogs(prev => [...prev.slice(-6), `[${timestamp}] ${msg}`]);
      }, 3500);
      return () => clearInterval(interval);
  }, []);

  useEffect(() => {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);


  const handleReferenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        try {
            const file = e.target.files[0];
            const fileData = await fileToGenerativePart(file);
            setDashboardState({ referenceImage: fileData });
        } catch (err) {
            console.error("Reference upload failed", err);
        }
    }
  };

  const removeReference = () => {
      setDashboardState({ referenceImage: null });
  };

  const generateIdentity = async () => {
    setDashboardState({ isGenerating: true });
    try {
      const hasKey = await window.aistudio?.hasSelectedApiKey();
      if (!hasKey) {
          await promptSelectKey();
          setDashboardState({ isGenerating: false });
          return;
      }
      
      const prompt = `
        Hyper-realistic 4K cinematic render of a futuristic Sovereign OS command center.
        A sleek, high-tech workspace with holographic displays and advanced glass interfaces.
        The large central main screen prominently displays the text "METAVENTIONS AI" in a sharp, modern sans-serif font with glowing edges.
        On the dark metallic wall in the background, an elegant illuminated sign reads "SOVEREIGN EMPIRE" in deep violet neon.
        Atmosphere is moody and sophisticated, featuring rich amethyst purple and electric teal accent lighting.
        Photorealistic, volumetric lighting, ray-traced reflections, 8k resolution, architectural visualization style.
      `;
      
      const url = await generateArchitectureImage(
          prompt, 
          AspectRatio.RATIO_16_9, 
          ImageSize.SIZE_2K,
          dashboard.referenceImage
      );
      
      setDashboardState({ identityUrl: url });
    } catch (e) {
        console.error("Identity Generation Failed", e);
    } finally {
        setDashboardState({ isGenerating: false });
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto custom-scrollbar p-8 pb-24 bg-[#030303] text-gray-200 font-sans selection:bg-[#9d4edd]/30">
      
      {/* 1. Header: System Core Neon Sign */}
      <div className="relative mb-12 flex flex-col items-center justify-center py-10 border-b border-[#1f1f1f]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#9d4edd]/10 via-[#030303]/0 to-[#030303]/0 pointer-events-none"></div>
        
        <div className="relative z-10 text-center">
            <h1 className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 mb-2 drop-shadow-[0_0_25px_rgba(157,78,221,0.5)] font-mono">
                METAVENTIONS AI
            </h1>
            <div className="flex items-center justify-center gap-4">
                <div className="h-px w-12 bg-[#9d4edd]"></div>
                <span className="text-xs font-mono text-[#9d4edd] uppercase tracking-[0.3em] text-shadow-sm">Sovereign Empire OS v3.2</span>
                <div className="h-px w-12 bg-[#9d4edd]"></div>
            </div>
        </div>

        <div className="absolute top-4 right-4 flex flex-col items-end">
             <div className="flex items-center gap-2 text-[#9d4edd]">
                 <Clock className="w-3 h-3" />
                 <span className="text-sm font-mono font-bold tracking-widest">
                     {time.toLocaleTimeString('en-US', { hour12: false })}
                 </span>
             </div>
             <span className="text-[9px] text-gray-600 font-mono uppercase">{time.toLocaleDateString()} // UTC</span>
        </div>
      </div>

      {/* 2. Main Grid: Philosophy & Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        
        {/* Left: System Philosophy (Visual Identity) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-[#9d4edd]" />
                <h2 className="text-xs font-bold font-mono uppercase tracking-widest text-white">System Core // Visual</h2>
            </div>
            
            <div className="flex-1 bg-[#0a0a0a] border border-[#1f1f1f] relative overflow-hidden group min-h-[350px] shadow-2xl">
                 {dashboard.identityUrl ? (
                    <div className="relative w-full h-full">
                        <img src={dashboard.identityUrl} alt="Identity" className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-transparent"></div>
                        
                        <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                            <div>
                                <div className="text-[#9d4edd] text-[10px] font-mono uppercase mb-1">Visual Kernel</div>
                                <div className="text-white text-lg font-bold tracking-tight">Command Center Prime</div>
                            </div>
                            <button 
                                onClick={generateIdentity}
                                className="bg-[#0a0a0a]/90 backdrop-blur border border-[#9d4edd] text-[#9d4edd] px-4 py-2 text-[10px] font-mono uppercase tracking-wider hover:bg-[#9d4edd] hover:text-black transition-all"
                            >
                                Re-Materialize
                            </button>
                        </div>
                    </div>
                 ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center relative p-8">
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(157,78,221,0.03)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%,100%_100%] animate-[backgroundPosition_20s_ease_infinite]"></div>
                        <div className="relative z-10 text-center max-w-md">
                            <div className="w-16 h-16 border border-[#333] bg-[#050505] flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_-5px_rgba(157,78,221,0.2)]">
                                <ScanFace className="w-8 h-8 text-[#9d4edd]" />
                            </div>
                            <h3 className="text-white font-mono uppercase tracking-widest text-sm mb-2">Visual Core Offline</h3>
                            <p className="text-gray-500 text-xs font-mono mb-6 leading-relaxed">
                                The system requires architectural definition. Upload a scope or initialize the generative engine.
                            </p>
                            
                             <div className="flex flex-col gap-3 items-center">
                                {dashboard.referenceImage && (
                                    <div className="flex items-center gap-2 text-[10px] font-mono text-[#9d4edd] bg-[#9d4edd]/10 px-3 py-1 rounded border border-[#9d4edd]/20">
                                        <ImageIcon className="w-3 h-3" />
                                        {dashboard.referenceImage.name}
                                        <button onClick={removeReference} className="hover:text-white"><X className="w-3 h-3" /></button>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <label className="cursor-pointer bg-[#111] border border-[#333] text-gray-400 px-4 py-2 text-[10px] font-mono uppercase tracking-wider hover:border-[#9d4edd] hover:text-[#9d4edd] transition-all">
                                        <input type="file" onChange={handleReferenceUpload} className="hidden" accept="image/*" />
                                        Upload Scope
                                    </label>
                                    <button 
                                        onClick={generateIdentity}
                                        disabled={dashboard.isGenerating}
                                        className="bg-[#9d4edd] text-black px-6 py-2 text-[10px] font-bold font-mono uppercase tracking-wider hover:bg-[#b06bf7] disabled:opacity-50 transition-all flex items-center"
                                    >
                                        {dashboard.isGenerating ? <RefreshCw className="w-3 h-3 animate-spin mr-2" /> : <Sparkles className="w-3 h-3 mr-2" />}
                                        Initialize
                                    </button>
                                </div>
                             </div>
                        </div>
                    </div>
                 )}
            </div>
        </div>

        {/* Right: Telemetry (Enhanced) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
             <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-[#9d4edd]" />
                <h2 className="text-xs font-bold font-mono uppercase tracking-widest text-white">Live Telemetry</h2>
            </div>
            
            <div className="flex-1 bg-[#0a0a0a] border border-[#1f1f1f] p-6 flex flex-col shadow-lg relative overflow-hidden">
                {/* Background Scanline */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,18,18,0.5)_50%,transparent_50%)] bg-[size:100%_4px] pointer-events-none opacity-20"></div>

                {/* Top Section: Gauges */}
                <div className="space-y-6 flex-1">
                    
                    {/* Compute Load - Circular */}
                    <div className="flex items-center justify-between pb-6 border-b border-[#1f1f1f]">
                        <div className="flex-1 min-w-0 pr-4">
                            <div className="text-[10px] text-gray-500 font-mono uppercase mb-1 flex items-center gap-2">
                                Compute Load
                                {telemetry.temp > 80 && <AlertCircle className="w-3 h-3 text-red-500 animate-pulse" />}
                            </div>
                            <div className="text-3xl text-white font-mono font-bold">{telemetry.cpu.toFixed(0)}<span className="text-sm text-[#9d4edd]">%</span></div>
                            <div className="text-[9px] text-[#9d4edd] font-mono mt-1 flex items-center gap-2">
                                <span>{telemetry.temp.toFixed(1)}°C</span>
                                <span className="text-gray-600">|</span>
                                <span>{telemetry.cpu > 80 ? 'HIGH LOAD' : 'NOMINAL'}</span>
                            </div>
                        </div>
                        <div className="relative w-20 h-20 flex-shrink-0">
                             <svg viewBox="0 0 80 80" className="w-full h-full transform -rotate-90">
                                 {/* Background Circle */}
                                 <circle cx="40" cy="40" r="34" fill="none" stroke="#1f1f1f" strokeWidth="6" />
                                 {/* Progress Circle */}
                                 <circle 
                                    cx="40" cy="40" r="34" 
                                    fill="none" 
                                    stroke={telemetry.cpu > 80 ? '#ef4444' : '#9d4edd'} 
                                    strokeWidth="6" 
                                    strokeDasharray="213.6" 
                                    strokeDashoffset={213.6 * (1 - telemetry.cpu / 100)} 
                                    className="drop-shadow-[0_0_6px_rgba(157,78,221,0.5)] transition-all duration-700 ease-out" 
                                 />
                             </svg>
                             <Cpu className={`w-5 h-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${telemetry.cpu > 80 ? 'text-red-500 animate-pulse' : 'text-gray-500'}`} />
                        </div>
                    </div>

                     {/* Network Flow - Linear */}
                     <div>
                        <div className="flex justify-between text-[10px] font-mono uppercase mb-2">
                            <span className="text-gray-500 flex items-center gap-2">
                                Network Flow
                                {telemetry.packetLoss > 0 && <span className="text-red-500 text-[8px] animate-pulse">PKT_LOSS</span>}
                            </span>
                            <div className="flex gap-3">
                                <span className="text-[#9d4edd]">{telemetry.net.toFixed(1)} GB/s</span>
                            </div>
                        </div>
                        <div className="w-full bg-[#111] h-1.5 rounded-full overflow-hidden flex">
                            <div 
                                className="h-full bg-[#9d4edd] shadow-[0_0_8px_#9d4edd] transition-all duration-500 ease-linear"
                                style={{ width: `${(telemetry.net / 10) * 100}%` }}
                            ></div>
                        </div>
                     </div>

                     {/* Memory Banks - Multi-Segment */}
                     <div>
                        <div className="flex justify-between text-[10px] font-mono uppercase mb-2">
                            <span className="text-gray-500">Memory Banks</span>
                            <span className="text-gray-300">{telemetry.mem.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-[#111] h-1.5 rounded-full overflow-hidden flex">
                            {/* Used */}
                            <div 
                                className="h-full bg-gray-500 transition-all duration-500"
                                style={{ width: `${telemetry.mem - telemetry.memCache}%` }}
                            ></div>
                            {/* Cache */}
                            <div 
                                className="h-full bg-[#9d4edd]/50 transition-all duration-500"
                                style={{ width: `${telemetry.memCache}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-end gap-2 mt-1">
                            <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-500"></div>
                                <span className="text-[8px] text-gray-600 font-mono">USED</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#9d4edd]/50"></div>
                                <span className="text-[8px] text-gray-600 font-mono">CACHE</span>
                            </div>
                        </div>
                     </div>

                     {/* Agent Status Grid */}
                     <div className="pt-2">
                         <div className="flex justify-between items-center mb-2">
                             <span className="text-[10px] text-gray-500 font-mono uppercase">Active Agents</span>
                             <Users className="w-3 h-3 text-gray-600" />
                         </div>
                         <div className="grid grid-cols-4 gap-2">
                             {telemetry.agents.map((status, i) => (
                                 <div key={i} className={`h-8 border flex items-center justify-center transition-colors duration-300 ${status === 1 ? 'bg-[#9d4edd]/10 border-[#9d4edd]/30' : 'bg-[#111] border-[#333]'}`}>
                                     <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_5px_currentColor] transition-all duration-300 ${status === 1 ? 'bg-[#9d4edd] scale-110' : 'bg-gray-700 scale-90'}`}></div>
                                 </div>
                             ))}
                         </div>
                     </div>
                </div>

                {/* Bottom Section: Live Console */}
                <div className="mt-8 border-t border-[#333] pt-4 flex flex-col h-32 flex-shrink-0">
                    <div className="flex items-center gap-2 mb-2">
                        <Terminal className="w-3 h-3 text-gray-500" />
                        <span className="text-[9px] font-bold font-mono uppercase text-gray-500">System Console</span>
                    </div>
                    <div className="flex-1 bg-black border border-[#1f1f1f] p-2 overflow-hidden relative">
                        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(157,78,221,0.05)_50%,transparent_50%)] bg-[size:100%_4px]"></div>
                        <div className="flex flex-col justify-end h-full">
                            {logs.map((log, i) => (
                                <div key={i} className="text-[9px] font-mono text-[#42be65] truncate animate-in slide-in-from-left-2 fade-in duration-300">
                                    <span className="opacity-50 mr-2">{'>'}</span>
                                    {log}
                                </div>
                            ))}
                            <div ref={logEndRef} />
                        </div>
                    </div>
                </div>

            </div>
        </div>
      </div>

      {/* 3. Footer: Active Protocols Table */}
      <div>
         <div className="flex items-center gap-2 mb-4">
            <Terminal className="w-4 h-4 text-[#9d4edd]" />
            <h2 className="text-xs font-bold font-mono uppercase tracking-widest text-white">Protocol Status</h2>
        </div>
        
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] overflow-hidden">
            <div className="grid grid-cols-12 bg-[#0f0f0f] border-b border-[#1f1f1f] py-3 px-4">
                <div className="col-span-5 text-[10px] font-mono uppercase text-gray-500">Protocol Designation</div>
                <div className="col-span-3 text-[10px] font-mono uppercase text-gray-500">Type</div>
                <div className="col-span-2 text-[10px] font-mono uppercase text-gray-500">Status</div>
                <div className="col-span-2 text-[10px] font-mono uppercase text-gray-500 text-right">Uplink</div>
            </div>
            
            {[
                { name: 'Mermaid Visualization Engine', type: 'CORE INFRA', status: 'ACTIVE', color: 'text-[#42be65]', bg: 'bg-[#42be65]/10 border-[#42be65]/20' },
                { name: 'Gemini 3 Pro Image Gen', type: 'GENERATIVE', status: 'DEPLOYED', color: 'text-[#4589ff]', bg: 'bg-[#4589ff]/10 border-[#4589ff]/20' },
                { name: 'Tactical Oracle (Chat)', type: 'INTELLIGENCE', status: 'ONLINE', color: 'text-[#42be65]', bg: 'bg-[#42be65]/10 border-[#42be65]/20' },
                { name: 'Deep Dive TTS Audio', type: 'SYNTHESIS', status: 'STANDBY', color: 'text-[#f1c21b]', bg: 'bg-[#f1c21b]/10 border-[#f1c21b]/20' },
                { name: 'Contextual Memory Bridge', type: 'R&D', status: 'IN DEV', color: 'text-[#8d8d8d]', bg: 'bg-[#8d8d8d]/10 border-[#8d8d8d]/20' },
            ].map((row, i) => (
                <div key={i} className="grid grid-cols-12 py-3 px-4 border-b border-[#1f1f1f] hover:bg-[#111] transition-colors items-center group">
                    <div className="col-span-5 text-xs font-bold text-gray-300 font-mono group-hover:text-white transition-colors">
                        {row.name}
                    </div>
                    <div className="col-span-3 text-[10px] text-gray-600 font-mono uppercase">
                        {row.type}
                    </div>
                    <div className="col-span-2">
                        <span className={`inline-block px-2 py-0.5 text-[9px] font-mono uppercase tracking-wide border rounded-sm ${row.color} ${row.bg}`}>
                            {row.status}
                        </span>
                    </div>
                    <div className="col-span-2 text-right">
                        <button className="text-gray-600 hover:text-[#9d4edd] transition-colors">
                            <ArrowUpRight className="w-4 h-4 ml-auto" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
