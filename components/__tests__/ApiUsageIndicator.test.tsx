// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ============================================================================
// MOCKS
// ============================================================================

vi.mock('motion/react', () => ({
  motion: {
    div: 'div',
    span: 'span',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('lucide-react', () => ({
  Activity: (props: Record<string, unknown>) => <span data-testid="icon-activity" {...props} />,
  AlertTriangle: (props: Record<string, unknown>) => <span data-testid="icon-alert" {...props} />,
  Zap: (props: Record<string, unknown>) => <span data-testid="icon-zap" {...props} />,
}));

const mockStats = vi.hoisted(() => ({
  callsThisMinute: 3,
  callsThisHour: 25,
}));

vi.mock('../../hooks/useApiUsage', () => ({
  useApiUsage: () => ({
    stats: mockStats,
    getRateLimitInfo: vi.fn(),
    isRateLimited: vi.fn(() => false),
  }),
}));

import ApiUsageIndicator from '../ApiUsageIndicator';

describe('ApiUsageIndicator', () => {
  beforeEach(() => {
    mockStats.callsThisMinute = 3;
    mockStats.callsThisHour = 25;
  });

  it('renders the component', () => {
    const { container } = render(<ApiUsageIndicator />);
    expect(container.firstChild).toBeTruthy();
  });

  it('displays calls per minute', () => {
    render(<ApiUsageIndicator />);
    expect(screen.getByText('3/min')).toBeTruthy();
  });

  it('displays calls per hour', () => {
    render(<ApiUsageIndicator />);
    expect(screen.getByText('25/hr')).toBeTruthy();
  });

  it('does not show rate limit warning when below threshold', () => {
    render(<ApiUsageIndicator />);
    expect(screen.queryByText('Rate Limit')).toBeNull();
  });

  it('shows rate limit warning when callsThisMinute >= 10', () => {
    mockStats.callsThisMinute = 12;
    render(<ApiUsageIndicator />);
    expect(screen.getByText('Rate Limit')).toBeTruthy();
  });

  it('renders the Activity icon', () => {
    render(<ApiUsageIndicator />);
    expect(screen.getByTestId('icon-activity')).toBeTruthy();
  });

  it('renders the Zap icon', () => {
    render(<ApiUsageIndicator />);
    expect(screen.getByTestId('icon-zap')).toBeTruthy();
  });

  it('shows alert icon when near rate limit', () => {
    mockStats.callsThisMinute = 15;
    render(<ApiUsageIndicator />);
    expect(screen.getByTestId('icon-alert')).toBeTruthy();
  });
});
