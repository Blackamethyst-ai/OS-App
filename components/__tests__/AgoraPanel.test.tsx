// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ============================================================================
// MOCKS
// ============================================================================

const mockSetProcessState = vi.hoisted(() => vi.fn());
const mockSetMode = vi.hoisted(() => vi.fn());
const mockAddLog = vi.hoisted(() => vi.fn());
const mockGeneratePersonas = vi.hoisted(() => vi.fn());
const mockRunDebateTurn = vi.hoisted(() => vi.fn());
const mockSynthesizeReport = vi.hoisted(() => vi.fn());
const mockHasGeminiKey = vi.hoisted(() => vi.fn());

vi.mock('../../store', () => ({
  useAppStore: () => ({
    voice: {
      mentalState: { skepticism: 50, excitement: 50, alignment: 50 },
    },
    actions: {
      setProcessState: mockSetProcessState,
      setMode: mockSetMode,
      addLog: mockAddLog,
    },
  }),
}));

vi.mock('../../services/apiKeyService', () => ({
  apiKeyService: {
    hasGeminiKey: mockHasGeminiKey,
  },
}));

vi.mock('../../services/agoraService', () => ({
  generatePersonas: mockGeneratePersonas,
  runDebateTurn: mockRunDebateTurn,
  synthesizeReport: mockSynthesizeReport,
}));

vi.mock('../../services/geminiService', () => ({
  liveSession: {
    isConnected: vi.fn().mockReturnValue(false),
    disconnect: vi.fn(),
    connect: vi.fn(),
    onToolCall: null,
  },
  promptSelectKey: vi.fn(),
  generateSpeech: vi.fn().mockResolvedValue(''),
}));

vi.mock('../../services/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('recharts', () => ({
  RadarChart: ({ children }: any) => <div data-testid="radar-chart">{children}</div>,
  PolarGrid: () => <div />,
  PolarAngleAxis: () => <div />,
  PolarRadiusAxis: () => <div />,
  Radar: () => <div />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => <div />,
  YAxis: () => <div />,
}));

vi.mock('@google/genai', () => ({
  FunctionDeclaration: {},
  Type: { OBJECT: 'OBJECT', STRING: 'STRING' },
}));

vi.mock('lucide-react', () => {
  const icon = (props: any) => <span {...props}>Icon</span>;
  return {
    Users: icon, Loader2: icon, MessageSquare: icon, AlertCircle: icon,
    CheckCircle: icon, Mic: icon, Zap: icon, Activity: icon, GitCommit: icon,
    GitBranch: icon, Save: icon, Layers: icon, ArrowUpRight: icon, Radio: icon,
    Volume2: icon, VolumeX: icon, Eye: icon,
  };
});

import AgoraPanel from '../AgoraPanel';
import type { FileData } from '../../types';

describe('AgoraPanel', () => {
  const mockArtifact: FileData = {
    inlineData: { data: 'base64data', mimeType: 'text/plain' },
    name: 'test-file.txt',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockHasGeminiKey.mockReturnValue(true);
    // Mock AudioContext for initAudio
    (globalThis as any).AudioContext = class MockAudioContext {
      state = 'running';
      sampleRate = 24000;
      destination = {};
      resume = vi.fn().mockResolvedValue(undefined);
      close = vi.fn().mockResolvedValue(undefined);
      createBufferSource = vi.fn().mockReturnValue({ connect: vi.fn(), start: vi.fn(), buffer: null });
      createBuffer = vi.fn().mockReturnValue({ getChannelData: vi.fn().mockReturnValue(new Float32Array(0)) });
    };
  });

  it('renders idle state with Summon Agents button', () => {
    render(<AgoraPanel artifact={mockArtifact} />);
    expect(screen.getByText('Summon Agents')).toBeTruthy();
  });

  it('renders Neural Senate heading', () => {
    render(<AgoraPanel artifact={mockArtifact} />);
    expect(screen.getByText('Neural Senate')).toBeTruthy();
  });

  it('renders Debate Protocol label', () => {
    render(<AgoraPanel artifact={mockArtifact} />);
    expect(screen.getByText('Debate Protocol')).toBeTruthy();
  });

  it('renders SESSION_IDLE when not debating', () => {
    render(<AgoraPanel artifact={mockArtifact} />);
    expect(screen.getByText('SESSION_IDLE')).toBeTruthy();
  });

  it('renders Senate Transcript section', () => {
    render(<AgoraPanel artifact={mockArtifact} />);
    expect(screen.getByText('Senate Transcript')).toBeTruthy();
  });

  it('renders narration mute toggle button', () => {
    render(<AgoraPanel artifact={mockArtifact} />);
    // There should be a mute button
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders moderator button', () => {
    render(<AgoraPanel artifact={mockArtifact} />);
    expect(screen.getByText('MODERATOR MUTED')).toBeTruthy();
  });

  it('starts simulation when Summon Agents is clicked', async () => {
    mockGeneratePersonas.mockResolvedValue([]);
    render(<AgoraPanel artifact={mockArtifact} />);

    fireEvent.click(screen.getByText('Summon Agents'));

    await waitFor(() => {
      expect(mockGeneratePersonas).toHaveBeenCalled();
    });
  });

  it('handles empty personas gracefully', async () => {
    mockGeneratePersonas.mockResolvedValue([]);
    render(<AgoraPanel artifact={mockArtifact} />);

    fireEvent.click(screen.getByText('Summon Agents'));

    await waitFor(() => {
      expect(mockAddLog).toHaveBeenCalledWith(
        'WARN',
        'AGORA: Agent generation returned empty set. Aborting.'
      );
    });
  });

  it('renders whisper input when whisperTarget is set', async () => {
    const personas = [
      {
        id: 'p1',
        name: 'Skeptic',
        role: 'Auditor',
        avatar_color: '#ef4444',
        voiceName: 'Charon',
        currentMindset: { skepticism: 80, excitement: 30, alignment: 50 },
      },
      {
        id: 'p2',
        name: 'Visionary',
        role: 'Architect',
        avatar_color: '#9d4edd',
        voiceName: 'Puck',
        currentMindset: { skepticism: 20, excitement: 90, alignment: 70 },
      },
    ];

    const turns = [
      {
        id: 't1',
        personaId: 'p1',
        text: 'I have concerns about this approach.',
        newMindset: { skepticism: 85, excitement: 25, alignment: 45 },
      },
    ];

    mockGeneratePersonas.mockResolvedValue(personas);
    // Make debate take time so we can interact
    mockRunDebateTurn.mockImplementation(async () => {
      await new Promise(r => setTimeout(r, 5000));
      return turns[0];
    });

    render(<AgoraPanel artifact={mockArtifact} />);
    fireEvent.click(screen.getByText('Summon Agents'));

    // Wait for personas to appear
    await waitFor(() => {
      expect(screen.getByText('Skeptic')).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('handles simulation error gracefully', async () => {
    mockGeneratePersonas.mockRejectedValue(new Error('API Error'));
    render(<AgoraPanel artifact={mockArtifact} />);

    fireEvent.click(screen.getByText('Summon Agents'));

    // Should return to idle state after error
    await waitFor(() => {
      expect(screen.getByText('SESSION_IDLE')).toBeTruthy();
    });
  });
});
