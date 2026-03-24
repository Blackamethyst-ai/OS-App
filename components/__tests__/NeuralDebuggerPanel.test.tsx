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
    span: 'span',
    button: 'button',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('lucide-react', () => ({
  Activity: (props: Record<string, unknown>) => <span data-testid="icon-activity" {...props} />,
  X: (props: Record<string, unknown>) => <span data-testid="icon-x" {...props} />,
}));

import { NeuralDebuggerPanel } from '../NeuralDebuggerPanel';

describe('NeuralDebuggerPanel', () => {
  const defaultState = { skepticism: 50, excitement: 30, alignment: 70 };
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    state: defaultState,
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <NeuralDebuggerPanel {...defaultProps} isOpen={false} />
    );
    expect(screen.queryByText('NEURAL_DEBUGGER')).toBeNull();
  });

  it('renders the panel when isOpen is true', () => {
    render(<NeuralDebuggerPanel {...defaultProps} />);
    expect(screen.getByText('NEURAL_DEBUGGER')).toBeTruthy();
  });

  it('displays current state values as percentages', () => {
    render(<NeuralDebuggerPanel {...defaultProps} />);
    expect(screen.getByText('50%')).toBeTruthy();
    expect(screen.getByText('30%')).toBeTruthy();
    expect(screen.getByText('70%')).toBeTruthy();
  });

  it('calls onClose when close button is clicked', () => {
    render(<NeuralDebuggerPanel {...defaultProps} />);
    const closeButton = screen.getByTestId('icon-x').closest('button');
    fireEvent.click(closeButton!);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onChange when a slider value changes', () => {
    render(<NeuralDebuggerPanel {...defaultProps} />);
    const sliders = document.querySelectorAll('input[type="range"]');
    expect(sliders.length).toBe(3);

    fireEvent.change(sliders[0], { target: { value: '75' } });
    expect(defaultProps.onChange).toHaveBeenCalledWith('skepticism', 75);

    fireEvent.change(sliders[1], { target: { value: '60' } });
    expect(defaultProps.onChange).toHaveBeenCalledWith('excitement', 60);

    fireEvent.change(sliders[2], { target: { value: '90' } });
    expect(defaultProps.onChange).toHaveBeenCalledWith('alignment', 90);
  });

  it('displays labels for all three sliders', () => {
    render(<NeuralDebuggerPanel {...defaultProps} />);
    expect(screen.getByText('SKEPTICISM (Form)')).toBeTruthy();
    expect(screen.getByText('EXCITEMENT (Glow)')).toBeTruthy();
    expect(screen.getByText('ALIGNMENT (Hue)')).toBeTruthy();
  });

  it('displays the Manual Override Active footer text', () => {
    render(<NeuralDebuggerPanel {...defaultProps} />);
    expect(screen.getByText('Manual Override Active')).toBeTruthy();
  });

  it('renders sliders with correct initial values', () => {
    render(<NeuralDebuggerPanel {...defaultProps} />);
    const sliders = document.querySelectorAll('input[type="range"]');
    expect((sliders[0] as HTMLInputElement).value).toBe('50');
    expect((sliders[1] as HTMLInputElement).value).toBe('30');
    expect((sliders[2] as HTMLInputElement).value).toBe('70');
  });
});
