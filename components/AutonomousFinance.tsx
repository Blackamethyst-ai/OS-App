import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    DollarSign, TrendingUp, Zap, Activity, Globe, Loader2, 
    RefreshCw, ShieldCheck, Target, GitMerge, BarChart3,
    ArrowUpRight, Binary, Cpu, Wallet, Compass, Search,
    Lock, CheckCircle, Info, TrendingDown, Layers, Terminal,
    LineChart as ChartIcon, Coins, Landmark, Briefcase, 
    ShieldAlert, Network, Share2, ArrowRight, Server, Radio, Shield,
    CheckCircle2, AlertTriangle, PlayCircle, X, ArrowDownRight,
    ArrowUp, Percent, ChevronRight, Fingerprint, Flame, PieChart,
    ArrowLeftRight, FileText, Gauge, BarChart, History, ScatterChart,
    Database, BrainCircuit
} from 'lucide-react';
import { useAppStore } from '../store';
import { searchRealWorldOpportunities, promptSelectKey, assessInvestmentRisk } from '../services/geminiService';
import { audio } from '../services/audioService';
import { 
    AreaChart, Area, XAxis, YAxis, ResponsiveContainer, 
    Tooltip, BarChart as ReBarChart, Bar, CartesianGrid, 
    LineChart, Line, ScatterChart as ReScatterChart, Scatter, ZAxis
} from 'recharts';

// --- SUB-COMPONENTS ---

const ResourceFlowVisualizer = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let frame = 0;
        const particles: any[] = [];
        const spawnPoint = { x: 50, y: 0 };
        const endPoint = { x: 0, y: 0 };

        const render = () => {
            frame++;
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            spawnPoint.y = canvas.height / 2;
            endPoint.x = canvas.width - 50;
            endPoint.y = canvas.height / 2;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ctx.beginPath();
            ctx.moveTo(spawnPoint.x, spawnPoint.y);
            ctx.lineTo(endPoint.x, endPoint.y);
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.1)';
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);

            if (frame % 10 === 0) {
                particles.push({
                    x: spawnPoint.x,
                    y: spawnPoint.y,
                    speed: 1 + Math.random() * 2,
                    size: 1 + Math.random() * 2
                });
            }

            particles.forEach((p, i) => {
                p.x += p.speed;
                ctx.beginPath();
                ctx.arc(p.x, p.y + Math.sin(p.x * 0.05) * 5, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(16, 185, 129, ${1 - (p.x / canvas.width)})`;
                ctx.fill();

                if (p.x > endPoint.x) particles.splice(i, 1);
            });

            requestAnimationFrame(render);
        };
        const anim = requestAnimationFrame(render);
        return () => cancelAnimationFrame(anim);
    }, []);

    return <canvas ref={canvasRef} className="w-full h-12 opacity-40" />;
};

const FinanceMetric = ({ label, value, trend, icon: Icon, color }: any) => (
    <div className="bg-[var(--bg-card-top)] border border-[var(--border-main)] rounded-2xl p-5 group hover:border-[#10b981]/30 transition-all shadow-xl flex flex-col gap-3">
        <div className="flex justify-between items-start">
            <div className="p-2.5 rounded-xl bg-black/5 text-gray-400 group-hover:text-[var(--text-primary)] transition-all">
                <Icon size={18} style={{ color: trend > 0 ? '#10b981' : color }} />
            </div>
            <div className={`flex items-center gap-1 text-[10px] font-black font-mono ${trend > 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                {trend > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {Math.abs(trend)}%
            </div>
        </div>
        <div>
            <div className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{label}</div>
            <div className="text-2xl font-black font-mono text-[var(--text-primary)] tracking-tighter">{value}</div>
        </div>
    </div>
);

// --- MAIN SECTOR ---

const AutonomousFinance: React.FC = () => {
    const { addLog, setMetaventionsState, metaventions, marketData, commitInvestment, theme } = useAppStore();
    const { layers, activeLayerId, strategyLibrary, strategyLog } = metaventions;
    const [activeSector, setActiveSector] = useState<'OVERVIEW' | 'YIELD_OPS' | 'LIQUIDITY'>('OVERVIEW');
    const [isSearching, setIsSearching] = useState(false);
    const [tvl, setTVL] = useState(1420500);
    const [confirmingOp, setConfirmingOp] = useState<any | null>(null);
    const [yieldStrategy, setYieldStrategy] = useState<'AGGRESSIVE' | 'STABLE' | 'DEPIN'>('STABLE');

    const chartData = useMemo(() => Array.from({ length: 30 }, (_, i) => ({
        time: i,
        yield: yieldStrategy === 'AGGRESSIVE' ? 12 + Math.random() * 8 : yieldStrategy === 'DEPIN' ? 6 + Math.random() * 4 : 8 + Math.random() * 4,
        utilization: 60 + Math.random() * 20
    })), [yieldStrategy]);

    const scatterData = useMemo(() => Array.from({ length: 20 }, (_, i) => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        z: Math.random() * 100,
        id: i
    })), []);

    const fetchLiveOpportunities = async () => {
        setIsSearching(true);
        audio.playClick();
        addLog('SYSTEM', 'FINANCE_SCAN: Re-evaluating DePIN resource vectors via Google Search Grounding...');
        try {
            if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); return; }
            const results = await searchRealWorldOpportunities('High Yield DePIN Assets 2025');
            const sanitized = results.map((r: any, i: number) => ({ ...r, id: `ext-${Date.now()}-${i}`, fee: 0.05 }));
            useAppStore.setState(s => ({ marketData: { ...s.marketData, opportunities: sanitized.slice(0, 8), lastSync: Date.now() } }));
            addLog('SUCCESS', `FINANCE_SCAN: Synchronized ${results.length} yield sources with low entropy drift.`);
            audio.playSuccess();
        } catch (e) {
            addLog('ERROR', 'FINANCE_SCAN_FAIL: Reality Oracles offline.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleConfirmInvestment = () => {
        if (!confirmingOp) return;
        commitInvestment(confirmingOp.id, 50000);
        addLog('SUCCESS', `CAPITAL_DEPLOYED: Authorized $50,000 disbursement to [${confirmingOp.title}]`);
        audio.playSuccess();
        setConfirmingOp(null);
        setTVL(prev => prev - 50000);
    };

    return (
        <div key={theme} className="h-full w-full bg-[var(--bg-app)] flex flex-col border border-[var(--border-main)] rounded-[2.5rem] overflow-hidden shadow-2xl relative font-sans transition-colors duration-500">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.03)_0%,transparent_80%)] pointer-events-none" />
            
            <AnimatePresence>
                {confirmingOp && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl">
                        <div className="bg-[var(--bg-card-top)] border border-[var(--border-main)] rounded-[3rem] w-full max-w-xl p-10 shadow-2xl">
                             <h2 className="text-xl font-black text-[var(--text-primary)] mb-6 uppercase">Confirm Disbursement</h2>
                             <div className="p-6 bg-black/5 rounded-2xl mb-8">
                                <div className="text-sm font-mono text-[var(--text-primary)]">Target: {confirmingOp.title}</div>
                                <div className="text-lg font-black text-[#10b981] mt-2">$50,000.00</div>
                             </div>
                             <div className="flex gap-4">
                                <button onClick={() => setConfirmingOp(null)} className="flex-1 py-4 bg-black/5 rounded-2xl text-[10px] font-black uppercase text-[var(--text-muted)]">Cancel</button>
                                <button onClick={handleConfirmInvestment} className="flex-1 py-4 bg-[#10b981] text-black rounded-2xl text-[10px] font-black uppercase">Sign & Deploy</button>
                             </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="h-20 border-b border-[var(--border-main)] bg-[var(--bg-header)] backdrop-blur-3xl z-20 flex items-center justify-between px-10 shrink-0 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#10b981]/40 to-transparent" />
                
                <div className="flex items-center gap-12">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#10b981]/10 border border-[#10b981]/40 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                            <Landmark className="w-6 h-6 text-[#10b981]" />
                        </div>
                        <div>
                            <h1 className="text-base font-black font-mono text-[var(--text-primary)] uppercase tracking-[0.4em] leading-none">Wealth Matrix</h1>
                            <span className="text-[9px] text-[var(--text-muted)] font-mono uppercase tracking-widest mt-2 block">Autonomous Treasury Control // v9.5-ZENITH</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-black/5 p-1.5 rounded-2xl border border-[var(--border-main)] shadow-inner">
                        {[
                            { id: 'OVERVIEW', label: 'Treasury' },
                            { id: 'YIELD_OPS', label: 'Yield Ops' },
                            { id: 'LIQUIDITY', label: 'Liquidity' }
                        ].map(tab => (
                            <button 
                                key={tab.id}
                                onClick={() => { setActiveSector(tab.id as any); audio.playClick(); }}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                                    ${activeSector === tab.id ? 'bg-[var(--text-primary)] text-[var(--bg-app)] shadow-2xl scale-105' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}
                                `}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-10">
                    <div className="text-right">
                        <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-widest block mb-1">Managed AUM</span>
                        <div className="flex items-center gap-3">
                            <span className="text-2xl font-black font-mono text-[var(--text-primary)] tracking-tighter">${tvl.toLocaleString()}</span>
                            <div className="flex flex-col items-end">
                                <span className="text-[8px] font-mono text-[#10b981] font-bold">+14.2%</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-10 relative bg-transparent">
                    <AnimatePresence mode="wait">
                        {activeSector === 'OVERVIEW' && (
                            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-10">
                                <div className="grid grid-cols-4 gap-6">
                                    <FinanceMetric label="Revenue Velocity" value="+$420.80/h" trend={12.4} icon={Zap} color="#9d4edd" />
                                    <FinanceMetric label="Protocol Alpha" value="1.24x" trend={8.1} icon={Target} color="#22d3ee" />
                                    <FinanceMetric label="Resource Flux" value="4.8 TB/s" trend={-2.4} icon={Activity} color="#f59e0b" />
                                    <FinanceMetric label="Trust Index" value="99.98" trend={0.01} icon={ShieldCheck} color="#10b981" />
                                </div>
                                <div className="bg-[var(--bg-card-top)] border border-[var(--border-main)] rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
                                    <div className="flex justify-between items-center mb-8">
                                        <div className="flex items-center gap-4">
                                            <ChartIcon size={20} className="text-[#10b981]" />
                                            <span className="text-xs font-black font-mono text-[var(--text-primary)] uppercase tracking-widest">Global Resource Handover Queue</span>
                                        </div>
                                        <button onClick={fetchLiveOpportunities} disabled={isSearching} className="px-5 py-2 bg-black/20 hover:bg-[#10b981] hover:text-black border border-white/10 rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-2.5 active:scale-95 shadow-xl">
                                            {isSearching ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                            Sync Reality Ground
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 pb-12">
                                        {marketData.opportunities.length > 0 ? marketData.opportunities.map(op => (
                                            <div key={op.id} className="p-8 bg-black/5 border border-[var(--border-main)] rounded-[2rem] hover:border-[#10b981]/30 transition-all group/op relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-4 opacity-[0.02] group-hover/op:opacity-[0.05] transition-opacity rotate-12"><Landmark size={80} /></div>
                                                <h4 className="text-sm font-black text-[var(--text-primary)] uppercase mb-4">{op.title}</h4>
                                                <p className="text-[11px] text-[var(--text-muted)] italic mb-6 leading-relaxed">"{op.logic}"</p>
                                                <div className="flex justify-between items-center">
                                                    <div className="flex gap-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-[7px] text-gray-600 uppercase font-black tracking-widest">Projected Yield</span>
                                                            <span className="text-lg font-black text-[#10b981] font-mono">{op.yield}</span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[7px] text-gray-600 uppercase font-black tracking-widest">Risk Level</span>
                                                            <span className={`text-lg font-black font-mono ${op.risk === 'LOW' ? 'text-[#10b981]' : 'text-[#f59e0b]'}`}>{op.risk}</span>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setConfirmingOp(op)} className="px-8 py-3 bg-[#10b981] text-black text-[9px] font-black uppercase rounded-xl transition-transform hover:scale-105 active:scale-95 shadow-xl">Commit Capital</button>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="col-span-2 py-20 text-center opacity-20">
                                                <Compass size={60} className="mx-auto mb-4 animate-pulse" />
                                                <p className="text-sm font-mono uppercase tracking-[0.5em]">Establishing Global Discovery Pulse...</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeSector === 'YIELD_OPS' && (
                            <motion.div key="yield" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-10">
                                <div className="grid grid-cols-12 gap-8">
                                    <div className="col-span-12 lg:col-span-8 bg-[var(--bg-card-top)] border border-[var(--border-main)] rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
                                        <div className="flex justify-between items-center mb-10">
                                            <div className="flex items-center gap-4">
                                                <Flame size={20} className="text-[#f59e0b]" />
                                                <span className="text-xs font-black font-mono text-[var(--text-primary)] uppercase tracking-widest">Autonomous Yield Maximizer</span>
                                            </div>
                                            <div className="flex gap-2 bg-black/10 p-1 rounded-xl border border-white/5">
                                                {[
                                                    { id: 'STABLE', label: 'Stable', color: '#10b981' },
                                                    { id: 'AGGRESSIVE', label: 'Alpha', color: '#ef4444' },
                                                    { id: 'DEPIN', label: 'DePIN', color: '#9d4edd' }
                                                ].map(strat => (
                                                    <button 
                                                        key={strat.id} 
                                                        onClick={() => setYieldStrategy(strat.id as any)}
                                                        className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${yieldStrategy === strat.id ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                                                    >
                                                        {strat.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="h-[300px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={chartData}>
                                                    <defs>
                                                        <linearGradient id="yieldColor" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor={yieldStrategy === 'AGGRESSIVE' ? '#ef4444' : '#10b981'} stopOpacity={0.2}/>
                                                            <stop offset="95%" stopColor={yieldStrategy === 'AGGRESSIVE' ? '#ef4444' : '#10b981'} stopOpacity={0}/>
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                    <XAxis dataKey="time" hide />
                                                    <YAxis hide domain={[0, 25]} />
                                                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-main)', borderRadius: '12px' }} />
                                                    <Area type="monotone" dataKey="yield" stroke={yieldStrategy === 'AGGRESSIVE' ? '#ef4444' : '#10b981'} fillOpacity={1} fill="url(#yieldColor)" strokeWidth={3} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="grid grid-cols-3 gap-6 mt-10">
                                            {[
                                                { label: 'Avg_APR', val: yieldStrategy === 'AGGRESSIVE' ? '24.18%' : '14.82%', color: '#10b981' },
                                                { label: 'Comp_Freq', val: '8m', color: '#22d3ee' },
                                                { label: 'Auto_Heal', val: 'Active', color: '#9d4edd' }
                                            ].map(stat => (
                                                <div key={stat.label} className="p-5 bg-black/10 rounded-2xl border border-white/5">
                                                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest block mb-2">{stat.label}</span>
                                                    <span className="text-xl font-black font-mono text-[var(--text-primary)]" style={{ color: stat.color }}>{stat.val}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="col-span-12 lg:col-span-4 space-y-6">
                                        <div className="bg-[var(--bg-card-top)] border border-[var(--border-main)] rounded-3xl p-8 shadow-2xl flex flex-col justify-between h-full relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-6 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity"><Percent size={100} /></div>
                                            <div className="space-y-6 relative z-10">
                                                <div className="flex items-center gap-3">
                                                    <PieChart size={18} className="text-[#22d3ee]" />
                                                    <span className="text-[10px] font-black font-mono text-[var(--text-primary)] uppercase tracking-widest">Protocol Distribution</span>
                                                </div>
                                                <div className="space-y-4">
                                                    {[
                                                        { name: 'Qubic_Nodes', share: 45, color: '#9d4edd' },
                                                        { name: 'Doge_Bridge', share: 30, color: '#f1c21b' },
                                                        { name: 'Depin_Relay', share: 25, color: '#10b981' }
                                                    ].map(p => (
                                                        <div key={p.name} className="space-y-2">
                                                            <div className="flex justify-between text-[8px] font-mono text-gray-500 uppercase tracking-widest">
                                                                <span>{p.name}</span>
                                                                <span className="text-[var(--text-primary)] font-bold">{p.share}%</span>
                                                            </div>
                                                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                                                <motion.div initial={{ width: 0 }} animate={{ width: `${p.share}%` }} className="h-full" style={{ backgroundColor: p.color }} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <button className="w-full py-4 mt-10 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-[var(--text-primary)] hover:border-[#10b981]/50 transition-all shadow-xl active:scale-95">Rebalance Lattice</button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeSector === 'LIQUIDITY' && (
                            <motion.div key="liquidity" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-10">
                                <div className="grid grid-cols-12 gap-8">
                                    <div className="col-span-12 lg:col-span-7 bg-[var(--bg-card-top)] border border-[var(--border-main)] rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
                                        <div className="flex items-center gap-4 mb-10">
                                            <ArrowLeftRight size={20} className="text-[#22d3ee]" />
                                            <span className="text-xs font-black font-mono text-[var(--text-primary)] uppercase tracking-widest">Bridge Telemetry // Metaventions L2</span>
                                        </div>
                                        <div className="space-y-8">
                                            {[
                                                { pair: 'DOGE / QUBIC', vol: '$1.2M', health: '99.9%', status: 'Nominal', color: '#f1c21b' },
                                                { pair: 'QUBIC / ETH', vol: '$480K', health: '99.7%', status: 'Nominal', color: '#9d4edd' },
                                                { pair: 'USDC / MENT', vol: '$2.4M', health: '99.8%', status: 'Active', color: '#22d3ee' }
                                            ].map(node => (
                                                <div key={node.pair} className="flex items-center justify-between p-6 bg-black/10 border border-white/5 rounded-2xl group hover:border-[#22d3ee]/30 transition-all cursor-pointer">
                                                    <div className="flex items-center gap-5">
                                                        <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform" style={{ color: node.color }}>
                                                            <Share2 size={24} />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-black text-[var(--text-primary)] uppercase font-mono">{node.pair}</div>
                                                            <div className="text-[8px] text-gray-500 font-mono uppercase tracking-widest mt-1">24h Vol: {node.vol}</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-[10px] font-black text-[#10b981] font-mono mb-1">{node.health}</div>
                                                        <div className="px-3 py-1 bg-[#10b981]/10 rounded border border-[#10b981]/30 text-[8px] font-black text-[#10b981] uppercase tracking-widest">{node.status}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="col-span-12 lg:col-span-5 flex flex-col gap-8">
                                        <div className="bg-[var(--bg-card-top)] border border-[var(--border-main)] rounded-[3rem] p-10 shadow-2xl flex flex-col justify-center text-center relative overflow-hidden group h-full">
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.05)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                                            <Gauge size={80} className="mx-auto text-[#22d3ee] mb-8 group-hover:rotate-[30deg] transition-transform duration-700" />
                                            <h3 className="text-xl font-black font-mono text-[var(--text-primary)] uppercase tracking-[0.3em] mb-4">Capital Efficiency Index</h3>
                                            <p className="text-[11px] text-gray-500 font-mono leading-relaxed max-w-sm mx-auto px-6 uppercase tracking-widest italic mb-10">"Capital deployment velocity is currently synchronized at 98.4% efficiency against global liquidity thresholds."</p>
                                            <div className="flex justify-center gap-10">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[7px] text-gray-600 uppercase font-black tracking-widest mb-1">Depth</span>
                                                    <span className="text-lg font-black font-mono text-[var(--text-primary)] tracking-tighter">HIGH</span>
                                                </div>
                                                <div className="h-10 w-px bg-white/5" />
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[7px] text-gray-600 uppercase font-black tracking-widest mb-1">Spread</span>
                                                    <span className="text-lg font-black font-mono text-[var(--text-primary)] tracking-tighter">0.02%</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-black/20 border border-[var(--border-main)] rounded-[2.5rem] p-6 h-48 overflow-hidden relative shadow-inner">
                                            <div className="absolute top-4 left-6 text-[9px] font-black font-mono text-gray-600 uppercase tracking-widest flex items-center gap-2">
                                                <GitMerge size={14} className="text-[#22d3ee]" /> Cross-Chain Flux
                                            </div>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <ReScatterChart margin={{ top: 40, right: 20, bottom: 0, left: 0 }}>
                                                    <XAxis type="number" dataKey="x" hide />
                                                    <YAxis type="number" dataKey="y" hide />
                                                    <ZAxis type="number" dataKey="z" range={[50, 400]} />
                                                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                                    <Scatter name="Activity" data={scatterData} fill="#22d3ee" opacity={0.4} />
                                                </ReScatterChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right Pipeline Monitor */}
                <div className="w-[380px] border-l border-[var(--border-main)] bg-[var(--bg-side)] flex flex-col shrink-0 relative transition-colors duration-500">
                    <div className="p-10 border-b border-[var(--border-main)] bg-black/5">
                        <div className="flex items-center justify-between mb-12">
                            <div className="flex items-center gap-4">
                                <Binary size={20} className="text-[#10b981]" />
                                <h2 className="text-[11px] font-black text-[var(--text-primary)] uppercase tracking-[0.4em]">Resource Flow</h2>
                            </div>
                        </div>
                        <div className="space-y-12">
                            {[
                                { label: 'Compute Arb', val: 42, color: '#10b981' },
                                { label: 'Liquidity Bridge', val: 28, color: '#22d3ee' },
                                { label: 'Node Uptime', val: 99, color: '#f1c21b' }
                            ].map(item => (
                                <div key={item.label} className="space-y-5">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{item.label}</span>
                                        <span className="text-2xl font-black font-mono text-[var(--text-primary)] tracking-tighter">{item.val}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-black/10 rounded-full overflow-hidden border border-[var(--border-main)]">
                                        <motion.div animate={{ width: `${item.val}%` }} className="h-full" style={{ backgroundColor: item.color }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="flex-1 p-10 flex flex-col relative overflow-hidden">
                        <div className="space-y-4 mb-10">
                            <div className="flex items-center gap-2 mb-6">
                                <BrainCircuit size={16} className="text-[#9d4edd]" />
                                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Cognitive Treasury Log</span>
                            </div>
                            <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                {strategyLog.length > 0 ? strategyLog.slice().reverse().map((log, i) => (
                                    <motion.div 
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        key={i} 
                                        className="text-[9px] font-mono text-gray-400 border-l border-[#10b981]/40 pl-4 py-2 flex flex-col gap-1.5 bg-white/[0.02] rounded-r-lg group hover:bg-[#10b981]/5 transition-all"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-[#10b981] font-bold uppercase tracking-tighter text-[8px]">ACK_DEPLOY</span>
                                            <span className="text-[7px] text-gray-600">t + {i}ms</span>
                                        </div>
                                        <span className="leading-relaxed text-gray-300 group-hover:text-white transition-colors">{log}</span>
                                    </motion.div>
                                )) : (
                                    <div className="py-20 text-center opacity-10 flex flex-col items-center gap-4 grayscale">
                                        <Database size={40} />
                                        <span className="text-[10px] font-mono uppercase tracking-widest">Buffer empty</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-auto p-6 bg-black/40 border border-white/5 rounded-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-3 opacity-[0.05] group-hover:opacity-10 transition-opacity"><Zap size={40} /></div>
                            <div className="flex items-center gap-2 mb-3">
                                <History size={12} className="text-[#f1c21b]" />
                                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Audit Stability</span>
                            </div>
                            <div className="text-xl font-black font-mono text-white tracking-tighter">LOCKED</div>
                            <p className="text-[8px] text-gray-500 font-mono mt-1 uppercase tracking-widest leading-relaxed">Cryptographically verified capital lifecycle active.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AutonomousFinance;