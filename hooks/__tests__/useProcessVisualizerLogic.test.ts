// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ============================================================================
// MOCKS
// ============================================================================

const mockAddLog = vi.hoisted(() => vi.fn());
const mockSetProcessState = vi.hoisted(() => vi.fn());
const mockSetCodeStudioState = vi.hoisted(() => vi.fn());
const mockSetMode = vi.hoisted(() => vi.fn());
const mockOpenHoloProjector = vi.hoisted(() => vi.fn());
const mockUpdateProcessNode = vi.hoisted(() => vi.fn());
const mockFitView = vi.hoisted(() => vi.fn());
const mockScreenToFlowPosition = vi.hoisted(() => vi.fn().mockReturnValue({ x: 100, y: 100 }));
const mockGetViewport = vi.hoisted(() => vi.fn().mockReturnValue({ x: 0, y: 0, zoom: 1 }));
const mockZoomTo = vi.hoisted(() => vi.fn());
const mockHasGeminiKey = vi.hoisted(() => vi.fn().mockReturnValue(true));
const mockPlaySuccess = vi.hoisted(() => vi.fn());
const mockPlayClick = vi.hoisted(() => vi.fn());
const mockPlayError = vi.hoisted(() => vi.fn());

vi.mock('../../services/apiKeyService', () => ({
  apiKeyService: {
    hasGeminiKey: mockHasGeminiKey,
  },
}));

vi.mock('../../store', () => ({
  useAppStore: () => ({
    process: {
      activeTab: 'living_map',
      nodes: [],
      edges: [],
      pendingAIAddition: null,
      pendingAction: null,
      livingMapContext: { sources: [] },
      workflowType: 'AGENTIC_ORCHESTRATION',
      governance: {},
      generatedWorkflow: null,
      isSimulating: false,
      runtimeResults: {},
    },
    theme: 'DARK',
    actions: {
      addLog: mockAddLog,
      setProcessState: mockSetProcessState,
      setCodeStudioState: mockSetCodeStudioState,
      setMode: mockSetMode,
      openHoloProjector: mockOpenHoloProjector,
      updateProcessNode: mockUpdateProcessNode,
    },
  }),
}));

vi.mock('../../services/persistenceService', () => ({
  neuralVault: {
    getArtifacts: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../services/geminiService', () => ({
  generateMermaidDiagram: vi.fn().mockResolvedValue('graph TD; A-->B'),
  generateAudioOverview: vi.fn().mockResolvedValue({ audioData: '', transcript: '' }),
  fileToGenerativePart: vi.fn().mockResolvedValue({ inlineData: { data: 'base64' } }),
  promptSelectKey: vi.fn().mockResolvedValue(undefined),
  classifyArtifact: vi.fn().mockResolvedValue({ ok: true, value: { classification: 'DOC', summary: 'test', entities: [] } }),
  generateAutopoieticFramework: vi.fn(),
  generateStructuredWorkflow: vi.fn().mockResolvedValue({ protocols: [] }),
  generateSystemArchitecture: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
  calculateEntropy: vi.fn(),
  decomposeNode: vi.fn().mockResolvedValue({ nodes: [], edges: [], optimizations: [] }),
  generateInfrastructureCode: vi.fn().mockResolvedValue('# generated code'),
  generateSingleNode: vi.fn().mockResolvedValue({ label: 'Test Node', subtext: 'test' }),
  calculateOptimalLayout: vi.fn().mockResolvedValue({}),
  generateSwarmArchitecture: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
  simulateAgentStep: vi.fn().mockResolvedValue({ output: 'result' }),
  generateProcessFromContext: vi.fn().mockResolvedValue({ title: 'Test', nodes: [], edges: [] }),
}));

vi.mock('../../services/audioService', () => ({
  audio: {
    playSuccess: mockPlaySuccess,
    playClick: mockPlayClick,
    playError: mockPlayError,
  },
}));

// Mock @xyflow/react
const mockSetNodes = vi.hoisted(() => vi.fn((updater: any) => {
  if (typeof updater === 'function') updater([]);
}));
const mockSetEdges = vi.hoisted(() => vi.fn((updater: any) => {
  if (typeof updater === 'function') updater([]);
}));
const mockOnNodesChange = vi.hoisted(() => vi.fn());
const mockOnEdgesChange = vi.hoisted(() => vi.fn());

vi.mock('@xyflow/react', () => ({
  useNodesState: vi.fn().mockReturnValue([[], mockSetNodes, mockOnNodesChange]),
  useEdgesState: vi.fn().mockReturnValue([[], mockSetEdges, mockOnEdgesChange]),
  useReactFlow: () => ({
    fitView: mockFitView,
    screenToFlowPosition: mockScreenToFlowPosition,
    getViewport: mockGetViewport,
    zoomTo: mockZoomTo,
  }),
  addEdge: vi.fn((params: any, edges: any[]) => [...edges, params]),
}));

// Must import after mocks
import { useProcessVisualizerLogic, THEME, VISUAL_THEMES } from '../useProcessVisualizerLogic';

// ============================================================================
// TESTS
// ============================================================================

describe('useProcessVisualizerLogic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // THEME constants (no hook needed)
  // ---------------------------------------------------------------------------

  it('should define THEME accent colors', () => {
    expect(THEME.accent.core).toBe('#9d4edd');
    expect(THEME.accent.memory).toBe('#22d3ee');
    expect(THEME.accent.action).toBe('#f59e0b');
    expect(THEME.accent.tools).toBe('#3b82f6');
    expect(THEME.accent.alert).toBe('#ef4444');
    expect(THEME.accent.success).toBe('#10b981');
    expect(THEME.accent.execution).toBe('#f59e0b');
  });

  it('should define all visual theme variants', () => {
    expect(VISUAL_THEMES).toHaveProperty('DARK');
    expect(VISUAL_THEMES).toHaveProperty('LIGHT');
    expect(VISUAL_THEMES).toHaveProperty('CONTRAST');
    expect(VISUAL_THEMES).toHaveProperty('HIGH_CONTRAST');
    expect(VISUAL_THEMES).toHaveProperty('AMBER');
    expect(VISUAL_THEMES).toHaveProperty('SOLARIZED');
    expect(VISUAL_THEMES).toHaveProperty('MIDNIGHT');
    expect(VISUAL_THEMES).toHaveProperty('NEON_CYBER');
    expect(VISUAL_THEMES).toHaveProperty('CUSTOM');
  });

  it('should have correct structure for DARK visual theme', () => {
    const dark = VISUAL_THEMES.DARK;
    expect(dark.bg).toBe('#000');
    expect(dark.text).toBe('#e5e5e5');
    expect(dark.grid).toBe('#222');
  });

  // ---------------------------------------------------------------------------
  // Hook initialization
  // ---------------------------------------------------------------------------

  it('should initialize with default state from hook', () => {
    const { result } = renderHook(() => useProcessVisualizerLogic());

    expect(result.current.activeTab).toBe('living_map');
    expect(result.current.showGrid).toBe(true);
    expect(result.current.paneContextMenu).toBeNull();
    expect(result.current.isGeneratingGraph).toBe(false);
    expect(result.current.isDecomposing).toBe(false);
    expect(result.current.isOptimizing).toBe(false);
    expect(result.current.isOrganizing).toBe(false);
    expect(result.current.isSynthesizingVault).toBe(false);
    expect(result.current.sequenceStatus).toBe('IDLE');
    expect(result.current.sequenceProgress).toBe(0);
  });

  it('should expose expected function properties', () => {
    const { result } = renderHook(() => useProcessVisualizerLogic());

    expect(typeof result.current.onConnect).toBe('function');
    expect(typeof result.current.onPaneContextMenu).toBe('function');
    expect(typeof result.current.onPaneClick).toBe('function');
    expect(typeof result.current.onPaneDoubleClick).toBe('function');
    expect(typeof result.current.toggleGrid).toBe('function');
    expect(typeof result.current.addNodeAtPosition).toBe('function');
    expect(typeof result.current.updateNodeStatus).toBe('function');
    expect(typeof result.current.handleGenerateGraph).toBe('function');
    expect(typeof result.current.handleDecomposeNode).toBe('function');
    expect(typeof result.current.handleOptimizeNode).toBe('function');
    expect(typeof result.current.handleAutoOrganize).toBe('function');
    expect(typeof result.current.handleSynthesizeFromVault).toBe('function');
    expect(typeof result.current.handleAIAddNode).toBe('function');
    expect(typeof result.current.handleGenerate).toBe('function');
    expect(typeof result.current.saveGraph).toBe('function');
    expect(typeof result.current.restoreGraph).toBe('function');
    expect(typeof result.current.handleSourceUpload).toBe('function');
    expect(typeof result.current.removeSource).toBe('function');
    expect(typeof result.current.viewSourceAnalysis).toBe('function');
    expect(typeof result.current.handleLoadCodebaseGraph).toBe('function');
  });

  it('should clear pane context menu on pane click', () => {
    const { result } = renderHook(() => useProcessVisualizerLogic());
    act(() => {
      result.current.onPaneClick();
    });
    // Verifying it doesn't throw
  });

  // ---------------------------------------------------------------------------
  // getTabLabel and getPriorityBadgeStyle
  // ---------------------------------------------------------------------------

  it('should format tab labels correctly', () => {
    const { result } = renderHook(() => useProcessVisualizerLogic());
    expect(result.current.getTabLabel('living_map')).toBe('living map');
    expect(result.current.getTabLabel('workflow')).toBe('workflow');
    expect(result.current.getTabLabel('some_tab_name')).toBe('some tab_name');
  });

  it('should return correct priority badge style for HIGH', () => {
    const { result } = renderHook(() => useProcessVisualizerLogic());
    const style = result.current.getPriorityBadgeStyle('HIGH');
    expect(style).toContain('bg-red-900/20');
    expect(style).toContain('text-red-400');
  });

  it('should return default priority badge style for non-HIGH', () => {
    const { result } = renderHook(() => useProcessVisualizerLogic());
    const style = result.current.getPriorityBadgeStyle('LOW');
    expect(style).toContain('bg-[#111]');
    expect(style).toContain('text-gray-500');
  });

  // ---------------------------------------------------------------------------
  // saveGraph / restoreGraph
  // ---------------------------------------------------------------------------

  it('should save graph to localStorage', () => {
    const mockSetItem = vi.fn();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: mockSetItem,
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    });

    const { result } = renderHook(() => useProcessVisualizerLogic());
    act(() => {
      result.current.saveGraph();
    });

    expect(mockSetItem).toHaveBeenCalledWith('pm_layout', expect.any(String));
    expect(mockAddLog).toHaveBeenCalledWith('SUCCESS', 'Layout cached.');

    vi.unstubAllGlobals();
  });

  it('should restore graph from localStorage', () => {
    const savedData = JSON.stringify({ nodes: [{ id: 'n1' }], edges: [{ id: 'e1' }] });
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(savedData),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    });

    const { result } = renderHook(() => useProcessVisualizerLogic());
    act(() => {
      result.current.restoreGraph();
    });

    expect(mockSetNodes).toHaveBeenCalled();
    expect(mockSetEdges).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('should not restore graph if no saved data in localStorage', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    });

    const { result } = renderHook(() => useProcessVisualizerLogic());
    mockSetNodes.mockClear();
    mockSetEdges.mockClear();
    act(() => {
      result.current.restoreGraph();
    });

    // setNodes/setEdges should not have been called from restoreGraph
    expect(mockSetNodes).not.toHaveBeenCalled();
    expect(mockSetEdges).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  // ---------------------------------------------------------------------------
  // updateNodeStatus
  // ---------------------------------------------------------------------------

  it('should update node status and play success sound for COMPLETED', () => {
    const { result } = renderHook(() => useProcessVisualizerLogic());
    act(() => {
      result.current.updateNodeStatus('node1', 'COMPLETED');
    });

    expect(mockSetNodes).toHaveBeenCalled();
    expect(mockUpdateProcessNode).toHaveBeenCalledWith('node1', { status: 'COMPLETED' });
    expect(mockPlaySuccess).toHaveBeenCalled();
  });

  it('should update node status and play success sound for DONE', () => {
    const { result } = renderHook(() => useProcessVisualizerLogic());
    act(() => {
      result.current.updateNodeStatus('node1', 'DONE');
    });

    expect(mockUpdateProcessNode).toHaveBeenCalledWith('node1', { status: 'DONE' });
    expect(mockPlaySuccess).toHaveBeenCalled();
  });

  it('should update node status without success sound for non-completed statuses', () => {
    const { result } = renderHook(() => useProcessVisualizerLogic());
    act(() => {
      result.current.updateNodeStatus('node1', 'RUNNING');
    });

    expect(mockUpdateProcessNode).toHaveBeenCalledWith('node1', { status: 'RUNNING' });
    expect(mockPlaySuccess).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // handleResetSimulation
  // ---------------------------------------------------------------------------

  it('should reset simulation state', () => {
    const { result } = renderHook(() => useProcessVisualizerLogic());
    act(() => {
      result.current.handleResetSimulation();
    });

    expect(mockSetProcessState).toHaveBeenCalledWith({
      activeStepIndex: null,
      runtimeResults: {},
      isSimulating: false,
    });
    expect(mockAddLog).toHaveBeenCalledWith('SYSTEM', 'NEURAL_RUNTIME: Execution context flushed.');
    expect(mockPlayClick).toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // viewSourceAnalysis
  // ---------------------------------------------------------------------------

  it('should not open projector when source has no analysis', () => {
    const { result } = renderHook(() => useProcessVisualizerLogic());
    act(() => {
      result.current.viewSourceAnalysis({ id: 's1', name: 'test.txt', type: 'text/plain', analysis: null });
    });

    expect(mockOpenHoloProjector).not.toHaveBeenCalled();
  });

  it('should open projector with text content for analyzed text source', () => {
    const { result } = renderHook(() => useProcessVisualizerLogic());
    act(() => {
      result.current.viewSourceAnalysis({
        id: 's1',
        name: 'test.txt',
        type: 'text/plain',
        analysis: { summary: 'Test summary', entities: ['Entity1'] },
      });
    });

    expect(mockOpenHoloProjector).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 's1',
        title: 'Source Analysis: test.txt',
        type: 'TEXT',
      })
    );
  });
});
