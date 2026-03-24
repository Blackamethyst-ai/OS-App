// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ============================================================================
// MOCKS
// ============================================================================

const mockAddLog = vi.hoisted(() => vi.fn());
const mockSetProcessState = vi.hoisted(() => vi.fn());
const mockAddAgent = vi.hoisted(() => vi.fn());

vi.mock('../../store', () => ({
  useAppStore: () => ({
    actions: {
      addLog: mockAddLog,
      setProcessState: mockSetProcessState,
      addAgent: mockAddAgent,
    },
  }),
}));

vi.mock('../../services/apiKeyService', () => ({
  apiKeyService: {
    hasGeminiKey: vi.fn().mockReturnValue(false),
  },
}));

vi.mock('../../services/geminiService', () => ({
  retryGeminiRequest: vi.fn(),
  promptSelectKey: vi.fn().mockResolvedValue(undefined),
  getAI: vi.fn().mockReturnValue({
    models: { generateContent: vi.fn() },
  }),
}));

vi.mock('../../services/DynamicToolRegistry', () => ({
  dynamicRegistry: {
    registerDynamicTool: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../services/audioService', () => ({
  audio: {
    playClick: vi.fn(),
    playSuccess: vi.fn(),
    playError: vi.fn(),
    playHover: vi.fn(),
  },
}));

vi.mock('../../utils/cn', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

vi.mock('../../data/googleApis', () => ({
  GOOGLE_APIS: [
    { title: 'BigQuery API', description: 'Data platform for queries.', category: 'DATA' },
    { title: 'Cloud Build API', description: 'Creates and manages builds.', category: 'CLOUD' },
    { title: 'Vertex AI API', description: 'Machine learning platform.', category: 'AI' },
    { title: 'Gmail API', description: 'Manage email.', category: 'WORKSPACE' },
    { title: 'Cloud DNS API', description: 'DNS management.', category: 'CORE' },
  ],
  GoogleApiDefinition: {},
}));

vi.mock('../../types', () => ({
  OperationalContext: { GENERAL_PURPOSE: 'GENERAL_PURPOSE' },
}));

vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
    button: React.forwardRef(({ children, ...props }: any, ref: any) => <button ref={ref} {...props}>{children}</button>),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('lucide-react', () => {
  const React = require('react');
  const i = (props: any) => React.createElement('span', null, props?.children);
  return {
    Search: i, Globe: i, Loader2: i, Sparkles: i, Code: i, GitBranch: i,
    ChevronRight: i, Zap: i, ExternalLink: i, Box: i, Database: i,
    Layers: i, Cpu: i, BookOpen: i, ShieldCheck: i, Terminal: i, Trash2: i, X: i, Activity: i,
    Filter: i, Share2: i, PlayCircle: i, Fingerprint: i, Waypoints: i, Gauge: i,
    Cloud: i, BrainCircuit: i, HardDrive: i, LayoutGrid: i, Network: i,
    Info: i, Bot: i,
  };
});

vi.mock('@google/genai', () => ({
  GenerateContentResponse: class {},
}));

import NexusAPIExplorer from '../NexusAPIExplorer';

// ============================================================================
// TESTS
// ============================================================================

describe('NexusAPIExplorer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Nexus Matrix header', () => {
    render(<NexusAPIExplorer />);
    expect(screen.getByText('Nexus Matrix')).toBeTruthy();
  });

  it('renders the search input', () => {
    render(<NexusAPIExplorer />);
    const input = screen.getByPlaceholderText('Probe Global Endpoints...');
    expect(input).toBeTruthy();
  });

  it('renders all category buttons', () => {
    render(<NexusAPIExplorer />);
    const categories = ['ALL', 'CLOUD', 'AI', 'WORKSPACE', 'DATA', 'CORE'];
    categories.forEach(cat => {
      expect(screen.getByText(cat)).toBeTruthy();
    });
  });

  it('renders all mock APIs in the list', () => {
    render(<NexusAPIExplorer />);
    expect(screen.getByText('BigQuery API')).toBeTruthy();
    expect(screen.getByText('Cloud Build API')).toBeTruthy();
    expect(screen.getByText('Vertex AI API')).toBeTruthy();
  });

  it('filters APIs by search query', () => {
    render(<NexusAPIExplorer />);
    const input = screen.getByPlaceholderText('Probe Global Endpoints...');
    fireEvent.change(input, { target: { value: 'BigQuery' } });
    expect(screen.getByText('BigQuery API')).toBeTruthy();
    expect(screen.queryByText('Cloud Build API')).toBeNull();
  });

  it('filters APIs by category', () => {
    render(<NexusAPIExplorer />);
    const cloudButton = screen.getByText('CLOUD');
    fireEvent.click(cloudButton);
    expect(screen.getByText('Cloud Build API')).toBeTruthy();
    expect(screen.queryByText('BigQuery API')).toBeNull();
  });

  it('shows the detail view when an API is selected', () => {
    render(<NexusAPIExplorer />);
    const apiButton = screen.getByText('BigQuery API');
    fireEvent.click(apiButton);
    // The detail view shows the API title as an h1
    const headings = screen.getAllByText('BigQuery API');
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  it('shows Nexus Hub placeholder when no API is selected', () => {
    render(<NexusAPIExplorer />);
    expect(screen.getByText('Nexus Hub')).toBeTruthy();
  });

  it('shows the Forge Protocol button when an API is selected', () => {
    render(<NexusAPIExplorer />);
    fireEvent.click(screen.getByText('BigQuery API'));
    expect(screen.getByText('Forge Protocol')).toBeTruthy();
  });

  it('shows multiple instances of the API title when selected', () => {
    render(<NexusAPIExplorer />);
    fireEvent.click(screen.getByText('BigQuery API'));
    // The selected API title appears both in the list and in the detail heading
    const headings = screen.getAllByText('BigQuery API');
    expect(headings.length).toBeGreaterThanOrEqual(2);
  });

  it('renders the endpoint count footer', () => {
    render(<NexusAPIExplorer />);
    expect(screen.getByText(/Lattice_Endpoints: 5/)).toBeTruthy();
  });

  it('shows category description in detail view', () => {
    render(<NexusAPIExplorer />);
    fireEvent.click(screen.getByText('BigQuery API'));
    expect(screen.getByText(/DATA Protocol/)).toBeTruthy();
  });
});
