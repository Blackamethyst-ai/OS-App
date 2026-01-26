import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    DEFAULT_CONFIG,
    MODEL_COSTS,
    COMPLEXITY_THRESHOLDS,
    SUBSYSTEM_CAPABILITIES,
    ESCALATION_CONFIG,
    PATTERN_CONFIG,
    TELEMETRY_CONFIG,
    getConfig,
    validateConfig
} from '../config';

describe('Archon Configuration', () => {
    describe('DEFAULT_CONFIG', () => {
        it('should have sensible default values', () => {
            expect(DEFAULT_CONFIG.maxRetries).toBe(5);
            expect(DEFAULT_CONFIG.escalationThreshold).toBe(5);
            expect(DEFAULT_CONFIG.dqTarget).toBe(0.55);
            expect(DEFAULT_CONFIG.totalTokenBudget).toBe(1_000_000);
            expect(DEFAULT_CONFIG.defaultModel).toBe('flagship');
            expect(DEFAULT_CONFIG.learningEnabled).toBe(true);
            expect(DEFAULT_CONFIG.persistenceEnabled).toBe(true);
        });

        it('should have all subsystem budget ratios', () => {
            const ratios = DEFAULT_CONFIG.subsystemBudgetRatios;
            expect(ratios.get('ace')).toBe(0.30);
            expect(ratios.get('cpb')).toBe(0.25);
            expect(ratios.get('evolution')).toBe(0.15);
            expect(ratios.get('dream')).toBe(0.10);
            expect(ratios.get('kernel')).toBe(0.10);
            expect(ratios.get('voice')).toBe(0.05);
            expect(ratios.get('dq')).toBe(0.05);
        });

        it('should have budget ratios that sum to 1', () => {
            let sum = 0;
            DEFAULT_CONFIG.subsystemBudgetRatios.forEach((ratio) => {
                sum += ratio;
            });
            expect(sum).toBeCloseTo(1.0);
        });
    });

    describe('MODEL_COSTS', () => {
        it('should have pricing for all model tiers', () => {
            expect(MODEL_COSTS.fast).toBeDefined();
            expect(MODEL_COSTS.standard).toBeDefined();
            expect(MODEL_COSTS.flagship).toBeDefined();
            expect(MODEL_COSTS.local).toBeDefined();
        });

        it('should have free pricing for local models', () => {
            expect(MODEL_COSTS.local.input).toBe(0);
            expect(MODEL_COSTS.local.output).toBe(0);
        });

        it('should have increasing prices from fast to flagship', () => {
            expect(MODEL_COSTS.fast.input).toBeLessThan(MODEL_COSTS.standard.input);
            expect(MODEL_COSTS.standard.input).toBeLessThan(MODEL_COSTS.flagship.input);
        });
    });

    describe('COMPLEXITY_THRESHOLDS', () => {
        it('should have ordered thresholds', () => {
            expect(COMPLEXITY_THRESHOLDS.SIMPLE).toBeLessThan(COMPLEXITY_THRESHOLDS.MODERATE);
        });
    });

    describe('SUBSYSTEM_CAPABILITIES', () => {
        it('should have capabilities for all subsystems', () => {
            expect(SUBSYSTEM_CAPABILITIES.ace.length).toBeGreaterThan(0);
            expect(SUBSYSTEM_CAPABILITIES.dq.length).toBeGreaterThan(0);
            expect(SUBSYSTEM_CAPABILITIES.dream.length).toBeGreaterThan(0);
            expect(SUBSYSTEM_CAPABILITIES.evolution.length).toBeGreaterThan(0);
            expect(SUBSYSTEM_CAPABILITIES.kernel.length).toBeGreaterThan(0);
            expect(SUBSYSTEM_CAPABILITIES.voice.length).toBeGreaterThan(0);
            expect(SUBSYSTEM_CAPABILITIES.cpb.length).toBeGreaterThan(0);
        });

        it('should include expected capabilities', () => {
            expect(SUBSYSTEM_CAPABILITIES.ace).toContain('multi-agent-consensus');
            expect(SUBSYSTEM_CAPABILITIES.dq).toContain('quality-scoring');
            expect(SUBSYSTEM_CAPABILITIES.evolution).toContain('code-generation');
        });
    });

    describe('ESCALATION_CONFIG', () => {
        it('should have sensible escalation settings', () => {
            expect(ESCALATION_CONFIG.maxOptions).toBe(3);
            expect(ESCALATION_CONFIG.autoEscalateAfterMs).toBe(5 * 60 * 1000);
            expect(ESCALATION_CONFIG.retryThreshold).toBe(0.5);
            expect(ESCALATION_CONFIG.confidenceThreshold).toBe(0.85);
        });
    });

    describe('PATTERN_CONFIG', () => {
        it('should have pattern matching settings', () => {
            expect(PATTERN_CONFIG.minConfidence).toBe(0.7);
            expect(PATTERN_CONFIG.recencyWeight).toBe(0.8);
            expect(PATTERN_CONFIG.maxPatternAgeDays).toBe(30);
            expect(PATTERN_CONFIG.minFrequency).toBe(3);
        });
    });

    describe('TELEMETRY_CONFIG', () => {
        it('should have telemetry settings', () => {
            expect(typeof TELEMETRY_CONFIG.verbose).toBe('boolean');
            expect(TELEMETRY_CONFIG.logDecisions).toBe(true);
            expect(TELEMETRY_CONFIG.logInvocations).toBe(true);
            expect(TELEMETRY_CONFIG.trackTokens).toBe(true);
            expect(TELEMETRY_CONFIG.emitEvents).toBe(true);
        });
    });

    describe('getConfig', () => {
        const originalEnv = process.env.NODE_ENV;

        afterEach(() => {
            process.env.NODE_ENV = originalEnv;
        });

        it('should return default config without overrides', () => {
            const config = getConfig();
            expect(config.dqTarget).toBe(DEFAULT_CONFIG.dqTarget);
            expect(config.totalTokenBudget).toBe(DEFAULT_CONFIG.totalTokenBudget);
        });

        it('should apply user overrides', () => {
            const config = getConfig({ dqTarget: 0.8, maxRetries: 10 });
            expect(config.dqTarget).toBe(0.8);
            expect(config.maxRetries).toBe(10);
        });

        it('should apply development environment overrides', () => {
            process.env.NODE_ENV = 'development';
            const config = getConfig();
            expect(config.maxRetries).toBe(3); // Faster iteration in dev
        });

        it('should not apply dev overrides in production', () => {
            process.env.NODE_ENV = 'production';
            const config = getConfig();
            expect(config.maxRetries).toBe(5); // Default value
        });

        it('should allow overrides to override environment defaults', () => {
            process.env.NODE_ENV = 'development';
            const config = getConfig({ maxRetries: 7 });
            expect(config.maxRetries).toBe(7);
        });
    });

    describe('validateConfig', () => {
        it('should validate correct config', () => {
            const result = validateConfig(DEFAULT_CONFIG);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject maxRetries below 1', () => {
            const config = { ...DEFAULT_CONFIG, maxRetries: 0 };
            const result = validateConfig(config);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('maxRetries must be between 1 and 10');
        });

        it('should reject maxRetries above 10', () => {
            const config = { ...DEFAULT_CONFIG, maxRetries: 11 };
            const result = validateConfig(config);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('maxRetries must be between 1 and 10');
        });

        it('should reject dqTarget below 0', () => {
            const config = { ...DEFAULT_CONFIG, dqTarget: -0.1 };
            const result = validateConfig(config);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('dqTarget must be between 0 and 1');
        });

        it('should reject dqTarget above 1', () => {
            const config = { ...DEFAULT_CONFIG, dqTarget: 1.1 };
            const result = validateConfig(config);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('dqTarget must be between 0 and 1');
        });

        it('should reject totalTokenBudget below 10000', () => {
            const config = { ...DEFAULT_CONFIG, totalTokenBudget: 5000 };
            const result = validateConfig(config);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('totalTokenBudget must be at least 10,000');
        });

        it('should reject budget ratios that do not sum to 1', () => {
            const badRatios = new Map<any, number>([
                ['ace', 0.5],
                ['dq', 0.1],
                // Total: 0.6, not 1
            ]);
            const config = { ...DEFAULT_CONFIG, subsystemBudgetRatios: badRatios };
            const result = validateConfig(config);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('must sum to 1'))).toBe(true);
        });

        it('should accept budget ratios that sum to approximately 1', () => {
            const goodRatios = new Map<any, number>([
                ['ace', 0.333],
                ['dq', 0.333],
                ['kernel', 0.334],
            ]);
            const config = { ...DEFAULT_CONFIG, subsystemBudgetRatios: goodRatios };
            const result = validateConfig(config);
            expect(result.valid).toBe(true);
        });

        it('should collect multiple errors', () => {
            const config = {
                ...DEFAULT_CONFIG,
                maxRetries: 15,
                dqTarget: 2,
                totalTokenBudget: 100,
            };
            const result = validateConfig(config);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(1);
        });
    });
});
