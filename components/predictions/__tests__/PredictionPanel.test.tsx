// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ============================================================================
// MOCKS
// ============================================================================

const mockUsePredictionWithContext = vi.fn();

vi.mock('@antigravity/agent-core-sdk', () => ({
  usePredictionWithContext: (args: unknown) => mockUsePredictionWithContext(args),
}));

vi.mock('../PredictionBadge', () => ({
  PredictionBadge: (props: Record<string, unknown>) => (
    <div data-testid="prediction-badge" data-quality={props.quality}>PredictionBadge</div>
  ),
}));

vi.mock('../ErrorWarningPanel', () => ({
  ErrorWarningPanel: (props: Record<string, unknown>) => (
    <div data-testid="error-warning-panel">ErrorWarningPanel</div>
  ),
}));

vi.mock('../OptimalTimeIndicator', () => ({
  OptimalTimeIndicator: (props: Record<string, unknown>) => (
    <div data-testid="optimal-time-indicator">OptimalTimeIndicator</div>
  ),
}));

vi.mock('../ResearchChips', () => ({
  ResearchChips: (props: Record<string, unknown>) => (
    <div data-testid="research-chips">ResearchChips</div>
  ),
}));

vi.mock('../styles/predictions.css', () => ({}));

import { PredictionPanel } from '../PredictionPanel';

// ============================================================================
// HELPERS
// ============================================================================

const mockPredictionData = {
  prediction: {
    predicted_quality: 4.2,
    success_probability: 0.85,
    confidence: 0.9,
    recommended_research: [
      { id: '1', content: 'Research 1', similarity: 0.9 },
    ],
    signals: {
      outcome_score: 0.8,
      cognitive_alignment: 0.75,
      research_availability: 0.6,
      error_probability: 0.1,
    },
  },
  errors: {
    count: 2,
    errors: [
      { error_type: 'test_error', severity: 'high', solution: 'fix it', success_rate: 0.9, context: 'test', score: 0.8 },
    ],
  },
  optimalTime: {
    optimal_hour: 20,
    is_optimal_now: true,
    reasoning: 'Peak time',
  },
};

// ============================================================================
// TESTS
// ============================================================================

describe('PredictionPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePredictionWithContext.mockReturnValue({
      data: mockPredictionData,
      isLoading: false,
      error: null,
    });
  });

  it('returns null when intent is too short', () => {
    const { container } = render(<PredictionPanel intent="ab" />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when intent is empty', () => {
    const { container } = render(<PredictionPanel intent="" />);
    expect(container.innerHTML).toBe('');
  });

  it('shows loading state', () => {
    mockUsePredictionWithContext.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });
    render(<PredictionPanel intent="build auth system" />);
    expect(screen.getByText('Analyzing task predictions...')).toBeTruthy();
  });

  it('shows error state', () => {
    mockUsePredictionWithContext.mockReturnValue({
      data: null,
      isLoading: false,
      error: { message: 'API connection failed' },
    });
    render(<PredictionPanel intent="build auth system" />);
    expect(screen.getByText(/Failed to load predictions.*API connection failed/)).toBeTruthy();
  });

  it('returns null when data is null and not loading', () => {
    mockUsePredictionWithContext.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });
    const { container } = render(<PredictionPanel intent="build auth" />);
    expect(container.innerHTML).toBe('');
  });

  it('renders full panel with all sub-components when data is available', () => {
    render(<PredictionPanel intent="build auth system" />);
    expect(screen.getByText('Session Prediction')).toBeTruthy();
    expect(screen.getByTestId('prediction-badge')).toBeTruthy();
    expect(screen.getByTestId('error-warning-panel')).toBeTruthy();
    expect(screen.getByTestId('optimal-time-indicator')).toBeTruthy();
    expect(screen.getByTestId('research-chips')).toBeTruthy();
  });

  it('hides error panel when showErrors is false', () => {
    render(<PredictionPanel intent="build auth system" showErrors={false} />);
    expect(screen.queryByTestId('error-warning-panel')).toBeNull();
  });

  it('hides timing indicator when showTiming is false', () => {
    render(<PredictionPanel intent="build auth system" showTiming={false} />);
    expect(screen.queryByTestId('optimal-time-indicator')).toBeNull();
  });

  it('hides research chips when showResearch is false', () => {
    render(<PredictionPanel intent="build auth system" showResearch={false} />);
    expect(screen.queryByTestId('research-chips')).toBeNull();
  });

  it('shows Start Now button when conditions are favorable', () => {
    const onStartTask = vi.fn();
    render(<PredictionPanel intent="build auth system" onStartTask={onStartTask} />);
    const startBtn = screen.getByText(/Start Now/);
    expect(startBtn).toBeTruthy();
    fireEvent.click(startBtn);
    expect(onStartTask).toHaveBeenCalledOnce();
  });

  it('shows Start Anyway and Schedule for Later when not favorable', () => {
    mockUsePredictionWithContext.mockReturnValue({
      data: {
        ...mockPredictionData,
        prediction: {
          ...mockPredictionData.prediction,
          success_probability: 0.4,
        },
        optimalTime: {
          optimal_hour: 20,
          is_optimal_now: false,
          reasoning: 'Not peak time',
        },
      },
      isLoading: false,
      error: null,
    });
    const onStartTask = vi.fn();
    const onScheduleLater = vi.fn();
    render(
      <PredictionPanel
        intent="build auth system"
        onStartTask={onStartTask}
        onScheduleLater={onScheduleLater}
      />
    );
    expect(screen.getByText(/Start Anyway/)).toBeTruthy();
    const scheduleBtn = screen.getByText(/Schedule for Later/);
    expect(scheduleBtn).toBeTruthy();
    fireEvent.click(scheduleBtn);
    expect(onScheduleLater).toHaveBeenCalledOnce();
  });

  it('shows signal breakdown details section', () => {
    render(<PredictionPanel intent="build auth system" />);
    expect(screen.getByText(/View Signal Breakdown/)).toBeTruthy();
  });

  it('calls usePredictionWithContext with correct params', () => {
    render(
      <PredictionPanel
        intent="build auth system"
        track={true}
        showErrors={true}
        showTiming={true}
      />
    );
    expect(mockUsePredictionWithContext).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: 'build auth system',
        track: true,
        includeErrors: true,
        includeOptimalTime: true,
        debounceMs: 500,
      })
    );
  });
});
