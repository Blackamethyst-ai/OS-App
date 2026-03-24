// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ============================================================================
// MOCKS
// ============================================================================

vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('lucide-react', () => ({
  Users: (props: any) => <span data-testid="icon-users" {...props} />,
  X: (props: any) => <span data-testid="icon-x" {...props} />,
  Globe: (props: any) => <span data-testid="icon-globe" {...props} />,
  Activity: (props: any) => <span data-testid="icon-activity" {...props} />,
  Terminal: (props: any) => <span data-testid="icon-terminal" {...props} />,
  Shield: (props: any) => <span data-testid="icon-shield" {...props} />,
  Zap: (props: any) => <span data-testid="icon-zap" {...props} />,
  Target: (props: any) => <span data-testid="icon-target" {...props} />,
}));

const mockSetCollabState = vi.fn();

let mockCollaboration = {
  peers: [
    { id: 'p1', name: 'Alice', role: 'Architect', color: '#22d3ee', activeSector: 'Core', lastSeen: Date.now() - 5000 },
    { id: 'p2', name: 'Bob', role: 'Engineer', color: '#a78bfa', activeSector: 'Services', lastSeen: Date.now() - 12000 },
  ],
  events: [
    { id: 'e1', userName: 'Alice', action: 'Deployed module', target: 'core-v2', timestamp: Date.now() - 3000 },
  ],
  isOverlayOpen: true,
};

vi.mock('../../store', () => ({
  useAppStore: vi.fn(() => ({
    collaboration: mockCollaboration,
    actions: { setCollabState: mockSetCollabState },
  })),
}));

vi.mock('../../types', () => ({
  AppMode: {},
}));

import PeerMeshOverlay from '../PeerMeshOverlay';

describe('PeerMeshOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollaboration = {
      peers: [
        { id: 'p1', name: 'Alice', role: 'Architect', color: '#22d3ee', activeSector: 'Core', lastSeen: Date.now() - 5000 },
        { id: 'p2', name: 'Bob', role: 'Engineer', color: '#a78bfa', activeSector: 'Services', lastSeen: Date.now() - 12000 },
      ],
      events: [
        { id: 'e1', userName: 'Alice', action: 'Deployed module', target: 'core-v2', timestamp: Date.now() - 3000 },
      ],
      isOverlayOpen: true,
    };
  });

  it('renders the overlay dialog when isOverlayOpen is true', () => {
    render(<PeerMeshOverlay />);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('renders nothing when isOverlayOpen is false', () => {
    mockCollaboration.isOverlayOpen = false;
    const { container } = render(<PeerMeshOverlay />);
    expect(container.innerHTML).toBe('');
  });

  it('shows the header title', () => {
    render(<PeerMeshOverlay />);
    expect(screen.getByText('Peer Mesh // Swarm Protocol')).toBeTruthy();
  });

  it('shows the peer count', () => {
    render(<PeerMeshOverlay />);
    expect(screen.getByText('2 Nodes Connected')).toBeTruthy();
  });

  it('renders each peer name', () => {
    render(<PeerMeshOverlay />);
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
  });

  it('renders peer roles', () => {
    render(<PeerMeshOverlay />);
    expect(screen.getByText('Architect // LVL 4')).toBeTruthy();
    expect(screen.getByText('Engineer // LVL 4')).toBeTruthy();
  });

  it('renders peer active sectors', () => {
    render(<PeerMeshOverlay />);
    expect(screen.getByText((_content, element) => {
      return element?.textContent?.includes('Core') ?? false;
    })).toBeTruthy();
  });

  it('renders event stream entries', () => {
    render(<PeerMeshOverlay />);
    expect(screen.getByText('Deployed module')).toBeTruthy();
    expect(screen.getByText('[core-v2]')).toBeTruthy();
  });

  it('shows "Signal Quiet" when there are no events', () => {
    mockCollaboration.events = [];
    render(<PeerMeshOverlay />);
    expect(screen.getByText('Signal Quiet')).toBeTruthy();
  });

  it('closes overlay when close button is clicked', () => {
    render(<PeerMeshOverlay />);
    const closeBtn = screen.getByLabelText('Close peer mesh overlay');
    fireEvent.click(closeBtn);
    expect(mockSetCollabState).toHaveBeenCalledWith({ isOverlayOpen: false });
  });

  it('closes overlay when backdrop is clicked', () => {
    render(<PeerMeshOverlay />);
    const backdrop = screen.getByRole('presentation');
    fireEvent.click(backdrop);
    expect(mockSetCollabState).toHaveBeenCalledWith({ isOverlayOpen: false });
  });

  it('closes overlay on Escape key', () => {
    render(<PeerMeshOverlay />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockSetCollabState).toHaveBeenCalledWith({ isOverlayOpen: false });
  });

  it('shows the footer status text', () => {
    render(<PeerMeshOverlay />);
    expect(screen.getByText('End-to-End Encrypted')).toBeTruthy();
    expect(screen.getByText('Low Latency Sync')).toBeTruthy();
    expect(screen.getByText('Sovereign Swarm Architecture')).toBeTruthy();
  });
});
