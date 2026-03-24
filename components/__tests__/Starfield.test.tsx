// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

// Mock ResizeObserver as a class
const mockDisconnect = vi.fn();
const mockObserve = vi.fn();
class MockResizeObserver {
  constructor(_cb: () => void) {}
  observe = mockObserve;
  unobserve = vi.fn();
  disconnect = mockDisconnect;
}
vi.stubGlobal('ResizeObserver', MockResizeObserver);

// Mock requestAnimationFrame / cancelAnimationFrame
let rafId = 0;
vi.stubGlobal('requestAnimationFrame', vi.fn().mockImplementation(() => ++rafId));
vi.stubGlobal('cancelAnimationFrame', vi.fn());

// Mock canvas context
const mockCtx = {
  fillStyle: '',
  globalAlpha: 1,
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
};

const originalGetContext = HTMLCanvasElement.prototype.getContext;

vi.mock('../../types', () => ({
  AppMode: {
    DASHBOARD: 'DASHBOARD',
    CODE_STUDIO: 'CODE_STUDIO',
    SYNTHESIS_BRIDGE: 'SYNTHESIS_BRIDGE',
    VOICE_MODE: 'VOICE_MODE',
    IMAGE_GEN: 'IMAGE_GEN',
    METAVENTIONS_HUB: 'METAVENTIONS_HUB',
    BIBLIOMORPHIC: 'BIBLIOMORPHIC',
    PROCESS_MAP: 'PROCESS_MAP',
    MEMORY_CORE: 'MEMORY_CORE',
    HARDWARE_ENGINEER: 'HARDWARE_ENGINEER',
    BICAMERAL: 'BICAMERAL',
    AGENT_CONTROL: 'AGENT_CONTROL',
    AUTONOMOUS_FINANCE: 'AUTONOMOUS_FINANCE',
    AGENT_CORE_TEST: 'AGENT_CORE_TEST',
    CPB_TEST: 'CPB_TEST',
    ARCHON: 'ARCHON',
    META_LEARNING: 'META_LEARNING',
    SOVEREIGN_GALLERY: 'SOVEREIGN_GALLERY',
  },
}));

import Starfield from '../Starfield';

// Use string values that match the enum
const AppMode = {
  DASHBOARD: 'DASHBOARD' as any,
  CODE_STUDIO: 'CODE_STUDIO' as any,
};

describe('Starfield', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rafId = 0;
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx) as any;
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  it('renders a canvas element', () => {
    const { container } = render(<Starfield mode={AppMode.DASHBOARD} />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('canvas has fixed positioning class', () => {
    const { container } = render(<Starfield mode={AppMode.DASHBOARD} />);
    const canvas = container.querySelector('canvas');
    expect(canvas?.className).toContain('fixed');
  });

  it('initializes canvas context on mount', () => {
    render(<Starfield mode={AppMode.DASHBOARD} />);
    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();
  });

  it('sets up ResizeObserver on mount', () => {
    render(<Starfield mode={AppMode.DASHBOARD} />);
    expect(mockObserve).toHaveBeenCalled();
  });

  it('calls requestAnimationFrame for animation', () => {
    render(<Starfield mode={AppMode.DASHBOARD} />);
    expect(requestAnimationFrame).toHaveBeenCalled();
  });

  it('cleans up on unmount by disconnecting ResizeObserver and cancelling animation', () => {
    const { unmount } = render(<Starfield mode={AppMode.DASHBOARD} />);
    unmount();
    expect(mockDisconnect).toHaveBeenCalled();
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });

  it('re-initializes when mode changes', () => {
    const { rerender } = render(<Starfield mode={AppMode.DASHBOARD} />);
    const callsBefore = (HTMLCanvasElement.prototype.getContext as any).mock.calls.length;
    rerender(<Starfield mode={AppMode.CODE_STUDIO} />);
    const callsAfter = (HTMLCanvasElement.prototype.getContext as any).mock.calls.length;
    expect(callsAfter).toBeGreaterThan(callsBefore);
  });
});
