// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mocks
const mockStart = vi.hoisted(() => vi.fn());
const mockSubscribe = vi.hoisted(() => vi.fn(() => vi.fn()));
const mockGetSnapshot = vi.hoisted(() => vi.fn(() => ({
  summary: '3 inputs, 5 buttons, 2 tabs',
  inputs: [
    { id: 'input-1', label: 'Search', value: 'test' },
    { id: 'input-2', label: 'Name', value: '' },
  ],
  buttons: [
    { id: 'btn-1', label: 'Submit' },
    { id: 'btn-2', label: 'Cancel' },
  ],
  tabs: [
    { id: 'tab-1', label: 'Overview' },
  ],
})));
const mockRefresh = vi.hoisted(() => vi.fn(() => ({
  summary: 'Refreshed: 2 inputs, 3 buttons, 1 tab',
  inputs: [],
  buttons: [],
  tabs: [],
})));
const mockGetSummary = vi.hoisted(() => vi.fn(() => 'voice summary'));
const mockUplinkData = vi.hoisted(() => vi.fn());

vi.mock('../../services/universalVoiceHooks', () => ({
  universalVoice: {
    start: mockStart,
    subscribe: mockSubscribe,
    getSnapshot: mockGetSnapshot,
    refresh: mockRefresh,
    getSummary: mockGetSummary,
  },
}));

vi.mock('../../stores/useSystemMind', () => ({
  useSystemMind: (selector: any) => {
    const state = { uplinkData: mockUplinkData };
    return selector ? selector(state) : state;
  },
}));

import UniversalVoiceProvider from '../UniversalVoiceProvider';

describe('UniversalVoiceProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when showDebug is false (default)', () => {
    const { container } = render(<UniversalVoiceProvider />);
    expect(container.innerHTML).toBe('');
  });

  it('starts universalVoice on mount when autoStart is true', () => {
    render(<UniversalVoiceProvider />);
    expect(mockStart).toHaveBeenCalled();
  });

  it('does not start universalVoice when autoStart is false', () => {
    render(<UniversalVoiceProvider autoStart={false} />);
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('subscribes to updates when autoStart is true', () => {
    render(<UniversalVoiceProvider />);
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('renders debug overlay when showDebug is true', () => {
    render(<UniversalVoiceProvider showDebug={true} />);
    expect(screen.getByText('3 inputs, 5 buttons, 2 tabs')).toBeDefined();
  });

  it('shows expand/collapse button in debug mode', () => {
    render(<UniversalVoiceProvider showDebug={true} />);
    expect(screen.getByText('+')).toBeDefined();
  });

  it('expands to show details when expand button is clicked', () => {
    render(<UniversalVoiceProvider showDebug={true} />);
    const expandBtn = screen.getByText('+');
    fireEvent.click(expandBtn);
    expect(screen.getByText('Inputs:')).toBeDefined();
    expect(screen.getByText('Buttons:')).toBeDefined();
    expect(screen.getByText('Tabs:')).toBeDefined();
  });

  it('calls refresh when refresh button is clicked', () => {
    render(<UniversalVoiceProvider showDebug={true} />);
    // The refresh button shows the ↻ character
    const refreshBtn = screen.getByText('\u21BB');
    fireEvent.click(refreshBtn);
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('toggles expanded state with keyboard shortcut Ctrl+Shift+V', () => {
    render(<UniversalVoiceProvider showDebug={true} />);
    // Initially collapsed
    expect(screen.queryByText('Inputs:')).toBeNull();

    // Press Ctrl+Shift+V
    fireEvent.keyDown(window, { key: 'V', ctrlKey: true, shiftKey: true });
    expect(screen.getByText('Inputs:')).toBeDefined();

    // Press again to collapse
    fireEvent.keyDown(window, { key: 'V', ctrlKey: true, shiftKey: true });
    expect(screen.queryByText('Inputs:')).toBeNull();
  });

  it('gets initial snapshot on mount', () => {
    render(<UniversalVoiceProvider showDebug={true} />);
    expect(mockGetSnapshot).toHaveBeenCalled();
  });
});
