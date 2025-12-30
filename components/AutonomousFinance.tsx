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
    const { metaventions, marketData, theme, actions } = useAppStore();
    const { addLog, commitInvestment } = actions;
    
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
            addLog('ERROR', 'FINANCE_SCAN_FAIL: Signal collision detected.');
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
                            <h1 className="text-xl font-black font-mono text-[var(--text-primary)] uppercase tracking-[0.5em] leading-none">Financial Core</h1>
                            <span className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.4em] mt-3 block flex items-center gap-2">
                                <ShieldCheck size={12} className="text-[#10b981]" /> 
                                Autonomous Treasury Protocol // V9.5 - THE D-Ecosystem
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

                <div className="flex items-center gap-12 text-right">
                    <div>
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
                                                <div className="w-2 h-2 rounded-full bg-[#22d3ee] animate-pulse shadow-[0_0_100px_#22d3ee]" />
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
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default AutonomousFinance;