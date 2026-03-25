// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockConnect = vi.hoisted(() => vi.fn());
const mockClose = vi.hoisted(() => vi.fn());
const mockHasGeminiKey = vi.hoisted(() => vi.fn());
const mockGetAI = vi.hoisted(() => vi.fn());

// Mock external dependencies
vi.mock('@google/genai', () => ({
  Modality: { AUDIO: 'AUDIO' },
}));

vi.mock('../geminiService', () => ({
  getAI: mockGetAI,
  SOVEREIGN_SYSTEM_INSTRUCTION: 'You are a sovereign AI.',
}));

vi.mock('../agents', () => ({
  HIVE_AGENTS: {
    zephyr: { id: 'zephyr', name: 'Zephyr', voice: 'Zephyr' },
    'dr. ira': { id: 'dr. ira', name: 'Dr. Ira', voice: 'Aoede' },
    caleb: { id: 'caleb', name: 'Caleb', voice: 'Charon' },
  },
}));

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../apiKeyService', () => ({
  apiKeyService: {
    hasGeminiKey: mockHasGeminiKey,
  },
}));

describe('LiveSession', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockGetAI.mockReturnValue({
      live: { connect: mockConnect },
    });
    mockHasGeminiKey.mockReturnValue(true);
  });

  async function getSession() {
    const mod = await import('../liveSession');
    return mod.liveSession;
  }

  it('should not be connected initially', async () => {
    const session = await getSession();
    expect(session.isConnected()).toBe(false);
  });

  it('should return null for input frequencies when no analyser', async () => {
    const session = await getSession();
    expect(session.getInputFrequencies()).toBeNull();
  });

  it('should return null for output frequencies when no analyser', async () => {
    const session = await getSession();
    expect(session.getOutputFrequencies()).toBeNull();
  });

  it('should handle disconnect gracefully when not connected', async () => {
    const session = await getSession();
    // Should not throw
    expect(() => session.disconnect()).not.toThrow();
    expect(session.isConnected()).toBe(false);
  });

  it('should throw error when Gemini API key is not configured', async () => {
    mockHasGeminiKey.mockReturnValue(false);
    const session = await getSession();

    const onerror = vi.fn();
    await expect(
      session.connect('zephyr', {
        callbacks: { onerror },
      })
    ).rejects.toThrow('Gemini API key not configured');
    expect(onerror).toHaveBeenCalled();
  });

  it('should call getAI and ai.live.connect when connecting with valid key', async () => {
    // Make connect return a promise that doesn't resolve (we'll race with timeout)
    mockConnect.mockReturnValue(new Promise(() => {}));
    const session = await getSession();

    // The connect will timeout, but we can verify it called the right things
    await expect(
      session.connect('zephyr', {})
    ).rejects.toThrow('Voice connection timed out');

    expect(mockGetAI).toHaveBeenCalled();
    expect(mockConnect).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-2.5-flash-preview-native-audio-dialog',
      })
    );
  }, 20000);

  it('should resolve agent by name case-insensitively', async () => {
    mockConnect.mockReturnValue(new Promise(() => {}));
    const session = await getSession();

    // Connect with uppercase name - should resolve to the agent
    await expect(
      session.connect('Zephyr', {})
    ).rejects.toThrow('Voice connection timed out');

    // The connect call should have been made with Zephyr voice config
    const callArgs = mockConnect.mock.calls[0][0];
    expect(callArgs.config.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName).toBe('Zephyr');
  }, 20000);

  it('should fall back to zephyr agent for unknown agent names', async () => {
    mockConnect.mockReturnValue(new Promise(() => {}));
    const session = await getSession();

    await expect(
      session.connect('unknownAgent', {})
    ).rejects.toThrow('Voice connection timed out');

    const callArgs = mockConnect.mock.calls[0][0];
    expect(callArgs.config.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName).toBe('Zephyr');
  }, 20000);

  it('should include system instruction and switch_agent tool in config', async () => {
    mockConnect.mockReturnValue(new Promise(() => {}));
    const session = await getSession();

    await expect(
      session.connect('zephyr', { systemInstruction: 'Be helpful' })
    ).rejects.toThrow('Voice connection timed out');

    const callArgs = mockConnect.mock.calls[0][0];
    expect(callArgs.config.systemInstruction).toContain('You are a sovereign AI.');
    expect(callArgs.config.systemInstruction).toContain('LOCAL_OVERRIDE: Be helpful');
    expect(callArgs.config.responseModalities).toEqual(['AUDIO']);

    // Should include switch_agent function declaration
    const tools = callArgs.config.tools;
    const hasSwitch = tools.some((t: any) =>
      t.functionDeclarations?.some((fd: any) => fd.name === 'switch_agent')
    );
    expect(hasSwitch).toBe(true);
  }, 20000);

  it('should handle onToolCall for switch_agent', async () => {
    const session = await getSession();
    const switchCallback = vi.fn();
    session.onAgentSwitch = switchCallback;

    const result = await session.onToolCall('switch_agent', { agentName: 'Dr. Ira' });
    expect(result).toEqual({ status: 'switching_initiated', target: 'Dr. Ira' });
    expect(switchCallback).toHaveBeenCalledWith('Dr. Ira');
  });

  it('should return empty object for unknown tool calls', async () => {
    const session = await getSession();
    const result = await session.onToolCall('unknown_tool', {});
    expect(result).toEqual({});
  });

  it('should become connected after successful connect', async () => {
    const mockSession = { close: mockClose, sendRealtimeInput: vi.fn() };
    mockConnect.mockResolvedValue(mockSession);
    const session = await getSession();

    await session.connect('zephyr', {});
    expect(session.isConnected()).toBe(true);
  });

  it('should disconnect and clean up', async () => {
    const mockTrackStop = vi.fn();
    const mockSession = { close: mockClose, sendRealtimeInput: vi.fn() };
    mockConnect.mockResolvedValue(mockSession);
    const session = await getSession();

    await session.connect('zephyr', {});
    expect(session.isConnected()).toBe(true);

    session.disconnect();
    expect(mockClose).toHaveBeenCalled();
    expect(session.isConnected()).toBe(false);
  });
});
