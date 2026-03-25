import { describe, it, expect } from 'vitest';

// Test that the barrel file re-exports everything correctly
import {
  // Types config
  DEFAULT_CPB_CONFIG,
  STANDARD_CPB_CONFIG,
  // Router
  extractPathSignals,
  selectPath,
  canUseDirectPath,
  needsRLMPath,
  wouldBenefitFromConsensus,
  // Orchestrator
  CognitivePrecisionBridge,
  createCPB,
  cpbExecute,
  // Feedback adapter
  adaptFeedbackToRouting,
  getLearnedRoutingFromFeedback,
} from '../index';

describe('cpb-core barrel exports', () => {
  it('exports DEFAULT_CPB_CONFIG and STANDARD_CPB_CONFIG', () => {
    expect(DEFAULT_CPB_CONFIG).toBeDefined();
    expect(DEFAULT_CPB_CONFIG.autoRoute).toBe(true);
    expect(STANDARD_CPB_CONFIG).toBeDefined();
    expect(STANDARD_CPB_CONFIG.autoRoute).toBe(true);
  });

  it('exports router functions', () => {
    expect(typeof extractPathSignals).toBe('function');
    expect(typeof selectPath).toBe('function');
    expect(typeof canUseDirectPath).toBe('function');
    expect(typeof needsRLMPath).toBe('function');
    expect(typeof wouldBenefitFromConsensus).toBe('function');
  });

  it('exports orchestrator class and helpers', () => {
    expect(CognitivePrecisionBridge).toBeDefined();
    expect(typeof createCPB).toBe('function');
    expect(typeof cpbExecute).toBe('function');
  });

  it('exports feedback adapter functions', () => {
    expect(typeof adaptFeedbackToRouting).toBe('function');
    expect(typeof getLearnedRoutingFromFeedback).toBe('function');
  });
});
