
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAppStore } from '../store';
import { generateMermaidDiagram, chatWithFiles, generateAudioOverview, fileToGenerativePart, promptSelectKey, classifyArtifact, generateAutopoieticFramework } from '../services/geminiService';
import { FileData, ProcessState, Message, ArtifactNode, GovernanceSchema, IngestionStatus } from '../types';
import MermaidDiagram from './MermaidDiagram';
import ContextVelocityChart from './ContextVelocityChart';
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
    MarkerType, 
    Handle, 
    BaseEdge, 
    getSmoothStepPath, 
    EdgeProps,
    NodeProps
} from '@xyflow/react';
import { Upload, FileText, X, Cpu, GitGraph, BrainCircuit, Headphones, Terminal, Play, Pause, LayoutDashboard, Sparkles, AlertCircle, Send, ArrowRight, Copy, Check, Edit2, RotateCcw, Trash2, MessageSquare, Mic, ShieldCheck, ScanLine, Loader2, Code, FileJson, Activity, Search, Clock, Network, Tag, Database, Zap, Wrench, Atom, Scroll, Layers, Hexagon, ChevronDown, PanelRightOpen, PanelRightClose } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type TabView = 'diagram' | 'audio' | 'living_map' | 'genesis';

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

// --- CUSTOM COMPONENTS ---

// Simple Markdown Parser for Chat
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    // Basic parser for Bold (**text**) and Code Blocks (```code```)
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

// 1. Holographic Node (ReactFlow)
const HolographicNode = ({ data, selected }: NodeProps) => {
    const { label, icon: Icon, subtext, color, status, metrics } = data as any;
    const glowColor = color || THEME.accent.core;

    return (
        <div className={`relative group rounded-xl border transition-all duration-500 backdrop-blur-xl
            ${selected ? 'scale-105 shadow-[0_0_50px_rgba(0,0,0,0.8)] border-opacity-100' : 'shadow-2xl border-opacity-50'}
        `}
        style={{ 
            background: 'linear-gradient(145deg, rgba(15,15,15,0.9) 0%, rgba(5,5,5,0.95) 100%)',
            borderColor: selected ? glowColor : 'rgba(255,255,255,0.08)',
            minWidth: '200px'
        }}>
            {/* Inner Glow Gradient */}
            <div className="absolute inset-0 opacity-20 pointer-events-none transition-opacity duration-500 group-hover:opacity-40"
                 style={{ background: `radial-gradient(circle at center, ${glowColor}, transparent 70%)` }}></div>
            
            {/* Scanline Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.2)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none opacity-20"></div>

            {/* Hover Tooltip (Interactive) */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-4 w-64 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-300 z-50 origin-bottom scale-95 group-hover:scale-100">
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
                    <div className="absolute inset-0 blur-lg opacity-40 animate-pulse" style={{ background: glowColor }}></div>
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
    const variant = (data?.variant as 'stream' | 'pulse' | 'tunnel') || 'stream';

    return (
        <>
            {/* 1. Static Rail (Always present) */}
            <path
                d={edgePath}
                fill="none"
                stroke={isActive ? color : '#333'}
                strokeWidth={1}
                strokeOpacity={isActive ? 0.2 : 0.4}
            />

            {/* 2. Active State Effects */}
            {isActive && (
                <>
                    {/* Common Glow */}
                    <path 
                        d={edgePath}
                        fill="none"
                        stroke={color}
                        strokeWidth={variant === 'tunnel' ? 6 : 4}
                        strokeOpacity={0.1}
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
                            stroke={color}
                            strokeWidth={2}
                            strokeDasharray="10 50" // Short dash, longer gap
                            strokeLinecap="round"
                            markerEnd={markerEnd}
                            style={{
                                filter: `drop-shadow(0 0 4px ${color})`,
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
                            stroke={color}
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
                                stroke={color}
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
                                stroke={color}
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
  const { process: state, setProcessState: setState } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabView>('living_map');
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  const [chatInput, setChatInput] = useState('');
  const [isChatProcessing, setIsChatProcessing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Persistence for Drag-and-Drop
  const nodePositions = useRef<{ [key: string]: { x: number, y: number } }>({});

  const validateArtifact = async (nodeId: string, data: FileData) => {
      try {
        const analysis = await classifyArtifact(data);
        setState(prev => ({
            artifacts: prev.artifacts.map(a => a.id === nodeId ? { ...a, status: 'verified' as IngestionStatus, analysis: analysis } : a)
        }));
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
              subtext: isThinking ? 'REASONING ENGINE ACTIVE' : (isActing ? 'EXECUTING PROTOCOLS' : 'SYSTEM IDLE'),
              icon: BrainCircuit,
              color: isThinking ? THEME.accent.tools : (isActing ? THEME.accent.action : THEME.accent.core),
              status: isThinking ? 'THINKING' : 'ONLINE',
              metrics: 'V3.2 KERNEL'
          },
          style: { width: 240 }
      });

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

  }, [state.artifacts, isChatProcessing, state.isLoading, state.generatedCode, state.audioUrl, setNodes, setEdges]);

  // --- INTERACTION HANDLERS ---
  
  const onNodeMouseEnter = useCallback((event: any, node: Node) => {
      setHoveredNode(node.id);
  }, []);

  const onNodeMouseLeave = useCallback(() => {
      setHoveredNode(null);
  }, []);

  // Compute node opacity based on hover state (Focus Mode)
  const animatedNodes = useMemo(() => {
      return nodes.map(node => {
          const isDimmed = hoveredNode && node.id !== hoveredNode;
          // Simple logic: if a node is hovered, dim everything else. 
          // For a true graph walk, we'd check edges, but this is sufficient for visual pop.
          return {
              ...node,
              style: {
                  ...node.style,
                  opacity: isDimmed ? 0.2 : 1,
                  transition: 'opacity 0.3s ease-in-out'
              }
          };
      });
  }, [nodes, hoveredNode]);

  const animatedEdges = useMemo(() => {
      return edges.map(edge => {
          const isDimmed = hoveredNode && edge.source !== hoveredNode && edge.target !== hoveredNode;
          return {
              ...edge,
              style: {
                  ...edge.style,
                  opacity: isDimmed ? 0.1 : 1,
                  transition: 'opacity 0.3s ease-in-out'
              }
          };
      });
  }, [edges, hoveredNode]);

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

    setState({ isLoading: true, error: null });
    setActiveTab(type);
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

  const handleSendChat = async () => {
      if (!chatInput.trim() || isChatProcessing || !(await checkApiKey())) return;
      const userMsg: Message = { role: 'user', text: chatInput, timestamp: Date.now() };
      setState(prev => ({ chatHistory: [...prev.chatHistory, userMsg] }));
      setChatInput(''); setIsChatProcessing(true);
      
      // Construct Context from Current View
      let context = "You are the Tactical Oracle. You have access to the full system state.";
      
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
                <label className="flex items-center justify-between text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-3">
                    <span>Source Material</span>
                    <span className="text-[#9d4edd]">{getVerifiedFiles().length} Active</span>
                </label>
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
                onClick={() => handleGenerate(activeTab === 'living_map' ? 'diagram' : activeTab)} 
                disabled={state.isLoading}
                className="mx-4 mb-4 py-3 bg-[#9d4edd] text-black font-bold text-[10px] tracking-[0.2em] uppercase font-mono hover:bg-[#b06bf7] transition-all shadow-[0_0_20px_rgba(157,78,221,0.3)]"
            >
                {state.isLoading ? 'PROCESSING...' : 'RUN SEQUENCE'}
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
                {['living_map', 'diagram', 'audio', 'genesis'].map((tab) => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab as TabView)}
                        className={`flex items-center px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === tab ? 'border-[#9d4edd] text-[#9d4edd]' : 'border-transparent text-gray-600 hover:text-gray-400'}`}
                    >
                        {tab === 'living_map' && <Network className="w-3 h-3 mr-2" />}
                        {tab === 'diagram' && <GitGraph className="w-3 h-3 mr-2" />}
                        {tab === 'audio' && <Headphones className="w-3 h-3 mr-2" />}
                        {tab === 'genesis' && <Atom className="w-3 h-3 mr-2" />}
                        {tab.replace('_', ' ')}
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
                {activeTab === 'living_map' && (
                    <div className="h-full w-full bg-black relative">
                        <ReactFlow
                            nodes={animatedNodes}
                            edges={animatedEdges}
                            nodeTypes={nodeTypes}
                            edgeTypes={edgeTypes}
                            onNodeMouseEnter={onNodeMouseEnter}
                            onNodeMouseLeave={onNodeMouseLeave}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onNodeDragStop={onNodeDragStop}
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
                        
                        {/* Status Overlay */}
                        <div className="absolute top-4 left-4 bg-black/80 backdrop-blur border border-[#333] p-3 rounded-lg shadow-2xl pointer-events-none">
                            <div className="text-[10px] font-mono text-[#9d4edd] uppercase tracking-widest mb-1">System Topology</div>
                            <div className="text-[9px] font-mono text-gray-500">
                                Nodes: {nodes.length} | Edges: {edges.length} | Status: {state.isLoading ? 'SYNCING' : 'STABLE'}
                            </div>
                        </div>
                    </div>
                )}

                {/* Diagram View */}
                {activeTab === 'diagram' && (
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

                {/* Genesis View */}
                {activeTab === 'genesis' && (
                    <div className="h-full w-full min-h-full overflow-y-auto custom-scrollbar bg-[#050505] relative">
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
                                {/* Framework Display Components... (Reused from previous step) */}
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
                                        {state.autopoieticFramework.operational_logic.map((step, i) => (
                                            <div 
                                                key={i}
                                                className="bg-[#0f0f0f] p-5 border border-[#222] hover:border-[#9d4edd] transition-colors group relative overflow-hidden rounded"
                                            >
                                                <div className="absolute top-2 right-2 text-[10px] font-mono text-gray-700">0{i + 1}</div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: state.autopoieticFramework?.visual_signature.color_hex }}></span>
                                                    <span className="text-[10px] font-bold font-mono" style={{ color: state.autopoieticFramework?.visual_signature.color_hex }}>STEP {step.step}</span>
                                                </div>
                                                <h3 className="text-sm font-bold text-white uppercase mb-2">{step?.designation || 'STEP'}</h3>
                                                <p className="text-xs text-gray-400 font-mono leading-relaxed">
                                                    {step.execution_vector}
                                                </p>
                                            </div>
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
                        
                        {/* Context Indicators */}
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
                            {state.generatedCode && (
                                <span className="text-[9px] font-mono text-green-400 bg-green-900/20 border border-green-900/40 px-1.5 py-0.5 rounded whitespace-nowrap">
                                    DIAGRAM
                                </span>
                            )}
                        </div>

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
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={chatInput} 
                                    onChange={e=>setChatInput(e.target.value)} 
                                    onKeyDown={e=>e.key==='Enter'&&handleSendChat()} 
                                    placeholder="Query..."
                                    disabled={isChatProcessing}
                                    className="flex-1 bg-[#111] border border-[#333] px-3 py-2 text-[11px] font-mono text-white focus:border-[#9d4edd] outline-none rounded-sm" 
                                />
                                <button 
                                    onClick={handleSendChat} 
                                    disabled={isChatProcessing}
                                    className="px-3 bg-[#9d4edd] text-black hover:bg-[#b06bf7] rounded-sm disabled:opacity-50"
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
