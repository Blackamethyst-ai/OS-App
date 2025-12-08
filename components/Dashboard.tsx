
import React from 'react';
import { Activity, Shield, Zap, Database, Globe, Cpu, Clock, Users, ArrowUpRight } from 'lucide-react';

const Dashboard: React.FC = () => {
  return (
    <div className="h-full w-full overflow-y-auto custom-scrollbar p-8">
      
      {/* Header Section */}
      <div className="flex items-end justify-between mb-12 border-b border-[#1f1f1f] pb-6">
        <div>
          <h1 className="text-3xl font-mono uppercase tracking-[0.2em] text-white mb-2">
            Sovereign <span className="text-[#9d4edd]">Empire OS</span>
          </h1>
          <div className="text-xs font-mono text-gray-500 border border-[#1f1f1f] inline-block px-2 py-1 rounded">
            SYS.STATUS: ONLINE // V3.2.1
          </div>
        </div>
        <div className="text-right">
           <div className="text-xs text-gray-500 font-mono mb-1">OPERATOR ID</div>
           <div className="text-sm text-white font-bold tracking-widest">COMMAND_PRIME</div>
        </div>
      </div>

      {/* Core Philosophy Grid */}
      <section className="mb-16">
        <h2 className="text-sm font-mono text-gray-500 uppercase tracking-widest mb-6 flex items-center">
          <span className="w-2 h-2 bg-[#9d4edd] mr-3 shadow-[0_0_10px_#9d4edd]"></span>
          01. System Core
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="group bg-[#0a0a0a] border border-[#1f1f1f] p-6 hover:border-[#9d4edd] transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Shield className="w-16 h-16 text-[#9d4edd]" />
            </div>
            <span className="text-[10px] font-mono text-[#9d4edd] uppercase tracking-wider mb-3 block">Identity Protocol</span>
            <div className="text-lg font-medium text-white">Sovereign Architecture & Automated Intelligence</div>
            <p className="text-sm text-gray-500 mt-2">Base-building, leverage flywheels, and decentralized compute strategies.</p>
          </div>
          
          <div className="group bg-[#0a0a0a] border border-[#1f1f1f] p-6 hover:border-[#9d4edd] transition-all duration-300 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Zap className="w-16 h-16 text-[#9d4edd]" />
            </div>
            <span className="text-[10px] font-mono text-[#9d4edd] uppercase tracking-wider mb-3 block">Power Thesis</span>
            <div className="text-lg font-medium text-white">Control Compute, Capital, Coordination</div>
            <p className="text-sm text-gray-500 mt-2">Deploying high-agency agents to minimize friction and maximize output.</p>
          </div>
        </div>
      </section>

      {/* Metrics Grid */}
      <section className="mb-16">
        <h2 className="text-sm font-mono text-gray-500 uppercase tracking-widest mb-6 flex items-center">
          <span className="w-2 h-2 bg-[#9d4edd] mr-3 shadow-[0_0_10px_#9d4edd]"></span>
          02. Live Telemetry
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
                { label: 'Compute Load', value: '12%', target: '< 40%', icon: Cpu },
                { label: 'Token Burn', value: '450K', target: 'Daily Vol', icon: Activity },
                { label: 'Latency', value: '24ms', target: 'Optimal', icon: Clock },
                { label: 'Active Agents', value: '03', target: 'Capacity', icon: Users },
            ].map((metric, i) => (
                <div key={i} className="bg-[#0a0a0a] border border-[#1f1f1f] p-5 hover:border-[#9d4edd] group transition-colors">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] text-gray-500 uppercase">{metric.label}</span>
                        <metric.icon className="w-4 h-4 text-[#9d4edd] opacity-50 group-hover:opacity-100" />
                    </div>
                    <div className="text-2xl font-mono text-white mb-1">{metric.value}</div>
                    <div className="text-[10px] text-[#9d4edd]">{metric.target}</div>
                    <div className="w-full bg-[#1f1f1f] h-1 mt-4">
                        <div className="bg-[#9d4edd] h-full shadow-[0_0_8px_#9d4edd]" style={{ width: `${Math.random() * 60 + 20}%`}}></div>
                    </div>
                </div>
            ))}
        </div>
      </section>

      {/* Projects / Stack Table */}
      <section>
        <h2 className="text-sm font-mono text-gray-500 uppercase tracking-widest mb-6 flex items-center">
          <span className="w-2 h-2 bg-[#9d4edd] mr-3 shadow-[0_0_10px_#9d4edd]"></span>
          03. Active Protocols
        </h2>
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] overflow-hidden">
            <div className="grid grid-cols-12 border-b border-[#1f1f1f] bg-[#0f0f0f] text-[10px] uppercase font-mono text-gray-500 py-3 px-4">
                <div className="col-span-4">Protocol Name</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-4">Status</div>
                <div className="col-span-2 text-right">Uplink</div>
            </div>
            {[
                { name: 'Mermaid Visualization Engine', type: 'CORE INFRA', status: 'ACTIVE', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20' },
                { name: 'Gemini 3 Pro Image Gen', type: 'GENERATIVE', status: 'DEPLOYED', color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20' },
                { name: 'Tactical Oracle (Chat)', type: 'INTELLIGENCE', status: 'ONLINE', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
                { name: 'Deep Dive TTS Audio', type: 'SYNTHESIS', status: 'STANDBY', color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20' },
                { name: 'Contextual Memory Bridge', type: 'R&D', status: 'IN DEV', color: 'text-gray-400', bg: 'bg-gray-400/10 border-gray-400/20' },
            ].map((row, i) => (
                <div key={i} className="grid grid-cols-12 py-4 px-4 border-b border-[#1f1f1f] hover:bg-[#111] transition-colors items-center">
                    <div className="col-span-4 font-bold text-sm text-gray-200">{row.name}</div>
                    <div className="col-span-2 text-xs text-gray-500 font-mono">{row.type}</div>
                    <div className="col-span-4">
                        <span className={`inline-block px-2 py-1 rounded text-[10px] font-mono border ${row.bg} ${row.color}`}>
                            {row.status}
                        </span>
                    </div>
                    <div className="col-span-2 text-right">
                        <button className="text-gray-600 hover:text-white transition-colors">
                            <ArrowUpRight className="w-4 h-4 ml-auto" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
      </section>

    </div>
  );
};

export default Dashboard;
