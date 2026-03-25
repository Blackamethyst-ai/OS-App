import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adaptFeedbackToRouting, getLearnedRoutingFromFeedback } from '../feedbackAdapter';
import type { ModelPerformanceRecord } from '../../../services/archon/learning/feedback';

// Mock the feedback module
vi.mock('../../../services/archon/learning/feedback', () => ({
  getFeedbackLearner: vi.fn(() => ({
    getAllModelPerformance: vi.fn(() => []),
  })),
}));

function makeRecord(overrides: Partial<ModelPerformanceRecord> = {}): ModelPerformanceRecord {
  return {
    modelId: 'test-model',
    totalInvocations: 20,
    avgDqScore: 0.8,
    avgLatencyMs: 500,
    taskTypes: new Set(['implementation']),
    successRate: 0.9,
    lastUsed: Date.now(),
    ...overrides,
  } as ModelPerformanceRecord;
}

describe('adaptFeedbackToRouting', () => {
  it('returns undefined when fewer than 5 records', () => {
    const records = [makeRecord(), makeRecord(), makeRecord()];
    expect(adaptFeedbackToRouting(records)).toBeUndefined();
  });

  it('returns LearnedRouting with correct domain for 5+ records', () => {
    const records = Array.from({ length: 5 }, () => makeRecord());
    const result = adaptFeedbackToRouting(records);

    expect(result).toBeDefined();
    expect(result!.domain).toBe('implementation');
    expect(result!.preferredPath).toBe('hybrid'); // implementation -> hybrid
    expect(result!.avgDQ).toBeCloseTo(0.8);
    expect(result!.avgTime).toBeCloseTo(500);
    expect(result!.sampleCount).toBe(100); // 5 * 20
  });

  it('picks the dominant task type across records', () => {
    const records = [
      makeRecord({ taskTypes: new Set(['research']), totalInvocations: 50 }),
      makeRecord({ taskTypes: new Set(['bugfix']), totalInvocations: 10 }),
      makeRecord({ taskTypes: new Set(['research']), totalInvocations: 30 }),
      makeRecord({ taskTypes: new Set(['bugfix']), totalInvocations: 5 }),
      makeRecord({ taskTypes: new Set(['research']), totalInvocations: 20 }),
    ];
    const result = adaptFeedbackToRouting(records);
    expect(result!.domain).toBe('research');
    expect(result!.preferredPath).toBe('ace'); // research -> ace
  });

  it('caps confidence at 0.95', () => {
    const records = Array.from({ length: 10 }, () =>
      makeRecord({ totalInvocations: 100 })
    );
    const result = adaptFeedbackToRouting(records);
    expect(result!.confidence).toBeLessThanOrEqual(0.95);
  });
});

describe('getLearnedRoutingFromFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns undefined when learner has no data', () => {
    const result = getLearnedRoutingFromFeedback();
    expect(result).toBeUndefined();
  });

  it('returns undefined and does not throw when getFeedbackLearner throws', async () => {
    const { getFeedbackLearner } = await import(
      '../../../services/archon/learning/feedback'
    );
    (getFeedbackLearner as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('not initialized');
    });

    expect(() => getLearnedRoutingFromFeedback()).not.toThrow();
    expect(getLearnedRoutingFromFeedback()).toBeUndefined();
  });
});
