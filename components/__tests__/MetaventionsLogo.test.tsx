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

import MetaventionsLogo from '../MetaventionsLogo';

describe('MetaventionsLogo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<MetaventionsLogo />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders an SVG element', () => {
    const { container } = render(<MetaventionsLogo />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('applies default size of 32', () => {
    const { container } = render(<MetaventionsLogo />);
    const sizeDiv = container.querySelector('[style]');
    expect(sizeDiv?.getAttribute('style')).toContain('width: 32px');
    expect(sizeDiv?.getAttribute('style')).toContain('height: 32px');
  });

  it('applies custom size', () => {
    const { container } = render(<MetaventionsLogo size={64} />);
    const sizeDiv = container.querySelector('[style]');
    expect(sizeDiv?.getAttribute('style')).toContain('width: 64px');
    expect(sizeDiv?.getAttribute('style')).toContain('height: 64px');
  });

  it('does not show text by default', () => {
    render(<MetaventionsLogo />);
    expect(screen.queryByText('Metaventions')).toBeNull();
    expect(screen.queryByText('AI')).toBeNull();
  });

  it('shows text when showText is true', () => {
    render(<MetaventionsLogo showText={true} />);
    expect(screen.getByText('Metaventions')).toBeTruthy();
    expect(screen.getByText('AI')).toBeTruthy();
  });

  it('applies custom className', () => {
    const { container } = render(<MetaventionsLogo className="my-custom-class" />);
    expect(container.firstChild).toBeTruthy();
    expect((container.firstChild as HTMLElement).className).toContain('my-custom-class');
  });

  it('renders the SVG with correct viewBox', () => {
    const { container } = render(<MetaventionsLogo />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 100 100');
  });
});
