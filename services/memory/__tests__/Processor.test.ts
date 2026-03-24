/**
 * Tests for Context Processors
 *
 * Validates RecencyProcessor, RelevanceProcessor, ArtifactProcessor,
 * ToolSchemaProcessor, SystemInstructionProcessor, and FactProcessor.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  RecencyProcessor,
  RelevanceProcessor,
  ArtifactProcessor,
  ToolSchemaProcessor,
  SystemInstructionProcessor,
  FactProcessor,
} from '../Processor';
import type { Event, LongTermMemory, ExternalArtifactStore, CurrentScope } from '../interfaces';

// Mock logger to suppress debug output
vi.mock('../../logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// ---------- Shared test fixtures ----------

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'evt-1',
    timestamp: Date.now(),
    type: 'user_message',
    content: 'hello world',
    ...overrides,
  };
}

function makeScope(overrides: Partial<CurrentScope> = {}): CurrentScope {
  return {
    currentMessage: 'test query',
    activeTools: [],
    mode: 'CODE_STUDIO',
    ...overrides,
  };
}

function makeMockMemory(results: string[] = []): LongTermMemory {
  return {
    query: vi.fn().mockResolvedValue(results),
    store: vi.fn().mockResolvedValue(undefined),
  };
}

function makeMockArtifactStore(
  files: any[] = [],
  schemas: Record<string, object> = {}
): ExternalArtifactStore {
  return {
    getActiveArtifacts: vi.fn().mockResolvedValue(files),
    getSchema: vi.fn().mockImplementation(async (name: string) => schemas[name] || {}),
  };
}

// ---------- RecencyProcessor ----------

describe('RecencyProcessor', () => {
  it('returns empty array for empty session', async () => {
    const proc = new RecencyProcessor();
    const result = await proc.process([], makeMockMemory(), makeMockArtifactStore(), makeScope());
    expect(result).toEqual([]);
  });

  it('limits output to maxRecencyCount', async () => {
    const events: Event[] = Array.from({ length: 20 }, (_, i) =>
      makeEvent({ id: `evt-${i}`, content: `msg ${i}` })
    );
    const proc = new RecencyProcessor(5);
    const result = await proc.process(events, makeMockMemory(), makeMockArtifactStore(), makeScope());
    expect(result).toHaveLength(5);
    // Should be the last 5 events
    expect(result[0].content).toBe('msg 15');
    expect(result[4].content).toBe('msg 19');
  });

  it('maps user_message to user role', async () => {
    const events = [makeEvent({ type: 'user_message' })];
    const proc = new RecencyProcessor();
    const result = await proc.process(events, makeMockMemory(), makeMockArtifactStore(), makeScope());
    expect(result[0].role).toBe('user');
  });

  it('maps model_response to model role', async () => {
    const events = [makeEvent({ type: 'model_response' })];
    const proc = new RecencyProcessor();
    const result = await proc.process(events, makeMockMemory(), makeMockArtifactStore(), makeScope());
    expect(result[0].role).toBe('model');
  });

  it('maps tool_call and tool_result to function role', async () => {
    const events = [
      makeEvent({ type: 'tool_call', toolName: 'calc' }),
      makeEvent({ type: 'tool_result', toolName: 'calc' }),
    ];
    const proc = new RecencyProcessor();
    const result = await proc.process(events, makeMockMemory(), makeMockArtifactStore(), makeScope());
    expect(result[0].role).toBe('function');
    expect(result[1].role).toBe('function');
  });

  it('maps error and system_note to user role', async () => {
    const events = [
      makeEvent({ type: 'error' }),
      makeEvent({ type: 'system_note' }),
    ];
    const proc = new RecencyProcessor();
    const result = await proc.process(events, makeMockMemory(), makeMockArtifactStore(), makeScope());
    expect(result[0].role).toBe('user');
    expect(result[1].role).toBe('user');
  });

  it('uses default maxRecencyCount of 10', async () => {
    const events: Event[] = Array.from({ length: 15 }, (_, i) =>
      makeEvent({ id: `evt-${i}`, content: `msg ${i}` })
    );
    const proc = new RecencyProcessor();
    const result = await proc.process(events, makeMockMemory(), makeMockArtifactStore(), makeScope());
    expect(result).toHaveLength(10);
  });
});

// ---------- RelevanceProcessor ----------

describe('RelevanceProcessor', () => {
  it('returns empty array when memory returns no results', async () => {
    const proc = new RelevanceProcessor();
    const result = await proc.process([], makeMockMemory([]), makeMockArtifactStore(), makeScope());
    expect(result).toEqual([]);
  });

  it('queries memory with current message and limit 3', async () => {
    const memory = makeMockMemory(['fact A', 'fact B']);
    const scope = makeScope({ currentMessage: 'what is quantum' });
    const proc = new RelevanceProcessor();
    await proc.process([], memory, makeMockArtifactStore(), scope);

    expect(memory.query).toHaveBeenCalledWith('what is quantum', 3);
  });

  it('wraps memory results in a single user-role context', async () => {
    const memory = makeMockMemory(['fact A', 'fact B']);
    const proc = new RelevanceProcessor();
    const result = await proc.process([], memory, makeMockArtifactStore(), makeScope());

    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('user');
    expect(result[0].content).toContain('RELEVANT KNOWLEDGE');
    expect(result[0].content).toContain('[MEMORY_0]: fact A');
    expect(result[0].content).toContain('[MEMORY_1]: fact B');
  });
});

// ---------- ToolSchemaProcessor ----------

describe('ToolSchemaProcessor', () => {
  it('returns empty array when no active tools', async () => {
    const proc = new ToolSchemaProcessor();
    const result = await proc.process(
      [],
      makeMockMemory(),
      makeMockArtifactStore(),
      makeScope({ activeTools: [] })
    );
    expect(result).toEqual([]);
  });

  it('injects schemas for each active tool', async () => {
    const schemas = { calc: { name: 'calc', params: {} } };
    const proc = new ToolSchemaProcessor();
    const result = await proc.process(
      [],
      makeMockMemory(),
      makeMockArtifactStore([], schemas),
      makeScope({ activeTools: ['calc'] })
    );

    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('system');
    expect(result[0].content).toContain('calc');
  });

  it('handles schema retrieval errors gracefully', async () => {
    const store: ExternalArtifactStore = {
      getActiveArtifacts: vi.fn().mockResolvedValue([]),
      getSchema: vi.fn().mockRejectedValue(new Error('not found')),
    };
    const proc = new ToolSchemaProcessor();
    const result = await proc.process(
      [],
      makeMockMemory(),
      store,
      makeScope({ activeTools: ['unknown_tool'] })
    );

    // Should not crash, returns empty
    expect(result).toEqual([]);
  });
});

// ---------- SystemInstructionProcessor ----------

describe('SystemInstructionProcessor', () => {
  it('returns empty array from process', async () => {
    const proc = new SystemInstructionProcessor('You are helpful');
    const result = await proc.process();
    expect(result).toEqual([]);
  });

  it('returns instruction via getInstruction', () => {
    const proc = new SystemInstructionProcessor('Be concise');
    expect(proc.getInstruction()).toBe('Be concise');
  });
});

// ---------- FactProcessor ----------

describe('FactProcessor', () => {
  it('returns empty array when no facts', async () => {
    const proc = new FactProcessor();
    const result = await proc.process([], makeMockMemory(), makeMockArtifactStore(), makeScope());
    expect(result).toEqual([]);
  });

  it('filters out facts below confidence threshold (0.6)', async () => {
    const scope = {
      ...makeScope(),
      facts: [
        { id: 'f1', fact: 'low conf', confidence: 0.3, source: 'http://test' },
      ],
    };
    const proc = new FactProcessor();
    const result = await proc.process([], makeMockMemory(), makeMockArtifactStore(), scope);
    // FactProcessor still returns a compiled block, but with 0 facts inside
    expect(result).toHaveLength(1);
    expect(result[0].content).toContain('TOP 0');
    expect(result[0].content).not.toContain('low conf');
  });

  it('includes high-confidence facts sorted by confidence', async () => {
    const scope = {
      ...makeScope(),
      facts: [
        { id: 'f1', fact: 'medium', confidence: 0.7, source: 'http://src1' },
        { id: 'f2', fact: 'high', confidence: 0.95, source: 'http://src2' },
        { id: 'f3', fact: 'low', confidence: 0.4, source: 'http://src3' },
      ],
    };
    const proc = new FactProcessor();
    const result = await proc.process([], makeMockMemory(), makeMockArtifactStore(), scope);

    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('system');
    // High confidence should come first
    expect(result[0].content).toContain('0.95');
    expect(result[0].content).toContain('0.70');
    expect(result[0].content).not.toContain('low');
  });

  it('limits to top 10 facts', async () => {
    const facts = Array.from({ length: 15 }, (_, i) => ({
      id: `f${i}`,
      fact: `fact ${i}`,
      confidence: 0.8 + i * 0.01,
      source: `http://src${i}`,
    }));
    const scope = { ...makeScope(), facts };
    const proc = new FactProcessor();
    const result = await proc.process([], makeMockMemory(), makeMockArtifactStore(), scope);

    expect(result).toHaveLength(1);
    // Count FACT ID entries
    const factCount = (result[0].content.match(/\[FACT ID:/g) || []).length;
    expect(factCount).toBe(10);
  });
});
