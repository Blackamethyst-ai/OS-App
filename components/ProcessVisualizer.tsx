
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAppStore } from '../store';
import { generateMermaidDiagram, chatWithFiles, generateAudioOverview, fileToGenerativePart, promptSelectKey, classifyArtifact, generateAutopoieticFramework, generateStructuredWorkflow, calculateEntropy } from '../services/geminiService';
import { neuralVault } from '../services/persistenceService';
import { FileData, Message, ArtifactNode, IngestionStatus, AppMode, SystemWorkflow } from '../types';
import MermaidDiagram from './MermaidDiagram';
import { 
    ReactFlow, 
    Background, 
    Controls, 
    MiniMap, 
    useNodesState, 
    useEdgesState, 
    Node, 
    Edge, 
    Position, 
    Handle, 
    getSmoothStepPath, 
    EdgeProps, 
    NodeProps,
    OnSelectionChangeParams,
    BackgroundVariant,
    useReactFlow
} from '@xyflow/react';
import { Upload, FileText, X, BrainCircuit, Headphones, Sparkles, Send, Trash2, MessageSquare, ShieldCheck, Loader2, Code, Activity, Database, Zap, Wrench, Atom, Hexagon, ChevronDown, PanelRightClose, MousePointer2, FolderTree, CheckCircle, BarChart, Save, Sun, Moon, Contrast, Terminal, Grid3X3, Eye, Layout, FileJson, Map, Box, Play, Pause, Volume2, ArrowRight, Download, FileType } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div as any;
const MotionP = motion.p as any;

type TabView = 'living_map' | 'diagram' | 'workflow' | 'genesis' | 'audio';

// --- VISUAL CONSTANTS ---
const THEME = {
    accent: {
        core: '#9d4edd',   
        memory: '#22d3ee', 
        action: '#f59e0b', 
        tools: '#3b82f6',  
        alert: '#ef4444',
        success: '#10b981'
    }
};

const VISUAL_THEMES = {
    DARK: {
        bg: '#000000',
        nodeBg: 'rgba(15,15,15,0.9)',
        nodeBorder: 'rgba(255,255,255,0.1)',
        text: '#e5e5e5',
        subtext: '#a3a3a3',
        grid: '#222',
        controlsBg: '#111',
        controlsBorder: '#333'
    },
    LIGHT: {
        bg: '#f5f5f5',
        nodeBg: 'rgba(255,255,255,0.9)',
        nodeBorder: 'rgba(0,0,0,0.1)',
        text: '#171717',
        subtext: '#525252',
        grid: '#e5e5e5',
        controlsBg: '#fff',
        controlsBorder: '#e5e5e5'
    },
    CONTRAST: {
        bg: '#000000',
        nodeBg: '#000000',
        nodeBorder: '#ffffff',
        text: '#ffffff',
        subtext: '#ffff00',
        grid: '#444',
        controlsBg: '#000',
        controlsBorder: '#fff'
    }
};

// --- WAV CONVERSION UTILITY ---
const downloadWav = (base64Data: string, sampleRate = 24000) => {
    // Convert base64 to binary
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const buffer = new ArrayBuffer(44 + len);
    const view = new DataView(buffer);

    const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    // RIFF identifier
    writeString(view, 0, 'RIFF');
    // file length
    view.setUint32(4, 36 + len, true);
    // RIFF type
    writeString(view, 8, 'WAVE');
    // format chunk identifier
    writeString(view, 12, 'fmt ');
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (raw)
    view.setUint16(20, 1, true);
    // channel count (mono)
    view.setUint16(22, 1, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sampleRate * blockAlign)
    view.setUint32(28, sampleRate * 2, true);
    // block align (channel count * bytes per sample)
    view.setUint16(32, 2, true);
    // bits per sample
    view.setUint16(34, 16, true);
    // data chunk identifier
    writeString(view, 36, 'data');
    // data chunk length
    view.setUint32(40, len, true);

    // Write PCM data
    const bytes = new Uint8Array(buffer, 44);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `neural_briefing_${Date.now()}.wav`;
    link.click();
    URL.revokeObjectURL(url);
};

const downloadTranscript = (text: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `briefing_transcript_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
};

// --- CUSTOM HOOK: UNIFIED GRAPH INTERACTIONS ---
const useGraphInteractions = (nodes: Node[], edges: Edge[]) => {
    // Selection State
    const [selectedId, setSelectedId] = useState<string | null>(null);
    
    // Hover State
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);

    // Handlers
    const onSelectionChange = useCallback(({ nodes: selectedNodes }: OnSelectionChangeParams) => {
        if (selectedNodes.length > 0) {
            setSelectedId(selectedNodes[0].id);
        } else {
            setSelectedId(null);
        }
    }, []);

    const onNodeMouseEnter = useCallback((_: any, node: Node) => setHoveredNode(node.id), []);
    const onNodeMouseLeave = useCallback(() => setHoveredNode(null), []);
    const onEdgeMouseEnter = useCallback((_: any, edge: Edge) => setHoveredEdge(edge.id), []);
    const onEdgeMouseLeave = useCallback(() => setHoveredEdge(null), []);
    const clearSelection = useCallback(() => setSelectedId(null), []);

    const selectedNode = useMemo(() => nodes.find(n => n.id === selectedId), [nodes, selectedId]);
    
    // Derive Context Data for Inspector
    const contextData = useMemo(() => {
        if (!selectedNode) return null;
        
        const connectedEdges = edges.filter(e => e.source === selectedId || e.target === selectedId);
        const connectionDetails = connectedEdges.map(e => {
            const isSource = e.source === selectedId;
            const otherId = isSource ? e.target : e.source;
            const otherNode = nodes.find(n => n.id === otherId);
            return `${isSource ? 'Output ->' : 'Input <-'} ${otherNode?.data?.label || otherId}`;
        });

        return {
            id: selectedNode.id,
            type: selectedNode.type,
            label: selectedNode.data.label,
            status: selectedNode.data.status,
            subtext: selectedNode.data.subtext,
            connections: connectionDetails,
            raw: selectedNode.data
        };
    }, [selectedNode, edges, nodes, selectedId]);

    // Computed Visuals (Opacity/Dimming logic)
    const animatedNodes = useMemo(() => {
        return nodes.map(node => {
            const isHovered = hoveredNode === node.id;
            const isDimmed = hoveredNode && !isHovered;
            return {
                ...node,
                data: { ...node.data, isHovered },
                style: { ...node.style, opacity: isDimmed ? 0.3 : 1, zIndex: isHovered ? 999 : 1, transition: 'opacity 0.3s ease-in-out' }
            };
        });
    }, [nodes, hoveredNode]);

    const animatedEdges = useMemo(() => {
        return edges.map(edge => {
            const isHovered = hoveredEdge === edge.id;
            // Dim edge if a node is hovered but this edge is not connected to it
            const isDimmed = hoveredNode && edge.source !== hoveredNode && edge.target !== hoveredNode;
            return {
                ...edge,
                style: { ...edge.style, opacity: isDimmed ? 0.1 : 1, transition: 'opacity 0.3s ease-in-out' },
                data: { ...edge.data, isHovered }
            };
        });
    }, [edges, hoveredNode, hoveredEdge]);

    return { 
        selectedId, 
        setSelectedId, 
        selectedNode, 
        contextData, 
        hoveredNode,
        onSelectionChange,
        onNodeMouseEnter,
        onNodeMouseLeave,
        onEdgeMouseEnter,
        onEdgeMouseLeave,
        clearSelection,
        animatedNodes,
        animatedEdges
    };
};

// Simple Markdown Parser for Chat
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    const parts = content.split(/(\*\*.*?\*\*|```[\s\S]*?```)/g);
    return (
        <span>
            {parts.map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={index} className="text-[#9d4edd] font-bold">{part.slice(2, -2)}</strong>;
                }
                if (part.startsWith('```') && part.endsWith('```')) {
                    const code = part.slice(3, -3).trim();
                    return (
                        <div key={index} className="block my-2 p-2 bg-[#050505] border border-[#333] rounded text-[10px] font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap">
                            {code}
                        </div>
                    );
                }
                return part;
            })}
        </span>
    );
};

const LogicStepCard: React.FC<{ 
    step: any, 
    index: number, 
    color: string,
    isExpanded: boolean,
    onToggle: () => void,
    isLast: boolean
}> = ({ step, index, color, isExpanded, onToggle, isLast }) => {
    return (
        <div className="relative pl-6">
            {/* Timeline Connector */}
            {!isLast && (
                <div className="absolute left-[11px] top-7 bottom-0 w-px bg-[#222]" />
            )}
            
            {/* Timeline Node */}
            <motion.div 
                className={`absolute left-0 top-1 w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center transition-colors z-10 bg-[#0a0a0a] ${isExpanded ? 'shadow-[0_0_15px_currentColor]' : ''}`}
                style={{ color: isExpanded ? color : '#333', borderColor: isExpanded ? color : '#333' }}
                animate={{ scale: isExpanded ? 1.1 : 1 }}
            >
                <div className={`w-1.5 h-1.5 rounded-full transition-colors ${isExpanded ? 'bg-current' : 'bg-[#333]'}`} />
            </motion.div>

            <MotionDiv 
                layout
                onClick={onToggle}
                className="relative bg-[#0a0a0a] border border-[#222] rounded-lg overflow-hidden cursor-pointer group transition-all duration-300 mb-4"
                style={{ 
                    borderColor: isExpanded ? color : 'rgba(34,34,34,1)',
                    backgroundColor: isExpanded ? 'rgba(15,15,15,1)' : 'rgba(10,10,10,1)'
                }}
            >
                <div className="p-4 relative z-10">
                    <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-3">
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#1f1f1f] text-gray-500 border border-[#333]">
                                SEQ_{index.toString().padStart(2, '0')}
                            </span>
                            <span className="text-[10px] font-bold font-mono transition-colors" style={{ color: isExpanded ? color : '#666' }}>
                                {step.step}
                            </span>
                        </div>
                        <MotionDiv 
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            className="text-gray-500"
                        >
                            <ChevronDown size={14} />
                        </MotionDiv>
                    </div>

                    <h3 className={`text-sm font-bold uppercase transition-colors ${isExpanded ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                        {step?.designation || 'UNTITLED STEP'}
                    </h3>

                    <AnimatePresence mode="wait">
                        {isExpanded && (
                            <MotionDiv
                                key="content"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="pt-3 mt-3 border-t border-[#1f1f1f]">
                                    <p className="text-xs text-gray-300 font-mono leading-relaxed">
                                        {step.execution_vector}
                                    </p>
                                    <div className="mt-3 flex items-center gap-2">
                                        <div className="h-0.5 w-12 rounded-full" style={{ backgroundColor: color }}></div>
                                        <span className="text-[8px] font-mono text-gray-500 uppercase tracking-wider">Active Protocol</span>
                                    </div>
                                </div>
                            </MotionDiv>
                        )}
                    </AnimatePresence>
                </div>
                
                {/* Background Glow */}
                {isExpanded && (
                    <div 
                        className="absolute inset-0 opacity-5 pointer-events-none transition-opacity duration-500"
                        style={{ backgroundColor: color }}
                    />
                )}
            </MotionDiv>
        </div>
    );
};

// 1. Holographic Node (ReactFlow)
const HolographicNode = ({ data, selected }: NodeProps) => {
    const { label, icon: Icon, subtext, color, status, metrics, isHovered, theme, isTarget } = data as any;
    const glowColor = color || THEME.accent.core;
    const currentTheme = VISUAL_THEMES[theme as keyof typeof VISUAL_THEMES] || VISUAL_THEMES.DARK;

    return (
        <div className={`relative group rounded-xl border transition-all duration-300 backdrop-blur-xl
            ${selected 
                ? 'scale-110 shadow-[0_0_60px_rgba(0,0,0,0.9)] border-opacity-100 ring-2 ring-offset-2 ring-offset-black z-50' 
                : 'hover:scale-105 hover:shadow-[0_0_30px_rgba(0,0,0,0.6)] hover:border-opacity-80 hover:-translate-y-1'
            }
            ${isTarget ? 'scale-110 ring-4 ring-offset-4 ring-offset-black animate-pulse shadow-[0_0_50px_var(--glow)]' : 'shadow-lg border-opacity-50'}
        `}
        style={{ 
            background: currentTheme.nodeBg,
            borderColor: selected ? glowColor : (isHovered ? currentTheme.text : currentTheme.nodeBorder),
            ['--tw-ring-color' as string]: glowColor,
            ['--glow' as string]: glowColor,
            minWidth: '220px'
        }}>
            {/* Ambient Core Glow */}
            <div className="absolute inset-0 opacity-20 group-hover:opacity-50 pointer-events-none transition-opacity duration-500"
                 style={{ background: `radial-gradient(circle at center, ${glowColor}, transparent 70%)` }}></div>
            
            {/* Scanline Effect */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.2)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none opacity-20"></div>

            <div className="relative z-10 p-4 flex items-start gap-4">
                <div className="relative">
                    <div className={`absolute inset-0 blur-lg transition-opacity duration-300 ${isHovered ? 'opacity-80' : 'opacity-20'}`} style={{ background: glowColor }}></div>
                    <div className="relative p-2.5 rounded-lg border border-white/10 bg-black/40 text-white">
                        <Icon size={20} style={{ color: glowColor }} />
                    </div>
                </div>
                
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                        <h3 className="text-xs font-bold font-sans tracking-tight uppercase" style={{ color: currentTheme.text }}>{label}</h3>
                        {status && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-white/5 bg-white/5" style={{ color: currentTheme.subtext }}>
                                {status}
                            </span>
                        )}
                    </div>
                    <p className="text-[10px] font-mono truncate" style={{ color: currentTheme.subtext }}>{subtext}</p>
                </div>
            </div>

            {metrics && (
                <div className="relative z-10 px-4 py-2 border-t border-white/5 bg-white/0 flex justify-between items-center">
                    <div className="flex gap-1 h-1 w-full max-w-[60px]">
                        {[1,2,3,4].map(i => (
                            <div key={i} className="flex-1 rounded-full opacity-50" style={{ background: i <= 2 ? glowColor : '#333' }}></div>
                        ))}
                    </div>
                    <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: currentTheme.subtext }}>{metrics}</span>
                </div>
            )}

            {/* Drag Target Overlay */}
            {isTarget && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl z-50 backdrop-blur-sm animate-in fade-in">
                    <div className="text-[10px] font-bold text-white uppercase tracking-widest border border-white/50 px-3 py-1 rounded-full bg-black/50">
                        Drop to Ingest
                    </div>
                </div>
            )}

            <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-gray-500 !border-2 !border-black" />
            <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-white !border-2 !border-black" />
            <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-gray-500 !border-2 !border-black" />
            <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-white !border-2 !border-black" />
        </div>
    );
};

// 2. Cinematic Flow Edge
const AnimatedFlowEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, markerEnd, data }: EdgeProps) => {
    const [edgePath] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
    const color = (data?.color as string) || '#555';
    const isActive = data?.active as boolean;
    const isHovered = data?.isHovered as boolean;
    const variant = (data?.variant as 'stream' | 'pulse' | 'tunnel') || 'stream';

    const displayColor = isHovered ? '#ffffff' : color;
    const displayWidth = isHovered ? 4 : 1.5;
    const displayOpacity = isHovered ? 1 : (isActive ? 0.8 : 0.4);

    return (
        <>
            <path d={edgePath} fill="none" stroke="transparent" strokeWidth={30} style={{ cursor: 'pointer' }} />
            <path d={edgePath} fill="none" stroke={displayColor} strokeWidth={displayWidth} strokeOpacity={displayOpacity} style={{ transition: 'stroke-width 0.2s, stroke 0.2s' }} />
            {(isActive || isHovered) && (
                <>
                    <path d={edgePath} fill="none" stroke={displayColor} strokeWidth={variant === 'tunnel' ? 8 : 4} strokeOpacity={isHovered ? 0.4 : 0.1} style={{ filter: 'blur(6px)', animation: 'pulseField 2s ease-in-out infinite' }} />
                    
                    {variant === 'stream' && (
                        <>
                            <path id={id} d={edgePath} fill="none" stroke={displayColor} strokeWidth={isHovered ? 3 : 2} strokeDasharray="10 50" strokeLinecap="round" markerEnd={markerEnd} style={{ filter: `drop-shadow(0 0 4px ${displayColor})`, animation: 'streamFlow 0.8s linear infinite' }} />
                            {/* Data Packet Particle */}
                            <circle r="3" fill={displayColor}>
                                <animateMotion dur="1.5s" repeatCount="indefinite" path={edgePath} />
                            </circle>
                        </>
                    )}
                    
                    {variant === 'pulse' && (
                        <path id={id} d={edgePath} fill="none" stroke={displayColor} strokeWidth={3} strokeDasharray="100 200" strokeLinecap="square" markerEnd={markerEnd} style={{ opacity: 0.8, animation: 'signalPulse 2s ease-in-out infinite' }} />
                    )}
                    
                    {variant === 'tunnel' && (
                        <>
                             <path d={edgePath} fill="none" stroke={displayColor} strokeWidth={1} strokeDasharray="5 5" style={{ transform: 'translateY(3px)', animation: 'tunnelFlow 1s linear infinite' }} />
                             <path d={edgePath} fill="none" stroke={displayColor} strokeWidth={1} strokeDasharray="5 5" style={{ transform: 'translateY(-3px)', animation: 'tunnelFlow 1s linear infinite reverse' }} />
                        </>
                    )}
                </>
            )}
            <style>{`
                @keyframes streamFlow { from { stroke-dashoffset: 60; } to { stroke-dashoffset: 0; } }
                @keyframes signalPulse { 0% { stroke-dashoffset: 300; opacity: 0; } 50% { opacity: 1; } 100% { stroke-dashoffset: 0; opacity: 0; } }
                @keyframes tunnelFlow { from { stroke-dashoffset: 10; } to { stroke-dashoffset: 0; } }
                @keyframes pulseField { 0%, 100% { stroke-opacity: 0.1; stroke-width: 4px; } 50% { stroke-opacity: 0.3; stroke-width: 8px; } }
            `}</style>
        </>
    );
};

const nodeTypes = { holographic: HolographicNode };
const edgeTypes = { cinematic: AnimatedFlowEdge };

// --- Neural Audio Player Component ---
const NeuralAudioPlayer: React.FC<{ audioData: string, transcript?: string | null }> = ({ audioData, transcript }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<AudioBufferSourceNode | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const startTimeRef = useRef<number>(0);
    const pauseTimeRef = useRef<number>(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number>(0);
    const bufferRef = useRef<AudioBuffer | null>(null);

    // Decode on mount or change
    useEffect(() => {
        const decode = async () => {
            if (!audioData) return;
            try {
                const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                audioCtxRef.current = ctx;

                const binary = atob(audioData);
                const len = binary.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
                
                const shorts = new Int16Array(bytes.buffer);
                const float32 = new Float32Array(shorts.length);
                for (let i = 0; i < shorts.length; i++) float32[i] = shorts[i] / 32768;
                
                const buffer = ctx.createBuffer(1, float32.length, 24000);
                buffer.getChannelData(0).set(float32);
                bufferRef.current = buffer;
                setDuration(buffer.duration);
            } catch (e) {
                console.error("Audio Decode Error:", e);
            }
        };
        decode();

        return () => {
            if (audioCtxRef.current) {
                audioCtxRef.current.close();
            }
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [audioData]);

    const play = () => {
        if (!audioCtxRef.current || !bufferRef.current) return;
        
        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }

        const source = audioCtxRef.current.createBufferSource();
        source.buffer = bufferRef.current;
        source.playbackRate.value = playbackRate;
        
        const analyser = audioCtxRef.current.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyser.connect(audioCtxRef.current.destination);
        
        sourceRef.current = source;
        analyserRef.current = analyser;

        const offset = pauseTimeRef.current % duration;
        startTimeRef.current = audioCtxRef.current.currentTime - (offset / playbackRate);
        
        source.start(0, offset);
        setIsPlaying(true);

        source.onended = () => {
            if (audioCtxRef.current && (audioCtxRef.current.currentTime - startTimeRef.current) * playbackRate >= duration) {
                setIsPlaying(false);
                pauseTimeRef.current = 0;
            }
        };

        draw();
    };

    const pause = () => {
        if (sourceRef.current && audioCtxRef.current) {
            sourceRef.current.stop();
            pauseTimeRef.current = (audioCtxRef.current.currentTime - startTimeRef.current) * playbackRate;
            setIsPlaying(false);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        }
    };

    const togglePlay = () => {
        if (isPlaying) pause();
        else play();
    };

    const toggleSpeed = () => {
        const newRate = playbackRate === 1 ? 1.5 : 1;
        setPlaybackRate(newRate);
        if (sourceRef.current) {
            sourceRef.current.playbackRate.value = newRate;
            // Adjust start time to maintain current position
            if (isPlaying && audioCtxRef.current) {
                const currentPos = (audioCtxRef.current.currentTime - startTimeRef.current) * playbackRate;
                startTimeRef.current = audioCtxRef.current.currentTime - (currentPos / newRate);
            }
        }
    };

    const draw = () => {
        if (!analyserRef.current || !canvasRef.current) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const render = () => {
            if (!analyserRef.current || !isPlaying) return;
            
            analyserRef.current.getByteFrequencyData(dataArray);
            
            // Update time
            if (audioCtxRef.current) {
                const curr = (audioCtxRef.current.currentTime - startTimeRef.current) * playbackRate;
                setCurrentTime(Math.min(curr, duration));
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Center the visualizer
            const barWidth = (canvas.width / bufferLength) * 2.5;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
                
                // Purple gradient
                const gradient = ctx.createLinearGradient(0, canvas.height/2 - barHeight/2, 0, canvas.height/2 + barHeight/2);
                gradient.addColorStop(0, '#a855f7'); // Purple-500
                gradient.addColorStop(0.5, '#d8b4fe'); // Purple-300
                gradient.addColorStop(1, '#a855f7');

                ctx.fillStyle = gradient;
                
                // Draw mirrored bars from center
                ctx.fillRect(x, canvas.height/2 - barHeight/2, barWidth, barHeight);
                
                x += barWidth + 2;
            }

            rafRef.current = requestAnimationFrame(render);
        };
        render();
    };

    const formatTime = (t: number) => {
        const m = Math.floor(t / 60);
        const s = Math.floor(t % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleDownloadAudio = () => {
        if (audioData) downloadWav(audioData);
    };

    const handleDownloadTranscript = () => {
        if (transcript) downloadTranscript(transcript);
    };

    return (
        <div className="w-full h-full flex flex-col bg-[#050505] relative overflow-hidden">
            {/* Header */}
            <div className="h-12 border-b border-[#1f1f1f] bg-[#0a0a0a] flex items-center justify-between px-6 z-10 shrink-0">
                <div className="flex items-center gap-2">
                    <Headphones className="w-4 h-4 text-[#a855f7]" />
                    <span className="text-xs font-bold font-mono text-gray-300 uppercase tracking-widest">
                        :: NEURAL BRIEFING <span className="text-[#a855f7]">[ STATUS: ONLINE ]</span>
                    </span>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-mono text-gray-500">
                    <Activity className="w-3 h-3 text-[#a855f7] animate-pulse" />
                    <span>STREAMING_BUFFER</span>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col relative z-10 p-8 max-w-4xl mx-auto w-full gap-8">
                
                {/* Visualizer Container */}
                <div className="h-48 w-full bg-[#0a0a0a] border border-[#222] rounded-xl overflow-hidden relative flex items-center justify-center shadow-[0_0_40px_rgba(168,85,247,0.1)]">
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-80" />
                    {!isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
                            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Audio Stream Paused</p>
                        </div>
                    )}
                </div>

                {/* Playback Deck */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between font-mono text-xs text-[#a855f7]">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-[#222] rounded-full overflow-hidden relative cursor-pointer group">
                        <motion.div 
                            className="h-full bg-[#a855f7] shadow-[0_0_15px_#a855f7]"
                            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                        />
                    </div>

                    {/* Controls Row */}
                    <div className="flex items-center justify-between">
                        <div className="flex gap-4">
                            <button 
                                onClick={togglePlay}
                                className="flex items-center gap-2 px-6 py-2 bg-[#a855f7] text-black font-bold text-xs font-mono uppercase tracking-wider hover:bg-[#c084fc] transition-all rounded shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                            >
                                {isPlaying ? <Pause className="w-4 h-4 fill-current"/> : <Play className="w-4 h-4 fill-current"/>}
                                {isPlaying ? 'PAUSE' : 'PLAY'}
                            </button>
                            
                            <button 
                                onClick={toggleSpeed}
                                className="px-4 py-2 border border-[#333] text-gray-400 hover:text-white hover:border-gray-500 text-xs font-mono uppercase tracking-wider rounded transition-colors"
                            >
                                {playbackRate}x SPEED
                            </button>
                        </div>

                        {/* Extraction Module */}
                        <div className="flex gap-2">
                            <div className="text-[9px] font-mono text-gray-600 uppercase self-center mr-2 hidden md:block">Data Extraction:</div>
                            <button 
                                onClick={handleDownloadAudio}
                                className="flex items-center gap-2 px-4 py-2 border border-[#333] hover:border-[#a855f7] hover:bg-[#a855f7]/10 text-gray-400 hover:text-[#a855f7] text-[10px] font-mono uppercase tracking-wider rounded transition-all group"
                            >
                                <Download className="w-3 h-3 group-hover:animate-bounce" />
                                EXTRACT WAV
                            </button>
                            <button 
                                onClick={handleDownloadTranscript}
                                disabled={!transcript}
                                className="flex items-center gap-2 px-4 py-2 border border-[#333] hover:border-[#a855f7] hover:bg-[#a855f7]/10 text-gray-400 hover:text-[#a855f7] text-[10px] font-mono uppercase tracking-wider rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FileType className="w-3 h-3" />
                                DUMP LOGS
                            </button>
                        </div>
                    </div>
                </div>

                {/* Transcript Stream */}
                {transcript && (
                    <div className="flex-1 min-h-[200px] border-t border-[#222] pt-6 flex flex-col">
                        <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Terminal className="w-3 h-3" /> Transcript Stream {'>_'}
                        </div>
                        <div className="flex-1 bg-[#0a0a0a] border border-[#222] rounded-lg p-6 overflow-y-auto custom-scrollbar shadow-inner relative">
                            {/* Matrix Rain effect overlay hint */}
                            <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                                <Grid3X3 className="w-24 h-24 text-[#a855f7]" />
                            </div>
                            <p className="text-sm font-mono text-gray-300 leading-relaxed whitespace-pre-wrap">
                                {transcript.split('\n').map((line, i) => (
                                    <span key={i} className="block mb-2">
                                        <span className="text-[#a855f7] opacity-50 mr-2">{'>'}</span>
                                        {line}
                                    </span>
                                ))}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

const ProcessVisualizer: React.FC = () => {
  const { process: state, setProcessState: setState, setCodeStudioState, setMode } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabView>('living_map');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isRestored, setIsRestored] = useState(false);
  const [workflowType, setWorkflowType] = useState<'DRIVE_ORG' | 'SYSTEM_ARCH'>('DRIVE_ORG');
  const [expandedStep, setExpandedStep] = useState<number | null>(0); // Accordion state

  // Themes & Visuals
  const [visualTheme, setVisualTheme] = useState<'DARK' | 'LIGHT' | 'CONTRAST'>('DARK');
  const [showGrid, setShowGrid] = useState(true);

  const [chatInput, setChatInput] = useState('');
  const [isChatProcessing, setIsChatProcessing] = useState(false);
  
  // Ref for chat scrolling
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const nodePositions = useRef<{ [key: string]: { x: number, y: number } }>({});

  const { 
      selectedId, 
      setSelectedId, 
      selectedNode, 
      contextData, 
      onSelectionChange, 
      clearSelection,
      hoveredNode,
      onNodeMouseEnter,
      onNodeMouseLeave,
      onEdgeMouseEnter,
      onEdgeMouseLeave,
      animatedNodes,
      animatedEdges
  } = useGraphInteractions(nodes, edges);

  const toggleTheme = () => {
      const modes = ['DARK', 'LIGHT', 'CONTRAST'] as const;
      const next = modes[(modes.indexOf(visualTheme) + 1) % modes.length];
      setVisualTheme(next);
  };

  const toggleGrid = () => setShowGrid(!showGrid);

  // Update nodes when theme changes
  useEffect(() => {
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          data: { ...node.data, theme: visualTheme },
        }))
      );
  }, [visualTheme, setNodes]);

  // Hydration
  useEffect(() => {
    const hydrate = async () => {
        try {
            const history = await neuralVault.getHistory(AppMode.PROCESS_MAP);
            if (history && history.length > 0) {
                const latest = history[history.length - 1]; 
                if (latest && latest.state) {
                    const restoredState = latest.state;
                    if (restoredState.artifacts) {
                        restoredState.artifacts = restoredState.artifacts.map((a: any) => ({
                            ...a,
                            file: (a.file && a.file.name) ? a.file : { name: a.data?.name || "Restored_Artifact" }
                        }));
                    }
                    setState(restoredState);
                    setIsRestored(true);
                }
            }
        } catch (e) {
            console.error("[NeuralVault] Hydration failed", e);
        }
    };
    hydrate();
  }, []);

  useEffect(() => {
    const saveLoop = setInterval(() => {
        const currentState = useAppStore.getState().process;
        neuralVault.createCheckpoint(AppMode.PROCESS_MAP, currentState, "Auto-Save");
    }, 60000);
    return () => clearInterval(saveLoop);
  }, []);

  const validateArtifact = async (nodeId: string, data: FileData) => {
      try {
        const analysis = await classifyArtifact(data);
        setState(prev => ({
            artifacts: prev.artifacts.map(a => a.id === nodeId ? { ...a, status: 'verified' as IngestionStatus, analysis: analysis } : a)
        }));
        
        const verified = state.artifacts.filter(a => a.status === 'verified' && a.data).map(a => a.data as FileData);
        if (verified.length > 0) {
            calculateEntropy(verified).then(score => setState({ entropyScore: score }));
        }

      } catch (err) {
        setState(prev => ({
            artifacts: prev.artifacts.map(a => a.id === nodeId ? { ...a, status: 'rejected' as IngestionStatus, error: 'ONTOLOGY_MISMATCH' } : a)
        }));
      }
  };

  // --- DRAG AND DROP LOGIC FOR INGESTION ---
  const onNodeDrag = useCallback((event: React.MouseEvent, node: Node) => {
      if (node.id.startsWith('art-')) {
          const memoryNode = nodes.find(n => n.id === 'memory');
          if (memoryNode) {
              const dx = node.position.x - memoryNode.position.x;
              const dy = node.position.y - memoryNode.position.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              
              // Proximity Feedback
              setNodes(nds => nds.map(n => {
                  if (n.id === 'memory') {
                      return { ...n, data: { ...n.data, isTarget: dist < 250 } };
                  }
                  return n;
              }));
          }
      }
      nodePositions.current[node.id] = node.position;
  }, [nodes, setNodes]);

  const onNodeDragStop = useCallback((event: React.MouseEvent, node: Node) => {
      if (node.id.startsWith('art-')) {
          const memoryNode = nodes.find(n => n.id === 'memory');
          
          // Reset Memory Target State
          setNodes(nds => nds.map(n => n.id === 'memory' ? { ...n, data: { ...n.data, isTarget: false } } : n));

          if (memoryNode) {
              const dx = node.position.x - memoryNode.position.x;
              const dy = node.position.y - memoryNode.position.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              
              if (dist < 200) {
                  delete nodePositions.current[node.id];
                  const artifact = state.artifacts.find(a => a.id === node.id);
                  if (artifact && artifact.data) {
                       setState(prev => ({
                           artifacts: prev.artifacts.map(a => a.id === node.id ? { ...a, status: 'scanning' } : a)
                       }));
                       validateArtifact(node.id, artifact.data);
                  }
                  return;
              }
          }
      }
      nodePositions.current[node.id] = node.position;
  }, [nodes, state.artifacts, setNodes]);

  useEffect(() => {
      const centerX = 600;
      const centerY = 400;
      const moduleOffset = 280;
      const isThinking = isChatProcessing;
      const isActing = state.isLoading;
      const hasMemory = state.artifacts.length > 0;
      const isScanning = state.artifacts.some(a => a.status === 'scanning');
      const memoryCount = state.artifacts.length;
      const verifiedCount = state.artifacts.filter(a => a.status === 'verified').length;

      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];

      const getPos = (id: string, defaultPos: {x: number, y: number}) => {
          return nodePositions.current[id] || defaultPos;
      };

      const commonData = { theme: visualTheme };

      newNodes.push({
          id: 'core',
          type: 'holographic',
          position: getPos('core', { x: centerX, y: centerY }),
          data: {
              label: 'Sovereign Agent',
              subtext: isThinking ? 'REASONING ENGINE ACTIVE' : (isActing ? 'EXECUTING PROTOCOLS' : 'SYSTEM IDLE'),
              icon: BrainCircuit,
              color: isThinking ? THEME.accent.tools : (isActing ? THEME.accent.action : THEME.accent.core),
              status: isThinking ? 'THINKING' : 'ONLINE',
              metrics: 'V3.2 KERNEL',
              ...commonData
          },
          style: { width: 240 }
      });

      // Find existing memory node to preserve isTarget state
      const existingMemory = nodes.find(n => n.id === 'memory');
      newNodes.push({
          id: 'memory',
          type: 'holographic',
          position: getPos('memory', { x: centerX, y: centerY - moduleOffset }),
          data: {
              label: 'Context Memory',
              subtext: 'RAG / Vector Store',
              icon: Database,
              color: THEME.accent.memory,
              status: isScanning ? 'INDEXING' : 'READY',
              metrics: `${verifiedCount}/${memoryCount} ARTIFACTS`,
              isTarget: existingMemory?.data?.isTarget, // Preserve drag state
              ...commonData
          }
      });

      newNodes.push({
          id: 'tools',
          type: 'holographic',
          position: getPos('tools', { x: centerX - moduleOffset, y: centerY }),
          data: {
              label: 'Tooling Layer',
              subtext: 'Compute / Search / Code',
              icon: Wrench,
              color: THEME.accent.tools,
              status: 'AVAILABLE',
              metrics: '5 MODULES',
              ...commonData
          }
      });

      newNodes.push({
          id: 'action',
          type: 'holographic',
          position: getPos('action', { x: centerX + moduleOffset, y: centerY }),
          data: {
              label: 'Execution Layer',
              subtext: 'Output Generation',
              icon: Zap,
              color: THEME.accent.action,
              status: state.generatedCode || state.audioUrl ? 'ACTIVE' : 'STANDBY',
              metrics: 'GEN_AI',
              ...commonData
          }
      });

      newNodes.push({
          id: 'reflect',
          type: 'holographic',
          position: getPos('reflect', { x: centerX, y: centerY + moduleOffset }),
          data: {
              label: 'Reflect Loop',
              subtext: 'Self-Correction',
              icon: Activity,
              color: THEME.accent.alert,
              status: isThinking ? 'CRITIQUE' : 'PASSIVE',
              metrics: 'AUTO-EVAL',
              ...commonData
          }
      });

      const orbitRadius = 450;
      state.artifacts.forEach((art, i) => {
          const angle = Math.PI + (i / Math.max(state.artifacts.length - 1, 1)) * Math.PI;
          const defaultArtPos = { 
              x: centerX + orbitRadius * Math.cos(angle), 
              y: centerY + orbitRadius * Math.sin(angle) * 0.6 - 50 
          };
          
          const statusColor = art.status === 'verified' ? THEME.accent.success : 
                              art.status === 'rejected' ? THEME.accent.alert : 
                              THEME.accent.memory;

          newNodes.push({
              id: art.id,
              type: 'holographic',
              position: getPos(art.id, defaultArtPos),
              data: {
                  label: art.file.name.length > 20 ? art.file.name.substring(0,18)+'...' : art.file.name,
                  subtext: art.analysis?.classification || 'RAW_DATA',
                  icon: FileText,
                  color: statusColor,
                  status: art.status.toUpperCase(),
                  ...commonData
              },
              style: { width: 180 }
          });

          newEdges.push({
              id: `e-${art.id}-mem`,
              source: art.id,
              target: 'memory',
              type: 'cinematic',
              data: { color: statusColor, active: art.status === 'scanning', variant: 'stream' }
          });
      });

      newEdges.push(
          { 
              id: 'e-mem-core', source: 'memory', target: 'core', type: 'cinematic', 
              data: { color: THEME.accent.memory, active: isScanning || hasMemory, variant: 'stream' } 
          },
          { 
              id: 'e-core-tools', source: 'core', target: 'tools', type: 'cinematic', 
              data: { color: THEME.accent.tools, active: isActing, variant: 'stream' } 
          },
          { 
              id: 'e-core-action', source: 'core', target: 'action', type: 'cinematic', 
              data: { color: THEME.accent.action, active: isActing || !!state.generatedCode, variant: 'pulse' } 
          },
          { 
              id: 'e-core-reflect', source: 'core', target: 'reflect', type: 'cinematic', 
              data: { color: THEME.accent.alert, active: isThinking, variant: 'tunnel' } 
          },
      );

      setNodes(newNodes);
      setEdges(newEdges);

  }, [state.artifacts, isChatProcessing, state.isLoading, state.generatedCode, state.audioUrl, setNodes, setEdges, visualTheme]);
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newArtifacts: ArtifactNode[] = [];
      const pendingFiles: File[] = Array.from(e.target.files);
      for (let i = 0; i < pendingFiles.length; i++) {
        newArtifacts.push({ id: `art-${Date.now()}-${i}`, file: pendingFiles[i], status: 'scanning', data: null });
      }
      setState(prev => ({ artifacts: [...prev.artifacts, ...newArtifacts] }));
      if (activeTab === 'diagram') setActiveTab('living_map');

      for (let i = 0; i < pendingFiles.length; i++) {
          const file = pendingFiles[i];
          const nodeId = newArtifacts[i].id;
          try {
              const data = await fileToGenerativePart(file);
              await neuralVault.saveArtifact(file, null);
              setState(prev => ({ artifacts: prev.artifacts.map(a => a.id === nodeId ? { ...a, data: data } : a) }));
              await validateArtifact(nodeId, data);
          } catch (err) {
              setState(prev => ({ artifacts: prev.artifacts.map(a => a.id === nodeId ? { ...a, status: 'rejected', error: 'READ_FAIL' } : a) }));
          }
      }
    }
  };

  const checkApiKey = async () => {
    const hasKey = await window.aistudio?.hasSelectedApiKey();
    if (!hasKey) { await promptSelectKey(); return false; }
    return true;
  };

  const getVerifiedFiles = () => state.artifacts.filter(a => a.status === 'verified' && a.data).map(a => a.data as FileData);

  const handleGenerate = async (type: TabView) => {
    if (!(await checkApiKey())) return;
    const validFiles = getVerifiedFiles();

    if (type === 'genesis') {
        if (validFiles.length === 0) { setState({ error: "Genesis requires verified Source Artifact." }); return; }
        setActiveTab('genesis');
        setState({ isLoading: true });
        try {
            const framework = await generateAutopoieticFramework(validFiles[0], state.governance);
            setState({ autopoieticFramework: framework });
        } catch (err: any) { setState({ error: "Genesis Failed: " + err.message }); } 
        finally { setState({ isLoading: false }); }
        return;
    }

    if (type === 'workflow') {
        setActiveTab('workflow');
        setState({ isLoading: true });
        try {
            const workflow = await generateStructuredWorkflow(validFiles, state.governance, workflowType);
            setState({ generatedWorkflow: workflow });
        } catch(err: any) { setState({ error: "Workflow Gen Failed: " + err.message }); }
        finally { setState({ isLoading: false }); }
        return;
    }

    setState({ isLoading: true, error: null });
    setActiveTab(type);
    try {
      if (type === 'diagram') {
        const activeArtifacts = state.artifacts.filter(a => a.data !== null);
        const filesPayload = activeArtifacts.map(a => a.data as FileData);
        const contextPayload = activeArtifacts.map(a => ({
            name: a.file.name,
            status: a.status,
            classification: a.analysis?.classification
        }));

        const code = await generateMermaidDiagram(state.governance, filesPayload, contextPayload);
        setState({ generatedCode: code });
      } else if (type === 'audio') {
        const { audioData, transcript } = await generateAudioOverview(validFiles);
        setState({ audioUrl: audioData, audioTranscript: transcript });
      }
    } catch (err: any) { setState({ error: err.message }); } 
    finally { setState({ isLoading: false }); }
  };

  const openInCodeStudio = (code: string) => {
      setMode(AppMode.CODE_STUDIO);
      setCodeStudioState({ generatedCode: code, language: 'bash', prompt: "Execute system scaffold sequence" });
  };

  const handleSendChat = async () => {
      if (!chatInput.trim() || isChatProcessing || !(await checkApiKey())) return;
      const userMsg: Message = { role: 'user', text: chatInput, timestamp: Date.now() };
      setState(prev => ({ chatHistory: [...prev.chatHistory, userMsg] }));
      setChatInput(''); setIsChatProcessing(true);
      
      let context = "You are the Tactical Oracle. You have access to the full system state.";
      
      // Context Awareness Injection
      if (contextData) {
          context += `\n\n[FOCUS CONTEXT] User has selected Node: "${contextData.label}" (ID: ${contextData.id}, Type: ${contextData.type}).
          \nConnections: ${contextData.connections.join(', ') || 'None'}.
          \nStatus: ${contextData.status}.
          \nSubtext: ${contextData.subtext}.
          \nPlease focus analysis on this specific component and its relationships.`;
      }

      if (state.autopoieticFramework) {
          context += `\n\n[CONTEXT] AUTOPOIETIC FRAMEWORK ACTIVE:\nNAME: ${state.autopoieticFramework.framework_identity.name}\nORIGIN: ${state.autopoieticFramework.framework_identity.philosophical_origin}\nMANDATE: ${state.autopoieticFramework.governance_mandate}\nLOGIC STEPS: ${JSON.stringify(state.autopoieticFramework.operational_logic)}`;
      }
      
      if (state.generatedCode) {
          context += `\n\n[CONTEXT] MERMAID DIAGRAM GENERATED:\n${state.generatedCode}\n(Interpret the structure for the user)`;
      }

      const activeArtifacts = getVerifiedFiles();
      if (activeArtifacts.length > 0) {
          context += `\n\n[CONTEXT] ANALYZING ${activeArtifacts.length} SOURCE ARTIFACTS: ${activeArtifacts.map(a => a.name).join(', ')}`;
      }

      try {
          const resp = await chatWithFiles(userMsg.text, state.chatHistory.map(m=>({role:m.role, parts:[{text:m.text}]})), activeArtifacts, context);
          setState(prev => ({ chatHistory: [...prev.chatHistory, { role: 'model', text: resp, timestamp: Date.now() }] }));
      } catch (e:any) { setState({ error: e.message }); } 
      finally { setIsChatProcessing(false); }
  };
  
  useEffect(() => {
    if (chatContainerRef.current) {
        requestAnimationFrame(() => {
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTo({
                    top: chatContainerRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            }
        });
    }
  }, [state.chatHistory, isChatOpen]);

  // View Icons Map
  const getViewIcon = (tab: TabView) => {
      switch(tab) {
          case 'living_map': return <Map className="w-3 h-3" />;
          case 'diagram': return <Grid3X3 className="w-3 h-3" />;
          case 'workflow': return <FileJson className="w-3 h-3" />;
          case 'audio': return <Headphones className="w-3 h-3" />;
          case 'genesis': return <Sparkles className="w-3 h-3" />;
          default: return <Layout className="w-3 h-3" />;
      }
  };

  const getTabLabel = (tab: TabView) => {
      if (tab === 'workflow') return 'INTEL';
      return tab.replace('_', ' ').toUpperCase();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 h-full rounded-xl border border-[#1f1f1f] bg-[#030303] shadow-2xl relative overflow-hidden font-sans">
      
      {/* Sidebar */}
      <div className="lg:col-span-3 bg-[#050505] border-r border-[#1f1f1f] flex flex-col relative z-20 h-full">
         <div className="h-14 border-b border-[#1f1f1f] flex items-center justify-between px-4 bg-[#0a0a0a] flex-shrink-0">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center font-mono">
               <ShieldCheck className="w-3.5 h-3.5 mr-2 text-[#9d4edd]" />
               Governance Control
            </h2>
            <div className="flex items-center gap-2">
                <button onClick={toggleTheme} className="text-gray-600 hover:text-white" title="Cycle Theme">
                    {visualTheme === 'DARK' ? <Moon className="w-3 h-3"/> : visualTheme === 'LIGHT' ? <Sun className="w-3 h-3"/> : <Contrast className="w-3 h-3"/>}
                </button>
                <button onClick={toggleGrid} className={`text-gray-600 hover:text-white ${showGrid ? 'text-[#9d4edd]' : ''}`} title="Toggle Grid">
                    <Grid3X3 className="w-3 h-3" />
                </button>
                <button onClick={() => setState({ artifacts: [], chatHistory: [], generatedCode: '' })} className="text-gray-600 hover:text-red-500"><Trash2 className="w-3 h-3"/></button>
            </div>
         </div>

         <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar min-h-0">
            <div className="p-4 bg-[#080808] border-b border-[#1f1f1f]">
                <div className="flex justify-between items-center mb-3">
                    <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                        Source Material
                    </label>
                    <span className="text-[10px] font-mono text-[#9d4edd]">{getVerifiedFiles().length} Active</span>
                </div>
                
                {isRestored && (
                    <div className="mb-2 flex items-center gap-2 px-2 py-1 bg-[#42be65]/10 border border-[#42be65]/30 rounded">
                        <Save className="w-3 h-3 text-[#42be65]" />
                        <span className="text-[9px] font-mono text-[#42be65]">SESSION RESTORED</span>
                    </div>
                )}
                
                {state.entropyScore > 0 && (
                    <div className="mb-4 bg-[#111] p-3 rounded border border-[#333]">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] font-mono text-gray-500 flex items-center gap-1">
                                <BarChart className="w-3 h-3"/> System Entropy
                            </span>
                            <span className={`text-[9px] font-bold font-mono ${state.entropyScore > 50 ? 'text-red-500' : 'text-[#42be65]'}`}>
                                {state.entropyScore}%
                            </span>
                        </div>
                        <div className="w-full bg-[#222] h-1 rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-1000 ${state.entropyScore > 50 ? 'bg-red-500' : 'bg-[#42be65]'}`} 
                                style={{ width: `${state.entropyScore}%` }}
                            />
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    {state.artifacts.map((node) => (
                        <div key={node.id} className="flex items-center p-2 bg-[#111] border border-[#222] rounded hover:border-[#9d4edd] transition-colors group">
                            <div className={`w-1.5 h-1.5 rounded-full mr-3 ${node.status === 'verified' ? 'bg-[#42be65]' : node.status === 'scanning' ? 'bg-[#f1c21b] animate-pulse' : 'bg-gray-600'}`}></div>
                            <span className="text-[10px] font-mono text-gray-300 truncate flex-1">{node.file.name}</span>
                            <button onClick={() => setState(p => ({ artifacts: p.artifacts.filter(a => a.id !== node.id) }))} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-500"><X className="w-3 h-3" /></button>
                        </div>
                    ))}
                    <label className="flex items-center justify-center p-3 border border-dashed border-[#333] rounded hover:bg-[#111] hover:border-[#9d4edd] cursor-pointer transition-all text-[10px] font-mono text-gray-500 hover:text-[#9d4edd] uppercase tracking-wide">
                        <Upload className="w-3 h-3 mr-2" /> Add Source
                        <input type="file" multiple onChange={handleFileChange} className="hidden" />
                    </label>
                </div>
            </div>

            <div className="p-4 space-y-4">
                <div className="space-y-1">
                    <span className="text-[9px] text-[#9d4edd] font-mono uppercase">Target System</span>
                    <input type="text" className="w-full bg-[#0a0a0a] border border-[#333] p-2 text-xs font-mono text-gray-300 focus:border-[#9d4edd] outline-none" 
                        value={state.governance.targetSystem} onChange={(e) => setState(p => ({ governance: {...p.governance, targetSystem: e.target.value}}))} />
                </div>
                <div className="space-y-1">
                    <span className="text-[9px] text-[#9d4edd] font-mono uppercase">Topology</span>
                    <select className="w-full bg-[#0a0a0a] border border-[#333] p-2 text-xs font-mono text-gray-300 focus:border-[#9d4edd] outline-none"
                        value={state.governance.outputTopology} onChange={(e) => setState(p => ({ governance: {...p.governance, outputTopology: e.target.value as any}}))}>
                        <option>Hierarchical</option><option>Network</option><option>Sequential</option><option>Hub & Spoke</option>
                    </select>
                </div>
            </div>
         </div>

         <div className="p-4 border-t border-[#1f1f1f] bg-[#0a0a0a] flex-shrink-0">
            <button
                onClick={() => handleGenerate(activeTab === 'living_map' ? 'diagram' : activeTab)} 
                disabled={state.isLoading}
                className="w-full py-3 bg-[#9d4edd] text-black font-bold text-[10px] tracking-[0.2em] uppercase font-mono hover:bg-[#b06bf7] transition-all shadow-[0_0_20px_rgba(157,78,221,0.3)]"
            >
                {state.isLoading ? 'PROCESSING...' : 'RUN SEQUENCE'}
            </button>
         </div>
      </div>

      {/* Main Viewport */}
      <div className="lg:col-span-9 flex flex-col bg-[#030303] relative h-full">
         
         {/* 1. TOP NAVIGATION (PERSISTENT) */}
         <div className="h-14 border-b border-[#1f1f1f] bg-[#0a0a0a]/50 backdrop-blur flex items-center justify-between px-6 shrink-0 z-50">
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-[#111] p-1 rounded-lg border border-[#333]">
                {['living_map', 'diagram', 'workflow', 'genesis', 'audio'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as TabView)}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                            activeTab === tab 
                            ? 'bg-[#9d4edd] text-black shadow-lg' 
                            : 'text-gray-500 hover:text-gray-300 hover:bg-[#1f1f1f]'
                        }`}
                    >
                        {getViewIcon(tab as TabView)}
                        {getTabLabel(tab as TabView)}
                    </button>
                ))}
            </div>
            {/* HUD Status */}
            <div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#9d4edd] rounded-full animate-pulse"></span>
                HUD_VIS // {getTabLabel(activeTab)}
            </div>
         </div>

         {/* 2. CONTENT STAGE */}
         <div className="flex-1 relative w-full h-full overflow-hidden">
             
             {/* BASE LAYER: React Flow (Always mounted to preserve state, vis toggle) */}
             <div className={`absolute inset-0 z-0 bg-[#030303] ${activeTab === 'living_map' ? 'visible' : 'invisible pointer-events-none'}`}>
                 <ReactFlow
                    nodes={animatedNodes}
                    edges={animatedEdges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onSelectionChange={onSelectionChange}
                    onNodeMouseEnter={onNodeMouseEnter}
                    onNodeMouseLeave={onNodeMouseLeave}
                    onEdgeMouseEnter={onEdgeMouseEnter}
                    onEdgeMouseLeave={onEdgeMouseLeave}
                    onNodeDrag={onNodeDrag}
                    onNodeDragStop={onNodeDragStop}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    fitView
                    className="bg-transparent"
                    minZoom={0.1}
                    maxZoom={4}
                 >
                    {showGrid && <Background color={visualTheme === 'DARK' ? '#333' : '#ddd'} gap={20} size={1} variant={BackgroundVariant.Dots} />}
                    <Controls className="!bg-[#111] !border-[#333] !fill-gray-400" />
                    <MiniMap 
                        nodeColor={(n) => (n.data?.color as string) || '#555'} 
                        style={{ backgroundColor: visualTheme === 'DARK' ? '#0a0a0a' : '#fff' }} 
                    />
                 </ReactFlow>
             </div>

             {/* TAB LAYER: DIAGRAM */}
             {activeTab === 'diagram' && (
                 <div className="absolute inset-0 z-10 bg-[#030303] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                     <div className="h-10 bg-[#111] border-b border-[#1f1f1f] flex items-center justify-between px-4 shrink-0">
                         <span className="text-xs font-mono uppercase text-[#9d4edd]">Mermaid Schematic</span>
                         {state.generatedCode && (
                             <div className="flex gap-2">
                                 <button onClick={() => openInCodeStudio(state.generatedCode!)} className="text-[10px] bg-[#1f1f1f] px-2 py-1 border border-[#333] text-gray-300 hover:text-white flex items-center gap-1">
                                     <Code className="w-3 h-3" /> Edit Code
                                 </button>
                             </div>
                         )}
                     </div>
                     <div className="flex-1 overflow-hidden p-4 relative">
                         {state.generatedCode ? (
                             <MermaidDiagram code={state.generatedCode} />
                         ) : (
                             <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                                 {state.isLoading ? (
                                    <div className="flex flex-col items-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-[#9d4edd] mb-4" />
                                        <p className="font-mono text-xs uppercase tracking-widest">Generating Schematic Vector...</p>
                                    </div>
                                 ) : (
                                    <div className="flex flex-col items-center">
                                        <Grid3X3 className="w-12 h-12 mb-4 opacity-20" />
                                        <p className="font-mono text-sm uppercase tracking-widest text-gray-400 mb-2">No Diagram Generated</p>
                                        <p className="font-mono text-xs text-gray-600 mb-6 max-w-xs text-center">Verify source artifacts and governance parameters, then execute sequence.</p>
                                        <button onClick={() => handleGenerate('diagram')} className="px-6 py-2 bg-[#9d4edd] text-black font-bold text-xs uppercase tracking-wider hover:bg-[#b06bf7] transition-all">
                                            Generate Diagram
                                        </button>
                                    </div>
                                 )}
                             </div>
                         )}
                     </div>
                 </div>
             )}

             {/* TAB LAYER: GENESIS */}
             {activeTab === 'genesis' && (
                 <div className="absolute inset-0 z-10 bg-[#030303]/95 backdrop-blur flex flex-col p-8 overflow-y-auto custom-scrollbar animate-in slide-in-from-bottom-2 duration-300">
                     {state.autopoieticFramework ? (
                         <div className="max-w-4xl mx-auto w-full space-y-6">
                             <div className="flex justify-between items-start">
                                 <div>
                                     <h1 className="text-2xl font-bold font-mono text-white mb-1">{state.autopoieticFramework.framework_identity.name}</h1>
                                     <p className="text-xs text-[#9d4edd] font-mono uppercase tracking-widest">{state.autopoieticFramework.framework_identity.philosophical_origin}</p>
                                 </div>
                             </div>

                             <div className="grid grid-cols-2 gap-4">
                                 <div className="bg-[#111] p-4 rounded border border-[#222]">
                                     <label className="text-[10px] text-gray-500 uppercase block mb-2">Governance Mandate</label>
                                     <p className="text-sm text-gray-300 font-mono leading-relaxed">"{state.autopoieticFramework.governance_mandate}"</p>
                                 </div>
                                 <div className="bg-[#111] p-4 rounded border border-[#222]">
                                     <label className="text-[10px] text-gray-500 uppercase block mb-2">Visual Signature</label>
                                     <div className="flex items-center gap-4">
                                         <div className="w-12 h-12 rounded-full border-2" style={{ borderColor: state.autopoieticFramework.visual_signature.color_hex }}></div>
                                         <div>
                                             <div className="text-xs text-white font-mono">{state.autopoieticFramework.visual_signature.icon_metaphor}</div>
                                             <div className="text-[10px] text-gray-500">{state.autopoieticFramework.visual_signature.color_hex}</div>
                                         </div>
                                     </div>
                                 </div>
                             </div>

                             <div className="space-y-4">
                                 <label className="text-[10px] text-gray-500 uppercase tracking-widest block border-b border-[#222] pb-2">Operational Logic Sequence</label>
                                 {state.autopoieticFramework.operational_logic.map((step, i) => (
                                     <LogicStepCard 
                                        key={i} 
                                        index={i} 
                                        step={step} 
                                        color={state.autopoieticFramework!.visual_signature.color_hex} 
                                        isExpanded={expandedStep === i}
                                        onToggle={() => setExpandedStep(expandedStep === i ? null : i)}
                                        isLast={i === state.autopoieticFramework.operational_logic.length - 1}
                                     />
                                 ))}
                             </div>
                         </div>
                     ) : (
                         <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full">
                             <div className="w-24 h-24 bg-[#111] rounded-full flex items-center justify-center border border-[#333] mb-8 shadow-[0_0_50px_rgba(157,78,221,0.1)]">
                                 <Atom className="w-10 h-10 text-[#9d4edd]" />
                             </div>
                             
                             <h2 className="text-2xl font-bold font-mono text-white mb-2 uppercase tracking-widest">Genesis Protocol</h2>
                             <p className="text-xs text-gray-500 text-center mb-8 font-mono leading-relaxed">
                                 Initialize the Autopoietic Framework. Ingest source artifacts to derive governance mandates, operational logic, and visual identity.
                             </p>

                             {getVerifiedFiles().length > 0 ? (
                                 <div className="w-full space-y-4">
                                     <div className="bg-[#111] border border-[#222] rounded p-4">
                                         <div className="text-[10px] text-gray-500 uppercase mb-2 flex justify-between">
                                             <span>Ready for Genesis</span>
                                             <span className="text-[#42be65]">{getVerifiedFiles().length} Sources Verified</span>
                                         </div>
                                         <div className="space-y-1">
                                             {getVerifiedFiles().map((f, i) => (
                                                 <div key={i} className="flex items-center gap-2 text-xs font-mono text-gray-300">
                                                     <FileText className="w-3 h-3 text-[#9d4edd]" />
                                                     {f.name}
                                                 </div>
                                             ))}
                                         </div>
                                     </div>
                                     
                                     <button
                                         onClick={() => handleGenerate('genesis')}
                                         disabled={state.isLoading}
                                         className="w-full py-4 bg-[#9d4edd] text-black font-bold text-xs uppercase tracking-[0.2em] hover:bg-[#b06bf7] transition-all shadow-[0_0_20px_rgba(157,78,221,0.4)] flex items-center justify-center gap-2"
                                     >
                                         {state.isLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
                                         {state.isLoading ? 'Synthesizing...' : 'Execute Genesis'}
                                     </button>
                                 </div>
                             ) : (
                                 <div className="w-full">
                                     <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-[#333] rounded-xl hover:border-[#9d4edd] hover:bg-[#9d4edd]/5 transition-all cursor-pointer group">
                                         <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                             <Upload className="w-8 h-8 text-gray-600 mb-3 group-hover:text-[#9d4edd] transition-colors" />
                                             <p className="text-xs font-mono text-gray-400 uppercase tracking-widest mb-1">Ingest Source Material</p>
                                             <p className="text-[10px] text-gray-600 font-mono">PDF, TXT, MD (Max 10MB)</p>
                                         </div>
                                         <input type="file" multiple className="hidden" onChange={handleFileChange} />
                                     </label>
                                     
                                     {state.isLoading && (
                                         <div className="mt-4 flex items-center justify-center gap-2 text-xs font-mono text-[#9d4edd]">
                                             <Loader2 className="w-3 h-3 animate-spin" />
                                             Scanning Artifacts...
                                         </div>
                                     )}
                                 </div>
                             )}
                         </div>
                     )}
                 </div>
             )}

             {/* TAB LAYER: WORKFLOW (INTEL) */}
             {activeTab === 'workflow' && (
                 <div className="absolute inset-0 z-10 bg-[#030303] flex flex-col animate-in fade-in duration-200">
                     <div className="h-10 bg-[#111] border-b border-[#1f1f1f] flex items-center justify-between px-4 shrink-0">
                         <span className="text-xs font-mono uppercase text-[#42be65]">Workflow Protocol</span>
                     </div>
                     
                     {state.generatedWorkflow ? (
                         <div className="flex-1 overflow-hidden flex">
                             <div className="w-1/2 p-4 border-r border-[#1f1f1f] overflow-y-auto custom-scrollbar bg-[#050505]">
                                 <h3 className="text-[10px] font-bold text-gray-500 uppercase mb-4 flex items-center gap-2"><FolderTree className="w-3 h-3" /> Structure Tree</h3>
                                 <pre className="text-xs font-mono text-gray-300 bg-[#111] p-4 rounded border border-[#222] overflow-x-auto">
                                     {(state.generatedWorkflow as SystemWorkflow).structureTree}
                                 </pre>
                                 
                                 <h3 className="mt-6 text-[10px] font-bold text-gray-500 uppercase mb-4 flex items-center gap-2"><ShieldCheck className="w-3 h-3" /> Protocols</h3>
                                 <div className="space-y-2">
                                     {(state.generatedWorkflow as SystemWorkflow).protocols.map((p: any, i: number) => (
                                         <div key={i} className="bg-[#111] border border-[#222] p-3 rounded">
                                             <div className="text-[10px] font-bold text-[#9d4edd] mb-1">{p.rule as string}</div>
                                             <div className="text-[9px] text-gray-500">{p.reasoning as string}</div>
                                         </div>
                                     ))}
                                 </div>
                             </div>
                             <div className="w-1/2 flex flex-col bg-[#050505]">
                                 <div className="h-1/2 border-b border-[#1f1f1f] p-4 relative">
                                     <div className="absolute top-2 right-2 z-10 flex gap-2">
                                         <button onClick={() => openInCodeStudio((state.generatedWorkflow as SystemWorkflow).automationScript)} className="text-[9px] bg-[#111] border border-[#333] px-2 py-1 rounded text-gray-400 hover:text-white flex items-center gap-1">
                                             <Terminal className="w-3 h-3" /> Script
                                         </button>
                                     </div>
                                     <h3 className="text-[10px] font-bold text-gray-500 uppercase mb-2">Automation Script</h3>
                                     <pre className="h-full font-mono text-[10px] text-blue-300 overflow-auto custom-scrollbar bg-[#080808] p-4 rounded border border-[#222]">
                                         {(state.generatedWorkflow as SystemWorkflow).automationScript}
                                     </pre>
                                 </div>
                                 <div className="h-1/2 p-4">
                                     <h3 className="text-[10px] font-bold text-gray-500 uppercase mb-2">Process Diagram</h3>
                                     <div className="h-full border border-[#222] rounded overflow-hidden">
                                         <MermaidDiagram code={(state.generatedWorkflow as SystemWorkflow).processDiagram || ''} />
                                     </div>
                                 </div>
                             </div>
                         </div>
                     ) : (
                         <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                             {state.isLoading ? (
                                <div className="flex flex-col items-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-[#42be65] mb-4" />
                                    <p className="font-mono text-xs uppercase tracking-widest">Designing Workflow Architecture...</p>
                                </div>
                             ) : (
                                <div className="flex flex-col items-center">
                                    <Box className="w-12 h-12 mb-4 opacity-20" />
                                    <p className="font-mono text-sm uppercase tracking-widest text-gray-400 mb-6">Workflow Engine Idle</p>
                                    <div className="flex gap-4">
                                        <button onClick={() => { setWorkflowType('DRIVE_ORG'); handleGenerate('workflow'); }} className="px-6 py-2 bg-[#1f1f1f] border border-[#333] hover:border-[#42be65] text-[#42be65] font-bold text-xs uppercase tracking-wider transition-all">
                                            Org Structure
                                        </button>
                                        <button onClick={() => { setWorkflowType('SYSTEM_ARCH'); handleGenerate('workflow'); }} className="px-6 py-2 bg-[#1f1f1f] border border-[#333] hover:border-[#9d4edd] text-[#9d4edd] font-bold text-xs uppercase tracking-wider transition-all">
                                            System Arch
                                        </button>
                                    </div>
                                </div>
                             )}
                         </div>
                     )}
                 </div>
             )}

             {/* TAB LAYER: AUDIO */}
             {activeTab === 'audio' && (
                 <div className="absolute inset-0 z-10 bg-[#030303] flex flex-col items-center justify-center animate-in fade-in duration-200">
                     {state.audioUrl ? (
                         <NeuralAudioPlayer audioData={state.audioUrl} transcript={state.audioTranscript} />
                     ) : (
                         <div className="flex flex-col items-center text-gray-500">
                             {state.isLoading ? (
                                <div className="flex flex-col items-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-[#9d4edd] mb-4" />
                                    <p className="font-mono text-xs uppercase tracking-widest">Synthesizing Neural Audio...</p>
                                </div>
                             ) : (
                                <div className="flex flex-col items-center">
                                    <Headphones className="w-12 h-12 mb-4 opacity-20" />
                                    <p className="font-mono text-sm uppercase tracking-widest text-gray-400 mb-6">Audio Stream Offline</p>
                                    <button onClick={() => handleGenerate('audio')} className="px-6 py-2 bg-[#9d4edd] text-black font-bold text-xs uppercase tracking-wider hover:bg-[#b06bf7] transition-all shadow-[0_0_20px_rgba(157,78,221,0.2)]">
                                        Generate Briefing
                                    </button>
                                </div>
                             )}
                         </div>
                     )}
                 </div>
             )}

             {/* OVERLAY: CHAT (Slide Over) */}
             <AnimatePresence>
                 {isChatOpen && (
                     <MotionDiv
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="absolute top-0 right-0 w-96 h-full bg-[#0a0a0a]/95 backdrop-blur-md border-l border-[#1f1f1f] shadow-2xl flex flex-col z-50"
                     >
                         <div className="h-10 border-b border-[#1f1f1f] flex items-center justify-between px-4 bg-[#111]">
                             <span className="text-[10px] font-mono uppercase tracking-widest text-[#9d4edd] flex items-center gap-2">
                                 <MessageSquare className="w-3 h-3" /> Tactical Oracle
                             </span>
                             <button onClick={() => setIsChatOpen(false)} className="text-gray-500 hover:text-white"><PanelRightClose className="w-4 h-4" /></button>
                         </div>
                         <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4" ref={chatContainerRef}>
                             {state.chatHistory.map((msg, i) => (
                                 <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                     <div className={`max-w-[85%] p-3 rounded text-xs font-mono leading-relaxed border
                                        ${msg.role === 'user' 
                                            ? 'bg-[#9d4edd]/10 border-[#9d4edd]/30 text-gray-200' 
                                            : 'bg-[#111] border-[#333] text-gray-400'}`}>
                                          <MarkdownRenderer content={msg.text} />
                                     </div>
                                 </div>
                             ))}
                             {isChatProcessing && (
                                 <div className="flex justify-start">
                                     <div className="bg-[#111] border border-[#333] p-3 rounded text-xs text-gray-500 flex items-center gap-2">
                                         <Loader2 className="w-3 h-3 animate-spin" /> Thinking...
                                     </div>
                                 </div>
                             )}
                         </div>
                         <div className="p-3 border-t border-[#1f1f1f] bg-[#050505]">
                             <div className="flex items-center gap-2">
                                 <input 
                                    type="text" 
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                                    placeholder={contextData ? `Context: ${contextData.label} (Focus Mode)` : "Query the system state..."}
                                    className={`flex-1 bg-[#111] border border-[#333] px-3 py-2 text-xs font-mono text-white focus:border-[#9d4edd] outline-none disabled:opacity-50 transition-colors ${contextData ? 'border-[#9d4edd]/50 bg-[#9d4edd]/5' : ''}`}
                                    disabled={isChatProcessing}
                                 />
                                 <button onClick={handleSendChat} disabled={isChatProcessing} className="p-2 bg-[#9d4edd] text-black hover:bg-[#b06bf7] disabled:opacity-50">
                                     <Send className="w-3 h-3" />
                                 </button>
                             </div>
                         </div>
                     </MotionDiv>
                 )}
             </AnimatePresence>

             {/* SIDE PANEL: NODE INSPECTOR (Replaces Bottom Overlay) */}
             <AnimatePresence>
                 {selectedNode && !isChatOpen && (
                     <MotionDiv
                        initial={{ x: -320, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -320, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="absolute top-14 left-0 bottom-0 w-80 bg-[#0a0a0a]/95 backdrop-blur border-r border-[#333] flex flex-col z-40 shadow-xl"
                     >
                         <div className="h-12 border-b border-[#333] flex items-center justify-between px-4 bg-[#111]/50">
                             <span className="text-[10px] font-bold font-mono text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                 <MousePointer2 className="w-3.5 h-3.5 text-[#9d4edd]" />
                                 Node Inspector
                             </span>
                             <button onClick={clearSelection} className="text-gray-500 hover:text-white transition-colors">
                                 <X className="w-4 h-4" />
                             </button>
                         </div>

                         <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
                             {/* Header Info */}
                             <div>
                                 <div className="text-[9px] text-gray-500 font-mono uppercase mb-1">Designation</div>
                                 <h2 className="text-lg font-bold text-white font-mono leading-tight break-words">
                                     {contextData?.label || 'UNKNOWN_NODE'}
                                 </h2>
                                 <div className="flex items-center gap-2 mt-2">
                                     <span className="text-[9px] font-mono text-[#9d4edd] bg-[#9d4edd]/10 px-1.5 py-0.5 rounded border border-[#9d4edd]/30">
                                         ID: {contextData?.id}
                                     </span>
                                     <span className="text-[9px] font-mono text-gray-400 bg-[#1f1f1f] px-1.5 py-0.5 rounded border border-[#333]">
                                         {contextData?.type}
                                     </span>
                                 </div>
                             </div>

                             {/* Status Indicator */}
                             <div className="bg-[#111] p-3 rounded border border-[#222]">
                                 <div className="flex justify-between items-center mb-1">
                                     <span className="text-[9px] text-gray-500 font-mono uppercase">Operational Status</span>
                                     <div className={`w-2 h-2 rounded-full ${contextData?.status === 'ONLINE' || contextData?.status === 'VERIFIED' ? 'bg-[#42be65] animate-pulse' : 'bg-gray-500'}`}></div>
                                 </div>
                                 <div className="text-sm font-mono text-gray-300">
                                     {contextData?.status || 'IDLE'}
                                 </div>
                             </div>

                             {/* Subtext Context */}
                             {contextData?.subtext && (
                                 <div>
                                     <span className="text-[9px] text-gray-500 font-mono uppercase mb-1 block">Context Vector</span>
                                     <p className="text-xs text-gray-400 font-mono italic leading-relaxed border-l-2 border-[#333] pl-3">
                                         "{contextData.subtext}"
                                     </p>
                                 </div>
                             )}

                             {/* Connections */}
                             <div>
                                 <span className="text-[9px] text-gray-500 font-mono uppercase mb-2 block">Signal Pathways</span>
                                 {contextData?.connections && contextData.connections.length > 0 ? (
                                     <div className="space-y-1">
                                         {contextData.connections.map((conn: string, i: number) => (
                                             <div key={i} className="flex items-center gap-2 text-[10px] font-mono text-gray-400 bg-[#111] px-2 py-1.5 rounded border border-[#222]">
                                                 <Activity className="w-3 h-3 text-[#9d4edd]" />
                                                 {conn}
                                             </div>
                                         ))}
                                     </div>
                                 ) : (
                                     <div className="text-[10px] text-gray-600 font-mono italic">No active connections.</div>
                                 )}
                             </div>
                         </div>

                         {/* Actions Footer */}
                         <div className="p-4 border-t border-[#333] bg-[#050505] space-y-2">
                             <button 
                                onClick={() => setIsChatOpen(true)}
                                className="w-full py-2 bg-[#9d4edd] text-black font-bold text-xs uppercase tracking-wider hover:bg-[#b06bf7] transition-all flex items-center justify-center gap-2 rounded-sm"
                             >
                                 <MessageSquare className="w-3 h-3" /> Focus Chat
                             </button>
                             <button 
                                onClick={clearSelection}
                                className="w-full py-2 bg-[#1f1f1f] text-gray-400 border border-[#333] hover:text-white hover:border-gray-500 text-xs font-mono uppercase tracking-wider transition-all rounded-sm"
                             >
                                 Deselect
                             </button>
                         </div>
                     </MotionDiv>
                 )}
             </AnimatePresence>

         </div>
      </div>
    </div>
  );
};

export default ProcessVisualizer;
