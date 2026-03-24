// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ============================================================================
// MOCKS
// ============================================================================

const mockToggleTerminal = vi.hoisted(() => vi.fn());
const mockAddDockItem = vi.hoisted(() => vi.fn());
const mockRemoveDockItem = vi.hoisted(() => vi.fn());
const mockAddLog = vi.hoisted(() => vi.fn());

const mockStoreState = vi.hoisted(() => ({
  system: {
    isTerminalOpen: false,
    logs: [] as any[],
    dockItems: [] as any[],
  },
  research: { tasks: [] },
  voice: { isActive: false },
  bicameral: { isSwarming: false, isPlanning: false },
  process: { isLoading: false },
  codeStudio: { isLoading: false, isExecuting: false, generatedCode: null, language: null },
  hardware: { isLoading: false },
  imageGen: { generatedImage: null },
  focusedSelector: null,
  actions: {
    toggleTerminal: mockToggleTerminal,
    addDockItem: mockAddDockItem,
    removeDockItem: mockRemoveDockItem,
    addLog: mockAddLog,
  },
}));

vi.mock('../../store', () => ({
  useAppStore: () => mockStoreState,
}));

vi.mock('../../utils/cn', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

vi.mock('../../hooks/usePerspectiveRefraction', () => ({
  usePerspectiveRefraction: () => ({
    ref: { current: null },
    style: {},
    onMouseMove: vi.fn(),
    onMouseLeave: vi.fn(),
  }),
}));

vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('lucide-react', () => {
  const React = require('react');
  const i = (props: any) => React.createElement('span', null, props?.children);
  return {
    Terminal: i, Image: i, Code: i, FileText: i, X: i, Maximize2: i, Trash2: i,
    Cpu: i, Activity: i, Download: i, Copy: i, ExternalLink: i, Zap: i,
    BrainCircuit: i, Radio: i, Loader2: i, GitBranch: i, Scan: i,
  };
});

import OverlayOS from '../OverlayOS';

// ============================================================================
// TESTS
// ============================================================================

describe('OverlayOS', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState.system.isTerminalOpen = false;
    mockStoreState.system.logs = [];
    mockStoreState.system.dockItems = [];
    mockStoreState.imageGen.generatedImage = null;
    mockStoreState.codeStudio.generatedCode = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<OverlayOS />);
    expect(container).toBeTruthy();
  });

  it('does not render terminal when isTerminalOpen is false', () => {
    render(<OverlayOS />);
    expect(screen.queryByText(/System Mind/)).toBeNull();
  });

  it('renders terminal when isTerminalOpen is true', () => {
    mockStoreState.system.isTerminalOpen = true;
    render(<OverlayOS />);
    expect(screen.getByText(/System Mind/)).toBeTruthy();
  });

  it('renders the command input when terminal is open', () => {
    mockStoreState.system.isTerminalOpen = true;
    render(<OverlayOS />);
    const input = screen.getByLabelText('System command input');
    expect(input).toBeTruthy();
  });

  it('calls toggleTerminal on backtick keypress', () => {
    render(<OverlayOS />);
    fireEvent.keyDown(window, { key: '`' });
    expect(mockToggleTerminal).toHaveBeenCalled();
  });

  it('calls toggleTerminal on tilde keypress', () => {
    render(<OverlayOS />);
    fireEvent.keyDown(window, { key: '~' });
    expect(mockToggleTerminal).toHaveBeenCalled();
  });

  it('handles command input and Enter key in terminal', () => {
    mockStoreState.system.isTerminalOpen = true;
    render(<OverlayOS />);
    const input = screen.getByLabelText('System command input');
    fireEvent.change(input, { target: { value: 'help' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockAddLog).toHaveBeenCalledWith('SYSTEM', '> help');
    expect(mockAddLog).toHaveBeenCalledWith('INFO', 'Available: help, clear, status, reboot');
  });

  it('shows VOICE_CORE status based on voice.isActive', () => {
    mockStoreState.system.isTerminalOpen = true;
    mockStoreState.voice.isActive = false;
    render(<OverlayOS />);
    expect(screen.getByText(/VOICE_CORE: STANDBY/)).toBeTruthy();
  });

  it('does not render dock when no dock items', () => {
    mockStoreState.system.dockItems = [];
    render(<OverlayOS />);
    // QuantumDock returns null when empty
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders dock items when they exist', () => {
    mockStoreState.system.dockItems = [
      { id: 'img-1', type: 'IMAGE', label: 'IMG: test...', content: 'url', timestamp: 1 },
    ];
    const { container } = render(<OverlayOS />);
    // The dock renders icon containers for each item (tooltip only shows on hover)
    const iconBox = container.querySelector('.w-12.h-12');
    expect(iconBox).toBeTruthy();
  });
});
