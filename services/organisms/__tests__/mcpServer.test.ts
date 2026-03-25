/**
 * Tests for MCPSkillServer
 *
 * Validates skill registration, listing, retrieval, filtering, and MCP exposure.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../genome/codec', () => ({
  skillGenomeCodec: {
    validateSkillGenome: vi.fn(),
    validateAgainstSchema: vi.fn(() => ({ valid: true, errors: [] })),
    deserializeFunction: vi.fn(() => vi.fn(() => ({ result: 'ok' }))),
  },
}));

vi.mock('../../logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { MCPSkillServer } from '../genome/mcpServer';
import type { SkillGenome } from '../genome/types';

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

function createMockSkill(overrides: Partial<SkillGenome> = {}): SkillGenome {
  const id = overrides.id || `skill-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    version: '1.0.0',
    name: overrides.name || `Skill ${id}`,
    description: overrides.description || 'A test skill',
    tags: overrides.tags || ['test'],
    inputSchema: { type: 'object', properties: { input: { type: 'string' } } },
    outputSchema: { type: 'object', properties: { output: { type: 'string' } } },
    handler: { body: 'return { output: "ok" };', params: ['input'], isAsync: false },
    dependencies: [],
    runtime: overrides.runtime || 'sync',
    timeoutMs: overrides.timeoutMs || 5000,
    mcpResource: overrides.mcpResource || {
      uri: `mcp://agent-genome/skills/${id}`,
      mimeType: 'application/json' as const,
      toolSchema: {
        name: `genome_skill_${id}`,
        description: 'Test skill',
        inputSchema: { type: 'object' },
      },
    },
    portability: overrides.portability || {
      isPortable: true,
      requiresContext: [],
      compatibility: [],
      orthogonalDimensions: [],
    },
    origin: overrides.origin || { type: 'native', createdAt: Date.now() },
    checksum: 'test-checksum',
    dqScore: overrides.dqScore || 0.8,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  } as SkillGenome;
}

describe('MCPSkillServer', () => {
  let server: MCPSkillServer;

  beforeEach(() => {
    MCPSkillServer.resetInstance();
    server = MCPSkillServer.getInstance();
  });

  // ---------------------------------------------------------------------------
  // Singleton
  // ---------------------------------------------------------------------------

  it('should return the same instance from getInstance()', () => {
    const a = MCPSkillServer.getInstance();
    const b = MCPSkillServer.getInstance();
    expect(a).toBe(b);
  });

  it('should create a fresh instance after resetInstance()', () => {
    const before = MCPSkillServer.getInstance();
    before.registerSkillResource(createMockSkill({ id: 'persistent' }));

    MCPSkillServer.resetInstance();
    const after = MCPSkillServer.getInstance();
    expect(after.hasSkill('persistent')).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------

  it('should register a skill and return MCPSkillResource', () => {
    const skill = createMockSkill({ id: 'reg-1', name: 'RegSkill' });
    const resource = server.registerSkillResource(skill);

    expect(resource.uri).toContain('mcp://agent-genome/skills/');
    expect(resource.mimeType).toBe('application/json');
    expect(server.hasSkill('reg-1')).toBe(true);
  });

  it('should generate MCP resource if skill lacks valid one', () => {
    const skill = createMockSkill({ id: 'no-mcp', name: 'NoMCP' });
    // Provide an invalid mcpResource
    skill.mcpResource = { uri: 'invalid', mimeType: 'application/json', toolSchema: null as any };

    const resource = server.registerSkillResource(skill);
    expect(resource.uri).toBe('mcp://agent-genome/skills/no-mcp');
    expect(resource.toolSchema).toBeDefined();
  });

  it('should unregister a skill', () => {
    const skill = createMockSkill({ id: 'unreg-1' });
    server.registerSkillResource(skill);

    expect(server.unregisterSkill('unreg-1')).toBe(true);
    expect(server.hasSkill('unreg-1')).toBe(false);
    expect(server.unregisterSkill('unreg-1')).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Listing & Filtering
  // ---------------------------------------------------------------------------

  it('should list all registered skills', () => {
    server.registerSkillResource(createMockSkill({ id: 's1', name: 'S1' }));
    server.registerSkillResource(createMockSkill({ id: 's2', name: 'S2' }));

    const result = server.listSkills();
    expect(result.totalCount).toBe(2);
    expect(result.skills).toHaveLength(2);
  });

  it('should filter skills by namePattern', () => {
    server.registerSkillResource(createMockSkill({ id: 'f1', name: 'Alpha Skill' }));
    server.registerSkillResource(createMockSkill({ id: 'f2', name: 'Beta Skill' }));

    const result = server.listSkills({ namePattern: 'alpha' });
    expect(result.totalCount).toBe(1);
    expect(result.skills[0].skill.name).toBe('Alpha Skill');
  });

  it('should filter skills by tags (any match)', () => {
    server.registerSkillResource(createMockSkill({ id: 't1', name: 'T1', tags: ['ai', 'search'] }));
    server.registerSkillResource(createMockSkill({ id: 't2', name: 'T2', tags: ['data'] }));

    const result = server.listSkills({ tags: ['search'] });
    expect(result.totalCount).toBe(1);
    expect(result.skills[0].skill.id).toBe('t1');
  });

  it('should paginate with limit and offset', () => {
    for (let i = 0; i < 5; i++) {
      server.registerSkillResource(createMockSkill({ id: `p${i}`, name: `P${i}` }));
    }

    const result = server.listSkills({ limit: 2, offset: 1 });
    expect(result.skills).toHaveLength(2);
    expect(result.totalCount).toBe(5);
    expect(result.offset).toBe(1);
    expect(result.limit).toBe(2);
  });

  it('should filter by status', () => {
    const skill = createMockSkill({ id: 'st1', name: 'StatusSkill' });
    server.registerSkillResource(skill);
    server.updateSkillStatus('st1', 'deprecated');

    const active = server.listSkills({ status: 'active' });
    expect(active.totalCount).toBe(0);

    const deprecated = server.listSkills({ status: 'deprecated' });
    expect(deprecated.totalCount).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // Retrieval
  // ---------------------------------------------------------------------------

  it('should read a skill by ID', () => {
    const skill = createMockSkill({ id: 'read-1', name: 'ReadSkill' });
    server.registerSkillResource(skill);

    const retrieved = server.readSkill('read-1');
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe('read-1');
  });

  it('should return null for non-existent skill', () => {
    expect(server.readSkill('nope')).toBeNull();
  });

  it('should read skill by MCP URI', () => {
    const skill = createMockSkill({ id: 'uri-1', name: 'URISkill' });
    server.registerSkillResource(skill);

    const result = server.readSkillByUri('mcp://agent-genome/skills/uri-1');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('uri-1');
  });

  it('should return null for invalid URI prefix', () => {
    expect(server.readSkillByUri('https://invalid/uri-1')).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // MCP Tool Exposure
  // ---------------------------------------------------------------------------

  it('should expose a skill as an MCP tool', () => {
    const skill = createMockSkill({ id: 'tool-1', name: 'ToolSkill' });
    server.registerSkillResource(skill);

    const tool = server.exposeAsTool('tool-1');
    expect(tool).not.toBeNull();
    expect(tool!.name).toBeDefined();
  });

  it('should return null when exposing non-existent skill', () => {
    expect(server.exposeAsTool('nope')).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  it('should return aggregate server stats', () => {
    server.registerSkillResource(createMockSkill({ id: 'stat1', name: 'Stat1' }));
    server.registerSkillResource(createMockSkill({ id: 'stat2', name: 'Stat2' }));
    server.updateSkillStatus('stat2', 'disabled');

    const stats = server.getServerStats();
    expect(stats.totalSkills).toBe(2);
    expect(stats.activeSkills).toBe(1);
    expect(stats.disabledSkills).toBe(1);
    expect(stats.uptimeMs).toBeGreaterThanOrEqual(0);
  });

  it('should record skill transfer', () => {
    const skill = createMockSkill({ id: 'xfer-1', name: 'XferSkill' });
    server.registerSkillResource(skill);

    server.recordTransfer('xfer-1');
    server.recordTransfer('xfer-1');

    const reg = server.getRegistration('xfer-1');
    expect(reg!.stats.transferCount).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // listAsResources / listAsTools
  // ---------------------------------------------------------------------------

  it('should list skills as MCP resources', () => {
    server.registerSkillResource(createMockSkill({ id: 'res-1', name: 'ResSkill' }));

    const resources = server.listAsResources();
    expect(resources).toHaveLength(1);
    expect(resources[0].uri).toContain('mcp://agent-genome/skills/');
    expect(resources[0].mimeType).toBe('application/json');
  });

  it('should list skills as MCP tools (active only by default)', () => {
    server.registerSkillResource(createMockSkill({ id: 'tl1', name: 'ToolList1' }));
    server.registerSkillResource(createMockSkill({ id: 'tl2', name: 'ToolList2' }));
    server.updateSkillStatus('tl2', 'deprecated');

    const tools = server.listAsTools();
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBeDefined();
    expect(tools[0].inputSchema).toBeDefined();
  });
});
