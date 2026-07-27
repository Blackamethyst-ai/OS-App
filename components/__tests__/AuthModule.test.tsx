// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mocks
const mockSetAuthenticated = vi.hoisted(() => vi.fn());
const mockSetUserProfile = vi.hoisted(() => vi.fn());
const mockSetMode = vi.hoisted(() => vi.fn());
const mockAddToast = vi.hoisted(() => vi.fn());

vi.mock('../../store', () => ({
  useAppStore: () => ({
    actions: {
      setAuthenticated: mockSetAuthenticated,
      setUserProfile: mockSetUserProfile,
      setMode: mockSetMode,
      addToast: mockAddToast,
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
  Cpu: (props: any) => <span data-testid="icon-cpu" {...props} />,
  Globe: (props: any) => <span data-testid="icon-globe" {...props} />,
  Eye: (props: any) => <span data-testid="icon-eye" {...props} />,
  HardDrive: (props: any) => <span data-testid="icon-harddrive" {...props} />,
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

const OBSERVER_PROFILE = {
  displayName: 'Demo Observer',
  role: 'ARCHITECT',
  clearanceLevel: 10,
  avatar: null,
};

describe('AuthModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      value: { search: '', hash: '' },
      writable: true,
    });
  });

  it('renders the profile chooser with brand elements', () => {
    render(<AuthModule />);
    expect(screen.getByText('Metaventions')).toBeDefined();
    expect(screen.getByText('Sovereign AI Platform')).toBeDefined();
    expect(screen.getByTestId('metaventions-logo')).toBeDefined();
    expect(screen.getByText('Choose your operator profile')).toBeDefined();
  });

  it('renders a display name field and a role selector', () => {
    render(<AuthModule />);
    expect(screen.getByPlaceholderText('Display name')).toBeDefined();
    const role = screen.getByLabelText('Role') as HTMLSelectElement;
    expect(role.value).toBe('ARCHITECT');
    expect([...role.options].map(o => o.value)).toEqual(['OPERATOR', 'ARCHITECT', 'SENTINEL']);
  });

  /**
   * The screen is a profile chooser, not an auth gate — there is no server
   * session and nothing secret behind it. Asserting the passphrase field is
   * absent is the regression guard: it previously checked credentials that
   * were compiled into the public bundle, which is what this test exists to
   * stop coming back.
   */
  it('exposes no passphrase field and no credential check', () => {
    render(<AuthModule />);
    expect(screen.queryByPlaceholderText('Passphrase')).toBeNull();
    expect(screen.queryByText('ACCESS DENIED — Invalid credentials')).toBeNull();
    expect(document.querySelector('input[type="password"]')).toBeNull();
  });

  it('does not advertise end-to-end encryption it does not implement', () => {
    render(<AuthModule />);
    expect(screen.queryByText('E2E Encrypted')).toBeNull();
    expect(screen.getByText('Local-first')).toBeDefined();
    expect(screen.getByText('Sovereign')).toBeDefined();
  });

  it('enters with the chosen display name and role', () => {
    render(<AuthModule />);
    const nameInput = screen.getByPlaceholderText('Display name');
    fireEvent.change(nameInput, { target: { value: 'Dico' } });
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'SENTINEL' } });
    fireEvent.submit(nameInput.closest('form')!);

    expect(mockSetUserProfile).toHaveBeenCalledWith({
      displayName: 'Dico',
      role: 'SENTINEL',
      clearanceLevel: 10,
      avatar: null,
    });
    expect(mockSetMode).toHaveBeenCalledWith('ARCHON');
    expect(mockSetAuthenticated).toHaveBeenCalledWith(true);
  });

  it('falls back to a default name when the field is left blank', () => {
    render(<AuthModule />);
    const nameInput = screen.getByPlaceholderText('Display name');
    fireEvent.change(nameInput, { target: { value: '   ' } });
    fireEvent.submit(nameInput.closest('form')!);

    expect(mockSetUserProfile).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'Operator' })
    );
  });

  it('enters as Observer in one click', () => {
    render(<AuthModule />);
    fireEvent.click(screen.getByText('Enter as Observer'));
    expect(mockSetUserProfile).toHaveBeenCalledWith(OBSERVER_PROFILE);
    expect(mockSetMode).toHaveBeenCalledWith('ARCHON');
    expect(mockSetAuthenticated).toHaveBeenCalledWith(true);
  });

  it('still honours existing ?demo=true share links', () => {
    Object.defineProperty(window, 'location', {
      value: { search: '?demo=true', hash: '' },
      writable: true,
    });
    render(<AuthModule />);
    expect(mockSetUserProfile).toHaveBeenCalledWith(OBSERVER_PROFILE);
    expect(mockSetAuthenticated).toHaveBeenCalledWith(true);
  });

  it('grants every profile the same clearance so no nav items disappear', () => {
    // config/navigation.ts filters items by requiredClearance <= clearanceLevel.
    render(<AuthModule />);
    const nameInput = screen.getByPlaceholderText('Display name');
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'OPERATOR' } });
    fireEvent.submit(nameInput.closest('form')!);

    expect(mockSetUserProfile).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'OPERATOR', clearanceLevel: 10 })
    );
  });
});
