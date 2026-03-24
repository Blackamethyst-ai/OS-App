// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ============================================================================
// MOCKS
// ============================================================================

const mockOpenHoloProjector = vi.hoisted(() => vi.fn());
const mockAddLog = vi.hoisted(() => vi.fn());
const mockGetArtifacts = vi.hoisted(() => vi.fn());
const mockGetDynamicTools = vi.hoisted(() => vi.fn());
const mockDeleteArtifact = vi.hoisted(() => vi.fn());
const mockSaveArtifact = vi.hoisted(() => vi.fn());
const mockSaveVector = vi.hoisted(() => vi.fn());
const mockSearchVectors = vi.hoisted(() => vi.fn());
const mockHasGeminiKey = vi.hoisted(() => vi.fn());

vi.mock('../../store', () => ({
  useAppStore: () => ({
    actions: {
      openHoloProjector: mockOpenHoloProjector,
      addLog: mockAddLog,
    },
  }),
}));

vi.mock('../../services/apiKeyService', () => ({
  apiKeyService: {
    hasGeminiKey: mockHasGeminiKey,
  },
}));

vi.mock('../../services/persistenceService', () => ({
  neuralVault: {
    getArtifacts: mockGetArtifacts,
    getDynamicTools: mockGetDynamicTools,
    deleteArtifact: mockDeleteArtifact,
    saveArtifact: mockSaveArtifact,
    saveVector: mockSaveVector,
    searchVectors: mockSearchVectors,
  },
}));

vi.mock('../../services/geminiService', () => ({
  promptSelectKey: vi.fn(),
  classifyArtifact: vi.fn().mockResolvedValue({ ok: true, value: { classification: 'TEXT', summary: 'test', ambiguityScore: 10 } }),
  generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2]),
  fileToGenerativePart: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../services/audioService', () => ({
  audio: {
    playSuccess: vi.fn(),
    playError: vi.fn(),
    playClick: vi.fn(),
  },
}));

vi.mock('../../services/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../utils/cn', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

vi.mock('../../utils/renderSafe', () => ({
  renderSafe: (val: any) => val,
}));

vi.mock('../../hooks/usePerspectiveRefraction', () => ({
  usePerspectiveRefraction: () => ({
    ref: { current: null },
    style: {},
    onMouseMove: vi.fn(),
    onMouseLeave: vi.fn(),
  }),
}));

vi.mock('../KnowledgeGraph', () => ({
  default: () => <div data-testid="knowledge-graph">KnowledgeGraph</div>,
}));

vi.mock('../hardware/PowerXRay', () => ({
  default: () => <div data-testid="power-xray">PowerXRay</div>,
}));

vi.mock('../DynamicVisuals', () => ({
  default: () => <div data-testid="dynamic-visuals">DynamicVisuals</div>,
}));

vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('lucide-react', () => {
  const icon = (props: any) => <span {...props}>Icon</span>;
  return {
    File: icon, Loader2: icon, Search: icon, Database: icon, X: icon,
    Upload: icon, Activity: icon, FileText: icon, BrainCircuit: icon,
    LayoutGrid: icon, Boxes: icon, Info: icon, Trash2: icon, Radar: icon,
    Zap: icon, Code: icon, Shield: icon, FileJson: icon, Clock: icon,
    Tag: icon, Box: icon, Sparkles: icon, FileSearch: icon, Fingerprint: icon,
    Waves: icon, RefreshCw: icon, Cpu: icon, GitBranch: icon, Maximize: icon,
    Anchor: icon, Scan: icon, Compass: icon,
  };
});

import MemoryCore from '../MemoryCore';

describe('MemoryCore', () => {
  const sampleArtifacts = [
    {
      id: 'art-1',
      name: 'Test Artifact 1',
      type: 'TEXT',
      timestamp: Date.now(),
      tags: ['tag1'],
      analysis: { classification: 'DOCUMENT', ambiguityScore: 20, summary: 'A test artifact' },
    },
    {
      id: 'art-2',
      name: 'Test Artifact 2',
      type: 'IMAGE',
      timestamp: Date.now() - 1000,
      tags: ['tag2'],
      analysis: { classification: 'IMAGE', ambiguityScore: 50, summary: 'An image artifact' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetArtifacts.mockResolvedValue(sampleArtifacts);
    mockGetDynamicTools.mockResolvedValue([]);
    mockHasGeminiKey.mockReturnValue(true);
  });

  it('renders loading state initially', () => {
    // Don't resolve artifacts yet
    mockGetArtifacts.mockReturnValue(new Promise(() => {}));
    render(<MemoryCore />);
    expect(screen.getByText('Synchronizing Neural Vault...')).toBeTruthy();
  });

  it('renders Neural Vault header', async () => {
    render(<MemoryCore />);
    await waitFor(() => {
      expect(screen.getByText('Neural Vault')).toBeTruthy();
    });
  });

  it('renders artifacts after loading', async () => {
    render(<MemoryCore />);
    await waitFor(() => {
      expect(screen.getAllByText('Test Artifact 1').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Test Artifact 2').length).toBeGreaterThan(0);
    });
  });

  it('renders empty state when no artifacts', async () => {
    mockGetArtifacts.mockResolvedValue([]);
    render(<MemoryCore />);
    await waitFor(() => {
      expect(screen.getByText('Vault Empty')).toBeTruthy();
    });
  });

  it('renders search input', async () => {
    render(<MemoryCore />);
    await waitFor(() => {
      expect(screen.getByLabelText('Memory search input')).toBeTruthy();
    });
  });

  it('updates search query on input change', async () => {
    render(<MemoryCore />);
    await waitFor(() => {
      const input = screen.getByLabelText('Memory search input');
      fireEvent.change(input, { target: { value: 'test query' } });
      expect((input as HTMLInputElement).value).toBe('test query');
    });
  });

  it('renders view mode buttons', async () => {
    render(<MemoryCore />);
    await waitFor(() => {
      expect(screen.getByText('Neural Ocean')).toBeTruthy();
      expect(screen.getByText('The Matrix')).toBeTruthy();
      expect(screen.getByText('Evolved Skills')).toBeTruthy();
    });
  });

  it('renders artifact detail panel when artifact is selected', async () => {
    render(<MemoryCore />);
    await waitFor(() => {
      expect(screen.getAllByText('Test Artifact 1').length).toBeGreaterThan(0);
    });

    // Click on an artifact in the sidebar
    const artifactBtns = screen.getAllByText('Test Artifact 1');
    fireEvent.click(artifactBtns[0]);

    await waitFor(() => {
      expect(screen.getByText('Neural Reconstruction')).toBeTruthy();
    });
  });

  it('calls defragmentMatrix when Defrag button is clicked', async () => {
    render(<MemoryCore />);
    await waitFor(() => {
      expect(screen.getByText('Defrag')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Defrag'));
    expect(mockAddLog).toHaveBeenCalledWith(
      'SYSTEM',
      'LATTICE: Neural defragmentation finalized. Integrity optimized.'
    );
  });

  it('renders Ingest Artifact upload button', async () => {
    render(<MemoryCore />);
    await waitFor(() => {
      expect(screen.getByText('Ingest Artifact')).toBeTruthy();
    });
  });

  it('loads dynamic tools alongside artifacts', async () => {
    mockGetDynamicTools.mockResolvedValue([
      { id: 'tool-1', code: 'console.log("hi")', timestamp: Date.now() },
    ]);

    render(<MemoryCore />);
    await waitFor(() => {
      expect(screen.getAllByText('[TOOL] tool-1').length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });
});
