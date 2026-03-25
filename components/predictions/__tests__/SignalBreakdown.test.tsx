// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ============================================================================
// MOCKS
// ============================================================================

vi.mock('../styles/predictions.css', () => ({}));

import { SignalBreakdown } from '../SignalBreakdown';

// ============================================================================
// HELPERS
// ============================================================================

const defaultSignals = {
  outcome_score: 0.85,
  cognitive_alignment: 0.72,
  research_availability: 0.68,
  error_probability: 0.15,
};

// ============================================================================
// TESTS
// ============================================================================

describe('SignalBreakdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the header with title', () => {
    render(<SignalBreakdown signals={defaultSignals} />);
    expect(screen.getByText('Prediction Signals')).toBeTruthy();
  });

  it('renders all four signal labels', () => {
    render(<SignalBreakdown signals={defaultSignals} />);
    expect(screen.getByText('Outcome Match')).toBeTruthy();
    expect(screen.getByText('Cognitive Fit')).toBeTruthy();
    expect(screen.getByText('Research Ready')).toBeTruthy();
    expect(screen.getByText('Error Risk')).toBeTruthy();
  });

  it('displays signal values as percentages', () => {
    render(<SignalBreakdown signals={defaultSignals} />);
    expect(screen.getByText('85%')).toBeTruthy();
    expect(screen.getByText('72%')).toBeTruthy();
    expect(screen.getByText('68%')).toBeTruthy();
    expect(screen.getByText('15%')).toBeTruthy();
  });

  it('shows combined confidence score', () => {
    render(<SignalBreakdown signals={defaultSignals} />);
    expect(screen.getByText('Combined Confidence')).toBeTruthy();
    // Combined = 0.85*0.5 + 0.72*0.3 + 0.68*0.15 - 0.15*0.05 = 0.425 + 0.216 + 0.102 - 0.0075 = 0.7355 → 74%
    expect(screen.getByText('74%')).toBeTruthy();
  });

  it('shows high confidence interpretation for score >= 0.7', () => {
    render(<SignalBreakdown signals={defaultSignals} />);
    expect(screen.getByText(/High confidence.*proceed with confidence/)).toBeTruthy();
  });

  it('shows moderate confidence interpretation for score 0.5-0.7', () => {
    // Combined = 0.7*0.5 + 0.6*0.3 + 0.5*0.15 - 0.1*0.05 = 0.35 + 0.18 + 0.075 - 0.005 = 0.6
    const moderateSignals = {
      outcome_score: 0.7,
      cognitive_alignment: 0.6,
      research_availability: 0.5,
      error_probability: 0.1,
    };
    render(<SignalBreakdown signals={moderateSignals} />);
    expect(screen.getByText(/Moderate confidence.*acceptable/)).toBeTruthy();
  });

  it('shows low confidence interpretation for score < 0.5', () => {
    const lowSignals = {
      outcome_score: 0.2,
      cognitive_alignment: 0.2,
      research_availability: 0.1,
      error_probability: 0.9,
    };
    render(<SignalBreakdown signals={lowSignals} />);
    expect(screen.getByText(/Low confidence.*consider waiting/)).toBeTruthy();
  });

  it('does not show weights by default', () => {
    render(<SignalBreakdown signals={defaultSignals} />);
    expect(screen.queryByText('50% weight')).toBeNull();
  });

  it('shows weights when showWeights is true', () => {
    render(<SignalBreakdown signals={defaultSignals} showWeights={true} />);
    expect(screen.getByText('50% weight')).toBeTruthy();
    expect(screen.getByText('30% weight')).toBeTruthy();
    expect(screen.getByText('15% weight')).toBeTruthy();
    expect(screen.getByText('-5% weight')).toBeTruthy();
  });

  it('shows how weights info details when showWeights is true', () => {
    render(<SignalBreakdown signals={defaultSignals} showWeights={true} />);
    expect(screen.getByText(/How signals are weighted/)).toBeTruthy();
  });

  it('expands signal details on click', () => {
    render(<SignalBreakdown signals={defaultSignals} />);
    const outcomeButton = screen.getByText('Outcome Match').closest('button')!;
    fireEvent.click(outcomeButton);
    expect(screen.getByText('Historical success rate for similar tasks')).toBeTruthy();
    expect(screen.getByText(/Strong signal.*favorable conditions/)).toBeTruthy();
  });

  it('collapses expanded signal on second click', () => {
    render(<SignalBreakdown signals={defaultSignals} />);
    const outcomeButton = screen.getByText('Outcome Match').closest('button')!;
    fireEvent.click(outcomeButton);
    expect(screen.getByText('Historical success rate for similar tasks')).toBeTruthy();
    fireEvent.click(outcomeButton);
    expect(screen.queryByText('Historical success rate for similar tasks')).toBeNull();
  });

  it('shows correct interpretation for negative signal (error risk)', () => {
    render(<SignalBreakdown signals={defaultSignals} />);
    const errorButton = screen.getByText('Error Risk').closest('button')!;
    fireEvent.click(errorButton);
    expect(screen.getByText(/Low risk of errors.*good to proceed/)).toBeTruthy();
  });

  it('applies custom className', () => {
    const { container } = render(
      <SignalBreakdown signals={defaultSignals} className="custom-class" />
    );
    expect(container.querySelector('.custom-class')).toBeTruthy();
  });
});
