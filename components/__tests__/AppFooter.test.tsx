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
    button: 'button',
    p: 'p',
    section: 'section',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('lucide-react', () => ({
  ShieldCheck: (props: Record<string, unknown>) => <span data-testid="icon-shield" {...props} />,
  Save: (props: Record<string, unknown>) => <span data-testid="icon-save" {...props} />,
  Loader2: (props: Record<string, unknown>) => <span data-testid="icon-loader" {...props} />,
  Sparkles: (props: Record<string, unknown>) => <span data-testid="icon-sparkles" {...props} />,
  Activity: (props: Record<string, unknown>) => <span data-testid="icon-activity" {...props} />,
  Radio: (props: Record<string, unknown>) => <span data-testid="icon-radio" {...props} />,
}));

const mockAddLog = vi.hoisted(() => vi.fn());
vi.mock('../../store', () => ({
  useAppStore: () => ({
    mode: 'SOVEREIGN',
    actions: {
      addLog: mockAddLog,
    },
  }),
}));

vi.mock('../../services/persistenceService', () => ({
  neuralVault: {
    save: vi.fn(),
    load: vi.fn(),
  },
}));

vi.mock('../../services/audioService', () => ({
  audio: {
    play: vi.fn(),
  },
}));

vi.mock('../MetaventionsLogo', () => ({
  default: ({ size, showText }: { size: number; showText: boolean }) => (
    <div data-testid="metaventions-logo" data-size={size} data-show-text={String(showText)}>Logo</div>
  ),
}));

vi.mock('../NeuralDock', () => ({
  default: ({ mode, className }: { mode: string; className: string }) => (
    <div data-testid="neural-dock" data-mode={mode}>NeuralDock</div>
  ),
}));

import AppFooter from '../AppFooter';

describe('AppFooter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the footer element', () => {
    const { container } = render(<AppFooter />);
    const footer = container.querySelector('footer');
    expect(footer).toBeTruthy();
  });

  it('renders the MetaventionsLogo component', () => {
    render(<AppFooter />);
    const logo = screen.getByTestId('metaventions-logo');
    expect(logo).toBeTruthy();
    expect(logo.getAttribute('data-size')).toBe('24');
    expect(logo.getAttribute('data-show-text')).toBe('true');
  });

  it('renders the NeuralDock component with static mode', () => {
    render(<AppFooter />);
    const dock = screen.getByTestId('neural-dock');
    expect(dock).toBeTruthy();
    expect(dock.getAttribute('data-mode')).toBe('static');
  });

  it('displays the copyright year', () => {
    render(<AppFooter />);
    expect(screen.getByText(/© 2026/)).toBeTruthy();
  });

  it('displays the version number', () => {
    render(<AppFooter />);
    expect(screen.getByText('V1.0')).toBeTruthy();
  });

  it('renders all three social links with correct hrefs', () => {
    render(<AppFooter />);
    const linkedinLink = screen.getByText('LINKEDIN');
    const githubLink = screen.getByText('GITHUB');
    const xLink = screen.getByText('X');

    expect(linkedinLink.closest('a')!.getAttribute('href')).toBe('https://www.linkedin.com/in/dico-angelo/');
    expect(githubLink.closest('a')!.getAttribute('href')).toBe('https://github.com/Dicoangelo');
    expect(xLink.closest('a')!.getAttribute('href')).toBe('https://x.com/dicoangelo');
  });

  it('renders social links with target="_blank" and rel attributes', () => {
    render(<AppFooter />);
    const links = screen.getByText('LINKEDIN').closest('a')!;
    expect(links.getAttribute('target')).toBe('_blank');
    expect(links.getAttribute('rel')).toBe('noopener noreferrer');
  });
});
