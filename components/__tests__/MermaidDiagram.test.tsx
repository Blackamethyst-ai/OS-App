// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';

// ============================================================================
// MOCKS
// ============================================================================

const mockSetProcessState = vi.hoisted(() => vi.fn());
const mockMermaidInitialize = vi.hoisted(() => vi.fn());
const mockMermaidRender = vi.hoisted(() => vi.fn(() => Promise.resolve({ svg: '<svg><text>test diagram</text></svg>' })));

vi.mock('../../store', () => ({
  useAppStore: Object.assign(
    (selector?: (s: any) => any) => {
      const state = {
        actions: {
          setProcessState: mockSetProcessState,
        },
      };
      if (selector) return selector(state);
      return state;
    },
    {
      getState: () => ({
        actions: { setProcessState: mockSetProcessState },
      }),
    }
  ),
}));

vi.mock('mermaid', () => ({
  default: {
    initialize: mockMermaidInitialize,
    render: mockMermaidRender,
  },
}));

vi.mock('../../services/apiKeyService', () => ({
  apiKeyService: {
    hasGeminiKey: vi.fn(() => false),
  },
}));

vi.mock('../../services/geminiService', () => ({
  repairMermaidSyntax: vi.fn(() => Promise.resolve('graph TD; A-->B')),
  promptSelectKey: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../services/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
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
    RefreshCw: icon('RefreshCw'),
    Image: icon('Image'),
    FileCode: icon('FileCode'),
    Maximize: icon('Maximize'),
    ZoomIn: icon('ZoomIn'),
    ZoomOut: icon('ZoomOut'),
    Move: icon('Move'),
    Download: icon('Download'),
    AlertCircle: icon('AlertCircle'),
    Target: icon('Target'),
    Sparkles: icon('Sparkles'),
    Loader2: icon('Loader2'),
  };
});

import MermaidDiagram from '../MermaidDiagram';

// ============================================================================
// TESTS
// ============================================================================

describe('MermaidDiagram', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMermaidRender.mockResolvedValue({ svg: '<svg><text>test diagram</text></svg>' });
  });

  it('renders without crashing', async () => {
    let container: HTMLElement;
    await act(async () => {
      const result = render(<MermaidDiagram code="graph TD; A-->B" />);
      container = result.container;
    });
    expect(container!).toBeTruthy();
  });

  it('initializes mermaid on mount', async () => {
    await act(async () => {
      render(<MermaidDiagram code="graph TD; A-->B" />);
    });
    expect(mockMermaidInitialize).toHaveBeenCalledWith(
      expect.objectContaining({
        startOnLoad: false,
        theme: 'base',
        securityLevel: 'strict',
      })
    );
  });

  it('renders SVG content after successful mermaid render', async () => {
    let container: HTMLElement;
    await act(async () => {
      const result = render(<MermaidDiagram code="graph TD; A-->B" />);
      container = result.container;
    });
    expect(container!.innerHTML).toContain('test diagram');
  });

  it('shows error state when mermaid render fails', async () => {
    mockMermaidRender.mockRejectedValueOnce(new Error('Syntax error'));
    await act(async () => {
      render(<MermaidDiagram code="invalid code" />);
    });
    expect(screen.getByText('Schematic Render Failure')).toBeTruthy();
  });

  it('displays error message in error state', async () => {
    mockMermaidRender.mockRejectedValueOnce(new Error('Bad syntax'));
    await act(async () => {
      render(<MermaidDiagram code="bad code" />);
    });
    expect(screen.getByText(/Topology Conflict: Bad syntax/)).toBeTruthy();
  });

  it('shows auto-repair button when in error state', async () => {
    mockMermaidRender.mockRejectedValueOnce(new Error('Parse error'));
    await act(async () => {
      render(<MermaidDiagram code="broken" />);
    });
    expect(screen.getByText('AUTO-REPAIR SYNTAX')).toBeTruthy();
  });

  it('renders zoom controls on success', async () => {
    await act(async () => {
      render(<MermaidDiagram code="graph TD; A-->B" />);
    });
    expect(screen.getByLabelText('Zoom out')).toBeTruthy();
    expect(screen.getByLabelText('Zoom in')).toBeTruthy();
    expect(screen.getByLabelText('Reset zoom')).toBeTruthy();
  });

  it('shows corrupted manifest code in error state', async () => {
    mockMermaidRender.mockRejectedValueOnce(new Error('fail'));
    await act(async () => {
      render(<MermaidDiagram code="some broken code" />);
    });
    expect(screen.getByText('Corrupted Manifest')).toBeTruthy();
    expect(screen.getByText('some broken code')).toBeTruthy();
  });

  it('calls setProcessState with error on render failure', async () => {
    mockMermaidRender.mockRejectedValueOnce(new Error('render fail'));
    await act(async () => {
      render(<MermaidDiagram code="fail" />);
    });
    expect(mockSetProcessState).toHaveBeenCalledWith({
      diagramStatus: 'ERROR',
      diagramError: 'render fail',
    });
  });

  it('does not render error for empty code', async () => {
    await act(async () => {
      render(<MermaidDiagram code="" />);
    });
    // Empty code returns early before calling mermaid.render
    expect(screen.queryByText('Schematic Render Failure')).toBeNull();
  });
});
