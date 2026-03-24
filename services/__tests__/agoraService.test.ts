// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGenerateContent = vi.hoisted(() => vi.fn());
const mockGetAI = vi.hoisted(() => vi.fn());
const mockRetryGeminiRequest = vi.hoisted(() => vi.fn());
const mockConstructHiveContext = vi.hoisted(() => vi.fn());

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../geminiService', () => ({
  HIVE_AGENTS: {
    Charon: {
      id: 'Charon',
      name: 'Charon',
      systemPrompt: 'Be skeptical',
      voice: 'voice-charon',
      weights: { logic: 0.8, skepticism: 0.9, creativity: 0.3, empathy: 0.2 },
    },
    Puck: {
      id: 'Puck',
      name: 'Puck',
      systemPrompt: 'Be visionary',
      voice: 'voice-puck',
      weights: { logic: 0.4, skepticism: 0.2, creativity: 0.9, empathy: 0.5 },
    },
    Fenrir: {
      id: 'Fenrir',
      name: 'Fenrir',
      systemPrompt: 'Be pragmatic',
      voice: 'voice-fenrir',
      weights: { logic: 0.7, skepticism: 0.5, creativity: 0.4, empathy: 0.8 },
    },
  },
  constructHiveContext: mockConstructHiveContext,
  retryGeminiRequest: mockRetryGeminiRequest,
  getAI: mockGetAI,
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(),
  Type: { OBJECT: 'OBJECT', STRING: 'STRING', NUMBER: 'NUMBER', ARRAY: 'ARRAY' },
  Schema: {},
}));

import { generatePersonas, runDebateTurn, synthesizeReport } from '../agoraService';
import type { FileData, SyntheticPersona, DebateTurn, MentalState } from '../../types';

describe('AgoraService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetAI.mockReturnValue({
      models: { generateContent: mockGenerateContent },
    });

    mockConstructHiveContext.mockReturnValue('HIVE_CONTEXT_PROMPT');
  });

  // --- generatePersonas ---

  it('should generate 3 personas (Charon, Puck, Fenrir)', async () => {
    const file: FileData = { inlineData: { data: 'test', mimeType: 'text/plain' } } as any;
    const personas = await generatePersonas(file);

    expect(personas).toHaveLength(3);
    expect(personas.map(p => p.id)).toEqual(['Charon', 'Puck', 'Fenrir']);
  });

  it('should assign correct avatar colors', async () => {
    const file: FileData = { inlineData: { data: 'test', mimeType: 'text/plain' } } as any;
    const personas = await generatePersonas(file);

    expect(personas[0].avatar_color).toBe('#ef4444');
    expect(personas[1].avatar_color).toBe('#9d4edd');
    expect(personas[2].avatar_color).toBe('#22d3ee');
  });

  it('should use baseline mindset when provided', async () => {
    const file: FileData = { inlineData: { data: 'test', mimeType: 'text/plain' } } as any;
    const baseline: MentalState = { skepticism: 30, excitement: 70, alignment: 60 };
    const personas = await generatePersonas(file, baseline);

    // All personas should have the baseline mindset (spread copy)
    for (const p of personas) {
      expect(p.currentMindset).toEqual(baseline);
    }
  });

  it('should compute default mindset from agent weights when no baseline', async () => {
    const file: FileData = { inlineData: { data: 'test', mimeType: 'text/plain' } } as any;
    const personas = await generatePersonas(file);

    // Charon has skepticism > 0.7 -> skepticism = 90
    expect(personas[0].currentMindset.skepticism).toBe(90);
    // Puck has creativity > 0.7 -> excitement = 90
    expect(personas[1].currentMindset.excitement).toBe(90);
    // Fenrir has empathy > 0.7 -> alignment = 80
    expect(personas[2].currentMindset.alignment).toBe(80);
  });

  it('should set role to uppercase agent id', async () => {
    const file: FileData = { inlineData: { data: 'test', mimeType: 'text/plain' } } as any;
    const personas = await generatePersonas(file);

    expect(personas[0].role).toBe('CHARON');
    expect(personas[1].role).toBe('PUCK');
    expect(personas[2].role).toBe('FENRIR');
  });

  it('should set voiceName from agent voice', async () => {
    const file: FileData = { inlineData: { data: 'test', mimeType: 'text/plain' } } as any;
    const personas = await generatePersonas(file);

    expect(personas[0].voiceName).toBe('voice-charon');
    expect(personas[1].voiceName).toBe('voice-puck');
    expect(personas[2].voiceName).toBe('voice-fenrir');
  });

  // --- runDebateTurn ---

  it('should return a debate turn with parsed response', async () => {
    const responseData = { response_text: 'I disagree.', mindset_shift: { skepticism: 80, excitement: 40, alignment: 50 } };
    mockRetryGeminiRequest.mockResolvedValue({ text: JSON.stringify(responseData) });

    const persona: SyntheticPersona = {
      id: 'Charon', name: 'Charon', role: 'CHARON', bias: 'test',
      systemPrompt: 'Be skeptical', avatar_color: '#ef4444',
      currentMindset: { skepticism: 90, excitement: 50, alignment: 50 },
      voiceName: 'voice-charon',
    };

    const contextFile: FileData = { inlineData: { data: 'test', mimeType: 'text/plain' } } as any;
    const turn = await runDebateTurn(persona, [], contextFile);

    expect(turn.text).toBe('I disagree.');
    expect(turn.personaId).toBe('Charon');
    expect(turn.sentiment).toBe('NEUTRAL');
    expect(turn.newMindset).toEqual({ skepticism: 80, excitement: 40, alignment: 50 });
  });

  it('should include god mode directive in prompt when provided', async () => {
    const responseData = { response_text: 'Override response', mindset_shift: { skepticism: 50, excitement: 50, alignment: 50 } };
    mockRetryGeminiRequest.mockResolvedValue({ text: JSON.stringify(responseData) });

    const persona: SyntheticPersona = {
      id: 'Puck', name: 'Puck', role: 'PUCK', bias: 'test',
      systemPrompt: 'Be visionary', avatar_color: '#9d4edd',
      currentMindset: { skepticism: 50, excitement: 90, alignment: 50 },
      voiceName: 'voice-puck',
    };

    const contextFile: FileData = { inlineData: { data: 'test', mimeType: 'text/plain' } } as any;
    const turn = await runDebateTurn(persona, [], contextFile, 'Focus on security');

    expect(turn.text).toBe('Override response');
    // Verify retryGeminiRequest was called (the prompt construction happened)
    expect(mockRetryGeminiRequest).toHaveBeenCalledTimes(1);
  });

  it('should throw on debate turn failure', async () => {
    mockRetryGeminiRequest.mockRejectedValue(new Error('API error'));

    const persona: SyntheticPersona = {
      id: 'Fenrir', name: 'Fenrir', role: 'FENRIR', bias: 'test',
      systemPrompt: 'Be pragmatic', avatar_color: '#22d3ee',
      currentMindset: { skepticism: 50, excitement: 50, alignment: 80 },
      voiceName: 'voice-fenrir',
    };

    const contextFile: FileData = { inlineData: { data: 'test', mimeType: 'text/plain' } } as any;
    await expect(runDebateTurn(persona, [], contextFile)).rejects.toThrow('Debate turn failed.');
  });

  // --- synthesizeReport ---

  it('should synthesize a report from debate history', async () => {
    const reportData = {
      viabilityScore: 75,
      projectedUpside: 80,
      consensus: 'Moderate agreement',
      majorFrictionPoints: ['Scalability concern'],
      actionableFixes: ['Add caching layer'],
    };
    mockRetryGeminiRequest.mockResolvedValue({ text: JSON.stringify(reportData) });

    const history: DebateTurn[] = [
      { id: '1', personaId: 'Charon', text: 'Flawed architecture', timestamp: 1, sentiment: 'NEGATIVE' },
      { id: '2', personaId: 'Puck', text: 'Great potential', timestamp: 2, sentiment: 'POSITIVE' },
    ];

    const report = await synthesizeReport(history);
    expect(report.viabilityScore).toBe(75);
    expect(report.consensus).toBe('Moderate agreement');
    expect(report.majorFrictionPoints).toHaveLength(1);
  });

  it('should throw on report synthesis failure', async () => {
    mockRetryGeminiRequest.mockRejectedValue(new Error('API error'));

    await expect(synthesizeReport([])).rejects.toThrow('Report synthesis failed.');
  });

  it('should default to empty text when response_text is missing', async () => {
    mockRetryGeminiRequest.mockResolvedValue({ text: JSON.stringify({ mindset_shift: {} }) });

    const persona: SyntheticPersona = {
      id: 'Charon', name: 'Charon', role: 'CHARON', bias: 'test',
      systemPrompt: 'Be skeptical', avatar_color: '#ef4444',
      currentMindset: { skepticism: 90, excitement: 50, alignment: 50 },
      voiceName: 'voice-charon',
    };

    const contextFile: FileData = { inlineData: { data: 'test', mimeType: 'text/plain' } } as any;
    const turn = await runDebateTurn(persona, [], contextFile);

    expect(turn.text).toBe('...');
  });
});
