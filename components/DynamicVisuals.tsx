import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as d3 from 'd3';
import { StoredArtifact } from '../types';
import {
    Activity, Zap, Info, Target, X,
    Loader2, Sparkles, Database, Globe,
    Maximize, CheckCircle2, Compass, GitBranch, Fingerprint, Waves
} from 'lucide-react';
import { audio } from '../services/audioService';
import { cn } from '../utils/cn';
import { renderSafe } from '../utils/renderSafe';

interface GraphNode extends d3.SimulationNodeDatum {
    id: string;
    label: string;
    type: 'HUB' | 'SUBTOPIC' | 'DATA_POINT';
    color: string;
    data: any;
    x?: number;
    y?: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
    source: string | GraphNode;
    target: string | GraphNode;
    value: number;
    type?: string;
}

interface DynamicVisualsProps {
    artifacts: StoredArtifact[];
    onSelect: (a: StoredArtifact) => void;
}

const DynamicVisuals: React.FC<DynamicVisualsProps> = ({ artifacts, onSelect }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [centeredId, setCenteredId] = useState<string | null>(null);
    const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
    const [isSynthesizing, setIsSynthesizing] = useState(false);

    const activeArtifact = useMemo(() =>
        artifacts.find(a => a.id === centeredId) || null
        , [artifacts, centeredId]);

    const graphData = useMemo(() => {
        if (artifacts.length === 0) return { nodes: [], links: [] };

        const hubId = centeredId || artifacts[0].id;
        const hubArtifact = artifacts.find(a => a.id === hubId) || artifacts[0];

        const nodes: GraphNode[] = [];
        const links: GraphLink[] = [];

        nodes.push({
            id: hubArtifact.id,
            label: hubArtifact.name,
            type: 'HUB',
            color: 'var(--cyan)',
            data: hubArtifact
        });

        const otherArtifacts = artifacts.filter(a => a.id !== hubId);

        otherArtifacts.forEach((art) => {
            nodes.push({
                id: art.id,
                label: art.name,
                type: 'SUBTOPIC',
                color: 'var(--amethyst-soft)',
                data: art
            });

            // Robust array validation to prevent .filter crash
            const hubEntities = hubArtifact.analysis && Array.isArray(hubArtifact.analysis.entities)
                ? hubArtifact.analysis.entities
                : [];
            const artEntities = art.analysis && Array.isArray(art.analysis.entities)
                ? art.analysis.entities
                : [];

            const sharedEntities = hubEntities.filter(e =>
                artEntities.includes(e)
            ).length;

            links.push({
                source: hubId,
                target: art.id,
                value: 1 + (sharedEntities * 0.5)
            });
        });

        return { nodes, links };
    }, [artifacts, centeredId]);

    useEffect(() => {
        if (!svgRef.current || !containerRef.current || graphData.nodes.length === 0) return;

        const width = containerRef.current.offsetWidth;
        const height = containerRef.current.offsetHeight;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) * 0.35;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const defs = svg.append('defs');
        const filter = defs.append('filter')
            .attr('id', 'nodeGlow')
            .attr('x', '-50%')
            .attr('y', '-50%')
            .attr('width', '200%')
            .attr('height', '200%');
        filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur');
        filter.append('feComposite').attr('in', 'SourceGraphic').attr('in2', 'blur').attr('operator', 'over');

        const g = svg.append('g');

        const simulation = d3.forceSimulation<GraphNode>(graphData.nodes)
            .force('link', d3.forceLink<GraphNode, GraphLink>(graphData.links)
                .id(d => d.id)
                .distance(d => d.type === 'HUB' ? radius : 50))
            .force('charge', d3.forceManyBody().strength(-1500))
            .force('center', d3.forceCenter(centerX, centerY))
            .force('collision', d3.forceCollide().radius(80))
            .force('radial', d3.forceRadial((d: GraphNode) => d.type === 'HUB' ? 0 : radius, centerX, centerY).strength(0.8));

        const link = g.append('g')
            .selectAll('path')
            .data(graphData.links)
            .join('path')
            .attr('fill', 'none')
            .attr('stroke', 'rgba(24, 230, 255, 0.08)')
            .attr('stroke-width', d => d.value * 1.5)
            .attr('class', 'synaptic-link');

        const node = g.append('g')
            .selectAll('g')
            .data(graphData.nodes)
            .join('g')
            .attr('class', 'node-group cursor-pointer')
            .on('mouseenter', (event, d) => {
                setHoveredNode(d);
                d3.select(event.currentTarget).select('circle')
                    .transition().duration(300).attr('r', d.type === 'HUB' ? 55 : 35);
            })
            .on('mouseleave', () => {
                setHoveredNode(null);
                d3.select(svgRef.current).selectAll('.node-group circle')
                    .transition().duration(300).attr('r', (d: any) => d.type === 'HUB' ? 45 : 25);
            })
            .on('click', (event, d) => {
                handleNodeSelection(d);
            });

        node.append('circle')
            .attr('r', d => d.type === 'HUB' ? 45 : 25)
            .attr('fill', d => d.type === 'HUB' ? '#0a0a0c' : 'rgba(157, 78, 221, 0.05)')
            .attr('stroke', d => d.color)
            .attr('stroke-width', d => d.type === 'HUB' ? 3 : 1.5)
            .attr('filter', 'url(#nodeGlow)');

        node.append('text')
            .attr('dy', d => d.type === 'HUB' ? 80 : 50)
            .attr('text-anchor', 'middle')
            .text(d => d.label)
            .attr('fill', 'rgba(255, 255, 255, 0.7)')
            .attr('font-size', d => d.type === 'HUB' ? '12px' : '9px')
            .attr('font-family', 'Fira Code')
            .attr('font-weight', '700')
            .attr('pointer-events', 'none')
            .attr('text-transform', 'uppercase')
            .attr('letter-spacing', '0.15em')
            .each(function (d) {
                const text = d3.select(this);
                const words = d.label.split(/\s+/);
                if (words.length > 2 && d.type !== 'HUB') {
                    text.text(words[0] + '...');
                }
            });

        simulation.on('tick', () => {
            link.attr('d', (d: any) => {
                const dx = d.target.x - d.source.x;
                const dy = d.target.y - d.source.y;
                const dr = Math.sqrt(dx * dx + dy * dy);
                return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
            });
            node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
        });

        const handleNodeSelection = (d: GraphNode) => {
            audio.playClick();
            setIsSynthesizing(true);
            setCenteredId(d.id);
            simulation.alpha(1).restart();
            setTimeout(() => setIsSynthesizing(false), 1200);
        };

        return () => {
            simulation.stop();
        };
    }, [graphData]);

    return (
        <div ref={containerRef} className="h-full w-full flex bg-[#020204] relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(circle_at_center,rgba(24,230,255,0.15)_0%,transparent_70%)]" />

            <div className="flex-1 relative flex items-center justify-center p-10">
                <svg ref={svgRef} className="w-full h-full cursor-move" />
                <div className="absolute top-10 left-10 space-y-4 pointer-events-none">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[var(--cyan)]/10 border border-[var(--cyan)]/30 rounded-2xl shadow-[0_0_20px_rgba(24,230,255,0.15)]">
                            <Compass className="text-[var(--cyan)]" size={20} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-white uppercase tracking-[0.4em] leading-none">Strategic Intelligence</h2>
                            <p className="text-[8px] text-gray-500 font-mono uppercase tracking-widest mt-1.5">Hub-Centric Semantic Mesh</p>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-10 left-10 flex gap-4 pointer-events-none">
                    <div className="px-4 py-2 bg-black/60 backdrop-blur-2xl border border-white/5 rounded-xl flex items-center gap-3">
                        <Activity size={12} className="text-[var(--plasma-green)] animate-pulse" />
                        <span className="text-[8px] font-mono text-gray-400 uppercase tracking-widest">Physics Core: Nominal</span>
                    </div>
                    <div className="px-4 py-2 bg-black/60 backdrop-blur-2xl border border-white/5 rounded-xl flex items-center gap-3">
                        <GitBranch size={12} className="text-[var(--amethyst-soft)]" />
                        <span className="text-[8px] font-mono text-gray-400 uppercase tracking-widest">Lattice Depth: {artifacts.length}P</span>
                    </div>
                </div>
            </div>

            <div className="w-[480px] border-l border-white/5 bg-[#050507]/60 backdrop-blur-3xl flex flex-col shrink-0 z-40 relative shadow-[0_0_100px_rgba(0,0,0,1)]">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(24,230,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(24,230,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

                <div className="h-20 border-b border-white/5 flex items-center justify-between px-10 bg-white/[0.01] shrink-0">
                    <div className="flex items-center gap-3">
                        <Zap size={16} className="text-[var(--executive-gold)]" />
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Forensic Insight</span>
                    </div>
                    {isSynthesizing && <Loader2 size={16} className="text-[var(--amethyst-soft)] animate-spin" />}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-12">
                    <AnimatePresence mode="wait">
                        {activeArtifact ? (
                            <motion.div
                                key={activeArtifact.id}
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -30 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="space-y-12"
                            >
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 text-[var(--cyan)]">
                                        <Target size={14} className="animate-pulse" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Primary Focus Node</span>
                                    </div>
                                    <h3 className="text-4xl font-black text-white uppercase font-mono tracking-tighter leading-[1.1]">{activeArtifact.name}</h3>

                                    <div className="flex flex-wrap gap-3">
                                        <div className="px-4 py-1.5 bg-[var(--amethyst-soft)]/10 border border-[var(--amethyst-soft)]/30 rounded-full text-[8px] font-black text-[var(--amethyst-soft)] uppercase tracking-widest">
                                            {activeArtifact.analysis?.classification || 'RAW_FRAGMENT'}
                                        </div>
                                        <div className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[8px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                            <Database size={10} /> ID_{activeArtifact.id.slice(0, 8)}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-10 bg-black/40 border border-white/5 rounded-[3rem] shadow-inner relative group overflow-hidden">
                                    <div className="absolute top-0 right-0 p-6 opacity-[0.02] group-hover:opacity-10 transition-opacity duration-700 rotate-12">
                                        <Sparkles size={100} />
                                    </div>
                                    <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                                        <Activity size={12} className="text-[var(--amethyst-soft)]" />
                                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Neural Summary & Context</span>
                                    </div>
                                    <p className="text-base text-gray-300 font-mono leading-relaxed italic border-l-2 border-[var(--amethyst-soft)] pl-8 transition-colors duration-700 select-text">
                                        "{renderSafe(activeArtifact.analysis?.summary) || 'Integrity check in progress. Logic extraction pending node stabilization.'}"
                                    </p>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between px-2">
                                        <div className="flex items-center gap-3 text-gray-500">
                                            <Fingerprint size={14} />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Semantic Markers</span>
                                        </div>
                                        <span className="text-[8px] font-mono text-[var(--cyan)]">{Array.isArray(activeArtifact.analysis?.entities) ? activeArtifact.analysis.entities.length : 0} Entities</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {activeArtifact.analysis && Array.isArray(activeArtifact.analysis.entities) && activeArtifact.analysis.entities.map((ent, i) => (
                                            <div key={i} className="px-5 py-3 bg-white/[0.02] border border-white/5 rounded-2xl text-[9px] font-mono text-gray-400 flex items-center gap-3 hover:border-white/20 transition-all cursor-default group/ent">
                                                <div className="w-1 h-1 rounded-full bg-[var(--cyan)] shadow-[0_0_8px_var(--cyan)] group-hover/ent:scale-150 transition-transform" />
                                                {renderSafe(ent)}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-10 border-t border-white/5">
                                    <button
                                        onClick={() => onSelect(activeArtifact)}
                                        className="w-full py-6 bg-[var(--cyan)] text-black font-black font-mono text-[10px] uppercase tracking-[0.5em] rounded-[2.5rem] transition-all shadow-[0_20px_50px_rgba(24,230,255,0.3)] hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-4 group/btn"
                                    >
                                        <Maximize size={20} className="group-hover/btn:rotate-90 transition-transform duration-500" /> Initialize Deep Reconstruction
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-10 gap-10 grayscale py-20">
                                <Waves size={120} className="animate-[spin_20s_linear_infinite]" />
                                <div className="space-y-4">
                                    <p className="text-xl font-mono uppercase tracking-[1em]">Hub Idle</p>
                                    <p className="text-[9px] font-mono uppercase tracking-widest max-w-[240px] mx-auto leading-loose">Select a synaptic node from the lattice to synchronize its strategic context.</p>
                                </div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="h-12 bg-black border-t border-white/5 px-10 flex items-center justify-between text-[7px] font-mono text-gray-700 tracking-[0.3em] shrink-0 uppercase font-black">
                    <div className="flex gap-6">
                        <span className="flex items-center gap-2"><CheckCircle2 size={10} className="text-[var(--plasma-green)]" /> Handshake Verified</span>
                        <span className="flex items-center gap-2"><Globe size={10} className="text-[var(--cyan)]" /> Grid_Active</span>
                    </div>
                    <span>Zenith_Vis_v1.0</span>
                </div>
            </div>
        </div>
    );
};

export default DynamicVisuals;