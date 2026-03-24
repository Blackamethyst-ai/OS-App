// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mocks
const mockCpb = vi.hoisted(() => ({
  isActive: false,
  phase: 'idle' as string,
  path: 'direct',
  progress: 0,
  message: '',
  error: '',
  lastResult: null as any,
}));

vi.mock('../../store', () => ({
  useAppStore: () => ({
    cpb: mockCpb,
  }),
}));

vi.mock('motion/react', () => ({
  motion: {
    div: 'div',
    span: 'span',
    circle: 'circle',
  },
  AnimatePresence: ({ children }: any) => children,
}));

vi.mock('lucide-react', () => ({
  Brain: (props: any) => <span data-testid="icon-brain" {...props} />,
  Zap: (props: any) => <span data-testid="icon-zap" {...props} />,
  Layers: (props: any) => <span data-testid="icon-layers" {...props} />,
  Users: (props: any) => <span data-testid="icon-users" {...props} />,
  Shield: (props: any) => <span data-testid="icon-shield" {...props} />,
  CheckCircle: (props: any) => <span data-testid="icon-check-circle" {...props} />,
  Loader2: (props: any) => <span data-testid="icon-loader2" {...props} />,
  AlertCircle: (props: any) => <span data-testid="icon-alert-circle" {...props} />,
  Sparkles: (props: any) => <span data-testid="icon-sparkles" {...props} />,
  Activity: (props: any) => <span data-testid="icon-activity" {...props} />,
}));

vi.mock('../../utils/cn', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

import CPBStatusOverlay from '../CPBStatusOverlay';

describe('CPBStatusOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCpb.isActive = false;
    mockCpb.phase = 'idle';
    mockCpb.path = 'direct';
    mockCpb.progress = 0;
    mockCpb.message = '';
    mockCpb.error = '';
    mockCpb.lastResult = null;
  });

  it('renders nothing when idle and not active', () => {
    const { container } = render(<CPBStatusOverlay />);
    expect(container.innerHTML).toBe('');
  });

  it('renders when active and processing', () => {
    mockCpb.isActive = true;
    mockCpb.phase = 'analyzing';
    render(<CPBStatusOverlay />);
    expect(screen.getByText('Cognitive Precision Bridge')).toBeDefined();
  });

  it('shows the correct path label for direct path', () => {
    mockCpb.isActive = true;
    mockCpb.phase = 'analyzing';
    mockCpb.path = 'direct';
    render(<CPBStatusOverlay />);
    expect(screen.getByText('DIRECT')).toBeDefined();
    expect(screen.getByText('Fast path')).toBeDefined();
  });

  it('shows the correct path label for RLM path', () => {
    mockCpb.isActive = true;
    mockCpb.phase = 'compressing';
    mockCpb.path = 'rlm';
    render(<CPBStatusOverlay />);
    expect(screen.getByText('RLM')).toBeDefined();
    expect(screen.getByText('Context compression')).toBeDefined();
  });

  it('shows phase label from phase config', () => {
    mockCpb.isActive = true;
    mockCpb.phase = 'verifying';
    render(<CPBStatusOverlay />);
    expect(screen.getByText('Verifying')).toBeDefined();
  });

  it('displays a message when one is set', () => {
    mockCpb.isActive = true;
    mockCpb.phase = 'exploring';
    mockCpb.message = 'Searching context space...';
    render(<CPBStatusOverlay />);
    expect(screen.getByText('Searching context space...')).toBeDefined();
  });

  it('shows result details when phase is complete with lastResult', () => {
    mockCpb.isActive = false;
    mockCpb.phase = 'complete';
    mockCpb.lastResult = {
      dqScore: 0.85,
      executionTimeMs: 120,
      verified: true,
    };
    render(<CPBStatusOverlay />);
    expect(screen.getByText('85%')).toBeDefined();
    expect(screen.getByText('120ms')).toBeDefined();
    expect(screen.getByText('Verified')).toBeDefined();
    expect(screen.getByText('Complete')).toBeDefined();
  });

  it('shows error message when phase is error', () => {
    mockCpb.isActive = false;
    mockCpb.phase = 'error';
    mockCpb.error = 'Model timeout exceeded';
    render(<CPBStatusOverlay />);
    expect(screen.getByText('Model timeout exceeded')).toBeDefined();
    expect(screen.getByText('Error')).toBeDefined();
  });

  it('renders when active even if phase is idle (isActive overrides)', () => {
    mockCpb.isActive = true;
    mockCpb.phase = 'idle';
    // Component returns null when !isActive && phase === 'idle'
    // But isActive is true here, so it should render
    const { container } = render(<CPBStatusOverlay />);
    expect(container.innerHTML).not.toBe('');
  });

  it('falls back to direct config for unknown path', () => {
    mockCpb.isActive = true;
    mockCpb.phase = 'analyzing';
    mockCpb.path = 'unknown_path';
    render(<CPBStatusOverlay />);
    expect(screen.getByText('DIRECT')).toBeDefined();
  });
});
