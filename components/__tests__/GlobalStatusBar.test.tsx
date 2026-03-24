// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ============================================================================
// MOCKS
// ============================================================================

const mockAddLog = vi.hoisted(() => vi.fn());
const mockSetScrubberOpen = vi.hoisted(() => vi.fn());
const mockSetDiagnosticsOpen = vi.hoisted(() => vi.fn());
const mockSetCollabState = vi.hoisted(() => vi.fn());
const mockSetSidebarOpen = vi.hoisted(() => vi.fn());
const mockToggleTerminal = vi.hoisted(() => vi.fn());
const mockHydrateAgents = vi.hoisted(() => vi.fn());
const mockSetVoiceState = vi.hoisted(() => vi.fn());
const mockToggleKnowledgeLayer = vi.hoisted(() => vi.fn());

const mockStoreState = vi.hoisted(() => ({
  kernel: { uptime: 3661 },
  system: {},
  collaboration: { peers: [], isOverlayOpen: false },
  voice: { isActive: false, isOverlayVisible: false },
  knowledge: { activeLayers: [] },
  isScrubberOpen: false,
  isDiagnosticsOpen: false,
  isSidebarOpen: false,
  mode: 'DASHBOARD',
  actions: {
    setScrubberOpen: mockSetScrubberOpen,
    setDiagnosticsOpen: mockSetDiagnosticsOpen,
    setCollabState: mockSetCollabState,
    setSidebarOpen: mockSetSidebarOpen,
    addLog: mockAddLog,
    toggleTerminal: mockToggleTerminal,
    hydrateAgents: mockHydrateAgents,
    setVoiceState: mockSetVoiceState,
    toggleKnowledgeLayer: mockToggleKnowledgeLayer,
  },
}));

vi.mock('../../store', () => ({
  useAppStore: Object.assign(
    (selector?: (s: any) => any) => {
      if (selector) return selector(mockStoreState);
      return mockStoreState;
    },
    {
      getState: () => mockStoreState,
    }
  ),
}));

vi.mock('../../data/knowledgeLayers', () => ({
  KNOWLEDGE_LAYERS: {
    layer1: { id: 'layer1', label: 'Test Layer', icon: 'Layers', color: '#fff' },
  },
}));

vi.mock('../../services/persistenceService', () => ({
  neuralVault: {
    createCheckpoint: vi.fn().mockResolvedValue(undefined),
    getKnowledgeLayers: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../services/dreamProtocol', () => ({
  dreamProtocol: {
    getStatus: () => ({
      isDreaming: false,
      idleTime: 30000,
      currentSession: null,
    }),
    triggerDream: vi.fn(),
  },
}));

vi.mock('../../hooks/useAgentRuntime', () => ({
  useAgentRuntime: () => ({
    execute: vi.fn(),
    state: { isThinking: false, activeTool: null, lastResult: null, history: [] },
  }),
}));

vi.mock('../../hooks/useVisualCortex', () => ({
  useVisualCortex: () => ({
    probeScreen: vi.fn(),
    isProbing: false,
  }),
}));

vi.mock('../../hooks/usePerformanceMonitor', () => ({
  usePerformanceMonitor: () => ({
    fps: 60,
    memory: { used: 128, total: 512 },
  }),
}));

vi.mock('../../hooks/useServiceHealth', () => ({
  useServiceHealth: () => ({
    agentCore: 'online',
    ollama: 'online',
  }),
}));

vi.mock('../../services/audioService', () => ({
  audio: {
    playSuccess: vi.fn(),
    playError: vi.fn(),
    playClick: vi.fn(),
  },
}));

vi.mock('../../utils/cn', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

vi.mock('../../utils/iconMap', () => ({
  getIcon: () => (props: any) => <span {...props}>Icon</span>,
}));

vi.mock('../ApiUsageIndicator', () => ({
  default: () => <div data-testid="api-usage">ApiUsage</div>,
}));

vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
    button: React.forwardRef(({ children, ...props }: any, ref: any) => <button ref={ref} {...props}>{children}</button>),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('lucide-react', () => {
  const icon = (props: any) => <span {...props}>Icon</span>;
  return {
    Terminal: icon, PanelRight: icon, Gauge: icon, Fingerprint: icon,
    Users: icon, SearchCode: icon, Radio: icon, Moon: icon, Sun: icon,
    History: icon, Loader2: icon, Save: icon, Sparkles: icon, Activity: icon,
    Mic: icon, Layers: icon,
  };
});

import GlobalStatusBar from '../GlobalStatusBar';

describe('GlobalStatusBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the status bar', () => {
    render(<GlobalStatusBar />);
    expect(screen.getByText('Neural_Load')).toBeTruthy();
  });

  it('renders FPS display', () => {
    render(<GlobalStatusBar />);
    expect(screen.getByText('60')).toBeTruthy();
    expect(screen.getByText('FPS')).toBeTruthy();
  });

  it('renders memory usage', () => {
    render(<GlobalStatusBar />);
    expect(screen.getByText('128')).toBeTruthy();
    expect(screen.getByText('MB')).toBeTruthy();
  });

  it('renders Auth Token section', () => {
    render(<GlobalStatusBar />);
    expect(screen.getByText('Auth_Token')).toBeTruthy();
    expect(screen.getByText('0xFD2..9A')).toBeTruthy();
  });

  it('renders runtime uptime formatted', () => {
    render(<GlobalStatusBar />);
    expect(screen.getByText('Runtime')).toBeTruthy();
    // 3661 seconds = 01:01:01
    expect(screen.getByText('01:01:01')).toBeTruthy();
  });

  it('renders search input', () => {
    render(<GlobalStatusBar />);
    expect(screen.getByPlaceholderText('Search or command...')).toBeTruthy();
  });

  it('renders voice button', () => {
    render(<GlobalStatusBar />);
    expect(screen.getByText('VOICE')).toBeTruthy();
  });

  it('renders snapshot button', () => {
    render(<GlobalStatusBar />);
    expect(screen.getByText('Snapshot')).toBeTruthy();
  });

  it('renders dream status as AWAKE', () => {
    render(<GlobalStatusBar />);
    expect(screen.getByText('AWAKE')).toBeTruthy();
  });

  it('renders peer count', () => {
    render(<GlobalStatusBar />);
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('renders service health indicators', () => {
    render(<GlobalStatusBar />);
    expect(screen.getByText('MCP')).toBeTruthy();
    expect(screen.getByText('LLM')).toBeTruthy();
  });

  it('renders ApiUsageIndicator', () => {
    render(<GlobalStatusBar />);
    expect(screen.getByTestId('api-usage')).toBeTruthy();
  });
});
