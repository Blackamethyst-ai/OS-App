// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ============================================================================
// MOCKS
// ============================================================================

vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) =>
      React.createElement('div', { ...props, ref, 'data-testid': 'motion-div' }, children)),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock('lucide-react', () => {
  const icon = ({ children, ...props }: any) => React.createElement('span', props, children);
  return {
    FlaskConical: icon,
    Download: icon,
    BarChart3: icon,
    X: icon,
    Check: icon,
    AlertCircle: icon,
  };
});

import { ExperimentLogger } from '../ExperimentLogger';

// ============================================================================
// localStorage mock
// ============================================================================

const storageMap = new Map<string, string>();

const mockLocalStorage = {
  getItem: vi.fn((key: string) => storageMap.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => { storageMap.set(key, value); }),
  removeItem: vi.fn((key: string) => { storageMap.delete(key); }),
  clear: vi.fn(() => { storageMap.clear(); }),
  get length() { return storageMap.size; },
  key: vi.fn((_i: number) => null),
};

Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage, writable: true });

// ============================================================================
// HELPERS
// ============================================================================

const STORAGE_KEY = 'ace_experiment_trials';

function renderLogger(overrides: Record<string, unknown> = {}) {
  const defaultProps = {
    isVisible: true,
    onClose: vi.fn(),
    currentTask: 'Test task',
    aceEnabled: true,
    complexity: 'HIGH',
    rounds: 3,
    gap: 2.5,
    targetGap: 3,
    agents: ['agent-a', 'agent-b'],
    dqScore: { validity: 0.8, specificity: 0.7, correctness: 0.9, overall: 0.8 },
    output: 'Some output text',
    ...overrides,
  };
  return { ...render(<ExperimentLogger {...defaultProps as any} />), props: defaultProps };
}

// ============================================================================
// TESTS
// ============================================================================

describe('ExperimentLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMap.clear();
  });

  it('renders nothing when isVisible is false', () => {
    const { container } = render(
      <ExperimentLogger isVisible={false} onClose={vi.fn()} />
    );
    expect(container.querySelector('[data-testid="motion-div"]')).toBeNull();
  });

  it('renders header when visible', () => {
    renderLogger();
    expect(screen.getByText('Experiment Logger')).toBeTruthy();
  });

  it('displays current task name', () => {
    renderLogger({ currentTask: 'Analyze dataset' });
    expect(screen.getByText('Analyze dataset')).toBeTruthy();
  });

  it('shows C2 (ACE) condition when aceEnabled', () => {
    renderLogger({ aceEnabled: true });
    expect(screen.getByText('C2 (ACE)')).toBeTruthy();
  });

  it('shows C1 (Baseline) condition when aceEnabled is false', () => {
    renderLogger({ aceEnabled: false });
    expect(screen.getByText('C1 (Baseline)')).toBeTruthy();
  });

  it('displays DQ score as percentage', () => {
    renderLogger({ dqScore: { validity: 0.8, specificity: 0.7, correctness: 0.9, overall: 0.75 } });
    expect(screen.getByText('75%')).toBeTruthy();
  });

  it('calls onClose when X button is clicked', () => {
    const onClose = vi.fn();
    renderLogger({ onClose });
    // Find the close button (the one in the header area)
    const buttons = screen.getAllByRole('button');
    const closeButton = buttons[0]; // First button is the close button in header
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('logs a trial to localStorage when Log button is clicked', () => {
    renderLogger();
    const logButton = screen.getByText('Log This Trial');
    fireEvent.click(logButton);

    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).toBeTruthy();
    const trials = JSON.parse(stored!);
    expect(trials).toHaveLength(1);
    expect(trials[0].condition).toBe('C2_ACE');
    expect(trials[0].task).toBe('Test task');
  });

  it('disables Log button when currentTask is missing', () => {
    renderLogger({ currentTask: undefined, rounds: undefined });
    const logButton = screen.getByText('Log This Trial');
    expect(logButton.closest('button')?.disabled).toBe(true);
  });

  it('loads existing trials from localStorage', () => {
    const existingTrials = [
      { trial_id: 'C1_BASELINE_1', condition: 'C1_BASELINE', rounds_used: 5, task: 'old', dq_score: null, actionable: false },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existingTrials));

    renderLogger();
    // Should show 1 in the C1 Baseline count
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('toggles stats details when Show/Hide is clicked', () => {
    // Pre-populate with trials
    const trials = [
      { trial_id: 'C1_1', condition: 'C1_BASELINE', rounds_used: 4, task: 't', dq_score: null, actionable: false },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trials));

    renderLogger();
    const toggleBtn = screen.getByText('Show Details');
    fireEvent.click(toggleBtn);
    expect(screen.getByText('Hide Details')).toBeTruthy();
  });

  it('shows progress bar when trials < 100', () => {
    const trials = [
      { trial_id: 'C2_1', condition: 'C2_ACE', rounds_used: 2, task: 't', dq_score: { overall: 0.8 }, actionable: true },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trials));

    renderLogger();
    expect(screen.getByText('99 trials to target (100)')).toBeTruthy();
  });
});
