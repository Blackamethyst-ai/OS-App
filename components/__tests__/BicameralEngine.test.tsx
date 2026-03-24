// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ============================================================================
// MOCKS
// ============================================================================

const mockSetBicameralState = vi.hoisted(() => vi.fn());
const mockAddLog = vi.hoisted(() => vi.fn());
const mockGenerateDecompositionMap = vi.hoisted(() => vi.fn());
const mockAdaptiveConsensusEngine = vi.hoisted(() => vi.fn());
const mockHasGeminiKey = vi.hoisted(() => vi.fn());

vi.mock('../../store', () => ({
  useAppStore: () => ({
    bicameral: {
      goal: '',
      plan: [],
      ledger: [],
      isPlanning: false,
      isSwarming: false,
      swarmStatus: {
        taskId: '',
        votes: {},
        killedAgents: 0,
        currentGap: 0,
        targetGap: 5,
        totalAttempts: 0,
        consensusProgress: 0,
        activeDNA: 'VISIONARY',
      },
    },
    actions: {
      setBicameralState: mockSetBicameralState,
      addLog: mockAddLog,
    },
  }),
}));

vi.mock('../../services/apiKeyService', () => ({
  apiKeyService: {
    hasGeminiKey: mockHasGeminiKey,
  },
}));

vi.mock('../../services/bicameralService', () => ({
  generateDecompositionMap: mockGenerateDecompositionMap,
  adaptiveConsensusEngine: mockAdaptiveConsensusEngine,
}));

vi.mock('../../services/geminiService', () => ({
  promptSelectKey: vi.fn(),
  AGENT_DNA_BUILDER: [
    { id: 'SKEPTIC', label: 'Logical Skeptic', role: 'Auditor', color: '#ef4444', description: 'Strict error-filtering' },
    { id: 'VISIONARY', label: 'Neural Visionary', role: 'Architect', color: '#9d4edd', description: 'High-reach generative expansion' },
    { id: 'PRAGMATIST', label: 'Pragmatic Executor', role: 'Execution', color: '#22d3ee', description: 'Direct implementation' },
    { id: 'SYNTHESIZER', label: 'Holistic Integrator', role: 'Harmony', color: '#10b981', description: 'Balanced convergence' },
    { id: 'ANALYST', label: 'Data Oracle', role: 'Intelligence', color: '#f59e0b', description: 'Deep quantitative analysis' },
  ],
}));

vi.mock('../../services/persistenceService', () => ({
  neuralVault: {
    saveArtifact: vi.fn().mockResolvedValue('artifact-id'),
  },
}));

vi.mock('../../services/audioService', () => ({
  audio: {
    playSuccess: vi.fn(),
    playError: vi.fn(),
    playClick: vi.fn(),
  },
}));

vi.mock('../../services/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../Visualizations/TugOfWarChart', () => ({
  TugOfWarChart: () => <div data-testid="tug-of-war">TugOfWarChart</div>,
}));

vi.mock('../Visualizations/AgentGraveyard', () => ({
  AgentGraveyard: () => <div data-testid="agent-graveyard">AgentGraveyard</div>,
}));

vi.mock('../ExperimentLogger', () => ({
  ExperimentLogger: () => <div data-testid="experiment-logger">ExperimentLogger</div>,
}));

vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
    h1: React.forwardRef(({ children, ...props }: any, ref: any) => <h1 ref={ref} {...props}>{children}</h1>),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('lucide-react', () => {
  const icon = (props: any) => <span {...props}>Icon</span>;
  return {
    BrainCircuit: icon, Zap: icon, Layers: icon, Cpu: icon, ArrowRight: icon,
    CheckCircle2: icon, Loader2: icon, GitBranch: icon, GitCommit: icon,
    AlertOctagon: icon, Save: icon, ExternalLink: icon, Dna: icon, Info: icon,
    Settings2: icon, Sliders: icon, X: icon, MessageSquareCode: icon,
    ShieldCheck: icon, Activity: icon, Target: icon, Gauge: icon, Users: icon,
    TrendingUp: icon, FlaskConical: icon,
  };
});

import BicameralEngine from '../BicameralEngine';

describe('BicameralEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasGeminiKey.mockReturnValue(true);
  });

  it('renders Architect Core heading', () => {
    render(<BicameralEngine />);
    expect(screen.getByText('Architect Core')).toBeTruthy();
  });

  it('renders DNA profile buttons', () => {
    render(<BicameralEngine />);
    expect(screen.getByText('Logical Skeptic')).toBeTruthy();
    expect(screen.getByText('Neural Visionary')).toBeTruthy();
    expect(screen.getByText('Pragmatic Executor')).toBeTruthy();
  });

  it('renders Goal Manifest textarea', () => {
    render(<BicameralEngine />);
    expect(screen.getByPlaceholderText('Specify primary system goal...')).toBeTruthy();
  });

  it('renders Initialize Consensus button', () => {
    render(<BicameralEngine />);
    expect(screen.getByText('INITIALIZE CONSENSUS')).toBeTruthy();
  });

  it('renders Bicameral Core Standby when no active task', () => {
    render(<BicameralEngine />);
    expect(screen.getByText('Bicameral Core Standby')).toBeTruthy();
  });

  it('renders Queue Empty when plan is empty', () => {
    render(<BicameralEngine />);
    expect(screen.getByText('Queue Empty')).toBeTruthy();
  });

  it('renders settings button', () => {
    render(<BicameralEngine />);
    // The Settings2 button should exist
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders Neural Queue label', () => {
    render(<BicameralEngine />);
    expect(screen.getByText('Neural Queue')).toBeTruthy();
  });

  it('renders Swarm DNA Profile label', () => {
    render(<BicameralEngine />);
    expect(screen.getByText('Swarm DNA Profile')).toBeTruthy();
  });

  it('disables initialize button when goal is empty', () => {
    render(<BicameralEngine />);
    const btn = screen.getByText('INITIALIZE CONSENSUS');
    expect(btn.closest('button')?.disabled).toBe(true);
  });

  it('renders ExperimentLogger component', () => {
    render(<BicameralEngine />);
    expect(screen.getByTestId('experiment-logger')).toBeTruthy();
  });
});
