// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mocks
const mockCloseContextMenu = vi.hoisted(() => vi.fn());
const mockToggleTerminal = vi.hoisted(() => vi.fn());
const mockSetDiagnosticsOpen = vi.hoisted(() => vi.fn());
const mockSetMode = vi.hoisted(() => vi.fn());
const mockOpenHoloProjector = vi.hoisted(() => vi.fn());
const mockToggleCommandPalette = vi.hoisted(() => vi.fn());
const mockAddLog = vi.hoisted(() => vi.fn());
const mockPlayClick = vi.hoisted(() => vi.fn());

const mockContextMenu = vi.hoisted(() => ({
  isOpen: false,
  x: 100,
  y: 200,
}));

vi.mock('../../store', () => ({
  useAppStore: () => ({
    contextMenu: mockContextMenu,
    actions: {
      closeContextMenu: mockCloseContextMenu,
      toggleTerminal: mockToggleTerminal,
      setDiagnosticsOpen: mockSetDiagnosticsOpen,
      setMode: mockSetMode,
      openHoloProjector: mockOpenHoloProjector,
      toggleCommandPalette: mockToggleCommandPalette,
      addLog: mockAddLog,
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
  Eye: (props: any) => <span data-testid="icon-eye" {...props} />,
  Copy: (props: any) => <span data-testid="icon-copy" {...props} />,
  Search: (props: any) => <span data-testid="icon-search" {...props} />,
  ArrowUpRight: (props: any) => <span data-testid="icon-arrow" {...props} />,
  Activity: (props: any) => <span data-testid="icon-activity" {...props} />,
  Terminal: (props: any) => <span data-testid="icon-terminal" {...props} />,
  Hash: (props: any) => <span data-testid="icon-hash" {...props} />,
  ShieldCheck: (props: any) => <span data-testid="icon-shield" {...props} />,
  Zap: (props: any) => <span data-testid="icon-zap" {...props} />,
  X: (props: any) => <span data-testid="icon-x" {...props} />,
}));

vi.mock('../../services/audioService', () => ({
  audio: {
    playClick: mockPlayClick,
  },
}));

vi.mock('../../utils/cn', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

vi.mock('../../types', () => ({
  AppMode: {
    METAVENTIONS_HUB: 'METAVENTIONS_HUB',
  },
}));

import SynapticContextHub from '../SynapticContextHub';

describe('SynapticContextHub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContextMenu.isOpen = false;
    mockContextMenu.x = 100;
    mockContextMenu.y = 200;
  });

  it('renders nothing when context menu is closed', () => {
    const { container } = render(<SynapticContextHub />);
    // AnimatePresence renders children, but isOpen is false so the inner motion.div won't render
    expect(screen.queryByText('Synaptic Context Hub')).toBeNull();
  });

  it('renders the hub when context menu is open', () => {
    mockContextMenu.isOpen = true;
    render(<SynapticContextHub />);
    expect(screen.getByText('Synaptic Context Hub')).toBeDefined();
  });

  it('shows all primary action items', () => {
    mockContextMenu.isOpen = true;
    render(<SynapticContextHub />);
    expect(screen.getByText('Holo Project')).toBeDefined();
    expect(screen.getByText('Buffer Copy')).toBeDefined();
    expect(screen.getByText('Grounding Search')).toBeDefined();
  });

  it('shows system navigation items', () => {
    mockContextMenu.isOpen = true;
    render(<SynapticContextHub />);
    expect(screen.getByText('Hub')).toBeDefined();
    expect(screen.getByText('Diagnostics')).toBeDefined();
    expect(screen.getByText('Terminal')).toBeDefined();
  });

  it('calls toggleTerminal and closeContextMenu when Terminal is clicked', () => {
    mockContextMenu.isOpen = true;
    render(<SynapticContextHub />);
    const terminalBtn = screen.getByText('Terminal');
    fireEvent.click(terminalBtn);
    expect(mockToggleTerminal).toHaveBeenCalled();
    expect(mockCloseContextMenu).toHaveBeenCalled();
  });

  it('calls setDiagnosticsOpen and closeContextMenu when Diagnostics is clicked', () => {
    mockContextMenu.isOpen = true;
    render(<SynapticContextHub />);
    const diagBtn = screen.getByText('Diagnostics');
    fireEvent.click(diagBtn);
    expect(mockSetDiagnosticsOpen).toHaveBeenCalledWith(true);
    expect(mockCloseContextMenu).toHaveBeenCalled();
  });

  it('calls setMode and closeContextMenu when Hub is clicked', () => {
    mockContextMenu.isOpen = true;
    render(<SynapticContextHub />);
    const hubBtn = screen.getByText('Hub');
    fireEvent.click(hubBtn);
    expect(mockSetMode).toHaveBeenCalledWith('METAVENTIONS_HUB');
    expect(mockCloseContextMenu).toHaveBeenCalled();
  });

  it('calls closeContextMenu when close button is clicked', () => {
    mockContextMenu.isOpen = true;
    render(<SynapticContextHub />);
    // The close button contains the X icon
    const buttons = screen.getAllByRole('button');
    // Last button is the close button (absolute top-2 right-2)
    const closeBtn = buttons[buttons.length - 1];
    fireEvent.click(closeBtn);
    expect(mockCloseContextMenu).toHaveBeenCalled();
  });

  it('shows Metaventions-Hub sub label', () => {
    mockContextMenu.isOpen = true;
    render(<SynapticContextHub />);
    expect(screen.getByText('Metaventions-Hub')).toBeDefined();
  });
});
