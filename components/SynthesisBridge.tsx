import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    GitMerge, Activity, Globe, Cpu, Database, Shield, Zap, TrendingUp, 
    ArrowRight, Loader2, Target, Radio, GitBranch, Terminal, Layers,
    Network, Server, Lock, Fingerprint, Coins, Box, Microscope, Sparkles,
    Eye, Search, LayoutGrid, Hammer, Telescope, History, Scan, 
    Construction, Navigation2, LineChart, ShieldAlert, Workflow, Binary,
    Save, RefreshCw, BarChart3, Wind, Satellite, Radar, HardDrive, 
    Dna, Link, BoxSelect, Droplets, FlaskConical, CircleDot, AlertTriangle, ChevronRight, X, Wallet, ArrowUp, ArrowDown, Send, FileCode, CheckCircle, ShieldCheck,
    BrainCircuit, CreditCard, PieChart, Copy, ExternalLink, BarChart, Clock, ShieldAlert as AlertIcon,
    Key, Tooltip, Workflow as FlowIcon, Receipt, HandCoins, Landmark, Calculator, Truck, Wrench
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell, ScatterChart, Scatter, ZAxis, CartesianGrid, Legend } from 'recharts';
import { StrategyLayer, InterventionProtocol, AgentWallet, EconomicProtocol, EscrowAccount } from '../types';
import { GoogleGenAI, GenerateContentResponse, Type, Schema } from '@google/genai';
import { retryGeminiRequest, refractStrategy, runStrategicStressTest, synthesizeEconomicDirective, promptSelectKey } from '../services/geminiService';
import { KNOWLEDGE_LAYERS } from '../data/knowledgeLayers';

const MotionDiv = motion.div as any;

// --- Sub-Components ---

const PhysicalServiceMarket: React.FC<{ onHire: (type: string) => void }> = ({ onHire }) => {
    const services = [
        { id: 'COOLING', label: 'Rack Cooling Maintenance', price: 'Ξ 0.2', icon: Wind, eta: '2h' },
        { id: 'DELIVERY', label: 'Hardware Module Delivery', price: 'Ξ 0.05', icon: Truck, eta: '4h' },
        { id: 'SMART_HANDS', label: 'Data Center Smart Hands', price: 'Ξ 0.5', icon: Wrench, eta: '1h' },
    ];

    return (
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl p-6 flex flex-col gap-4 shadow-xl">
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-widest flex items-center gap-2">
                <Truck size={16} className="text-[#f59e0b]" /> Physical Service Requisition
            </h3>
            <div className="space-y-2">
                {services.map(s => (
                    <button 
                        key={s.id} 
                        onClick={() => onHire(s.id)}
                        className="w-full p-3 bg-black border border-[#222] hover:border-[#f59e0b] rounded-xl flex items-center justify-between group transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[#f59e0b]/10 rounded-lg text-[#f59e0b] group-hover:scale-110 transition-transform">
                                <s.icon size={14} />
                            </div>
                            <div className="text-left">
                                <div className="text-[10px] font-bold text-white font-mono">{s.label}</div>
                                <div className="text-[8px] text-gray-500 font-mono">ETA: {s.eta}</div>
                            </div>
                        </div>
                        <div className="text-[10px] font-black text-[#f59e0b] font-mono">{s.price}</div>
                    </button>
                ))}
            </div>
        </div>
    );
};

const ValueFlowCortex = () => {
    const [data, setData] = useState(Array.from({ length: 20 }, (_, i) => ({
        time: i,
        outflow: 10 + Math.random() * 20,
        inflow: 5 + Math.random() * 25,
        liquidity: 400 + Math.random() * 50
    })));

    useEffect(() => {
        const interval = setInterval(() => {
            setData(prev => {
                const last = prev[prev.length - 1];
                const outflow = Math.max(5, last.outflow + (Math.random() * 10 - 5));
                const inflow = Math.max(5, last.inflow + (Math.random() * 10 - 5));
                const liquidity = last.liquidity + (inflow - outflow);
                return [...prev.slice(1), { time: last.time + 1, outflow, inflow, liquidity }];
            });
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl p-6 flex flex-col h-[350px] shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.03)_0%,transparent_70%)] pointer-events-none"></div>
            <div className="flex justify-between items-center mb-6 relative z-10">
                <div>
                    <h3 className="text-[10px] font-black font-mono text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <LineChart size={14} className="text-[#22d3ee]" /> Autonomous Value Cortex
                    </h3>
                    <p className="text-[8px] text-gray-600 font-mono mt-1 uppercase tracking-widest">Real-time Cross-Chain Liquidity Delta</p>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#22d3ee]"></div> <span className="text-[8px] text-gray-500 font-mono uppercase">Inflow</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#ef4444]"></div> <span className="text-[8px] text-gray-500 font-mono uppercase">Spend</span></div>
                </div>
            </div>
            <div className="flex-1 relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="flowIn" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="flowOut" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#111" vertical={false} />
                        <XAxis dataKey="time" hide />
                        <YAxis hide domain={['auto', 'auto']} />
                        <RechartsTooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333', fontSize: '10px', fontFamily: 'monospace' }} />
                        <Area type="monotone" dataKey="inflow" stroke="#22d3ee" strokeWidth={2} fill="url(#flowIn)" animationDuration={1000} />
                        <Area type="monotone" dataKey="outflow" stroke="#ef4444" strokeWidth={2} fill="url(#flowOut)" animationDuration={1000} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-4 flex justify-between items-center text-[9px] font-mono text-gray-600 border-t border-[#1f1f1f] pt-4">
                <span className="flex items-center gap-1"><RefreshCw size={10} className="animate-spin-slow" /> SYNCING_VECTORS</span>
                <span className="text-white font-bold">TOTAL_AUM: Ξ {data[data.length-1].liquidity.toFixed(1)}</span>
            </div>
        </div>
    );
};

const EconomicProtocolLedger: React.FC<{ protocols: EconomicProtocol[] }> = ({ protocols }) => {
    return (
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl flex flex-col overflow-hidden h-full shadow-2xl">
            <div className="h-12 bg-[#111] border-b border-[#1f1f1f] flex items-center justify-between px-5">
                <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400 uppercase tracking-widest font-black">
                    <Activity size={14} className="text-[#22d3ee]" /> Economic Directives
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[8px] font-mono text-gray-600">AGENT_AUTONOMY: 98%</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#42be65] animate-pulse" />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-3">
                {protocols.map((p) => (
                    <motion.div 
                        key={p.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-4 bg-black border border-[#222] rounded-xl hover:border-[#22d3ee]/50 transition-all group relative overflow-hidden"
                    >
                        <div className={`absolute top-0 left-0 w-1 h-full ${p.status === 'SETTLED' ? 'bg-[#42be65]' : p.status === 'EXECUTING' ? 'bg-[#22d3ee] animate-pulse' : 'bg-gray-700'}`} />
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[11px] font-black text-white uppercase group-hover:text-[#22d3ee] transition-colors">{p.title}</span>
                            <span className={`text-[8px] font-mono px-1.5 rounded border font-bold ${p.status === 'SETTLED' ? 'text-[#42be65] border-[#42be65]/30 bg-[#42be65]/10' : 'text-gray-500 border-gray-800'}`}>
                                {p.status}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-[8px] text-[#22d3ee] bg-[#22d3ee]/10 px-1 rounded font-bold uppercase">{p.type}</span>
                            <span className="text-[10px] font-mono text-white font-bold">{p.budget}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 font-mono leading-relaxed italic line-clamp-1">"{p.action}"</p>
                        <div className="mt-3 flex justify-between items-center text-[8px] font-mono text-gray-700">
                             <span className="flex items-center gap-1"><Clock size={10}/> {new Date(p.timestamp).toLocaleTimeString()}</span>
                             <span className="flex items-center gap-1"><ShieldCheck size={10} className="text-[#42be65]"/> VERIFIED</span>
                        </div>
                    </motion.div>
                ))}
                {protocols.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                        <Coins size={48} className="mb-4" />
                        <p className="text-[10px] font-mono uppercase tracking-[0.2em]">No Active Protocols</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const WalletStation: React.FC<{ wallets: AgentWallet[] }> = ({ wallets }) => {
    const [activeIdx, setActiveIdx] = useState(0);
    const wallet = wallets[activeIdx];
    const data = useMemo(() => wallet.assets || [], [wallet]);

    return (
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl p-6 flex flex-col gap-6 group relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-100 transition-opacity">
                <Wallet className="w-32 h-32 text-[#9d4edd]" />
            </div>
            <div className="flex justify-between items-center relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[#9d4edd]/10 border border-[#9d4edd]/30 text-[#9d4edd]"><CreditCard size={20} /></div>
                    <div>
                        <span className="text-[10px] font-black font-mono text-gray-500 uppercase tracking-widest block">Agentic Economic Hub</span>
                        <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">AI-Native Wallets</h3>
                    </div>
                </div>
                <div className="flex gap-3">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#42be65]/10 border border-[#42be65]/30 rounded-full">
                        <ShieldCheck size={10} className="text-[#42be65]" />
                        <span className="text-[8px] font-black text-[#42be65] uppercase">AA Enabled</span>
                    </div>
                    <div className="flex gap-2">
                        {wallets.map((_, i) => (
                            <button key={i} onClick={() => setActiveIdx(i)} className={`w-2 h-2 rounded-full transition-all ${activeIdx === i ? 'bg-[#9d4edd] scale-125 shadow-[0_0_8px_#9d4edd]' : 'bg-gray-800'}`} />
                        ))}
                    </div>
                </div>
            </div>
            <div className="space-y-6 relative z-10">
                <div className="bg-black/40 border border-[#222] p-4 rounded-xl relative group/card">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#9d4edd]/5 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity" />
                    <div className="text-[8px] text-gray-600 font-mono uppercase font-bold tracking-widest mb-2 flex items-center gap-2"><Lock size={10} className="text-[#9d4edd]" /> Account Abstraction (ERC-4337)</div>
                    <div className="text-[11px] font-mono text-white flex justify-between items-center group/addr"><span className="truncate max-w-[200px] text-[#22d3ee]">{wallet.address}</span><div className="flex gap-2 opacity-0 group-hover/addr:opacity-100 transition-opacity"><Copy size={12} className="text-gray-600 hover:text-[#9d4edd] cursor-pointer" /><ExternalLink size={12} className="text-gray-600 hover:text-[#9d4edd] cursor-pointer" /></div></div>
                </div>
                <div className="flex items-end justify-between">
                    <div>
                        <div className="text-[8px] text-gray-500 font-mono uppercase tracking-widest mb-1">Autonomous Liquidity</div>
                        <div className="text-4xl font-black text-white font-mono tracking-tighter flex items-baseline gap-2">{wallet.balance}<span className="text-xs text-gray-600 font-bold">{wallet.currency}</span></div>
                    </div>
                    <div className="text-right">
                        <div className="text-[8px] text-gray-500 font-mono uppercase">Delta Flow</div>
                        <div className="text-sm font-bold text-[#42be65] font-mono flex items-center gap-1 justify-end"><TrendingUp size={14} /> +12.4%</div>
                    </div>
                </div>
                <div className="h-40 w-full bg-black/20 rounded-xl p-2 border border-white/5 relative">
                    <div className="absolute top-2 left-2 text-[8px] text-gray-600 font-mono uppercase tracking-widest px-2">Portfolio Allocation</div>
                    <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={data} margin={{ top: 30, right: 10, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                            <XAxis dataKey="label" stroke="#444" tick={{ fontSize: 8, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                            <YAxis hide />
                            <RechartsTooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333', fontSize: '10px', borderRadius: '8px', color: '#fff' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={24}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#9d4edd' : index === 1 ? '#22d3ee' : index === 2 ? '#f59e0b' : '#3b82f6'} />
                                ))}
                            </Bar>
                        </RechartsBarChart>
                    </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <button className="py-3 bg-white/5 border border-white/10 hover:border-white/20 rounded-xl text-[10px] font-mono font-bold uppercase flex items-center justify-center gap-2 transition-all group/btn"><Send size={14} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" /> Disburse Assets</button>
                    <button className="py-3 bg-[#9d4edd]/20 border border-[#9d4edd]/30 hover:border-[#9d4edd] rounded-xl text-[10px] font-mono font-bold uppercase flex items-center justify-center gap-2 text-[#9d4edd] transition-all"><ArrowDown size={14} /> Requisition</button>
                </div>
            </div>
        </div>
    );
};

const AccountAbstractionConfig = () => {
    return (
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl p-6 flex flex-col gap-5 shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(157,78,221,0.02)_25%,transparent_25%)] bg-[size:10px_10px] pointer-events-none"></div>
            <div className="flex items-center gap-3 relative z-10">
                <div className="p-2 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg text-[#f59e0b]"><Landmark size={18} /></div>
                <h3 className="text-xs font-bold text-white font-mono uppercase tracking-widest">Paymaster Configuration</h3>
            </div>
            <div className="space-y-4 relative z-10">
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-[9px] font-mono text-gray-500 uppercase">
                        <span>Gas Policy</span>
                        <span className="text-[#42be65]">SUBSIDIZED</span>
                    </div>
                    <div className="h-10 bg-black rounded-xl border border-[#222] flex items-center px-4 justify-between">
                        <span className="text-[10px] font-mono text-gray-400">Autonomous Settlement</span>
                        <div className="w-8 h-4 bg-[#42be65] rounded-full flex items-center justify-end px-0.5"><div className="w-3 h-3 bg-white rounded-full shadow-sm" /></div>
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-[9px] font-mono text-gray-500 uppercase">
                        <span>Session Key Validity</span>
                        <span className="text-white">12:00:00</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {['1H', '12H', '24H'].map(time => (
                            <button key={time} className={`py-2 rounded-lg border text-[10px] font-mono font-bold transition-all ${time === '12H' ? 'bg-[#9d4edd] text-black border-[#9d4edd]' : 'bg-[#111] text-gray-500 border-[#222] hover:border-gray-500'}`}>{time}</button>
                        ))}
                    </div>
                </div>
                <div className="p-4 bg-red-950/10 border border-red-900/30 rounded-xl">
                    <div className="flex items-center gap-2 mb-1.5 text-[10px] text-red-500 font-black uppercase tracking-widest"><AlertIcon size={12} /> Spending Limits</div>
                    <p className="text-[9px] text-gray-500 font-mono leading-relaxed">Cap set at Ξ 5.0 per transaction cycle. Automated cooling period enforced for out-of-band signatures.</p>
                </div>
            </div>
        </div>
    );
};

const SynthesisBridge: React.FC = () => {
    const { metaventions, setMetaventionsState, addLog, archiveIntervention, knowledge } = useAppStore();
    const { layers, activeLayerId, strategyLog, stressTest, wallets, activeRefractions, economicProtocols } = metaventions;
    const activeLayer = layers.find(l => l.id === activeLayerId);

    const [isGenerating, setIsGenerating] = useState(false);
    const [isRefracting, setIsRefracting] = useState(false);
    const [currentMetavention, setCurrentMetavention] = useState<any | null>(null);

    const generateHack = async () => {
        if (!activeLayer) return;
        setIsGenerating(true);
        setMetaventionsState({ activeRefractions: [] });
        addLog('SYSTEM', `RCL_INIT: Ingesting vectors from ${activeLayer.name}...`);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const activeKnowledge = knowledge.activeLayers.map(id => KNOWLEDGE_LAYERS[id]?.label).join(', ');
            const schema: Schema = {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    bypassTarget: { type: Type.STRING },
                    logic: { type: Type.STRING },
                    physicalImpact: { type: Type.STRING },
                    tacticalDirective: { 
                        type: Type.OBJECT,
                        properties: {
                            digital: { type: Type.STRING },
                            physical: { type: Type.STRING },
                            strategic: { type: Type.STRING }
                        },
                        required: ['digital', 'physical', 'strategic']
                    }
                },
                required: ['title', 'bypassTarget', 'logic', 'physicalImpact', 'tacticalDirective']
            };
            const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `LAYER: ${activeLayer.name} (${activeLayer.role})\nLEVERAGE: "${activeLayer.leverage}"\nKNOWLEDGE PRISMS: ${activeKnowledge}\nPROTOCOL_VERSION: Recursive Logic Gate v4.2\nTask: Synthesize a strategic "Metavention" to bridge physical reality and digital intent.\nOutput in JSON.`,
                config: { responseMimeType: 'application/json', responseSchema: schema }
            }));
            const result = JSON.parse(response.text || '{}');
            setCurrentMetavention(result);
            addLog('SUCCESS', `RCL_STABLE: Metavention "${result.title}" probe initialized.`);
        } catch (e) {
            addLog('ERROR', 'RCL_PANIC: Strategic probe collision.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRefract = async () => {
        if (!currentMetavention) return;
        setIsRefracting(true);
        addLog('SYSTEM', 'OPTICAL_CORE: Engaging Multi-Layer Refraction...');
        try {
            const refractions = await refractStrategy(currentMetavention, knowledge.activeLayers);
            setMetaventionsState({ activeRefractions: refractions });
            addLog('SUCCESS', 'OPTICAL_CORE: Multi-Prism Refraction Complete.');
        } catch (e) { console.error(e); } finally { setIsRefracting(false); }
    };

    const runEconomicProtocol = async (serviceType?: string) => {
        if (!activeLayer) return;
        addLog('SYSTEM', `FIN_CORE: Synthesizing autonomous financial directive for ${serviceType || 'General Operation'}...`);
        try {
            const hasKey = await window.aistudio?.hasSelectedApiKey();
            if (!hasKey) { await promptSelectKey(); return; }

            const context = {
                layer: activeLayer.name,
                leverage: activeLayer.leverage,
                riskProfile: 'MODERATE',
                targetCurrency: wallets[0].currency,
                serviceType: serviceType || 'GENERAL'
            };
            const directive = await synthesizeEconomicDirective(context);
            
            const newProtocol: EconomicProtocol = {
                id: crypto.randomUUID(),
                title: directive.title || (serviceType ? `Service: ${serviceType}` : "Economic Optimization"),
                budget: directive.budget || "Ξ 0.5",
                action: directive.action || "Liquidity Provision",
                type: (directive.type as any) || (serviceType ? 'PHYSICAL_SERVICE' : 'LIQUIDITY'),
                status: 'EXECUTING',
                agentId: 'FIN_UNIT_01',
                timestamp: Date.now()
            };
            
            setMetaventionsState(prev => ({ economicProtocols: [newProtocol, ...prev.economicProtocols] }));
            addLog('INFO', `FIN_OP: Dispatched autonomous agent for "${newProtocol.title}"`);
            
            // Simulate settlement
            setTimeout(() => {
                setMetaventionsState(prev => ({
                    economicProtocols: prev.economicProtocols.map(p => p.id === newProtocol.id ? { ...p, status: 'SETTLED' } : p)
                }));
                addLog('SUCCESS', `FIN_SETTLE: Protocol ${newProtocol.id.substring(0,8)} settled via Paymaster Escrow.`);
            }, 5000);

        } catch (e: any) {
            addLog('ERROR', `FIN_FAIL: ${e.message}`);
        }
    };

    const handleStressTest = async () => {
        if (!currentMetavention) return;
        setMetaventionsState({ stressTest: { isTesting: true, report: null } });
        addLog('WARN', 'STRESS_ENGINE: Commencing Adversarial Simulation...');
        try {
            const report = await runStrategicStressTest(currentMetavention, metaventions.sensingMatrix);
            setMetaventionsState({ stressTest: { isTesting: false, report } });
            addLog('SUCCESS', 'STRESS_ENGINE: Critical vulnerabilities mapped.');
        } catch (e) { setMetaventionsState({ stressTest: { isTesting: false, report: null } }); }
    };

    const handleArchive = () => {
        if (!currentMetavention) return;
        const protocol: InterventionProtocol = {
            id: crypto.randomUUID(),
            title: currentMetavention.title,
            context: activeLayer?.name || 'RCL_GENERAL',
            logic: currentMetavention.logic,
            physicalImpact: currentMetavention.physicalImpact,
            timestamp: Date.now()
        };
        archiveIntervention(protocol);
        addLog('INFO', `VAULT: Secured protocol "${protocol.title}" in hidden archives.`);
        setCurrentMetavention(null);
    };

    return (
        <div className="h-full w-full bg-[#030303] flex flex-col font-sans overflow-hidden p-0">
            <div className="w-full h-[3px] bg-[#111] mb-10 rounded-full overflow-hidden flex shadow-inner">
                <motion.div initial={{ width: 0 }} animate={{ width: '20%' }} className="h-full bg-[#22d3ee] shadow-[0_0_15px_#22d3ee]"></motion.div>
                <motion.div initial={{ width: 0 }} animate={{ width: '15%' }} transition={{ delay: 0.2 }} className="h-full bg-[#f97316] opacity-60"></motion.div>
                <motion.div initial={{ width: 0 }} animate={{ width: '25%' }} transition={{ delay: 0.4 }} className="h-full bg-[#eab308] opacity-40"></motion.div>
            </div>
            
            <div className="flex flex-col md:flex-row justify-between items-end mb-10 shrink-0 px-2">
                <div>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-[#9d4edd]/20 rounded-lg border border-[#9d4edd]/40"><GitMerge className="w-6 h-6 text-[#9d4edd]" /></div>
                        <span className="text-[11px] font-black font-mono text-[#9d4edd] uppercase tracking-[0.5em]">Strategy Bridge</span>
                    </div>
                    <h1 className="text-5xl font-black text-white tracking-tighter uppercase leading-[0.85]">THE METAVENTIONS STACK</h1>
                    <p className="text-[11px] text-gray-500 font-mono mt-4 uppercase tracking-[0.3em] flex items-center gap-3">Bridging Physical Reality and Digital Intent <span className="w-12 h-[1px] bg-[#333]"></span> <span className="text-[#9d4edd]/50 font-bold">RCL_CORE_V4</span></p>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => runEconomicProtocol()} className="flex items-center gap-2 px-5 py-2.5 bg-[#22d3ee] text-black rounded-xl text-[10px] font-black font-mono uppercase tracking-widest transition-all hover:bg-[#67e8f9] shadow-[0_0_20px_rgba(34,211,238,0.3)]">
                        <Zap size={14} /> Dispatch Agent
                    </button>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-12 gap-8 min-h-0 px-1">
                {/* LEFT: Strategy Layers & Economic Hub */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-3 pb-24">
                    <div className="flex flex-col gap-4">
                        {layers.map(layer => (
                            <StrategyCard key={layer.id} layer={layer} isActive={activeLayerId === layer.id} onClick={() => setMetaventionsState({ activeLayerId: layer.id })} />
                        ))}
                    </div>
                    <WalletStation wallets={wallets} />
                    <AccountAbstractionConfig />
                    <PhysicalServiceMarket onHire={(type) => runEconomicProtocol(type)} />
                </div>

                {/* MIDDLE: Metavention Synthesis & Financial Cortex */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 min-h-0">
                    <MetaventionGenerator activeLayer={activeLayer} currentMetavention={currentMetavention} isGenerating={isGenerating} isRefracting={isRefracting} generateHack={generateHack} handleRefract={handleRefract} handleStressTest={handleStressTest} handleArchive={handleArchive} knowledge={knowledge} />
                    <ValueFlowCortex />
                </div>

                {/* RIGHT: Ledgers & Archives */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 min-h-0">
                    <EconomicProtocolLedger protocols={economicProtocols} />
                    <StrategyLibrary />
                </div>
            </div>
        </div>
    );
};

const MetaventionGenerator = ({ activeLayer, currentMetavention, isGenerating, isRefracting, generateHack, handleRefract, handleStressTest, handleArchive, knowledge }: any) => (
    <div className="bg-[#0a0a0a] border border-[#222] rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col h-full min-h-[500px]">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#9d4edd] to-transparent opacity-50"></div>
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                <Zap className="text-[#f59e0b] w-5 h-5 animate-pulse" />
                <h2 className="text-sm font-bold text-white font-mono uppercase tracking-[0.2em]">Autonomous Protocol Synthesis</h2>
            </div>
            <div className="p-1.5 bg-[#111] border border-[#333] rounded">
                <BrainCircuit size={16} className="text-gray-600" />
            </div>
        </div>
        {!activeLayer ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30">
                <Construction size={48} className="text-gray-600 mb-4" />
                <p className="text-[10px] font-mono uppercase tracking-[0.3em]">Target Logic Required</p>
            </div>
        ) : (
            <div className="flex-1 flex flex-col">
                <div className="mb-6 border-b border-[#1f1f1f] pb-4 flex justify-between items-end">
                    <div>
                        <div className="text-[9px] text-[#9d4edd] font-mono uppercase mb-1 font-bold">Active Layer Prism</div>
                        <div className="text-2xl font-black text-white font-mono tracking-tight">{activeLayer.name}</div>
                    </div>
                    <div className="text-right">
                        <span className="text-[8px] text-gray-600 font-mono block uppercase">RCL Status</span>
                        <span className="text-[10px] text-[#42be65] font-mono font-bold">SYNC_STABLE</span>
                    </div>
                </div>
                <AnimatePresence mode="wait">
                    {currentMetavention ? (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col">
                            <div className="flex-1 p-5 bg-black border border-[#222] rounded-xl mb-6 relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1 h-full bg-[#9d4edd]/40" />
                                <h3 className="text-sm font-black text-white font-mono mb-5 uppercase tracking-wider flex items-center gap-2">
                                    <Target size={14} className="text-[#9d4edd]" /> {currentMetavention.title}
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <span className="text-[9px] text-gray-600 font-mono uppercase block mb-1">Base Logic</span>
                                        <p className="text-[10px] text-gray-400 font-mono leading-relaxed italic">"{currentMetavention.logic}"</p>
                                    </div>
                                    <div>
                                        <span className="text-[9px] text-gray-600 font-mono uppercase block mb-1">Physical Reality Delta</span>
                                        <p className="text-[10px] text-gray-400 font-mono leading-relaxed italic">"{currentMetavention.physicalImpact}"</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={handleArchive} className="flex-1 py-4 bg-[#111] border border-[#333] hover:border-[#9d4edd] text-gray-400 hover:text-white text-[10px] font-mono uppercase font-black rounded-xl transition-all flex items-center justify-center gap-2">
                                    <Save size={14} /> Vault Protocol
                                </button>
                                <button onClick={handleRefract} disabled={isRefracting} className="px-8 bg-[#9d4edd]/20 border border-[#9d4edd]/50 text-[#9d4edd] rounded-xl text-[10px] font-black font-mono uppercase tracking-widest hover:bg-[#9d4edd] hover:text-black transition-all flex items-center gap-2">
                                    {isRefracting ? <Loader2 size={14} className="animate-spin" /> : <Dna size={14} />} Refract
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center py-12 border border-dashed border-[#222] rounded-2xl bg-black/40">
                            <Binary className="w-16 h-16 text-gray-800 mb-6" />
                            <button onClick={generateHack} disabled={isGenerating} className="px-10 py-5 bg-[#9d4edd] text-black font-black font-mono text-[11px] uppercase tracking-[0.3em] rounded-xl hover:bg-[#b06bf7] transition-all shadow-[0_0_40px_rgba(157,78,221,0.4)] flex items-center gap-4">
                                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin"/> : <Radar className="w-4 h-4"/>} 
                                {isGenerating ? 'ANALYZING...' : 'INITIATE RCL PROBE'}
                            </button>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        )}
    </div>
);

const StrategyCard = ({ layer, isActive, onClick }: any) => {
    const Icon = layer.id === 'deai' ? BrainCircuit : layer.id === 'depin' ? Network : layer.id === 'zero_trust' ? Shield : layer.id === 'agentic_finance' ? Wallet : layer.id === 'physical_ai' ? Navigation2 : layer.id === 'digital_twins' ? Box : Activity;
    return (
        <MotionDiv layout onClick={onClick} whileHover={{ scale: 1.02, y: -4 }} className={`p-5 rounded-2xl border transition-all duration-500 cursor-pointer relative overflow-hidden group ${isActive ? 'bg-[#111] border-[#9d4edd] shadow-[0_0_30px_rgba(157,78,221,0.15)]' : 'bg-[#0a0a0a] border-[#222] opacity-60 hover:opacity-100 hover:border-[#444]'}`}>
            <div className="flex justify-between items-start mb-5">
                <div className={`p-3 rounded-xl border ${isActive ? 'bg-[#9d4edd]/10 border-[#9d4edd] text-[#9d4edd]' : 'bg-[#111] border-[#333] text-gray-600'}`}><Icon size={20} /></div>
                <div className={`text-[8px] font-mono px-2 py-0.5 rounded border font-black uppercase tracking-tighter ${layer.status === 'OPTIMIZED' ? 'bg-[#42be65]/10 text-[#42be65] border-[#42be65]/30' : 'bg-black text-gray-600 border-gray-800'}`}>{layer.status}</div>
            </div>
            <div className="space-y-1">
                <h3 className="text-sm font-black text-white font-mono uppercase tracking-widest">{layer.name}</h3>
                <p className="text-[10px] text-gray-500 font-mono leading-tight mb-4 line-clamp-1">{layer.leverage}</p>
            </div>
            {isActive && (
                <div className="flex gap-2 mt-2">
                    {layer.metrics.map((m: any, i: number) => (
                        <div key={i} className="flex-1 bg-black/40 p-2 rounded-lg border border-white/5">
                            <div className="text-[7px] text-gray-600 uppercase font-mono">{m.label}</div>
                            <div className="text-[10px] text-white font-bold font-mono">{m.value}</div>
                        </div>
                    ))}
                </div>
            )}
        </MotionDiv>
    );
};

const StrategyLibrary = () => {
    const { metaventions } = useAppStore();
    return (
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl flex flex-col overflow-hidden h-full shadow-2xl">
            <div className="h-12 bg-[#111] border-b border-[#1f1f1f] flex items-center justify-between px-5">
                <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400 uppercase tracking-widest font-black">
                    <History size={14} className="text-[#9d4edd]" /> Sovereign Archives
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
                {metaventions.strategyLibrary.map(item => (
                    <div key={item.id} className="p-4 bg-black border border-[#222] rounded-xl hover:border-[#9d4edd]/50 transition-all group cursor-pointer">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[11px] font-black text-white uppercase group-hover:text-[#9d4edd] transition-colors">{item.title}</span>
                            <span className="text-[8px] font-mono text-gray-600">{new Date(item.timestamp).toLocaleDateString()}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 font-mono line-clamp-2 leading-relaxed italic mt-2">"{item.logic}"</p>
                        <div className="mt-3 flex gap-2">
                            <span className="text-[7px] bg-[#9d4edd]/10 text-[#9d4edd] px-1.5 rounded border border-[#9d4edd]/20 uppercase font-bold">{item.context}</span>
                        </div>
                    </div>
                ))}
                {metaventions.strategyLibrary.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                        <Database size={48} className="mb-4" />
                        <p className="text-[10px] font-mono uppercase tracking-[0.2em]">Archive Empty</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SynthesisBridge;
