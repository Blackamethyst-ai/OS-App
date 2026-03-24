// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ============================================================================
// MOCKS
// ============================================================================

vi.mock('../../utils/cn', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

vi.mock('../../services/audioService', () => ({
  audio: {
    playClick: vi.fn(),
    playTransition: vi.fn(),
    playTone: vi.fn(),
  },
}));

vi.mock('../../services/geminiService', () => ({
  generateSpeech: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../services/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef(({ children, animate, ...props }: any, ref: any) =>
      React.createElement('div', { ...props, ref, 'data-testid': 'motion-div' }, children)),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock('lucide-react', () => {
  const icon = ({ children, ...props }: any) => React.createElement('span', props, children);
  return {
    Scan: icon,
    ShieldCheck: icon,
    Crosshair: icon,
  };
});

import TacticalScanner from '../TacticalScanner';

// ============================================================================
// TESTS
// ============================================================================

describe('TacticalScanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the scanner container', () => {
    const { container } = render(<TacticalScanner />);
    expect(container.firstChild).toBeTruthy();
  });

  it('displays OCULUS_SCAN label by default', () => {
    render(<TacticalScanner />);
    expect(screen.getByText('OCULUS_SCAN')).toBeTruthy();
  });

  it('shows SEARCHING... status by default', () => {
    render(<TacticalScanner />);
    expect(screen.getByText('SEARCHING...')).toBeTruthy();
  });

  it('shows Lattice_Pos label', () => {
    render(<TacticalScanner />);
    expect(screen.getByText('Lattice_Pos')).toBeTruthy();
  });

  it('shows Signal_Auth label', () => {
    render(<TacticalScanner />);
    expect(screen.getByText('Signal_Auth')).toBeTruthy();
  });

  it('renders position coordinates', () => {
    render(<TacticalScanner />);
    // Default pos is { x: 30, y: 30 }
    expect(screen.getByText('30.0000, 30.0000')).toBeTruthy();
  });

  it('renders three indicator dots', () => {
    const { container } = render(<TacticalScanner />);
    // Each dot is rendered inside a motion.div with data-testid
    const motionDivs = container.querySelectorAll('[data-testid="motion-div"]');
    // At least 3 dots (plus the main container motion divs)
    expect(motionDivs.length).toBeGreaterThanOrEqual(3);
  });

  it('renders the reticle brackets (4 corner divs)', () => {
    const { container } = render(<TacticalScanner />);
    // The 4 corner brackets have border-t/border-l etc classes plus w-16 h-16
    const cornerDivs = container.querySelectorAll('.w-16.h-16');
    expect(cornerDivs.length).toBe(4);
  });

  it('does not show identity confirmation initially', () => {
    render(<TacticalScanner />);
    expect(screen.queryByText('Dico Angelo Confirmed')).toBeNull();
    expect(screen.queryByText('IDENTITY_LOCKED')).toBeNull();
  });

  it('has pointer-events-none on the root container', () => {
    const { container } = render(<TacticalScanner />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('pointer-events-none');
  });
});
