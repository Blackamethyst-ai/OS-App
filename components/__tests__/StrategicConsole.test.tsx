// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mocks
const mockAddLog = vi.hoisted(() => vi.fn());
const mockUpdateAgent = vi.hoisted(() => vi.fn());
const mockPlayClick = vi.hoisted(() => vi.fn());
const mockPlaySuccess = vi.hoisted(() => vi.fn());
const mockPlayError = vi.hoisted(() => vi.fn());
const mockAnalyzeLayer = vi.hoisted(() => vi.fn());
const mockGenerateStrategy = vi.hoisted(() => vi.fn());

vi.mock('../../store', () => ({
  useAppStore: () => ({
    actions: {
      addLog: mockAddLog,
      updateAgent: mockUpdateAgent,
    },
    agents: {
      activeAgents: [],
    },
  }),
}));

vi.mock('motion/react', () => ({
  motion: {
    div: 'div',
    span: 'span',
    button: 'button',
  },
  AnimatePresence: ({ children }: any) => children,
}));

vi.mock('lucide-react', () => ({
  Activity: (props: any) => <span data-testid="icon-activity" {...props} />,
  Shield: (props: any) => <span data-testid="icon-shield" {...props} />,
  Cpu: (props: any) => <span data-testid="icon-cpu" {...props} />,
  Zap: (props: any) => <span data-testid="icon-zap" {...props} />,
  Radio: (props: any) => <span data-testid="icon-radio" {...props} />,
  Globe: (props: any) => <span data-testid="icon-globe" {...props} />,
  ArrowRight: (props: any) => <span data-testid="icon-arrow-right" {...props} />,
  Loader2: (props: any) => <span data-testid="icon-loader2" {...props} />,
  AlertTriangle: (props: any) => <span data-testid="icon-alert-triangle" {...props} />,
  CheckCircle2: (props: any) => <span data-testid="icon-check" {...props} />,
  Layers: (props: any) => <span data-testid="icon-layers" {...props} />,
  Terminal: (props: any) => <span data-testid="icon-terminal" {...props} />,
  Play: (props: any) => <span data-testid="icon-play" {...props} />,
}));

vi.mock('../../services/metaventionService', () => ({
  metaventionService: {
    analyzeLayer: mockAnalyzeLayer,
    generateStrategy: mockGenerateStrategy,
  },
}));

vi.mock('../../services/audioService', () => ({
  audio: {
    playClick: mockPlayClick,
    playSuccess: mockPlaySuccess,
    playError: mockPlayError,
  },
}));

vi.mock('../../utils/cn', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

import { StrategicConsole } from '../StrategicConsole';

describe('StrategicConsole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAnalyzeLayer.mockResolvedValue({
      integrity: 85,
      threats: ['Latency spike', 'Node dropout'],
      opportunities: ['Scale expansion'],
    });
    mockGenerateStrategy.mockResolvedValue({
      title: 'Counter Strategy Alpha',
      steps: ['Step 1', 'Step 2'],
    });
  });

  it('renders the Command Deck header', () => {
    render(<StrategicConsole />);
    expect(screen.getByText('Command Deck')).toBeDefined();
  });

  it('renders all three layer options', () => {
    render(<StrategicConsole />);
    expect(screen.getByText('Physical Infra')).toBeDefined();
    expect(screen.getByText('Swarm Intel')).toBeDefined();
    expect(screen.getByText('Capital Flow')).toBeDefined();
  });

  it('shows Target Stratum label', () => {
    render(<StrategicConsole />);
    expect(screen.getByText('Target Stratum')).toBeDefined();
  });

  it('shows the Run Stratum Diagnostics button initially', () => {
    render(<StrategicConsole />);
    expect(screen.getByText('Run Stratum Diagnostics')).toBeDefined();
  });

  it('selects a different layer when clicked', () => {
    render(<StrategicConsole />);
    const swarmBtn = screen.getByText('Swarm Intel');
    fireEvent.click(swarmBtn);
    expect(mockPlayClick).toHaveBeenCalled();
  });

  it('runs analysis when diagnostics button is clicked', async () => {
    render(<StrategicConsole />);
    const diagBtn = screen.getByText('Run Stratum Diagnostics');
    fireEvent.click(diagBtn);

    expect(mockAddLog).toHaveBeenCalledWith('SYSTEM', expect.stringContaining('LAYER_SCAN'));
    expect(mockPlayClick).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText('85%')).toBeDefined();
    });
    expect(mockPlaySuccess).toHaveBeenCalled();
  });

  it('shows threats after analysis completes', async () => {
    render(<StrategicConsole />);
    fireEvent.click(screen.getByText('Run Stratum Diagnostics'));

    await waitFor(() => {
      expect(screen.getByText('Latency spike')).toBeDefined();
      expect(screen.getByText('Node dropout')).toBeDefined();
    });
  });

  it('shows Deploy Counter-Strategy button after analysis', async () => {
    render(<StrategicConsole />);
    fireEvent.click(screen.getByText('Run Stratum Diagnostics'));

    await waitFor(() => {
      expect(screen.getByText('Deploy Counter-Strategy')).toBeDefined();
    });
  });

  it('handles analysis error gracefully', async () => {
    mockAnalyzeLayer.mockRejectedValueOnce(new Error('probe failed'));
    render(<StrategicConsole />);
    fireEvent.click(screen.getByText('Run Stratum Diagnostics'));

    await waitFor(() => {
      expect(mockAddLog).toHaveBeenCalledWith('ERROR', 'LAYER_SCAN: Probe failed.');
    });
    expect(mockPlayError).toHaveBeenCalled();
  });

  it('shows Integrity label in analysis view', async () => {
    render(<StrategicConsole />);
    fireEvent.click(screen.getByText('Run Stratum Diagnostics'));

    await waitFor(() => {
      expect(screen.getByText('Integrity')).toBeDefined();
    });
  });
});
