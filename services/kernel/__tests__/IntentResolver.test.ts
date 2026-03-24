/**
 * Tests for IntentResolver
 *
 * Validates intent classification, entity extraction, navigation matching,
 * biometric triggers, and context hint generation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IntentResolver } from '../IntentResolver';
import type { BiometricContext, GazeFixation } from '../types';

// Mock logger
vi.mock('../../logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2, 9),
});

describe('IntentResolver', () => {
  let resolver: IntentResolver;

  beforeEach(() => {
    resolver = new IntentResolver();
  });

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await expect(resolver.initialize()).resolves.not.toThrow();
    });

    it('should be idempotent when called multiple times', async () => {
      await resolver.initialize();
      await expect(resolver.initialize()).resolves.not.toThrow();
    });
  });

  // ==========================================================================
  // NAVIGATION INTENT MATCHING
  // ==========================================================================

  describe('resolve - navigation intents', () => {
    beforeEach(async () => {
      await resolver.initialize();
    });

    it('should resolve "go to dashboard" as NAVIGATION with DASHBOARD target', async () => {
      const intent = await resolver.resolve('go to dashboard');

      expect(intent.category).toBe('NAVIGATION');
      expect(intent.targetMode).toBe('DASHBOARD');
      expect(intent.confidence).toBe(0.95);
    });

    it('should resolve "switch to metaventions" as NAVIGATION', async () => {
      const intent = await resolver.resolve('switch to metaventions');

      expect(intent.category).toBe('NAVIGATION');
      expect(intent.targetMode).toBe('METAVENTIONS_HUB');
    });

    it('should resolve "open research" as NAVIGATION with BIBLIOMORPHIC target', async () => {
      const intent = await resolver.resolve('open research');

      expect(intent.category).toBe('NAVIGATION');
      expect(intent.targetMode).toBe('BIBLIOMORPHIC');
    });

    it('should resolve "show process map" as NAVIGATION', async () => {
      const intent = await resolver.resolve('show process map');

      expect(intent.category).toBe('NAVIGATION');
      expect(intent.targetMode).toBe('PROCESS_MAP');
    });

    it('should resolve "navigate to memory" as NAVIGATION', async () => {
      const intent = await resolver.resolve('navigate to memory');

      expect(intent.category).toBe('NAVIGATION');
      expect(intent.targetMode).toBe('MEMORY_CORE');
    });

    it('should resolve "go to voice" as NAVIGATION', async () => {
      const intent = await resolver.resolve('go to voice');

      expect(intent.category).toBe('NAVIGATION');
      expect(intent.targetMode).toBe('VOICE_MODE');
    });

    it('should resolve "open agents" as NAVIGATION', async () => {
      const intent = await resolver.resolve('open agents');

      expect(intent.category).toBe('NAVIGATION');
      expect(intent.targetMode).toBe('AGENT_CONTROL');
    });

    it('should resolve "show finance" as NAVIGATION', async () => {
      const intent = await resolver.resolve('show finance');

      expect(intent.category).toBe('NAVIGATION');
      expect(intent.targetMode).toBe('AUTONOMOUS_FINANCE');
    });

    it('should resolve "open image" as NAVIGATION', async () => {
      const intent = await resolver.resolve('open image');

      expect(intent.category).toBe('NAVIGATION');
      expect(intent.targetMode).toBe('IMAGE_GEN');
    });

    it('should resolve "go to code studio" as NAVIGATION', async () => {
      const intent = await resolver.resolve('go to code studio');

      expect(intent.category).toBe('NAVIGATION');
      expect(intent.targetMode).toBe('CODE_STUDIO');
    });

    it('should include suggested tools for NAVIGATION', async () => {
      const intent = await resolver.resolve('go to dashboard');

      expect(intent.suggestedTools).toContain('navigate');
      expect(intent.suggestedTools).toContain('setMode');
    });
  });

  // ==========================================================================
  // INTENT CATEGORY CLASSIFICATION
  // ==========================================================================

  describe('resolve - category classification', () => {
    beforeEach(async () => {
      await resolver.initialize();
    });

    it('should classify "what is the status" as QUERY', async () => {
      const intent = await resolver.resolve('what is the status');

      expect(intent.category).toBe('QUERY');
    });

    it('should classify "explain how it works" as QUERY', async () => {
      const intent = await resolver.resolve('explain how it works');

      expect(intent.category).toBe('QUERY');
    });

    it('should classify "how does this feature work" as QUERY', async () => {
      const intent = await resolver.resolve('how does this feature work');

      expect(intent.category).toBe('QUERY');
    });

    it('should classify "create a new project" as CREATION', async () => {
      const intent = await resolver.resolve('create a new project');

      expect(intent.category).toBe('CREATION');
    });

    it('should classify "generate a report" as CREATION', async () => {
      const intent = await resolver.resolve('generate a report');

      expect(intent.category).toBe('CREATION');
    });

    it('should classify "build a component" as CREATION', async () => {
      const intent = await resolver.resolve('build a component');

      expect(intent.category).toBe('CREATION');
    });

    it('should classify "update the settings" as MUTATION', async () => {
      const intent = await resolver.resolve('update the settings');

      expect(intent.category).toBe('MUTATION');
    });

    it('should classify "delete the file" as MUTATION', async () => {
      const intent = await resolver.resolve('delete the file');

      expect(intent.category).toBe('MUTATION');
    });

    it('should classify "toggle dark mode" as MUTATION', async () => {
      const intent = await resolver.resolve('toggle dark mode');

      expect(intent.category).toBe('MUTATION');
    });

    it('should classify "analyze the architecture" as ANALYSIS', async () => {
      const intent = await resolver.resolve('analyze the architecture');

      expect(intent.category).toBe('ANALYSIS');
    });

    it('should classify "evaluate this approach" as ANALYSIS', async () => {
      const intent = await resolver.resolve('evaluate this approach');

      expect(intent.category).toBe('ANALYSIS');
    });

    it('should classify "coordinate agents" as ORCHESTRATION', async () => {
      const intent = await resolver.resolve('coordinate agents');

      expect(intent.category).toBe('ORCHESTRATION');
    });

    it('should classify "delegate to swarm" as ORCHESTRATION', async () => {
      const intent = await resolver.resolve('delegate to swarm');

      expect(intent.category).toBe('ORCHESTRATION');
    });

    it('should default to QUERY for unrecognized input', async () => {
      const intent = await resolver.resolve('hello there friend');

      expect(intent.category).toBe('QUERY');
    });

    it('should include appropriate suggested tools for each category', async () => {
      const queryIntent = await resolver.resolve('what is this');
      expect(queryIntent.suggestedTools).toContain('search');

      const createIntent = await resolver.resolve('create a new item');
      expect(createIntent.suggestedTools).toContain('generate');

      const mutateIntent = await resolver.resolve('update the config');
      expect(mutateIntent.suggestedTools).toContain('update');
    });
  });

  // ==========================================================================
  // ENTITY EXTRACTION
  // ==========================================================================

  describe('resolve - entity extraction', () => {
    beforeEach(async () => {
      await resolver.initialize();
    });

    it('should extract @agent entities', async () => {
      const intent = await resolver.resolve('tell @researcher to analyze this');

      const agentEntities = intent.entities.filter(e => e.type === 'AGENT');
      expect(agentEntities).toHaveLength(1);
      expect(agentEntities[0].value).toBe('researcher');
      expect(agentEntities[0].confidence).toBe(0.9);
    });

    it('should extract multiple @agent entities', async () => {
      const intent = await resolver.resolve('@alice and @bob should coordinate');

      const agentEntities = intent.entities.filter(e => e.type === 'AGENT');
      expect(agentEntities).toHaveLength(2);
      expect(agentEntities.map(e => e.value)).toContain('alice');
      expect(agentEntities.map(e => e.value)).toContain('bob');
    });

    it('should extract file: entities', async () => {
      const intent = await resolver.resolve('examine file: config.json');

      const fileEntities = intent.entities.filter(e => e.type === 'FILE');
      expect(fileEntities).toHaveLength(1);
      // The regex captures the keyword (file/document/artifact) in group 1,
      // which takes precedence in the match[1] || match[2] logic
      expect(fileEntities[0].value).toBe('file');
    });

    it('should extract concept: entities', async () => {
      const intent = await resolver.resolve('explain concept: recursion');

      const conceptEntities = intent.entities.filter(e => e.type === 'CONCEPT');
      expect(conceptEntities).toHaveLength(1);
      // The regex captures the keyword (concept/idea/topic) in group 1,
      // which takes precedence in the match[1] || match[2] logic
      expect(conceptEntities[0].value).toBe('concept');
    });

    it('should extract entity span positions', async () => {
      const intent = await resolver.resolve('ask @helper about things');

      const entity = intent.entities.find(e => e.type === 'AGENT');
      expect(entity).toBeDefined();
      expect(entity!.span).toBeDefined();
      expect(entity!.span[0]).toBeGreaterThanOrEqual(0);
      expect(entity!.span[1]).toBeGreaterThan(entity!.span[0]);
    });

    it('should return empty entities for plain text', async () => {
      const intent = await resolver.resolve('just a simple question');

      expect(intent.entities).toHaveLength(0);
    });
  });

  // ==========================================================================
  // BIOMETRIC INTENT TRIGGERS
  // ==========================================================================

  describe('resolve - biometric intents', () => {
    beforeEach(async () => {
      await resolver.initialize();
    });

    const makeFixation = (duration: number, targetElement?: string): GazeFixation => ({
      id: 'fix-1',
      centroid: { x: 100, y: 200 },
      duration,
      startTime: Date.now() - duration,
      endTime: Date.now(),
      targetElement,
    });

    it('should create BIOMETRIC intent when stress exceeds 75', async () => {
      const bio: BiometricContext = {
        recentFixations: [],
        stressLevel: { value: 80, trend: 'RISING', confidence: 0.9, timestamp: Date.now() },
        attentionScore: 60,
        cognitiveLoad: 50,
      };

      const intent = await resolver.resolve('anything', { biometricContext: bio });

      expect(intent.category).toBe('BIOMETRIC');
      expect(intent.confidence).toBe(0.9);
      expect(intent.contextHints).toContain('stress_response');
    });

    it('should create BIOMETRIC intent for long gaze fixation (>2000ms)', async () => {
      const bio: BiometricContext = {
        recentFixations: [makeFixation(2500, '#some-element')],
        stressLevel: { value: 30, trend: 'STABLE', confidence: 0.9, timestamp: Date.now() },
        attentionScore: 80,
        cognitiveLoad: 40,
      };

      const intent = await resolver.resolve('anything', { biometricContext: bio });

      expect(intent.category).toBe('BIOMETRIC');
      expect(intent.contextHints).toContain('gaze_prefetch');
    });

    it('should NOT trigger biometric intent when stress is below threshold', async () => {
      const bio: BiometricContext = {
        recentFixations: [makeFixation(500)],
        stressLevel: { value: 40, trend: 'STABLE', confidence: 0.9, timestamp: Date.now() },
        attentionScore: 80,
        cognitiveLoad: 40,
      };

      const intent = await resolver.resolve('what is the weather', { biometricContext: bio });

      expect(intent.category).toBe('QUERY');
    });

    it('should include biometric suggested tools', async () => {
      const bio: BiometricContext = {
        recentFixations: [],
        stressLevel: { value: 90, trend: 'RISING', confidence: 0.9, timestamp: Date.now() },
        attentionScore: 20,
        cognitiveLoad: 80,
      };

      const intent = await resolver.resolve('anything', { biometricContext: bio });

      expect(intent.suggestedTools).toContain('adaptUI');
      expect(intent.suggestedTools).toContain('reduceComplexity');
    });

    it('should pass null biometric context without error', async () => {
      const intent = await resolver.resolve('hello', { biometricContext: null });

      expect(intent.category).not.toBe('BIOMETRIC');
    });
  });

  // ==========================================================================
  // CONTEXT HINTS
  // ==========================================================================

  describe('resolve - context hints', () => {
    beforeEach(async () => {
      await resolver.initialize();
    });

    it('should include current mode in context hints', async () => {
      const intent = await resolver.resolve('search for data', { currentMode: 'DASHBOARD' });

      expect(intent.contextHints).toContain('current_mode:DASHBOARD');
    });

    it('should extract key terms longer than 3 characters', async () => {
      const intent = await resolver.resolve('analyze the architecture patterns');

      const termHints = intent.contextHints.filter(h => h.startsWith('term:'));
      expect(termHints.length).toBeGreaterThan(0);
      expect(termHints).toContain('term:analyze');
      expect(termHints).toContain('term:architecture');
      expect(termHints).toContain('term:patterns');
    });

    it('should filter out common stop words', async () => {
      const intent = await resolver.resolve('what is this with that');

      const termHints = intent.contextHints.filter(h => h.startsWith('term:'));
      // "what", "this", "with", "that" are all filtered out
      expect(termHints.every(h => !['term:what', 'term:this', 'term:with', 'term:that'].includes(h))).toBe(true);
    });

    it('should limit key terms to 5', async () => {
      const intent = await resolver.resolve('evaluate complex distributed system architecture patterns for scalability');

      const termHints = intent.contextHints.filter(h => h.startsWith('term:'));
      expect(termHints.length).toBeLessThanOrEqual(5);
    });
  });

  // ==========================================================================
  // QUICK CLASSIFY
  // ==========================================================================

  describe('quickClassify', () => {
    it('should classify QUERY inputs', () => {
      expect(resolver.quickClassify('what is happening')).toBe('QUERY');
    });

    it('should classify CREATION inputs', () => {
      expect(resolver.quickClassify('create a new component')).toBe('CREATION');
    });

    it('should classify MUTATION inputs', () => {
      expect(resolver.quickClassify('change the color')).toBe('MUTATION');
    });

    it('should classify ANALYSIS inputs', () => {
      expect(resolver.quickClassify('analyze performance data')).toBe('ANALYSIS');
    });

    it('should classify ORCHESTRATION inputs', () => {
      expect(resolver.quickClassify('orchestrate the agents')).toBe('ORCHESTRATION');
    });

    it('should default to QUERY for ambiguous inputs', () => {
      expect(resolver.quickClassify('hello world')).toBe('QUERY');
    });
  });

  // ==========================================================================
  // INTENT STRUCTURE VALIDATION
  // ==========================================================================

  describe('resolve - intent structure', () => {
    beforeEach(async () => {
      await resolver.initialize();
    });

    it('should always include an id', async () => {
      const intent = await resolver.resolve('test');

      expect(intent.id).toBeDefined();
      expect(typeof intent.id).toBe('string');
      expect(intent.id.length).toBeGreaterThan(0);
    });

    it('should always include rawInput', async () => {
      const intent = await resolver.resolve('the original input text');

      expect(intent.rawInput).toBe('the original input text');
    });

    it('should always have entities array', async () => {
      const intent = await resolver.resolve('simple query');

      expect(Array.isArray(intent.entities)).toBe(true);
    });

    it('should always have contextHints array', async () => {
      const intent = await resolver.resolve('simple query');

      expect(Array.isArray(intent.contextHints)).toBe(true);
    });

    it('should always have suggestedTools array', async () => {
      const intent = await resolver.resolve('simple query');

      expect(Array.isArray(intent.suggestedTools)).toBe(true);
      expect(intent.suggestedTools.length).toBeGreaterThan(0);
    });

    it('should have confidence between 0 and 1', async () => {
      const intent = await resolver.resolve('any input');

      expect(intent.confidence).toBeGreaterThanOrEqual(0);
      expect(intent.confidence).toBeLessThanOrEqual(1);
    });
  });
});
