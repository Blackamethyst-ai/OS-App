/**
 * Tests for ContextCompilerService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContextCompilerService } from '../ContextCompiler';
import {
  RecencyProcessor,
  SystemInstructionProcessor,
} from '../Processor';
import type { Event, LongTermMemory, ExternalArtifactStore, CurrentScope, WorkingContext } from '../interfaces';
import type { ContextProcessor } from '../Processor';

// Mock logger
vi.mock('../../logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

function makeScope(): CurrentScope {
  return { currentMessage: 'hello', activeTools: [], mode: 'CODE_STUDIO' };
}

function makeMockMemory(): LongTermMemory {
  return {
    query: vi.fn().mockResolvedValue([]),
    store: vi.fn().mockResolvedValue(undefined),
  };
}

function makeMockArtifactStore(): ExternalArtifactStore {
  return {
    getActiveArtifacts: vi.fn().mockResolvedValue([]),
    getSchema: vi.fn().mockResolvedValue({}),
  };
}

describe('ContextCompilerService', () => {
  it('compiles context from multiple processors', async () => {
    const mockProcessor: ContextProcessor = {
      name: 'TestProcessor',
      process: vi.fn().mockResolvedValue([
        { role: 'user', content: 'test context' },
      ]),
    };

    const compiler = new ContextCompilerService([mockProcessor]);
    const result = await compiler.compile([], makeMockMemory(), makeMockArtifactStore(), makeScope());

    expect(result.history).toHaveLength(1);
    expect(result.history[0].content).toBe('test context');
  });

  it('extracts system instruction from SystemInstructionProcessor', async () => {
    const sysProc = new SystemInstructionProcessor('You are sovereign.');
    const compiler = new ContextCompilerService([sysProc]);
    const result = await compiler.compile([], makeMockMemory(), makeMockArtifactStore(), makeScope());

    expect(result.systemInstruction).toContain('You are sovereign.');
    expect(result.history).toHaveLength(0);
  });

  it('concatenates multiple system instructions', async () => {
    const proc1 = new SystemInstructionProcessor('Instruction A.');
    const proc2 = new SystemInstructionProcessor('Instruction B.');
    const compiler = new ContextCompilerService([proc1, proc2]);
    const result = await compiler.compile([], makeMockMemory(), makeMockArtifactStore(), makeScope());

    expect(result.systemInstruction).toContain('Instruction A.');
    expect(result.systemInstruction).toContain('Instruction B.');
  });

  it('handles processor failure gracefully', async () => {
    const failProc: ContextProcessor = {
      name: 'FailProcessor',
      process: vi.fn().mockRejectedValue(new Error('boom')),
    };
    const goodProc: ContextProcessor = {
      name: 'GoodProcessor',
      process: vi.fn().mockResolvedValue([
        { role: 'user', content: 'survived' },
      ]),
    };

    const compiler = new ContextCompilerService([failProc, goodProc]);
    const result = await compiler.compile([], makeMockMemory(), makeMockArtifactStore(), makeScope());

    // The good processor result should still be there
    expect(result.history).toHaveLength(1);
    expect(result.history[0].content).toBe('survived');
  });

  it('returns empty history and empty instruction with no processors', async () => {
    const compiler = new ContextCompilerService([]);
    const result = await compiler.compile([], makeMockMemory(), makeMockArtifactStore(), makeScope());

    expect(result.history).toEqual([]);
    expect(result.systemInstruction).toBe('');
  });
});
