// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ============================================================================
// MOCKS
// ============================================================================

const mockToggleTerminal = vi.hoisted(() => vi.fn());
const mockSetDiagnosticsOpen = vi.hoisted(() => vi.fn());
const mockSetSidebarOpen = vi.hoisted(() => vi.fn());
const mockHydrateAgents = vi.hoisted(() => vi.fn());
const mockAddLog = vi.hoisted(() => vi.fn());
const mockProbeScreen = vi.hoisted(() => vi.fn());
const mockPlayClick = vi.hoisted(() => vi.fn());

const mockStoreState = vi.hoisted(() => ({
  system: { isTerminalOpen: false },
  isDiagnosticsOpen: false,
  isSidebarOpen: false,
  agents: { activeAgents: [] as any[] },
  actions: {
    setDiagnosticsOpen: mockSetDiagnosticsOpen,
    setSidebarOpen: mockSetSidebarOpen,
    toggleTerminal: mockToggleTerminal,
    hydrateAgents: mockHydrateAgents,
    addLog: mockAddLog,
  },
}));

vi.mock('../../store', () => ({
  useAppStore: Object.assign(
    () => mockStoreState,
    { getState: () => mockStoreState }
  ),
}));

vi.mock('../../hooks/useVisualCortex', () => ({
  useVisualCortex: () => ({
    probeScreen: mockProbeScreen,
    isProbing: false,
  }),
}));

vi.mock('../../services/audioService', () => ({
  audio: {
    playClick: mockPlayClick,
    playTransition: vi.fn(),
  },
}));

vi.mock('../../utils/cn', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

vi.mock('../../services/powerService', () => ({
  powerService: {
    getConfig: () => ({ mode: 'STANDARD' }),
  },
}));

vi.mock('../research/EvolutionConsole', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? <div data-testid="evolution-console"><button onClick={onClose}>close-evo</button></div> : null,
}));

vi.mock('../hardware/PowerControlPanel', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? <div data-testid="power-panel"><button onClick={onClose}>close-power</button></div> : null,
}));

vi.mock('../NeuralDebuggerPanel', () => ({
  NeuralDebuggerPanel: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? <div data-testid="neural-debugger"><button onClick={onClose}>close-debug</button></div> : null,
}));

vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef(({ children, className, ...props }: any, ref: any) => <div ref={ref} className={className} data-testid="motion-dock">{children}</div>),
    button: React.forwardRef(({ children, onClick, className, ...props }: any, ref: any) => <button ref={ref} onClick={onClick} className={className}>{children}</button>),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('lucide-react', () => ({
  Terminal: () => <span>Terminal</span>,
  Scan: () => <span>Scan</span>,
  Bot: () => <span>Bot</span>,
  RefreshCw: () => <span>RefreshCw</span>,
  ShieldAlert: () => <span>ShieldAlert</span>,
  PanelRight: () => <span>PanelRight</span>,
  Dna: () => <span>Dna</span>,
  Activity: () => <span>Activity</span>,
  Battery: () => <span>Battery</span>,
}));

import NeuralDock from '../NeuralDock';

// ============================================================================
// TESTS
// ============================================================================

describe('NeuralDock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState.system.isTerminalOpen = false;
    mockStoreState.isDiagnosticsOpen = false;
    mockStoreState.isSidebarOpen = false;
  });

  it('renders without crashing', () => {
    const { container } = render(<NeuralDock />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders all dock icon labels as tooltips', () => {
    render(<NeuralDock />);
    // Labels appear both as tooltip text and as icon mock text, so use getAllByText
    expect(screen.getAllByText('Terminal').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Visual Cortex')).toBeTruthy();
    expect(screen.getByText('Swarm Sync')).toBeTruthy();
    expect(screen.getByText('Sync Hub')).toBeTruthy();
  });

  it('calls toggleTerminal when terminal icon is clicked', () => {
    render(<NeuralDock />);
    // The first button is Terminal
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(mockPlayClick).toHaveBeenCalled();
    expect(mockToggleTerminal).toHaveBeenCalled();
  });

  it('calls probeScreen when visual cortex icon is clicked', () => {
    render(<NeuralDock />);
    const buttons = screen.getAllByRole('button');
    // Second button after divider is Visual Cortex (index 1)
    fireEvent.click(buttons[1]);
    expect(mockProbeScreen).toHaveBeenCalled();
  });

  it('calls hydrateAgents and addLog when swarm sync icon is clicked', () => {
    render(<NeuralDock />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[2]);
    expect(mockHydrateAgents).toHaveBeenCalled();
    expect(mockAddLog).toHaveBeenCalledWith('SYSTEM', expect.stringContaining('SWARM'));
  });

  it('calls addLog when sync hub icon is clicked', () => {
    render(<NeuralDock />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[3]);
    expect(mockAddLog).toHaveBeenCalledWith('SYSTEM', expect.stringContaining('LATTICE'));
  });

  it('toggles diagnostics panel on click', () => {
    mockStoreState.isDiagnosticsOpen = false;
    render(<NeuralDock />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[4]);
    expect(mockSetDiagnosticsOpen).toHaveBeenCalledWith(true);
  });

  it('toggles sidebar on operations button click', () => {
    mockStoreState.isSidebarOpen = false;
    render(<NeuralDock />);
    const buttons = screen.getAllByRole('button');
    // Last dock icon (index 8) is PanelRight / Operations
    fireEvent.click(buttons[8]);
    expect(mockSetSidebarOpen).toHaveBeenCalledWith(true);
  });

  it('accepts mode prop for static layout', () => {
    const { container } = render(<NeuralDock mode="static" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('accepts className prop', () => {
    render(<NeuralDock className="custom-class" />);
    const dock = screen.getByTestId('motion-dock');
    expect(dock.className).toContain('custom-class');
  });
});
