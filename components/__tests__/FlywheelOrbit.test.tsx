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

const mockFlywheelState = vi.hoisted(() => ({
  velocity: 15,
  confidenceScore: 0.6,
}));

vi.mock('../../store/flywheelStore', () => ({
  useFlywheelStore: () => mockFlywheelState,
}));

import FlywheelOrbit from '../FlywheelOrbit';

describe('FlywheelOrbit', () => {
  beforeEach(() => {
    mockFlywheelState.velocity = 15;
    mockFlywheelState.confidenceScore = 0.6;
  });

  it('renders the component', () => {
    const { container } = render(<FlywheelOrbit />);
    expect(container.firstChild).toBeTruthy();
  });

  it('displays the confidence score as a percentage', () => {
    render(<FlywheelOrbit />);
    expect(screen.getByText('60%')).toBeTruthy();
  });

  it('displays high confidence score correctly', () => {
    mockFlywheelState.confidenceScore = 0.95;
    render(<FlywheelOrbit />);
    expect(screen.getByText('95%')).toBeTruthy();
  });

  it('displays low confidence score correctly', () => {
    mockFlywheelState.confidenceScore = 0.2;
    render(<FlywheelOrbit />);
    expect(screen.getByText('20%')).toBeTruthy();
  });

  it('displays zero confidence as 0%', () => {
    mockFlywheelState.confidenceScore = 0;
    render(<FlywheelOrbit />);
    expect(screen.getByText('0%')).toBeTruthy();
  });

  it('displays 100% confidence correctly', () => {
    mockFlywheelState.confidenceScore = 1.0;
    render(<FlywheelOrbit />);
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('renders with high velocity without errors', () => {
    mockFlywheelState.velocity = 95;
    mockFlywheelState.confidenceScore = 0.9;
    const { container } = render(<FlywheelOrbit />);
    expect(container.firstChild).toBeTruthy();
    expect(screen.getByText('90%')).toBeTruthy();
  });

  it('renders with zero velocity without errors', () => {
    mockFlywheelState.velocity = 0;
    const { container } = render(<FlywheelOrbit />);
    expect(container.firstChild).toBeTruthy();
  });
});
