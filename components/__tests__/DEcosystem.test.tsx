// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ============================================================================
// MOCKS
// ============================================================================

vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
  },
}));

vi.mock('lucide-react', () => {
  const React = require('react');
  const i = (props: any) => React.createElement('span', null, props?.children);
  return {
    Activity: i, ShieldCheck: i, Globe: i, Target: i, Cpu: i, Database: i, Binary: i,
  };
});

// Mock canvas and ResizeObserver
const mockGetContext = vi.fn().mockReturnValue({
  globalCompositeOperation: '',
  fillStyle: '',
  fillRect: vi.fn(),
  strokeStyle: '',
  lineWidth: 0,
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  globalAlpha: 1,
  shadowBlur: 0,
  shadowColor: '',
  font: '',
  textAlign: '',
  letterSpacing: '',
  fillText: vi.fn(),
  createRadialGradient: vi.fn().mockReturnValue({
    addColorStop: vi.fn(),
  }),
  scale: vi.fn(),
});

let resizeCallback: ((entries: any[]) => void) | null = null;

class MockResizeObserver {
  constructor(cb: (entries: any[]) => void) {
    resizeCallback = cb;
  }
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

import DEcosystem from '../DEcosystem';

// ============================================================================
// TESTS
// ============================================================================

describe('DEcosystem', () => {
  let rafCallbacks: (() => void)[];

  beforeEach(() => {
    vi.clearAllMocks();
    rafCallbacks = [];

    vi.stubGlobal('requestAnimationFrame', vi.fn((cb: () => void) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('ResizeObserver', MockResizeObserver);

    // Mock canvas getContext
    HTMLCanvasElement.prototype.getContext = mockGetContext as any;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders the container div', () => {
    const { container } = render(<DEcosystem />);
    expect(container.querySelector('.w-full.h-full')).toBeTruthy();
  });

  it('renders a canvas element', () => {
    const { container } = render(<DEcosystem />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('displays the coherence value', () => {
    render(<DEcosystem />);
    // Initial coherence is 98.1
    expect(screen.getByText('98.1')).toBeTruthy();
  });

  it('displays the percent sign', () => {
    render(<DEcosystem />);
    expect(screen.getByText('%')).toBeTruthy();
  });

  it('renders the Neural Coherence label', () => {
    render(<DEcosystem />);
    const el = screen.getByText(/Neural/);
    expect(el).toBeTruthy();
  });

  it('renders the Global_Grid status', () => {
    render(<DEcosystem />);
    expect(screen.getByText('Global_Grid: Stable')).toBeTruthy();
  });

  it('renders the Trust_Index label', () => {
    render(<DEcosystem />);
    expect(screen.getByText('Trust_Index')).toBeTruthy();
  });

  it('renders the Audit: Verified status', () => {
    render(<DEcosystem />);
    expect(screen.getByText('Audit: Verified')).toBeTruthy();
  });

  it('accepts sectorOverrides prop without crashing', () => {
    const { container } = render(<DEcosystem sectorOverrides={{ code: 50, agents: 30 }} />);
    expect(container.querySelector('canvas')).toBeTruthy();
  });

  it('renders wave bars for the visualizer', () => {
    const { container } = render(<DEcosystem />);
    // The wave bars are motion.divs rendered as divs
    const waveBars = container.querySelectorAll('.w-2\\.5');
    expect(waveBars.length).toBe(15);
  });
});
