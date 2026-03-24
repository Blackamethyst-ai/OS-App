// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ============================================================================
// MOCKS
// ============================================================================

vi.mock('motion/react', () => ({
  motion: {
    div: 'div',
    aside: 'aside',
    span: 'span',
    button: 'button',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('lucide-react', () => ({
  X: (props: Record<string, unknown>) => <span data-testid="icon-x" {...props} />,
  ListTodo: (props: Record<string, unknown>) => <span data-testid="icon-list-todo" {...props} />,
  Zap: (props: Record<string, unknown>) => <span data-testid="icon-zap" {...props} />,
  Activity: (props: Record<string, unknown>) => <span data-testid="icon-activity" {...props} />,
}));

const mockSetSidebarOpen = vi.hoisted(() => vi.fn());

vi.mock('../../store', () => ({
  useAppStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      actions: {
        setSidebarOpen: mockSetSidebarOpen,
      },
    };
    return selector(state);
  },
}));

vi.mock('../research/ResearchTray', () => ({
  default: () => <div data-testid="research-tray">ResearchTray</div>,
}));

import OperationalSidebar from '../OperationalSidebar';

describe('OperationalSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the sidebar', () => {
    const { container } = render(<OperationalSidebar />);
    expect(container.firstChild).toBeTruthy();
  });

  it('displays the Operational Suite title', () => {
    render(<OperationalSidebar />);
    expect(screen.getByText('Operational Suite')).toBeTruthy();
  });

  it('renders the ResearchTray component', () => {
    render(<OperationalSidebar />);
    expect(screen.getByTestId('research-tray')).toBeTruthy();
  });

  it('calls setSidebarOpen(false) when close button is clicked', () => {
    render(<OperationalSidebar />);
    const closeIcon = screen.getByTestId('icon-x');
    const closeButton = closeIcon.closest('button');
    fireEvent.click(closeButton!);
    expect(mockSetSidebarOpen).toHaveBeenCalledWith(false);
  });

  it('displays the Research Signal Swarm section heading', () => {
    render(<OperationalSidebar />);
    expect(screen.getByText('Research Signal Swarm')).toBeTruthy();
  });

  it('displays the Lattice Diagnostics section heading', () => {
    render(<OperationalSidebar />);
    expect(screen.getByText('Lattice Diagnostics')).toBeTruthy();
  });

  it('displays the footer status information', () => {
    render(<OperationalSidebar />);
    expect(screen.getByText('Auth_Gate: PASS')).toBeTruthy();
    expect(screen.getByText('L0_Link: Stable')).toBeTruthy();
    expect(screen.getByText('Zenith_OS_v1.0')).toBeTruthy();
  });

  it('shows the Awaiting Deep Integration placeholder', () => {
    render(<OperationalSidebar />);
    expect(screen.getByText('Awaiting Deep Integration...')).toBeTruthy();
  });
});
