
import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { generateArchitectureImage, promptSelectKey, fileToGenerativePart } from '../services/geminiService';
import { AspectRatio, ImageSize } from '../types';
import { Activity, Shield, Image as ImageIcon, Sparkles, RefreshCw, Cpu, Clock, Users, ArrowUpRight, X, ScanFace, Terminal, Zap, Network, Database, Globe, Lock, Wifi, AlertCircle, Radio, Hexagon } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const Dashboard: React.FC = () => {
  const { dashboard, setDashboardState } = useAppStore();
  const [time, setTime] = useState(new Date());
  const [uptime, setUptime] = useState(0);

  // Live Telemetry State
  const [telemetry, setTelemetry] = useState({
      cpu: 12,
      net: 1.2,
      mem: 64,
      memCache: 15,
      temp: 42,
      packetLoss: 0.01,
      agents: Array(12).fill(0).map(() => Math.random() > 0.5 ? 1 : 0) // 1=Active, 0=Idle
  });

  const [history, setHistory] = useState<{time: string, cpu: number, net: number, mem: number}[]>([]);

  const [logs, setLogs] = useState<string[]>([
      "SYSTEM_INIT: Core services online",
      "NET_LINK: Uplink established (secure)",
      "AGENT_01: Context sync complete"
  ]);

  // Clock & Uptime
  useEffect(() => {
    const timer = setInterval(() => {
        setTime(new Date());
        setUptime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format Uptime
  const formatUptime = (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Telemetry Simulation Loop
  useEffect(() => {
      const interval = setInterval(() => {
          setTelemetry(prev => {
              const newCpu = Math.max(5, Math.min(95, prev.cpu + (Math.random() * 15 - 7)));
              const newNet = Math.max(0.1, Math.min(10.0, prev.net + (Math.random() * 2 - 1)));
              const newMem = Math.max(20, Math.min(90, prev.mem + (Math.random() * 5 - 2.5)));
              
              return {
                  cpu: newCpu,
                  net: newNet,
                  mem: newMem,
                  memCache: Math.max(5, Math.min(20, prev.memCache + (Math.random() * 2 - 1))),
                  temp: Math.max(35, Math.min(85, prev.temp + (Math.random() * 3 - 1.5))),
                  packetLoss: Math.random() > 0.95 ? Math.random() * 0.5 : 0,
                  agents: prev.agents.map(a => Math.random() > 0.9 ? (a === 1 ? 0 : 1) : a)
              };
          });

          setHistory(prev => {
              const now = new Date();
              const timeStr = now.toLocaleTimeString('en-US', { hour12: false, minute:'2-digit', second:'2-digit' });
              const point = { 
                  time: timeStr, 
                  cpu: telemetry.cpu, 
                  net: telemetry.net, 
                  mem: telemetry.mem 
              };
              const newHist = [...prev, point];
              if (newHist.length > 20) newHist.shift();
              return newHist;
          });

      }, 1000);
      return () => clearInterval(interval);
  }, [telemetry.cpu, telemetry.net, telemetry.mem]);

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
          "KERNEL: Task scheduled [ID:992]",
          "AI_CORE: Inference complete (12ms)",
          "SEC_SCAN: Integrity verified"
      ];
      
      const interval = setInterval(() => {
          const msg = messages[Math.floor(Math.random() * messages.length)];
          const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
          setLogs(prev => [...prev.slice(-8), `[${timestamp}] ${msg}`]);
      }, 2500);
      return () => clearInterval(interval);
  }, []);

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

  // --- Sub Components ---

  const MetricCard = ({ title, value, subtext, icon: Icon, color, trend }: any) => (
      <div className="bg-[#111] border border-[#222] p-4 rounded-sm flex items-center justify-between hover:border-[#333] transition-colors group">
          <div>
              <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                  <Icon className="w-3 h-3" style={{color}} />
                  {title}
              </div>
              <div className="text-2xl font-mono font-bold text-white group-hover:scale-105 transition-transform origin-left">
                  {value}
              </div>
              <div className="text-[9px] font-mono text-gray-600 mt-1">{subtext}</div>
          </div>
          <div className="h-full flex items-end">
               {/* Mini Trend Bar */}
               <div className="flex gap-0.5 items-end h-8">
                   {[1,2,3,4,5].map(i => (
                       <div key={i} className="w-1 bg-[#222] rounded-sm" style={{ 
                           height: `${Math.random() * 100}%`,
                           backgroundColor: i === 5 ? color : undefined 
                        }}></div>
                   ))}
               </div>
          </div>
      </div>
  );

  return (
    <div className="h-full w-full overflow-y-auto custom-scrollbar p-6 pb-32 bg-[#030303] text-gray-200 font-sans selection:bg-[#9d4edd]/30">
      
      {/* 1. Cinematic Header */}
      <div className="relative mb-8 p-6 rounded-xl border border-[#1f1f1f] bg-[radial-gradient(circle_at_top_right,rgba(20,20,20,1),rgba(0,0,0,1))] overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.02)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.02)_50%,rgba(255,255,255,0.02)_75%,transparent_75%,transparent)] bg-[size:20px_20px] pointer-events-none opacity-20"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-end relative z-10">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-2 h-2 rounded-full bg-[#42be65] shadow-[0_0_10px_#42be65] animate-pulse"></div>
                    <span className="text-[10px] font-mono text-[#42be65] uppercase tracking-[0.2em]">System Online</span>
                </div>
                <h1 className="text-5xl font-black tracking-tighter text-white mb-2 font-mono">
                    METAVENTIONS<span className="text-[#9d4edd]">.AI</span>
                </h1>
                <div className="flex gap-4 text-xs font-mono text-gray-500">
                    <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> SECURE_BOOT</span>
                    <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> QUANTUM_LINK</span>
                    <span className="text-[#9d4edd] font-bold">V3.2.0-ALPHA</span>
                </div>
            </div>

            <div className="flex flex-col items-end gap-2 mt-4 md:mt-0">
                <div className="text-right">
                    <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">Session Uptime</div>
                    <div className="text-2xl font-mono font-bold text-white tabular-nums tracking-wider">{formatUptime(uptime)}</div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-gray-600 bg-[#111] px-2 py-1 rounded border border-[#222]">
                    <Globe className="w-3 h-3" />
                    US-EAST-1 :: {telemetry.packetLoss === 0 ? 'OPTIMAL' : 'DEGRADED'}
                </div>
            </div>
        </div>
      </div>

      {/* 2. Command Deck Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        
        {/* Left: Visual Core (Image Gen) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
             {/* Key Metrics Row */}
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard 
                    title="Processing" 
                    value={`${telemetry.cpu.toFixed(0)}%`} 
                    subtext="Load Average" 
                    icon={Cpu} 
                    color="#9d4edd" 
                  />
                  <MetricCard 
                    title="Network" 
                    value={`${telemetry.net.toFixed(1)} GB/s`} 
                    subtext="Throughput" 
                    icon={Network} 
                    color="#22d3ee" 
                  />
                   <MetricCard 
                    title="Memory" 
                    value={`${telemetry.mem.toFixed(0)}%`} 
                    subtext="Allocation" 
                    icon={Database} 
                    color="#f59e0b" 
                  />
                   <MetricCard 
                    title="Security" 
                    value="99.9%" 
                    subtext="Integrity" 
                    icon={Lock} 
                    color="#42be65" 
                  />
             </div>

            <div className="flex-1 bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg relative overflow-hidden group min-h-[400px] shadow-lg flex flex-col">
                 {/* Window Controls Decor */}
                 <div className="h-8 border-b border-[#1f1f1f] bg-[#111] flex items-center justify-between px-4">
                     <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider flex items-center gap-2">
                         <ScanFace className="w-3 h-3" /> Visual Core Interface
                     </span>
                     <div className="flex gap-1.5">
                         <div className="w-2 h-2 rounded-full bg-[#333]"></div>
                         <div className="w-2 h-2 rounded-full bg-[#333]"></div>
                     </div>
                 </div>

                 <div className="flex-1 relative overflow-hidden bg-black/50">
                     {dashboard.identityUrl ? (
                        <div className="relative w-full h-full group-hover:scale-[1.01] transition-transform duration-700">
                            <img src={dashboard.identityUrl} alt="Identity" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-transparent"></div>
                            
                            {/* HUD Overlay */}
                            <div className="absolute top-4 left-4 border border-white/20 bg-black/40 backdrop-blur px-3 py-1 text-[9px] font-mono text-white rounded-full">
                                CAM_01 :: LIVE
                            </div>

                            <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                                <div>
                                    <div className="text-[#9d4edd] text-[10px] font-mono uppercase mb-1 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-[#9d4edd] animate-pulse"></div>
                                        Identity Matrix
                                    </div>
                                    <div className="text-white text-xl font-bold tracking-tight">Command Center Prime</div>
                                </div>
                                <button 
                                    onClick={generateIdentity}
                                    className="bg-[#0a0a0a]/90 backdrop-blur border border-[#9d4edd] text-[#9d4edd] px-4 py-2 text-[10px] font-mono uppercase tracking-wider hover:bg-[#9d4edd] hover:text-black transition-all shadow-[0_0_15px_rgba(157,78,221,0.2)]"
                                >
                                    <RefreshCw className="w-3 h-3 inline mr-2" />
                                    Re-Materialize
                                </button>
                            </div>
                        </div>
                     ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center relative p-8">
                            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(157,78,221,0.03)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%,100%_100%] animate-[backgroundPosition_20s_ease_infinite]"></div>
                            
                            {/* Empty State Scanner */}
                            <div className="w-32 h-32 border border-[#333] rounded-full flex items-center justify-center relative mb-6">
                                <div className="absolute inset-0 border-t border-[#9d4edd] rounded-full animate-spin"></div>
                                <ImageIcon className="w-10 h-10 text-[#333]" />
                            </div>
                            
                            <h3 className="text-white font-mono uppercase tracking-widest text-sm mb-2">Visual Core Offline</h3>
                            <p className="text-gray-500 text-xs font-mono mb-8 max-w-sm text-center">
                                Establish visual identity parameters to initialize the command deck projection.
                            </p>
                            
                             <div className="flex flex-col gap-4 items-center z-10">
                                {dashboard.referenceImage && (
                                    <div className="flex items-center gap-2 text-[10px] font-mono text-[#9d4edd] bg-[#9d4edd]/10 px-3 py-1.5 rounded border border-[#9d4edd]/20">
                                        <ImageIcon className="w-3 h-3" />
                                        {dashboard.referenceImage.name}
                                        <button onClick={removeReference} className="hover:text-white ml-2"><X className="w-3 h-3" /></button>
                                    </div>
                                )}
                                <div className="flex gap-3">
                                    <label className="cursor-pointer bg-[#111] border border-[#333] text-gray-400 px-5 py-2.5 text-[10px] font-mono uppercase tracking-wider hover:border-[#9d4edd] hover:text-[#9d4edd] transition-all rounded-sm">
                                        <input type="file" onChange={handleReferenceUpload} className="hidden" accept="image/*" />
                                        Upload Scope
                                    </label>
                                    <button 
                                        onClick={generateIdentity}
                                        disabled={dashboard.isGenerating}
                                        className="bg-[#9d4edd] text-black px-6 py-2.5 text-[10px] font-bold font-mono uppercase tracking-wider hover:bg-[#b06bf7] disabled:opacity-50 transition-all flex items-center rounded-sm shadow-lg"
                                    >
                                        {dashboard.isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" /> : <Sparkles className="w-3.5 h-3.5 mr-2" />}
                                        Initialize System
                                    </button>
                                </div>
                             </div>
                        </div>
                     )}
                 </div>
            </div>
        </div>

        {/* Right: Telemetry & Logs */}
        <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Live Chart Section */}
            <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg p-4 h-64 flex flex-col shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#9d4edd]" />
                        <h3 className="text-xs font-bold font-mono text-gray-300 uppercase">System Vitality</h3>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-0.5 bg-[#9d4edd]"></div>
                            <span className="text-[9px] font-mono text-gray-500">CPU</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-0.5 bg-[#22d3ee]"></div>
                            <span className="text-[9px] font-mono text-gray-500">NET</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex-1 w-full min-h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={history}>
                            <defs>
                                <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#9d4edd" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#9d4edd" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="time" hide />
                            <YAxis hide domain={[0, 100]} />
                            <RechartsTooltip 
                                contentStyle={{ backgroundColor: '#111', borderColor: '#333', fontSize: '10px', fontFamily: 'Fira Code' }}
                                itemStyle={{ color: '#ccc' }}
                            />
                            <Area type="monotone" dataKey="cpu" stroke="#9d4edd" fillOpacity={1} fill="url(#colorCpu)" strokeWidth={2} isAnimationActive={false} />
                            <Area type="monotone" dataKey="net" stroke="#22d3ee" fillOpacity={1} fill="url(#colorNet)" strokeWidth={2} isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Agent Status Grid */}
            <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg p-4 shadow-lg">
                 <div className="flex justify-between items-center mb-3">
                     <h3 className="text-xs font-bold font-mono text-gray-300 uppercase flex items-center gap-2">
                         <Users className="w-3.5 h-3.5 text-gray-500" /> Active Agents
                     </h3>
                     <span className="text-[9px] font-mono text-[#42be65] bg-[#42be65]/10 px-1.5 py-0.5 rounded border border-[#42be65]/20">
                         {telemetry.agents.filter(a => a === 1).length} ONLINE
                     </span>
                 </div>
                 <div className="grid grid-cols-6 gap-2">
                     {telemetry.agents.map((status, i) => (
                         <div key={i} className="aspect-square flex items-center justify-center relative group cursor-crosshair">
                             <Hexagon 
                                className={`w-full h-full transition-all duration-500 ${status === 1 ? 'text-[#9d4edd] fill-[#9d4edd]/10' : 'text-[#222] fill-[#111]'}`} 
                                strokeWidth={1.5}
                             />
                             <div className={`absolute inset-0 flex items-center justify-center text-[8px] font-mono font-bold ${status === 1 ? 'text-white' : 'text-gray-700'}`}>
                                 {i + 1}
                             </div>
                             {status === 1 && <div className="absolute inset-0 bg-[#9d4edd] blur-lg opacity-20"></div>}
                         </div>
                     ))}
                 </div>
            </div>

            {/* System Log Console */}
            <div className="flex-1 bg-black border border-[#1f1f1f] rounded-lg p-3 flex flex-col font-mono text-[10px] overflow-hidden relative shadow-inner">
                <div className="absolute top-0 right-0 p-2 opacity-50">
                    <Terminal className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1 flex flex-col justify-end space-y-1">
                    {logs.map((log, i) => (
                        <div key={i} className="flex gap-2 animate-in slide-in-from-left-2 fade-in duration-300">
                             <span className="text-gray-600">{log.split(']')[0]}]</span>
                             <span className={log.includes('ERROR') ? 'text-red-500' : log.includes('WARN') ? 'text-amber-500' : 'text-[#42be65]'}>
                                 {log.split(']')[1]}
                             </span>
                        </div>
                    ))}
                    <div className="flex gap-2 text-[#9d4edd] animate-pulse">
                        <span>{'>'}</span>
                        <span className="w-2 h-4 bg-[#9d4edd]"></span>
                    </div>
                </div>
            </div>

        </div>
      </div>

      {/* 3. Protocols Footer */}
      <div>
         <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#9d4edd]" />
                <h2 className="text-xs font-bold font-mono uppercase tracking-widest text-white">Active Protocol Matrix</h2>
            </div>
            <button className="text-[10px] font-mono text-gray-500 hover:text-white uppercase transition-colors">View All Logs</button>
        </div>
        
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg overflow-hidden shadow-lg">
            <div className="grid grid-cols-12 bg-[#111] border-b border-[#1f1f1f] py-3 px-4">
                <div className="col-span-5 text-[9px] font-mono uppercase text-gray-500 tracking-wider">Protocol Designation</div>
                <div className="col-span-3 text-[9px] font-mono uppercase text-gray-500 tracking-wider">Type</div>
                <div className="col-span-2 text-[9px] font-mono uppercase text-gray-500 tracking-wider">Status</div>
                <div className="col-span-2 text-[9px] font-mono uppercase text-gray-500 tracking-wider text-right">Uplink</div>
            </div>
            
            {[
                { name: 'Mermaid Visualization Engine', type: 'CORE INFRA', status: 'ACTIVE', color: 'text-[#42be65]', bg: 'bg-[#42be65]/10 border-[#42be65]/20' },
                { name: 'Gemini 3 Pro Image Gen', type: 'GENERATIVE', status: 'DEPLOYED', color: 'text-[#22d3ee]', bg: 'bg-[#22d3ee]/10 border-[#22d3ee]/20' },
                { name: 'Tactical Oracle (Chat)', type: 'INTELLIGENCE', status: 'ONLINE', color: 'text-[#42be65]', bg: 'bg-[#42be65]/10 border-[#42be65]/20' },
                { name: 'Deep Dive TTS Audio', type: 'SYNTHESIS', status: 'STANDBY', color: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]/10 border-[#f59e0b]/20' },
                { name: 'Contextual Memory Bridge', type: 'R&D', status: 'IN DEV', color: 'text-[#8d8d8d]', bg: 'bg-[#8d8d8d]/10 border-[#8d8d8d]/20' },
            ].map((row, i) => (
                <div key={i} className="grid grid-cols-12 py-3 px-4 border-b border-[#1f1f1f] last:border-0 hover:bg-[#151515] transition-colors items-center group cursor-pointer">
                    <div className="col-span-5 text-xs font-bold text-gray-300 font-mono group-hover:text-white transition-colors flex items-center gap-2">
                        {i === 0 && <div className="w-1.5 h-1.5 rounded-full bg-[#42be65] animate-pulse"></div>}
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
                    <div className="col-span-2 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowUpRight className="w-3.5 h-3.5 text-[#9d4edd] ml-auto" />
                    </div>
                </div>
            ))}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
