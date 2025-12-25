import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// Added Fingerprint to the list of imports
import { 
    DollarSign, TrendingUp, Zap, Activity, Globe, Loader2, 
    RefreshCw, ShieldCheck, Target, GitMerge, BarChart3,
    ArrowUpRight, Binary, Cpu, Wallet, Compass, Search,
    Lock, CheckCircle, Info, TrendingDown, Layers, Terminal,
    LineChart as ChartIcon, Coins, Landmark, Briefcase, 
    ShieldAlert, Network, Share2, ArrowRight, Server, Radio, Shield,
    CheckCircle2, AlertTriangle, PlayCircle, X, ArrowDownRight,
    ArrowUp, Percent, ChevronRight, Fingerprint
} from 'lucide-react';
import { useAppStore } from '../store';
import { searchRealWorldOpportunities, promptSelectKey, assessInvestmentRisk } from '../services/geminiService';
import { audio } from '../services/audioService';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, CartesianGrid, LineChart, Line } from 'recharts';

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

            // Path Line
            ctx.beginPath();
            ctx.moveTo(spawnPoint.x, spawnPoint.y);
            ctx.lineTo(endPoint.x, endPoint.y);
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.05)';
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Particles
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
        requestAnimationFrame(render);
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

const AutonomousFinance: React.FC = () => {
    const { addLog, setMetaventionsState, metaventions, marketData, commitInvestment } = useAppStore();
    const [activeSector, setActiveSector] = useState<'OVERVIEW' | 'YIELD_OPS' | 'LIQUIDITY'>('OVERVIEW');
    const [isSearching, setIsSearching] = useState(false);
    const [tvl, setTVL] = useState(1420500);

    const chartData = useMemo(() => Array.from({ length: 30 }, (_, i) => ({
        time: i,
        yield: 8 + Math.random() * 4 + (i * 0.15),
        utilization: 60 + Math.random() * 20
    })), []);

    const fetchLiveOpportunities = async () => {
        setIsSearching(true);
        audio.playClick();
        addLog('SYSTEM', 'FINANCE_SCAN: Re-evaluating DePIN resource vectors...');
        try {
            if (!(await window.aistudio?.hasSelectedApiKey())) { await promptSelectKey(); return; }
            const results = await searchRealWorldOpportunities('DEPIN');
            const sanitized = results.map((r: any, i: number) => ({ ...r, id: `ext-${Date.now()}-${i}` }));
            useAppStore.setState(s => ({ marketData: { ...s.marketData, opportunities: sanitized.slice(0, 8), lastSync: Date.now() } }));
            addLog('SUCCESS', `FINANCE_SCAN: Synchronized ${results.length} yield sources.`);
            audio.playSuccess();
        } catch (e) {
            addLog('ERROR', 'FINANCE_SCAN_FAIL: Oracles offline.');
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="h-full w-full bg-[#020502] flex flex-col border border-[#1f331f] rounded-[3.5rem] overflow-hidden shadow-2xl relative font-sans">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.02)_0%,transparent_80%)] pointer-events-none" />
            
            {/* Header / Command Strip */}
            <div className="h-20 border-b border-white/5 bg-[#0a0a0a]/95 backdrop-blur-3xl z-20 flex items-center justify-between px-10 shrink-0 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#10b981]/40 to-transparent" />
                
                <div className="flex items-center gap-12">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#10b981]/10 border border-[#10b981]/40 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                            <Landmark className="w-6 h-6 text-[#10b981]" />
                        </div>
                        <div>
                            <h1 className="text-base font-black font-mono text-white uppercase tracking-[0.4em] leading-none">Wealth Matrix</h1>
                            <span className="text-[9px] text-gray-500 font-mono uppercase tracking-widest mt-2 block">Autonomous Treasury Control // v9.0-ZENITH</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-2xl border border-white/5">
                        {[
                            { id: 'OVERVIEW', label: 'Treasury' },
                            { id: 'YIELD_OPS', label: 'Yield Ops' },
                            { id: 'LIQUIDITY', label: 'Liquidity' }
                        ].map(tab => (
                            <button 
                                key={tab.id}
                                onClick={() => { setActiveSector(tab.id as any); audio.playClick(); }}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                                    ${activeSector === tab.id ? 'bg-white text-black shadow-xl' : 'text-gray-500 hover:text-white'}
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
                    <button onClick={fetchLiveOpportunities} disabled={isSearching} className="p-3 bg-[#10b981] text-black rounded-2xl transition-all shadow-[0_10px_30px_#10b98144] active:scale-95">
                        {isSearching ? <Loader2 className="animate-spin" size={20} /> : <RefreshCw size={20} />}
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Dashboard Surface */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-10 relative">
                    
                    <div className="grid grid-cols-4 gap-6 shrink-0">
                        <FinanceMetric label="Revenue Velocity" value="+$420.80/h" trend={12.4} icon={Zap} color="#9d4edd" />
                        <FinanceMetric label="Protocol Alpha" value="1.24x" trend={8.1} icon={Target} color="#22d3ee" />
                        <FinanceMetric label="Resource Flux" value="4.8 TB/s" trend={-2.4} icon={Activity} color="#f59e0b" />
                        <FinanceMetric label="Trust Index" value="99.98" trend={0.01} icon={ShieldCheck} color="#10b981" />
                    </div>

                    <div className="grid grid-cols-12 gap-8 shrink-0">
                        <div className="col-span-8 bg-[#050505] border border-white/5 rounded-[3rem] p-8 shadow-2xl relative overflow-hidden group">
                            <div className="flex justify-between items-center mb-8 relative z-10">
                                <div className="flex items-center gap-4">
                                    <ChartIcon size={20} className="text-[#10b981]" />
                                    <span className="text-xs font-black font-mono text-white uppercase tracking-widest">Yield Velocity Profile</span>
                                </div>
                                <div className="flex gap-6">
                                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#10b981]" /><span className="text-[9px] font-mono text-gray-600">YIELD</span></div>
                                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#22d3ee]" /><span className="text-[9px] font-mono text-gray-600">CAP_UTIL</span></div>
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
                                        <Tooltip contentStyle={{ backgroundColor: '#050505', borderColor: '#222', fontSize: '10px', color: '#fff' }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="col-span-4 bg-[#0a0a0a] border border-white/5 rounded-[3rem] p-8 flex flex-col justify-between relative overflow-hidden group shadow-2xl">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity rotate-12"><Fingerprint size={120} /></div>
                            <div className="relative z-10">
                                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-4">Neural Compliance Score</span>
                                <div className="text-5xl font-black font-mono text-white tracking-tighter">98.4%</div>
                            </div>
                            <div className="space-y-4 relative z-10">
                                <div className="flex justify-between text-[9px] font-mono text-gray-500 uppercase"><span>System Drift</span><span>MINIMAL</span></div>
                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                    <motion.div animate={{ width: '98.4%' }} className="h-full bg-[#10b981]" />
                                </div>
                                <p className="text-[8px] text-gray-600 font-mono uppercase tracking-widest leading-relaxed">Multi-sig attestations confirmed via 12 distributed nodes.</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-12 gap-8 h-[500px]">
                        <div className="col-span-12 bg-black border border-white/5 rounded-[3.5rem] flex flex-col overflow-hidden shadow-inner relative">
                            <div className="h-16 border-b border-white/5 bg-white/[0.01] flex items-center px-10 justify-between shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-[#9d4edd]/10 rounded-xl text-[#9d4edd] border border-[#9d4edd]/30">
                                        <GitMerge size={16} />
                                    </div>
                                    <span className="text-[11px] font-black font-mono text-white uppercase tracking-[0.4em]">Investment Handover Queue</span>
                                </div>
                                <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">{marketData.opportunities.length} VECTORS_BUFFERED</span>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-10 grid grid-cols-2 gap-8">
                                {marketData.opportunities.map((op, i) => (
                                    <motion.div 
                                        key={op.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="p-8 bg-[#050505] border border-white/5 rounded-[2.5rem] group/card hover:border-[#9d4edd]/40 transition-all shadow-2xl relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover/card:opacity-[0.06] transition-opacity rotate-12"><Zap size={80} /></div>
                                        <div className="flex justify-between items-start mb-6 relative z-10">
                                            <div className="flex-1">
                                                <h4 className="text-lg font-black text-white uppercase font-mono tracking-tighter mb-2">{op.title}</h4>
                                                <div className="flex gap-2">
                                                    <span className="text-[8px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-500 font-mono uppercase tracking-widest">{op.risk} Risk</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xl font-black font-mono text-[#10b981]">{op.yield}</span>
                                                <span className="text-[8px] font-mono text-gray-600 uppercase block mt-1">EST_APY</span>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-gray-500 font-mono leading-relaxed mb-8 italic border-l border-white/10 pl-6 group-hover/card:text-gray-300 transition-colors">"{op.logic}"</p>
                                        <div className="flex gap-4 relative z-10">
                                            <button 
                                                onClick={() => { commitInvestment(op.id, 50000); audio.playSuccess(); }}
                                                className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all flex items-center justify-center gap-3 active:scale-95"
                                            >
                                                Authorize Disbursement
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Pipeline Monitor */}
                <div className="w-80 border-l border-[#1f331f] bg-[#050805] flex flex-col shrink-0">
                    <div className="p-8 border-b border-white/5 bg-white/[0.01]">
                        <div className="flex items-center gap-4 mb-10">
                            <Binary size={18} className="text-[#10b981]" />
                            <h2 className="text-[11px] font-black text-white uppercase tracking-[0.4em]">Resource Flow</h2>
                        </div>
                        <div className="space-y-10">
                            {[
                                { label: 'Compute Arb', val: 42, color: '#10b981' },
                                { label: 'Liquidity Bridge', val: 28, color: '#22d3ee' },
                                { label: 'Operational Buffer', val: 15, color: '#f59e0b' }
                            ].map(item => (
                                <div key={item.label} className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{item.label}</span>
                                        <span className="text-lg font-black font-mono text-white tracking-tighter">{item.val}%</span>
                                    </div>
                                    <ResourceFlowVisualizer />
                                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${item.val}%` }} className="h-full" style={{ backgroundColor: item.color }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 p-8 space-y-8 overflow-y-auto custom-scrollbar">
                        <div className="p-6 bg-[#0a100a] border border-[#10b981]/20 rounded-3xl relative overflow-hidden group shadow-2xl transition-all hover:border-[#10b981]/40">
                             <div className="flex items-center gap-3 mb-4">
                                 <Shield size={16} className="text-[#10b981]" />
                                 <span className="text-[10px] font-black text-white uppercase tracking-widest">Sovereign Audit</span>
                             </div>
                             <p className="text-[10px] text-gray-500 font-mono leading-relaxed">Vault architecture verified via multi-sig. All disbursements ground via Bridge protocols.</p>
                             <div className="mt-4 flex items-center justify-between">
                                 <div className="flex items-center gap-2">
                                     <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                                     <span className="text-[8px] font-mono text-[#10b981] font-black uppercase">Secured</span>
                                 </div>
                                 <span className="text-[8px] font-mono text-gray-600">3m ago</span>
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tactical Footer */}
            <div className="h-12 bg-[#0a0a0a] border-t border-[#1f331f] px-12 flex items-center justify-between text-[10px] font-mono text-gray-600 shrink-0 relative z-[60]">
                <div className="flex gap-12 items-center overflow-x-auto no-scrollbar whitespace-nowrap">
                    <div className="flex items-center gap-4 text-emerald-500 font-bold uppercase tracking-[0.2em]">
                        <Lock size={16} className="shadow-[0_0_15px_#10b981]" /> Financial_Vault_Secured
                    </div>
                    <div className="flex items-center gap-4 uppercase tracking-widest">
                        <Activity size={16} className="text-[#22d3ee]" /> Market_Grounding: ACTIVE
                    </div>
                </div>
                <div className="flex items-center gap-8 shrink-0">
                    <span className="uppercase tracking-[0.5em] opacity-40 leading-none hidden lg:block text-[9px]">Sovereign Finance Division v9.0 // Real-World Capital Deployment</span>
                    <div className="h-6 w-px bg-white/10 hidden lg:block" />
                    <span className="font-black text-gray-400 uppercase tracking-widest leading-none text-[10px]">OS_TREASURY_CORE</span>
                </div>
            </div>
        </div>
    );
};

export default AutonomousFinance;