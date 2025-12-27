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
    ArrowLeftRight, FileText, Gauge, BarChart, History
} from 'lucide-react';
import { useAppStore } from '../store';
import { searchRealWorldOpportunities, promptSelectKey, assessInvestmentRisk } from '../services/geminiService';
import { audio } from '../services/audioService';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart as ReBarChart, Bar, CartesianGrid, LineChart, Line } from 'recharts';

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
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.05)';
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
    <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-5 group hover:border-white/10 transition-all shadow-xl flex flex-col gap-3">
        <div className="flex justify-between items-start">
            <div className="p-2.5 rounded-xl bg-white/5 text-gray-500 group-hover:text-white transition-all">
                <Icon size={18} style={{ color: trend > 0 ? '#10b981' : color }} />
            </div>
            <div className={`flex items-center gap-1 text-[10px] font-black font-mono ${trend > 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                {trend > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {Math.abs(trend)}%
            </div>
        </div>
        <div>
            <div className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">{label}</div>
            <div className="text-2xl font-black font-mono text-white tracking-tighter">{value}</div>
        </div>
    </div>
);

// --- MODALS ---

const InvestmentConfirmationModal = ({ op, onConfirm, onCancel }: { op: any, onConfirm: () => void, onCancel: () => void }) => {
    const [step, setStep] = useState(1);
    const feePercent = 0.05; // 0.05%
    const estGas = "$12.40";

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#0a0a0a] border border-[#333] rounded-[3rem] w-full max-w-xl overflow-hidden shadow-[0_0_100px_rgba(16,185,129,0.1)] flex flex-col relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#10b981] via-[#22d3ee] to-transparent opacity-50" />
                
                <div className="p-10 flex flex-col gap-8">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-[#10b981]/10 rounded-2xl border border-[#10b981]/30 text-[#10b981]">
                                <ShieldCheck size={28} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white uppercase tracking-widest leading-none mb-1.5">Capital Disbursement</h2>
                                <p className="text-[8px] text-gray-500 font-mono uppercase tracking-[0.4em]">Multi-Sig Auth Required // Step {step} of 2</p>
                            </div>
                        </div>
                        <button onClick={onCancel} className="p-2 hover:bg-white/5 rounded-xl transition-colors"><X size={20} className="text-gray-600" /></button>
                    </div>

                    <AnimatePresence mode="wait">
                        {step === 1 ? (
                            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                <div className="p-6 bg-black border border-white/5 rounded-2xl space-y-4 shadow-inner">
                                    <div className="flex justify-between text-[10px] font-mono text-gray-500 uppercase tracking-widest"><span>Target Allocation</span><span className="text-white font-black">{op.title}</span></div>
                                    <div className="flex justify-between text-[10px] font-mono text-gray-500 uppercase tracking-widest"><span>Amount</span><span className="text-[#10b981] font-black">$50,000.00</span></div>
                                    <div className="h-px bg-white/5" />
                                    <div className="flex justify-between text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                                        <div className="flex items-center gap-2">Protocol Fee <Info size={10} className="opacity-40" /></div>
                                        <span className="text-gray-400">0.05% ($25.00)</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                                        <div className="flex items-center gap-2">Est. Gas (Grounded)</div>
                                        <span className="text-gray-400">{estGas}</span>
                                    </div>
                                </div>

                                <div className="bg-orange-500/10 border border-orange-500/30 p-5 rounded-2xl flex gap-4">
                                    <AlertTriangle className="text-orange-500 shrink-0" size={20} />
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Risk Variance Detected</div>
                                        <p className="text-[10px] text-orange-200/60 font-mono leading-relaxed italic">This strategy utilizes a cross-chain bridge. Asset lockup period estimated at 72 hours. Confirming proceed?</p>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8 flex flex-col items-center py-10">
                                <div className="relative">
                                    <Fingerprint size={80} className="text-[#10b981] animate-pulse" />
                                    <div className="absolute inset-0 blur-2xl bg-[#10b981]/20 animate-pulse" />
                                </div>
                                <div className="text-center space-y-2">
                                    <h3 className="text-sm font-black text-white uppercase tracking-[0.4em]">Biometric Auth Sync</h3>
                                    <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest">Place thumb on sensor or scan retina to sign.</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex gap-4">
                        <button onClick={onCancel} className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-white transition-all">Abort Protocol</button>
                        <button 
                            onClick={() => step === 1 ? setStep(2) : onConfirm()}
                            className="flex-1 py-4 bg-[#10b981] text-black font-black uppercase text-[10px] tracking-[0.4em] rounded-2xl shadow-[0_20px_50px_rgba(16,185,129,0.3)] hover:bg-[#15d694] active:scale-95 transition-all"
                        >
                            {step === 1 ? 'Verify Vectors' : 'Sign & Deploy'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

// --- MAIN SECTOR ---

const AutonomousFinance: React.FC = () => {
    const { addLog, setMetaventionsState, metaventions, marketData, commitInvestment } = useAppStore();
    const { layers, activeLayerId, strategyLibrary } = metaventions;
    const [activeSector, setActiveSector] = useState<'OVERVIEW' | 'YIELD_OPS' | 'LIQUIDITY'>('OVERVIEW');
    const [isSearching, setIsSearching] = useState(false);
    const [tvl, setTVL] = useState(1420500);
    const [confirmingOp, setConfirmingOp] = useState<any | null>(null);

    const chartData = useMemo(() => Array.from({ length: 30 }, (_, i) => ({
        time: i,
        yield: 8 + Math.random() * 4 + (i * 0.15),
        utilization: 60 + Math.random() * 20
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
        <div className="h-full w-full bg-[#020502] flex flex-col border border-[#1f331f] rounded-[2.5rem] overflow-hidden shadow-2xl relative font-sans">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.03)_0%,transparent_80%)] pointer-events-none" />
            
            <AnimatePresence>
                {confirmingOp && (
                    <InvestmentConfirmationModal 
                        op={confirmingOp} 
                        onConfirm={handleConfirmInvestment} 
                        onCancel={() => setConfirmingOp(null)} 
                    />
                )}
            </AnimatePresence>

            {/* Header / Command Strip */}
            <div className="h-20 border-b border-white/5 bg-[#0a0a0a]/95 backdrop-blur-3xl z-20 flex items-center justify-between px-10 shrink-0 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#10b981]/40 to-transparent" />
                
                <div className="flex items-center gap-12">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#10b981]/10 border border-[#10b981]/40 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                            <Landmark className="w-6 h-6 text-[#10b981]" />
                        </div>
                        <div>
                            <h1 className="text-base font-black font-mono text-white uppercase tracking-[0.4em] leading-none">Wealth Matrix</h1>
                            <span className="text-[9px] text-gray-600 font-mono uppercase tracking-widest mt-2 block">Autonomous Treasury Control // v9.5-ZENITH</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-black/60 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                        {[
                            { id: 'OVERVIEW', label: 'Treasury' },
                            { id: 'YIELD_OPS', label: 'Yield Ops' },
                            { id: 'LIQUIDITY', label: 'Liquidity' }
                        ].map(tab => (
                            <button 
                                key={tab.id}
                                onClick={() => { setActiveSector(tab.id as any); audio.playClick(); }}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                                    ${activeSector === tab.id ? 'bg-white text-black shadow-2xl scale-105' : 'text-gray-500 hover:text-white'}
                                `}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-10">
                    <div className="text-right">
                        <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest block mb-1">Managed AUM</span>
                        <div className="flex items-center gap-3">
                            <span className="text-2xl font-black font-mono text-white tracking-tighter">${tvl.toLocaleString()}</span>
                            <div className="flex flex-col items-end">
                                <span className="text-[8px] font-mono text-[#10b981] font-bold">+14.2%</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_10px_#10b981]" />
                            </div>
                        </div>
                    </div>
                    <button onClick={fetchLiveOpportunities} disabled={isSearching} className="p-3 bg-[#10b981] text-black rounded-2xl transition-all shadow-[0_10px_30px_#10b98144] active:scale-95 group">
                        {isSearching ? <Loader2 className="animate-spin" size={20} /> : <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-700" />}
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Dashboard Surface */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-10 relative">
                    
                    <AnimatePresence mode="wait">
                        {activeSector === 'OVERVIEW' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-10">
                                <div className="grid grid-cols-4 gap-6">
                                    <FinanceMetric label="Revenue Velocity" value="+$420.80/h" trend={12.4} icon={Zap} color="#9d4edd" />
                                    <FinanceMetric label="Protocol Alpha" value="1.24x" trend={8.1} icon={Target} color="#22d3ee" />
                                    <FinanceMetric label="Resource Flux" value="4.8 TB/s" trend={-2.4} icon={Activity} color="#f59e0b" />
                                    <FinanceMetric label="Trust Index" value="99.98" trend={0.01} icon={ShieldCheck} color="#10b981" />
                                </div>

                                <div className="grid grid-cols-12 gap-8">
                                    <div className="col-span-8 bg-[#050505] border border-white/5 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group">
                                        <div className="flex justify-between items-center mb-10 relative z-10">
                                            <div className="flex items-center gap-4">
                                                <ChartIcon size={20} className="text-[#10b981]" />
                                                <span className="text-xs font-black font-mono text-white uppercase tracking-widest">Yield Velocity Profile</span>
                                            </div>
                                            <div className="flex gap-8">
                                                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#10b981]" /><span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Current Yield</span></div>
                                                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#22d3ee] opacity-30" /><span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Capital Utilization</span></div>
                                            </div>
                                        </div>
                                        <div className="h-64 mt-6">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={chartData}>
                                                    <defs>
                                                        <linearGradient id="yieldFin" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#111" vertical={false} />
                                                    <Area type="monotone" dataKey="yield" stroke="#10b981" fill="url(#yieldFin)" strokeWidth={3} isAnimationActive={false} />
                                                    <Area type="monotone" dataKey="utilization" stroke="#22d3ee" fill="transparent" strokeWidth={1} strokeDasharray="4 4" isAnimationActive={false} />
                                                    <Tooltip contentStyle={{ backgroundColor: '#050505', border: '1px solid #222', borderRadius: '12px', fontSize: '10px', color: '#fff' }} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className="col-span-4 bg-[#0a0a0a] border border-white/5 rounded-[3rem] p-10 flex flex-col justify-between relative overflow-hidden group shadow-2xl">
                                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity rotate-12"><Fingerprint size={120} /></div>
                                        <div className="relative z-10">
                                            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-4">Neural Compliance Score</span>
                                            <div className="text-5xl font-black font-mono text-white tracking-tighter">98.4%</div>
                                        </div>
                                        <div className="space-y-6 relative z-10">
                                            <div className="flex justify-between text-[9px] font-mono text-gray-500 uppercase tracking-widest"><span>System Drift</span><span className="text-[#10b981] font-black">MINIMAL</span></div>
                                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                <motion.div animate={{ width: '98.4%' }} className="h-full bg-[#10b981] shadow-[0_0_10px_#10b981]" />
                                            </div>
                                            <p className="text-[8px] text-gray-600 font-mono uppercase tracking-[0.2em] leading-relaxed">Multi-sig attestations confirmed via 12 distributed nodes across 3 sectors.</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeSector === 'YIELD_OPS' && (
                            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-8">
                                <div className="flex items-center justify-between px-2">
                                    <div className="space-y-1">
                                        <h2 className="text-2xl font-black text-white uppercase tracking-widest">Yield Operations Hub</h2>
                                        <p className="text-[10px] text-gray-600 font-mono uppercase tracking-[0.3em]">Real-time farm monitoring & autopoietic harvesting.</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="px-5 py-2.5 bg-[#10b981]/10 border border-[#10b981]/30 rounded-xl text-[10px] font-black text-[#10b981] uppercase tracking-widest flex items-center gap-3">
                                            <PlayCircle size={16} /> Auto-Harvest: ACTIVE
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-8">
                                    {[
                                        { id: 1, name: 'Compute Liquidity Alpha', source: 'Qubic Nodes', yield: '+14.2%', risk: 'Low', status: 'Optimal', color: '#10b981' },
                                        { id: 2, name: 'Storage Relay Gamma', source: 'Arweave Bridge', yield: '+8.4%', risk: 'Med', status: 'Stable', color: '#f59e0b' },
                                        { id: 3, name: 'Neural Bandwidth Delta', source: 'Bittensor Uplink', yield: '+22.8%', risk: 'High', status: 'Volatile', color: '#ef4444' }
                                    ].map(farm => (
                                        <div key={farm.id} className="p-8 bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] relative overflow-hidden group hover:border-white/20 transition-all shadow-2xl">
                                            <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity"><Flame size={120} /></div>
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="p-3 bg-white/5 rounded-2xl text-gray-400 group-hover:text-white transition-colors"><PieChart size={24} /></div>
                                                <div className="text-right">
                                                    <div className="text-2xl font-black font-mono text-white tracking-tighter">{farm.yield}</div>
                                                    <span className="text-[7px] text-gray-600 uppercase font-mono tracking-widest">CURRENT_APY</span>
                                                </div>
                                            </div>
                                            <h4 className="text-sm font-black text-white uppercase tracking-widest mb-2 truncate">{farm.name}</h4>
                                            <div className="flex items-center gap-3 text-[9px] font-mono text-gray-500 uppercase tracking-tighter mb-8">
                                                <div className="flex items-center gap-1.5"><Globe size={10} /> {farm.source}</div>
                                                <div className="h-3 w-px bg-white/5" />
                                                <div className="flex items-center gap-1.5" style={{ color: farm.color }}><Shield size={10} /> {farm.risk} Risk</div>
                                            </div>
                                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                                <motion.div initial={{ width: 0 }} animate={{ width: '64%' }} className="h-full bg-current" style={{ color: farm.color }} />
                                            </div>
                                            <div className="mt-8 flex justify-between items-center">
                                                <button className="text-[9px] font-black text-[#9d4edd] uppercase tracking-widest hover:underline">Inspect Node</button>
                                                <span className="text-[8px] font-mono text-gray-700 uppercase">Synced 2m ago</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-[#050505] border border-white/5 rounded-[3rem] p-10 shadow-inner">
                                    <div className="flex items-center gap-4 mb-8">
                                        <History size={18} className="text-gray-500" />
                                        <span className="text-[11px] font-black text-white uppercase tracking-[0.4em]">Resource Rebalancing Ledger</span>
                                    </div>
                                    <div className="space-y-4">
                                        {[1,2,3].map(i => (
                                            <div key={i} className="flex items-center justify-between p-4 bg-white/[0.01] rounded-2xl border border-white/5 group hover:bg-white/[0.03] transition-all">
                                                <div className="flex items-center gap-6">
                                                    <div className="p-2 bg-[#22d3ee]/10 text-[#22d3ee] rounded-lg"><ArrowLeftRight size={14} /></div>
                                                    <div>
                                                        <div className="text-[10px] font-bold text-gray-300 uppercase font-mono">{"Migrated Capital L0 -> L2"}</div>
                                                        <p className="text-[8px] text-gray-600 font-mono uppercase tracking-widest">Optimizing for Compute Alpha yield increase.</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[11px] font-black text-white font-mono">$12,400.00</div>
                                                    <span className="text-[7px] text-gray-700 font-mono uppercase">2025-05-2{i} 14:22:1{i}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="grid grid-cols-12 gap-8 h-[600px] shrink-0">
                        <div className="col-span-12 bg-black border border-white/5 rounded-[4rem] flex flex-col overflow-hidden shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] relative">
                            <div className="h-16 border-b border-white/5 bg-white/[0.01] flex items-center px-12 justify-between shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-[#9d4edd]/10 rounded-xl text-[#9d4edd] border border-[#9d4edd]/30">
                                        <GitMerge size={16} />
                                    </div>
                                    <span className="text-[11px] font-black font-mono text-white uppercase tracking-[0.5em]">Investment Handover Queue</span>
                                </div>
                                <div className="flex items-center gap-6 text-[9px] font-mono text-gray-600 uppercase tracking-widest">
                                    <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" /> Signal_Locked</div>
                                    <span>{marketData.opportunities.length} VECTORS_BUFFERED</span>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-12 grid grid-cols-2 gap-10">
                                {marketData.opportunities.map((op, i) => (
                                    <motion.div 
                                        key={op.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.08 }}
                                        className="p-10 bg-[#050505] border border-white/5 rounded-[3rem] group/card hover:border-[#9d4edd]/40 transition-all duration-700 shadow-2xl relative overflow-hidden flex flex-col"
                                    >
                                        <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover/card:opacity-[0.08] transition-opacity rotate-12"><Zap size={100} className="text-[#9d4edd]" /></div>
                                        <div className="flex justify-between items-start mb-8 relative z-10">
                                            <div className="flex-1">
                                                <h4 className="text-xl font-black text-white uppercase font-mono tracking-tighter mb-3 group-hover/card:text-[#9d4edd] transition-colors">{op.title}</h4>
                                                <div className="flex gap-2">
                                                    <span className={`text-[8px] px-3 py-1 rounded-full bg-white/5 border border-white/10 font-black font-mono uppercase tracking-widest ${op.risk === 'HIGH' ? 'text-red-500' : 'text-gray-500'}`}>{op.risk} Risk Manifold</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-3xl font-black font-mono text-[#10b981] tracking-tighter">{op.yield}</span>
                                                <span className="text-[9px] font-mono text-gray-700 uppercase block mt-1 tracking-[0.2em]">Target_APY</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 space-y-6 relative z-10 mb-8">
                                            <p className="text-[12px] text-gray-500 font-mono leading-relaxed italic border-l-4 border-white/10 pl-8 group-hover/card:text-gray-300 transition-colors">"{op.logic}"</p>
                                            
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-3 bg-black border border-white/5 rounded-xl flex flex-col gap-1">
                                                    <span className="text-[7px] text-gray-600 uppercase font-mono tracking-widest">Protocol Fee</span>
                                                    <span className="text-[11px] font-black text-white font-mono">{op.fee}%</span>
                                                </div>
                                                <div className="p-3 bg-black border border-white/5 rounded-xl flex flex-col gap-1">
                                                    <span className="text-[7px] text-gray-600 uppercase font-mono tracking-widest">Deployment Lvl</span>
                                                    <span className="text-[11px] font-black text-white font-mono">0xAF-12</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-4 relative z-10">
                                            <button 
                                                onClick={() => setConfirmingOp(op)}
                                                className="flex-1 py-5 bg-[#10b981] text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl hover:bg-[#15d694] active:scale-95 transition-all flex items-center justify-center gap-3"
                                            >
                                                Authorize Disbursement
                                                <ArrowRight size={14}/>
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Pipeline Monitor */}
                <div className="w-[380px] border-l border-[#1f331f] bg-[#050805] flex flex-col shrink-0">
                    <div className="p-10 border-b border-white/5 bg-white/[0.01]">
                        <div className="flex items-center justify-between mb-12">
                            <div className="flex items-center gap-4">
                                <Binary size={20} className="text-[#10b981]" />
                                <h2 className="text-[11px] font-black text-white uppercase tracking-[0.4em]">Resource Flow</h2>
                            </div>
                            <span className="text-[7px] font-mono text-gray-700">v9.5_STABLE</span>
                        </div>
                        <div className="space-y-12">
                            {[
                                { label: 'Compute Arb', val: 42, color: '#10b981', load: 'HIGH' },
                                { label: 'Liquidity Bridge', val: 28, color: '#22d3ee', load: 'STABLE' },
                                { label: 'Operational Buffer', val: 15, color: '#f59e0b', load: 'OPTIMAL' }
                            ].map(item => (
                                <div key={item.label} className="space-y-5">
                                    <div className="flex justify-between items-end">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{item.label}</span>
                                            <span className="text-[8px] font-mono text-gray-700 uppercase tracking-widest">{item.load}_PRIORITY</span>
                                        </div>
                                        <span className="text-2xl font-black font-mono text-white tracking-tighter">{item.val}%</span>
                                    </div>
                                    <ResourceFlowVisualizer />
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${item.val}%` }} className="h-full rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: item.color, color: item.color }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 p-10 space-y-10 overflow-y-auto custom-scrollbar">
                        <div className="p-8 bg-[#0a100a] border border-[#10b981]/20 rounded-[2.5rem] relative overflow-hidden group shadow-2xl transition-all hover:border-[#10b981]/40">
                             <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-[0.02] transition-opacity rotate-12"><Shield size={80} className="text-[#10b981]" /></div>
                             <div className="flex items-center gap-4 mb-6">
                                 <ShieldCheck size={20} className="text-[#10b981]" />
                                 <span className="text-[11px] font-black text-white uppercase tracking-[0.3em]">Sovereign Audit</span>
                             </div>
                             <p className="text-[11px] text-gray-500 font-mono leading-relaxed italic">"Treasury architecture verified via multi-sig enclave L0. All disbursements ground via Bridge protocols and reality oracles."</p>
                             <div className="mt-8 flex items-center justify-between">
                                 <div className="flex items-center gap-3">
                                     <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_10px_#10b981]" />
                                     <span className="text-[9px] font-mono text-[#10b981] font-black uppercase tracking-widest">Enclave_Secured</span>
                                 </div>
                                 <span className="text-[9px] font-mono text-gray-700 uppercase">3m ago</span>
                             </div>
                        </div>

                        <div className="p-8 bg-black/40 border border-white/5 rounded-[2.5rem] space-y-6">
                            <div className="flex items-center gap-4">
                                <History size={18} className="text-gray-700" />
                                <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Handover Status</span>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                                    <div className="flex-1">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase font-mono">Sync with ImageGen</div>
                                        <div className="text-[8px] text-gray-700 font-mono">STABLE // 12m ago</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#9d4edd] animate-pulse" />
                                    <div className="flex-1">
                                        <div className="text-[10px] font-bold text-[#9d4edd] uppercase font-mono">Sync with Hardware</div>
                                        <div className="text-[8px] text-gray-700 font-mono">ACTIVE_HACK // now</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tactical Footer */}
            <div className="h-12 bg-[#0a0a0a] border-t border-[#1f331f] px-12 flex items-center justify-between text-[9px] font-mono text-gray-600 shrink-0 relative z-[60]">
                <div className="flex gap-12 items-center overflow-x-auto no-scrollbar whitespace-nowrap">
                    <div className="flex items-center gap-4 text-emerald-500 font-bold uppercase tracking-[0.2em]">
                        <Lock size={16} className="shadow-[0_0_15px_#10b981]" /> Financial_Vault_Secured
                    </div>
                    <div className="flex items-center gap-4 uppercase tracking-[0.3em]">
                        <Activity size={16} className="text-[#22d3ee]" /> Market_Grounding: ACTIVE
                    </div>
                    <div className="flex items-center gap-4 uppercase tracking-[0.3em]">
                        <Globe size={16} className="text-[#f59e0b]" /> Global_Oracles: SYNCHRONIZED
                    </div>
                </div>
                <div className="flex items-center gap-10 shrink-0">
                    <span className="uppercase tracking-[0.5em] opacity-40 leading-none hidden lg:block text-[8px]">Sovereign Finance Division v9.5 // Real-World Capital Deployment Engine</span>
                    <div className="h-6 w-px bg-white/10 hidden lg:block" />
                    <span className="font-black text-gray-400 uppercase tracking-widest leading-none text-[10px]">OS_TREASURY_CORE</span>
                </div>
            </div>
        </div>
    );
};

export default AutonomousFinance;