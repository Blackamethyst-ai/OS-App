// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ============================================================================
// MOCKS
// ============================================================================

const mockGetKeyStatus = vi.hoisted(() => vi.fn());
const mockIsVaultUnlocked = vi.hoisted(() => vi.fn());
const mockHasVault = vi.hoisted(() => vi.fn());
const mockCreateVault = vi.hoisted(() => vi.fn());
const mockUnlockVault = vi.hoisted(() => vi.fn());
const mockLockVault = vi.hoisted(() => vi.fn());
const mockResetVault = vi.hoisted(() => vi.fn());
const mockGetKey = vi.hoisted(() => vi.fn());
const mockSetKey = vi.hoisted(() => vi.fn());
const mockRemoveKey = vi.hoisted(() => vi.fn());
const mockValidateGeminiKey = vi.hoisted(() => vi.fn());
const mockValidateElevenLabsKey = vi.hoisted(() => vi.fn());
const mockValidateDeepgramKey = vi.hoisted(() => vi.fn());
const mockValidateOpenAIKey = vi.hoisted(() => vi.fn());
const mockSubscribe = vi.hoisted(() => vi.fn());

vi.mock('../../services/apiKeyService', () => ({
  apiKeyService: {
    getKeyStatus: mockGetKeyStatus,
    isVaultUnlocked: mockIsVaultUnlocked,
    hasVault: mockHasVault,
    createVault: mockCreateVault,
    unlockVault: mockUnlockVault,
    lockVault: mockLockVault,
    resetVault: mockResetVault,
    getKey: mockGetKey,
    setKey: mockSetKey,
    removeKey: mockRemoveKey,
    validateGeminiKey: mockValidateGeminiKey,
    validateElevenLabsKey: mockValidateElevenLabsKey,
    validateDeepgramKey: mockValidateDeepgramKey,
    validateOpenAIKey: mockValidateOpenAIKey,
    subscribe: mockSubscribe,
  },
}));

vi.mock('../../services/audioService', () => ({
  audio: {
    playSuccess: vi.fn(),
    playError: vi.fn(),
    playClick: vi.fn(),
  },
}));

vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('lucide-react', () => ({
  X: () => <span data-testid="icon-x">X</span>,
  Key: () => <span data-testid="icon-key">Key</span>,
  Check: () => <span data-testid="icon-check">Check</span>,
  Loader2: () => <span data-testid="icon-loader">Loader</span>,
  AlertTriangle: () => <span data-testid="icon-alert">Alert</span>,
  Eye: () => <span data-testid="icon-eye">Eye</span>,
  EyeOff: () => <span data-testid="icon-eyeoff">EyeOff</span>,
  Lock: () => <span data-testid="icon-lock">Lock</span>,
  Shield: () => <span data-testid="icon-shield">Shield</span>,
  Unlock: () => <span data-testid="icon-unlock">Unlock</span>,
}));

import ApiKeyModal from '../ApiKeyModal';

describe('ApiKeyModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetKeyStatus.mockReturnValue([]);
    mockIsVaultUnlocked.mockReturnValue(false);
    mockHasVault.mockReturnValue(false);
    mockGetKey.mockReturnValue(null);
    mockSubscribe.mockReturnValue(vi.fn());
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<ApiKeyModal isOpen={false} onClose={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders vault setup when no vault exists', () => {
    mockHasVault.mockReturnValue(false);
    mockIsVaultUnlocked.mockReturnValue(false);
    render(<ApiKeyModal {...defaultProps} />);
    expect(screen.getByText('Create Secure Vault')).toBeTruthy();
  });

  it('renders unlock view when vault exists but is locked', () => {
    mockHasVault.mockReturnValue(true);
    mockIsVaultUnlocked.mockReturnValue(false);
    render(<ApiKeyModal {...defaultProps} />);
    expect(screen.getByText('Unlock Vault')).toBeTruthy();
  });

  it('renders key management when vault is unlocked', () => {
    mockHasVault.mockReturnValue(true);
    mockIsVaultUnlocked.mockReturnValue(true);
    mockGetKeyStatus.mockReturnValue([
      { provider: 'gemini', configured: false },
      { provider: 'claude', configured: false },
    ]);
    render(<ApiKeyModal {...defaultProps} />);
    expect(screen.getByText('Gemini')).toBeTruthy();
    expect(screen.getByText('Claude')).toBeTruthy();
  });

  it('shows password error when password is too short on create vault', async () => {
    mockHasVault.mockReturnValue(false);
    mockIsVaultUnlocked.mockReturnValue(false);
    render(<ApiKeyModal {...defaultProps} />);

    const passwordInput = screen.getByLabelText('Create master password');
    const confirmInput = screen.getByLabelText('Confirm master password');
    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.change(confirmInput, { target: { value: 'short' } });

    const createBtn = screen.getByText('Create Vault');
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeTruthy();
    });
  });

  it('shows error when passwords do not match', async () => {
    mockHasVault.mockReturnValue(false);
    mockIsVaultUnlocked.mockReturnValue(false);
    render(<ApiKeyModal {...defaultProps} />);

    const passwordInput = screen.getByLabelText('Create master password');
    const confirmInput = screen.getByLabelText('Confirm master password');
    fireEvent.change(passwordInput, { target: { value: 'longpassword123' } });
    fireEvent.change(confirmInput, { target: { value: 'differentpassword' } });

    const createBtn = screen.getByText('Create Vault');
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeTruthy();
    });
  });

  it('calls createVault on successful vault creation', async () => {
    mockHasVault.mockReturnValue(false);
    mockIsVaultUnlocked.mockReturnValue(false);
    mockCreateVault.mockResolvedValue(true);
    render(<ApiKeyModal {...defaultProps} />);

    const passwordInput = screen.getByLabelText('Create master password');
    const confirmInput = screen.getByLabelText('Confirm master password');
    fireEvent.change(passwordInput, { target: { value: 'mysecurepassword' } });
    fireEvent.change(confirmInput, { target: { value: 'mysecurepassword' } });

    const createBtn = screen.getByText('Create Vault');
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(mockCreateVault).toHaveBeenCalledWith('mysecurepassword');
    });
  });

  it('calls unlockVault when submitting master password', async () => {
    mockHasVault.mockReturnValue(true);
    mockIsVaultUnlocked.mockReturnValue(false);
    mockUnlockVault.mockResolvedValue(true);
    render(<ApiKeyModal {...defaultProps} />);

    const passwordInput = screen.getByLabelText('Master password');
    fireEvent.change(passwordInput, { target: { value: 'mypassword' } });

    const unlockBtns = screen.getAllByText('Unlock');
    const unlockBtn = unlockBtns.find(el => el.closest('button') && el.tagName !== 'SPAN') || unlockBtns[unlockBtns.length - 1];
    fireEvent.click(unlockBtn.closest('button')!);

    await waitFor(() => {
      expect(mockUnlockVault).toHaveBeenCalledWith('mypassword');
    });
  });

  it('shows error on invalid master password', async () => {
    mockHasVault.mockReturnValue(true);
    mockIsVaultUnlocked.mockReturnValue(false);
    mockUnlockVault.mockResolvedValue(false);
    render(<ApiKeyModal {...defaultProps} />);

    const passwordInput = screen.getByLabelText('Master password');
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });

    const unlockBtns = screen.getAllByText('Unlock');
    const unlockBtn = unlockBtns.find(el => el.closest('button') && el.tagName !== 'SPAN') || unlockBtns[unlockBtns.length - 1];
    fireEvent.click(unlockBtn.closest('button')!);

    await waitFor(() => {
      expect(screen.getByText('Invalid master password')).toBeTruthy();
    });
  });

  it('calls onClose when close button is clicked', () => {
    render(<ApiKeyModal {...defaultProps} />);
    const closeBtn = screen.getByLabelText('Close dialog');
    fireEvent.click(closeBtn);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('toggles password visibility', () => {
    mockHasVault.mockReturnValue(false);
    mockIsVaultUnlocked.mockReturnValue(false);
    render(<ApiKeyModal {...defaultProps} />);

    const passwordInput = screen.getByLabelText('Create master password');
    expect(passwordInput.getAttribute('type')).toBe('password');

    const toggleBtn = screen.getByLabelText('Show password');
    fireEvent.click(toggleBtn);

    expect(passwordInput.getAttribute('type')).toBe('text');
  });

  it('calls onClose when Cancel button is clicked', () => {
    mockHasVault.mockReturnValue(false);
    mockIsVaultUnlocked.mockReturnValue(false);
    render(<ApiKeyModal {...defaultProps} />);

    const cancelBtn = screen.getByText('Cancel');
    fireEvent.click(cancelBtn);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('subscribes to apiKeyService changes', () => {
    render(<ApiKeyModal {...defaultProps} />);
    expect(mockSubscribe).toHaveBeenCalled();
  });
});
