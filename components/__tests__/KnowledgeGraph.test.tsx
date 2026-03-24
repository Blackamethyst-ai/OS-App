// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ============================================================================
// MOCKS
// ============================================================================

const mockAddResearchTask = vi.hoisted(() => vi.fn());
const mockAddLog = vi.hoisted(() => vi.fn());
const mockPlayClick = vi.hoisted(() => vi.fn());
const mockPlayTransition = vi.hoisted(() => vi.fn());

vi.mock('../../store', () => ({
  useAppStore: () => ({
    actions: {
      addResearchTask: mockAddResearchTask,
      addLog: mockAddLog,
    },
  }),
}));

vi.mock('../../services/audioService', () => ({
  audio: {
    playClick: mockPlayClick,
    playTransition: mockPlayTransition,
    playTone: vi.fn(),
  },
}));

vi.mock('../../utils/renderSafe', () => ({
  renderSafe: (v: unknown) => (v == null ? '' : String(v)),
}));

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
    BrainCircuit: icon,
    X: icon,
    Search: icon,
    GitBranch: icon,
    Sparkles: icon,
    Target: icon,
    Zap: icon,
    Activity: icon,
    Info: icon,
    ChevronRight: icon,
  };
});

import KnowledgeGraph from '../KnowledgeGraph';
import { KnowledgeNode } from '../../types';

// ============================================================================
// HELPERS
// ============================================================================

function makeNode(overrides: Partial<KnowledgeNode> = {}): KnowledgeNode {
  return {
    id: 'node-1',
    label: 'Test Node',
    type: 'CONCEPT',
    connections: [],
    strength: 0.8,
    color: '#9d4edd',
    data: { summary: 'Test summary' },
    ...overrides,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('KnowledgeGraph', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock canvas getContext since happy-dom doesn't have full canvas support
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      fillText: vi.fn(),
      set lineWidth(_v: number) {},
      get lineWidth() { return 1; },
      set strokeStyle(_v: string) {},
      get strokeStyle() { return ''; },
      set fillStyle(_v: string) {},
      get fillStyle() { return ''; },
      set globalAlpha(_v: number) {},
      get globalAlpha() { return 1; },
      set shadowBlur(_v: number) {},
      get shadowBlur() { return 0; },
      set shadowColor(_v: string) {},
      get shadowColor() { return ''; },
      set font(_v: string) {},
      get font() { return ''; },
      set textAlign(_v: string) {},
      get textAlign() { return ''; },
    });
  });

  it('renders the canvas element', () => {
    const { container } = render(<KnowledgeGraph nodes={[makeNode()]} />);
    expect(container.querySelector('canvas')).toBeTruthy();
  });

  it('shows Neural Lattice header', () => {
    render(<KnowledgeGraph nodes={[makeNode()]} />);
    expect(screen.getByText('Neural Lattice')).toBeTruthy();
  });

  it('renders search input with placeholder', () => {
    render(<KnowledgeGraph nodes={[makeNode()]} />);
    const input = screen.getByPlaceholderText('Locate Node Protocol...');
    expect(input).toBeTruthy();
  });

  it('updates search term when typing in search input', () => {
    render(<KnowledgeGraph nodes={[makeNode()]} />);
    const input = screen.getByPlaceholderText('Locate Node Protocol...');
    fireEvent.change(input, { target: { value: 'alpha' } });
    expect((input as HTMLInputElement).value).toBe('alpha');
  });

  it('shows clear button when search term is present', () => {
    render(<KnowledgeGraph nodes={[makeNode()]} />);
    const input = screen.getByPlaceholderText('Locate Node Protocol...');
    fireEvent.change(input, { target: { value: 'test' } });
    // The clear button should now appear
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('clears search term when clear button is clicked', () => {
    render(<KnowledgeGraph nodes={[makeNode()]} />);
    const input = screen.getByPlaceholderText('Locate Node Protocol...');
    fireEvent.change(input, { target: { value: 'search-me' } });
    // Find and click the clear button
    const clearBtn = screen.getAllByRole('button')[0];
    fireEvent.click(clearBtn);
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('does not show inspector panel initially', () => {
    render(<KnowledgeGraph nodes={[makeNode()]} />);
    expect(screen.queryByText('Initialize Branch Probe')).toBeNull();
  });

  it('renders with multiple nodes without crashing', () => {
    const nodes = [
      makeNode({ id: 'n1', label: 'Alpha' }),
      makeNode({ id: 'n2', label: 'Beta', connections: ['n1'] }),
      makeNode({ id: 'n3', label: 'Gamma', connections: ['n1', 'n2'] }),
    ];
    const { container } = render(<KnowledgeGraph nodes={nodes} />);
    expect(container.querySelector('canvas')).toBeTruthy();
  });

  it('renders with empty nodes array', () => {
    const { container } = render(<KnowledgeGraph nodes={[]} />);
    expect(container.querySelector('canvas')).toBeTruthy();
  });

  it('renders version label in subheader', () => {
    render(<KnowledgeGraph nodes={[makeNode()]} />);
    expect(screen.getByText(/Multi-Node Vector Visualization/)).toBeTruthy();
  });
});
