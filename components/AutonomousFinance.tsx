import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    DollarSign, TrendingUp, Zap, Activity, Globe, Loader2, 
    RefreshCw, ShieldCheck, Target, GitMerge, BarChart3,
    ArrowUpRight, Binary, Cpu, Wallet, Compass, Search,
    Lock, CheckCircle, Info, TrendingDown, Layers, Terminal,
    LineChart as ChartIcon, Coins, Landmark, Briefcase, 
    ShieldAlert, Network, Share2, ArrowRight, Server, Radio, Shield,
    CheckCircle2, AlertTriangle, PlayCircle, X
} from 'lucide-react';
import { useAppStore } from '../store';
import { searchRealWorldOpportunities, promptSelectKey, assessInvestmentRisk } from '../services/geminiService';
import { audio } from '../services/audioService';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, CartesianGrid } from 'recharts';

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

const InvestmentQueue = () => {
    const { marketData, commitInvestment, addLog } = useAppStore();
    const [evaluations, setEvaluations] = useState<Record<string, any>>({});
    const [isEvaluating, setIsEvaluating] = useState<string | null>(null);

    const runEvaluation = async (id: string) => {
        const op = marketData.opportunities.find(o => o.id === id);
        if (!op) return;
        
        setIsEvaluating(id);
        addLog('SYSTEM', `TREASURY_EVAL: Running risk assessment on [${op.title}]...`);
        try {
            if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); return; }
            const result = await assessInvestmentRisk(op, { tvl: 1420500 });
            setEvaluations(prev => ({ ...prev, [id]: result }));
            addLog('SUCCESS', `TREASURY_EVAL: ${result.verdict} verdict stabilized for ${op.title}.`);
            audio.playSuccess();
        } catch (e) {
            addLog('ERROR', 'EVAL_FAIL: Oracles offline.');
        } finally {
            setIsEvaluating(null);
        }
    };

    const handleCommit = (id: string) => {
        const evalData = evaluations[id];
        if (!evalData) return;
        commitInvestment(id, evalData.adjustedAmount || 50000);
        addLog('SUCCESS', `TREASURY_EXEC: Disbursed capital to ${id}. Cycle locked.`);
        audio.playSuccess();
    };

    return (
        <div className="bg-black border border-white/5 rounded-[3rem] flex flex-col h-full overflow-hidden shadow-inner group">
            <div className="h-14 border-b border-white/5 bg-white/[0.02] flex items-center px-8 justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-[#10b981]/10 rounded-xl text-[#10b981]">
                        <GitMerge size={16} />
                    </div>
                    <span className="text-[11px] font-black font-mono text-white uppercase tracking-[0.4em]">Investment Handover Queue</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                    <span className="text-[7px] font-mono text-gray-600">INBOUND_VECTORS: {marketData.opportunities.length}</span>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">
                <AnimatePresence mode="popLayout">
                    {marketData.opportunities.map((op) => {
                        const evalData = evaluations[op.id];
                        const busy = isEvaluating === op.id;

                        return (
                            <motion.div 
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, x: 100 }}
                                key={op.id}
                                className={`p-6 rounded-[2.5rem] border transition-all duration-700
                                    ${evalData?.verdict === 'APPROVE' ? 'bg-[#0a2a0a] border-[#10b981]/30 shadow-[0_0_40px_rgba(16,185,129,0.1)]' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex-1">
                                        <h4 className="text-lg font-black text-white uppercase font-mono tracking-tighter mb-2">{op.title}</h4>
                                        <p className="text-[10px] text-gray-500 font-mono leading-relaxed line-clamp-2 italic">"{op.logic}"</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest block mb-1">Projected Yield</span>
                                        <span className="text-xl font-black font-mono text-[#10b981]">{op.yield}</span>
                                    </div>
                                </div>

                                <AnimatePresence mode="wait">
                                    {evalData ? (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="pt-6 border-t border-white/5 space-y-6 overflow-hidden">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                                                    <span className="text-[8px] font-mono text-gray-600 uppercase mb-2 block">Allocated Capital</span>
                                                    <span className="text-lg font-black font-mono text-white">${evalData.adjustedAmount?.toLocaleString()}</span>
                                                </div>
                                                <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                                                    <span className="text-[8px] font-mono text-gray-600 uppercase mb-2 block">Payback Cycle</span>
                                                    <span className="text-lg font-black font-mono text-[#22d3ee]">{evalData.expectedPaybackDays} Cycles</span>
                                                </div>
                                            </div>
                                            <div className="p-4 bg-black/60 rounded-2xl border border-white/5 flex gap-4 items-start">
                                                <Info size={14} className="text-[#9d4edd] shrink-0 mt-0.5" />
                                                <p className="text-[9px] font-mono text-gray-400 leading-relaxed uppercase">{evalData.logic}</p>
                                            </div>
                                            <div className="flex gap-4">
                                                <button 
                                                    onClick={() => handleCommit(op.id)}
                                                    className="flex-1 py-4 bg-[#10b981] text-black font-black uppercase text-[9px] tracking-[0.3em] rounded-2xl hover:bg-[#34d399] transition-all shadow-[0_0_20px_#10b98140]"
                                                >
                                                    Authorize Allocation
                                                </button>
                                                <button 
                                                    onClick={() => setEvaluations(prev => { const n = {...prev}; delete n[op.id]; return n; })}
                                                    className="px-6 py-4 bg-white/5 text-gray-500 rounded-2xl hover:text-white transition-all"
                                                >
                                                    {/* Fix: Cannot find name 'X'. Imported from lucide-react. */}
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <div className="flex gap-4">
                                            <button 
                                                /* Fix: Cannot find name 'runArchitecture'. Changed to 'runEvaluation'. */
                                                onClick={() => runEvaluation(op.id)}
                                                disabled={busy}
                                                className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[9px] font-black uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-3 active:scale-95"
                                            >
                                                {busy ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={14} />}
                                                Run Risk Evaluation
                                            </button>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
                {marketData.opportunities.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-10 text-center space-y-8 select-none">
                        <Radio size={80} className="text-gray-500 animate-pulse" />
                        <div>
                            <p className="text-xl font-mono uppercase tracking-[0.8em]">Queue Offline</p>
                            <p className="text-[10px] font-mono mt-4 uppercase tracking-[0.4em]">Establish strategic link in the Bridge to push opportunities</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const AutonomousFinance: React.FC = () => {
    const { addLog, setMetaventionsState, metaventions } = useAppStore();
    const { layers, activeLayerId, strategyLibrary } = metaventions;
    const activeLayer = layers.find(l => l.id === activeLayerId);
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
            // Ensure they have stable IDs
            const sanitized = results.map((r: any, i: number) => ({ ...r, id: `external-${activeDomain}-${Date.now()}-${i}` }));
            useAppStore.setState(s => ({ marketData: { ...s.marketData, opportunities: [...sanitized, ...s.marketData.opportunities].slice(0, 15) } }));
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
                            <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-2 block">Autonomous Treasury Management // LATTICE_ALPHA</span>
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
                                            <linearGradient id="yieldColor" x1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="volColor" x1="0" x2="0" y2="1">
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

                    <div className="grid grid-cols-12 gap-8 flex-1 min-h-[500px] mb-12">
                        <div className="col-span-12 flex flex-col h-full">
                            <InvestmentQueue />
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
                        <div className="flex justify-between items-center text-[11px] font-black font-mono text-gray-600 mb-4 uppercase tracking-widest">
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
