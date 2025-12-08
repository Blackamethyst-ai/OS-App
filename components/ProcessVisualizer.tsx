
import React, { useState, useEffect, useRef } from 'react';
import { generateMermaidDiagram, chatWithFiles, generateAudioOverview, fileToGenerativePart, promptSelectKey } from '../services/geminiService';
import { FileData, ProcessState, Message, ArtifactNode, GovernanceSchema, IngestionStatus } from '../types';
import MermaidDiagram from './MermaidDiagram';
import { Upload, FileText, X, Cpu, GitGraph, BrainCircuit, Headphones, Terminal, Play, Pause, LayoutDashboard, Sparkles, AlertCircle, Send, ArrowRight, Copy, Check, Edit2, RotateCcw, Trash2, MessageSquare, Mic, ShieldCheck, ScanLine, Loader2, Code, FileJson } from 'lucide-react';

type TabView = 'diagram' | 'intel' | 'audio';

const ProcessVisualizer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabView>('diagram');
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [codeBuffer, setCodeBuffer] = useState('');
  const [showInspector, setShowInspector] = useState(false);
  
  // Chat State for "Intel" tab
  const [chatInput, setChatInput] = useState('');
  const [isChatProcessing, setIsChatProcessing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [state, setState] = useState<ProcessState>({
    prompt: '',
    governance: {
        targetSystem: '',
        constraintLevel: 'Standard',
        outputTopology: 'Hierarchical',
        additionalDirectives: ''
    },
    artifacts: [],
    isLoading: false,
    generatedCode: '',
    chatHistory: [],
    audioUrl: null,
    error: null,
  });

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (activeTab === 'intel') {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.chatHistory, activeTab]);

  const validateArtifact = async (nodeId: string) => {
      // Simulate strict governance scanning
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1000));
      
      setState(prev => ({
          ...prev,
          artifacts: prev.artifacts.map(a => {
              if (a.id === nodeId) {
                  // Mock validation rule: verify mimetype
                  if (a.file.type === 'application/pdf' || a.file.type.startsWith('image/')) {
                      return { ...a, status: 'verified' as IngestionStatus };
                  } else {
                      return { ...a, status: 'rejected' as IngestionStatus, error: 'ONTOLOGY_MISMATCH: Invalid MIME type' };
                  }
              }
              return a;
          })
      }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newArtifacts: ArtifactNode[] = [];
      
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        const nodeId = `art-${Date.now()}-${i}`;
        
        // Initial state: Scanning
        const artifact: ArtifactNode = {
            id: nodeId,
            file: file,
            status: 'scanning',
            data: null
        };
        newArtifacts.push(artifact);

        // Process actual data
        fileToGenerativePart(file).then(data => {
            setState(prev => ({
                ...prev,
                artifacts: prev.artifacts.map(a => a.id === nodeId ? { ...a, data: data } : a)
            }));
            // Trigger validation after data load (or parallel)
            validateArtifact(nodeId);
        }).catch(err => {
             setState(prev => ({
                ...prev,
                artifacts: prev.artifacts.map(a => a.id === nodeId ? { ...a, status: 'rejected', error: 'READ_FAIL' } : a)
            }));
        });
      }
      
      setState(prev => ({ ...prev, artifacts: [...prev.artifacts, ...newArtifacts] }));
    }
  };

  const removeArtifact = (id: string) => {
    setState(prev => ({
      ...prev,
      artifacts: prev.artifacts.filter(a => a.id !== id)
    }));
  };

  const handleClearAll = () => {
     if(window.confirm("Purge governance context?")) {
        setState({
            prompt: '',
            governance: {
                targetSystem: '',
                constraintLevel: 'Standard',
                outputTopology: 'Hierarchical',
                additionalDirectives: ''
            },
            artifacts: [],
            isLoading: false,
            generatedCode: '',
            chatHistory: [],
            audioUrl: null,
            error: null,
        });
        setIsEditingCode(false);
     }
  };

  const checkApiKey = async () => {
    const hasKey = await window.aistudio?.hasSelectedApiKey();
    if (!hasKey) {
      await promptSelectKey();
      return false;
    }
    return true;
  };

  const getVerifiedFiles = () => {
      return state.artifacts
          .filter(a => a.status === 'verified' && a.data)
          .map(a => a.data as FileData);
  };

  const handleGenerate = async (type: TabView) => {
    if (!(await checkApiKey())) return;
    
    const validFiles = getVerifiedFiles();

    if (type === 'intel') {
        setActiveTab('intel');
        if (state.chatHistory.length === 0) {
            setState(prev => ({
                ...prev,
                chatHistory: [{
                    role: 'model',
                    text: 'Tactical Oracle Online. Governance Uplink established. Ready to analyze verified artifacts.',
                    timestamp: Date.now()
                }]
            }));
        }
        return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    setActiveTab(type);
    setIsEditingCode(false);

    try {
      if (type === 'diagram') {
        const code = await generateMermaidDiagram(state.governance, validFiles);
        setState(prev => ({ ...prev, generatedCode: code }));
      } else if (type === 'audio') {
        const audioUrl = await generateAudioOverview(validFiles);
        setState(prev => ({ ...prev, audioUrl: audioUrl }));
      }
    } catch (err: any) {
       setState(prev => ({ ...prev, error: err.message || `Failed to generate ${type}.` }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleSendChat = async () => {
      if (!chatInput.trim() || isChatProcessing) return;
      
      if (!(await checkApiKey())) return;

      const userMsg: Message = { role: 'user', text: chatInput, timestamp: Date.now() };
      
      setState(prev => ({
          ...prev,
          chatHistory: [...prev.chatHistory, userMsg]
      }));
      setChatInput('');
      setIsChatProcessing(true);

      try {
          const historyForApi = state.chatHistory.map(msg => ({
              role: msg.role,
              parts: [{ text: msg.text }]
          }));
          const validFiles = getVerifiedFiles();
          
          const responseText = await chatWithFiles(userMsg.text, historyForApi, validFiles);
          
          const modelMsg: Message = { role: 'model', text: responseText, timestamp: Date.now() };
          setState(prev => ({
              ...prev,
              chatHistory: [...prev.chatHistory, modelMsg]
          }));

      } catch (err: any) {
          setState(prev => ({ ...prev, error: "Oracle Uplink Failed: " + err.message }));
      } finally {
          setIsChatProcessing(false);
      }
  };

  const handleUpdateDiagram = () => {
      setState(prev => ({...prev, generatedCode: codeBuffer}));
      setIsEditingCode(false);
  };

  const toggleEditMode = () => {
      if (!isEditingCode) {
          setCodeBuffer(state.generatedCode);
          setIsEditingCode(true);
      } else {
          setIsEditingCode(false);
      }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 h-[calc(100vh-6rem)] rounded border border-[#1f1f1f] bg-[#030303] shadow-2xl relative overflow-hidden">
      
      {/* Sidebar - Governance Control */}
      <div className="lg:col-span-3 bg-[#0a0a0a] border-r border-[#1f1f1f] flex flex-col relative z-20">
         {/* Sidebar Header */}
         <div className="h-14 border-b border-[#1f1f1f] flex items-center justify-between px-4 bg-[#0a0a0a]">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center font-mono">
               <ShieldCheck className="w-3.5 h-3.5 mr-2 text-[#9d4edd]" />
               Governance Control
            </h2>
            {state.artifacts.length > 0 && (
                <button 
                  onClick={handleClearAll}
                  className="text-[10px] text-red-900 hover:text-red-500 flex items-center transition-colors"
                >
                    <Trash2 className="w-3 h-3 mr-1" />
                </button>
            )}
         </div>

         <div className="flex-1 flex flex-col p-4 overflow-hidden space-y-6">
            
            {/* 1. Artifact Ingestion (Strict) */}
            <div className="flex-shrink-0">
                <label className="flex items-center justify-between text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-3">
                    <span>Artifact Staging</span>
                    <span className="text-[#9d4edd]">{state.artifacts.filter(a => a.status === 'verified').length}/{state.artifacts.length}</span>
                </label>
                
                <div className="relative group mb-3">
                    <input
                        type="file"
                        multiple
                        accept="application/pdf,image/png,image/jpeg,image/webp"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="border border-dashed border-[#333] bg-[#0f0f0f] rounded-none p-4 text-center transition-all group-hover:border-[#9d4edd] group-hover:bg-[#111]">
                        <ScanLine className="w-5 h-5 mx-auto mb-2 text-gray-600 group-hover:text-[#9d4edd] transition-colors" />
                        <p className="text-[10px] text-gray-500 font-mono">INITIATE INGESTION SCAN</p>
                    </div>
                </div>

                <div className="space-y-2 max-h-[20vh] overflow-y-auto custom-scrollbar pr-1">
                    {state.artifacts.map((node) => (
                    <div key={node.id} className="flex items-center justify-between bg-[#111] p-2 border border-[#1f1f1f] relative overflow-hidden group">
                        {/* Progress/Status Bar */}
                        <div className={`absolute left-0 top-0 bottom-0 w-0.5 
                            ${node.status === 'verified' ? 'bg-green-500' : 
                              node.status === 'scanning' ? 'bg-yellow-500 animate-pulse' : 
                              'bg-red-500'}`} 
                        />
                        
                        <div className="flex items-center truncate pl-2">
                            {node.status === 'scanning' && <Loader2 className="w-3 h-3 mr-2 text-yellow-500 animate-spin flex-shrink-0" />}
                            {node.status === 'verified' && <Check className="w-3 h-3 mr-2 text-green-500 flex-shrink-0" />}
                            {node.status === 'rejected' && <AlertCircle className="w-3 h-3 mr-2 text-red-500 flex-shrink-0" />}
                            <div className="flex flex-col truncate">
                                <span className={`text-[10px] truncate font-mono ${node.status === 'rejected' ? 'text-red-400 line-through' : 'text-gray-300'}`}>
                                    {node.file.name}
                                </span>
                                <span className="text-[8px] text-gray-600 font-mono uppercase">
                                    {node.status === 'scanning' ? 'ANALYZING METADATA...' : node.status}
                                </span>
                            </div>
                        </div>
                        <button onClick={() => removeArtifact(node.id)} className="text-gray-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                    ))}
                </div>
            </div>

            {/* 2. Ontology Engine (Structured Input) */}
            <div className="flex-1 flex flex-col min-h-0 border-t border-[#1f1f1f] pt-4">
                <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-4">Ontology Schema</label>
                
                <div className="space-y-4 overflow-y-auto custom-scrollbar pr-1 flex-1">
                    
                    <div className="space-y-1">
                        <span className="text-[9px] text-[#9d4edd] font-mono uppercase">01 Target System</span>
                        <input 
                            type="text" 
                            className="w-full bg-[#050505] border border-[#333] p-2 text-xs font-mono text-gray-300 focus:border-[#9d4edd] outline-none"
                            placeholder="e.g. Enterprise Cloud, User Auth..."
                            value={state.governance.targetSystem}
                            onChange={(e) => setState(prev => ({...prev, governance: {...prev.governance, targetSystem: e.target.value}}))}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <span className="text-[9px] text-[#9d4edd] font-mono uppercase">02 Constraints</span>
                            <select 
                                className="w-full bg-[#050505] border border-[#333] p-2 text-xs font-mono text-gray-300 focus:border-[#9d4edd] outline-none"
                                value={state.governance.constraintLevel}
                                onChange={(e) => setState(prev => ({...prev, governance: {...prev.governance, constraintLevel: e.target.value as any}}))}
                            >
                                <option value="Permissive">Permissive</option>
                                <option value="Standard">Standard</option>
                                <option value="Strict">Strict</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[9px] text-[#9d4edd] font-mono uppercase">03 Topology</span>
                            <select 
                                className="w-full bg-[#050505] border border-[#333] p-2 text-xs font-mono text-gray-300 focus:border-[#9d4edd] outline-none"
                                value={state.governance.outputTopology}
                                onChange={(e) => setState(prev => ({...prev, governance: {...prev.governance, outputTopology: e.target.value as any}}))}
                            >
                                <option value="Hierarchical">Hierarchical</option>
                                <option value="Network">Network</option>
                                <option value="Sequential">Sequential</option>
                                <option value="Hub & Spoke">Hub & Spoke</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <span className="text-[9px] text-[#9d4edd] font-mono uppercase">04 Directives</span>
                        <textarea
                            value={state.governance.additionalDirectives}
                            onChange={(e) => setState(prev => ({ ...prev, governance: {...prev.governance, additionalDirectives: e.target.value} }))}
                            placeholder="// Specific architectural rules..."
                            className="w-full h-16 bg-[#050505] border border-[#333] p-2 text-xs font-mono text-gray-300 focus:border-[#9d4edd] outline-none resize-none leading-relaxed"
                        />
                    </div>
                </div>
                
                <button
                    onClick={() => handleGenerate(activeTab === 'intel' ? 'diagram' : activeTab)} 
                    disabled={state.isLoading || state.artifacts.filter(a => a.status === 'verified').length === 0}
                    className={`mt-4 w-full py-3 px-4 flex items-center justify-center font-bold text-[10px] tracking-[0.15em] uppercase font-mono transition-all border flex-shrink-0
                        ${state.isLoading || state.artifacts.filter(a => a.status === 'verified').length === 0
                            ? 'bg-[#111] border-[#1f1f1f] text-gray-700 cursor-not-allowed' 
                            : 'bg-[#9d4edd] border-[#9d4edd] text-black hover:bg-[#b06bf7] shadow-[0_0_15px_rgba(157,78,221,0.3)]'}`}
                >
                    {state.isLoading ? (
                        <>
                            <Sparkles className="w-3 h-3 mr-2 animate-spin" />
                            EXECUTING...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-3 h-3 mr-2" />
                            INIT_SEQUENCE
                        </>
                    )}
                </button>
            </div>
            
            {state.error && (
                <div className="mt-4 p-3 bg-red-900/10 border border-red-900/30 text-red-400 text-xs flex items-start font-mono">
                    <AlertCircle className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0" />
                    {state.error}
                </div>
            )}
         </div>
      </div>

      {/* Main Viewport */}
      <div className="lg:col-span-9 flex flex-col bg-[#030303] relative">
         {/* Background Grid */}
         <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none"></div>
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#150520_0%,transparent_60%)] pointer-events-none"></div>

         {/* Header Tabs */}
         <div className="h-14 border-b border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur px-6 flex items-center justify-between relative z-10">
            <div className="flex space-x-1">
                <button 
                    onClick={() => setActiveTab('diagram')}
                    className={`flex items-center px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'diagram' ? 'border-[#9d4edd] text-[#9d4edd]' : 'border-transparent text-gray-600 hover:text-gray-400'}`}
                >
                    <GitGraph className="w-3 h-3 mr-2" />
                    Architecture
                </button>
                <button 
                    onClick={() => handleGenerate('intel')}
                    className={`flex items-center px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'intel' ? 'border-[#9d4edd] text-[#9d4edd]' : 'border-transparent text-gray-600 hover:text-gray-400'}`}
                >
                    <MessageSquare className="w-3 h-3 mr-2" />
                    Intel Uplink
                </button>
                <button 
                    onClick={() => setActiveTab('audio')}
                    className={`flex items-center px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'audio' ? 'border-[#9d4edd] text-[#9d4edd]' : 'border-transparent text-gray-600 hover:text-gray-400'}`}
                >
                    <Headphones className="w-3 h-3 mr-2" />
                    Deep Dive
                </button>
            </div>

            {/* Context Actions */}
            <div className="flex items-center space-x-3">
                <button 
                    onClick={() => setShowInspector(!showInspector)}
                    className={`flex items-center space-x-2 text-[10px] font-mono px-2 py-1 rounded transition-colors ${showInspector ? 'text-[#9d4edd] bg-[#9d4edd]/10' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <FileJson className="w-3 h-3" />
                    <span>TRACE_CTX</span>
                </button>
                {activeTab === 'diagram' && state.generatedCode && (
                    <>
                        <div className="h-4 w-px bg-[#1f1f1f]"></div>
                        <button 
                            onClick={toggleEditMode}
                            className={`p-2 rounded transition-colors ${isEditingCode ? 'bg-[#9d4edd]/20 text-[#9d4edd]' : 'text-gray-600 hover:bg-[#1f1f1f] hover:text-gray-300'}`}
                            title="Edit Code"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => copyToClipboard(state.generatedCode)}
                            className="text-gray-600 hover:text-[#9d4edd] transition-colors flex items-center text-[10px] font-mono uppercase"
                        >
                            {copied ? <Check className="w-3 h-3 mr-1.5" /> : <Copy className="w-3 h-3 mr-1.5" />}
                            {copied ? 'COPIED' : 'COPY_SRC'}
                        </button>
                    </>
                )}
            </div>
         </div>

         {/* Content Area */}
         <div className="flex-1 overflow-hidden relative z-0 flex">
             
             {/* MCP Inspector (Split Pane) */}
             {showInspector && (
                 <div className="w-80 bg-[#050505] border-r border-[#1f1f1f] z-20 overflow-y-auto custom-scrollbar p-4 animate-in slide-in-from-left-10 duration-200 shadow-2xl">
                     <div className="flex items-center justify-between mb-4">
                         <h3 className="text-[10px] font-bold text-[#9d4edd] uppercase tracking-widest font-mono">Context Payload</h3>
                         <span className="text-[9px] text-gray-600 font-mono">JSON/MCP</span>
                     </div>
                     <pre className="text-[9px] font-mono text-gray-400 whitespace-pre-wrap leading-relaxed">
                         {JSON.stringify({
                             protocol: "MCP/1.0",
                             timestamp: new Date().toISOString(),
                             governance: state.governance,
                             artifacts: state.artifacts.map(a => ({
                                 id: a.id,
                                 name: a.file.name,
                                 type: a.file.type,
                                 size: a.file.size,
                                 status: a.status
                             })),
                             activeContext: activeTab
                         }, null, 2)}
                     </pre>
                 </div>
             )}

             <div className="flex-1 relative flex flex-col h-full overflow-hidden">
                {/* Edit Code Overlay */}
                {activeTab === 'diagram' && isEditingCode && (
                    <div className="absolute inset-0 z-30 bg-[#0a0a0a]/95 backdrop-blur flex flex-col p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-mono text-[#9d4edd]">mermaid.src // EDIT MODE</h3>
                            <div className="flex space-x-3">
                                <button onClick={() => setIsEditingCode(false)} className="text-xs text-gray-500 hover:text-white font-mono">ABORT</button>
                                <button 
                                    onClick={handleUpdateDiagram}
                                    className="px-3 py-1.5 bg-[#9d4edd] hover:bg-[#b06bf7] text-black text-xs font-bold font-mono flex items-center"
                                >
                                    <RotateCcw className="w-3 h-3 mr-1.5" />
                                    RE-RENDER
                                </button>
                            </div>
                        </div>
                        <textarea 
                            value={codeBuffer}
                            onChange={(e) => setCodeBuffer(e.target.value)}
                            className="flex-1 w-full bg-[#050505] border border-[#333] p-4 font-mono text-xs text-gray-300 focus:ring-1 focus:ring-[#9d4edd] outline-none leading-relaxed"
                            spellCheck={false}
                        />
                    </div>
                )}

                {activeTab === 'diagram' && (
                <div className="h-full w-full">
                    {state.generatedCode ? (
                    <MermaidDiagram code={state.generatedCode} />
                    ) : (
                    <EmptyState 
                        icon={BrainCircuit}
                        title="Architecture Visualizer"
                        desc="Awaiting valid artifacts for structural mapping."
                        action={() => {}}
                        loading={state.isLoading}
                        filesCount={state.artifacts.filter(a => a.status === 'verified').length}
                        isActionDisabled={true}
                    />
                    )}
                </div>
                )}

                {/* Tactical Oracle Chat Interface */}
                {activeTab === 'intel' && (
                <div className="h-full w-full flex flex-col">
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 bg-[#050505]">
                        {state.chatHistory.length === 0 ? (
                            <EmptyState 
                                icon={MessageSquare}
                                title="Tactical Oracle"
                                desc="Establish uplink to query document intelligence."
                                action={() => handleGenerate('intel')}
                                loading={false}
                                filesCount={state.artifacts.filter(a => a.status === 'verified').length}
                                isActionDisabled={false}
                            />
                        ) : (
                            state.chatHistory.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-4 text-sm font-mono leading-relaxed border ${msg.role === 'user' ? 'bg-[#9d4edd]/10 border-[#9d4edd]/30 text-gray-200' : 'bg-[#111] border-[#333] text-gray-400'}`}>
                                        {msg.role === 'model' && <div className="text-[10px] text-[#9d4edd] mb-2 uppercase tracking-wider">Oracle // System</div>}
                                        {msg.role === 'user' && <div className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider text-right">Operator</div>}
                                        <div className="whitespace-pre-wrap">{msg.text}</div>
                                    </div>
                                </div>
                            ))
                        )}
                        {isChatProcessing && (
                            <div className="flex justify-start">
                                <div className="bg-[#111] border border-[#333] p-4 flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-[#9d4edd] rounded-full animate-pulse"></div>
                                    <span className="text-xs font-mono text-gray-500">ANALYZING SIGNAL...</span>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                    
                    {/* Chat Input Area */}
                    <div className="p-4 bg-[#0a0a0a] border-t border-[#1f1f1f]">
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                                placeholder="Query system intelligence..."
                                className="flex-1 bg-[#050505] border border-[#333] text-gray-200 px-4 py-3 font-mono text-sm focus:outline-none focus:border-[#9d4edd]"
                            />
                            <button 
                                onClick={handleSendChat}
                                disabled={isChatProcessing || !chatInput.trim()}
                                className="bg-[#9d4edd] hover:bg-[#b06bf7] text-black px-6 font-bold uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                SEND
                            </button>
                        </div>
                    </div>
                </div>
                )}

                {activeTab === 'audio' && (
                <div className="h-full w-full flex items-center justify-center p-6">
                    {state.audioUrl ? (
                    <div className="w-full max-w-xl bg-[#0a0a0a] border border-[#333] p-10 flex flex-col items-center text-center relative overflow-hidden shadow-[0_0_50px_-20px_rgba(157,78,221,0.3)]">
                        <div className="absolute top-0 left-0 w-full h-1 bg-[#9d4edd]"></div>
                        
                        <div className="flex items-center justify-center gap-1 mb-8 h-12">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="w-1 bg-[#9d4edd] animate-[bounce_1s_infinite]" style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.1}s` }}></div>
                            ))}
                        </div>

                        <h2 className="text-xl font-mono text-white mb-2 uppercase tracking-widest">Deep Dive Protocol</h2>
                        <p className="text-gray-500 mb-8 text-xs font-mono max-w-xs">
                        Synthetic dialogue generated from source artifacts.
                        </p>

                        <audio controls className="w-full mb-6 mix-blend-screen opacity-90 invert hue-rotate-180" src={state.audioUrl}>
                        Your browser does not support the audio element.
                        </audio>
                    </div>
                    ) : (
                    <EmptyState 
                        icon={Headphones}
                        title="Audio Protocol"
                        desc="Generate a conversational deep dive into your data sources."
                        action={() => handleGenerate('audio')}
                        loading={state.isLoading}
                        filesCount={state.artifacts.filter(a => a.status === 'verified').length}
                        isActionDisabled={false}
                    />
                    )}
                </div>
                )}
            </div>
         </div>
      </div>
    </div>
  );
};

const EmptyState: React.FC<{
  icon: React.ElementType;
  title: string;
  desc: string;
  action: () => void;
  loading: boolean;
  filesCount: number;
  isActionDisabled: boolean;
}> = ({ icon: Icon, title, desc, action, loading, filesCount, isActionDisabled }) => (
  <div className="h-full flex flex-col items-center justify-center text-gray-600 p-8 text-center relative z-10">
    <div className="w-20 h-20 bg-[#0a0a0a] flex items-center justify-center mb-6 border border-[#1f1f1f] group hover:border-[#9d4edd] transition-colors">
      <Icon className="w-8 h-8 text-gray-600 group-hover:text-[#9d4edd] transition-colors" />
    </div>
    <h3 className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-[0.2em] font-mono">{title}</h3>
    <p className="text-xs text-gray-600 max-w-xs mb-8 font-mono">{desc}</p>
    
    {!isActionDisabled && (
    <button
      onClick={action}
      disabled={loading || (title !== "Tactical Oracle" && filesCount === 0)}
      className={`px-8 py-3 text-[10px] font-bold uppercase tracking-[0.2em] transition-all border font-mono
        ${loading || (title !== "Tactical Oracle" && filesCount === 0)
          ? 'bg-[#111] border-[#333] text-gray-700 cursor-not-allowed' 
          : 'bg-[#9d4edd]/10 border-[#9d4edd] text-[#9d4edd] hover:bg-[#9d4edd] hover:text-black'}`}
    >
      {loading ? 'INITIALIZING...' : (filesCount === 0 && title !== "Tactical Oracle" ? 'UPLOAD ARTIFACTS' : 'INIT_SYSTEM')}
    </button>
    )}
    {isActionDisabled && filesCount === 0 && (
        <div className="text-[9px] text-gray-600 font-mono uppercase border border-[#333] px-3 py-1">
            Waiting for Source Artifacts...
        </div>
    )}
  </div>
);

export default ProcessVisualizer;
