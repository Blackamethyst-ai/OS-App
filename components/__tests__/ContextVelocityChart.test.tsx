// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';

// ============================================================================
// MOCKS
// ============================================================================

vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
  },
}));

vi.mock('lucide-react', () => ({
  Activity: (props: any) => <span data-testid="icon-activity" {...props} />,
  Radio: (props: any) => <span data-testid="icon-radio" {...props} />,
}));

vi.mock('recharts', () => ({
  ComposedChart: ({ children }: any) => <div data-testid="composed-chart">{children}</div>,
  Line: (props: any) => <div data-testid={`line-${props.dataKey}`} />,
  Bar: (props: any) => <div data-testid={`bar-${props.dataKey}`} />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
}));

vi.mock('../../store', () => ({
  useAppStore: vi.fn(() => ({
    theme: 'DARK',
    agents: {
      activeAgents: [
        { id: 'a1', status: 'THINKING', tasks: [{ id: 't1', status: 'PENDING' }] },
        { id: 'a2', status: 'IDLE', tasks: [] },
      ],
    },
    voice: { isActive: false },
    dashboard: { isOculusView: false },
  })),
}));

import ContextVelocityChart from '../ContextVelocityChart';

describe('ContextVelocityChart', () => {
  const mockOnDrillDown = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the chart title', () => {
    render(<ContextVelocityChart onDrillDown={mockOnDrillDown} />);
    expect(screen.getByText('Context Velocity')).toBeTruthy();
  });

  it('renders the subtitle', () => {
    render(<ContextVelocityChart onDrillDown={mockOnDrillDown} />);
    expect(screen.getByText('Temporal index // v4.0')).toBeTruthy();
  });

  it('renders the Live indicator', () => {
    render(<ContextVelocityChart onDrillDown={mockOnDrillDown} />);
    expect(screen.getByText('Live')).toBeTruthy();
  });

  it('renders the Activity icon', () => {
    render(<ContextVelocityChart onDrillDown={mockOnDrillDown} />);
    expect(screen.getByTestId('icon-activity')).toBeTruthy();
  });

  it('renders the Radio icon', () => {
    render(<ContextVelocityChart onDrillDown={mockOnDrillDown} />);
    expect(screen.getByTestId('icon-radio')).toBeTruthy();
  });

  it('renders the recharts ResponsiveContainer', () => {
    render(<ContextVelocityChart onDrillDown={mockOnDrillDown} />);
    expect(screen.getByTestId('responsive-container')).toBeTruthy();
  });

  it('renders the ComposedChart', () => {
    render(<ContextVelocityChart onDrillDown={mockOnDrillDown} />);
    expect(screen.getByTestId('composed-chart')).toBeTruthy();
  });

  it('renders the Sync status in footer', () => {
    render(<ContextVelocityChart onDrillDown={mockOnDrillDown} />);
    expect(screen.getByText('Sync:')).toBeTruthy();
    expect(screen.getByText('OK')).toBeTruthy();
  });

  it('renders the Load status showing data point count', () => {
    render(<ContextVelocityChart onDrillDown={mockOnDrillDown} />);
    expect(screen.getByText('Load:')).toBeTruthy();
    expect(screen.getByText('0P')).toBeTruthy();
  });

  it('renders the feed stabilizer label', () => {
    render(<ContextVelocityChart onDrillDown={mockOnDrillDown} />);
    expect(screen.getByText('Feed_Stab_L0')).toBeTruthy();
  });

  it('accumulates data points over time', () => {
    render(<ContextVelocityChart onDrillDown={mockOnDrillDown} />);
    expect(screen.getByText('0P')).toBeTruthy();
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByText('1P')).toBeTruthy();
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByText('2P')).toBeTruthy();
  });

  it('renders chart data series (Bar and Lines)', () => {
    render(<ContextVelocityChart onDrillDown={mockOnDrillDown} />);
    expect(screen.getByTestId('bar-throughput')).toBeTruthy();
    expect(screen.getByTestId('line-latency')).toBeTruthy();
    expect(screen.getByTestId('line-ambiguityScore')).toBeTruthy();
  });
});
