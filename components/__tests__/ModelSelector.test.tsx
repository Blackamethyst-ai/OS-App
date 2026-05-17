// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
  Zap: (props: any) => <span data-testid="icon-zap" {...props}>Zap</span>,
  Brain: (props: any) => <span data-testid="icon-brain" {...props}>Brain</span>,
  Sparkles: (props: any) => <span data-testid="icon-sparkles" {...props}>Sparkles</span>,
  Cpu: (props: any) => <span data-testid="icon-cpu" {...props}>Cpu</span>,
  Gauge: (props: any) => <span data-testid="icon-gauge" {...props}>Gauge</span>,
}));

const mockSetPreferences = vi.hoisted(() => vi.fn());
const mockPlayClick = vi.hoisted(() => vi.fn());
const mockModelTier = vi.hoisted(() => ({ value: 'balanced' as string }));

vi.mock('../../store', () => ({
  useAppStore: () => ({
    preferences: {
      modelTier: mockModelTier.value,
    },
    actions: {
      setPreferences: mockSetPreferences,
    },
  }),
}));

vi.mock('../../services/audioService', () => ({
  audio: {
    playClick: mockPlayClick,
  },
}));

vi.mock('../../utils/cn', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

vi.mock('../../types', () => ({
  ModelTier: {},
}));

import { ModelSelector } from '../ModelSelector';

describe('ModelSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockModelTier.value = 'balanced';
  });

  it('renders all 5 tier buttons', () => {
    const { container } = render(<ModelSelector />);
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(5);
  });

  it('shows the active tier label', () => {
    render(<ModelSelector />);
    expect(screen.getByText('Balanced')).toBeTruthy();
  });

  it('calls setPreferences when a tier is clicked', () => {
    const { container } = render(<ModelSelector />);
    const buttons = container.querySelectorAll('button');
    // Click the first button (local)
    fireEvent.click(buttons[0]);
    expect(mockSetPreferences).toHaveBeenCalledWith({ modelTier: 'local' });
  });

  it('calls audio.playClick on selection', () => {
    const { container } = render(<ModelSelector />);
    const buttons = container.querySelectorAll('button');
    fireEvent.click(buttons[1]);
    expect(mockPlayClick).toHaveBeenCalled();
  });

  it('shows tooltip descriptions via title attribute', () => {
    const { container } = render(<ModelSelector />);
    const buttons = container.querySelectorAll('button');
    expect(buttons[0].getAttribute('title')).toBe('Local Ollama inference');
    expect(buttons[1].getAttribute('title')).toContain('DeepSeek V4');
  });

  it('renders icons for each tier', () => {
    render(<ModelSelector />);
    expect(screen.getByTestId('icon-cpu')).toBeTruthy();
    expect(screen.getByTestId('icon-zap')).toBeTruthy();
    expect(screen.getByTestId('icon-gauge')).toBeTruthy();
    expect(screen.getByTestId('icon-brain')).toBeTruthy();
    expect(screen.getByTestId('icon-sparkles')).toBeTruthy();
  });

  it('displays label only for the active tier', () => {
    mockModelTier.value = 'fast';
    render(<ModelSelector />);
    expect(screen.getByText('Speed')).toBeTruthy();
    expect(screen.queryByText('Balanced')).toBeNull();
    expect(screen.queryByText('Power')).toBeNull();
  });
});
