
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    DollarSign, TrendingUp, Zap, Activity, Globe, Loader2, 
    RefreshCw, ShieldCheck, Target, GitMerge, BarChart3,
    ArrowUpRight, Binary, Cpu, Wallet, Compass, Search,
    Lock, CheckCircle, Info, TrendingDown, Layers, Terminal,
    LineChart as ChartIcon, Coins, Landmark, Briefcase, 
    ShieldAlert, Network, Share2, ArrowRight, Server, Radio, Shield
} from 'lucide-react';
import { useAppStore } from '../store';
import { searchRealWorldOpportunities, promptSelectKey, fetchMarketIntelligence } from '../services/geminiService';
import { audio } from '../services/audioService';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, CartesianGrid } from 'recharts';

const LiveOpportunitiesTerminal = ({ opportunities }: { opportunities: any[] }) => {
    return (
        <div className="bg-black border border-white/5 rounded-2xl flex flex-col h-full overflow-hidden shadow-inner group">
            <div className="h-10 border-b border-white/5 bg-white/[0.02] flex items-center px-4 justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <Terminal size={12} className="text-[#10b981]" />
                    <span className="text-[9px] font-black font-mono text-gray-500 uppercase tracking-widest">Real-Time Signal Log</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                    <span className="text-[7px] font-mono text-gray-600">LIVE_FEED_L0</span>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 font-mono text-[10px] space-y-3">
                {opportunities.map((op, i) => (
                    <motion.div 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        key={i} 
                        className="flex gap-3 border-l border-[#10b981]/20 pl-3 py-1 hover:bg-white/[0.02] transition-colors"
                    >
                        <span className="text-gray-700 shrink-0">[{new Date().toLocaleTimeString().split(' ')[0]}]</span>
                        <span className="text-[#10b981] font-bold shrink-0">FOUND:</span>
                        <span className="text-gray-300 flex-1 italic">"{op.title}" // CONFIDENCE: {Math.round(Math.random() * 20 + 80)}%</span>
                        <span className="text-[#22d3ee] shrink-0">{op.yield}</span>
                    </motion.div>
                ))}
                {opportunities.length === 0 && (
                    <div className="h-full flex items-center justify-center opacity-20 italic">Awaiting strategic handshake...</div>
                )}
            </div>
        </div>
    );
};

const ProtocolNode = ({ name, yield: y, growth, icon: Icon, color }: any) => (
    <div className="p-4 bg-[#0a0a0a] border border-white/5 rounded-2xl hover:border-white/20 transition-all group relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
            <Icon size={48} />
        </div>
        <div className="flex items-center gap-4 mb-4">
            <div className="p-2 rounded-xl" style={{ backgroundColor: `${color}15`, color }}>
                <Icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-[11px] font-black text-white uppercase truncate">{name}</div>
                <div className="text-[8px] text-gray-600 font-mono uppercase tracking-tighter">Verified Protocol</div>
            </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
            <div className="p-2 bg-black/60 rounded-lg border border-white/5">
                <div className="text-[7px] text-gray-600 uppercase font-mono mb-1">Est. Yield</div>
                <div className="text-xs font-black font-mono text-[#10b981]">{y}</div>
            </div>
            <div className="p-2 bg-black/60 rounded-lg border border-white/5">
                <div className="text-[7px] text-gray-600 uppercase font-mono mb-1">Growth</div>
                <div className="text-xs font-black font-mono text-[#22d3ee]">+{growth}%</div>
            </div>
        </div>
    </div>
);

const AutonomousFinance: React.FC = () => {
    const { addLog, setMetaventionsState, metaventions } = useAppStore();
    const { layers, activeLayerId, strategyLibrary } = metaventions;
    const activeLayer = layers.find(l => l.id === activeLayerId);
    const [opportunities, setOpportunities] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [activeDomain, setActiveDomain] = useState<'DEPIN' | 'AI_COMPUTE' | 'ARBITRAGE'>('DEPIN');
    const [tvl, setTVL] = useState(1420500);

    const chartData = useMemo(() => Array.from({ length: 30 }, (_, i) => ({
        time: i,
        yield: 8 + Math.random() * 4 + (i * 0.15),
        volume: 400 + Math.random() * 200
    })), []);

    const fetchLiveOpportunities = async () => {
        setIsSearching(true);
        audio.playClick();
        addLog('SYSTEM', `FINANCE_SCAN: Grounding real-world strategies for ${activeDomain} via Gemini Search...`);
        
        try {
            if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); return; }
            const results = await searchRealWorldOpportunities(activeDomain);
            setOpportunities(results);
            addLog('SUCCESS', `FINANCE_SCAN: Captured ${results.length} actionable revenue vectors.`);
            audio.playSuccess();
        } catch (e) {
            addLog('ERROR', 'FINANCE_SCAN_FAIL: Signal interference in sector.');
        } finally {
            setIsSearching(false);
        }
    };

    useEffect(() => {
        fetchLiveOpportunities();
        const interval = setInterval(() => {
            setTVL(prev => prev + (Math.random() * 10 - 2));
        }, 3000);
        return () => clearInterval(interval);
    }, [activeDomain]);

    return (
        <div className="h-full w-full bg-[#020502] flex flex-col border border-[#1f331f] rounded-[3.5rem] overflow-hidden shadow-2xl relative font-sans">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.04)_0%,transparent_80%)] pointer-events-none" />
            
            {/* Professional Trading Header */}
            <div className="h-20 border-b border-white/5 bg-[#0a100a]/95 backdrop-blur-3xl z-20 flex items-center justify-between px-10 shrink-0 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#10b981]/40 to-transparent" />
                
                <div className="flex items-center gap-10">
                    <div className="flex items-center gap-5">
                        <div className="p-3 bg-[#10b981]/10 border border-[#10b981]/40 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                            <Landmark className="w-6 h-6 text-[#10b981]" />
                        </div>
                        <div>
                            <h1 className="text-base font-black font-mono uppercase tracking-[0.4em] text-white leading-none">Revenue Nexus</h1>
                            <span className="text-[10px] text-gray-600 font-mono uppercase tracking-widest mt-2 block">Autonomous Treasury Management // LATTICE_ALPHA</span>
                        </div>
                    </div>
                    
                    <div className="h-10 w-px bg-white/5" />
                    
                    <div className="flex items-center gap-2 bg-black/60 p-1.5 rounded-2xl border border-white/5">
                        {['DEPIN', 'AI_COMPUTE', 'ARBITRAGE'].map(domain => (
                            <button 
                                key={domain}
                                onClick={() => setActiveDomain(domain as any)}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                                    ${activeDomain === domain ? 'bg-[#10b981] text-black shadow-lg shadow-[#10b981]/20' : 'text-gray-500 hover:text-white'}
                                `}
                            >
                                {domain}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-10">
                    <div className="text-right">
                        <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest block mb-1">Vault AUM</span>
                        <div className="flex items-center gap-3">
                            <span className="text-2xl font-black font-mono text-white tracking-tighter">${tvl.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            <div className="flex flex-col items-end">
                                <span className="text-[8px] font-mono text-[#10b981] font-bold">+12.4%</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_10px_#10b981]" />
                            </div>
                        </div>
                    </div>
                    <button className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 text-gray-400 hover:text-white transition-all shadow-xl">
                        <Briefcase size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden h-full">
                {/* Stage: Market Intelligence & Yield Analytics */}
                <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar p-10 gap-10 relative">
                    
                    {/* Top Row: Chart & Revenue Ticker */}
                    <div className="grid grid-cols-12 gap-8 shrink-0">
                        <div className="col-span-8 bg-[#050a05] border border-white/5 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group">
                            <div className="flex items-center justify-between mb-10 relative z-10">
                                <div className="flex items-center gap-4">
                                    <ChartIcon size={20} className="text-[#10b981]" />
                                    <span className="text-xs font-black font-mono text-white uppercase tracking-widest">Yield Velocity Matrix</span>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#10b981]" /><span className="text-[9px] font-mono text-gray-500 uppercase">Yield</span></div>
                                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#22d3ee]" /><span className="text-[9px] font-mono text-gray-500 uppercase">Volume</span></div>
                                </div>
                            </div>
                            <div className="h-64 mt-10 relative z-10">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="yieldColor" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="volColor" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.1}/>
                                                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                        <Area type="monotone" dataKey="yield" stroke="#10b981" fill="url(#yieldColor)" strokeWidth={3} />
                                        <Area type="monotone" dataKey="volume" stroke="#22d3ee" fill="url(#volColor)" strokeWidth={1} />
                                        <Tooltip contentStyle={{ backgroundColor: '#050505', borderColor: '#1f331f', fontSize: '10px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="col-span-4 flex flex-col gap-6">
                            <div className="flex-1 bg-[#050a05] border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-between relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12 group-hover:opacity-10 transition-opacity"><Zap size={100} /></div>
                                <div>
                                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-4">Neural Arbitrage Status</span>
                                    <div className="flex items-center gap-4">
                                        <Activity size={32} className="text-[#22d3ee] animate-pulse" />
                                        <span className="text-4xl font-black font-mono text-white tracking-tighter">98.2%</span>
                                    </div>
                                </div>
                                <div className="mt-8 space-y-3">
                                    <div className="flex justify-between text-[9px] font-mono text-gray-500 uppercase"><span>Sync Precision</span><span>MAX_STABLE</span></div>
                                    <div className="h-1 bg-white/5 rounded-full overflow-hidden shadow-inner">
                                        <motion.div animate={{ width: '98%' }} className="h-full bg-[#10b981]" />
                                    </div>
                                    <div className="text-[7px] text-gray-700 font-mono uppercase tracking-widest italic">Grounding verified via 12 Decentralized Oracles</div>
                                </div>
                            </div>
                            <button 
                                onClick={fetchLiveOpportunities} 
                                disabled={isSearching}
                                className="h-24 bg-[#10b981] hover:bg-[#34d399] text-black rounded-[2rem] shadow-[0_30px_60px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-6 active:scale-95 group overflow-hidden relative"
                            >
                                <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                {isSearching ? <Loader2 size={28} className="animate-spin" /> : <RefreshCw size={28} className="group-hover:rotate-180 transition-transform duration-1000" />}
                                <span className="text-sm font-black uppercase tracking-[0.6em] relative z-10">Forge Real Signals</span>
                            </button>
                        </div>
                    </div>

                    {/* Middle Row: Opportunities and Protocol Monitor */}
                    <div className="grid grid-cols-12 gap-8 flex-1 min-h-[500px]">
                        <div className="col-span-7 flex flex-col gap-6 h-full">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-4">
                                    <Compass size={18} className="text-[#10b981]" />
                                    <h2 className="text-sm font-black font-mono text-white uppercase tracking-[0.3em]">Alpha Opportunity Map</h2>
                                </div>
                                <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest flex items-center gap-2">
                                    <ShieldCheck size={12} className="text-[#10b981]" /> Grounded Intelligence
                                </span>
                            </div>

                            <AnimatePresence mode="wait">
                                {isSearching ? (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[3.5rem] opacity-40 gap-10">
                                        <div className="relative">
                                            <div className="w-24 h-24 rounded-full border-4 border-t-[#10b981] border-white/5 animate-spin" />
                                            <div className="absolute inset-0 blur-3xl bg-[#10b981]/20 animate-pulse" />
                                        </div>
                                        <div className="text-center space-y-3">
                                            <p className="text-2xl font-black font-mono text-white uppercase tracking-[1em] animate-pulse">Syncing Lattice...</p>
                                            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.4em]">Crawling Global Physical Resources</p>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-6 pb-10">
                                        {opportunities.map((op, i) => (
                                            <motion.div 
                                                key={i} 
                                                initial={{ opacity: 0, y: 20 }} 
                                                animate={{ opacity: 1, y: 0 }} 
                                                transition={{ delay: i * 0.1 }}
                                                className="p-8 bg-[#0a100a] border border-white/5 rounded-[3rem] hover:border-[#10b981]/40 transition-all duration-700 group/card relative overflow-hidden shadow-2xl"
                                            >
                                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover/card:opacity-[0.08] transition-opacity rotate-12"><Target size={120} /></div>
                                                <div className="flex justify-between items-start mb-10 relative z-10">
                                                    <div className={`px-5 py-2 rounded-full border text-[9px] font-black uppercase tracking-widest shadow-lg
                                                        ${op.risk === 'HIGH' ? 'bg-red-500/10 border-red-500/40 text-red-400' : 'bg-[#10b981]/10 border-[#10b981]/40 text-[#10b981]'}
                                                    `}>
                                                        {op.type} // {op.risk} RISK
                                                    </div>
                                                    <a href={op.source_uri} target="_blank" rel="noopener noreferrer" className="p-2.5 text-gray-700 hover:text-white transition-all bg-white/5 border border-white/5 rounded-xl hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-90"><ArrowUpRight size={18}/></a>
                                                </div>
                                                <h3 className="text-2xl font-black text-white uppercase font-mono tracking-tighter mb-4 group-hover/card:text-[#10b981] transition-colors leading-tight">{op.title}</h3>
                                                <p className="text-xs text-gray-500 font-mono leading-relaxed mb-10 line-clamp-4 italic">"{op.potential}"</p>
                                                <div className="mt-auto pt-8 border-t border-white/5 flex items-center justify-between relative z-10">
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-[10px] font-black font-mono text-[#10b981] uppercase tracking-[0.2em]">{op.yield} APY</div>
                                                    </div>
                                                    <button className="text-[10px] font-black font-mono text-gray-600 hover:text-white uppercase tracking-widest flex items-center gap-2 group/link">
                                                        Inject_Vector <ArrowRight size={12} className="group-hover/link:translate-x-1 transition-transform" />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="col-span-5 flex flex-col gap-6">
                            <div className="flex items-center gap-4 px-2">
                                <Network size={18} className="text-[#22d3ee]" />
                                <h2 className="text-sm font-black font-mono text-white uppercase tracking-[0.3em]">Protocol Stacks</h2>
                            </div>
                            <div className="flex-1 bg-[#050505] border border-white/5 rounded-[3rem] p-8 space-y-6 shadow-2xl relative overflow-hidden">
                                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-10 pointer-events-none" />
                                
                                <div className="space-y-4 h-full overflow-y-auto custom-scrollbar pr-2">
                                    <ProtocolNode name="Akash Compute" yield="14.2%" growth="22" icon={Server} color="#ef4444" />
                                    <ProtocolNode name="Helium Mesh" yield="8.4%" growth="5" icon={Radio} color="#22d3ee" />
                                    <ProtocolNode name="Hivemapper Map" yield="18.9%" growth="41" icon={Target} color="#f59e0b" />
                                    <ProtocolNode name="Render Token" yield="12.1%" growth="18" icon={Cpu} color="#d946ef" />
                                    <ProtocolNode name="Qubic POUW" yield="24.5%" growth="64" icon={Binary} color="#10b981" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Tactical Treasury Sidepanel */}
                <div className="w-[420px] border-l border-[#1f331f] bg-[#050805] flex flex-col shrink-0 z-30 relative shadow-2xl">
                    <div className="p-10 border-b border-white/5 bg-white/[0.01]">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-4">
                                <Binary size={20} className="text-[#10b981]" />
                                <h2 className="text-sm font-black text-white uppercase tracking-[0.4em]">Resource Flow</h2>
                            </div>
                            <div className="px-3 py-1 bg-[#10b981]/10 rounded-full border border-[#10b981]/30">
                                <span className="text-[9px] font-mono text-[#10b981] font-bold">STABLE</span>
                            </div>
                        </div>
                        <div className="space-y-8">
                            {[
                                { label: 'Compute Arb Engine', val: 42, color: '#10b981', status: 'Optimizing' },
                                { label: 'Liquidity Bridge', val: 28, color: '#22d3ee', status: 'Synced' },
                                { label: 'Strategic Reserves', val: 15, color: '#9d4edd', status: 'Hedged' },
                                { label: 'Operational Buffer', val: 15, color: '#f59e0b', status: 'Locked' }
                            ].map(item => (
                                <div key={item.label} className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black font-mono text-gray-300 uppercase tracking-widest mb-1">{item.label}</span>
                                            <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">{item.status}</span>
                                        </div>
                                        <span className="text-xl font-black font-mono text-white tracking-tighter">{item.val}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${item.val}%` }} className="h-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: item.color, color: item.color }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
                        <div className="space-y-4">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] px-2 block">Live Yield Analysis</span>
                            <div className="h-40 bg-black/40 rounded-[2.5rem] border border-white/5 p-6 shadow-inner relative overflow-hidden group/mini">
                                <div className="absolute inset-0 bg-gradient-to-t from-[#10b981]/5 to-transparent opacity-0 group-hover/mini:opacity-100 transition-opacity" />
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData.slice(-10)}>
                                        <Bar dataKey="yield" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="p-8 bg-[#0a100a] border border-[#10b981]/20 rounded-[3rem] relative overflow-hidden group/audit shadow-2xl">
                            <div className="absolute top-0 right-0 p-6 opacity-[0.05] group-hover/audit:opacity-[0.1] transition-opacity rotate-12"><ShieldCheck size={80} /></div>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-2 bg-[#10b981]/20 rounded-xl text-[#10b981]">
                                    <Shield size={16} />
                                </div>
                                <h4 className="text-[11px] font-black text-white uppercase tracking-[0.4em]">Autonomic Compliance</h4>
                            </div>
                            <p className="text-xs text-gray-400 font-mono leading-relaxed italic border-l-2 border-[#10b981]/40 pl-6">
                                "Sovereign Treasury architecture maintains real-time multi-sig attestations. All yield vectors are grounded via Google Search and cross-referenced with on-chain oracles."
                            </p>
                            <div className="mt-8 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_10px_#10b981]" />
                                    <span className="text-[10px] font-mono text-gray-500 uppercase">Audit: PASSED</span>
                                </div>
                                <span className="text-[9px] font-mono text-gray-700">2m ago</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] px-2 block">Economic Enclaves</span>
                            <div className="space-y-3">
                                {[
                                    { id: 'ARB_DELTA_0', vol: '$12.4M', yield: '+14.2%', color: '#10b981' },
                                    { id: 'LIQ_MESH_9', vol: '$8.2M', yield: '+9.1%', color: '#22d3ee' }
                                ].map(p => (
                                    <div key={p.id} className="p-6 bg-black/60 border border-white/5 rounded-3xl flex items-center justify-between group hover:border-[#10b981]/30 transition-all cursor-default shadow-lg">
                                        <div className="flex items-center gap-5">
                                            <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: p.color, color: p.color }} />
                                            <div>
                                                <div className="text-[11px] font-black text-white uppercase font-mono tracking-widest">{p.id}</div>
                                                <div className="text-[8px] text-gray-600 font-mono mt-1">VOL: {p.vol}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[12px] font-black font-mono text-[#10b981]">{p.yield}</div>
                                            <div className="text-[8px] text-gray-700 font-mono uppercase tracking-widest">ACTIVE</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="p-10 border-t border-white/5 bg-black/80 shrink-0 space-y-6">
                        <div className="flex justify-between items-center text-[11px] font-black font-mono text-gray-500 uppercase tracking-widest">
                            <span>OS Revenue Velocity</span>
                            <span className="text-[#10b981] animate-pulse">+$542.80/hr</span>
                        </div>
                        <div className="h-2 w-full bg-[#111] rounded-full overflow-hidden border border-white/5 p-0.5 shadow-inner">
                            <motion.div initial={{ width: 0 }} animate={{ width: '84%' }} transition={{ duration: 1.5 }} className="h-full bg-gradient-to-r from-[#10b981] via-[#22d3ee] to-[#9d4edd] shadow-[0_0_20px_rgba(16,185,129,0.5)] rounded-full" />
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[9px] font-mono text-gray-700 uppercase tracking-[0.2em]">Lattice Persistence</span>
                            <span className="text-[11px] font-black font-mono text-white">99.98%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tactical Hud Display Footer */}
            <div className="h-14 bg-[#0a100a] border-t border-[#1f331f] px-12 flex items-center justify-between text-[11px] font-mono text-gray-600 shrink-0 relative z-[60]">
                <div className="flex gap-16 items-center overflow-x-auto no-scrollbar whitespace-nowrap">
                    <div className="flex items-center gap-5 text-[#10b981] font-black uppercase tracking-[0.3em]">
                        <Lock size={18} className="shadow-[0_0_20px_#10b981]" /> Financial_Vault_Secured
                    </div>
                    <div className="flex items-center gap-5 uppercase tracking-[0.5em]">
                        <Globe size={18} className="text-[#22d3ee]" /> Market_Grounding: ACTIVE
                    </div>
                    <div className="flex items-center gap-5 uppercase tracking-[0.5em]">
                        <Activity size={18} className="text-[#f59e0b]" /> Neural_Arb_Thread: STABLE
                    </div>
                </div>
                <div className="flex items-center gap-12 shrink-0">
                    <span className="uppercase tracking-[0.8em] opacity-40 leading-none hidden lg:block text-[10px]">Autonomous Finance v9.0-ZENITH // Real-World Resource Orchestration</span>
                    <div className="h-6 w-px bg-white/10 hidden lg:block" />
                    <span className="font-black text-gray-400 uppercase tracking-[0.4em] leading-none text-[11px]">TREASURY_SYSTEM_CORE</span>
                </div>
            </div>
        </div>
    );
};

export default AutonomousFinance;
