// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('motion/react', () => ({
  motion: {
    div: 'div',
    span: 'span',
    button: 'button',
    p: 'p',
    svg: 'svg',
    path: 'path',
    li: 'li',
    ul: 'ul',
    h2: 'h2',
    h3: 'h3',
    section: 'section',
  },
  AnimatePresence: ({ children }: any) => children,
}));

vi.mock('lucide-react', () => ({
  Eye: (props: any) => <span data-testid="icon-eye" {...props}>Eye</span>,
  Loader2: (props: any) => <span data-testid="icon-loader" {...props}>Loader2</span>,
  Zap: (props: any) => <span data-testid="icon-zap" {...props}>Zap</span>,
  Scan: (props: any) => <span data-testid="icon-scan" {...props}>Scan</span>,
  ShieldCheck: (props: any) => <span data-testid="icon-shield" {...props}>ShieldCheck</span>,
  Activity: (props: any) => <span data-testid="icon-activity" {...props}>Activity</span>,
  Target: (props: any) => <span data-testid="icon-target" {...props}>Target</span>,
  Monitor: (props: any) => <span data-testid="icon-monitor" {...props}>Monitor</span>,
}));

const mockVisualCortex = vi.hoisted(() => ({
  isAnalyzing: false,
  dropActive: false,
  isProbing: false,
}));

vi.mock('../../store', () => ({
  useAppStore: () => ({
    visualCortex: mockVisualCortex,
  }),
}));

import VisualCortexOverlay from '../VisualCortexOverlay';

describe('VisualCortexOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVisualCortex.isAnalyzing = false;
    mockVisualCortex.dropActive = false;
    mockVisualCortex.isProbing = false;
  });

  it('renders nothing when all states are inactive', () => {
    const { container } = render(<VisualCortexOverlay />);
    // Should render AnimatePresence wrapper but no visible content
    expect(screen.queryByText('Oculus Protocol Active')).toBeNull();
    expect(screen.queryByText('Decoding Optical Stream')).toBeNull();
  });

  it('shows overlay when dropActive is true', () => {
    mockVisualCortex.dropActive = true;
    render(<VisualCortexOverlay />);
    expect(screen.getByText('Oculus Protocol Active')).toBeTruthy();
  });

  it('shows "Decoding Optical Stream" when isAnalyzing is true', () => {
    mockVisualCortex.isAnalyzing = true;
    render(<VisualCortexOverlay />);
    expect(screen.getByText('Decoding Optical Stream')).toBeTruthy();
  });

  it('shows "Initializing Retinal Probe" when isProbing is true', () => {
    mockVisualCortex.isProbing = true;
    render(<VisualCortexOverlay />);
    expect(screen.getByText('Initializing Retinal Probe')).toBeTruthy();
  });

  it('displays Enclave Encrypted text when active', () => {
    mockVisualCortex.dropActive = true;
    render(<VisualCortexOverlay />);
    expect(screen.getByText('Enclave Encrypted')).toBeTruthy();
  });

  it('shows targeting info for probing mode', () => {
    mockVisualCortex.isProbing = true;
    render(<VisualCortexOverlay />);
    expect(screen.getByText(/External Display/)).toBeTruthy();
  });

  it('shows targeting info for non-probing active mode', () => {
    mockVisualCortex.dropActive = true;
    render(<VisualCortexOverlay />);
    expect(screen.getByText(/Multi-Modal/)).toBeTruthy();
  });

  it('renders Eye icon when only dropActive (not analyzing or probing)', () => {
    mockVisualCortex.dropActive = true;
    render(<VisualCortexOverlay />);
    expect(screen.getByTestId('icon-eye')).toBeTruthy();
  });

  it('renders Monitor icon when probing', () => {
    mockVisualCortex.isProbing = true;
    render(<VisualCortexOverlay />);
    expect(screen.getByTestId('icon-monitor')).toBeTruthy();
  });
});
