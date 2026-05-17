// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ============================================================================
// MOCKS
// ============================================================================

const mockSetMode = vi.hoisted(() => vi.fn());
const mockPlayTransition = vi.hoisted(() => vi.fn());

const mockStore = vi.hoisted(() => ({
  mode: 'METAVENTIONS_HUB' as string,
  previousMode: null as string | null,
  contextMenu: null,
  actions: {
    setMode: mockSetMode,
  },
}));

vi.mock('../../store', () => ({
  useAppStore: () => mockStore,
}));

vi.mock('../../services/geminiService', () => ({
  performGlobalSearch: vi.fn(),
}));

vi.mock('../../services/audioService', () => ({
  audio: {
    playTransition: mockPlayTransition,
    playClick: vi.fn(),
  },
}));

vi.mock('../GlobalErrorBoundary', () => ({
  GlobalErrorBoundary: ({ children }: { children: React.ReactNode }) => <div data-testid="error-boundary">{children}</div>,
}));

// Mock all lazy-loaded components individually
vi.mock('../core/Dashboard', () => ({ default: () => <div data-testid="mock-Dashboard">Dashboard</div> }));
vi.mock('../MetaventionsHub', () => ({ default: () => <div data-testid="mock-MetaventionsHub">MetaventionsHub</div> }));
vi.mock('../SynthesisBridge', () => ({ default: () => <div data-testid="mock-SynthesisBridge">SynthesisBridge</div> }));
vi.mock('../research/BibliomorphicEngine', () => ({ default: () => <div data-testid="mock-BibliomorphicEngine">BibliomorphicEngine</div> }));
vi.mock('../generation/ProcessVisualizer', () => ({ default: () => <div data-testid="mock-ProcessVisualizer">ProcessVisualizer</div> }));
vi.mock('../MemoryCore', () => ({ default: () => <div data-testid="mock-MemoryCore">MemoryCore</div> }));
vi.mock('../generation/ImageGen', () => ({ default: () => <div data-testid="mock-ImageGen">ImageGen</div> }));
vi.mock('../hardware/HardwareEngine', () => ({ default: () => <div data-testid="mock-HardwareEngine">HardwareEngine</div> }));
vi.mock('../voice/VoiceMode', () => ({ default: () => <div data-testid="mock-VoiceMode">VoiceMode</div> }));
vi.mock('../generation/CodeStudio', () => ({ default: () => <div data-testid="mock-CodeStudio">CodeStudio</div> }));
vi.mock('../agents/AgentControlCenter', () => ({ default: () => <div data-testid="mock-AgentControlCenter">AgentControlCenter</div> }));
vi.mock('../finance/AutonomousFinance', () => ({ default: () => <div data-testid="mock-AutonomousFinance">AutonomousFinance</div> }));
vi.mock('../NexusAPIExplorer', () => ({ default: () => <div data-testid="mock-NexusAPIExplorer">NexusAPIExplorer</div> }));
vi.mock('../AgentCoreTest', () => ({ default: () => <div data-testid="mock-AgentCoreTest">AgentCoreTest</div> }));
vi.mock('../CPBTest', () => ({ default: () => <div data-testid="mock-CPBTest">CPBTest</div> }));
vi.mock('../agents/ArchonDashboard', () => ({ default: () => <div data-testid="mock-ArchonDashboard">ArchonDashboard</div> }));
vi.mock('../predictions/MetaLearningDashboard', () => ({ default: () => <div data-testid="mock-MetaLearningDashboard">MetaLearningDashboard</div> }));
vi.mock('../SovereignGallery', () => ({ default: () => <div data-testid="mock-SovereignGallery">SovereignGallery</div> }));

vi.mock('motion/react', () => ({
  motion: {
    main: ({ children, className, ...props }: any) => <main data-testid="motion-main" className={className}>{children}</main>,
    div: ({ children, ...props }: any) => <div>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Spread the real lucide-react module so every icon (e.g. ChevronRight
// from the breadcrumbs feature) resolves and a newly-used icon never
// breaks this test again. Real icons are plain SVGs and render fine in
// happy-dom. Only Loader2 is overridden to keep its spinner testid.
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>();
  return {
    ...actual,
    Loader2: (props: any) => (
      <span data-testid="loader" className={props.className}>Loader2</span>
    ),
  };
});

import SynapticRouter from '../SynapticRouter';
import { AppMode } from '../../types';

// ============================================================================
// TESTS
// ============================================================================

describe('SynapticRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.mode = AppMode.METAVENTIONS_HUB;
    mockStore.previousMode = null;
    window.location.hash = '';
  });

  it('renders without crashing', () => {
    const { container } = render(<SynapticRouter />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders the main content wrapper with perspective class', () => {
    const { container } = render(<SynapticRouter />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('perspective-2000');
  });

  it('renders MetaventionsHub when mode is METAVENTIONS_HUB', () => {
    mockStore.mode = AppMode.METAVENTIONS_HUB;
    render(<SynapticRouter />);
    expect(screen.getByTestId('mock-MetaventionsHub')).toBeTruthy();
  });

  it('renders Dashboard when mode is DASHBOARD', () => {
    mockStore.mode = AppMode.DASHBOARD;
    render(<SynapticRouter />);
    expect(screen.getByTestId('mock-Dashboard')).toBeTruthy();
  });

  it('renders CodeStudio when mode is CODE_STUDIO', () => {
    mockStore.mode = AppMode.CODE_STUDIO;
    render(<SynapticRouter />);
    expect(screen.getByTestId('mock-CodeStudio')).toBeTruthy();
  });

  it('applies overflow-hidden class for fixed layout modes', () => {
    mockStore.mode = AppMode.METAVENTIONS_HUB;
    render(<SynapticRouter />);
    const main = screen.getByTestId('motion-main');
    expect(main.className).toContain('overflow-hidden');
  });

  it('applies overflow-y-auto class for scrollable layout modes', () => {
    mockStore.mode = AppMode.DASHBOARD;
    render(<SynapticRouter />);
    const main = screen.getByTestId('motion-main');
    expect(main.className).toContain('overflow-y-auto');
  });

  it('wraps content in GlobalErrorBoundary', () => {
    render(<SynapticRouter />);
    expect(screen.getByTestId('error-boundary')).toBeTruthy();
  });

  it('renders VoiceMode when mode is VOICE_MODE', () => {
    mockStore.mode = AppMode.VOICE_MODE;
    render(<SynapticRouter />);
    expect(screen.getByTestId('mock-VoiceMode')).toBeTruthy();
  });

  it('renders MemoryCore when mode is MEMORY_CORE', () => {
    mockStore.mode = AppMode.MEMORY_CORE;
    render(<SynapticRouter />);
    expect(screen.getByTestId('mock-MemoryCore')).toBeTruthy();
  });
});
