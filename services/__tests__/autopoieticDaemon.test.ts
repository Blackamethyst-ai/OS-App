// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockAddLog = vi.fn();
const mockSetCodeStudioState = vi.fn();
const mockHasGeminiKey = vi.fn();
const mockEvolveSystemArchitecture = vi.fn();

vi.mock('../apiKeyService', () => ({
  apiKeyService: { hasGeminiKey: (...args: any[]) => mockHasGeminiKey(...args) },
}));

vi.mock('../logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../store', () => ({
  useAppStore: {
    getState: vi.fn(),
  },
}));

vi.mock('../geminiService', () => ({
  evolveSystemArchitecture: (...args: any[]) => mockEvolveSystemArchitecture(...args),
}));

vi.mock('../../types', () => ({
  AppMode: {
    CODE_STUDIO: 'CODE_STUDIO',
    DASHBOARD: 'DASHBOARD',
  },
}));

import { useAppStore } from '../../store';

function makeState(overrides: any = {}) {
  return {
    mode: 'CODE_STUDIO',
    codeStudio: {
      generatedCode: 'const x = 1;',
      language: 'typescript',
      prompt: 'build something',
      lastEditTimestamp: 0,
    },
    actions: {
      addLog: mockAddLog,
      setCodeStudioState: mockSetCodeStudioState,
    },
    ...overrides,
  };
}

describe('autopoieticDaemon', () => {
  let autopoieticDaemon: typeof import('../autopoieticDaemon').autopoieticDaemon;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    const mod = await import('../autopoieticDaemon');
    autopoieticDaemon = mod.autopoieticDaemon;

    const store = (await import('../../store')).useAppStore;
    (store.getState as any).mockReturnValue(makeState());
    mockHasGeminiKey.mockReturnValue(true);
  });

  it('should return early if not in CODE_STUDIO mode', async () => {
    const store = (await import('../../store')).useAppStore;
    (store.getState as any).mockReturnValue(makeState({ mode: 'DASHBOARD' }));

    await autopoieticDaemon();

    expect(mockEvolveSystemArchitecture).not.toHaveBeenCalled();
    expect(mockAddLog).not.toHaveBeenCalled();
  });

  it('should return early if no generated code', async () => {
    const store = (await import('../../store')).useAppStore;
    (store.getState as any).mockReturnValue(
      makeState({ codeStudio: { generatedCode: '', language: 'ts', prompt: '', lastEditTimestamp: 0 } })
    );

    await autopoieticDaemon();

    expect(mockEvolveSystemArchitecture).not.toHaveBeenCalled();
  });

  it('should return early if edit was recent (within cooldown)', async () => {
    const store = (await import('../../store')).useAppStore;
    (store.getState as any).mockReturnValue(
      makeState({
        codeStudio: {
          generatedCode: 'new code',
          language: 'ts',
          prompt: 'test',
          lastEditTimestamp: Date.now(), // Just edited
        },
      })
    );

    await autopoieticDaemon();

    expect(mockEvolveSystemArchitecture).not.toHaveBeenCalled();
  });

  it('should log scan initiation and set isEvolving', async () => {
    const store = (await import('../../store')).useAppStore;
    (store.getState as any).mockReturnValue(
      makeState({
        codeStudio: {
          generatedCode: 'unique code 1',
          language: 'ts',
          prompt: 'prompt',
          lastEditTimestamp: 0,
        },
      })
    );
    mockEvolveSystemArchitecture.mockResolvedValue({ ok: false });

    await autopoieticDaemon();

    expect(mockAddLog).toHaveBeenCalledWith('SYSTEM', expect.stringContaining('AUTOPOIETIC_SCAN'));
    expect(mockSetCodeStudioState).toHaveBeenCalledWith({ isEvolving: true });
  });

  it('should return early if no Gemini key after starting scan', async () => {
    const store = (await import('../../store')).useAppStore;
    (store.getState as any).mockReturnValue(
      makeState({
        codeStudio: {
          generatedCode: 'unique code 2',
          language: 'ts',
          prompt: 'p',
          lastEditTimestamp: 0,
        },
      })
    );
    mockHasGeminiKey.mockReturnValue(false);

    await autopoieticDaemon();

    expect(mockSetCodeStudioState).toHaveBeenCalledWith({ isEvolving: false });
    expect(mockEvolveSystemArchitecture).not.toHaveBeenCalled();
  });

  it('should apply evolution result when ok', async () => {
    const store = (await import('../../store')).useAppStore;
    (store.getState as any).mockReturnValue(
      makeState({
        codeStudio: {
          generatedCode: 'unique code 3',
          language: 'typescript',
          prompt: 'build',
          lastEditTimestamp: 0,
        },
      })
    );
    mockEvolveSystemArchitecture.mockResolvedValue({
      ok: true,
      value: {
        code: 'evolved code',
        reasoning: 'Better structure',
        type: 'refactor',
        integrityScore: 90,
      },
    });

    await autopoieticDaemon();

    expect(mockSetCodeStudioState).toHaveBeenCalledWith(
      expect.objectContaining({
        activeEvolution: expect.objectContaining({
          code: 'evolved code',
          reasoning: 'Better structure',
          type: 'refactor',
          integrityScore: 90,
        }),
        isEvolving: false,
      })
    );
    expect(mockAddLog).toHaveBeenCalledWith('SUCCESS', expect.stringContaining('refactor'));
  });

  it('should default integrityScore to 50 when not provided', async () => {
    const store = (await import('../../store')).useAppStore;
    (store.getState as any).mockReturnValue(
      makeState({
        codeStudio: {
          generatedCode: 'unique code 4',
          language: 'ts',
          prompt: 'p',
          lastEditTimestamp: 0,
        },
      })
    );
    mockEvolveSystemArchitecture.mockResolvedValue({
      ok: true,
      value: { code: 'new', reasoning: 'r', type: 't' },
    });

    await autopoieticDaemon();

    expect(mockSetCodeStudioState).toHaveBeenCalledWith(
      expect.objectContaining({
        activeEvolution: expect.objectContaining({ integrityScore: 50 }),
      })
    );
  });

  it('should log stable architecture when result is not ok', async () => {
    const store = (await import('../../store')).useAppStore;
    (store.getState as any).mockReturnValue(
      makeState({
        codeStudio: {
          generatedCode: 'unique code 5',
          language: 'ts',
          prompt: 'p',
          lastEditTimestamp: 0,
        },
      })
    );
    mockEvolveSystemArchitecture.mockResolvedValue({ ok: false });

    await autopoieticDaemon();

    expect(mockSetCodeStudioState).toHaveBeenCalledWith({ isEvolving: false });
    expect(mockAddLog).toHaveBeenCalledWith('INFO', expect.stringContaining('stable'));
  });

  it('should handle errors gracefully and reset isEvolving', async () => {
    const store = (await import('../../store')).useAppStore;
    (store.getState as any).mockReturnValue(
      makeState({
        codeStudio: {
          generatedCode: 'unique code 6',
          language: 'ts',
          prompt: 'p',
          lastEditTimestamp: 0,
        },
      })
    );
    mockEvolveSystemArchitecture.mockRejectedValue(new Error('API down'));

    await autopoieticDaemon();

    expect(mockSetCodeStudioState).toHaveBeenCalledWith({ isEvolving: false });
    expect(mockAddLog).toHaveBeenCalledWith('ERROR', expect.stringContaining('interrupted'));
  });

  it('should pass code, language, and prompt to evolveSystemArchitecture', async () => {
    const store = (await import('../../store')).useAppStore;
    (store.getState as any).mockReturnValue(
      makeState({
        codeStudio: {
          generatedCode: 'unique code 7',
          language: 'python',
          prompt: 'make fast',
          lastEditTimestamp: 0,
        },
      })
    );
    mockEvolveSystemArchitecture.mockResolvedValue({ ok: false });

    await autopoieticDaemon();

    expect(mockEvolveSystemArchitecture).toHaveBeenCalledWith('unique code 7', 'python', 'make fast');
  });

  it('should not scan same code twice (deduplication)', async () => {
    const store = (await import('../../store')).useAppStore;
    const state = makeState({
      codeStudio: {
        generatedCode: 'unique code 8',
        language: 'ts',
        prompt: 'p',
        lastEditTimestamp: 0,
      },
    });
    (store.getState as any).mockReturnValue(state);
    mockEvolveSystemArchitecture.mockResolvedValue({ ok: false });

    await autopoieticDaemon();
    expect(mockEvolveSystemArchitecture).toHaveBeenCalledTimes(1);

    // Second call with same code should be skipped
    vi.clearAllMocks();
    (store.getState as any).mockReturnValue(state);
    await autopoieticDaemon();
    expect(mockEvolveSystemArchitecture).not.toHaveBeenCalled();
  });
});
