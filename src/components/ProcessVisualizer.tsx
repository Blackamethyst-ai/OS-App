
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAppStore } from '../store';
import { generateMermaidDiagram, chatWithFiles, generateAudioOverview, fileToGenerativePart, promptSelectKey, classifyArtifact, generateAutopoieticFramework, generateStructuredWorkflow, calculateEntropy, determineTopology, generateScaffold, decomposeTask, executeAgentTask, startDeepResearchTask } from '../services/geminiService';
import { neuralVault } from '../services/persistenceService'; // Persistence
import { FileData, ProcessState, Message, ArtifactNode, GovernanceSchema, IngestionStatus, AppMode, ProjectTopology, StructuredScaffold, WorkerAgent, ProcessTab } from '../types';
import MermaidDiagram, { DiagramTheme } from './MermaidDiagram';
import ContextVelocityChart from './ContextVelocityChart';
import BicameralEngine from './BicameralEngine';
import { 
    ReactFlow, 
    ReactFlowProvider,
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
    OnSelectionChangeParams
} from '@xyflow/react';
import { Upload, FileText, X, Cpu, GitGraph, BrainCircuit, Headphones, Terminal, Play, Pause, LayoutDashboard, Sparkles, AlertCircle, Send, ArrowRight, Copy, Check, Edit2, RotateCcw, Trash2, MessageSquare, Mic, ShieldCheck, ScanLine, Loader2, Code, FileJson, Activity, Search, Clock, Network, Tag, Database, Zap, Wrench, Atom, Scroll, Layers, Hexagon, ChevronDown, PanelRightOpen, PanelRightClose, MousePointer2, FolderTree, FileCode, CheckCircle, BarChart, Save, Server, Share2, Shield, Box, GitMerge, Moon, Sun, Contrast, Grid, Split } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- VISUAL CONSTANTS (v13 CINEMATIC) ---
const THEME = {
    void: '#030303',
    glass: 'rgba(10, 10, 10, 0.6)',
    glassBorder: 'rgba(255, 255, 255, 0.08)',
    accent: {
        core: '#9d4edd',   // Amethyst (Control)
        memory: '#22d3ee', // Cyan (Data)
        action: '#f59e0b', // Amber (Power)
        tools: '#3b82f6',  // Blue (Logic)
        alert: '#ef4444',
        success: '#10b981'
    }
};

// --- CUSTOM HOOK: UNIFIED GRAPH SELECTION ---
const useGraphSelection = (nodes: Node[], edges: Edge[]) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const onSelectionChange = useCallback(({ nodes: selectedNodes }: OnSelectionChangeParams) => {
        if (selectedNodes.length > 0) {
            setSelectedId(selectedNodes[0].id);
        } else {
            setSelectedId(null);
        }
    }, []);

    const selectedNode = useMemo(() => nodes.find(n => n.id === selectedId), [nodes, selectedId]);
    
    // Derive Context Data for Chat Injection
    const contextData = useMemo(() => {
        if (!selectedNode) return null;
        
        // Find connected edges
        const connectedEdges = edges.filter(e => e.source === selectedId || e.target === selectedId);
        const connectionDetails = connectedEdges.map(e => {
            const isSource = e.source === selectedId;
            const otherId = isSource ? e.target : e.source;
            const otherNode = nodes.find(n => n.id === otherId);
            return `${isSource ? 'Outputs to' : 'Receives from'} ${otherNode?.data?.label || otherId} (${e.type})`;
        });

        return {
            id: selectedNode.id,
            type: selectedNode.type,
            label: (selectedNode.data.label as string) || 'Node',
            status: (selectedNode.data.status as string) || 'Unknown',
            subtext: (selectedNode.data.subtext as string) || '',
            connections: connectionDetails,
            raw: selectedNode.data
        };
    }, [selectedNode, edges, nodes, selectedId]);

    const clearSelection = useCallback(() => setSelectedId(null), []);

    return { 
        selectedId, 
        setSelectedId, 
        selectedNode, 
        contextData, 
        onSelectionChange,
        clearSelection
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

// Helper: Collapsible Genesis Section
const GenesisSection = ({ title, icon: Icon, children, defaultOpen = false, delay = 0 }: any) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
            className="border border-[#1f1f1f] bg-[#0a0a0a] rounded-lg overflow-hidden shadow-lg group/section"
        >
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-[#0f0f0f]/80 backdrop-blur hover:bg-[#151515] transition-all"
            >
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded bg-[#1f1f1f] text-[#9d4edd] border border-[#333] transition-all group-hover/section:border-[#9d4edd] ${isOpen ? 'bg-[#9d4edd]/10 border-[#9d4edd]/30 shadow-[0_0_10px_rgba(157,78,221,0.2)]' : ''}`}>
                        <Icon size={16} />
                    </div>
                    <span className="text-xs font-bold font-mono uppercase tracking-widest text-gray-300 group-hover/section:text-white transition-colors">{title}</span>
                </div>
                <div className={`text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#9d4edd]' : ''}`}>
                    <ChevronDown size={16} />
                </div>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                        <div className="p-6 border-t border-[#1f1f1f] bg-black/20">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const LogicStepCard: React.FC<{ step: any, index: number, color: string }> = ({ step, index, color }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <motion.div 
            layout
            onClick={() => setIsExpanded(!isExpanded)}
            className="relative bg-[#0a0a0a] border border-[#222] rounded-lg overflow-hidden cursor-pointer group transition-colors duration-300"
            style={{ 
                borderColor: isExpanded ? color : 'rgba(34,34,34,1)'
            }}
        >
            <div className="p-5 relative z-10">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#1f1f1f] text-gray-400 border border-[#333]">
                            SEQ_0{index + 1}
                        </span>
                        <span className="text-[10px] font-bold font-mono" style={{ color: color }}>
                            {step.step}
                        </span>
                    </div>
                    <motion.div 
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        className="text-gray-500"
                    >
                        <ChevronDown size={14} />
                    </motion.div>
                </div>

                <h3 className="text-sm font-bold text-white uppercase mb-2 group-hover:text-gray-200 transition-colors">
                    {step?.designation || 'UNTITLED STEP'}
                </h3>

                <AnimatePresence mode="wait">
                    {isExpanded ? (
                        <motion.div
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
                                <div className="mt-4 flex gap-2">
                                    <div className="h-0.5 flex-1 bg-[#1f1f1f] rounded overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: '100%' }}
                                            transition={{ duration: 0.8, ease: "circOut" }}
                                            className="h-full"
                                            style={{ backgroundColor: color }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.p 
                            key="preview"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-xs text-gray-500 font-mono line-clamp-2"
                        >
                            {step.execution_vector}
                        </motion.p>
                    )}
                </AnimatePresence>
            </div>
            
            {/* Background Glow on Expand */}
            {isExpanded && (
                <div 
                    className="absolute inset-0 opacity-5 pointer-events-none"
                    style={{ backgroundColor: color }}
                />
            )}
        </motion.div>
    );
};

// 1. Holographic Node (ReactFlow)
const HolographicNode = ({ data, selected }: NodeProps) => {
    const { label, icon: Icon, subtext, color, status, metrics, isHovered } = data as any;
    const glowColor = color || THEME.accent.core;

    return (
        <div className={`relative group rounded-xl border transition-all duration-300 backdrop-blur-xl
            ${selected 
                ? 'scale-105 shadow-[0_0_50px_rgba(0,0,0,0.8)] border-opacity-100 ring-1 ring-offset-2 ring-offset-black' 
                : isHovered 
                    ? 'scale-102 border-opacity-80' 
                    : 'shadow-2xl border-opacity-50'}
        `}
        style={{ 
            background: 'linear-gradient(145deg, rgba(15,15,15,0.9) 0%, rgba(5,5,5,0.95) 100%)',
            borderColor: selected ? glowColor : (isHovered ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'),
            ['--tw-ring-color' as string]: glowColor,
            minWidth: '200px'
        }}>
            {/* Inner Glow Gradient */}
            <div className="absolute inset-0 opacity-20 pointer-events-none transition-opacity duration-500 group-hover:opacity-40"
                 style={{ background: `radial-gradient(circle at center, ${glowColor}, transparent 70%)` }}></div>
            
            {/* Scanline Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.2)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none opacity-20"></div>

            {/* Hover Tooltip (Interactive) */}
            <div className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-4 w-64 pointer-events-none transition-all duration-300 z-50 origin-bottom ${isHovered && !selected ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'}`}>
                <div className="bg-black/90 backdrop-blur-xl border border-[#333] p-4 rounded-lg shadow-[0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden">
                    {/* Decorative line */}
                    <div className="absolute top-0 left-0 w-full h-0.5" style={{ backgroundColor: glowColor }}></div>
                    
                    <h4 className="text-xs font-bold text-white mb-1 uppercase tracking-wider flex items-center gap-2">
                        {Icon && <Icon size={12} className="text-gray-400" />}
                        {label}
                    </h4>
                    <p className="text-[10px] text-gray-400 font-mono mb-3 leading-relaxed border-b border-[#222] pb-2">
                        {subtext}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <div className="text-[9px] text-gray-600 font-mono uppercase">System Status</div>
                            <div className="text-[10px] font-bold" style={{ color: glowColor }}>{status}</div>
                        </div>
                         <div>
                            <div className="text-[9px] text-gray-600 font-mono uppercase">Compute Load</div>
                            <div className="text-[10px] font-bold text-gray-300">{Math.floor(Math.random() * 40 + 10)}%</div>
                        </div>
                    </div>
                </div>
                {/* Arrow */}
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#333] mx-auto"></div>
            </div>

            {/* Header / Icon */}
            <div className="relative z-10 p-4 flex items-start gap-4">
                <div className="relative">
                    <div className={`absolute inset-0 blur-lg transition-opacity duration-300 ${isHovered ? 'opacity-60' : 'opacity-20'}`} style={{ background: glowColor }}></div>
                    <div className="relative p-2.5 rounded-lg border border-white/10 bg-black/40 text-white">
                        <Icon size={20} style={{ color: glowColor }} />
                    </div>
                </div>
                
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                        <h3 className="text-xs font-bold text-gray-100 font-sans tracking-tight uppercase">{label}</h3>
                        {status && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-white/5 bg-white/5 text-gray-400">
                                {status}
                            </span>
                        )}
                    </div>
                    <p className="text-[10px] text-gray-500 font-mono truncate">{subtext}</p>
                </div>
            </div>

            {/* Metrics Footer */}
            {metrics && (
                <div className="relative z-10 px-4 py-2 border-t border-white/5 bg-white/0 flex justify-between items-center">
                    <div className="flex gap-1 h-1 w-full max-w-[60px]">
                        {[1,2,3,4].map(i => (
                            <div key={i} className="flex-1 rounded-full opacity-50" style={{ background: i <= 2 ? glowColor : '#333' }}></div>
                        ))}
                    </div>
                    <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">{metrics}</span>
                </div>
            )}

            {/* Handles */}
            <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-gray-500 !border-2 !border-black" />
            <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-white !border-2 !border-black" />
            <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-gray-500 !border-2 !border-black" />
            <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-white !border-2 !border-black" />
        </div>
    );
};

// 2. Cinematic Flow Edge (ReactFlow) - Enhanced with Variants
const AnimatedFlowEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, markerEnd, data }: EdgeProps) => {
    const [edgePath] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
    const color = (data?.color as string) || '#555';
    const isActive = data?.active as boolean;
    const isHovered = data?.isHovered as boolean;
    const variant = (data?.variant as 'stream' | 'pulse' | 'tunnel') || 'stream';

    // Highlight Override
    const displayColor = isHovered ? '#ffffff' : color;
    const displayWidth = isHovered ? 3 : 1;
    const displayOpacity = isHovered ? 1 : (isActive ? 0.8 : 0.4);

    return (
        <>
            {/* 1. Interaction Hitbox (Invisible, wider) */}
            <path
                d={edgePath}
                fill="none"
                stroke="transparent"
                strokeWidth={20}
                style={{ cursor: 'pointer' }}
            />

            {/* 2. Static Rail (Always present) */}
            <path
                d={edgePath}
                fill="none"
                stroke={displayColor}
                strokeWidth={displayWidth}
                strokeOpacity={displayOpacity}
            />

            {/* 3. Active State Effects */}
            {(isActive || isHovered) && (
                <>
                    {/* Common Glow */}
                    <path 
                        d={edgePath}
                        fill="none"
                        stroke={displayColor}
                        strokeWidth={variant === 'tunnel' ? 6 : 4}
                        strokeOpacity={isHovered ? 0.4 : 0.1}
                        style={{
                            filter: 'blur(4px)',
                            animation: 'pulseField 2s ease-in-out infinite'
                        }}
                    />

                    {/* Variant 1: Data Stream (Dashed packets) */}
                    {variant === 'stream' && (
                        <path
                            id={id}
                            d={edgePath}
                            fill="none"
                            stroke={displayColor}
                            strokeWidth={isHovered ? 3 : 2}
                            strokeDasharray="10 50" // Short dash, longer gap
                            strokeLinecap="round"
                            markerEnd={markerEnd}
                            style={{
                                filter: `drop-shadow(0 0 4px ${displayColor})`,
                                animation: 'streamFlow 0.8s linear infinite'
                            }}
                        />
                    )}

                    {/* Variant 2: Signal Pulse (Long wave) */}
                    {variant === 'pulse' && (
                        <path
                            id={id}
                            d={edgePath}
                            fill="none"
                            stroke={displayColor}
                            strokeWidth={3}
                            strokeDasharray="100 200"
                            strokeLinecap="square"
                            markerEnd={markerEnd}
                            style={{
                                opacity: 0.8,
                                animation: 'signalPulse 2s ease-in-out infinite'
                            }}
                        />
                    )}

                    {/* Variant 3: Quantum Tunnel (Dual lines) */}
                    {variant === 'tunnel' && (
                        <>
                             <path
                                d={edgePath}
                                fill="none"
                                stroke={displayColor}
                                strokeWidth={1}
                                strokeDasharray="5 5"
                                style={{
                                    transform: 'translateY(2px)',
                                    animation: 'tunnelFlow 1s linear infinite'
                                }}
                            />
                             <path
                                d={edgePath}
                                fill="none"
                                stroke={displayColor}
                                strokeWidth={1}
                                strokeDasharray="5 5"
                                style={{
                                    transform: 'translateY(-2px)',
                                    animation: 'tunnelFlow 1s linear infinite reverse'
                                }}
                            />
                        </>
                    )}
                </>
            )}

            <style>{`
                @keyframes streamFlow {
                    from { stroke-dashoffset: 60; }
                    to { stroke-dashoffset: 0; }
                }
                @keyframes signalPulse {
                    0% { stroke-dashoffset: 300; opacity: 0; }
                    50% { opacity: 1; }
                    100% { stroke-dashoffset: 0; opacity: 0; }
                }
                 @keyframes tunnelFlow {
                    from { stroke-dashoffset: 10; }
                    to { stroke-dashoffset: 0; }
                }
                @keyframes pulseField {
                    0%, 100% { stroke-opacity: 0.1; stroke-width: 4px; }
                    50% { stroke-opacity: 0.3; stroke-width: 6px; }
                }
            `}</style>
        </>
    );
};

const nodeTypes = { holographic: HolographicNode };
const edgeTypes = { cinematic: AnimatedFlowEdge };


// --- MAIN COMPONENT ---

const ProcessVisualizer: React.FC = () => {
  const { process: state, setProcessState: setState, setCodeStudioState, setMode } = useAppStore();
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isRestored, setIsRestored] = useState(false);
  
  // State for Workflow Type Switcher
  const [workflowType, setWorkflowType] = useState<'DRIVE_ORG' | 'SYSTEM_ARCH'>('DRIVE_ORG');

  const [chatInput, setChatInput] = useState('');
  const [isChatProcessing, setIsChatProcessing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // New: Deep Research Toggle
  const [isDeepResearch, setIsDeepResearch] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);

  // Persistence for Drag-and-Drop
  const nodePositions = useRef<{ [key: string]: { x: number, y: number } }>({});

  // Use Unified Graph Selection Hook
  const { selectedId, setSelectedId, selectedNode, contextData, onSelectionChange, clearSelection } = useGraphSelection(nodes, edges);

  // --- NeuralVault Integration: Hydration ---
  useEffect(() => {
    const hydrate = async () => {
        try {
            const history = await neuralVault.getHistory(AppMode.PROCESS_MAP);
            if (history && history.length > 0) {
                // Get the most recent snapshot (IDB orders key by default if numeric timestamp)
                const latest = history[history.length - 1]; 
                
                if (latest && latest.state) {
                    const restoredState = latest.state;
                    // Sanitize artifacts: File objects are lost during JSON serialization, 
                    // we must ensure the UI doesn't crash by providing a dummy object if needed.
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

  // --- NeuralVault Integration: Auto-Save ---
  useEffect(() => {
    // 60-second auto-save loop
    const saveLoop = setInterval(() => {
        const currentState = useAppStore.getState().process;
        neuralVault.createCheckpoint(AppMode.PROCESS_MAP, currentState, "Auto-Save");
    }, 60000);
    
    return () => clearInterval(saveLoop);
  }, []);

  // Ensure Chat sidebar opens when a node is selected
  useEffect(() => {
      if (selectedId && !isChatOpen) {
          setIsChatOpen(true);
      }
  }, [selectedId]);

  const validateArtifact = async (nodeId: string, data: FileData) => {
      try {
        const analysis = await classifyArtifact(data);
        setState(prev => ({
            artifacts: prev.artifacts.map(a => a.id === nodeId ? { ...a, status: 'verified' as IngestionStatus, analysis: analysis } : a)
        }));
        
        // Auto-calculate entropy when artifacts change
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

  const onNodeDragStop = useCallback((event: React.MouseEvent, node: Node) => {
      // Collision Logic: Drop Artifact on Memory Node to re-contextualize
      if (node.id.startsWith('art-')) {
          const memoryNode = nodes.find(n => n.id === 'memory');
          if (memoryNode) {
              const dx = node.position.x - memoryNode.position.x;
              const dy = node.position.y - memoryNode.position.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              
              // Threshold for drop interaction (approx radius of nodes overlap)
              if (dist < 200) {
                  // 1. Reset position to orbit (delete override) so it snaps back
                  delete nodePositions.current[node.id];
                  
                  // 2. Trigger Re-scan/Verify state
                  const artifact = state.artifacts.find(a => a.id === node.id);
                  if (artifact && artifact.data) {
                       setState(prev => ({
                           artifacts: prev.artifacts.map(a => a.id === node.id ? { ...a, status: 'scanning' } : a)
                       }));
                       
                       // Re-validate
                       validateArtifact(node.id, artifact.data);
                  }
                  return;
              }
          }
      }
      
      nodePositions.current[node.id] = node.position;
  }, [nodes, state.artifacts]);

  // --- Living Map Logic ---
  useEffect(() => {
      const centerX = 600;
      const centerY = 400;
      const moduleOffset = 280;

      // State Flags
      const isThinking = isChatProcessing;
      const isActing = state.isLoading;
      const hasMemory = state.artifacts.length > 0;
      const isScanning = state.artifacts.some(a => a.status === 'scanning');
      const memoryCount = state.artifacts.length;
      const verifiedCount = state.artifacts.filter(a => a.status === 'verified').length;
      const isSwarming = state.swarm.isActive;

      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];

      const getPos = (id: string, defaultPos: {x: number, y: number}) => {
          return nodePositions.current[id] || defaultPos;
      };

      // 1. CENTRAL AGENT (CORE)
      newNodes.push({
          id: 'core',
          type: 'holographic',
          position: getPos('core', { x: centerX, y: centerY }),
          data: {
              label: 'Sovereign Agent',
              subtext: isThinking ? 'REASONING ENGINE ACTIVE' : (isActing ? 'EXECUTING PROTOCOLS' : (isSwarming ? 'SWARM CONTROLLER' : 'SYSTEM IDLE')),
              icon: BrainCircuit,
              color: isThinking ? THEME.accent.tools : (isActing ? THEME.accent.action : THEME.accent.core),
              status: isSwarming ? 'ORCHESTRATING' : (isThinking ? 'THINKING' : 'ONLINE'),
              metrics: 'V3.2 KERNEL'
          },
          style: { width: 240 }
      });

      // 1.5 SWARM NODES (If active)
      if (isSwarming) {
          const swarmRadius = 350;
          state.swarm.agents.forEach((agent, i) => {
              const angle = (i / state.swarm.agents.length) * 2 * Math.PI;
              const defaultPos = {
                  x: centerX + Math.cos(angle) * swarmRadius,
                  y: centerY + Math.sin(angle) * swarmRadius
              };
              
              let statusColor = '#555';
              if (agent.status === 'WORKING') statusColor = '#f1c21b';
              if (agent.status === 'COMPLETE') statusColor = '#42be65';
              if (agent.status === 'FAILED') statusColor = '#ef4444';

              newNodes.push({
                  id: agent.id,
                  type: 'holographic',
                  position: getPos(agent.id, defaultPos),
                  data: {
                      label: agent.role,
                      subtext: agent.task.substring(0, 30) + '...',
                      icon: Cpu,
                      color: statusColor,
                      status: agent.status,
                      metrics: agent.durationMs ? `${agent.durationMs}ms` : 'ACTIVE'
                  },
                  style: { width: 200 }
              });

              // Edge: Core -> Agent
              newEdges.push({
                  id: `e-core-${agent.id}`,
                  source: 'core',
                  target: agent.id,
                  type: 'cinematic',
                  data: { color: statusColor, active: agent.status === 'WORKING', variant: 'stream' }
              });
          });
      }

      // 2. MEMORY (Top)
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
              metrics: `${verifiedCount}/${memoryCount} ARTIFACTS`
          }
      });

      // 3. TOOLS (Left)
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
              metrics: '5 MODULES'
          }
      });

      // 4. ACTION (Right)
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
              metrics: 'GEN_AI'
          }
      });

      // 5. REFLECT (Bottom)
      newNodes.push({
          id: 'reflect',
          type: 'holographic',
          position: getPos('reflect', { x: centerX, y: centerY + moduleOffset }),
          data: {
              label: 'Reflect Loop',
              subtext: 'Self-Correction',
              icon: Activity,
              color: THEME.accent.alert, // Using alert/attention color for reflection
              status: isThinking ? 'CRITIQUE' : 'PASSIVE',
              metrics: 'AUTO-EVAL'
          }
      });

      // --- ARTIFACTS ORBIT ---
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
              },
              style: { width: 180 }
          });

          // Edge: Artifact -> Memory
          newEdges.push({
              id: `e-${art.id}-mem`,
              source: art.id,
              target: 'memory',
              type: 'cinematic',
              data: { color: statusColor, active: art.status === 'scanning', variant: 'stream' }
          });
      });

      // --- CORE CONNECTIONS ---
      newEdges.push(
          { 
              id: 'e-mem-core', source: 'memory', target: 'core', type: 'cinematic', 
              data: { color: THEME.accent.memory, active: isScanning || hasMemory, variant: 'tunnel' } 
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

  }, [state.artifacts, isChatProcessing, state.isLoading, state.generatedCode, state.audioUrl, state.swarm, setNodes, setEdges]);

  // --- INTERACTION HANDLERS ---
  
  const onNodeMouseEnter = useCallback((event: any, node: Node) => {
      setHoveredNode(node.id);
  }, []);

  const onNodeMouseLeave = useCallback(() => {
      setHoveredNode(null);
  }, []);

  const onEdgeMouseEnter = useCallback((event: React.MouseEvent, edge: Edge) => {
      setHoveredEdge(edge.id);
  }, []);

  const onEdgeMouseLeave = useCallback(() => {
      setHoveredEdge(null);
  }, []);

  // Compute node opacity based on hover state (Focus Mode)
  const animatedNodes = useMemo(() => {
      return nodes.map(node => {
          const isHovered = hoveredNode === node.id;
          const isDimmed = hoveredNode && !isHovered;
          
          return {
              ...node,
              data: {
                  ...node.data,
                  isHovered,
              },
              style: {
                  ...node.style,
                  opacity: isDimmed ? 0.3 : 1,
                  zIndex: isHovered ? 999 : 1,
                  transition: 'opacity 0.3s ease-in-out'
              }
          };
      });
  }, [nodes, hoveredNode]);

  const animatedEdges = useMemo(() => {
      return edges.map(edge => {
          const isHovered = hoveredEdge === edge.id;
          const isDimmed = hoveredNode && edge.source !== hoveredNode && edge.target !== hoveredNode;
          
          return {
              ...edge,
              style: {
                  ...edge.style,
                  opacity: isDimmed ? 0.1 : 1,
                  transition: 'opacity 0.3s ease-in-out'
              },
              data: { ...edge.data, isHovered }
          };
      });
  }, [edges, hoveredNode, hoveredEdge]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newArtifacts: ArtifactNode[] = [];
      const pendingFiles: File[] = Array.from(e.target.files);
      for (let i = 0; i < pendingFiles.length; i++) {
        newArtifacts.push({ id: `art-${Date.now()}-${i}`, file: pendingFiles[i], status: 'scanning', data: null });
      }
      setState(prev => ({ artifacts: [...prev.artifacts, ...newArtifacts] }));
      if (state.activeTab === 'diagram') setState({ activeTab: 'living_map' });

      for (let i = 0; i < pendingFiles.length; i++) {
          const file = pendingFiles[i];
          const nodeId = newArtifacts[i].id;
          try {
              const data = await fileToGenerativePart(file);
              // Save raw artifact to vault immediately
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

  const handleGenerate = async (type: ProcessTab) => {
    if (!(await checkApiKey())) return;
    const validFiles = getVerifiedFiles();

    if (type === 'genesis') {
        if (validFiles.length === 0) { setState({ error: "Genesis requires verified Source Artifact." }); return; }
        setState({ activeTab: 'genesis', isLoading: true });
        try {
            const framework = await generateAutopoieticFramework(validFiles[0], state.governance);
            setState({ autopoieticFramework: framework });
        } catch (err: any) { setState({ error: "Genesis Failed: " + err.message }); } 
        finally { setState({ isLoading: false }); }
        return;
    }

    if (type === 'workflow') {
        setState({ activeTab: 'workflow', isLoading: true });
        try {
            // Using the new generateStructuredWorkflow which supports types
            const workflow = await generateStructuredWorkflow(validFiles, state.governance, workflowType);
            setState({ generatedWorkflow: workflow });
        } catch(err: any) { setState({ error: "Workflow Gen Failed: " + err.message }); }
        finally { setState({ isLoading: false }); }
        return;
    }

    setState({ isLoading: true, error: null, activeTab: type });
    try {
      if (type === 'diagram') {
        const code = await generateMermaidDiagram(state.governance, validFiles);
        setState({ generatedCode: code });
      } else if (type === 'audio') {
        const audioUrl = await generateAudioOverview(validFiles);
        setState({ audioUrl: audioUrl });
      }
    } catch (err: any) { setState({ error: err.message }); } 
    finally { setState({ isLoading: false }); }
  };

  const openInCodeStudio = (code: string) => {
      setMode('CODE_STUDIO' as any);
      setCodeStudioState({ generatedCode: code, language: 'bash', prompt: "Execute system scaffold sequence" });
  };

  const handleSendChat = async () => {
      if (!chatInput.trim() || isChatProcessing || !(await checkApiKey())) return;
      
      // DEEP RESEARCH BRANCH
      if (isDeepResearch) {
          startDeepResearchTask(chatInput);
          setChatInput('');
          return;
      }

      const userMsg: Message = { role: 'user', text: chatInput, timestamp: Date.now() };
      setState(prev => ({ chatHistory: [...prev.chatHistory, userMsg] }));
      setChatInput(''); setIsChatProcessing(true);
      
      // Construct Context from Current View & Selection
      let context = "You are the Tactical Oracle. You have access to the full system state.";
      
      // -- NEW: Context Awareness from Selection --
      if (contextData) {
          context += `\n\n[FOCUS CONTEXT] User has selected Node: "${contextData.label}" (ID: ${contextData.id}, Type: ${contextData.type}).
          \nConnections: ${contextData.connections.join(', ') || 'None'}.
          \nStatus: ${contextData.status}.
          \nSubtext: ${contextData.subtext}.
          \nPlease focus analysis on this specific component and its relationships.`;
      }
      // -------------------------------------------

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
  
  // Auto-scroll chat
  useEffect(() => {
    if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.chatHistory, isChatOpen]);

  // --- RENDER ---
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 h-full rounded-xl border border-[#1f1f1f] bg-[#030303] shadow-2xl relative overflow-hidden font-sans">
      
      {/* Sidebar - Governance Control */}
      <div className="lg:col-span-3 bg-[#050505] border-r border-[#1f1f1f] flex flex-col relative z-20">
         <div className="h-14 border-b border-[#1f1f1f] flex items-center justify-between px-4 bg-[#0a0a0a]">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center font-mono">
               <ShieldCheck className="w-3.5 h-3.5 mr-2 text-[#9d4edd]" />
               Governance Control
            </h2>
            <button onClick={() => setState({ artifacts: [], chatHistory: [], generatedCode: '' })} className="text-gray-600 hover:text-red-500"><Trash2 className="w-3 h-3"/></button>
         </div>

         {/* NotebookLM Style Source Management */}
         <div className="flex-1 flex flex-col p-0 overflow-hidden">
            <div className="p-4 bg-[#080808]">
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
                        <p className="text-[8px] text-gray-600 mt-1 font-mono">
                            {state.entropyScore > 50 ? 'CRITICAL DISARRAY DETECTED. RUN ARCHITECT.' : 'SYSTEM NOMINAL.'}
                        </p>
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

            {/* Ontology Form */}
            <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1 border-t border-[#1f1f1f]">
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

            <button
                onClick={() => state.activeTab === 'workflow' ? setState({ architectMode: 'EXECUTION' }) : handleGenerate(state.activeTab === 'living_map' ? 'diagram' : state.activeTab)} 
                disabled={state.isLoading}
                className="mx-4 mb-4 py-3 bg-[#9d4edd] text-black font-bold text-[10px] tracking-[0.2em] uppercase font-mono hover:bg-[#b06bf7] transition-all shadow-[0_0_20px_rgba(157,78,221,0.3)]"
            >
                {state.isLoading ? 'PROCESSING...' : state.activeTab === 'workflow' ? 'OPEN ENGINE' : 'RUN SEQUENCE'}
            </button>
         </div>
      </div>

      {/* Main Viewport */}
      <div className="lg:col-span-9 flex flex-col bg-[#030303] relative">
         {/* Atmospheric Background */}
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1a0b2e_0%,#030303_100%)] pointer-events-none"></div>
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none"></div>
         
         {/* Navigation Header */}
         <div className="h-14 border-b border-[#1f1f1f] bg-[#0a0a0a]/80 backdrop-blur px-6 flex items-center justify-between relative z-10">
            <div className="flex space-x-1">
                {['living_map', 'diagram', 'workflow', 'genesis', 'audio'].map((tab) => (
                    <button 
                        key={tab}
                        onClick={() => setState({ activeTab: tab as ProcessTab })}
                        className={`flex items-center px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 ${state.activeTab === tab ? 'border-[#9d4edd] text-[#9d4edd]' : 'border-transparent text-gray-600 hover:text-gray-400'}`}
                    >
                        {tab === 'living_map' && <Network className="w-3 h-3 mr-2" />}
                        {tab === 'diagram' && <GitGraph className="w-3 h-3 mr-2" />}
                        {tab === 'workflow' && <FolderTree className="w-3 h-3 mr-2" />}
                        {tab === 'genesis' && <Atom className="w-3 h-3 mr-2" />}
                        {tab === 'audio' && <Headphones className="w-3 h-3 mr-2" />}
                        {tab === 'workflow' ? 'ARCHITECT' : tab.replace('_', ' ')}
                    </button>
                ))}
            </div>
            <div className="flex items-center space-x-3">
                <button 
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    className={`flex items-center px-3 py-1.5 rounded-sm border transition-all text-[10px] font-mono uppercase tracking-wider ${isChatOpen ? 'bg-[#9d4edd] text-black border-[#9d4edd]' : 'bg-[#111] text-gray-400 border-[#333] hover:text-white'}`}
                >
                    <MessageSquare className="w-3 h-3 mr-2" />
                    Oracle
                    {isChatOpen ? <PanelRightClose className="w-3 h-3 ml-2 opacity-50"/> : <PanelRightOpen className="w-3 h-3 ml-2 opacity-50"/>}
                </button>
                <div className="w-px h-4 bg-[#333]"></div>
                <button onClick={() => setShowTelemetry(!showTelemetry)} className={`text-[10px] font-mono px-2 py-1 rounded ${showTelemetry ? 'text-[#9d4edd] bg-[#9d4edd]/10' : 'text-gray-500'}`}>HUD_VIS</button>
            </div>
         </div>

         {/* Split Container: Content + Chat Sidebar */}
         <div className="flex-1 overflow-hidden relative z-0 flex min-h-0">
            
            {/* Main Content Area */}
            <div className="flex-1 relative flex flex-col min-w-0">
                {state.activeTab === 'living_map' && (
                    <div className="h-full w-full bg-black relative">
                        <ReactFlowProvider>
                            <ReactFlow
                                nodes={animatedNodes}
                                edges={animatedEdges}
                                nodeTypes={nodeTypes}
                                edgeTypes={edgeTypes}
                                onNodeMouseEnter={onNodeMouseEnter}
                                onNodeMouseLeave={onNodeMouseLeave}
                                onEdgeMouseEnter={onEdgeMouseEnter}
                                onEdgeMouseLeave={onEdgeMouseLeave}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                onNodeDragStop={onNodeDragStop}
                                onSelectionChange={onSelectionChange} 
                                onPaneClick={clearSelection}
                                fitView
                                className="bg-black"
                                colorMode="dark"
                                minZoom={0.1}
                                maxZoom={4}
                            >
                                <Background color="#222" gap={30} size={1} />
                                <Controls className="bg-[#111] border border-[#333] text-gray-400" />
                                <MiniMap nodeStrokeColor="#9d4edd" nodeColor="#111" style={{ backgroundColor: '#050505', border: '1px solid #333' }} />
                            </ReactFlow>
                        </ReactFlowProvider>
                        
                        {/* Status Overlay */}
                        <div className="absolute top-4 left-4 bg-black/80 backdrop-blur border border-[#333] p-3 rounded-lg shadow-2xl pointer-events-none z-10">
                            <div className="text-[10px] font-mono text-[#9d4edd] uppercase tracking-widest mb-1">System Topology</div>
                            <div className="text-[9px] font-mono text-gray-500">
                                Nodes: {nodes.length} | Edges: {edges.length} | Status: {state.isLoading ? 'SYNCING' : 'STABLE'}
                            </div>
                        </div>
                    </div>
                )}

                {/* Diagram View */}
                {state.activeTab === 'diagram' && (
                    <div className="flex-1 w-full bg-[#030303] relative overflow-hidden">
                        {state.generatedCode ? (
                            <MermaidDiagram code={state.generatedCode} />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50 space-y-4">
                                <GitGraph className="w-16 h-16" />
                                <p className="font-mono text-xs uppercase tracking-widest">Awaiting Architecture Generation</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Upgrade A: Workflow Architect */}
                {state.activeTab === 'workflow' && (
                    state.architectMode === 'EXECUTION' ? (
                        <div className="w-full h-full relative">
                            {/* Toggle Header Overlay */}
                            <div className="absolute top-4 right-4 z-30 bg-[#0a0a0a] border border-[#333] rounded p-1 flex">
                                <button 
                                    onClick={() => setState({ architectMode: 'BLUEPRINT' })}
                                    className="px-3 py-1.5 text-[9px] font-mono font-bold uppercase rounded text-gray-500 hover:text-white transition-colors"
                                >
                                    View Topology
                                </button>
                                <button 
                                    onClick={() => setState({ architectMode: 'EXECUTION' })}
                                    className="px-3 py-1.5 text-[9px] font-mono font-bold uppercase rounded bg-[#9d4edd] text-black shadow-sm"
                                >
                                    Open Engine
                                </button>
                            </div>
                            <BicameralEngine />
                        </div>
                    ) : (
                        <div className="h-full w-full bg-[#050505] overflow-hidden flex flex-col relative">
                            {/* Toggle Header Overlay */}
                            <div className="absolute top-4 right-4 z-30 bg-[#0a0a0a] border border-[#333] rounded p-1 flex">
                                <button 
                                    onClick={() => setState({ architectMode: 'BLUEPRINT' })}
                                    className="px-3 py-1.5 text-[9px] font-mono font-bold uppercase rounded bg-[#9d4edd] text-black shadow-sm"
                                >
                                    View Topology
                                </button>
                                <button 
                                    onClick={() => setState({ architectMode: 'EXECUTION' })}
                                    className="px-3 py-1.5 text-[9px] font-mono font-bold uppercase rounded text-gray-500 hover:text-white transition-colors"
                                >
                                    Open Engine
                                </button>
                            </div>

                            {!state.generatedWorkflow ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-70">
                                    <div className="w-20 h-20 bg-[#111] rounded-full border border-[#333] flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(157,78,221,0.1)]">
                                        {workflowType === 'DRIVE_ORG' ? <FolderTree className="w-8 h-8 text-[#9d4edd]" /> : <Server className="w-8 h-8 text-[#9d4edd]" />}
                                    </div>
                                    <h3 className="text-xl font-bold font-mono text-white mb-2 uppercase tracking-widest">Architect Idle</h3>
                                    <p className="text-xs text-gray-500 font-mono max-w-sm mb-8 leading-relaxed">
                                        Configure generation parameters for the Architect Engine.
                                    </p>
                                    
                                    {/* WORKFLOW TYPE TOGGLE */}
                                    <div className="flex bg-[#111] border border-[#333] rounded p-1 mb-8">
                                        <button 
                                            onClick={() => setWorkflowType('DRIVE_ORG')}
                                            className={`px-4 py-2 text-[10px] font-mono font-bold uppercase rounded transition-colors ${workflowType === 'DRIVE_ORG' ? 'bg-[#9d4edd] text-black' : 'text-gray-500 hover:text-white'}`}
                                        >
                                            Drive Org
                                        </button>
                                        <button 
                                            onClick={() => setWorkflowType('SYSTEM_ARCH')}
                                            className={`px-4 py-2 text-[10px] font-mono font-bold uppercase rounded transition-colors ${workflowType === 'SYSTEM_ARCH' ? 'bg-[#9d4edd] text-black' : 'text-gray-500 hover:text-white'}`}
                                        >
                                            System Arch
                                        </button>
                                    </div>

                                    <button 
                                        onClick={() => handleGenerate('workflow')}
                                        disabled={state.isLoading}
                                        className="px-8 py-3 bg-[#9d4edd] text-black font-bold uppercase font-mono tracking-widest hover:bg-[#b06bf7] transition-all shadow-[0_0_20px_rgba(157,78,221,0.3)] flex items-center gap-2"
                                    >
                                        {state.isLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Cpu className="w-4 h-4"/>}
                                        Generate {workflowType === 'DRIVE_ORG' ? 'Structure' : 'Architecture'}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex-1 flex overflow-hidden">
                                    {/* Visual Tree & Diagram */}
                                    <div className="w-1/2 border-r border-[#1f1f1f] flex flex-col p-6 overflow-y-auto custom-scrollbar">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                {workflowType === 'DRIVE_ORG' ? <FolderTree className="w-4 h-4 text-[#9d4edd]" /> : <Server className="w-4 h-4 text-[#9d4edd]" />}
                                                <h3 className="text-xs font-bold font-mono uppercase tracking-widest text-white">
                                                    {workflowType === 'DRIVE_ORG' ? 'Ideal Topology' : 'Component Hierarchy'}
                                                </h3>
                                            </div>
                                            <div className="text-[9px] text-gray-500 font-mono">v1.0 GENERATED</div>
                                        </div>
                                        <div className="bg-[#0a0a0a] border border-[#333] rounded p-6 shadow-inner font-mono text-xs text-gray-300 whitespace-pre overflow-auto mb-6 max-h-[40%]">
                                            {state.generatedWorkflow.structureTree}
                                        </div>

                                        {state.generatedWorkflow.processDiagram && (
                                            <div className="flex-1 flex flex-col min-h-[300px]">
                                                <div className="flex items-center gap-2 mb-4 border-b border-[#333] pb-2">
                                                    <GitGraph className="w-4 h-4 text-[#9d4edd]" />
                                                    <h3 className="text-xs font-bold font-mono uppercase tracking-widest text-white">
                                                        {workflowType === 'DRIVE_ORG' ? 'Process Lifecycle' : 'Data Flow Diagram'}
                                                    </h3>
                                                </div>
                                                <div className="flex-1 bg-[#0a0a0a] border border-[#333] rounded overflow-hidden relative">
                                                     <MermaidDiagram code={state.generatedWorkflow.processDiagram} />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Protocols & Automation */}
                                    <div className="w-1/2 flex flex-col p-6 overflow-y-auto custom-scrollbar bg-[#080808]">
                                        <div className="mb-8">
                                            <div className="flex items-center gap-2 mb-4 border-b border-[#333] pb-2">
                                                <CheckCircle className="w-4 h-4 text-[#42be65]" />
                                                <h3 className="text-xs font-bold font-mono uppercase tracking-widest text-white">
                                                    {workflowType === 'DRIVE_ORG' ? 'File Management Workflows' : 'System Architecture Rules'}
                                                </h3>
                                            </div>
                                            <div className="space-y-3">
                                                {state.generatedWorkflow.protocols.map((p, i) => (
                                                    <div key={i} className="bg-[#111] p-3 rounded border-l-2 border-[#9d4edd]">
                                                        <div className="text-xs font-bold text-gray-200 mb-1">{p.rule}</div>
                                                        <div className="text-[10px] text-gray-500 font-mono">{p.reasoning}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-4 border-b border-[#333] pb-2">
                                                <div className="flex items-center gap-2">
                                                    <FileCode className="w-4 h-4 text-[#f59e0b]" />
                                                    <h3 className="text-xs font-bold font-mono uppercase tracking-widest text-white">
                                                        {workflowType === 'DRIVE_ORG' ? 'Scaffold Automator' : 'Deployment Config'}
                                                    </h3>
                                                </div>
                                                <button 
                                                    onClick={() => openInCodeStudio(state.generatedWorkflow!.automationScript)}
                                                    className="text-[9px] text-[#9d4edd] hover:text-white font-mono uppercase border border-[#333] px-2 py-1 rounded bg-[#111] hover:bg-[#222]"
                                                >
                                                    Open in Code Studio
                                                </button>
                                            </div>
                                            <div className="bg-[#0a0a0a] border border-[#333] rounded p-4 font-mono text-[10px] text-gray-400 overflow-x-auto whitespace-pre max-h-64">
                                                {state.generatedWorkflow.automationScript}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                )}

                {/* Genesis View (Keep as is) */}
                {state.activeTab === 'genesis' && (
                    <div className="h-full w-full min-h-full overflow-y-auto custom-scrollbar bg-[#050505] relative">
                        {/* ... Existing Genesis View code ... */}
                        {!state.autopoieticFramework ? (
                            <div className="min-h-full flex flex-col items-center justify-center text-center p-8 pb-24">
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-[#9d4edd] blur-[40px] opacity-20 group-hover:opacity-40 transition-opacity rounded-full"></div>
                                    <div className="w-24 h-24 bg-[#0a0a0a] border border-[#333] rounded-full flex items-center justify-center mb-8 relative z-10 shadow-2xl">
                                        <Atom className="w-10 h-10 text-gray-500 group-hover:text-[#9d4edd] transition-colors" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-black font-mono text-white mb-2 uppercase tracking-widest">Genesis Engine Idle</h3>
                                <p className="text-gray-500 font-mono text-xs max-w-md mb-8 leading-relaxed">
                                    Upload source artifacts to sequence the Autopoietic Framework. 
                                    The system will derive a philosophical self-organizing model from the input text.
                                </p>

                                <div className="mb-6 w-full max-w-md">
                                     <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#333] rounded-lg cursor-pointer hover:border-[#9d4edd] hover:bg-[#9d4edd]/5 transition-all group bg-[#0a0a0a]">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <Upload className="w-8 h-8 text-gray-500 mb-3 group-hover:text-[#9d4edd] group-hover:scale-110 transition-all" />
                                            <p className="mb-2 text-xs text-gray-400 font-mono uppercase tracking-wide"><span className="font-bold text-[#9d4edd]">Click to upload</span> source artifacts</p>
                                            <p className="text-[9px] text-gray-600 font-mono">Supported Formats: TXT, MD, PDF</p>
                                        </div>
                                        <input type="file" multiple className="hidden" onChange={handleFileChange} />
                                    </label>
                                </div>

                                <button 
                                    onClick={() => handleGenerate('genesis')}
                                    disabled={state.isLoading || getVerifiedFiles().length === 0}
                                    className="px-8 py-3 bg-[#9d4edd] text-black font-bold uppercase font-mono tracking-widest hover:bg-[#b06bf7] disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-[0_0_30px_rgba(157,78,221,0.4)]"
                                >
                                    {state.isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                    {state.isLoading ? 'Sequencing...' : 'Initiate Genesis'}
                                </button>
                                {getVerifiedFiles().length === 0 && (
                                    <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-red-900/10 border border-red-900/30 rounded text-red-500 text-[10px] font-mono uppercase">
                                        <AlertCircle className="w-3 h-3" />
                                        Error: No verified artifacts loaded
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="w-full max-w-5xl mx-auto p-8 pb-40 space-y-6">
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="relative bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg p-8 overflow-hidden shadow-2xl"
                                >
                                    <div className="absolute top-0 left-0 w-2 h-full" style={{background: state.autopoieticFramework.visual_signature.color_hex}}></div>
                                    <div className="absolute right-0 top-0 p-12 opacity-5 pointer-events-none">
                                        <Hexagon size={300} stroke={state.autopoieticFramework.visual_signature.color_hex} strokeWidth={0.5} />
                                    </div>

                                    <div className="flex flex-col md:flex-row justify-between items-start gap-8 relative z-10">
                                        <div>
                                            <div className="flex items-center gap-3 mb-4">
                                                <span className="bg-[#1f1f1f] text-[#9d4edd] px-2 py-1 text-[9px] font-mono uppercase rounded border border-[#333]">
                                                    System Framework
                                                </span>
                                                <span className="text-xs font-mono text-gray-500 uppercase">
                                                    // Origin: {state.autopoieticFramework.framework_identity.philosophical_origin}
                                                </span>
                                            </div>
                                            <h1 className="text-5xl md:text-6xl font-black font-mono text-white mb-4 uppercase tracking-tighter leading-none">
                                                {state.autopoieticFramework.framework_identity.name}
                                            </h1>
                                            <div className="text-2xl font-mono text-gray-500 uppercase tracking-widest">
                                                {state.autopoieticFramework.framework_identity.acronym}
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-col items-end">
                                            <div className="text-[10px] text-gray-500 font-mono uppercase mb-2">Visual Signature</div>
                                            <div className="flex items-center gap-4 bg-[#111] p-3 rounded border border-[#222]">
                                                <div className="text-right">
                                                    <div className="text-xs font-bold text-gray-300">{state.autopoieticFramework.visual_signature.icon_metaphor}</div>
                                                    <div className="text-[9px] font-mono text-gray-500">{state.autopoieticFramework.visual_signature.color_hex}</div>
                                                </div>
                                                <div className="w-10 h-10 rounded shadow-lg" style={{ backgroundColor: state.autopoieticFramework.visual_signature.color_hex }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>

                                <GenesisSection title="Governance Mandate" icon={ShieldCheck} defaultOpen={true} delay={0.1}>
                                    <div className="relative">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-[#9d4edd]"></div>
                                        <p className="text-lg text-white font-mono leading-relaxed italic pl-6 py-2">
                                            "{state.autopoieticFramework.governance_mandate}"
                                        </p>
                                    </div>
                                </GenesisSection>

                                <GenesisSection title="Operational Logic Sequence" icon={Cpu} defaultOpen={true} delay={0.2}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {state.autopoieticFramework.operational_logic?.map((step, i) => (
                                            <LogicStepCard 
                                                key={i} 
                                                step={step} 
                                                index={i} 
                                                color={state.autopoieticFramework?.visual_signature.color_hex || '#9d4edd'} 
                                            />
                                        ))}
                                    </div>
                                </GenesisSection>

                                <GenesisSection title="Visual Signature Analysis" icon={ScanLine} defaultOpen={false} delay={0.3}>
                                    <div className="flex items-center gap-8">
                                        <div className="w-24 h-24 rounded-lg shadow-2xl flex items-center justify-center border border-[#333]" style={{ backgroundColor: state.autopoieticFramework.visual_signature.color_hex }}>
                                            <Hexagon size={40} className="text-black/50" strokeWidth={1} />
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <div className="text-[10px] text-gray-500 font-mono uppercase">Primary Hex Code</div>
                                                <div className="text-xl font-mono text-white flex items-center gap-2">
                                                    {state.autopoieticFramework.visual_signature.color_hex}
                                                    <div className="w-3 h-3 rounded-full border border-white/20" style={{backgroundColor: state.autopoieticFramework.visual_signature.color_hex}}></div>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-gray-500 font-mono uppercase">Iconographic Metaphor</div>
                                                <div className="text-sm text-gray-300 font-mono border-l-2 border-[#333] pl-3">
                                                    "{state.autopoieticFramework.visual_signature.icon_metaphor}"
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </GenesisSection>
                            </div>
                        )}
                    </div>
                )}
                
                {showTelemetry && <div className="absolute bottom-0 left-0 right-0 h-48 z-40"><ContextVelocityChart onDrillDown={()=>{}} /></div>}
            </div>

            {/* Chat Sidebar Overlay */}
            <AnimatePresence>
                {isChatOpen && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 320, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="border-l border-[#1f1f1f] bg-[#080808] flex flex-col z-20 shadow-2xl"
                    >
                        {/* ... (Keep existing chat logic) ... */}
                        <div className="h-10 border-b border-[#1f1f1f] bg-[#0a0a0a] flex items-center justify-between px-3">
                            <span className="text-[10px] font-bold text-[#9d4edd] uppercase tracking-wider flex items-center gap-2">
                                <MessageSquare className="w-3 h-3" />
                                Tactical Oracle
                            </span>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setState({ chatHistory: [] })} 
                                    className="text-gray-500 hover:text-red-500 transition-colors"
                                    title="Clear History"
                                >
                                    <Trash2 className="w-3 h-3"/>
                                </button>
                                <button onClick={() => setIsChatOpen(false)} className="text-gray-500 hover:text-white"><X className="w-3 h-3"/></button>
                            </div>
                        </div>
                        
                        <div className="px-3 py-2 border-b border-[#1f1f1f] bg-[#050505] flex items-center gap-2 overflow-x-auto custom-scrollbar">
                            {state.artifacts.length > 0 && (
                                <span className="text-[9px] font-mono text-blue-400 bg-blue-900/20 border border-blue-900/40 px-1.5 py-0.5 rounded whitespace-nowrap">
                                    {getVerifiedFiles().length} SOURCES
                                </span>
                            )}
                            {state.autopoieticFramework && (
                                <span className="text-[9px] font-mono text-[#9d4edd] bg-[#9d4edd]/10 border border-[#9d4edd]/30 px-1.5 py-0.5 rounded whitespace-nowrap">
                                    FRAMEWORK
                                </span>
                            )}
                            {selectedNode && (
                                <span className="text-[9px] font-mono text-white bg-[#9d4edd] border border-[#9d4edd] px-1.5 py-0.5 rounded whitespace-nowrap flex items-center gap-1 animate-pulse">
                                    <MousePointer2 size={10} />
                                    {(selectedNode.data.label as string).substring(0, 10)}
                                </span>
                            )}
                        </div>

                        {/* Context Header if Node Selected */}
                        {contextData && (
                            <div className="mx-3 mt-3 p-3 bg-[#1a1a1a] border-l-2 border-[#9d4edd] rounded-r text-[10px] font-mono">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-[#9d4edd] uppercase flex items-center gap-2">
                                        <MousePointer2 size={12} />
                                        {contextData.label} 
                                    </span>
                                    <span className="text-gray-600">{contextData.id}</span>
                                </div>
                                <div className="space-y-1 text-gray-400">
                                    <div className="flex justify-between">
                                        <span>Type:</span>
                                        <span className="text-white">{contextData.type}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Status:</span>
                                        <span className={contextData.status === 'ONLINE' || contextData.status === 'Active' ? 'text-[#42be65]' : 'text-gray-500'}>
                                            {contextData.status || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="pt-2 border-t border-[#333] mt-2">
                                        <span className="block mb-1 opacity-50">Connections:</span>
                                        <div className="max-h-20 overflow-y-auto custom-scrollbar space-y-1">
                                            {contextData.connections.length > 0 ? (
                                                contextData.connections.map((c, i) => (
                                                    <div key={i} className="truncate text-gray-500 hover:text-gray-300" title={c}>
                                                        - {c}
                                                    </div>
                                                ))
                                            ) : (
                                                <span className="italic opacity-50">Isolated Node</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                             {state.chatHistory.length === 0 && (
                                 <div className="text-center text-gray-600 mt-10">
                                     <BrainCircuit className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                     <p className="text-[10px] font-mono uppercase">Uplink Established</p>
                                     <p className="text-[9px] font-mono">Query the system about artifacts, framework logic, or diagram structure.</p>
                                 </div>
                             )}
                             {state.chatHistory.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[90%] p-3 text-[11px] font-mono leading-relaxed border rounded ${msg.role === 'user' ? 'bg-[#9d4edd]/10 border-[#9d4edd]/30 text-gray-200' : 'bg-[#111] border-[#333] text-gray-400'}`}>
                                        <MarkdownRenderer content={msg.text} />
                                    </div>
                                </div>
                            ))}
                            {isChatProcessing && (
                                <div className="flex justify-start">
                                    <div className="bg-[#111] border border-[#333] px-3 py-2 rounded flex items-center gap-2">
                                        <Loader2 className="w-3 h-3 text-[#9d4edd] animate-spin" />
                                        <span className="text-[9px] font-mono text-gray-500">ANALYZING CONTEXT...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        <div className="p-3 border-t border-[#1f1f1f] bg-[#0a0a0a]">
                            
                            {/* DEEP RESEARCH TOGGLE */}
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">Mode</span>
                                <button 
                                    onClick={() => setIsDeepResearch(!isDeepResearch)}
                                    className={`flex items-center gap-2 px-2 py-1 rounded text-[9px] font-mono uppercase transition-colors border ${isDeepResearch ? 'bg-[#9d4edd]/20 border-[#9d4edd] text-[#9d4edd]' : 'bg-[#1f1f1f] border-[#333] text-gray-500 hover:text-white'}`}
                                >
                                    {isDeepResearch ? <BrainCircuit className="w-3 h-3 animate-pulse" /> : <Zap className="w-3 h-3" />}
                                    {isDeepResearch ? 'Deep Research' : 'Fast Response'}
                                </button>
                            </div>

                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={chatInput} 
                                    onChange={e=>setChatInput(e.target.value)} 
                                    onKeyDown={e=>e.key==='Enter'&&handleSendChat()} 
                                    placeholder={isDeepResearch ? "Enter Research Goal..." : selectedNode ? `Query ${selectedNode.data.label}...` : "Query..."}
                                    disabled={isChatProcessing}
                                    className="flex-1 bg-[#111] border border-[#333] px-3 py-2 text-[11px] font-mono text-white focus:border-[#9d4edd] outline-none rounded-sm" 
                                />
                                <button 
                                    onClick={handleSendChat} 
                                    disabled={isChatProcessing}
                                    className={`px-3 text-black hover:bg-[#b06bf7] rounded-sm disabled:opacity-50 transition-colors ${isDeepResearch ? 'bg-[#9d4edd] shadow-[0_0_10px_#9d4edd]' : 'bg-[#9d4edd]'}`}
                                >
                                    {isChatProcessing ? <Loader2 className="w-3 h-3 animate-spin"/> : <Send className="w-3 h-3"/>}
                                </button>
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

export default ProcessVisualizer;
