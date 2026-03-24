// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ============================================================================
// MOCKS
// ============================================================================

vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
    button: React.forwardRef(({ children, whileHover, whileTap, ...props }: any, ref: any) => <button ref={ref} {...props}>{children}</button>),
  },
}));

vi.mock('lucide-react', () => ({
  Zap: (props: any) => <span data-testid="icon-zap" {...props} />,
  Search: (props: any) => <span data-testid="icon-search" {...props} />,
  Bot: (props: any) => <span data-testid="icon-bot" {...props} />,
  ShieldAlert: (props: any) => <span data-testid="icon-shield-alert" {...props} />,
  RefreshCw: (props: any) => <span data-testid="icon-refresh" {...props} />,
  Trash2: (props: any) => <span data-testid="icon-trash" {...props} />,
  Terminal: (props: any) => <span data-testid="icon-terminal" {...props} />,
  Cpu: (props: any) => <span data-testid="icon-cpu" {...props} />,
  Activity: (props: any) => <span data-testid="icon-activity" {...props} />,
  Scan: (props: any) => <span data-testid="icon-scan" {...props} />,
  Gauge: (props: any) => <span data-testid="icon-gauge" {...props} />,
  Waves: (props: any) => <span data-testid="icon-waves" {...props} />,
  Fingerprint: (props: any) => <span data-testid="icon-fingerprint" {...props} />,
}));

const mockAddLog = vi.fn();
const mockToggleTerminal = vi.fn();
const mockSetDiagnosticsOpen = vi.fn();
const mockPlayClick = vi.fn();

vi.mock('../../store', () => ({
  useAppStore: vi.fn(() => ({
    actions: {
      addLog: mockAddLog,
      toggleTerminal: mockToggleTerminal,
      setDiagnosticsOpen: mockSetDiagnosticsOpen,
    },
  })),
}));

vi.mock('../../services/audioService', () => ({
  audio: { playClick: mockPlayClick },
}));

vi.mock('../../utils/cn', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

import HolographicCommandDeck from '../HolographicCommandDeck';

describe('HolographicCommandDeck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the command deck container', () => {
    const { container } = render(<HolographicCommandDeck />);
    expect(container.querySelector('.fixed')).toBeTruthy();
  });

  it('renders the Neural_Load stress gauge', () => {
    render(<HolographicCommandDeck />);
    expect(screen.getByText('Neural_Load')).toBeTruthy();
  });

  it('renders the Auth_Token section', () => {
    render(<HolographicCommandDeck />);
    expect(screen.getByText('Auth_Token')).toBeTruthy();
    expect(screen.getByText('0xFD2..9A')).toBeTruthy();
  });

  it('renders all 5 command buttons with labels', () => {
    render(<HolographicCommandDeck />);
    expect(screen.getByText('[ROOT_SHELL]')).toBeTruthy();
    expect(screen.getByText('[DEEP_PROBE]')).toBeTruthy();
    expect(screen.getByText('[SPAWN_NODE]')).toBeTruthy();
    expect(screen.getByText('[LATTICE_SYNC]')).toBeTruthy();
    expect(screen.getByText('[DIAGNOSTICS]')).toBeTruthy();
  });

  it('calls toggleTerminal when ROOT_SHELL button is clicked', () => {
    render(<HolographicCommandDeck />);
    const rootShellLabel = screen.getByText('[ROOT_SHELL]');
    const button = rootShellLabel.closest('button')!;
    fireEvent.click(button);
    expect(mockPlayClick).toHaveBeenCalled();
    expect(mockToggleTerminal).toHaveBeenCalled();
  });

  it('calls addLog when DEEP_PROBE button is clicked', () => {
    render(<HolographicCommandDeck />);
    const label = screen.getByText('[DEEP_PROBE]');
    const button = label.closest('button')!;
    fireEvent.click(button);
    expect(mockPlayClick).toHaveBeenCalled();
    expect(mockAddLog).toHaveBeenCalledWith('SYSTEM', 'COMMAND_DECK: Dispatching multi-vector scan...');
  });

  it('calls addLog when SPAWN_NODE button is clicked', () => {
    render(<HolographicCommandDeck />);
    const label = screen.getByText('[SPAWN_NODE]');
    const button = label.closest('button')!;
    fireEvent.click(button);
    expect(mockAddLog).toHaveBeenCalledWith('INFO', 'COMMAND_DECK: Initializing autonomic node spawning...');
  });

  it('calls setDiagnosticsOpen when DIAGNOSTICS button is clicked', () => {
    render(<HolographicCommandDeck />);
    const label = screen.getByText('[DIAGNOSTICS]');
    const button = label.closest('button')!;
    fireEvent.click(button);
    expect(mockSetDiagnosticsOpen).toHaveBeenCalledWith(true);
  });

  it('calls addLog when LATTICE_SYNC button is clicked', () => {
    render(<HolographicCommandDeck />);
    const label = screen.getByText('[LATTICE_SYNC]');
    const button = label.closest('button')!;
    fireEvent.click(button);
    expect(mockAddLog).toHaveBeenCalledWith('SYSTEM', 'COMMAND_DECK: Calibrating global coherence...');
  });

  it('renders Gauge and Fingerprint icons', () => {
    render(<HolographicCommandDeck />);
    expect(screen.getByTestId('icon-gauge')).toBeTruthy();
    expect(screen.getByTestId('icon-fingerprint')).toBeTruthy();
  });
});
