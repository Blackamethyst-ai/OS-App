// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AppMode } from '../../types';

// ============================================================================
// MOCKS
// ============================================================================

const mockAddLog = vi.hoisted(() => vi.fn());
const mockGetHistory = vi.hoisted(() => vi.fn());
const mockCreateCheckpoint = vi.hoisted(() => vi.fn());

vi.mock('../../store', () => ({
  useAppStore: Object.assign(
    (selector?: (s: any) => any) => {
      const state = {
        actions: { addLog: mockAddLog },
        process: {},
        codeStudio: {},
        hardware: {},
        imageGen: {},
        bibliomorphic: {},
        dashboard: {},
        metaventions: {},
        agents: {},
        memory: {},
        voice: {},
        bicameral: {},
      };
      if (selector) return selector(state);
      return state;
    },
    {
      getState: () => ({
        process: { data: 'test' },
        codeStudio: {},
        hardware: {},
        imageGen: {},
        bibliomorphic: {},
        dashboard: {},
        metaventions: {},
        agents: {},
        memory: {},
        voice: {},
        bicameral: {},
      }),
    }
  ),
}));

vi.mock('../../services/persistenceService', () => ({
  neuralVault: {
    getHistory: mockGetHistory,
    createCheckpoint: mockCreateCheckpoint,
  },
}));

vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef(({ children, className, onClick, ...props }: any, ref: any) => (
      <div ref={ref} className={className} onClick={onClick} data-testid="motion-div">{children}</div>
    )),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('lucide-react', () => ({
  History: () => <span>History</span>,
  Play: () => <span>Play</span>,
  RotateCcw: () => <span>RotateCcw</span>,
  Save: () => <span>Save</span>,
  ChevronUp: () => <span>ChevronUp</span>,
  ChevronDown: () => <span>ChevronDown</span>,
  X: () => <span>X</span>,
}));

import TimeTravelScrubber from '../TimeTravelScrubber';

// ============================================================================
// TESTS
// ============================================================================

const mockSnapshots = [
  { timestamp: Date.now() - 30000, mode: AppMode.PROCESS_MAP, label: 'Auto Save 1', state: { data: 'old' } },
  { timestamp: Date.now() - 10000, mode: AppMode.PROCESS_MAP, label: 'Manual Save', state: { data: 'recent' } },
];

describe('TimeTravelScrubber', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetHistory.mockResolvedValue(null);
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <TimeTravelScrubber mode={AppMode.PROCESS_MAP} onRestore={vi.fn()} isOpen={false} onClose={vi.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders content when isOpen is true', () => {
    render(
      <TimeTravelScrubber mode={AppMode.PROCESS_MAP} onRestore={vi.fn()} isOpen={true} onClose={vi.fn()} />
    );
    expect(screen.getByText('Temporal Navigation Hub')).toBeTruthy();
  });

  it('displays checkpoint count', async () => {
    mockGetHistory.mockResolvedValue(mockSnapshots);
    render(
      <TimeTravelScrubber mode={AppMode.PROCESS_MAP} onRestore={vi.fn()} isOpen={true} onClose={vi.fn()} />
    );
    // Wait for async loadHistory
    await vi.waitFor(() => {
      expect(screen.getByText('2 SECURE CHECKPOINTS IDENTIFIED')).toBeTruthy();
    });
  });

  it('calls onClose when X button is clicked', () => {
    const onClose = vi.fn();
    render(
      <TimeTravelScrubber mode={AppMode.PROCESS_MAP} onRestore={vi.fn()} isOpen={true} onClose={onClose} />
    );
    // The X button contains the X icon text
    const closeButtons = screen.getAllByRole('button');
    const xButton = closeButtons.find(b => b.textContent?.includes('X'));
    if (xButton) fireEvent.click(xButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('renders Checkpoint and Live State buttons', () => {
    render(
      <TimeTravelScrubber mode={AppMode.PROCESS_MAP} onRestore={vi.fn()} isOpen={true} onClose={vi.fn()} />
    );
    expect(screen.getByText('Checkpoint')).toBeTruthy();
    expect(screen.getByText('Live State')).toBeTruthy();
  });

  it('calls onRestore when a snapshot is clicked', async () => {
    mockGetHistory.mockResolvedValue(mockSnapshots);
    const onRestore = vi.fn();
    render(
      <TimeTravelScrubber mode={AppMode.PROCESS_MAP} onRestore={onRestore} isOpen={true} onClose={vi.fn()} />
    );
    await vi.waitFor(() => {
      expect(screen.getAllByText('AUTO').length).toBeGreaterThan(0);
    });
    // Click the first snapshot (AUTO)
    const autoLabels = screen.getAllByText('AUTO');
    // The parent motion.div has the onClick
    const snapshotDiv = autoLabels[0].closest('[data-testid="motion-div"]');
    if (snapshotDiv) fireEvent.click(snapshotDiv);
    expect(onRestore).toHaveBeenCalledWith(mockSnapshots[0].state);
  });

  it('calls addLog when restoring a snapshot', async () => {
    mockGetHistory.mockResolvedValue(mockSnapshots);
    const onRestore = vi.fn();
    render(
      <TimeTravelScrubber mode={AppMode.PROCESS_MAP} onRestore={onRestore} isOpen={true} onClose={vi.fn()} />
    );
    await vi.waitFor(() => {
      expect(screen.getAllByText('AUTO').length).toBeGreaterThan(0);
    });
    const autoLabels = screen.getAllByText('AUTO');
    const snapshotDiv = autoLabels[0].closest('[data-testid="motion-div"]');
    if (snapshotDiv) fireEvent.click(snapshotDiv);
    expect(mockAddLog).toHaveBeenCalledWith('WARN', expect.stringContaining('TIMELINE_JUMP'));
  });

  it('renders Projection marker', () => {
    render(
      <TimeTravelScrubber mode={AppMode.PROCESS_MAP} onRestore={vi.fn()} isOpen={true} onClose={vi.fn()} />
    );
    expect(screen.getByText('Projection')).toBeTruthy();
  });

  it('displays SAVE label for non-auto snapshots', async () => {
    mockGetHistory.mockResolvedValue([
      { timestamp: Date.now() - 5000, mode: AppMode.PROCESS_MAP, label: 'Manual Checkpoint', state: {} },
    ]);
    render(
      <TimeTravelScrubber mode={AppMode.PROCESS_MAP} onRestore={vi.fn()} isOpen={true} onClose={vi.fn()} />
    );
    await vi.waitFor(() => {
      expect(screen.getByText('SAVE')).toBeTruthy();
    });
  });
});
