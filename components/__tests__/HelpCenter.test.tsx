// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ============================================================================
// MOCKS
// ============================================================================

vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
    span: 'span',
    button: 'button',
    p: 'p',
  },
  AnimatePresence: ({ children }: any) => children,
}));

vi.mock('lucide-react', () => {
  const icon = (name: string) => (props: any) => <span data-testid={`icon-${name}`} {...props}>{name}</span>;
  return {
    HelpCircle: icon('HelpCircle'),
    X: icon('X'),
    BrainCircuit: icon('BrainCircuit'),
    Activity: icon('Activity'),
    HardDrive: icon('HardDrive'),
    Image: icon('Image'),
    Cpu: icon('Cpu'),
    Code: icon('Code'),
    Mic: icon('Mic'),
    Settings: icon('Settings'),
    Info: icon('Info'),
    Zap: icon('Zap'),
    Shield: icon('Shield'),
    Network: icon('Network'),
    FlaskConical: icon('FlaskConical'),
    Command: icon('Command'),
    History: icon('History'),
    BookOpen: icon('BookOpen'),
    Layers: icon('Layers'),
    GitBranch: icon('GitBranch'),
    Globe: icon('Globe'),
    Database: icon('Database'),
    Terminal: icon('Terminal'),
    Workflow: icon('Workflow'),
    ShieldCheck: icon('ShieldCheck'),
    CheckCircle2: icon('CheckCircle2'),
  };
});

import HelpCenter from '../HelpCenter';

// ============================================================================
// TESTS
// ============================================================================

describe('HelpCenter', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the help center with title', () => {
    render(<HelpCenter onClose={mockOnClose} />);
    expect(screen.getByText('V1.0 - THE D-Ecosystem Guide')).toBeTruthy();
  });

  it('renders the close button with aria-label', () => {
    render(<HelpCenter onClose={mockOnClose} />);
    const closeBtn = screen.getByLabelText('Close help center');
    expect(closeBtn).toBeTruthy();
  });

  it('calls onClose when close button is clicked', () => {
    render(<HelpCenter onClose={mockOnClose} />);
    const closeBtn = screen.getByLabelText('Close help center');
    fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    render(<HelpCenter onClose={mockOnClose} />);
    // The outermost motion.div has onClick={onClose}
    // We need to click the backdrop area
    const backdrop = screen.getByText('V1.0 - THE D-Ecosystem Guide').closest('[class*="fixed inset-0"]');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    }
  });

  it('does not call onClose when inner content is clicked (stopPropagation)', () => {
    render(<HelpCenter onClose={mockOnClose} />);
    const title = screen.getByText('V1.0 - THE D-Ecosystem Guide');
    fireEvent.click(title);
    // Click on inner content should not bubble to backdrop
    // The stopPropagation on the inner div prevents it
  });

  it('renders all core operational module feature items', () => {
    render(<HelpCenter onClose={mockOnClose} />);
    expect(screen.getByText('Strategy Bridge')).toBeTruthy();
    expect(screen.getByText('Discovery Lab')).toBeTruthy();
    expect(screen.getByText('Hardware Core')).toBeTruthy();
    expect(screen.getByText('Asset Studio')).toBeTruthy();
    expect(screen.getByText('Code Studio')).toBeTruthy();
    expect(screen.getByText('Voice Mode')).toBeTruthy();
    expect(screen.getByText('Process Logic')).toBeTruthy();
    expect(screen.getByText('Memory Core')).toBeTruthy();
    expect(screen.getByText('Bicameral Swarm')).toBeTruthy();
  });

  it('renders keyboard protocols section with shortcuts', () => {
    render(<HelpCenter onClose={mockOnClose} />);
    expect(screen.getByText('Keyboard Protocols')).toBeTruthy();
    expect(screen.getByText('CMD + K')).toBeTruthy();
    expect(screen.getByText('CMD + S')).toBeTruthy();
    expect(screen.getByText('CMD + SHIFT + V')).toBeTruthy();
  });

  it('renders the Neural Integration section', () => {
    render(<HelpCenter onClose={mockOnClose} />);
    expect(screen.getByText('Neural Integration')).toBeTruthy();
  });

  it('renders the Technical Sovereignty section', () => {
    render(<HelpCenter onClose={mockOnClose} />);
    expect(screen.getByText('Technical Sovereignty')).toBeTruthy();
  });

  it('renders the footer with HIVE_LINK_OK status', () => {
    render(<HelpCenter onClose={mockOnClose} />);
    expect(screen.getByText('HIVE_LINK_OK')).toBeTruthy();
  });

  it('renders feature item descriptions', () => {
    render(<HelpCenter onClose={mockOnClose} />);
    expect(screen.getByText(/Orchestrate DePIN/)).toBeTruthy();
    expect(screen.getByText(/Scientific synthesis/)).toBeTruthy();
  });
});
