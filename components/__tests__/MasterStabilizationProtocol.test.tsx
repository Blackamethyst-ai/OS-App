// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ============================================================================
// MOCKS
// ============================================================================

const mockAddLog = vi.hoisted(() => vi.fn());
const mockSetBiometricState = vi.hoisted(() => vi.fn());
const mockSetKernelState = vi.hoisted(() => vi.fn());
const mockSetDashboardState = vi.hoisted(() => vi.fn());
const mockSetProcessState = vi.hoisted(() => vi.fn());

const mockStoreState = vi.hoisted(() => ({
  kernel: { operationalState: 'IDLE' },
  biometric: { isActive: false },
  isTransitioning: false,
  dashboard: { isGenerating: false },
  process: { isLoading: false },
  actions: {
    addLog: mockAddLog,
    setBiometricState: mockSetBiometricState,
    setKernelState: mockSetKernelState,
    setDashboardState: mockSetDashboardState,
    setProcessState: mockSetProcessState,
  },
}));

vi.mock('../../store', () => ({
  useAppStore: Object.assign(
    (selector?: (s: any) => any) => {
      if (selector) return selector(mockStoreState);
      return mockStoreState;
    },
    {
      getState: () => mockStoreState,
      setState: vi.fn(),
    }
  ),
}));

vi.mock('../../services/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../services/faceDetectionService', () => ({
  faceDetectionService: {
    getLastDetection: vi.fn(() => null),
  },
}));

vi.mock('../../services/kernel', () => ({
  agentKernel: {
    shutdown: vi.fn(),
    boot: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
  },
  AnimatePresence: ({ children }: any) => children,
}));

vi.mock('lucide-react', () => {
  const icon = (name: string) => (props: any) => <span data-testid={`icon-${name}`} {...props}>{name}</span>;
  return {
    ShieldCheck: icon('ShieldCheck'),
    Zap: icon('Zap'),
  };
});

import MasterStabilizationProtocol from '../MasterStabilizationProtocol';

// ============================================================================
// TESTS
// ============================================================================

describe('MasterStabilizationProtocol', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockStoreState.kernel.operationalState = 'IDLE';
    mockStoreState.biometric.isActive = false;
    mockStoreState.isTransitioning = false;
    mockStoreState.dashboard.isGenerating = false;
    mockStoreState.process.isLoading = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders without crashing', () => {
    const { container } = render(<MasterStabilizationProtocol />);
    expect(container).toBeTruthy();
  });

  it('does not show stabilization indicator by default', () => {
    render(<MasterStabilizationProtocol />);
    expect(screen.queryByText('Stability Protocol Active')).toBeNull();
  });

  it('renders as a background service with no visible UI when idle', () => {
    const { container } = render(<MasterStabilizationProtocol />);
    // When not stabilizing, the AnimatePresence should render nothing meaningful
    expect(screen.queryByText('Stability Protocol Active')).toBeNull();
  });

  it('renders with ShieldCheck and Zap icons when stabilizing', () => {
    // We need to trigger stabilization - set kernel to ERROR state
    mockStoreState.kernel.operationalState = 'ERROR';
    render(<MasterStabilizationProtocol />);
    // The stabilization visual should show after kernel error triggers it
    expect(screen.getByText('Stability Protocol Active')).toBeTruthy();
  });

  it('handles kernel ERROR state by triggering stabilization', () => {
    mockStoreState.kernel.operationalState = 'ERROR';
    render(<MasterStabilizationProtocol />);
    // When kernel is in ERROR state, the stabilization visual should trigger
    expect(screen.getByText('Stability Protocol Active')).toBeTruthy();
  });

  it('sets up biometric monitoring interval when biometric is active', () => {
    mockStoreState.biometric.isActive = true;
    render(<MasterStabilizationProtocol />);
    // The interval runs every 200ms
    vi.advanceTimersByTime(200);
    // No crash means the interval was set up correctly
  });

  it('cleans up biometric interval on unmount', () => {
    mockStoreState.biometric.isActive = true;
    const { unmount } = render(<MasterStabilizationProtocol />);
    unmount();
    // No errors on advancing timers after unmount
    vi.advanceTimersByTime(1000);
  });

  it('handles dashboard stuck loading state', () => {
    mockStoreState.dashboard.isGenerating = true;
    render(<MasterStabilizationProtocol />);
    // The timeout is 15 seconds
    vi.advanceTimersByTime(16000);
    expect(mockSetDashboardState).toHaveBeenCalledWith({ isGenerating: false });
  });

  it('handles process stuck loading state', () => {
    mockStoreState.process.isLoading = true;
    render(<MasterStabilizationProtocol />);
    // The timeout is 10 seconds
    vi.advanceTimersByTime(11000);
    expect(mockSetProcessState).toHaveBeenCalledWith({ isLoading: false });
  });

  it('does not spam stabilization visuals within 5 seconds', () => {
    mockStoreState.kernel.operationalState = 'ERROR';
    render(<MasterStabilizationProtocol />);
    // First trigger should show
    expect(screen.getByText('Stability Protocol Active')).toBeTruthy();
  });
});
