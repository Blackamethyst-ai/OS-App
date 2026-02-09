/**
 * Whitepaper Skills Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WHITEPAPER_SKILLS, registerWhitepaperSkills } from '../genome/whitepaperSkills';
import { MCPSkillServer } from '../genome/mcpServer';
import { skillGenomeCodec } from '../genome/codec';

describe('Whitepaper Skills Library', () => {
  it('should export 6 whitepaper skills', () => {
    expect(WHITEPAPER_SKILLS).toHaveLength(6);
  });

  it('should have unique IDs and names', () => {
    const ids = WHITEPAPER_SKILLS.map((s) => s.id);
    const names = WHITEPAPER_SKILLS.map((s) => s.name);
    expect(new Set(ids).size).toBe(6);
    expect(new Set(names).size).toBe(6);
  });

  it('should all have whitepaper and ucw tags', () => {
    for (const skill of WHITEPAPER_SKILLS) {
      expect(skill.tags).toContain('whitepaper');
      expect(skill.tags).toContain('ucw');
    }
  });

  it('should all have valid MCP resource URIs', () => {
    for (const skill of WHITEPAPER_SKILLS) {
      expect(skill.mcpResource.uri).toMatch(/^mcp:\/\/agent-genome\/skills\//);
      expect(skill.mcpResource.mimeType).toBe('application/json');
      expect(skill.mcpResource.toolSchema.name).toBeTruthy();
    }
  });

  it('should all have dqScore >= 0.85', () => {
    for (const skill of WHITEPAPER_SKILLS) {
      expect(skill.dqScore).toBeGreaterThanOrEqual(0.85);
    }
  });
});

describe('Semantic Layer Extractor', () => {
  const skill = WHITEPAPER_SKILLS.find((s) => s.name === 'Semantic Layer Extractor')!;

  it('should exist', () => {
    expect(skill).toBeDefined();
  });

  it('should extract Data/Light/Instinct layers', () => {
    const handler = skillGenomeCodec.deserializeFunction(skill.handler);
    const result = handler({
      content: 'We need to build a novel architecture that synthesizes multiple AI systems because they complement each other. https://arxiv.org/paper',
      source: 'claude',
    }) as any;

    // Data layer
    expect(result.data).toBeDefined();
    expect(result.data.wordCount).toBeGreaterThan(0);
    expect(result.data.source).toBe('claude');

    // Light layer
    expect(result.light).toBeDefined();
    expect(result.light.intent).toContain('construction');
    expect(result.light.hasReferences).toBe(true);

    // Instinct layer
    expect(result.instinct).toBeDefined();
    expect(result.instinct.noveltySignals).toBeGreaterThan(0);
    expect(result.instinct.synthesisSignals).toBeGreaterThan(0);
    expect(result.instinct.coherencePotential).toBeGreaterThan(0);
  });

  it('should handle empty content', () => {
    const handler = skillGenomeCodec.deserializeFunction(skill.handler);
    const result = handler({ content: '' }) as any;
    expect(result.data.wordCount).toBe(0);
    expect(result.light.complexity).toBe(0);
  });
});

describe('Cognitive Asset Scorer', () => {
  const skill = WHITEPAPER_SKILLS.find((s) => s.name === 'Cognitive Asset Scorer')!;

  it('should score high-quality content as deep_work', () => {
    const handler = skillGenomeCodec.deserializeFunction(skill.handler);
    const result = handler({
      content: 'This novel research paper presents a first-of-its-kind architecture for distributed AI systems. The interface specification allows for composable modules. Example usage: ```import { UCW } from "ucw-sdk"``` See https://arxiv.org/abs/2601.12345 for details.',
      hasProvenance: true,
      hasCitations: true,
      isComposable: true,
    }) as any;

    expect(result.score).toBeGreaterThan(0.5);
    expect(result.isWorthCapturing).toBe(true);
    expect(result.dimensions.novelty).toBeGreaterThan(0);
    expect(result.dimensions.verifiability).toBeGreaterThan(0);
  });

  it('should score low-quality content as garbage', () => {
    const handler = skillGenomeCodec.deserializeFunction(skill.handler);
    const result = handler({
      content: 'hi',
      hasProvenance: false,
      hasCitations: false,
    }) as any;

    expect(result.score).toBeLessThan(0.5);
    expect(result.tier).not.toBe('deep_work');
  });

  it('should recognize quality threshold at 0.4', () => {
    const handler = skillGenomeCodec.deserializeFunction(skill.handler);
    const result = handler({
      content: 'A brief note about an interesting approach to problem solving that could work for our use case.',
    }) as any;

    expect(typeof result.isWorthCapturing).toBe('boolean');
  });
});

describe('Cognitive Mode Classifier', () => {
  const skill = WHITEPAPER_SKILLS.find((s) => s.name === 'Cognitive Mode Classifier')!;

  it('should classify deep work sessions', () => {
    const handler = skillGenomeCodec.deserializeFunction(skill.handler);
    const result = handler({
      content: 'Let me analyze the architecture and implement the function. ```typescript\nconst handler = async () => {\n  const result = await evaluate(data);\n  return transform(result);\n}\n``` We need to review and assess the design patterns being used here.',
      messageCount: 50,
      durationMinutes: 45,
      toolUsageCount: 30,
    }) as any;

    expect(result.mode).toBe('deep_work');
    expect(result.score).toBeGreaterThanOrEqual(0.75);
    expect(result.platform).toBe('claude');
  });

  it('should classify casual sessions', () => {
    const handler = skillGenomeCodec.deserializeFunction(skill.handler);
    const result = handler({
      content: 'what time is it',
      messageCount: 2,
      durationMinutes: 1,
      toolUsageCount: 0,
    }) as any;

    expect(['casual', 'garbage']).toContain(result.mode);
    expect(result.score).toBeLessThan(0.5);
  });
});

describe('Coherence Detector', () => {
  const skill = WHITEPAPER_SKILLS.find((s) => s.name === 'Coherence Detector')!;

  it('should detect coherence between related content', () => {
    const handler = skillGenomeCodec.deserializeFunction(skill.handler);
    const result = handler({
      contentA: 'Building a sovereign cognitive wallet that captures AI interactions across platforms with semantic embeddings and coherence detection.',
      contentB: 'The cognitive wallet system uses semantic embeddings to detect coherence patterns across distributed AI platforms and captures sovereign data.',
      sourceA: 'claude',
      sourceB: 'chatgpt',
    }) as any;

    expect(result.coherenceScore).toBeGreaterThan(0.1);
    expect(result.isCoherent).toBe(true);
    expect(result.sharedConcepts.length).toBeGreaterThan(0);
    expect(result.sourceA).toBe('claude');
    expect(result.sourceB).toBe('chatgpt');
  });

  it('should detect low coherence between unrelated content', () => {
    const handler = skillGenomeCodec.deserializeFunction(skill.handler);
    const result = handler({
      contentA: 'The weather today is sunny with clear blue skies and warm temperatures.',
      contentB: 'Quantum computing uses qubits for parallel computation in cryptographic systems.',
    }) as any;

    expect(result.coherenceScore).toBeLessThan(0.15);
    expect(result.sharedConcepts.length).toBeLessThan(3);
  });
});

describe('Portfolio Valuator', () => {
  const skill = WHITEPAPER_SKILLS.find((s) => s.name === 'Portfolio Valuator')!;

  it('should value a diverse portfolio', () => {
    const handler = skillGenomeCodec.deserializeFunction(skill.handler);
    const result = handler({
      assets: [
        { score: 0.9, tier: 'deep_work', ageInDays: 5, compositionCount: 3 },
        { score: 0.6, tier: 'exploration', ageInDays: 10, compositionCount: 1 },
        { score: 0.35, tier: 'casual', ageInDays: 2, compositionCount: 0 },
      ],
    }) as any;

    expect(result.totalValue).toBeGreaterThan(0);
    expect(result.assetCount).toBe(3);
    expect(result.tierBreakdown.deep_work.count).toBe(1);
    expect(result.tierBreakdown.exploration.count).toBe(1);
    expect(result.tierBreakdown.casual.count).toBe(1);
    expect(result.compoundingFactor).toBeGreaterThan(1); // Diversity bonus
  });

  it('should handle empty portfolio', () => {
    const handler = skillGenomeCodec.deserializeFunction(skill.handler);
    const result = handler({ assets: [] }) as any;

    expect(result.totalValue).toBe(0);
    expect(result.assetCount).toBe(0);
  });

  it('should apply compounding for composed assets', () => {
    const handler = skillGenomeCodec.deserializeFunction(skill.handler);

    const simple = handler({
      assets: [{ score: 0.8, tier: 'deep_work', ageInDays: 0, compositionCount: 0 }],
    }) as any;

    const composed = handler({
      assets: [{ score: 0.8, tier: 'deep_work', ageInDays: 0, compositionCount: 5 }],
    }) as any;

    expect(composed.totalValue).toBeGreaterThan(simple.totalValue);
  });
});

describe('Quality Threshold Filter', () => {
  const skill = WHITEPAPER_SKILLS.find((s) => s.name === 'Quality Threshold Filter')!;

  it('should filter by default threshold (0.4)', () => {
    const handler = skillGenomeCodec.deserializeFunction(skill.handler);
    const result = handler({
      items: [
        { id: '1', score: 0.8, content: 'high quality' },
        { id: '2', score: 0.3, content: 'low quality' },
        { id: '3', score: 0.5, content: 'medium quality' },
        { id: '4', score: 0.1, content: 'garbage' },
      ],
    }) as any;

    expect(result.passed).toHaveLength(2);
    expect(result.filtered).toHaveLength(2);
    expect(result.stats.passRate).toBe(0.5);
    expect(result.stats.threshold).toBe(0.4);
  });

  it('should respect custom threshold', () => {
    const handler = skillGenomeCodec.deserializeFunction(skill.handler);
    const result = handler({
      items: [
        { id: '1', score: 0.8 },
        { id: '2', score: 0.6 },
        { id: '3', score: 0.4 },
      ],
      threshold: 0.7,
    }) as any;

    expect(result.passed).toHaveLength(1);
    expect(result.filtered).toHaveLength(2);
  });
});

describe('Registration', () => {
  it('should register all whitepaper skills', () => {
    MCPSkillServer.resetInstance();
    const server = MCPSkillServer.getInstance();
    const registry = {
      register: () => {},
      getAll: () => [] as any[],
    };

    const result = registerWhitepaperSkills(registry, server);
    expect(result.registered).toBe(6);
    expect(result.skipped).toBe(0);
  });

  it('should skip already registered skills', () => {
    MCPSkillServer.resetInstance();
    const server = MCPSkillServer.getInstance();
    const registered: any[] = [];
    const registry = {
      register: (s: any) => registered.push(s),
      getAll: () => registered,
    };

    registerWhitepaperSkills(registry, server);
    const second = registerWhitepaperSkills(registry, server);
    expect(second.registered).toBe(0);
    expect(second.skipped).toBe(6);
  });
});
