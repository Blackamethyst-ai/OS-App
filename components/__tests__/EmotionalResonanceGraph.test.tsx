// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ============================================================================
// MOCKS
// ============================================================================

const mockSetImageGenState = vi.hoisted(() => vi.fn());

const mockResonanceCurve = vi.hoisted(() =>
  Array.from({ length: 10 }, (_, i) => ({
    frame: i,
    tension: 50,
    dynamics: 50,
  }))
);

const mockImageGenState = vi.hoisted(() => ({
  resonanceCurve: mockResonanceCurve,
}));

vi.mock('../../store', () => ({
  useAppStore: (selector?: (s: any) => any) => {
    const state = {
      imageGen: mockImageGenState,
      actions: { setImageGenState: mockSetImageGenState },
    };
    if (selector) return selector(state);
    return state;
  },
}));

vi.mock('lucide-react', () => ({
  Activity: (props: any) => <span data-testid="icon-activity" className={props.className}>Activity</span>,
  Sliders: () => <span>Sliders</span>,
  RefreshCw: () => <span>RefreshCw</span>,
  AudioWaveform: (props: any) => <span className={props.className}>AudioWaveform</span>,
  Zap: () => <span>Zap</span>,
}));

import EmotionalResonanceGraph from '../EmotionalResonanceGraph';

// ============================================================================
// TESTS
// ============================================================================

describe('EmotionalResonanceGraph', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockImageGenState.resonanceCurve = Array.from({ length: 10 }, (_, i) => ({
      frame: i,
      tension: 50,
      dynamics: 50,
    }));
  });

  it('renders without crashing', () => {
    const { container } = render(<EmotionalResonanceGraph />);
    expect(container.firstChild).toBeTruthy();
  });

  it('returns null when resonanceCurve is not an array', () => {
    mockImageGenState.resonanceCurve = null as any;
    const { container } = render(<EmotionalResonanceGraph />);
    expect(container.firstChild).toBeNull();
  });

  it('renders Tension and Dynamics labels', () => {
    render(<EmotionalResonanceGraph />);
    expect(screen.getByText('Tension')).toBeTruthy();
    expect(screen.getByText('Dynamics')).toBeTruthy();
  });

  it('renders algorithm preset buttons', () => {
    render(<EmotionalResonanceGraph />);
    expect(screen.getByText('Hero')).toBeTruthy();
    expect(screen.getByText('Rise')).toBeTruthy();
    expect(screen.getByText('Chaos')).toBeTruthy();
    expect(screen.getByText('Flow')).toBeTruthy();
  });

  it('applies HERO algorithm on button click', () => {
    render(<EmotionalResonanceGraph />);
    fireEvent.click(screen.getByText('Hero'));
    expect(mockSetImageGenState).toHaveBeenCalledWith({
      resonanceCurve: expect.arrayContaining([
        expect.objectContaining({ frame: 0 }),
      ]),
    });
  });

  it('applies RISING algorithm on button click', () => {
    render(<EmotionalResonanceGraph />);
    fireEvent.click(screen.getByText('Rise'));
    expect(mockSetImageGenState).toHaveBeenCalledWith({
      resonanceCurve: expect.arrayContaining([
        expect.objectContaining({ frame: 0 }),
      ]),
    });
    // Rising should have increasing tension
    const curve = mockSetImageGenState.mock.calls[0][0].resonanceCurve;
    expect(curve[9].tension).toBeGreaterThan(curve[0].tension);
  });

  it('nudges tension down when minus button is clicked', () => {
    render(<EmotionalResonanceGraph />);
    // The tension bias section has - and + buttons
    const minusButtons = screen.getAllByText('-');
    fireEvent.click(minusButtons[0]); // First minus is tension
    expect(mockSetImageGenState).toHaveBeenCalledWith({
      resonanceCurve: expect.arrayContaining([
        expect.objectContaining({ tension: 40 }),
      ]),
    });
  });

  it('nudges tension up when plus button is clicked', () => {
    render(<EmotionalResonanceGraph />);
    const plusButtons = screen.getAllByText('+');
    fireEvent.click(plusButtons[0]); // First plus is tension
    expect(mockSetImageGenState).toHaveBeenCalledWith({
      resonanceCurve: expect.arrayContaining([
        expect.objectContaining({ tension: 60 }),
      ]),
    });
  });

  it('scales dynamics when dynamics buttons are clicked', () => {
    render(<EmotionalResonanceGraph />);
    const plusButtons = screen.getAllByText('+');
    fireEvent.click(plusButtons[1]); // Second plus is dynamics
    expect(mockSetImageGenState).toHaveBeenCalled();
  });

  it('renders SVG with tension and dynamics paths', () => {
    const { container } = render(<EmotionalResonanceGraph />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(2); // tension + dynamics
  });

  it('renders circles for each resonance point', () => {
    const { container } = render(<EmotionalResonanceGraph />);
    const circles = container.querySelectorAll('circle');
    // 10 tension circles + 10 dynamics circles = 20
    expect(circles.length).toBe(20);
  });
});
