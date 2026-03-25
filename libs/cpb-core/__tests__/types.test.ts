import { describe, it, expect } from 'vitest';
import { DEFAULT_CPB_CONFIG, STANDARD_CPB_CONFIG } from '../types';
import type {
  CPBPath,
  CPBPhase,
  PathSignals,
  CPBConfig,
  CPBProvider,
  GenerateOptions,
  DQScore,
  RLMResult,
  ACEResult,
  CPBResult,
  CPBRequest,
  CPBPattern,
  LearnedRouting,
  ModelTier,
  ImageInput,
  MultimodalContent,
} from '../types';

describe('DEFAULT_CPB_CONFIG', () => {
  it('has autoRoute enabled', () => {
    expect(DEFAULT_CPB_CONFIG.autoRoute).toBe(true);
  });

  it('defaults to cascade path', () => {
    expect(DEFAULT_CPB_CONFIG.defaultPath).toBe('cascade');
  });

  it('has ELITE contextThreshold of 100000', () => {
    expect(DEFAULT_CPB_CONFIG.contextThreshold).toBe(100000);
  });

  it('has ELITE dqThreshold of 0.75', () => {
    expect(DEFAULT_CPB_CONFIG.dqThreshold).toBe(0.75);
  });

  it('has rlmConfig with deep rootModel', () => {
    expect(DEFAULT_CPB_CONFIG.rlmConfig).toEqual({
      maxIterations: 25,
      rootModel: 'deep',
      subModel: 'balanced',
    });
  });

  it('has aceConfig with 5-agent ensemble', () => {
    expect(DEFAULT_CPB_CONFIG.aceConfig.agentCount).toBe(5);
    expect(DEFAULT_CPB_CONFIG.aceConfig.maxRounds).toBe(18);
    expect(DEFAULT_CPB_CONFIG.aceConfig.enableAuction).toBe(true);
    expect(DEFAULT_CPB_CONFIG.aceConfig.enableHopGrouping).toBe(true);
  });

  it('has verification and learning enabled', () => {
    expect(DEFAULT_CPB_CONFIG.enableVerification).toBe(true);
    expect(DEFAULT_CPB_CONFIG.enableLearning).toBe(true);
    expect(DEFAULT_CPB_CONFIG.retryOnLowDQ).toBe(true);
  });

  it('has time budget values', () => {
    expect(DEFAULT_CPB_CONFIG.fastPathMs).toBe(8000);
    expect(DEFAULT_CPB_CONFIG.standardPathMs).toBe(45000);
    expect(DEFAULT_CPB_CONFIG.hybridPathMs).toBe(90000);
  });
});

describe('STANDARD_CPB_CONFIG', () => {
  it('defaults to hybrid path', () => {
    expect(STANDARD_CPB_CONFIG.defaultPath).toBe('hybrid');
  });

  it('has lower thresholds than ELITE', () => {
    expect(STANDARD_CPB_CONFIG.contextThreshold).toBe(50000);
    expect(STANDARD_CPB_CONFIG.complexityThreshold).toBe(0.5);
    expect(STANDARD_CPB_CONFIG.dqThreshold).toBe(0.6);
  });

  it('has 3-agent ensemble', () => {
    expect(STANDARD_CPB_CONFIG.aceConfig.agentCount).toBe(3);
  });

  it('uses fast models for rlm', () => {
    expect(STANDARD_CPB_CONFIG.rlmConfig.rootModel).toBe('fast');
    expect(STANDARD_CPB_CONFIG.rlmConfig.subModel).toBe('fast');
  });
});

describe('Type shape conformance', () => {
  it('CPBPath union accepts all valid values', () => {
    const paths: CPBPath[] = ['direct', 'rlm', 'ace', 'hybrid', 'cascade'];
    expect(paths).toHaveLength(5);
  });

  it('CPBPhase union accepts all valid values', () => {
    const phases: CPBPhase[] = [
      'idle', 'analyzing', 'compressing', 'exploring',
      'converging', 'verifying', 'reconstructing', 'complete', 'error',
    ];
    expect(phases).toHaveLength(9);
  });

  it('ModelTier union accepts all valid values', () => {
    const tiers: ModelTier[] = ['fast', 'balanced', 'deep', 'auto'];
    expect(tiers).toHaveLength(4);
  });

  it('PathSignals can include optional stressLevel and convergenceStats', () => {
    const signals: PathSignals = {
      contextLength: 100,
      queryComplexity: 0.5,
      requiresConsensus: false,
      requiresReasoning: false,
      hasGroundTruth: false,
      timeBudgetMs: 5000,
      qualityTarget: 0.7,
      stressLevel: 50,
      convergenceStats: {
        totalPatterns: 10,
        avgDQScore: 0.8,
        avgRoundsToConverge: 3,
      },
    };
    expect(signals.stressLevel).toBe(50);
    expect(signals.convergenceStats?.totalPatterns).toBe(10);
  });

  it('DQScore has weighted components', () => {
    const score: DQScore = {
      overall: 80,
      validity: 85,
      specificity: 75,
      correctness: 80,
      breakdown: {
        reasoning: 'solid',
        gaps: ['none'],
        strengths: ['thorough'],
      },
    };
    expect(score.overall).toBe(80);
    expect(score.breakdown?.gaps).toEqual(['none']);
  });

  it('ImageInput supports base64 and url', () => {
    const img: ImageInput = {
      base64: 'abc123',
      url: 'https://example.com/img.png',
      mediaType: 'image/png',
      mimeType: 'image/png',
      description: 'test',
    };
    expect(img.base64).toBe('abc123');
    expect(img.mediaType).toBe('image/png');
  });
});
