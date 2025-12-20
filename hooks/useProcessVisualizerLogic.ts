
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
    useNodesState, useEdgesState, useReactFlow, addEdge, Connection, 
    Node, Edge, OnSelectionChangeParams, getNodesBounds
} from '@xyflow/react';
import { useAppStore } from '../store';
import { neuralVault } from '../services/persistenceService';
import { 
    generateMermaidDiagram, generateAudioOverview, 
    fileToGenerativePart, promptSelectKey, classifyArtifact, 
    generateAutopoieticFramework, generateStructuredWorkflow,
    generateSystemArchitecture, calculateEntropy, decomposeNode, generateInfrastructureCode,
    generateSingleNode, calculateOptimalLayout, generateSwarmArchitecture,
    simulateAgentStep
} from '../services/geminiService';
import { FileData, AppMode, AppTheme, ProtocolStepResult } from '../types';
import { audio } from '../services/audioService';

export const THEME = {
    accent: { 
        core: '#9d4edd', 
        memory: '#22d3ee', 
        action: '#f59e0b', 
        tools: '#3b82f6', 
        alert: '#ef4444', 
        success: '#10b981',
        execution: '#f59e0b'
    }
};

export const VISUAL_THEMES: Record<AppTheme, any> = {
    DARK: { bg: '#000', nodeBg: 'rgba(15,15,15,0.9)', nodeBorder: 'rgba(255,255,255,0.1)', text: '#e5e5e5', subtext: '#a3a3a3', grid: '#222' },
    LIGHT: { bg: '#f5f5f5', nodeBg: 'rgba(255,255,255,0.9)', nodeBorder: 'rgba(0,0,0,0.1)', text: '#171717', subtext: '#525252', grid: '#e5e5e5' },
    CONTRAST: { bg: '#000', nodeBg: '#000', nodeBorder: '#fff', text: '#fff', subtext: '#ffff00', grid: '#444' },
    HIGH_CONTRAST: { bg: '#000', nodeBg: '#000', nodeBorder: '#00ff00', text: '#fff', subtext: '#00ff00', grid: '#00ff00' },
    AMBER: { bg: '#0a0a0a', nodeBg: 'rgba(26,13,0,0.9)', nodeBorder: 'rgba(245,158,11,0.2)', text: '#f59e0b', subtext: '#78350f', grid: '#1a0d00' },
    SOLARIZED: { bg: '#fdf6e3', nodeBg: 'rgba(253,246,227,0.9)', nodeBorder: 'rgba(0,0,0,0.1)', text: '#657b83', subtext: '#93a1a1', grid: '#eee8d5' },
    MIDNIGHT: { bg: '#020617', nodeBg: 'rgba(15,23,42,0.9)', nodeBorder: 'rgba(59,130,246,0.2)', text: '#e2e8f0', subtext: '#94a3b8', grid: '#1e293b' },
    NEON_CYBER: { bg: '#000', nodeBg: 'rgba(5,5,5,0.9)', nodeBorder: 'rgba(217,70,239,0.3)', text: '#22d3ee', subtext: '#d946ef', grid: '#111' }
};

export const useProcessVisualizerLogic = () => {
    const { process: state, setProcessState: setState, setCodeStudioState, setMode, theme: globalTheme, addLog, openHoloProjector } = useAppStore();
    const activeTab = state.activeTab || 'living_map';
    const [visualTheme, setVisualTheme] = useState<AppTheme>(AppTheme.DARK);
    const [showGrid, setShowGrid] = useState(true);
    const [paneContextMenu, setPaneContextMenu] = useState<{ x: number, y: number, flowPos: { x: number, y: number } } | null>(null);
    const [architecturePrompt, setArchitecturePrompt] = useState('');
    const [isGeneratingGraph, setIsGeneratingGraph] = useState(false);
    const [isDecomposing, setIsDecomposing] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [isOrganizing, setIsOrganizing] = useState(false);
    const [sequenceStatus, setSequenceStatus] = useState<'IDLE' | 'RUNNING' | 'COMPLETE'>('IDLE');
    const [sequenceProgress, setSequenceProgress] = useState(0);

    const { fitView, screenToFlowPosition, getViewport, zoomTo } = useReactFlow();

    const [nodes, setNodes, onNodesChange] = useNodesState(state.nodes || []);
    const [edges, setEdges, onEdgesChange] = useEdgesState(state.edges || []);

    const selectedNode = useMemo(() => nodes.find(n => n.selected), [nodes]);

    useEffect(() => {
        if (nodes.length > 0 || edges.length > 0) {
            setState({ nodes, edges });
        }
    }, [nodes, edges, setState]);

    useEffect(() => {
        if (state.pendingAIAddition) {
            const newNode = { ...state.pendingAIAddition, data: { ...state.pendingAIAddition.data, theme: visualTheme } };
            setNodes(nds => nds.concat(newNode));
            setState({ pendingAIAddition: null });
            setEdges(eds => eds.concat({
                id: `e-nexus-${Date.now()}`,
                source: 'core',
                target: newNode.id,
                type: 'cinematic',
                data: { color: '#9d4edd', variant: 'stream' }
            }));
            setTimeout(() => fitView({ duration: 800 }), 100);
        }
    }, [state.pendingAIAddition, visualTheme, setNodes, setEdges, setState, fitView]);

    useEffect(() => {
        if (state.pendingAction === 'RUN_SEQUENCE') { handleRunGlobalSequence(); setState({ pendingAction: null }); }
        else if (state.pendingAction === 'RESET_VIEW') { fitView({ duration: 800 }); setState({ pendingAction: null }); }
    }, [state.pendingAction, fitView]);

    useEffect(() => { if (globalTheme) setVisualTheme(globalTheme); }, [globalTheme]);

    useEffect(() => {
        if (nodes.length === 0) {
            setNodes([
                { id: 'memory', type: 'holographic', position: { x: 500, y: 50 }, data: { label: 'CONTEXT MEMORY', subtext: 'RAG / Vector Store', iconName: 'Database', color: THEME.accent.memory, status: 'READY', footerLeft: '0/0 ARTIFACTS', footerRight: 'STABLE_STORAGE', theme: visualTheme, progress: 2 } },
                { id: 'tools', type: 'holographic', position: { x: 150, y: 400 }, data: { label: 'TOOLING LAYER', subtext: 'Compute / Search / Code', iconName: 'Wrench', color: THEME.accent.tools, status: 'AVAILABLE', footerLeft: '5 MODULES', footerRight: 'GEN_AI', theme: visualTheme, progress: 3 } },
                { id: 'core', type: 'holographic', position: { x: 500, y: 400 }, data: { label: 'SOVEREIGN AGENT', subtext: 'SYSTEM IDLE', iconName: 'BrainCircuit', color: THEME.accent.core, status: 'ONLINE', footerLeft: 'V3.2 KERNEL', footerRight: 'ROOT_ACCESS', theme: visualTheme, progress: 2 } },
                { id: 'action', type: 'holographic', position: { x: 850, y: 400 }, data: { label: 'EXECUTION LAYER', subtext: 'Output Generation', iconName: 'Zap', color: THEME.accent.execution, status: 'STANDBY', footerLeft: 'GEN_AI', footerRight: 'QUEUE_EMPTY', theme: visualTheme, progress: 2 } },
                { id: 'reflect', type: 'holographic', position: { x: 500, y: 750 }, data: { label: 'REFLECT LOOP', subtext: 'Self-Correction', iconName: 'Activity', color: THEME.accent.alert, status: 'PASSIVE', footerLeft: 'REASONING_L0', footerRight: 'IDLE', theme: visualTheme, progress: 1 } }
            ]);
            setEdges([
                { id: 'e1', source: 'memory', target: 'core', type: 'cinematic', data: { color: THEME.accent.memory, variant: 'stream' } },
                { id: 'e2', source: 'tools', target: 'core', type: 'cinematic', data: { color: THEME.accent.tools, variant: 'stream' } },
                { id: 'e3', source: 'core', target: 'action', type: 'cinematic', data: { color: THEME.accent.execution, variant: 'stream' } },
                { id: 'e4', source: 'core', target: 'reflect', type: 'cinematic', data: { color: THEME.accent.alert, variant: 'stream' } }
            ]);
        }
    }, [visualTheme]);

    const checkApiKey = async () => {
        const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
        if (!hasKey) { await promptSelectKey(); return false; }
        return true;
    };

    const handleApiError = (context: string, err: any) => {
        setState({ error: err.message || "Operation failed", isLoading: false });
        setIsGeneratingGraph(false); setIsDecomposing(false); setIsOptimizing(false); setIsOrganizing(false); setSequenceStatus('IDLE');
    };

    const onConnect = useCallback((params: Connection) => {
        setEdges((eds) => addEdge({ ...params, type: 'cinematic', data: { active: true, variant: 'pulse' } }, eds));
    }, [setEdges]);

    const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
        event.preventDefault();
        const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        setPaneContextMenu({ x: event.clientX, y: event.clientY, flowPos });
    }, [screenToFlowPosition]);

    const onPaneClick = useCallback(() => setPaneContextMenu(null), []);
    const onPaneDoubleClick = useCallback((event: React.MouseEvent) => {
        const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        addNodeAtPosition(flowPos, 'holographic', 'Logical Junction', THEME.accent.core);
    }, [screenToFlowPosition]);

    const addNodeAtPosition = useCallback((position: { x: number, y: number }, type: string, label: string, color: string) => {
        const newNode: Node = { id: `node_${Date.now()}`, type, position, data: { label, subtext: 'System Node', iconName: 'Box', color, status: 'DRAFT', theme: visualTheme, progress: 1 } };
        setNodes((nds) => nds.concat(newNode));
    }, [visualTheme]);

    const handleSourceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            if (!(await checkApiKey())) return;
            const files = Array.from(e.target.files) as File[];
            addLog('SYSTEM', `INGEST_INIT: Processing ${files.length} sources...`);
            for (const file of files) {
                try {
                    const fileData = await fileToGenerativePart(file);
                    const sourceId = `source-${Date.now()}`;
                    const newSource = { id: sourceId, name: file.name, type: file.type, inlineData: fileData.inlineData, analysis: null };
                    setState((prev: any) => ({ livingMapContext: { ...prev.livingMapContext, sources: [...(prev.livingMapContext?.sources || []), newSource] } }));
                    classifyArtifact(fileData).then(analysis => {
                        setState((prev: any) => ({ livingMapContext: { ...prev.livingMapContext, sources: prev.livingMapContext.sources.map((s: any) => s.id === sourceId ? { ...s, analysis } : s) } }));
                        addLog('SUCCESS', `INGEST_COMPLETE: Indexed "${file.name}" as ${analysis.classification}.`);
                    });
                } catch (err) { addLog('ERROR', `INGEST_FAIL: Could not process ${file.name}`); }
            }
        }
    };

    const removeSource = (index: number) => {
        setState((prev: any) => {
            const sources = [...prev.livingMapContext.sources];
            sources.splice(index, 1);
            return { livingMapContext: { ...prev.livingMapContext, sources } };
        });
    };

    const viewSourceAnalysis = (source: any) => {
        if (!source.analysis) return;
        let content = source.analysis.summary;
        if (source.analysis.entities?.length > 0) content += `\n\nENTITIES DETECTED:\n- ${source.analysis.entities.join('\n- ')}`;
        openHoloProjector({ id: source.id, title: `Source Analysis: ${source.name}`, type: source.type.startsWith('image/') ? 'IMAGE' : 'TEXT', content: source.type.startsWith('image/') ? `data:${source.type};base64,${source.inlineData.data}` : content });
    };

    const handleAIAddNode = async (description: string) => {
        if (!description.trim()) return;
        setState({ isLoading: true });
        try {
            if (!(await checkApiKey())) return;
            const nodeData = await generateSingleNode(description);
            const centerPosition = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
            const newNode: Node = { id: `node_${Date.now()}`, type: 'holographic', position: centerPosition, data: { ...nodeData, theme: visualTheme, status: 'INITIALIZED', progress: 1 } };
            setNodes(nds => nds.concat(newNode));
            addLog('SUCCESS', `AI_NODE: Crystallized "${nodeData.label}" at viewport center.`);
            setState({ isLoading: false });
        } catch (err: any) { handleApiError('AI Add Node', err); }
    };

    const handleOptimizeNode = async () => {
        if (!selectedNode || isOptimizing) return;
        setIsOptimizing(true);
        try {
            if (!(await checkApiKey())) return;
            const neighbors = edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
                                    .map(e => nodes.find(n => n.id === (e.source === selectedNode.id ? e.target : e.source))?.data.label).join(', ');
            const result = await decomposeNode(selectedNode.data.label as string, neighbors);
            if (result.optimizations?.length > 0) {
                addLog('SUCCESS', `OPTIMIZE: Found ${result.optimizations.length} improvements for "${selectedNode.data.label}".`);
            } else { addLog('INFO', `OPTIMIZE: Node "${selectedNode.data.label}" is architecturally sound.`); }
            setIsOptimizing(false);
        } catch (err: any) { handleApiError('Optimize', err); }
    };

    const handleAutoOrganize = async () => {
        if (isOrganizing || nodes.length === 0) return;
        setIsOrganizing(true);
        setState({ isLoading: true });
        addLog('SYSTEM', 'LATTICE_SYNC: Calculating optimal semantic topology...');
        try {
            if (!(await checkApiKey())) return;
            const newPositions = await calculateOptimalLayout(nodes, edges);
            setNodes(nds => nds.map(node => ({ ...node, position: newPositions[node.id] || node.position })));
            addLog('SUCCESS', 'LATTICE_SYNC: Autopoietic organization complete.');
            setTimeout(() => fitView({ duration: 1000 }), 100);
        } catch (err: any) { handleApiError('Auto-Organize', err); } finally {
            setIsOrganizing(false);
            setState({ isLoading: false });
        }
    };

    const handleRunGlobalSequence = async () => {
        if (sequenceStatus === 'RUNNING') return;
        if (!(await checkApiKey())) return;
        setSequenceStatus('RUNNING'); setSequenceProgress(0); setState({ isLoading: true });
        try {
            const sources = state.livingMapContext.sources || [];
            const files = (sources as any[]).map((s) => ({ inlineData: s.inlineData, name: s.name })) as FileData[];
            const mapContext = { nodes: nodes.map(n => ({ label: n.data.label, subtext: n.data.subtext })), edges: edges.map(e => e.id) };
            const code = await generateMermaidDiagram(state.governance, files, [mapContext]);
            setState({ generatedCode: code }); setSequenceProgress(30);
            const workflow = await generateStructuredWorkflow(files, state.governance, state.workflowType, mapContext);
            setState({ generatedWorkflow: workflow }); setSequenceProgress(70);
            const { audioData, transcript } = await generateAudioOverview(files);
            setState({ audioUrl: audioData, audioTranscript: transcript }); setSequenceProgress(100);
            setSequenceStatus('COMPLETE'); setState({ activeTab: 'diagram', isLoading: false });
            setTimeout(() => setSequenceStatus('IDLE'), 3000);
        } catch (err: any) { handleApiError('Global Sequence', err); }
    };

    const handleGenerate = async (type: string) => {
        if (!(await checkApiKey())) return;
        setState({ isLoading: true, activeTab: type });
        try {
            const sources = state.livingMapContext.sources || [];
            const files = (sources as any[]).map((s) => ({ inlineData: s.inlineData, name: s.name })) as FileData[];
            const mapContext = { nodes: nodes.map(n => n.data.label), edges: edges.length };
            if (type === 'diagram') {
                const code = await generateMermaidDiagram(state.governance, files, [mapContext]);
                setState({ generatedCode: code, isLoading: false });
            } else if (type === 'workflow') {
                const workflow = await generateStructuredWorkflow(files, state.governance, state.workflowType, mapContext);
                setState({ generatedWorkflow: workflow, isLoading: false });
            }
        } catch (err: any) { handleApiError('Generate', err); }
    };

    const handleExecuteStep = async (index: number) => {
        if (!state.generatedWorkflow || state.isSimulating) return;
        setState({ isSimulating: true, activeStepIndex: index });
        audio.playClick();
        try {
            if (!(await checkApiKey())) return;
            const history = Object.values(state.runtimeResults) as ProtocolStepResult[];
            const result = await simulateAgentStep(state.generatedWorkflow, index, history);
            setState(prev => ({ runtimeResults: { ...prev.runtimeResults, [index]: result }, isSimulating: false }));
            addLog('SUCCESS', `NEURAL_RUNTIME: Step ${index + 1} finalized by ${state.generatedWorkflow.protocols[index].role}.`);
            audio.playSuccess();
        } catch (err: any) { handleApiError('Simulation', err); setState({ isSimulating: false }); audio.playError(); }
    };

    const handleResetSimulation = () => {
        setState({ activeStepIndex: null, runtimeResults: {}, isSimulating: false });
        addLog('SYSTEM', 'NEURAL_RUNTIME: Execution context flushed.');
        audio.playClick();
    };

    return {
        state, activeTab, nodes, edges, onNodesChange, onEdgesChange, onConnect, onPaneContextMenu, onPaneClick, onPaneDoubleClick,
        visualTheme, showGrid, paneContextMenu, setPaneContextMenu, toggleGrid: () => setShowGrid(!showGrid), addNodeAtPosition,
        handleGenerateGraph: async () => {
            if (!(await checkApiKey())) return; 
            setIsGeneratingGraph(true);
            try {
                let result;
                if (state.workflowType === 'AGENTIC_ORCHESTRATION') {
                    addLog('SYSTEM', 'SWARM_SYNTHESIS: Forging cognitive architecture...');
                    result = await generateSwarmArchitecture(architecturePrompt);
                } else {
                    addLog('SYSTEM', 'ARCHITECT: Constructing system topology...');
                    result = await generateSystemArchitecture(architecturePrompt);
                }
                const newNodes = result.nodes.map((n: any, i: number) => ({ id: n.id, type: state.workflowType === 'AGENTIC_ORCHESTRATION' ? 'agentic' : 'holographic', position: { x: 600 + Math.cos(i) * 300, y: 400 + Math.sin(i) * 300 }, data: { ...n, theme: visualTheme, progress: 2 } }));
                const newEdges = result.edges.map((e: any) => ({ id: e.id, source: e.source, target: e.target, type: 'cinematic', data: { color: e.color || '#9d4edd', variant: e.variant || 'stream', handoffCondition: e.handoffCondition } }));
                setNodes(newNodes); setEdges(newEdges); setTimeout(() => fitView({ duration: 1000 }), 100);
            } catch (err: any) { handleApiError('Blueprint', err); } finally { setIsGeneratingGraph(false); }
        },
        handleDecomposeNode: async () => {
            if (!selectedNode) return; setIsDecomposing(true);
            addLog('SYSTEM', `DECOMPOSE: Analyzing entropy for "${selectedNode.data.label}"...`);
            try {
                if (!(await checkApiKey())) return;
                const result = await decomposeNode(selectedNode.data.label as string, "");
                const expanded = result.nodes.map((n: any, i: number) => ({ id: n.id, type: 'holographic', position: { x: selectedNode.position.x + Math.cos(i) * 200, y: selectedNode.position.y + Math.sin(i) * 200 }, data: { ...n, theme: visualTheme, progress: 1 } }));
                setNodes([...nodes.filter(n => n.id !== selectedNode.id), ...expanded]);
                const newEdges = result.edges.map((e: any) => ({ ...e, type: 'cinematic', data: { color: '#42be65', variant: 'stream' } }));
                setEdges([...edges.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id), ...newEdges]);
                addLog('SUCCESS', `DECOMPOSE: Node "${selectedNode.data.label}" expanded into ${expanded.length} sub-units.`);
            } catch (err: any) { handleApiError('Decompose', err); } finally { setIsDecomposing(false); }
        },
        handleOptimizeNode, 
        handleAutoOrganize,
        handleGenerateIaC: async (provider: string) => {
            try {
                if (!(await checkApiKey())) return;
                const summary = nodes.map(n => n.data.label).join(', ');
                const code = await generateInfrastructureCode(summary, provider);
                setMode(AppMode.CODE_STUDIO); 
                setCodeStudioState({ generatedCode: code, language: provider === 'DOCKER' ? 'yaml' : 'hcl' });
                addLog('SUCCESS', `IAC_GEN: Provisioning code for ${provider} stabilized in Studio.`);
            } catch (err: any) { handleApiError('IaC', err); }
        },
        handleAIAddNode, handleGenerate, architecturePrompt, setArchitecturePrompt, sequenceStatus, sequenceProgress,
        selectedNode, isGeneratingGraph, isDecomposing, isOptimizing, isOrganizing, saveGraph: () => { localStorage.setItem('pm_layout', JSON.stringify({ nodes, edges })); addLog('SUCCESS', 'Layout cached.'); },
        restoreGraph: () => { const saved = localStorage.getItem('pm_layout'); if (saved) { const { nodes: ns, edges: es } = JSON.parse(saved); setNodes(ns); setEdges(es); } },
        getTabLabel: (t: string) => t.replace('_', ' '), getPriorityBadgeStyle: (p: string) => p === 'HIGH' ? 'bg-red-900/20 text-red-400 border-red-500/30' : 'bg-[#111] text-gray-500',
        handleSourceUpload, removeSource, viewSourceAnalysis, setState,
        animatedNodes: nodes, animatedEdges: edges, handleRunGlobalSequence,
        handleExecuteStep, handleResetSimulation
    };
};
