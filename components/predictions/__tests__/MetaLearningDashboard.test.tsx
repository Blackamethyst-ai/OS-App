// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ============================================================================
// MOCKS
// ============================================================================

vi.mock('motion/react', () => ({
  motion: {
    div: 'div',
    span: 'span',
    button: 'button',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('lucide-react', () => ({
  Brain: (props: Record<string, unknown>) => <span data-testid="icon-brain" {...props} />,
  TrendingUp: (props: Record<string, unknown>) => <span data-testid="icon-trending-up" {...props} />,
  Clock: (props: Record<string, unknown>) => <span data-testid="icon-clock" {...props} />,
  AlertTriangle: (props: Record<string, unknown>) => <span data-testid="icon-alert" {...props} />,
  Sparkles: (props: Record<string, unknown>) => <span data-testid="icon-sparkles" {...props} />,
  Database: (props: Record<string, unknown>) => <span data-testid="icon-database" {...props} />,
  Activity: (props: Record<string, unknown>) => <span data-testid="icon-activity" {...props} />,
}));

vi.mock('../PredictionPanel', () => ({
  PredictionPanel: (props: Record<string, unknown>) => (
    <div data-testid="prediction-panel" data-intent={props.intent}>PredictionPanel</div>
  ),
}));

const mockUsePredictionWithContext = vi.fn((_options?: Record<string, unknown>) => ({
  data: null,
  isLoading: false,
}));

vi.mock('../../../libs/agent-core-sdk/src/hooks', () => ({
  usePredictionWithContext: (args: any) => mockUsePredictionWithContext(args),
}));

import MetaLearningDashboard from '../MetaLearningDashboard';

// ============================================================================
// TESTS
// ============================================================================

describe('MetaLearningDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the header with title and subtitle', () => {
    render(<MetaLearningDashboard />);
    expect(screen.getByText('Meta-Learning Engine')).toBeTruthy();
    expect(screen.getByText(/Predictive intelligence from 666\+ historical sessions/)).toBeTruthy();
  });

  it('renders all three view tabs', () => {
    render(<MetaLearningDashboard />);
    expect(screen.getByText('Live Predictions')).toBeTruthy();
    expect(screen.getByText('Learning Insights')).toBeTruthy();
    expect(screen.getByText('Session History')).toBeTruthy();
  });

  it('shows the predict view by default with input and placeholder content', () => {
    render(<MetaLearningDashboard />);
    expect(screen.getByPlaceholderText(/implement authentication system/)).toBeTruthy();
    expect(screen.getByText('AI-Powered Session Predictions')).toBeTruthy();
  });

  it('shows character count warning when intent is 1-2 chars', () => {
    render(<MetaLearningDashboard />);
    const input = screen.getByPlaceholderText(/implement authentication system/);
    fireEvent.change(input, { target: { value: 'ab' } });
    expect(screen.getByText('Type at least 3 characters for predictions...')).toBeTruthy();
  });

  it('shows PredictionPanel when intent is 3+ characters', () => {
    render(<MetaLearningDashboard />);
    const input = screen.getByPlaceholderText(/implement authentication system/);
    fireEvent.change(input, { target: { value: 'build auth' } });
    expect(screen.getByTestId('prediction-panel')).toBeTruthy();
    expect(screen.getByTestId('prediction-panel').getAttribute('data-intent')).toBe('build auth');
  });

  it('switches to insights view and shows stats', () => {
    render(<MetaLearningDashboard />);
    fireEvent.click(screen.getByText('Learning Insights'));
    expect(screen.getByText('666')).toBeTruthy();
    expect(screen.getByText('1,014')).toBeTruthy();
    expect(screen.getByText('9')).toBeTruthy();
    expect(screen.getAllByText('Session Outcomes').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Cognitive States')).toBeTruthy();
    expect(screen.getAllByText('Error Patterns').length).toBeGreaterThanOrEqual(1);
  });

  it('shows correlation weights in insights view', () => {
    render(<MetaLearningDashboard />);
    fireEvent.click(screen.getByText('Learning Insights'));
    expect(screen.getByText('Multi-Dimensional Correlation')).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();
    expect(screen.getByText('30%')).toBeTruthy();
    expect(screen.getByText('15%')).toBeTruthy();
    expect(screen.getByText('5%')).toBeTruthy();
  });

  it('shows system status in insights view', () => {
    render(<MetaLearningDashboard />);
    fireEvent.click(screen.getByText('Learning Insights'));
    expect(screen.getByText('System Status')).toBeTruthy();
    expect(screen.getByText('API Server Active')).toBeTruthy();
    expect(screen.getByText('Vector Search Ready')).toBeTruthy();
    expect(screen.getByText('Cognitive OS Sync')).toBeTruthy();
    expect(screen.getByText('Error Patterns Loaded')).toBeTruthy();
  });

  it('switches to history view and shows placeholder', () => {
    render(<MetaLearningDashboard />);
    fireEvent.click(screen.getByText('Session History'));
    expect(screen.getByText('Session history visualization coming soon...')).toBeTruthy();
  });

  it('shows feature cards in predict view when no intent entered', () => {
    render(<MetaLearningDashboard />);
    expect(screen.getByText('Quality Score')).toBeTruthy();
    expect(screen.getByText('Optimal Timing')).toBeTruthy();
    expect(screen.getByText('Error Prevention')).toBeTruthy();
    expect(screen.getByText('Research Context')).toBeTruthy();
  });

  it('calls usePredictionWithContext hook', () => {
    render(<MetaLearningDashboard />);
    expect(mockUsePredictionWithContext).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: '',
        track: false,
        includeErrors: true,
        includeOptimalTime: true,
        debounceMs: 500,
      })
    );
  });
});
