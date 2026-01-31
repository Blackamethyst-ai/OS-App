/**
 * Tests for Adaptive Mixture of Experts
 *
 * Validates the AdaptiveExpertMixture singleton and its core functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AdaptiveExpertMixture } from '../swarm/adaptiveMoE';
import type { ExpertSpec } from '../swarm/adaptiveMoE';

describe('AdaptiveExpertMixture', () => {
  beforeEach(() => {
    // Reset singleton for each test
    (AdaptiveExpertMixture as unknown as { instance: null }).instance = null;
  });

  describe('initialization', () => {
    it('should create singleton instance', () => {
      const moe = AdaptiveExpertMixture.getInstance();
      expect(moe).toBeInstanceOf(AdaptiveExpertMixture);
    });

    it('should return same instance on multiple calls', () => {
      const moe1 = AdaptiveExpertMixture.getInstance();
      const moe2 = AdaptiveExpertMixture.getInstance();
      expect(moe1).toBe(moe2);
    });
  });

  describe('expert registration', () => {
    it('should expose registerExpert method', () => {
      const moe = AdaptiveExpertMixture.getInstance();
      expect(typeof moe.registerExpert).toBe('function');
    });

    it('should expose getAllExperts method', () => {
      const moe = AdaptiveExpertMixture.getInstance();
      expect(typeof moe.getAllExperts).toBe('function');
    });
  });

  describe('routing', () => {
    it('should expose routeAndExecute method', () => {
      const moe = AdaptiveExpertMixture.getInstance();
      expect(typeof moe.routeAndExecute).toBe('function');
    });

    it('should expose computeSuitability method', () => {
      const moe = AdaptiveExpertMixture.getInstance();
      expect(typeof moe.computeSuitability).toBe('function');
    });
  });

  describe('metrics', () => {
    it('should track routing metrics', () => {
      const moe = AdaptiveExpertMixture.getInstance();
      const metrics = moe.getRoutingMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics.totalRoutings).toBe('number');
    });
  });
});
