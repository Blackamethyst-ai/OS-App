// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockAddLog = vi.fn();
const mockSetCodeStudioState = vi.fn();
const mockSetHardwareState = vi.fn();
const mockSetProcessState = vi.fn();

const mockRepairMermaidSyntax = vi.fn();
const mockExecuteNeuralPolicy = vi.fn();
const mockHasGeminiKey = vi.fn();

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
  executeNeuralPolicy: (...args: any[]) => mockExecuteNeuralPolicy(...args),
  repairMermaidSyntax: (...args: any[]) => mockRepairMermaidSyntax(...args),
}));

vi.mock('../../types', () => ({
  AppMode: {
    DASHBOARD: 'DASHBOARD',
    CODE_STUDIO: 'CODE_STUDIO',
    PROCESS_MAP: 'PROCESS_MAP',
    HARDWARE_ENGINEER: 'HARDWARE_ENGINEER',
  },
}));

import { useAppStore } from '../../store';
import { neuralAutomata } from '../daemonService';

function makeState(overrides: any = {}) {
  return {
    mode: 'DASHBOARD',
    actions: {
      addLog: mockAddLog,
      setCodeStudioState: mockSetCodeStudioState,
      setHardwareState: mockSetHardwareState,
      setProcessState: mockSetProcessState,
    },
    process: { diagramStatus: 'OK', generatedCode: '', diagramError: null },
    codeStudio: { generatedCode: '', language: 'typescript' },
    hardware: { tierFilter: 'ALL', schematicImage: null },
    system: { logs: [] },
    ...overrides,
  };
}

describe('daemonService - neuralAutomata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasGeminiKey.mockReturnValue(true);
    (useAppStore.getState as any).mockReturnValue(makeState());
  });

  it('should return early if no Gemini key is available', async () => {
    mockHasGeminiKey.mockReturnValue(false);
    await neuralAutomata();
    expect(mockExecuteNeuralPolicy).not.toHaveBeenCalled();
  });

  it('should attempt mermaid repair when in PROCESS_MAP mode with diagram error', async () => {
    (useAppStore.getState as any).mockReturnValue(
      makeState({
        mode: 'PROCESS_MAP',
        process: { diagramStatus: 'ERROR', generatedCode: 'graph TD; A-->B', diagramError: 'Syntax Error' },
      })
    );
    mockRepairMermaidSyntax.mockResolvedValue('graph TD;\n  A-->B;');

    await neuralAutomata();

    expect(mockRepairMermaidSyntax).toHaveBeenCalledWith('graph TD; A-->B', 'Syntax Error');
    expect(mockSetProcessState).toHaveBeenCalledWith({
      generatedCode: 'graph TD;\n  A-->B;',
      diagramStatus: 'OK',
      diagramError: null,
    });
    expect(mockAddLog).toHaveBeenCalledWith('SUCCESS', expect.stringContaining('Repaired'));
  });

  it('should log warning before repair attempt', async () => {
    (useAppStore.getState as any).mockReturnValue(
      makeState({
        mode: 'PROCESS_MAP',
        process: { diagramStatus: 'ERROR', generatedCode: 'bad code', diagramError: 'err' },
      })
    );
    mockRepairMermaidSyntax.mockResolvedValue('fixed');

    await neuralAutomata();

    expect(mockAddLog).toHaveBeenCalledWith('WARN', expect.stringContaining('AUTONOMIC_REFLEX'));
  });

  it('should handle mermaid repair failure gracefully', async () => {
    (useAppStore.getState as any).mockReturnValue(
      makeState({
        mode: 'PROCESS_MAP',
        process: { diagramStatus: 'ERROR', generatedCode: 'bad', diagramError: 'err' },
      })
    );
    mockRepairMermaidSyntax.mockRejectedValue(new Error('repair failed'));

    // Should not throw
    await neuralAutomata();
    expect(mockSetProcessState).not.toHaveBeenCalled();
  });

  it('should build context snapshot for CODE_STUDIO mode', async () => {
    (useAppStore.getState as any).mockReturnValue(
      makeState({
        mode: 'CODE_STUDIO',
        codeStudio: { generatedCode: 'const x = 1;', language: 'javascript' },
      })
    );
    mockExecuteNeuralPolicy.mockResolvedValue({ level: 'INFO', message: 'All good' });

    await neuralAutomata();

    expect(mockExecuteNeuralPolicy).toHaveBeenCalledWith(
      'CODE_STUDIO',
      expect.objectContaining({ language: 'javascript' }),
      expect.any(Array)
    );
  });

  it('should build context snapshot for HARDWARE_ENGINEER mode', async () => {
    (useAppStore.getState as any).mockReturnValue(
      makeState({
        mode: 'HARDWARE_ENGINEER',
        hardware: { tierFilter: 'PRO', schematicImage: 'data:image/png;...' },
      })
    );
    mockExecuteNeuralPolicy.mockResolvedValue({ level: 'INFO', message: 'HW ok' });

    await neuralAutomata();

    expect(mockExecuteNeuralPolicy).toHaveBeenCalledWith(
      'HARDWARE_ENGINEER',
      expect.objectContaining({ hardwareTier: 'PRO', hasSchematic: true }),
      expect.any(Array)
    );
  });

  it('should apply suggested patch in CODE_STUDIO mode', async () => {
    (useAppStore.getState as any).mockReturnValue(
      makeState({
        mode: 'CODE_STUDIO',
        codeStudio: { generatedCode: 'old code', language: 'ts' },
      })
    );
    mockExecuteNeuralPolicy.mockResolvedValue({
      level: 'SUCCESS',
      message: 'Patch ready',
      suggestedPatch: { code: 'new code', explanation: 'Optimized' },
    });

    await neuralAutomata();

    expect(mockSetCodeStudioState).toHaveBeenCalledWith(
      expect.objectContaining({
        activePatch: expect.objectContaining({
          code: 'new code',
          explanation: 'Optimized',
        }),
      })
    );
  });

  it('should add log for decision without suggestedPatch', async () => {
    (useAppStore.getState as any).mockReturnValue(
      makeState({
        mode: 'DASHBOARD',
        system: { logs: [{ message: 'old log' }] },
      })
    );
    mockExecuteNeuralPolicy.mockResolvedValue({
      level: 'INFO',
      message: 'System nominal',
    });

    await neuralAutomata();

    expect(mockAddLog).toHaveBeenCalledWith('INFO', 'System nominal');
  });

  it('should not add duplicate log message', async () => {
    (useAppStore.getState as any).mockReturnValue(
      makeState({
        mode: 'DASHBOARD',
        system: { logs: [{ message: 'System nominal' }] },
      })
    );
    mockExecuteNeuralPolicy.mockResolvedValue({
      level: 'INFO',
      message: 'System nominal',
    });

    await neuralAutomata();

    expect(mockAddLog).not.toHaveBeenCalledWith('INFO', 'System nominal');
  });

  it('should handle null decision gracefully', async () => {
    mockExecuteNeuralPolicy.mockResolvedValue(null);

    await neuralAutomata();

    expect(mockSetCodeStudioState).not.toHaveBeenCalled();
  });

  it('should catch and log top-level errors', async () => {
    (useAppStore.getState as any).mockImplementation(() => {
      throw new Error('store exploded');
    });

    // Should not throw
    await neuralAutomata();
  });

  it('should pass last 5 log messages as recent logs', async () => {
    const logs = Array.from({ length: 10 }, (_, i) => ({ message: `log-${i}` }));
    (useAppStore.getState as any).mockReturnValue(makeState({ system: { logs } }));
    mockExecuteNeuralPolicy.mockResolvedValue(null);

    await neuralAutomata();

    expect(mockExecuteNeuralPolicy).toHaveBeenCalledWith(
      'DASHBOARD',
      expect.any(Object),
      ['log-5', 'log-6', 'log-7', 'log-8', 'log-9']
    );
  });
});
