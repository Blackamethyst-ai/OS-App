// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ============================================================================
// MOCKS
// ============================================================================

const mockToggleProfile = vi.hoisted(() => vi.fn());
const mockSetUserProfile = vi.hoisted(() => vi.fn());
const mockSetTheme = vi.hoisted(() => vi.fn());
const mockAddLog = vi.hoisted(() => vi.fn());

const mockStoreValues = vi.hoisted(() => ({
  isProfileOpen: true,
  user: {
    displayName: 'TestUser',
    role: 'ARCHITECT',
    clearanceLevel: 3,
    avatar: null as string | null,
  },
  theme: 'DARK',
  actions: {
    toggleProfile: mockToggleProfile,
    setUserProfile: mockSetUserProfile,
    setTheme: mockSetTheme,
    addLog: mockAddLog,
  },
}));

vi.mock('../../store', () => ({
  useAppStore: (selector?: (state: any) => any) => {
    if (selector) return selector(mockStoreValues);
    return mockStoreValues;
  },
}));

vi.mock('../../services/apiKeyService', () => ({
  apiKeyService: {
    hasGeminiKey: vi.fn().mockReturnValue(false),
    getGeminiKey: vi.fn().mockReturnValue(''),
    setKey: vi.fn().mockResolvedValue(undefined),
    removeKey: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../services/persistenceService', () => ({
  neuralVault: {
    saveProfile: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../services/geminiService', () => ({
  generateAvatar: vi.fn().mockResolvedValue('data:image/png;base64,abc123'),
  promptSelectKey: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/audioService', () => ({
  audio: {
    playClick: vi.fn(),
    playSuccess: vi.fn(),
    playError: vi.fn(),
    playHover: vi.fn(),
  },
}));

vi.mock('../../services/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../types', () => ({
  AppTheme: {
    DARK: 'DARK',
    LIGHT: 'LIGHT',
    CONTRAST: 'CONTRAST',
    MIDNIGHT: 'MIDNIGHT',
  },
}));

vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('lucide-react', () => {
  const React = require('react');
  const i = (props: any) => React.createElement('span', null, props?.children);
  return {
    User: i, X: i, Camera: i, Save: i, ShieldCheck: i, Loader2: i,
    Fingerprint: i, ScanFace: i, Sparkles: i, ChevronDown: i, Upload: i,
    Sun: i, Moon: i, Contrast: i, Activity: i, Key: i,
  };
});

import UserProfileOverlay from '../UserProfileOverlay';

// ============================================================================
// TESTS
// ============================================================================

describe('UserProfileOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreValues.isProfileOpen = true;
    mockStoreValues.user.displayName = 'TestUser';
    mockStoreValues.user.role = 'ARCHITECT';
    mockStoreValues.user.clearanceLevel = 3;
    mockStoreValues.user.avatar = null;

    // Mock ResizeObserver
    vi.stubGlobal('ResizeObserver', class {
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
    });
  });

  it('renders the profile overlay when open', () => {
    render(<UserProfileOverlay />);
    expect(screen.getByText('Identity Fabrication')).toBeTruthy();
  });

  it('does not render when isProfileOpen is false', () => {
    mockStoreValues.isProfileOpen = false;
    render(<UserProfileOverlay />);
    expect(screen.queryByText('Identity Fabrication')).toBeNull();
  });

  it('renders the designation input with user name', () => {
    render(<UserProfileOverlay />);
    const input = screen.getByPlaceholderText('Enter Operator Name...') as HTMLInputElement;
    expect(input.value).toBe('TestUser');
  });

  it('renders the role selector with available roles', () => {
    render(<UserProfileOverlay />);
    const select = screen.getByDisplayValue('ARCHITECT') as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(select.options.length).toBe(5);
  });

  it('renders clearance level buttons', () => {
    render(<UserProfileOverlay />);
    expect(screen.getByText('Lvl 3')).toBeTruthy();
  });

  it('updates the name input when typed', () => {
    render(<UserProfileOverlay />);
    const input = screen.getByPlaceholderText('Enter Operator Name...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'NewName' } });
    expect(input.value).toBe('NewName');
  });

  it('renders the SAVE IDENTITY button', () => {
    render(<UserProfileOverlay />);
    expect(screen.getByText('SAVE IDENTITY')).toBeTruthy();
  });

  it('disables save button when name is empty', () => {
    mockStoreValues.user.displayName = '';
    render(<UserProfileOverlay />);
    const input = screen.getByPlaceholderText('Enter Operator Name...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });
    const saveBtn = screen.getByText('SAVE IDENTITY').closest('button') as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it('calls toggleProfile(false) when close button is clicked', () => {
    render(<UserProfileOverlay />);
    const closeBtn = screen.getByLabelText('Close profile');
    fireEvent.click(closeBtn);
    expect(mockToggleProfile).toHaveBeenCalledWith(false);
  });

  it('renders theme selector buttons', () => {
    render(<UserProfileOverlay />);
    expect(screen.getByText('Dark')).toBeTruthy();
    expect(screen.getByText('High Con..')).toBeTruthy();
    expect(screen.getByText('Midnight')).toBeTruthy();
  });

  it('renders the API key input', () => {
    render(<UserProfileOverlay />);
    const apiInput = screen.getByPlaceholderText('AI Studio Key (Optional)');
    expect(apiInput).toBeTruthy();
  });

  it('closes profile on Escape key', () => {
    render(<UserProfileOverlay />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockToggleProfile).toHaveBeenCalledWith(false);
  });
});
