// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ============================================================================
// MOCKS
// ============================================================================

vi.mock('../index', () => ({
  PredictionPanel: (props: Record<string, unknown>) => (
    <div data-testid="prediction-panel" data-intent={props.intent}>PredictionPanel</div>
  ),
  PredictionBadge: (props: Record<string, unknown>) => (
    <div data-testid="prediction-badge" data-quality={props.quality} data-compact={String(props.compact)}>PredictionBadge</div>
  ),
  ErrorWarningPanel: (props: Record<string, unknown>) => (
    <div data-testid="error-warning-panel">ErrorWarningPanel</div>
  ),
  OptimalTimeIndicator: (props: Record<string, unknown>) => (
    <div data-testid="optimal-time" data-is-optimal={String(props.isOptimalNow)}>OptimalTimeIndicator</div>
  ),
  ResearchChips: (props: Record<string, unknown>) => (
    <div data-testid="research-chips">ResearchChips</div>
  ),
  SignalBreakdown: (props: Record<string, unknown>) => (
    <div data-testid="signal-breakdown" data-show-weights={String(props.showWeights)}>SignalBreakdown</div>
  ),
}));

vi.mock('../styles/predictions.css', () => ({}));

import { PredictionDemo } from '../PredictionDemo';

// ============================================================================
// TESTS
// ============================================================================

describe('PredictionDemo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the header and description', () => {
    render(<PredictionDemo />);
    expect(screen.getByText(/Meta-Learning Prediction Demo/)).toBeTruthy();
    expect(screen.getByText(/Standalone demonstration/)).toBeTruthy();
  });

  it('renders status indicators', () => {
    render(<PredictionDemo />);
    expect(screen.getByText('API Ready')).toBeTruthy();
    expect(screen.getByText('Agent Core MCP')).toBeTruthy();
  });

  it('renders Full Panel and Components tabs', () => {
    render(<PredictionDemo />);
    expect(screen.getByText('Full Panel')).toBeTruthy();
    expect(screen.getByText('Components')).toBeTruthy();
  });

  it('shows Full Panel view by default with input', () => {
    render(<PredictionDemo />);
    expect(screen.getByPlaceholderText(/implement authentication system/)).toBeTruthy();
    expect(screen.getByText(/Type at least 3 characters/)).toBeTruthy();
  });

  it('shows empty state placeholder when no intent entered', () => {
    render(<PredictionDemo />);
    expect(screen.getByText('Enter a task intent above to see real-time predictions')).toBeTruthy();
  });

  it('shows PredictionPanel when intent is 3+ chars', () => {
    render(<PredictionDemo />);
    const input = screen.getByPlaceholderText(/implement authentication system/);
    fireEvent.change(input, { target: { value: 'build auth' } });
    expect(screen.getByTestId('prediction-panel')).toBeTruthy();
    expect(screen.getByText(/Ready for prediction/)).toBeTruthy();
  });

  it('hides empty state when intent is entered', () => {
    render(<PredictionDemo />);
    const input = screen.getByPlaceholderText(/implement authentication system/);
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(screen.queryByText('Enter a task intent above to see real-time predictions')).toBeNull();
  });

  it('switches to Components tab and shows all component demos', () => {
    render(<PredictionDemo />);
    fireEvent.click(screen.getByText('Components'));
    expect(screen.getAllByTestId('prediction-badge').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('error-warning-panel')).toBeTruthy();
    expect(screen.getAllByTestId('optimal-time').length).toBe(2);
    expect(screen.getByTestId('research-chips')).toBeTruthy();
    expect(screen.getByTestId('signal-breakdown')).toBeTruthy();
  });

  it('renders section headers in components tab', () => {
    render(<PredictionDemo />);
    fireEvent.click(screen.getByText('Components'));
    expect(screen.getByText(/Prediction Badge/)).toBeTruthy();
    expect(screen.getByText(/Error Warning Panel/)).toBeTruthy();
    expect(screen.getByText(/Optimal Time Indicator/)).toBeTruthy();
    expect(screen.getByText(/Research Chips/)).toBeTruthy();
    expect(screen.getByText(/Signal Breakdown/)).toBeTruthy();
  });

  it('renders footer with links', () => {
    render(<PredictionDemo />);
    expect(screen.getByText(/Meta-Learning Engine.*Phase 7 Complete/)).toBeTruthy();
    expect(screen.getByText(/Documentation/)).toBeTruthy();
    expect(screen.getByText(/Integration Guide/)).toBeTruthy();
    expect(screen.getByText(/API Docs/)).toBeTruthy();
  });

  it('shows compact PredictionBadge in components tab', () => {
    render(<PredictionDemo />);
    fireEvent.click(screen.getByText('Components'));
    const badges = screen.getAllByTestId('prediction-badge');
    const compactBadge = badges.find(b => b.getAttribute('data-compact') === 'true');
    expect(compactBadge).toBeTruthy();
  });
});
