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
    button: React.forwardRef(({ children, ...props }: any, ref: any) => <button ref={ref} {...props}>{children}</button>),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('lucide-react', () => ({
  Moon: (props: any) => <span data-testid="icon-moon" {...props} />,
  Sun: (props: any) => <span data-testid="icon-sun" {...props} />,
  Contrast: (props: any) => <span data-testid="icon-contrast" {...props} />,
  Terminal: (props: any) => <span data-testid="icon-terminal" {...props} />,
  Book: (props: any) => <span data-testid="icon-book" {...props} />,
  Box: (props: any) => <span data-testid="icon-box" {...props} />,
  Zap: (props: any) => <span data-testid="icon-zap" {...props} />,
  Palette: (props: any) => <span data-testid="icon-palette" {...props} />,
  ShieldAlert: (props: any) => <span data-testid="icon-shield-alert" {...props} />,
  LayoutGrid: (props: any) => <span data-testid="icon-layout-grid" {...props} />,
}));

const mockSetTheme = vi.hoisted(() => vi.fn());
const mockPlayClick = vi.hoisted(() => vi.fn());

vi.mock('../../store', () => ({
  useAppStore: vi.fn((selector: any) => {
    const state = {
      theme: 'DARK',
      actions: { setTheme: mockSetTheme },
    };
    return selector(state);
  }),
}));

vi.mock('../../services/audioService', () => ({
  audio: { playClick: mockPlayClick },
}));

vi.mock('../../types', () => ({
  AppTheme: {
    DARK: 'DARK',
    LIGHT: 'LIGHT',
    CONTRAST: 'CONTRAST',
    HIGH_CONTRAST: 'HIGH_CONTRAST',
    AMBER: 'AMBER',
    SOLARIZED: 'SOLARIZED',
    MIDNIGHT: 'MIDNIGHT',
    NEON_CYBER: 'NEON_CYBER',
    CUSTOM: 'CUSTOM',
  },
}));

import ThemeSwitcher from '../ThemeSwitcher';

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the toggle button with aria-label', () => {
    render(<ThemeSwitcher />);
    expect(screen.getByLabelText('Change interface theme')).toBeTruthy();
  });

  it('renders the toggle button with correct title', () => {
    render(<ThemeSwitcher />);
    expect(screen.getByTitle('Change Interface Theme')).toBeTruthy();
  });

  it('does not show dropdown initially', () => {
    render(<ThemeSwitcher />);
    expect(screen.queryByText('Interface Skin // Global Vector')).toBeNull();
  });

  it('opens dropdown when toggle button is clicked', () => {
    render(<ThemeSwitcher />);
    fireEvent.click(screen.getByLabelText('Change interface theme'));
    expect(screen.getByText('Interface Skin // Global Vector')).toBeTruthy();
  });

  it('shows all theme options when dropdown is open', () => {
    render(<ThemeSwitcher />);
    fireEvent.click(screen.getByLabelText('Change interface theme'));
    expect(screen.getByText('Void Core')).toBeTruthy();
    expect(screen.getByText('High Light')).toBeTruthy();
    expect(screen.getByText('Midnight')).toBeTruthy();
    expect(screen.getByText('Amber Protocol')).toBeTruthy();
    expect(screen.getByText('Solarized')).toBeTruthy();
    expect(screen.getByText('Neon Cyber')).toBeTruthy();
    expect(screen.getByText('High Contrast')).toBeTruthy();
    expect(screen.getByText('Custom Skin')).toBeTruthy();
  });

  it('calls setTheme and playClick when a theme is selected', () => {
    render(<ThemeSwitcher />);
    fireEvent.click(screen.getByLabelText('Change interface theme'));
    fireEvent.click(screen.getByText('High Light'));
    expect(mockSetTheme).toHaveBeenCalledWith('LIGHT');
    expect(mockPlayClick).toHaveBeenCalled();
  });

  it('closes dropdown after selecting a theme', () => {
    render(<ThemeSwitcher />);
    fireEvent.click(screen.getByLabelText('Change interface theme'));
    expect(screen.getByText('Interface Skin // Global Vector')).toBeTruthy();
    fireEvent.click(screen.getByText('Midnight'));
    expect(screen.queryByText('Interface Skin // Global Vector')).toBeNull();
  });

  it('closes dropdown when backdrop is clicked', () => {
    const { container } = render(<ThemeSwitcher />);
    fireEvent.click(screen.getByLabelText('Change interface theme'));
    expect(screen.getByText('Interface Skin // Global Vector')).toBeTruthy();
    // The backdrop has role="presentation" and aria-hidden="true", so query by class
    const backdrop = container.querySelector('.fixed.inset-0')!;
    fireEvent.click(backdrop);
    expect(screen.queryByText('Interface Skin // Global Vector')).toBeNull();
  });

  it('shows the preview section when dropdown is open', () => {
    render(<ThemeSwitcher />);
    fireEvent.click(screen.getByLabelText('Change interface theme'));
    expect(screen.getByText('Matrix Projection Preview')).toBeTruthy();
  });

  it('shows the footer text in dropdown', () => {
    render(<ThemeSwitcher />);
    fireEvent.click(screen.getByLabelText('Change interface theme'));
    expect(screen.getByText('Adaptive interface scaling protocols synchronized.')).toBeTruthy();
  });

  it('shows theme descriptions when dropdown is open', () => {
    render(<ThemeSwitcher />);
    fireEvent.click(screen.getByLabelText('Change interface theme'));
    expect(screen.getByText('Obsidian logic interface')).toBeTruthy();
    expect(screen.getByText('Clarity focus palette')).toBeTruthy();
  });
});
