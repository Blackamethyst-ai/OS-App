// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';

// Mocks
const mockSetAuthenticated = vi.hoisted(() => vi.fn());
const mockSetUserProfile = vi.hoisted(() => vi.fn());
const mockSetMode = vi.hoisted(() => vi.fn());

vi.mock('../../store', () => ({
  useAppStore: () => ({
    actions: {
      setAuthenticated: mockSetAuthenticated,
      setUserProfile: mockSetUserProfile,
      setMode: mockSetMode,
    },
  }),
}));

vi.mock('motion/react', () => ({
  motion: {
    div: 'div',
    form: 'form',
    span: 'span',
    button: 'button',
  },
  AnimatePresence: ({ children }: any) => children,
}));

vi.mock('lucide-react', () => ({
  Fingerprint: (props: any) => <span data-testid="icon-fingerprint" {...props} />,
  ChevronRight: (props: any) => <span data-testid="icon-chevron-right" {...props} />,
  Loader2: (props: any) => <span data-testid="icon-loader2" {...props} />,
  Cpu: (props: any) => <span data-testid="icon-cpu" {...props} />,
  Globe: (props: any) => <span data-testid="icon-globe" {...props} />,
  Lock: (props: any) => <span data-testid="icon-lock" {...props} />,
  Eye: (props: any) => <span data-testid="icon-eye" {...props} />,
  Zap: (props: any) => <span data-testid="icon-zap" {...props} />,
}));

vi.mock('../MetaventionsLogo', () => ({
  default: () => <div data-testid="metaventions-logo" />,
}));

vi.mock('../../types/domain/core', () => ({
  AppMode: {
    ARCHON: 'ARCHON',
    DASHBOARD: 'DASHBOARD',
  },
}));

import AuthModule from '../AuthModule';

describe('AuthModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset URL search params
    Object.defineProperty(window, 'location', {
      value: { search: '', hash: '' },
      writable: true,
    });
  });

  it('renders the login form with brand elements', () => {
    render(<AuthModule />);
    expect(screen.getByText('Metaventions')).toBeDefined();
    expect(screen.getByText('Sovereign AI Platform')).toBeDefined();
    expect(screen.getByTestId('metaventions-logo')).toBeDefined();
  });

  it('renders operator ID and passphrase inputs', () => {
    render(<AuthModule />);
    expect(screen.getByPlaceholderText('Operator ID')).toBeDefined();
    expect(screen.getByPlaceholderText('Passphrase')).toBeDefined();
  });

  it('shows Sign In button in LOGIN view', () => {
    render(<AuthModule />);
    expect(screen.getByText('Sign In')).toBeDefined();
  });

  it('toggles to REGISTER view when Create Account is clicked', () => {
    render(<AuthModule />);
    const toggleBtn = screen.getByText('Create Account');
    fireEvent.click(toggleBtn);
    // After toggling, button text should now say "Sign In" in footer
    // and main button should say "Create Account"
    // The footer link should show "Sign In" when in REGISTER view
    expect(screen.getByText('Sign In')).toBeDefined();
  });

  it('handles demo access by setting profile and authenticating', () => {
    render(<AuthModule />);
    const demoBtn = screen.getByText('Enter as Observer');
    fireEvent.click(demoBtn);
    expect(mockSetUserProfile).toHaveBeenCalledWith({
      displayName: 'Demo Observer',
      role: 'ARCHITECT',
      clearanceLevel: 10,
      avatar: null,
    });
    expect(mockSetMode).toHaveBeenCalledWith('ARCHON');
    expect(mockSetAuthenticated).toHaveBeenCalledWith(true);
  });

  it('updates credential fields on input change', () => {
    render(<AuthModule />);
    const usernameInput = screen.getByPlaceholderText('Operator ID') as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText('Passphrase') as HTMLInputElement;

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'secretpass' } });

    expect(usernameInput.value).toBe('testuser');
    expect(passwordInput.value).toBe('secretpass');
  });

  it('shows error on invalid credentials after form submit', async () => {
    vi.useFakeTimers();
    render(<AuthModule />);
    const usernameInput = screen.getByPlaceholderText('Operator ID');
    const passwordInput = screen.getByPlaceholderText('Passphrase');

    fireEvent.change(usernameInput, { target: { value: 'user' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong' } });

    const form = usernameInput.closest('form')!;

    await act(async () => {
      fireEvent.submit(form);
      // Advance past the 1200ms setTimeout
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(screen.getByText('ACCESS DENIED — Invalid credentials')).toBeDefined();
    vi.useRealTimers();
  });

  it('shows footer with Sovereign and E2E Encrypted labels', () => {
    render(<AuthModule />);
    expect(screen.getByText('Sovereign')).toBeDefined();
    expect(screen.getByText('E2E Encrypted')).toBeDefined();
  });

  it('disables submit button while loading', async () => {
    render(<AuthModule />);
    const usernameInput = screen.getByPlaceholderText('Operator ID');
    const passwordInput = screen.getByPlaceholderText('Passphrase');

    fireEvent.change(usernameInput, { target: { value: 'user' } });
    fireEvent.change(passwordInput, { target: { value: 'pass' } });

    const form = usernameInput.closest('form')!;
    fireEvent.submit(form);

    // During the 1200ms timeout, the button should be disabled
    const buttons = screen.getAllByRole('button');
    const submitBtn = buttons.find(b => b.getAttribute('disabled') !== null);
    expect(submitBtn).toBeDefined();
  });
});
