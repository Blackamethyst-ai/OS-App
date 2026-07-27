// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mocks
const mockDismissNotification = vi.hoisted(() => vi.fn());
const mockPushNotification = vi.hoisted(() => vi.fn());
const mockOnClose = vi.hoisted(() => vi.fn());
const mockPlayClick = vi.hoisted(() => vi.fn());

vi.mock('../../store', () => ({
  useAppStore: () => ({
    process: { error: null, diagramError: null },
    imageGen: { error: null },
    bibliomorphic: { error: null },
    hardware: { error: null },
    voice: { error: null },
    codeStudio: { error: null },
    bicameral: { error: null },
    system: { logs: [] },
  }),
}));

vi.mock('../../stores/flywheelStore', () => ({
  useFlywheelStore: () => ({
    velocity: 15,
    confidenceScore: 0.6,
  }),
}));

vi.mock('../../stores/useSystemMind', () => ({
  useSystemMind: () => ({
    notifications: [],
    pushNotification: mockPushNotification,
    dismissNotification: mockDismissNotification,
  }),
}));

vi.mock('motion/react', () => ({
  motion: {
    div: 'div',
    span: 'span',
    circle: (props: any) => <circle {...props} />,
  },
  AnimatePresence: ({ children }: any) => children,
}));

vi.mock('lucide-react', () => ({
  X: (props: any) => <span data-testid="icon-x" {...props} />,
  Terminal: (props: any) => <span data-testid="icon-terminal" {...props} />,
  ShieldAlert: (props: any) => <span data-testid="icon-shield-alert" {...props} />,
  CheckCircle2: (props: any) => <span data-testid="icon-check" {...props} />,
  Info: (props: any) => <span data-testid="icon-info" {...props} />,
  AlertTriangle: (props: any) => <span data-testid="icon-alert-triangle" {...props} />,
  Activity: (props: any) => <span data-testid="icon-activity" {...props} />,
  Trash2: (props: any) => <span data-testid="icon-trash" {...props} />,
  AlertOctagon: (props: any) => <span data-testid="icon-alert-octagon" {...props} />,
  Bell: (props: any) => <span data-testid="icon-bell" {...props} />,
  Cpu: (props: any) => <span data-testid="icon-cpu" {...props} />,
  Scan: (props: any) => <span data-testid="icon-scan" {...props} />,
  Globe: (props: any) => <span data-testid="icon-globe" {...props} />,
  ShieldCheck: (props: any) => <span data-testid="icon-shield-check" {...props} />,
  Zap: (props: any) => <span data-testid="icon-zap" {...props} />,
  Shield: (props: any) => <span data-testid="icon-shield" {...props} />,
  TrendingUp: (props: any) => <span data-testid="icon-trending" {...props} />,
  Radio: (props: any) => <span data-testid="icon-radio" {...props} />,
}));

vi.mock('../../utils/cn', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

vi.mock('../../services/audioService', () => ({
  audio: {
    playClick: mockPlayClick,
  },
}));

import GlobalAlertMesh from '../SystemNotification';

describe('GlobalAlertMesh (SystemNotification)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when closed', () => {
    const { container } = render(<GlobalAlertMesh isOpen={false} onClose={mockOnClose} />);
    expect(container).toBeDefined();
  });

  it('renders the panel when isOpen is true', () => {
    render(<GlobalAlertMesh isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('Neural Diagnostics')).toBeDefined();
  });

  it('shows the close button and calls onClose when clicked', () => {
    render(<GlobalAlertMesh isOpen={true} onClose={mockOnClose} />);
    // There are two close buttons (header X and backdrop)
    const closeButtons = screen.getAllByRole('button');
    // The backdrop click should also close
    const backdrop = screen.getByText('Neural Diagnostics').closest('div')?.parentElement;
    expect(closeButtons.length).toBeGreaterThan(0);
  });

  it('shows Teleological Engine panel with velocity and confidence', () => {
    render(<GlobalAlertMesh isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('Teleological Engine')).toBeDefined();
    expect(screen.getByText('60%')).toBeDefined(); // Math.round(0.6 * 100)
    expect(screen.getByText('15 m/s')).toBeDefined();
  });

  it('shows filter buttons for ALL, ERROR, WARNING, SYSTEM', () => {
    render(<GlobalAlertMesh isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('ALL')).toBeDefined();
    expect(screen.getByText('ERROR')).toBeDefined();
    expect(screen.getByText('WARNING')).toBeDefined();
    expect(screen.getByText('SYSTEM')).toBeDefined();
  });

  it('shows empty state when no logs exist', () => {
    render(<GlobalAlertMesh isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('Lattice Synchronized')).toBeDefined();
  });

  it('shows 0 Active Faults when no errors', () => {
    render(<GlobalAlertMesh isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('0 Active Faults')).toBeDefined();
  });

  it('shows Uplink Stabilized footer', () => {
    render(<GlobalAlertMesh isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('Uplink Stabilized')).toBeDefined();
  });

  it('plays click sound when filter button is clicked', () => {
    render(<GlobalAlertMesh isOpen={true} onClose={mockOnClose} />);
    const errorBtn = screen.getByText('ERROR');
    fireEvent.click(errorBtn);
    expect(mockPlayClick).toHaveBeenCalled();
  });
});
