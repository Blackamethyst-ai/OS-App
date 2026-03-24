// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ============================================================================
// MOCKS
// ============================================================================

vi.mock('../../store', () => ({
  useAppStore: () => ({
    actions: { addLog: vi.fn() },
  }),
}));

vi.mock('../../services/geminiService', () => ({
  retryGeminiRequest: vi.fn(),
  getAI: vi.fn().mockReturnValue({
    models: { generateContent: vi.fn() },
  }),
}));

vi.mock('../../services/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../utils/cn', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {},
  GenerateContentResponse: class {},
}));

vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
    h2: React.forwardRef(({ children, ...props }: any, ref: any) => <h2 ref={ref} {...props}>{children}</h2>),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('lucide-react', () => {
  const React = require('react');
  const i = (props: any) => React.createElement('span', null, props?.children);
  return {
    ShieldCheck: i, Target: i, Activity: i, Loader2: i, Cpu: i, Globe: i,
    Lock: i, GitBranch: i, Zap: i, Radio: i, Sparkles: i,
  };
});

// Mock Three.js and R3F entirely
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: any) => <div data-testid="r3f-canvas">{children}</div>,
  useFrame: vi.fn(),
  useLoader: vi.fn().mockReturnValue({}),
  useThree: vi.fn().mockReturnValue({ viewport: { width: 10, height: 10 } }),
}));

vi.mock('three', () => ({
  Vector2: class { constructor(public x = 0, public y = 0) {} },
  TextureLoader: class {},
  MathUtils: { lerp: (a: number, b: number, t: number) => a + (b - a) * t },
  ShaderMaterial: class {},
}));

vi.mock('../TacticalScanner', () => ({
  default: () => <div data-testid="tactical-scanner" />,
}));

import { ZenithDisplay } from '../ZenithDisplay';

// ============================================================================
// TESTS
// ============================================================================

describe('ZenithDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state when no image is provided', () => {
    render(<ZenithDisplay currentZenithImage="" />);
    expect(screen.getByText(/Establishing_Zenith_Link/)).toBeTruthy();
  });

  it('renders the main content when an image is provided', () => {
    render(<ZenithDisplay currentZenithImage="https://example.com/image.jpg" />);
    expect(screen.queryByText(/Establishing_Zenith_Link/)).toBeNull();
  });

  it('renders the Identity_Verified_L0 badge with image', () => {
    render(<ZenithDisplay currentZenithImage="https://example.com/image.jpg" />);
    expect(screen.getByText('Identity_Verified_L0')).toBeTruthy();
  });

  it('renders the Sovereign Architect heading', () => {
    render(<ZenithDisplay currentZenithImage="https://example.com/image.jpg" />);
    expect(screen.getByText('Sovereign')).toBeTruthy();
    expect(screen.getByText('Architect')).toBeTruthy();
  });

  it('renders the Canvas component', () => {
    render(<ZenithDisplay currentZenithImage="https://example.com/image.jpg" />);
    expect(screen.getByTestId('r3f-canvas')).toBeTruthy();
  });

  it('renders the TacticalScanner component', () => {
    render(<ZenithDisplay currentZenithImage="https://example.com/image.jpg" />);
    expect(screen.getByTestId('tactical-scanner')).toBeTruthy();
  });

  it('renders Reality_Grounded label', () => {
    render(<ZenithDisplay currentZenithImage="https://example.com/image.jpg" />);
    expect(screen.getByText('Reality_Grounded')).toBeTruthy();
  });

  it('renders system attestation info', () => {
    render(<ZenithDisplay currentZenithImage="https://example.com/image.jpg" />);
    expect(screen.getByText('Optimal_L0')).toBeTruthy();
  });

  it('renders cluster node information', () => {
    render(<ZenithDisplay currentZenithImage="https://example.com/image.jpg" />);
    expect(screen.getByText('Manhattan_01')).toBeTruthy();
    expect(screen.getByText('Recursive_Logic')).toBeTruthy();
  });

  it('renders Zenith_Active sync status', () => {
    render(<ZenithDisplay currentZenithImage="https://example.com/image.jpg" />);
    expect(screen.getByText('Zenith_Active')).toBeTruthy();
  });
});
