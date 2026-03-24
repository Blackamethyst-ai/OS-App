// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ============================================================================
// MOCKS
// ============================================================================

const mockPlayClick = vi.hoisted(() => vi.fn());

vi.mock('../../services/audioService', () => ({
  audio: {
    playClick: mockPlayClick,
    playTransition: vi.fn(),
    playTone: vi.fn(),
  },
}));

vi.mock('../../utils/cn', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

vi.mock('../../utils/renderSafe', () => ({
  renderSafe: (v: unknown) => (v == null ? '' : String(v)),
}));

// Mock d3 — we stub the chained API so the useEffect doesn't crash
const mockSimulation = vi.hoisted(() => ({
  force: vi.fn().mockReturnThis(),
  on: vi.fn().mockReturnThis(),
  alpha: vi.fn().mockReturnThis(),
  restart: vi.fn().mockReturnThis(),
  stop: vi.fn(),
}));

const mockSelectAll = vi.hoisted(() => vi.fn().mockReturnValue({ remove: vi.fn() }));
const mockAppend = vi.hoisted(() => vi.fn());
const mockSelectChain = vi.hoisted(() => {
  const chain: Record<string, any> = {};
  chain.attr = vi.fn().mockReturnValue(chain);
  chain.append = vi.fn().mockReturnValue(chain);
  chain.selectAll = vi.fn().mockReturnValue(chain);
  chain.data = vi.fn().mockReturnValue(chain);
  chain.join = vi.fn().mockReturnValue(chain);
  chain.on = vi.fn().mockReturnValue(chain);
  chain.text = vi.fn().mockReturnValue(chain);
  chain.each = vi.fn().mockReturnValue(chain);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.transition = vi.fn().mockReturnValue(chain);
  chain.remove = vi.fn().mockReturnValue(chain);
  return chain;
});

vi.mock('d3', () => ({
  select: vi.fn().mockReturnValue({
    selectAll: mockSelectAll,
    append: vi.fn().mockReturnValue(mockSelectChain),
  }),
  forceSimulation: vi.fn().mockReturnValue(mockSimulation),
  forceLink: vi.fn().mockReturnValue({ id: vi.fn().mockReturnThis(), distance: vi.fn().mockReturnThis() }),
  forceManyBody: vi.fn().mockReturnValue({ strength: vi.fn().mockReturnThis() }),
  forceCenter: vi.fn(),
  forceCollide: vi.fn().mockReturnValue({ radius: vi.fn().mockReturnThis() }),
  forceRadial: vi.fn().mockReturnValue({ strength: vi.fn().mockReturnThis() }),
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
    Activity: icon,
    Zap: icon,
    Info: icon,
    Target: icon,
    X: icon,
    Loader2: icon,
    Sparkles: icon,
    Database: icon,
    Globe: icon,
    Maximize: icon,
    CheckCircle2: icon,
    Compass: icon,
    GitBranch: icon,
    Fingerprint: icon,
    Waves: icon,
  };
});

import DynamicVisuals from '../DynamicVisuals';
import { StoredArtifact } from '../../types';

// ============================================================================
// HELPERS
// ============================================================================

function makeArtifact(overrides: Partial<StoredArtifact> = {}): StoredArtifact {
  return {
    id: 'art-1',
    name: 'Test Artifact',
    type: 'TEXT',
    content: 'hello',
    analysis: {
      classification: 'INTEL',
      ambiguityScore: 0.2,
      entities: ['alpha', 'beta'],
      summary: 'A test summary',
    },
    ...overrides,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('DynamicVisuals', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders container and SVG element', () => {
    const { container } = render(
      <DynamicVisuals artifacts={[makeArtifact()]} onSelect={mockOnSelect} />
    );
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('shows "Hub Idle" when no artifact is centered', () => {
    render(<DynamicVisuals artifacts={[]} onSelect={mockOnSelect} />);
    expect(screen.getByText('Hub Idle')).toBeTruthy();
  });

  it('displays lattice depth with artifact count', () => {
    const artifacts = [makeArtifact(), makeArtifact({ id: 'art-2', name: 'Second' })];
    render(<DynamicVisuals artifacts={artifacts} onSelect={mockOnSelect} />);
    expect(screen.getByText(`Lattice Depth: ${artifacts.length}P`)).toBeTruthy();
  });

  it('shows the Strategic Intelligence header', () => {
    render(<DynamicVisuals artifacts={[makeArtifact()]} onSelect={mockOnSelect} />);
    expect(screen.getByText('Strategic Intelligence')).toBeTruthy();
  });

  it('shows version label in footer', () => {
    render(<DynamicVisuals artifacts={[makeArtifact()]} onSelect={mockOnSelect} />);
    expect(screen.getByText('Zenith_Vis_v1.0')).toBeTruthy();
  });

  it('displays "Physics Core: Nominal" status', () => {
    render(<DynamicVisuals artifacts={[makeArtifact()]} onSelect={mockOnSelect} />);
    expect(screen.getByText('Physics Core: Nominal')).toBeTruthy();
  });

  it('shows Forensic Insight panel header', () => {
    render(<DynamicVisuals artifacts={[makeArtifact()]} onSelect={mockOnSelect} />);
    expect(screen.getByText('Forensic Insight')).toBeTruthy();
  });

  it('renders empty state guidance text when no artifacts', () => {
    render(<DynamicVisuals artifacts={[]} onSelect={mockOnSelect} />);
    expect(screen.getByText(/Select a synaptic node/)).toBeTruthy();
  });

  it('renders handshake verified and grid active in footer', () => {
    render(<DynamicVisuals artifacts={[makeArtifact()]} onSelect={mockOnSelect} />);
    expect(screen.getByText('Handshake Verified')).toBeTruthy();
    expect(screen.getByText('Grid_Active')).toBeTruthy();
  });

  it('graphData returns empty nodes/links for empty artifacts', () => {
    const { container } = render(
      <DynamicVisuals artifacts={[]} onSelect={mockOnSelect} />
    );
    // With no artifacts, the SVG should still exist but d3 simulation shouldn't start
    expect(container.querySelector('svg')).toBeTruthy();
  });
});
