// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ============================================================================
// MOCKS
// ============================================================================

const mockAddLog = vi.hoisted(() => vi.fn());
const mockSetTheme = vi.hoisted(() => vi.fn());
const mockKernelOn = vi.hoisted(() => vi.fn().mockReturnValue(() => {}));
const mockKernelGetMetrics = vi.hoisted(() => vi.fn().mockReturnValue({ currentStressLevel: 0 }));
const mockKernelSetAdaptiveUI = vi.hoisted(() => vi.fn());

vi.mock('../../store', () => ({
  useAppStore: () => ({
    actions: {
      addLog: mockAddLog,
      setTheme: mockSetTheme,
    },
    theme: 'DARK',
  }),
}));

vi.mock('../../services/kernel/AgentKernel', () => ({
  agentKernel: {
    on: mockKernelOn,
    getMetrics: mockKernelGetMetrics,
    setAdaptiveUIEnabled: mockKernelSetAdaptiveUI,
  },
}));

import { useStressDetector } from '../useStressDetector';

// ============================================================================
// TESTS
// ============================================================================

describe('useStressDetector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useStressDetector());

    expect(result.current.stressLevel.value).toBe(0);
    expect(result.current.stressLevel.trend).toBe('STABLE');
    expect(result.current.stressLevel.confidence).toBe(0);
    expect(result.current.uiComplexity).toBe('FULL');
    expect(result.current.isAdapting).toBe(false);
  });

  it('should initialize adaptation with FULL complexity', () => {
    const { result } = renderHook(() => useStressDetector());

    expect(result.current.adaptation.level).toBe('FULL');
    expect(result.current.adaptation.hiddenElements).toEqual([]);
    expect(result.current.adaptation.reducedAnimations).toBe(false);
    expect(result.current.adaptation.simplifiedLayout).toBe(false);
    expect(result.current.adaptation.focusMode).toBe(false);
  });

  it('should return empty stress history initially', () => {
    const { result } = renderHook(() => useStressDetector());
    expect(result.current.stressHistory).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  it('should enable the stress detector', () => {
    const { result } = renderHook(() => useStressDetector());

    act(() => {
      result.current.enable();
    });

    expect(mockKernelSetAdaptiveUI).toHaveBeenCalledWith(true);
    expect(mockAddLog).toHaveBeenCalledWith('SYSTEM', 'STRESS: Detector enabled');
  });

  it('should disable the stress detector and reset to FULL', () => {
    const { result } = renderHook(() => useStressDetector());

    act(() => {
      result.current.disable();
    });

    expect(mockKernelSetAdaptiveUI).toHaveBeenCalledWith(false);
    expect(mockAddLog).toHaveBeenCalledWith('SYSTEM', 'STRESS: Detector disabled');
  });

  it('should update config via setConfig', () => {
    const { result } = renderHook(() => useStressDetector());

    act(() => {
      result.current.setConfig({ debounceMs: 5000 });
    });

    // Config is internal state, but we can verify the hook still functions
    expect(result.current.uiComplexity).toBe('FULL');
  });

  it('should force complexity to a specific level', () => {
    const { result } = renderHook(() => useStressDetector());

    act(() => {
      result.current.forceComplexity('MINIMAL');
    });

    expect(result.current.uiComplexity).toBe('MINIMAL');
    expect(result.current.adaptation.level).toBe('MINIMAL');
    expect(result.current.adaptation.reducedAnimations).toBe(true);
    expect(result.current.adaptation.simplifiedLayout).toBe(true);
    expect(mockAddLog).toHaveBeenCalledWith('SYSTEM', expect.stringContaining('STRESS: Adapting UI to MINIMAL mode'));
  });

  it('should force complexity to FLOW_STATE', () => {
    const { result } = renderHook(() => useStressDetector());

    act(() => {
      result.current.forceComplexity('FLOW_STATE');
    });

    expect(result.current.uiComplexity).toBe('FLOW_STATE');
    expect(result.current.adaptation.focusMode).toBe(true);
    expect(result.current.adaptation.hiddenElements).toContain('dock');
    expect(result.current.adaptation.hiddenElements).toContain('header');
  });

  it('should force complexity to REDUCED', () => {
    const { result } = renderHook(() => useStressDetector());

    act(() => {
      result.current.forceComplexity('REDUCED');
    });

    expect(result.current.uiComplexity).toBe('REDUCED');
    expect(result.current.adaptation.hiddenElements).toContain('secondary-panels');
    expect(result.current.adaptation.hiddenElements).toContain('notifications');
    expect(result.current.adaptation.reducedAnimations).toBe(true);
    expect(result.current.adaptation.simplifiedLayout).toBe(false);
  });

  it('should reset to FULL complexity', () => {
    const { result } = renderHook(() => useStressDetector());

    // First force to MINIMAL
    act(() => {
      result.current.forceComplexity('MINIMAL');
    });

    expect(result.current.uiComplexity).toBe('MINIMAL');

    // Then reset
    act(() => {
      result.current.resetToFull();
    });

    expect(result.current.uiComplexity).toBe('FULL');
    expect(result.current.adaptation.hiddenElements).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // isAdapting transitions
  // ---------------------------------------------------------------------------

  it('should set isAdapting during transition and clear after timeout', () => {
    const { result } = renderHook(() => useStressDetector());

    act(() => {
      result.current.forceComplexity('MINIMAL');
    });

    expect(result.current.isAdapting).toBe(true);

    // Advance past the transition duration (default 500ms)
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(result.current.isAdapting).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  it('should return STABLE trend with empty history', () => {
    const { result } = renderHook(() => useStressDetector());

    expect(result.current.getStressTrend()).toBe('STABLE');
  });

  it('should return empty recommendations for low stress', () => {
    const { result } = renderHook(() => useStressDetector());
    const actions = result.current.getRecommendedActions();
    expect(actions).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Kernel event subscription
  // ---------------------------------------------------------------------------

  it('should subscribe to kernel STRESS_THRESHOLD events on mount', () => {
    renderHook(() => useStressDetector());

    expect(mockKernelOn).toHaveBeenCalledWith('STRESS_THRESHOLD', expect.any(Function));
  });

  it('should poll kernel metrics on interval', () => {
    renderHook(() => useStressDetector());

    // Advance timers to trigger the interval
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockKernelGetMetrics).toHaveBeenCalled();
  });

  it('should apply DOM attributes when adapting', () => {
    const { result } = renderHook(() => useStressDetector());

    act(() => {
      result.current.forceComplexity('FLOW_STATE');
    });

    const root = document.documentElement;
    expect(root.getAttribute('data-ui-complexity')).toBe('FLOW_STATE');
    expect(root.getAttribute('data-reduced-motion')).toBe('true');
    expect(root.getAttribute('data-focus-mode')).toBe('true');
  });

  it('should set reduced animation CSS property when reducedAnimations is true', () => {
    const { result } = renderHook(() => useStressDetector());

    act(() => {
      result.current.forceComplexity('REDUCED');
    });

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--animation-duration-multiplier')).toBe('0.1');
  });

  it('should remove animation CSS property when resetToFull', () => {
    const { result } = renderHook(() => useStressDetector());

    act(() => {
      result.current.forceComplexity('REDUCED');
    });

    act(() => {
      result.current.resetToFull();
    });

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--animation-duration-multiplier')).toBe('');
  });
});
