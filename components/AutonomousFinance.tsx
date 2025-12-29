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
    Database, BrainCircuit, Scale, Waves
} from 'lucide-react';
import { useAppStore } from '../store';
import { searchRealWorldOpportunities, promptSelectKey, assessInvestmentRisk } from '../services/geminiService';
import { audio } from '../services/audioService';
import { 
    AreaChart, Area, XAxis, YAxis, ResponsiveContainer, 
    Tooltip, BarChart as ReBarChart, Bar, CartesianGrid, 
    LineChart, Line, ScatterChart as ReScatterChart, Scatter, ZAxis,
    PieChart as RePieChart, Pie, Cell
} from 'recharts';

// --- SUB-COMPONENTS ---

const EconomicLatticeVisualizer = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let frame = 0;
        const nodes: any[] = Array.from({ length: 15 }, (_, i) => ({
            x: Math.random() * 400,
            y: Math.random() * 200,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            radius: Math.random() * 2 + 1
        }));

        const render = () => {
            frame++;
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ctx.strokeStyle = 'rgba(16, 185, 129, 0.05)';
            ctx.lineWidth = 0.5;

            nodes.forEach((n, i) => {
                n.x += n.vx;
                n.y += n.vy;

                if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
                if (n.y < 0 || n.y > canvas.height) n.vy *= -1;

                ctx.beginPath();
                ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
                ctx.fill();

                nodes.slice(i + 1).forEach(n2 => {
                    const dx = n.x - n2.x;
                    const dy = n.y - n2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 80) {
                        ctx.beginPath();
                        ctx.moveTo(n.x, n.y);
                        ctx.lineTo(n2.x, n2.y);
                        ctx.stroke();
                    }
                });
            });

            requestAnimationFrame(render);
        };
        const anim = requestAnimationFrame(render);
        return () => cancelAnimationFrame(anim);
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-30" />;
};

const FinanceMetric = ({ label, value, trend, icon: Icon, color }: any) => (
    <div className="bg-[var(--bg-card-top)] border border-[var(--border-main)] rounded-2xl p-5 group hover:border-[#10b981]/30 transition-all shadow-xl flex flex-col gap-3 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#10b981]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex justify-between items-start">
            <div className="p-2.5 rounded-xl bg-black/10 text-gray-400 group-hover:text-[var(--text-primary)] transition-all">
                <Icon size={18} style={{ color: trend > 0 ? '#10b981' : color }} />
            </div>
            <div className={`flex items-center gap-1 text-[10px] font-black font-mono ${trend > 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                {trend > 0 ? <ArrowUp size={10} /> : <ArrowDownRight size={10} />}
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
    
    // Destructuring with fallback to prevent 'Cannot find name' or 'Cannot read properties of undefined'
    const { 
        layers = [], 
        activeLayerId = '', 
        strategyLibrary = [], 
        strategyLog = [],
        economicProtocols = []
    } = metaventions || {};

    const [activeSector, setActiveSector] = useState<'OVERVIEW' | 'YIELD_OPS' | 'LIQUIDITY' | 'LEDGER'>('OVERVIEW');
    const [isSearching, setIsSearching] = useState(false);
    const [tvl, setTVL] = useState(1420500);
    const [confirmingOp, setConfirmingOp] = useState<any | null>(null);
    const [yieldStrategy, setYieldStrategy] = useState<'AGGRESSIVE' | 'STABLE' | 'DEPIN'>('STABLE');

    const chartData = useMemo(() => Array.from({ length: 30 }, (_, i) => ({
        time: i,
        yield: yieldStrategy === 'AGGRESSIVE' ? 12 + Math.random() * 12 : yieldStrategy === 'DEPIN' ? 6 + Math.random() * 4 : 8 + Math.random() * 4,
        utilization: 60 + Math.random() * 25
    })), [yieldStrategy]);

    const pieData = useMemo(() => [
        { name: 'Stablepools', value: 400, color: '#10b981' },
        { name: 'Node Rewards', value: 300, color: '#9d4edd' },
        { name: 'Arbitrage', value: 300, color: '#22d3ee' },
        { name: 'Delta Neutral', value: 200, color: '#f59e0b' },
    ], []);

    const fetchLiveOpportunities = async () => {
        setIsSearching(true);
        audio.playClick();
        addLog('SYSTEM', 'FINANCE_SCAN: Grounding DePIN yield vectors via Reality Oracles...');
        try {
            if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); return; }
            const results = await searchRealWorldOpportunities('Stable High Yield AI Infrastructure 2025');
            const sanitized = results.map((r: any, i: number) => ({ 
                ...r, 
                id: `ext-${Date.now()}-${i}`, 
                fee: 0.02,
                confidence: 0.95
            }));
            useAppStore.setState(s => ({ marketData: { ...s.marketData, opportunities: sanitized.slice(0, 8), lastSync: Date.now() } }));
            addLog('SUCCESS', `FINANCE_SCAN: Located ${results.length} capital deployment vectors.`);
            audio.playSuccess();
        } catch (e: any) {
            if (e.message?.includes('Permission denied')) {
                addLog('ERROR', 'SECURITY_EXCEPTION: Reality Oracle access blocked by browser protocol.');
            } else {
                addLog('ERROR', 'FINANCE_SCAN_FAIL: Signal collision detected.');
            }
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
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/70 backdrop-blur-2xl">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[var(--bg-card-top)] border border-[#10b981]/30 rounded-[3rem] w-full max-w-xl p-10 shadow-2xl relative overflow-hidden">
                             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#10b981] to-transparent" />
                             <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-widest flex items-center gap-4">
                                <ShieldCheck className="text-[#10b981]" />
                                Final Disbursement
                             </h2>
                             <div className="p-8 bg-black/40 rounded-[2rem] border border-white/5 mb-8 shadow-inner">
                                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Target Asset Vector</div>
                                <div className="text-base font-mono text-white mb-6 border-b border-white/5 pb-4">{confirmingOp.title}</div>
                                <div className="flex justify-between items-end">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] text-[#10b981] font-black uppercase tracking-widest">Amount</span>
                                        <span className="text-3xl font-black font-mono text-white tracking-tighter">$50,000.00</span>
                                    </div>
                                    <div className="text-[8px] font-mono text-gray-600 uppercase">ACK_HASH: 0xFD2..9A</div>
                                </div>
                             </div>
                             <div className="flex gap-4">
                                <button onClick={() => setConfirmingOp(null)} className="flex-1 py-5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase text-gray-500 hover:text-white transition-all">Abort Handover</button>
                                <button onClick={handleConfirmInvestment} className="flex-1 py-5 bg-[#10b981] text-black rounded-2xl text-[10px] font-black uppercase shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all hover:scale-105 active:scale-95">Sign & Commit</button>
                             </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Sector Header */}
            <div className="h-24 border-b border-[var(--border-main)] bg-[var(--bg-header)] backdrop-blur-3xl z-20 flex items-center justify-between px-12 shrink-0 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#10b981]/40 to-transparent" />
                
                <div className="flex items-center gap-16">
                    <div className="flex items-center gap-5">
                        <div className="p-3.5 bg-[#10b981]/10 border border-[#10b981]/40 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                            <Landmark className="w-7 h-7 text-[#10b981]" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black font-mono text-[var(--text-primary)] uppercase tracking-[0.5em] leading-none">Wealth Matrix</h1>
                            <span className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.4em] mt-3 block flex items-center gap-2">
                                <ShieldCheck size={12} className="text-[#10b981]" /> 
                                Autonomous Treasury Protocol // v9.5-ZENITH
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-2xl border border-[var(--border-main)] shadow-inner">
                        {[
                            { id: 'OVERVIEW', label: 'Treasury', icon: PieChart },
                            { id: 'YIELD_OPS', label: 'Yield Ops', icon: Flame },
                            { id: 'LIQUIDITY', label: 'Liquidity', icon: ArrowLeftRight },
                            { id: 'LEDGER', label: 'Audits', icon: History }
                        ].map(tab => (
                            <button 
                                key={tab.id}
                                onClick={() => { setActiveSector(tab.id as any); audio.playClick(); }}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3
                                    ${activeSector === tab.id ? 'bg-[var(--text-primary)] text-[var(--bg-app)] shadow-2xl scale-105' : 'text-gray-500 hover:text-[var(--text-primary)]'}
                                `}
                            >
                                <tab.icon size={14} className={activeSector === tab.id ? 'fill-current' : ''} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-12">
                    <div className="text-right">
                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block mb-1">Managed AUM (STABLE)</span>
                        <div className="flex items-center gap-4">
                            <span className="text-3xl font-black font-mono text-white tracking-tighter">${tvl.toLocaleString()}</span>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-mono text-[#10b981] font-black">+14.2%</span>
                                <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_10px_#10b981]" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 overflow-y-auto custom-scrollbar p-12 space-y-12 relative bg-transparent">
                    <AnimatePresence mode="wait">
                        {activeSector === 'OVERVIEW' && (
                            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
                                <div className="grid grid-cols-4 gap-8">
                                    <FinanceMetric label="Yield Velocity" value="+$420.80/h" trend={12.4} icon={Zap} color="#10b981" />
                                    <FinanceMetric label="Protocol Alpha" value="1.24x" trend={8.1} icon={Scale} color="#22d3ee" />
                                    <FinanceMetric label="Market Efficiency" value="98.4%" trend={-1.2} icon={Activity} color="#f59e0b" />
                                    <FinanceMetric label="Network Health" value="NOMINAL" trend={0.05} icon={ShieldCheck} color="#10b981" />
                                </div>

                                <div className="grid grid-cols-12 gap-10">
                                    <div className="col-span-8 bg-[var(--bg-card-top)] border border-[var(--border-main)] rounded-[3rem] p-12 shadow-2xl relative overflow-hidden min-h-[500px]">
                                        <EconomicLatticeVisualizer />
                                        <div className="flex justify-between items-center mb-10 relative z-10">
                                            <div className="flex items-center gap-4">
                                                <ChartIcon size={22} className="text-[#10b981]" />
                                                <span className="text-xs font-black font-mono text-white uppercase tracking-[0.4em]">Real-Time Asset Vector Analysis</span>
                                            </div>
                                            <button onClick={fetchLiveOpportunities} disabled={isSearching} className="px-6 py-2.5 bg-[#10b981]/10 hover:bg-[#10b981] hover:text-black border border-[#10b981]/30 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-3 active:scale-95 shadow-xl">
                                                {isSearching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                                Sync Global Oracles
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 relative z-10">
                                            {marketData.opportunities.length > 0 ? marketData.opportunities.map(op => (
                                                <div key={op.id} className="p-8 bg-black/40 border border-white/5 rounded-[2.5rem] hover:border-[#10b981]/40 transition-all group/op relative overflow-hidden shadow-inner">
                                                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover/op:opacity-[0.1] transition-all duration-1000 rotate-12"><Share2 size={120} /></div>
                                                    <h4 className="text-base font-black text-white uppercase mb-4 tracking-tight group-hover:text-[#10b981] transition-colors">{op.title}</h4>
                                                    <p className="text-[12px] text-gray-500 italic mb-8 leading-relaxed font-mono">"{op.logic}"</p>
                                                    <div className="flex justify-between items-end border-t border-white/5 pt-6">
                                                        <div className="flex gap-10">
                                                            <div className="flex flex-col">
                                                                <span className="text-[8px] text-gray-600 uppercase font-black tracking-widest mb-1">Expected APY</span>
                                                                <span className="text-xl font-black text-[#10b981] font-mono">{op.yield}</span>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[8px] text-gray-600 uppercase font-black tracking-widest mb-1">Risk Rating</span>
                                                                <span className={`text-xl font-black font-mono ${op.risk === 'LOW' ? 'text-[#10b981]' : 'text-[#f59e0b]'}`}>{op.risk}</span>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => setConfirmingOp(op)} className="px-8 py-3.5 bg-[#10b981] text-black text-[10px] font-black uppercase rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.2)] group-hover/op:px-10">Deploy</button>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="col-span-2 py-32 text-center opacity-10 flex flex-col items-center gap-6">
                                                    <Compass size={80} className="animate-pulse" />
                                                    <p className="text-lg font-mono uppercase tracking-[0.8em]">Establishing Global Discovery Pulse...</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="col-span-4 space-y-10">
                                        <div className="bg-[var(--bg-card-top)] border border-[var(--border-main)] rounded-[3rem] p-10 shadow-2xl flex flex-col items-center text-center relative overflow-hidden h-[300px]">
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.05)_0%,transparent_70%)]" />
                                            <div className="w-full flex justify-between mb-4">
                                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Asset Allocation</span>
                                                <div className="w-2 h-2 rounded-full bg-[#22d3ee] animate-pulse shadow-[0_0_10px_#22d3ee]" />
                                            </div>
                                            <div className="w-full h-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <RePieChart>
                                                        <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                                            {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                                        </Pie>
                                                        <Tooltip />
                                                    </RePieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        <div className="bg-black/20 border border-[var(--border-main)] rounded-[3rem] p-10 flex flex-col justify-center gap-6 shadow-inner">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/30">
                                                    <Shield size={20} />
                                                </div>
                                                <span className="text-[11px] font-black text-white uppercase tracking-widest">Reserve Status</span>
                                            </div>
                                            <div className="space-y-4">
                                                {[
                                                    { label: 'Stablecoin Collateral', val: 92, color: '#22d3ee' },
                                                    { label: 'Infrastructure Equity', val: 74, color: '#9d4edd' },
                                                    { label: 'Node Liquidity', val: 88, color: '#10b981' }
                                                ].map(item => (
                                                    <div key={item.label} className="space-y-2">
                                                        <div className="flex justify-between text-[8px] font-mono text-gray-500 uppercase tracking-widest">
                                                            <span>{item.label}</span>
                                                            <span className="text-white font-black">{item.val}%</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                            <motion.div initial={{ width: 0 }} animate={{ width: `${item.val}%` }} className="h-full" style={{ backgroundColor: item.color }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeSector === 'YIELD_OPS' && (
                            <motion.div key="yield" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
                                <div className="grid grid-cols-12 gap-10">
                                    <div className="col-span-12 lg:col-span-8 bg-[var(--bg-card-top)] border border-[var(--border-main)] rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
                                        <div className="flex justify-between items-center mb-12">
                                            <div className="flex items-center gap-5">
                                                <div className="p-3.5 bg-[#f59e0b]/10 border border-[#f59e0b]/40 rounded-2xl text-[#f59e0b]">
                                                    <Flame size={24} />
                                                </div>
                                                <div>
                                                    <span className="text-base font-black font-mono text-white uppercase tracking-[0.4em]">Yield Harvesting L1</span>
                                                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-2">Autonomous Optimization Engine</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                                                {[
                                                    { id: 'STABLE', label: 'Stable', color: '#10b981' },
                                                    { id: 'AGGRESSIVE', label: 'Alpha', color: '#ef4444' },
                                                    { id: 'DEPIN', label: 'DePIN', color: '#9d4edd' }
                                                ].map(strat => (
                                                    <button 
                                                        key={strat.id} 
                                                        onClick={() => { setYieldStrategy(strat.id as any); audio.playClick(); }}
                                                        className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${yieldStrategy === strat.id ? 'bg-white text-black shadow-xl scale-105' : 'text-gray-500 hover:text-white'}`}
                                                    >
                                                        {strat.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="h-[350px] w-full relative">
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.02)_0%,transparent_70%)]" />
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={chartData}>
                                                    <defs>
                                                        <linearGradient id="yieldColorAF" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor={yieldStrategy === 'AGGRESSIVE' ? '#ef4444' : '#10b981'} stopOpacity={0.3}/>
                                                            <stop offset="95%" stopColor={yieldStrategy === 'AGGRESSIVE' ? '#ef4444' : '#10b981'} stopOpacity={0}/>
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                                    <XAxis dataKey="time" hide />
                                                    <YAxis hide domain={[0, 30]} />
                                                    <Tooltip contentStyle={{ backgroundColor: 'rgba(5,5,5,0.95)', border: '1px solid var(--border-main)', borderRadius: '16px', backdropFilter: 'blur(20px)' }} />
                                                    <Area type="monotone" dataKey="yield" stroke={yieldStrategy === 'AGGRESSIVE' ? '#ef4444' : '#10b981'} fillOpacity={1} fill="url(#yieldColorAF)" strokeWidth={4} shadow="0 0 20px rgba(16,185,129,0.3)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="grid grid-cols-4 gap-8 mt-12">
                                            {[
                                                { label: 'Cumulative APY', val: yieldStrategy === 'AGGRESSIVE' ? '28.4%' : '14.2%', color: '#10b981' },
                                                { label: 'Compounding', val: 'Every 8m', color: '#22d3ee' },
                                                { label: 'Slippage Tolerance', val: '0.05%', color: '#f59e0b' },
                                                { label: 'Auto-Repair', val: 'ACTIVE', color: '#ef4444' }
                                            ].map(stat => (
                                                <div key={stat.label} className="p-6 bg-black/30 rounded-3xl border border-white/5 group hover:border-white/10 transition-colors">
                                                    <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest block mb-2">{stat.label}</span>
                                                    <span className="text-xl font-black font-mono text-white" style={{ color: stat.color }}>{stat.val}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="col-span-12 lg:col-span-4 flex flex-col gap-10">
                                        <div className="bg-[var(--bg-card-top)] border border-[var(--border-main)] rounded-[3rem] p-10 shadow-2xl flex-1 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.08] transition-all"><Percent size={120} /></div>
                                            <div className="flex items-center gap-4 mb-8">
                                                <div className="p-2.5 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/30">
                                                    <Share2 size={20} />
                                                </div>
                                                <span className="text-[11px] font-black text-white uppercase tracking-widest">Asset Dispersion</span>
                                            </div>
                                            <div className="space-y-6">
                                                {[
                                                    { name: 'Infrastructure Bonds', share: 45, color: '#9d4edd' },
                                                    { name: 'DePIN Incentives', share: 30, color: '#f1c21b' },
                                                    { name: 'Compute Arbitrage', share: 25, color: '#10b981' }
                                                ].map(p => (
                                                    <div key={p.name} className="space-y-3">
                                                        <div className="flex justify-between text-[10px] font-mono text-gray-500 uppercase tracking-widest font-black">
                                                            <span>{p.name}</span>
                                                            <span className="text-white">{p.share}%</span>
                                                        </div>
                                                        <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 p-0.5 shadow-inner">
                                                            <motion.div initial={{ width: 0 }} animate={{ width: `${p.share}%` }} transition={{ duration: 1, ease: "easeOut" }} className="h-full rounded-full" style={{ backgroundColor: p.color, boxShadow: `0 0 10px ${p.color}40` }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <button className="w-full py-5 mt-12 bg-[#10b981] text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] shadow-xl hover:bg-[#34d399] transition-all active:scale-95 group">
                                                Rebalance Lattice 
                                                <ArrowUpRight size={14} className="inline ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeSector === 'LIQUIDITY' && (
                            <motion.div key="liquidity" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
                                <div className="grid grid-cols-12 gap-10">
                                    <div className="col-span-7 bg-[var(--bg-card-top)] border border-[var(--border-main)] rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
                                        <div className="flex items-center gap-5 mb-12">
                                            <ArrowLeftRight size={24} className="text-[#22d3ee]" />
                                            <div>
                                                <span className="text-base font-black font-mono text-white uppercase tracking-[0.4em]">Inter-Node Bridge Telemetry</span>
                                                <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-2">D-Ecosystem Core Handover Monitoring</p>
                                            </div>
                                        </div>
                                        <div className="space-y-8">
                                            {[
                                                { pair: 'DOGE / QUBIC', vol: '$1.2M', health: '99.9%', status: 'Nominal', color: '#f1c21b', tx: '1.4k/s' },
                                                { pair: 'QUBIC / ETH', vol: '$480K', health: '99.7%', status: 'Nominal', color: '#9d4edd', tx: '0.8k/s' },
                                                { pair: 'USDC / MENT', vol: '$2.4M', health: '99.8%', status: 'Stable', color: '#22d3ee', tx: '2.1k/s' }
                                            ].map(node => (
                                                <div key={node.pair} className="flex items-center justify-between p-8 bg-black/40 border border-white/5 rounded-[2.5rem] group hover:border-[#22d3ee]/40 transition-all cursor-pointer shadow-inner">
                                                    <div className="flex items-center gap-8">
                                                        <div className="w-16 h-16 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform relative" style={{ color: node.color }}>
                                                            <div className="absolute inset-0 bg-current opacity-[0.05] rounded-2xl" />
                                                            <Network size={32} />
                                                        </div>
                                                        <div>
                                                            <div className="text-lg font-black text-white uppercase font-mono tracking-tight">{node.pair}</div>
                                                            <div className="flex items-center gap-6 mt-2">
                                                                <div className="flex items-center gap-2 text-[9px] text-gray-600 font-mono uppercase tracking-widest">
                                                                    <Activity size={10} /> {node.vol} Vol
                                                                </div>
                                                                <div className="flex items-center gap-2 text-[9px] text-gray-600 font-mono uppercase tracking-widest">
                                                                    <Zap size={10} /> {node.tx}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs font-black text-[#10b981] font-mono mb-2">{node.health}</div>
                                                        <div className="px-5 py-1.5 bg-[#10b981]/10 rounded-full border border-[#10b981]/30 text-[9px] font-black text-[#10b981] uppercase tracking-widest shadow-xl">
                                                            {node.status}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="col-span-5 flex flex-col gap-10">
                                        <div className="bg-[var(--bg-card-top)] border border-[var(--border-main)] rounded-[3.5rem] p-12 shadow-2xl flex flex-col justify-center text-center relative overflow-hidden group h-[400px]">
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.08)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                                            <Gauge size={100} className="mx-auto text-[#22d3ee] mb-10 group-hover:rotate-[20deg] transition-transform duration-1000" />
                                            <h3 className="text-2xl font-black font-mono text-white uppercase tracking-[0.4em] mb-6">Efficiency Coefficient</h3>
                                            <p className="text-[12px] text-gray-500 font-mono leading-relaxed max-w-sm mx-auto px-8 uppercase tracking-widest italic mb-12">"Capital dispersion is synchronized at 98.4% efficiency against real-time liquidity thresholds."</p>
                                            <div className="flex justify-center gap-16">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[8px] text-gray-600 uppercase font-black tracking-widest mb-2">Depth Index</span>
                                                    <span className="text-2xl font-black font-mono text-white tracking-tighter">ULTRA_DEEP</span>
                                                </div>
                                                <div className="h-12 w-px bg-white/5" />
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[8px] text-gray-600 uppercase font-black tracking-widest mb-2">Market Spread</span>
                                                    <span className="text-2xl font-black font-mono text-white tracking-tighter">0.02%</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-black/30 border border-white/5 rounded-[3rem] p-10 h-48 overflow-hidden relative shadow-inner">
                                            <div className="absolute top-6 left-8 text-[10px] font-black font-mono text-gray-500 uppercase tracking-[0.3em] flex items-center gap-3">
                                                <GitMerge size={16} className="text-[#22d3ee]" /> Global Flux
                                            </div>
                                            <div className="w-full h-full flex items-center justify-center opacity-40">
                                                <Waves size={100} className="text-white/10" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeSector === 'LEDGER' && (
                            <motion.div key="ledger" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
                                <div className="bg-[var(--bg-card-top)] border border-[var(--border-main)] rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden min-h-[600px]">
                                    <div className="flex justify-between items-center mb-12">
                                        <div className="flex items-center gap-5">
                                            <div className="p-3.5 bg-purple-500/10 rounded-2xl text-purple-400 border border-purple-500/30">
                                                <FileText size={24} />
                                            </div>
                                            <div>
                                                <span className="text-base font-black font-mono text-white uppercase tracking-[0.4em]">Audit Persistence Ledger</span>
                                                <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-2">Immutable Capital Lifecycle Record</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Status: SYNC_LOCKED</span>
                                            <div className="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-[0_0_10px_#10b981]" />
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        {strategyLog.length > 0 ? strategyLog.slice().reverse().map((log, i) => (
                                            <motion.div 
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                key={i} 
                                                className="p-8 bg-black/40 border border-white/5 rounded-[2rem] flex items-start gap-8 group hover:bg-[#10b981]/5 hover:border-[#10b981]/30 transition-all shadow-inner"
                                            >
                                                <div className="mt-1 shrink-0">
                                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-600 group-hover:text-[#10b981] transition-colors border border-white/5">
                                                        <span className="text-[10px] font-black font-mono">#{strategyLog.length - i}</span>
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <span className="text-[10px] font-black text-[#10b981] uppercase tracking-[0.3em]">Capital_Handover_Verified</span>
                                                        <span className="text-[9px] text-gray-600 font-mono">{new Date().toLocaleTimeString()} // TS_v2.1</span>
                                                    </div>
                                                    <p className="text-[14px] text-gray-300 font-mono leading-relaxed selection:bg-[#10b981]/30">{log}</p>
                                                </div>
                                                <div className="shrink-0 pt-1">
                                                    <CheckCircle2 size={18} className="text-[#10b981] opacity-40 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            </motion.div>
                                        )) : (
                                            <div className="py-40 text-center opacity-10 flex flex-col items-center gap-8">
                                                <Database size={80} />
                                                <p className="text-xl font-mono uppercase tracking-[1em]">Ledger Buffer Empty</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Side Pipeline Telemetry */}
                <div className="w-[420px] border-l border-[var(--border-main)] bg-[var(--bg-side)] flex flex-col shrink-0 relative transition-colors duration-500 overflow-hidden">
                    <div className="p-12 border-b border-[var(--border-main)] bg-black/10">
                        <div className="flex items-center justify-between mb-16">
                            <div className="flex items-center gap-5">
                                <Binary size={24} className="text-[#10b981]" />
                                <h2 className="text-[12px] font-black text-white uppercase tracking-[0.5em]">Lattice Load</h2>
                            </div>
                            <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/10">
                                <span className="text-[10px] font-mono text-gray-500">Node_v4</span>
                            </div>
                        </div>
                        <div className="space-y-16">
                            {[
                                { label: 'Strategic Arb', val: 42, color: '#10b981' },
                                { label: 'Bridge Flux', val: 28, color: '#22d3ee' },
                                { label: 'Trust Stability', val: 99, color: '#f59e0b' }
                            ].map(item => (
                                <div key={item.label} className="space-y-6">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">{item.label}</span>
                                        <span className="text-3xl font-black font-mono text-white tracking-tighter">{item.val}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden border border-white/5 p-0.5 shadow-inner">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${item.val}%` }} transition={{ duration: 1.5, ease: "circOut" }} className="h-full rounded-full" style={{ backgroundColor: item.color, boxShadow: `0 0 15px ${item.color}40` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="flex-1 p-12 flex flex-col relative overflow-hidden">
                        <div className="space-y-6 mb-12">
                            <div className="flex items-center gap-3 mb-8">
                                <BrainCircuit size={20} className="text-[#9d4edd]" />
                                <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.4em]">Neural Decisioning Trace</span>
                            </div>
                            <div className="space-y-6 max-h-[400px] overflow-y-auto custom-scrollbar pr-4">
                                {strategyLog.length > 0 ? strategyLog.slice(-5).reverse().map((log, i) => (
                                    <motion.div 
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        key={`side-${i}`} 
                                        className="text-[10px] font-mono text-gray-400 border-l-2 border-[#10b981]/40 pl-6 py-3 flex flex-col gap-2 bg-white/[0.02] rounded-r-2xl group hover:bg-[#10b981]/5 transition-all"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-[#10b981] font-black uppercase tracking-tighter text-[9px]">TRACE_DEPLOY</span>
                                            <span className="text-[8px] text-gray-600 font-mono">T+{i*200}ms</span>
                                        </div>
                                        <span className="leading-relaxed text-gray-400 group-hover:text-white transition-colors line-clamp-2 italic">"{log}"</span>
                                    </motion.div>
                                )) : (
                                    <div className="py-20 text-center opacity-10 flex flex-col items-center gap-6 grayscale">
                                        <Database size={48} />
                                        <span className="text-[11px] font-mono uppercase tracking-[0.5em]">Buffer Standby</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-auto p-10 bg-black/60 border border-white/5 rounded-[3rem] relative overflow-hidden group shadow-2xl">
                            <div className="absolute top-0 right-0 p-6 opacity-[0.05] group-hover:opacity-15 transition-all duration-700 rotate-45"><Zap size={100} /></div>
                            <div className="flex items-center gap-3 mb-4">
                                <ShieldCheck size={16} className="text-[#10b981]" />
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Core Assurance</span>
                            </div>
                            <div className="text-3xl font-black font-mono text-white tracking-tighter group-hover:text-[#10b981] transition-colors">SYNC_LOCKED</div>
                            <p className="text-[10px] text-gray-600 font-mono mt-3 uppercase tracking-widest leading-relaxed">Cryptographically verified capital lifecycle protocol active.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AutonomousFinance;