// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Hoisted mocks ──────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => {
  const mockOrchestrator = {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    processText: vi.fn().mockResolvedValue('AI response'),
    switchAgent: vi.fn().mockResolvedValue(undefined),
    getState: vi.fn().mockReturnValue({ skepticism: 50, excitement: 50, alignment: 50 }),
    updateConfig: vi.fn(),
  };

  return {
    mockOrchestrator,
    createVoiceNexus: vi.fn(() => mockOrchestrator),
    codebaseAwareness: {
      loadGraph: vi.fn().mockResolvedValue(undefined),
      parseNavigationIntent: vi.fn(),
      getRoute: vi.fn().mockReturnValue('/dashboard'),
      buildContext: vi.fn().mockReturnValue('mock-context'),
      findComponent: vi.fn().mockReturnValue(null),
    },
    browserSTT: {
      startStreaming: vi.fn().mockResolvedValue(undefined),
      stopStreaming: vi.fn().mockResolvedValue('stopped transcript'),
    },
    elevenLabsTTS: {
      isAvailable: vi.fn().mockReturnValue(false),
      synthesizeAndPlay: vi.fn().mockResolvedValue(undefined),
    },
    browserTTS: {
      speak: vi.fn().mockResolvedValue(undefined),
    },
    analyzeComplexity: vi.fn().mockReturnValue({ score: 0.5 }),
    checkVoiceSystemHealth: vi.fn().mockResolvedValue({ status: 'healthy' }),
    formatHealthReport: vi.fn().mockReturnValue('Health OK'),
    isVoiceSystemViable: vi.fn().mockResolvedValue({ viable: true }),
    apiKeyService: {
      hasGeminiKey: vi.fn().mockReturnValue(false),
    },
    createLogger: vi.fn(() => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
});

// ── Module mocks ───────────────────────────────────────────────────────────
vi.mock('../voiceNexus/orchestrator', () => ({
  VoiceNexusOrchestrator: vi.fn(),
  createVoiceNexus: mocks.createVoiceNexus,
}));

vi.mock('../codebaseAwareness', () => ({
  codebaseAwareness: mocks.codebaseAwareness,
}));

vi.mock('../voiceNexus/providers/stt/browserSTT', () => ({
  browserSTT: mocks.browserSTT,
}));

vi.mock('../voiceNexus/providers/tts/elevenLabsTTS', () => ({
  elevenLabsTTS: mocks.elevenLabsTTS,
}));

vi.mock('../voiceNexus/providers/tts/browserTTS', () => ({
  browserTTS: mocks.browserTTS,
}));

vi.mock('../voiceNexus/complexityRouter', () => ({
  analyzeComplexity: mocks.analyzeComplexity,
}));

vi.mock('../voiceNexus/healthCheck', () => ({
  checkVoiceSystemHealth: mocks.checkVoiceSystemHealth,
  formatHealthReport: mocks.formatHealthReport,
  isVoiceSystemViable: mocks.isVoiceSystemViable,
}));

vi.mock('../apiKeyService', () => ({
  apiKeyService: mocks.apiKeyService,
}));

vi.mock('../logger', () => ({
  createLogger: mocks.createLogger,
  logger: mocks.logger,
}));

// ── Import after mocks ────────────────────────────────────────────────────
import { VoiceCore, getVoiceCore } from '../voiceCoreIntegration';
import { AppMode } from '../../types';

describe('VoiceCore', () => {
  let core: VoiceCore;

  beforeEach(() => {
    vi.clearAllMocks();
    core = new VoiceCore();
  });

  // 1
  it('should construct with default config', () => {
    const state = core.getState();
    expect(state.isListening).toBe(false);
    expect(state.isProcessing).toBe(false);
    expect(state.isSpeaking).toBe(false);
    expect(state.currentTranscript).toBe('');
    expect(state.error).toBeNull();
  });

  // 2
  it('should merge user config with defaults', () => {
    const custom = new VoiceCore({ debugMode: true, sttProvider: 'browser' });
    // The orchestrator is created via createVoiceNexus, so config is consumed internally.
    // We verify it was called (constructor triggers createVoiceNexus).
    expect(mocks.createVoiceNexus).toHaveBeenCalled();
    expect(custom.getState()).toBeDefined();
  });

  // 3
  describe('initialize', () => {
    it('should load codebase graph when awareness is enabled', async () => {
      await core.initialize();
      expect(mocks.codebaseAwareness.loadGraph).toHaveBeenCalled();
    });

    it('should skip graph loading when awareness is disabled', async () => {
      const noAwareness = new VoiceCore({ enableCodebaseAwareness: false });
      mocks.codebaseAwareness.loadGraph.mockClear();
      await noAwareness.initialize();
      expect(mocks.codebaseAwareness.loadGraph).not.toHaveBeenCalled();
    });

    it('should not re-initialize if already initialized', async () => {
      await core.initialize();
      mocks.codebaseAwareness.loadGraph.mockClear();
      await core.initialize();
      expect(mocks.codebaseAwareness.loadGraph).not.toHaveBeenCalled();
    });
  });

  // 4
  describe('subscribe', () => {
    it('should call listener immediately with current state', () => {
      const listener = vi.fn();
      core.subscribe(listener);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(core.getState());
    });

    it('should allow unsubscribing', () => {
      const listener = vi.fn();
      const unsub = core.subscribe(listener);
      unsub();
      // Trigger a state change
      core.setCurrentMode(AppMode.DASHBOARD);
      // Listener was called once on subscribe, but not again after unsub
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  // 5
  describe('setCurrentMode', () => {
    it('should update state with the given mode', () => {
      core.setCurrentMode(AppMode.BIBLIOMORPHIC);
      expect(core.getState().currentMode).toBe(AppMode.BIBLIOMORPHIC);
    });
  });

  // 6
  describe('navigateTo', () => {
    it('should return failure when intent cannot be parsed', () => {
      mocks.codebaseAwareness.parseNavigationIntent.mockReturnValue(null);
      const result = core.navigateTo('nonexistent');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Could not understand navigation destination');
    });

    it('should navigate successfully and call onNavigate', () => {
      mocks.codebaseAwareness.parseNavigationIntent.mockReturnValue({
        mode: AppMode.DASHBOARD,
        subtab: undefined,
      });
      mocks.codebaseAwareness.getRoute.mockReturnValue('/dashboard');

      const navHandler = vi.fn();
      core.onNavigate = navHandler;

      const result = core.navigateTo('go to dashboard');
      expect(result.success).toBe(true);
      expect(result.mode).toBe(AppMode.DASHBOARD);
      expect(result.route).toBe('/dashboard');
      expect(navHandler).toHaveBeenCalledWith(AppMode.DASHBOARD, undefined);
      expect(core.getState().currentMode).toBe(AppMode.DASHBOARD);
    });
  });

  // 7
  describe('processTranscript', () => {
    it('should return empty string for empty text', async () => {
      const result = await core.processTranscript('');
      expect(result).toBe('');
    });

    it('should process text through the orchestrator', async () => {
      mocks.mockOrchestrator.processText.mockResolvedValue('Hello back');
      const onResponse = vi.fn();
      core.onResponse = onResponse;

      const result = await core.processTranscript('Hello');
      expect(result).toBe('Hello back');
      expect(mocks.analyzeComplexity).toHaveBeenCalledWith('Hello');
      expect(onResponse).toHaveBeenCalledWith('Hello back');
      expect(core.getState().isProcessing).toBe(false);
    });

    it('should inject codebase context when awareness is enabled', async () => {
      mocks.codebaseAwareness.buildContext.mockReturnValue('context-data');
      await core.processTranscript('test query');

      const callArg = mocks.mockOrchestrator.processText.mock.calls[0][0];
      expect(callArg).toContain('CURRENT_APP_STATE');
      expect(callArg).toContain('test query');
    });

    it('should handle processing errors gracefully', async () => {
      mocks.mockOrchestrator.processText.mockRejectedValue(new Error('API fail'));
      const result = await core.processTranscript('hello');
      expect(result).toBe('');
      expect(core.getState().error).toContain('Failed to process transcript');
      expect(core.getState().isProcessing).toBe(false);
    });
  });

  // 8
  describe('speak', () => {
    it('should do nothing for empty text', async () => {
      await core.speak('');
      expect(mocks.browserTTS.speak).not.toHaveBeenCalled();
    });

    it('should use browser TTS when elevenlabs is unavailable', async () => {
      mocks.elevenLabsTTS.isAvailable.mockReturnValue(false);
      await core.speak('hello world');
      expect(mocks.browserTTS.speak).toHaveBeenCalledWith('hello world', 'default');
      expect(core.getState().isSpeaking).toBe(false);
    });
  });

  // 9
  describe('stopListening', () => {
    it('should return empty string when not listening', async () => {
      const result = await core.stopListening();
      expect(result).toBe('');
    });
  });

  // 10
  describe('findComponent', () => {
    it('should delegate to codebaseAwareness', () => {
      mocks.codebaseAwareness.findComponent.mockReturnValue({ path: '/test', score: 1 });
      const result = core.findComponent('dashboard');
      expect(result).toEqual({ path: '/test', score: 1 });
      expect(mocks.codebaseAwareness.findComponent).toHaveBeenCalledWith('dashboard');
    });
  });

  // 11
  describe('getCodebaseContext', () => {
    it('should call buildContext with current mode', () => {
      core.setCurrentMode(AppMode.CODE_STUDIO);
      core.getCodebaseContext();
      expect(mocks.codebaseAwareness.buildContext).toHaveBeenCalledWith(AppMode.CODE_STUDIO);
    });

    it('should pass undefined when no mode is set', () => {
      core.getCodebaseContext();
      expect(mocks.codebaseAwareness.buildContext).toHaveBeenCalledWith(undefined);
    });
  });

  // 12
  describe('diagnose', () => {
    it('should delegate to checkVoiceSystemHealth', async () => {
      const health = await core.diagnose();
      expect(mocks.checkVoiceSystemHealth).toHaveBeenCalled();
      expect(health).toEqual({ status: 'healthy' });
    });
  });

  // 13
  describe('checkViability', () => {
    it('should return viability result', async () => {
      const result = await core.checkViability();
      expect(result).toEqual({ viable: true });
    });
  });

  // 14
  describe('switchAgent', () => {
    it('should delegate to orchestrator', async () => {
      const agent = { id: 'test', name: 'TestAgent', gender: 'male' as const, voice: 'V', systemPrompt: 'SP' };
      await core.switchAgent(agent);
      expect(mocks.mockOrchestrator.switchAgent).toHaveBeenCalledWith(agent);
    });
  });

  // 15
  describe('updateMentalState', () => {
    it('should merge mental state into orchestrator config', () => {
      core.updateMentalState({ skepticism: 80 });
      expect(mocks.mockOrchestrator.updateConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          mentalState: expect.objectContaining({ skepticism: 80 }),
        })
      );
    });
  });
});

describe('getVoiceCore', () => {
  it('should return a VoiceCore singleton', () => {
    // getVoiceCore uses module-level state; each call returns same instance
    // We can only test that it returns a VoiceCore
    const core = getVoiceCore({ debugMode: true });
    expect(core).toBeInstanceOf(VoiceCore);
  });
});
