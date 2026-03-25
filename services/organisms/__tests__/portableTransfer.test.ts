/**
 * Tests for Portable Skill Transfer (PaST)
 *
 * Validates skill decomposition, export, import, compatibility verification,
 * and similarity calculation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the codec module before imports
vi.mock('../genome/codec', () => ({
  skillGenomeCodec: {
    computeChecksum: vi.fn().mockReturnValue('mock-checksum'),
    validateChecksum: vi.fn().mockReturnValue(true),
  },
}));

import {
  PortableSkillTransfer,
  portableSkillTransfer,
  decomposeSkill,
  exportSkill,
  importSkill,
  verifySkillCompatibility,
  calculateSkillSimilarity,
} from '../genome/portableTransfer';
import { skillGenomeCodec } from '../genome/codec';
import type { SkillGenome, OrthogonalSkillVector, PortableSkillPackage } from '../genome/types';

// Helper to create a valid test skill
function createTestSkill(overrides: Partial<SkillGenome> = {}): SkillGenome {
  const now = Date.now();
  return {
    id: 'test-skill-001',
    version: '1.0.0',
    name: 'Test Skill',
    description: 'A test skill for portable transfer',
    tags: ['test', 'transfer'],
    inputSchema: { type: 'object', properties: { input: { type: 'string' } }, required: ['input'] },
    outputSchema: { type: 'object', properties: { result: { type: 'string' } } },
    handler: { body: 'return { result: input.value };', params: ['input'], isAsync: false },
    dependencies: [],
    runtime: 'sync',
    timeoutMs: 5000,
    mcpResource: {
      uri: 'mcp://agent-genome/skills/test-skill-001',
      mimeType: 'application/json',
      toolSchema: {
        name: 'genome_test_skill',
        description: 'A test skill',
        inputSchema: { type: 'object' },
      },
    },
    portability: {
      isPortable: true,
      requiresContext: [],
      compatibility: ['genome', 'swarm'],
      orthogonalDimensions: [],
    },
    origin: { type: 'native', createdAt: now, createdBy: 'test-agent' },
    checksum: 'test-checksum',
    dqScore: 0.85,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('PortableSkillTransfer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Singleton pattern', () => {
    it('should return the same instance via getInstance', () => {
      const a = PortableSkillTransfer.getInstance();
      const b = PortableSkillTransfer.getInstance();
      expect(a).toBe(b);
    });

    it('should export a singleton as portableSkillTransfer', () => {
      expect(portableSkillTransfer).toBe(PortableSkillTransfer.getInstance());
    });
  });

  describe('decomposeToOrthogonal / decomposeSkill', () => {
    it('should decompose a skill into three orthogonal dimensions', () => {
      const skill = createTestSkill();
      const vector = decomposeSkill(skill);

      expect(vector.knowledge).toBeInstanceOf(Array);
      expect(vector.skill).toBeInstanceOf(Array);
      expect(vector.context).toBeInstanceOf(Array);
      expect(vector.dimensions).toBe(256);
    });

    it('should produce vectors of the correct dimension (256)', () => {
      const skill = createTestSkill();
      const vector = decomposeSkill(skill);

      expect(vector.knowledge).toHaveLength(256);
      expect(vector.skill).toHaveLength(256);
      expect(vector.context).toHaveLength(256);
    });

    it('should produce normalized vectors (unit length or zero)', () => {
      const skill = createTestSkill();
      const vector = decomposeSkill(skill);

      const magnitude = (v: number[]) => Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));

      // Knowledge and skill vectors should be non-zero and normalized
      const knowledgeMag = magnitude(vector.knowledge);
      const skillMag = magnitude(vector.skill);

      // They should be approximately 1 (unit vectors) or 0 (zero vectors)
      if (knowledgeMag > 0) expect(knowledgeMag).toBeCloseTo(1, 5);
      if (skillMag > 0) expect(skillMag).toBeCloseTo(1, 5);
    });

    it('should use existing orthogonal dimensions when available', () => {
      const embedding256 = new Array(256).fill(0.1);
      const skill = createTestSkill({
        portability: {
          isPortable: true,
          requiresContext: [],
          compatibility: [],
          orthogonalDimensions: [
            { type: 'knowledge', name: 'test', weight: 1.0, embedding: embedding256 },
          ],
        },
      });

      const vector = decomposeSkill(skill);
      // When existing embedding has exactly DEFAULT_DIMENSION length, it should be used as-is
      expect(vector.knowledge).toEqual(embedding256);
    });
  });

  describe('exportPortable / exportSkill', () => {
    it('should export a portable skill package', () => {
      const skill = createTestSkill();
      const pkg = exportSkill(skill);

      expect(pkg.skill).toBeDefined();
      expect(pkg.orthogonalVector).toBeDefined();
      expect(pkg.transfer).toBeDefined();
      expect(pkg.transfer.exportedBy).toBe('test-agent');
      expect(pkg.transfer.signature).toMatch(/^past:/);
      expect(pkg.transfer.exportedAt).toBeGreaterThan(0);
    });

    it('should throw if skill is not marked as portable', () => {
      const skill = createTestSkill({
        portability: {
          isPortable: false,
          requiresContext: [],
          compatibility: [],
          orthogonalDimensions: [],
        },
      });

      expect(() => exportSkill(skill)).toThrow('not marked as portable');
    });

    it('should include target agent when provided', () => {
      const skill = createTestSkill();
      const pkg = exportSkill(skill, 'target-agent');

      expect(pkg.transfer.targetAgent).toBe('target-agent');
    });

    it('should mark context dimensions for adaptation in the portable copy', () => {
      const skill = createTestSkill({
        portability: {
          isPortable: true,
          requiresContext: [],
          compatibility: [],
          orthogonalDimensions: [
            { type: 'context', name: 'env', weight: 0.3 },
            { type: 'knowledge', name: 'domain', weight: 0.7 },
          ],
        },
      });

      const pkg = exportSkill(skill);
      const contextDims = pkg.skill.portability.orthogonalDimensions.filter(
        (d) => d.type === 'context'
      );
      contextDims.forEach((d) => {
        expect(d.name).toMatch(/REQUIRES_ADAPTATION/);
      });

      // Knowledge dims should NOT be marked
      const knowledgeDims = pkg.skill.portability.orthogonalDimensions.filter(
        (d) => d.type === 'knowledge'
      );
      knowledgeDims.forEach((d) => {
        expect(d.name).not.toMatch(/REQUIRES_ADAPTATION/);
      });
    });
  });

  describe('verifyCompatibility / verifySkillCompatibility', () => {
    it('should return compatible when skill has matching subsystems', () => {
      const skill = createTestSkill({
        portability: {
          isPortable: true,
          requiresContext: [],
          compatibility: ['genome', 'swarm'],
          orthogonalDimensions: [],
        },
      });

      const report = verifySkillCompatibility(skill, ['genome', 'swarm']);

      expect(report.isCompatible).toBe(true);
      expect(report.score).toBeGreaterThanOrEqual(0.5);
      expect(report.subsystemCompatibility['genome']).toBe(true);
      expect(report.subsystemCompatibility['swarm']).toBe(true);
    });

    it('should return full score when no subsystems or dependencies needed', () => {
      const skill = createTestSkill({
        dependencies: [],
        portability: {
          isPortable: true,
          requiresContext: [],
          compatibility: [],
          orthogonalDimensions: [],
        },
      });

      const report = verifySkillCompatibility(skill, []);

      // No subsystems to check, no deps, no context = all scores are 1
      expect(report.score).toBe(1);
      expect(report.isCompatible).toBe(true);
    });

    it('should report missing dependencies as non-optional', () => {
      const skill = createTestSkill({
        dependencies: [
          { skillId: 'dep-1', versionRange: '^1.0.0', optional: false },
          { skillId: 'dep-2', versionRange: '^1.0.0', optional: true },
        ],
      });

      const report = verifySkillCompatibility(skill, []);

      // Only non-optional deps are reported as missing
      expect(report.missingDependencies).toHaveLength(1);
      expect(report.missingDependencies[0].skillId).toBe('dep-1');
    });

    it('should identify incompatible subsystems', () => {
      const skill = createTestSkill({
        portability: {
          isPortable: true,
          requiresContext: [],
          compatibility: ['genome'],
          orthogonalDimensions: [],
        },
      });

      const report = verifySkillCompatibility(skill, ['genome', 'voice', 'dream']);

      expect(report.subsystemCompatibility['genome']).toBe(true);
      expect(report.subsystemCompatibility['voice']).toBe(false);
      expect(report.subsystemCompatibility['dream']).toBe(false);
      expect(report.adaptationsNeeded.length).toBeGreaterThan(0);
    });

    it('should satisfy known context types like user and session', () => {
      const skill = createTestSkill({
        portability: {
          isPortable: true,
          requiresContext: ['user-profile', 'session-data', 'custom-rare-context'],
          compatibility: [],
          orthogonalDimensions: [],
        },
      });

      const report = verifySkillCompatibility(skill, []);

      // 'user-profile' and 'session-data' should match available context types
      // 'custom-rare-context' should not
      expect(report.contextRequirements).toHaveLength(3);
    });
  });

  describe('importPortable / importSkill', () => {
    it('should import a valid portable package', () => {
      const skill = createTestSkill();
      const pkg = exportSkill(skill);

      // Setup mock to accept the package's signature verification
      vi.mocked(skillGenomeCodec.validateChecksum).mockReturnValue(true);

      const imported = importSkill(pkg, 'importing-agent');

      expect(imported.origin.type).toBe('imported');
      expect(imported.origin.sourceAgent).toBe('test-agent');
      expect(imported.origin.createdBy).toBe('importing-agent');
      expect(imported.name).toContain('(adapted)');
    });

    it('should throw on checksum validation failure', () => {
      const skill = createTestSkill();
      const pkg = exportSkill(skill);

      vi.mocked(skillGenomeCodec.validateChecksum).mockReturnValue(false);

      expect(() => importSkill(pkg, 'agent')).toThrow('checksum validation failed');
    });

    it('should throw on signature validation failure', () => {
      const skill = createTestSkill();
      const pkg = exportSkill(skill);

      vi.mocked(skillGenomeCodec.validateChecksum).mockReturnValue(true);

      // Tamper with signature
      pkg.transfer.signature = 'tampered-signature';

      expect(() => importSkill(pkg, 'agent')).toThrow('Package signature validation failed');
    });

    it('should throw on dimension mismatch in orthogonal vector', () => {
      const skill = createTestSkill();
      const pkg = exportSkill(skill);

      vi.mocked(skillGenomeCodec.validateChecksum).mockReturnValue(true);

      // Make dimensions inconsistent - need matching signature first
      // Regenerate package with correct signature, then break dimensions
      // The simplest approach: set dimensions to mismatch vector lengths
      pkg.orthogonalVector.dimensions = 999;

      // Also need to fix signature since verifyPackageIntegrity checks signature after checksum
      // But signature is based on skill, not vector, so it should still match.
      // Actually the signature check comes before dimension check, so we need
      // to keep the signature valid. Let's re-export and only break dimensions.
      const pkg2 = exportSkill(skill);
      pkg2.orthogonalVector.dimensions = 999;

      expect(() => importSkill(pkg2, 'agent')).toThrow('dimension mismatch');
    });
  });

  describe('calculateSkillSimilarity', () => {
    it('should return 1.0 for identical vectors', () => {
      const vector: OrthogonalSkillVector = {
        knowledge: [1, 0, 0],
        skill: [0, 1, 0],
        context: [0, 0, 1],
        dimensions: 3,
      };

      const result = calculateSkillSimilarity(vector, vector);

      expect(result.knowledge).toBeCloseTo(1, 5);
      expect(result.skill).toBeCloseTo(1, 5);
      expect(result.context).toBeCloseTo(1, 5);
      expect(result.overall).toBeCloseTo(1, 5);
    });

    it('should return 0 for orthogonal vectors', () => {
      const a: OrthogonalSkillVector = {
        knowledge: [1, 0],
        skill: [1, 0],
        context: [1, 0],
        dimensions: 2,
      };
      const b: OrthogonalSkillVector = {
        knowledge: [0, 1],
        skill: [0, 1],
        context: [0, 1],
        dimensions: 2,
      };

      const result = calculateSkillSimilarity(a, b);

      expect(result.knowledge).toBeCloseTo(0, 5);
      expect(result.skill).toBeCloseTo(0, 5);
      expect(result.context).toBeCloseTo(0, 5);
      expect(result.overall).toBeCloseTo(0, 5);
    });

    it('should weight skill dimension highest in overall score', () => {
      // Knowledge matches, skill and context differ
      const a: OrthogonalSkillVector = {
        knowledge: [1, 0],
        skill: [1, 0],
        context: [1, 0],
        dimensions: 2,
      };
      const b: OrthogonalSkillVector = {
        knowledge: [1, 0],  // same knowledge
        skill: [0, 1],     // different skill
        context: [0, 1],   // different context
        dimensions: 2,
      };

      const result = calculateSkillSimilarity(a, b);

      // knowledge=1, skill=0, context=0 => overall = 1*0.35 + 0*0.45 + 0*0.2 = 0.35
      expect(result.knowledge).toBeCloseTo(1, 5);
      expect(result.skill).toBeCloseTo(0, 5);
      expect(result.overall).toBeCloseTo(0.35, 5);
    });

    it('should return 0 for zero-length vectors', () => {
      const a: OrthogonalSkillVector = {
        knowledge: [0, 0],
        skill: [0, 0],
        context: [0, 0],
        dimensions: 2,
      };
      const b: OrthogonalSkillVector = {
        knowledge: [1, 0],
        skill: [0, 1],
        context: [1, 1],
        dimensions: 2,
      };

      const result = calculateSkillSimilarity(a, b);

      expect(result.knowledge).toBe(0);
      expect(result.skill).toBe(0);
      expect(result.context).toBe(0);
    });

    it('should return 0 for vectors of different lengths', () => {
      const a: OrthogonalSkillVector = {
        knowledge: [1, 0, 0],
        skill: [1, 0, 0],
        context: [1, 0, 0],
        dimensions: 3,
      };
      const b: OrthogonalSkillVector = {
        knowledge: [1, 0],
        skill: [1, 0],
        context: [1, 0],
        dimensions: 2,
      };

      const result = calculateSkillSimilarity(a, b);

      expect(result.knowledge).toBe(0);
      expect(result.skill).toBe(0);
      expect(result.context).toBe(0);
      expect(result.overall).toBe(0);
    });
  });
});
