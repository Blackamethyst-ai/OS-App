// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ============================================================================
// MOCKS
// ============================================================================

const mockCloseHoloProjector = vi.hoisted(() => vi.fn());
const mockSetHoloAnalysis = vi.hoisted(() => vi.fn());
const mockSetHoloAnalyzing = vi.hoisted(() => vi.fn());
const mockOpenHoloProjector = vi.hoisted(() => vi.fn());
const mockAddLog = vi.hoisted(() => vi.fn());

const mockHoloState = vi.hoisted(() => ({
  isOpen: true,
  isAnalyzing: false,
  analysisResult: null as string | null,
  activeArtifact: {
    id: 'art-1',
    title: 'Test Artifact',
    type: 'CODE',
    content: 'const x = 1;',
  } as any,
}));

vi.mock('../../store', () => ({
  useAppStore: () => ({
    holo: mockHoloState,
    actions: {
      closeHoloProjector: mockCloseHoloProjector,
      setHoloAnalysis: mockSetHoloAnalysis,
      setHoloAnalyzing: mockSetHoloAnalyzing,
      openHoloProjector: mockOpenHoloProjector,
      addLog: mockAddLog,
    },
  }),
}));

vi.mock('../../services/apiKeyService', () => ({
  apiKeyService: {
    hasGeminiKey: vi.fn().mockReturnValue(true),
  },
}));

vi.mock('../../services/geminiService', () => ({
  promptSelectKey: vi.fn(),
  transformArtifact: vi.fn().mockResolvedValue('transformed content'),
  retryGeminiRequest: vi.fn().mockResolvedValue({ text: 'analysis result' }),
  getAI: vi.fn().mockReturnValue({
    models: {
      generateContent: vi.fn().mockResolvedValue({ text: 'analysis result' }),
    },
  }),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(),
  GenerateContentResponse: vi.fn(),
}));

vi.mock('../../hooks/usePerspectiveRefraction', () => ({
  usePerspectiveRefraction: () => ({
    ref: { current: null },
    style: {},
    onMouseMove: vi.fn(),
    onMouseLeave: vi.fn(),
  }),
}));

vi.mock('../../services/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef(({ children, onClick, ...props }: any, ref: any) =>
      React.createElement('div', { ...props, onClick, ref, 'data-testid': 'motion-div' }, children)),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock('lucide-react', () => {
  const icon = ({ children, ...props }: any) => React.createElement('span', props, children);
  return {
    X: icon, Scan: icon, Download: icon, Terminal: icon, BrainCircuit: icon,
    Loader2: icon, Copy: icon, FileText: icon, Code: icon, Image: icon,
    Wand2: icon, Edit: icon, Check: icon, Zap: icon,
  };
});

import HoloProjector from '../HoloProjector';

// ============================================================================
// TESTS
// ============================================================================

describe('HoloProjector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHoloState.isOpen = true;
    mockHoloState.isAnalyzing = false;
    mockHoloState.analysisResult = null;
    mockHoloState.activeArtifact = {
      id: 'art-1',
      title: 'Test Artifact',
      type: 'CODE',
      content: 'const x = 1;',
    };
  });

  it('renders nothing when holo is not open', () => {
    mockHoloState.isOpen = false;
    const { container } = render(<HoloProjector />);
    expect(container.querySelector('[data-testid="motion-div"]')).toBeNull();
  });

  it('renders nothing when activeArtifact is null', () => {
    mockHoloState.activeArtifact = null;
    const { container } = render(<HoloProjector />);
    expect(container.querySelector('[data-testid="motion-div"]')).toBeNull();
  });

  it('displays artifact title', () => {
    render(<HoloProjector />);
    expect(screen.getByText('Test Artifact')).toBeTruthy();
  });

  it('displays artifact type in projection label', () => {
    render(<HoloProjector />);
    expect(screen.getByText('Holo-Projection // CODE')).toBeTruthy();
  });

  it('shows code content in pre element', () => {
    render(<HoloProjector />);
    expect(screen.getByText('const x = 1;')).toBeTruthy();
  });

  it('shows text content for TEXT type', () => {
    mockHoloState.activeArtifact = {
      id: 'art-2',
      title: 'Text Doc',
      type: 'TEXT',
      content: 'Some text content here',
    };
    render(<HoloProjector />);
    expect(screen.getByText('Some text content here')).toBeTruthy();
  });

  it('renders Deep Scan button', () => {
    render(<HoloProjector />);
    expect(screen.getByText('Deep Scan')).toBeTruthy();
  });

  it('renders Save Asset button', () => {
    render(<HoloProjector />);
    expect(screen.getByText('Save Asset')).toBeTruthy();
  });

  it('shows transformation buttons for CODE type', () => {
    render(<HoloProjector />);
    expect(screen.getByText('Refactor')).toBeTruthy();
    expect(screen.getByText('Debug Scan')).toBeTruthy();
    expect(screen.getByText('Document')).toBeTruthy();
  });

  it('shows transformation buttons for TEXT type', () => {
    mockHoloState.activeArtifact = {
      id: 'art-2',
      title: 'Text Doc',
      type: 'TEXT',
      content: 'Some text',
    };
    render(<HoloProjector />);
    expect(screen.getByText('Summarize')).toBeTruthy();
    expect(screen.getByText('Expand')).toBeTruthy();
    expect(screen.getByText('Polish')).toBeTruthy();
  });

  it('does not show transformation buttons for IMAGE type', () => {
    mockHoloState.activeArtifact = {
      id: 'art-3',
      title: 'Image',
      type: 'IMAGE',
      content: 'data:image/png;base64,abc',
    };
    render(<HoloProjector />);
    expect(screen.queryByText('Refactor')).toBeNull();
    expect(screen.queryByText('Summarize')).toBeNull();
  });

  it('displays analysis result panel when analysisResult is set', () => {
    mockHoloState.analysisResult = 'This is the analysis output';
    render(<HoloProjector />);
    expect(screen.getByText('This is the analysis output')).toBeTruthy();
    expect(screen.getByText('Diagnostic Result')).toBeTruthy();
  });
});
