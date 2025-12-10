
import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { fileToGenerativePart, analyzeBookDNA, promptSelectKey, chatWithFiles } from '../services/geminiService';
import { BookOpen, Upload, Cpu, Zap, Activity, MessageSquare, Send, Loader2, GitBranch, Database, Layout, Library, Save, Trash2, Clock, Archive, Network, BoxSelect, X, Move } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookDNA, ProposedModule, Axiom } from '../types';

const MotionDiv = motion.div as any;

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

// --- Synapse Graph Component (Canvas Based) ---
const SynapseGraph: React.FC<{ dna: BookDNA }> = ({ dna }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedNode, setSelectedNode] = useState<any>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Node Definition
        interface GraphNode { id: string; x: number; y: number; type: 'CORE' | 'AXIOM' | 'MODULE'; label: string; data: any; vx: number; vy: number; radius: number }
        
        let nodes: GraphNode[] = [];
        let links: { source: string; target: string }[] = [];

        // 1. Build Graph Data
        const cx = container.offsetWidth / 2;
        const cy = container.offsetHeight / 2;

        // Core Node
        nodes.push({ 
            id: 'CORE', 
            x: cx, 
            y: cy, 
            type: 'CORE', 
            label: dna.title.substring(0, 15), 
            data: { desc: dna.author, full: dna.title },
            vx: 0, vy: 0,
            radius: 15
        });

        // Axiom Nodes
        if (dna.axioms) {
            dna.axioms.forEach((ax, i) => {
                const angle = (i / dna.axioms.length) * Math.PI * 2;
                nodes.push({ 
                    id: `AX_${i}`, 
                    x: cx + Math.cos(angle) * 120, 
                    y: cy + Math.sin(angle) * 120, 
                    type: 'AXIOM', 
                    label: ax.concept, 
                    data: ax,
                    vx: 0, vy: 0,
                    radius: 8 
                });
                links.push({ source: 'CORE', target: `AX_${i}` });
            });
        }

        // Module Nodes
        if (dna.modules) {
            dna.modules.forEach((mod, i) => {
                 const angle = (i / dna.modules.length) * Math.PI * 2 + 0.5;
                 nodes.push({
                     id: `MOD_${i}`,
                     x: cx + Math.cos(angle) * 220,
                     y: cy + Math.sin(angle) * 220,
                     type: 'MODULE',
                     label: mod.title,
                     data: mod,
                     vx: 0, vy: 0,
                     radius: 10
                 });
                 // Connect to Core
                 links.push({ source: 'CORE', target: `MOD_${i}` });
                 // Connect to a random axiom for complexity
                 if (dna.axioms && dna.axioms.length > 0) {
                     const randomAxiom = Math.floor(Math.random() * dna.axioms.length);
                     links.push({ source: `AX_${randomAxiom}`, target: `MOD_${i}` });
                 }
            });
        }

        let animationId: number;
        let isDragging = false;
        let draggedNode: GraphNode | null = null;
        let hoverNode: GraphNode | null = null;
        let pulsePhase = 0;

        // Force Directed Logic
        const updatePhysics = () => {
            const repulsion = 800;
            const springLength = 120;
            const springStrength = 0.08;

            // Repulsion
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const n1 = nodes[i];
                    const n2 = nodes[j];
                    const dx = n1.x - n2.x;
                    const dy = n1.y - n2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    const force = repulsion / (dist * dist);
                    const fx = (dx / dist) * force;
                    const fy = (dy / dist) * force;

                    if (n1.type !== 'CORE' || !draggedNode) { n1.vx += fx; n1.vy += fy; }
                    if (n2.type !== 'CORE' || !draggedNode) { n2.vx -= fx; n2.vy -= fy; }
                }
            }

            // Springs
            links.forEach(link => {
                const s = nodes.find(n => n.id === link.source);
                const t = nodes.find(n => n.id === link.target);
                if (!s || !t) return;

                const dx = t.x - s.x;
                const dy = t.y - s.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const force = (dist - springLength) * springStrength;
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;

                if (s.type !== 'CORE' || !draggedNode) { s.vx += fx; s.vy += fy; }
                if (t.type !== 'CORE' || !draggedNode) { t.vx -= fx; t.vy -= fy; }
            });

            // Center Gravity & Damping
            nodes.forEach(n => {
                const dx = cx - n.x;
                const dy = cy - n.y;
                n.vx += dx * 0.008;
                n.vy += dy * 0.008;
                
                n.vx *= 0.85; // Heavier damping
                n.vy *= 0.85;

                if (n !== draggedNode) {
                    n.x += n.vx;
                    n.y += n.vy;
                }
            });
        };

        const render = () => {
            if (!ctx) return;
            pulsePhase += 0.05;
            canvas.width = container.offsetWidth;
            canvas.height = container.offsetHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw Links
            links.forEach(link => {
                const s = nodes.find(n => n.id === link.source);
                const t = nodes.find(n => n.id === link.target);
                if (s && t) {
                    const isConnectedToHover = hoverNode && (s.id === hoverNode.id || t.id === hoverNode.id);
                    const isConnectedToSelect = selectedNode && (s.id === selectedNode.id || t.id === selectedNode.id);

                    ctx.beginPath();
                    ctx.moveTo(s.x, s.y);
                    ctx.lineTo(t.x, t.y);
                    
                    if (isConnectedToSelect) {
                         ctx.strokeStyle = '#9d4edd';
                         ctx.lineWidth = 1.5;
                         ctx.globalAlpha = 0.8;
                    } else if (isConnectedToHover) {
                         ctx.strokeStyle = '#fff';
                         ctx.lineWidth = 1;
                         ctx.globalAlpha = 0.5;
                    } else {
                         ctx.strokeStyle = '#9d4edd';
                         ctx.lineWidth = 0.5;
                         ctx.globalAlpha = 0.15;
                    }
                    ctx.stroke();
                    ctx.globalAlpha = 1;

                    // Pulse packet
                    if (isConnectedToSelect) {
                        const time = Date.now() / 1000;
                        const dist = Math.sqrt((t.x - s.x)**2 + (t.y - s.y)**2);
                        const packetPos = (time * 100) % dist;
                        const ratio = packetPos / dist;
                        const px = s.x + (t.x - s.x) * ratio;
                        const py = s.y + (t.y - s.y) * ratio;
                        
                        ctx.beginPath();
                        ctx.arc(px, py, 2, 0, Math.PI*2);
                        ctx.fillStyle = '#fff';
                        ctx.fill();
                    }
                }
            });

            // Draw Nodes
            nodes.forEach(n => {
                ctx.beginPath();
                const isSelected = selectedNode && n.id === selectedNode.id;
                const isHover = hoverNode && n.id === hoverNode.id;
                
                // Base Size
                let r = n.radius;
                if (isSelected) r += 2;
                if (isHover) r += 1;

                // Color Logic
                let fill = '#333';
                let stroke = '#555';
                
                if (n.type === 'CORE') { fill = '#fff'; stroke = '#fff'; }
                else if (n.type === 'AXIOM') { fill = '#9d4edd'; stroke = '#9d4edd'; }
                else { fill = '#22d3ee'; stroke = '#22d3ee'; } // Module

                if (isSelected) {
                     // Pulse effect ring
                     ctx.save();
                     ctx.beginPath();
                     ctx.arc(n.x, n.y, r + Math.sin(pulsePhase)*4 + 4, 0, Math.PI*2);
                     ctx.strokeStyle = stroke;
                     ctx.globalAlpha = 0.3;
                     ctx.stroke();
                     ctx.restore();
                }

                ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
                ctx.fillStyle = fill;
                ctx.fill();

                // Glow
                if (isSelected || isHover) {
                    ctx.shadowColor = stroke;
                    ctx.shadowBlur = 15;
                }
                
                ctx.strokeStyle = stroke;
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Labels
                if (n.type === 'CORE' || isSelected || isHover) {
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 10px Fira Code';
                    const textWidth = ctx.measureText(n.label).width;
                    ctx.fillStyle = 'rgba(0,0,0,0.7)';
                    ctx.fillRect(n.x + 12, n.y - 8, textWidth + 8, 14);
                    
                    ctx.fillStyle = '#fff';
                    ctx.fillText(n.label, n.x + 16, n.y + 2);
                }
            });

            updatePhysics();
            animationId = requestAnimationFrame(render);
        };

        // Mouse Handling
        const handleMouseDown = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            
            const hit = nodes.find(n => Math.sqrt((n.x - mx)**2 + (n.y - my)**2) < n.radius + 5);
            if (hit) {
                isDragging = true;
                draggedNode = hit;
                setSelectedNode(hit);
            } else {
                setSelectedNode(null);
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;

            if (isDragging && draggedNode) {
                draggedNode.x = mx;
                draggedNode.y = my;
            }

            const hit = nodes.find(n => Math.sqrt((n.x - mx)**2 + (n.y - my)**2) < n.radius + 5);
            hoverNode = hit || null;
            canvas.style.cursor = hit ? 'pointer' : 'default';
        };

        const handleMouseUp = () => {
            isDragging = false;
            draggedNode = null;
        };

        canvas.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        render();

        return () => {
            cancelAnimationFrame(animationId);
            canvas.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dna]);

    return (
        <div ref={containerRef} className="w-full h-full relative bg-[#050505] overflow-hidden">
            <div className="absolute top-4 left-4 z-10 pointer-events-none">
                <div className="flex items-center gap-2 text-[#9d4edd] mb-1">
                    <Activity className="w-4 h-4 animate-pulse" />
                    <span className="text-xs font-mono font-bold uppercase tracking-widest">Synapse Graph</span>
                </div>
                <p className="text-[10px] text-gray-500 font-mono">Force-Directed Knowledge Topology</p>
                <p className="text-[9px] text-gray-600 font-mono mt-1">Interact: Drag Nodes | Select for Data</p>
            </div>
            
            <canvas ref={canvasRef} className="absolute inset-0 cursor-move" />
            
            <AnimatePresence>
                {selectedNode && (
                    <MotionDiv
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="absolute top-4 right-4 w-64 bg-[#0a0a0a]/90 backdrop-blur border border-[#333] rounded-lg p-4 shadow-2xl z-20"
                    >
                        <div className="flex justify-between items-start mb-2 border-b border-[#333] pb-2">
                             <div>
                                 <div className="text-[9px] text-gray-500 font-mono uppercase tracking-wider">{selectedNode.type} NODE</div>
                                 <h3 className="text-sm font-bold text-white font-mono leading-tight">{selectedNode.label}</h3>
                             </div>
                             <button onClick={() => setSelectedNode(null)} className="text-gray-500 hover:text-white"><X className="w-3 h-3"/></button>
                        </div>
                        
                        <div className="text-[10px] text-gray-300 font-mono space-y-2">
                             {selectedNode.type === 'CORE' && (
                                 <>
                                     <div><span className="text-gray-500">Author:</span> {selectedNode.data.desc}</div>
                                     <div><span className="text-gray-500">Full Title:</span> {selectedNode.data.full}</div>
                                 </>
                             )}
                             {selectedNode.type === 'AXIOM' && (
                                 <>
                                     <div className="bg-[#111] p-2 rounded text-gray-400 border-l-2 border-[#9d4edd]">
                                         {selectedNode.data.codeSnippet}
                                     </div>
                                 </>
                             )}
                             {selectedNode.type === 'MODULE' && (
                                 <>
                                     <div>{selectedNode.data.description}</div>
                                     <div className="pt-2 mt-2 border-t border-[#222] text-[9px] text-gray-500">
                                         Reasoning: {selectedNode.data.reasoning}
                                     </div>
                                 </>
                             )}
                        </div>
                    </MotionDiv>
                )}
            </AnimatePresence>
        </div>
    );
};


const BibliomorphicEngine: React.FC = () => {
  const { bibliomorphic, setBibliomorphicState } = useAppStore();
  const [chatInput, setChatInput] = useState('');
  const [isChatProcessing, setIsChatProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // New State for Library Management
  const [activeTab, setActiveTab] = useState<'chat' | 'library'>('chat');
  
  // View Toggle: Text vs Graph
  const [viewMode, setViewMode] = useState<'corpus' | 'synapse'>('corpus');

  // Load Library from LocalStorage on Mount
  useEffect(() => {
    const savedLib = localStorage.getItem('structura_library');
    if (savedLib) {
        try {
            setBibliomorphicState({ library: JSON.parse(savedLib) });
        } catch(e) {
            console.error("Failed to load library", e);
        }
    }
    
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);
  
  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [bibliomorphic.chatHistory]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setBibliomorphicState({ isLoading: true, error: null });
      
      try {
        const hasKey = await window.aistudio?.hasSelectedApiKey();
        if (!hasKey) {
            await promptSelectKey();
            setBibliomorphicState({ isLoading: false });
            return;
        }

        const fileData = await fileToGenerativePart(file);
        setBibliomorphicState({ activeBook: fileData });

        const analysis = await analyzeBookDNA(fileData);
        setBibliomorphicState({ 
            dna: analysis,
            isLoading: false,
            // Add a welcome message from the kernel
            chatHistory: [{
                role: 'model',
                text: `**Kernel initialized** for "${analysis.title}".\nDirect access to the text's memory banks established. Waiting for query.`,
                timestamp: Date.now()
            }]
        });
      } catch (err: any) {
        setBibliomorphicState({ error: err.message || "Ingestion Failed", isLoading: false });
      }
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim() || isChatProcessing || !bibliomorphic.activeBook) return;

    const userMsg = { role: 'user' as const, text: chatInput, timestamp: Date.now() };
    setBibliomorphicState({ chatHistory: [...bibliomorphic.chatHistory, userMsg] });
    setChatInput('');
    setIsChatProcessing(true);

    try {
        const historyForApi = bibliomorphic.chatHistory.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }]
        }));
        
        // System prompt context from the DNA
        const dnaContext = bibliomorphic.dna ? `
            CONTEXTUAL MEMORY [${bibliomorphic.dna.title}]:
            Author: ${bibliomorphic.dna.author}
            Kernel Prime Directive: ${bibliomorphic.dna.kernelIdentity?.primeDirective}
            Tone: ${bibliomorphic.dna.toneAnalysis}
        ` : '';

        const response = await chatWithFiles(
            chatInput, 
            historyForApi, 
            [bibliomorphic.activeBook],
            dnaContext + "\nYou are the Living Book. Answer based strictly on the text content, maintaining the persona defined in the Kernel Identity. Use markdown for emphasis."
        );

        setBibliomorphicState(prev => ({ 
            chatHistory: [...prev.chatHistory, { role: 'model', text: response, timestamp: Date.now() }] 
        }));
    } catch (err: any) {
        setBibliomorphicState({ error: "Comms Link Broken" });
    } finally {
        setIsChatProcessing(false);
    }
  };
  
  // Library Actions
  const saveToLibrary = () => {
      if (!bibliomorphic.dna) return;
      const newBook: BookDNA = {
          ...bibliomorphic.dna,
          id: crypto.randomUUID(),
          timestamp: Date.now()
      };
      const newLibrary = [newBook, ...bibliomorphic.library];
      setBibliomorphicState({ library: newLibrary });
      localStorage.setItem('structura_library', JSON.stringify(newLibrary));
      alert(`Archived "${newBook.title}" to library.`);
  };

  const loadFromLibrary = (book: BookDNA) => {
      setBibliomorphicState({ 
          dna: book,
          activeBook: null, // Clear active file as we don't persist it
          chatHistory: [{ 
              role: 'model', 
              text: `**Archive Loaded**: "${book.title}". \n\nLive neural link unavailable (source artifact missing). Viewing cached DNA analysis only.`,
              timestamp: Date.now() 
          }]
      });
      setActiveTab('chat');
  };

  const deleteFromLibrary = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const newLibrary = bibliomorphic.library.filter(b => b.id !== id);
      setBibliomorphicState({ library: newLibrary });
      localStorage.setItem('structura_library', JSON.stringify(newLibrary));
  };

  return (
    <div className="h-full w-full bg-[#030303] flex flex-col relative overflow-hidden border border-[#1f1f1f] rounded shadow-2xl">
      {/* Background Matrix */}
      <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,0)_0%,rgba(157,78,221,0.05)_50%,rgba(0,0,0,0)_100%)] bg-[size:100%_4px] pointer-events-none"></div>

      {/* Header */}
      <div className="h-16 border-b border-[#1f1f1f] flex items-center justify-between px-6 bg-[#0a0a0a]/90 backdrop-blur z-20">
         <div className="flex items-center gap-3">
            <div className="p-1.5 bg-[#9d4edd]/10 border border-[#9d4edd] rounded">
                <BookOpen className="w-4 h-4 text-[#9d4edd]" />
            </div>
            <h1 className="text-sm font-bold font-mono uppercase tracking-widest text-white">Bibliomorphic Engine</h1>
         </div>
         {bibliomorphic.dna && (
             <div className="flex items-center gap-6">
                 <div className="flex items-center gap-4 text-[10px] font-mono text-gray-500">
                     <span className="text-white font-bold">{bibliomorphic.dna.title}</span>
                     <span className="text-[#9d4edd]">///</span>
                     <span>{bibliomorphic.dna.author}</span>
                 </div>
                 {/* Save Button */}
                 <button 
                    onClick={saveToLibrary}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#1f1f1f] hover:bg-[#9d4edd] hover:text-black border border-[#333] rounded text-[10px] font-mono uppercase tracking-wider transition-all"
                 >
                     <Save className="w-3 h-3" />
                     Save DNA
                 </button>
             </div>
         )}
      </div>

      <div className="flex-1 flex overflow-hidden">
          
          {/* Left Column: Input & Chat & Library */}
          <div className="w-1/3 border-r border-[#1f1f1f] flex flex-col bg-[#050505] z-10 min-w-[300px]">
              
              {/* Tab Switcher */}
              <div className="flex border-b border-[#1f1f1f]">
                  <button 
                    onClick={() => setActiveTab('chat')}
                    className={`flex-1 py-3 text-[10px] font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'chat' ? 'bg-[#111] text-[#9d4edd] border-b-2 border-[#9d4edd]' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                      <MessageSquare className="w-3 h-3" />
                      Neural Link
                  </button>
                  <button 
                    onClick={() => setActiveTab('library')}
                    className={`flex-1 py-3 text-[10px] font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'library' ? 'bg-[#111] text-[#9d4edd] border-b-2 border-[#9d4edd]' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                      <Library className="w-3 h-3" />
                      Archives
                  </button>
              </div>

              {/* View: Chat / Upload */}
              {activeTab === 'chat' && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                      {/* Upload Zone (Only if no active book) */}
                      {!bibliomorphic.dna && !bibliomorphic.activeBook && (
                          <div className="p-6 flex-shrink-0 border-b border-[#1f1f1f]">
                               <div className="border border-dashed border-[#333] rounded-lg p-8 flex flex-col items-center justify-center relative group hover:border-[#9d4edd] transition-colors">
                                    <Upload className="w-8 h-8 text-gray-600 mb-4 group-hover:text-[#9d4edd]" />
                                    <p className="text-xs font-mono uppercase text-gray-500 mb-2">Ingest Text Artifact</p>
                                    <input 
                                        type="file" 
                                        onChange={handleFileUpload} 
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        accept=".txt,.pdf,.md"
                                    />
                               </div>
                               {bibliomorphic.isLoading && (
                                   <div className="mt-4 flex items-center justify-center text-[#9d4edd] text-xs font-mono">
                                       <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                       Sequencing DNA...
                                   </div>
                               )}
                          </div>
                      )}

                      {/* Chat Interface */}
                      <div className="flex-1 flex flex-col overflow-hidden">
                          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4" ref={scrollRef}>
                              {bibliomorphic.chatHistory.length === 0 && !bibliomorphic.isLoading && (
                                  <div className="text-center text-gray-600 mt-10">
                                      <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                      <p className="text-[10px] font-mono uppercase">Awaiting Neural Input</p>
                                  </div>
                              )}
                              {bibliomorphic.chatHistory.map((msg, i) => (
                                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                      <div className={`max-w-[85%] p-3 rounded text-xs font-mono leading-relaxed border
                                        ${msg.role === 'user' 
                                            ? 'bg-[#9d4edd]/10 border-[#9d4edd]/30 text-gray-200' 
                                            : 'bg-[#111] border-[#333] text-gray-400'}`}>
                                          <MarkdownRenderer content={msg.text} />
                                      </div>
                                  </div>
                              ))}
                          </div>
                          <div className="p-3 border-t border-[#1f1f1f] bg-[#0a0a0a]">
                              <div className="flex items-center gap-2">
                                  <input 
                                    type="text" 
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                                    disabled={!bibliomorphic.activeBook || isChatProcessing}
                                    placeholder={!bibliomorphic.activeBook ? "Live chat unavailable (Archived)" : "Query the living text..."}
                                    className="flex-1 bg-[#111] border border-[#333] px-3 py-2 text-xs font-mono text-white focus:border-[#9d4edd] outline-none disabled:opacity-50"
                                  />
                                  <button 
                                    onClick={handleChat}
                                    disabled={!bibliomorphic.activeBook || isChatProcessing}
                                    className="p-2 bg-[#9d4edd] text-black hover:bg-[#b06bf7] disabled:opacity-50"
                                  >
                                      {isChatProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                  </button>
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {/* View: Library */}
              {activeTab === 'library' && (
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                      {bibliomorphic.library.length === 0 ? (
                          <div className="text-center text-gray-600 mt-10">
                              <Archive className="w-8 h-8 mx-auto mb-2 opacity-30" />
                              <p className="text-[10px] font-mono uppercase">Archives Empty</p>
                          </div>
                      ) : (
                          bibliomorphic.library.map((book, i) => (
                              <div 
                                key={book.id || i}
                                onClick={() => loadFromLibrary(book)}
                                className="bg-[#111] border border-[#222] p-4 rounded cursor-pointer hover:border-[#9d4edd] hover:bg-[#151515] transition-all group relative"
                              >
                                  <div className="flex justify-between items-start mb-1">
                                      <h3 className="text-xs font-bold text-gray-200 font-mono group-hover:text-white">{book.title}</h3>
                                      <button 
                                        onClick={(e) => deleteFromLibrary(book.id || '', e)}
                                        className="text-gray-600 hover:text-red-500 transition-colors p-1"
                                      >
                                          <Trash2 className="w-3 h-3" />
                                      </button>
                                  </div>
                                  <div className="text-[10px] text-gray-500 font-mono mb-2">{book.author}</div>
                                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#222]">
                                      <span className="text-[9px] text-gray-600 font-mono flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          {book.timestamp ? new Date(book.timestamp).toLocaleDateString() : 'Unknown'}
                                      </span>
                                      <span className="text-[9px] text-[#9d4edd] font-mono bg-[#9d4edd]/10 px-1.5 py-0.5 rounded">
                                          DNA SEQ
                                      </span>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              )}
          </div>

          {/* Right Column: DNA Viz */}
          <div className="flex-1 relative flex flex-col">
               {/* View Toggle */}
               {bibliomorphic.dna && (
                   <div className="absolute top-4 right-4 z-20 flex bg-[#111] border border-[#333] rounded p-1 shadow-lg">
                       <button 
                           onClick={() => setViewMode('corpus')}
                           className={`p-1.5 rounded transition-colors ${viewMode === 'corpus' ? 'bg-[#9d4edd] text-black' : 'text-gray-500 hover:text-white'}`}
                           title="Corpus View"
                       >
                           <BoxSelect className="w-4 h-4" />
                       </button>
                       <button 
                           onClick={() => setViewMode('synapse')}
                           className={`p-1.5 rounded transition-colors ${viewMode === 'synapse' ? 'bg-[#9d4edd] text-black' : 'text-gray-500 hover:text-white'}`}
                           title="Synapse Graph"
                       >
                           <Network className="w-4 h-4" />
                       </button>
                   </div>
               )}

              {!bibliomorphic.dna ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-700 opacity-50">
                      <Activity className="w-16 h-16 mb-6" />
                      <p className="font-mono text-sm uppercase tracking-widest">Awaiting Neural Sequence</p>
                  </div>
              ) : (
                  viewMode === 'synapse' ? (
                      <SynapseGraph dna={bibliomorphic.dna} />
                  ) : (
                      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                          <AnimatePresence>
                              <MotionDiv 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="space-y-12 max-w-4xl mx-auto"
                              >
                                  {/* 1. Kernel Identity */}
                                  <section>
                                      <div className="flex items-center gap-2 mb-4 border-b border-[#333] pb-2">
                                          <Cpu className="w-4 h-4 text-[#9d4edd]" />
                                          <h2 className="text-xs font-bold font-mono uppercase tracking-widest text-gray-300">Kernel Identity</h2>
                                      </div>
                                      <div className="grid grid-cols-2 gap-6">
                                          <div className="bg-[#0a0a0a] border border-[#333] p-5 rounded">
                                              <div className="text-[10px] text-gray-500 uppercase mb-2">Designation</div>
                                              <div className="text-lg text-white font-mono">{bibliomorphic.dna.kernelIdentity?.designation || 'UNKNOWN'}</div>
                                          </div>
                                          <div className="bg-[#0a0a0a] border border-[#333] p-5 rounded">
                                              <div className="text-[10px] text-gray-500 uppercase mb-2">Prime Directive</div>
                                              <div className="text-sm text-gray-300 italic">"{bibliomorphic.dna.kernelIdentity?.primeDirective || 'N/A'}"</div>
                                          </div>
                                      </div>
                                  </section>

                                  {/* 2. Axioms */}
                                  <section>
                                      <div className="flex items-center gap-2 mb-4 border-b border-[#333] pb-2">
                                          <Zap className="w-4 h-4 text-[#9d4edd]" />
                                          <h2 className="text-xs font-bold font-mono uppercase tracking-widest text-gray-300">Foundational Axioms</h2>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          {(bibliomorphic.dna.axioms || []).map((axiom, i) => (
                                              <div key={i} className="bg-[#0a0a0a] border border-[#333] p-4 hover:border-[#9d4edd] transition-colors group">
                                                  <div className="flex justify-between items-start mb-2">
                                                      <span className="text-xs font-bold text-[#9d4edd]">{axiom.concept}</span>
                                                      <span className="text-[10px] text-gray-600 font-mono">AXIOM_0{i+1}</span>
                                                  </div>
                                                  <div className="bg-[#111] p-2 rounded text-[10px] font-mono text-gray-400 border-l-2 border-[#9d4edd] opacity-80 group-hover:opacity-100">
                                                      {axiom.codeSnippet}
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  </section>

                                  {/* 3. Proposed Modules */}
                                  <section>
                                      <div className="flex items-center gap-2 mb-4 border-b border-[#333] pb-2">
                                          <Layout className="w-4 h-4 text-[#9d4edd]" />
                                          <h2 className="text-xs font-bold font-mono uppercase tracking-widest text-gray-300">Structural Modules</h2>
                                      </div>
                                      <div className="space-y-3">
                                          {(bibliomorphic.dna.modules || []).map((mod, i) => (
                                              <div key={i} className="flex items-start bg-[#0a0a0a] border border-[#333] p-4 rounded">
                                                  <div className={`p-2 rounded mr-4 bg-opacity-10 border
                                                      ${mod.type === 'UI' ? 'bg-blue-500 border-blue-500 text-blue-500' : 
                                                        mod.type === 'LOGIC' ? 'bg-green-500 border-green-500 text-green-500' : 
                                                        mod.type === 'DATABASE' ? 'bg-yellow-500 border-yellow-500 text-yellow-500' : 
                                                        'bg-purple-500 border-purple-500 text-purple-500'}`}>
                                                      {mod.type === 'UI' ? <Layout className="w-4 h-4" /> : 
                                                       mod.type === 'LOGIC' ? <Cpu className="w-4 h-4" /> :
                                                       mod.type === 'DATABASE' ? <Database className="w-4 h-4" /> : <GitBranch className="w-4 h-4" />}
                                                  </div>
                                                  <div>
                                                      <h3 className="text-sm font-bold text-gray-200 mb-1">{mod.title}</h3>
                                                      <p className="text-xs text-gray-500 mb-2">{mod.description}</p>
                                                      <p className="text-[10px] text-gray-600 font-mono border-t border-[#222] pt-2 mt-2">
                                                          // Reason: {mod.reasoning}
                                                      </p>
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  </section>

                                  {/* 4. System Prompt */}
                                  <section className="pb-12">
                                       <div className="flex items-center gap-2 mb-4 border-b border-[#333] pb-2">
                                          <MessageSquare className="w-4 h-4 text-[#9d4edd]" />
                                          <h2 className="text-xs font-bold font-mono uppercase tracking-widest text-gray-300">Compiled System Prompt</h2>
                                      </div>
                                      <div className="bg-[#050505] border border-[#333] p-4 rounded overflow-x-auto">
                                          <pre className="text-[10px] font-mono text-gray-400 whitespace-pre-wrap">
                                              {bibliomorphic.dna.systemPrompt}
                                          </pre>
                                      </div>
                                  </section>

                              </MotionDiv>
                          </AnimatePresence>
                      </div>
                  )
              )}
          </div>
      </div>
    </div>
  );
};

export default BibliomorphicEngine;
