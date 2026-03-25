import { describe, it, expect } from 'vitest';
import {
    // Orchestrator
    VoiceNexusOrchestrator,
    createVoiceNexus,
    createMinimalVoiceNexus,

    // Router functions
    analyzeComplexity,
    extractComplexitySignals,
    calculateComplexityScore,
    getComplexityTier,
    selectProviders,
    hasExplicitOverride,
    formatComplexityResult,
    STANDARD_THRESHOLDS,
    ELITE_THRESHOLDS,
} from '../index';

// Also test the default export
import DefaultExport from '../index';

describe('Voice Nexus barrel exports (index.ts)', () => {
    it('exports the VoiceNexusOrchestrator class', () => {
        expect(VoiceNexusOrchestrator).toBeDefined();
        expect(typeof VoiceNexusOrchestrator).toBe('function');
    });

    it('exports factory functions', () => {
        expect(typeof createVoiceNexus).toBe('function');
        expect(typeof createMinimalVoiceNexus).toBe('function');
    });

    it('exports all router functions and constants', () => {
        expect(typeof analyzeComplexity).toBe('function');
        expect(typeof extractComplexitySignals).toBe('function');
        expect(typeof calculateComplexityScore).toBe('function');
        expect(typeof getComplexityTier).toBe('function');
        expect(typeof selectProviders).toBe('function');
        expect(typeof hasExplicitOverride).toBe('function');
        expect(typeof formatComplexityResult).toBe('function');

        expect(STANDARD_THRESHOLDS).toEqual({ balanced: 0.4, deep: 0.75 });
        expect(ELITE_THRESHOLDS).toEqual({ balanced: 0.25, deep: 0.55 });
    });

    it('has a default export that is VoiceNexusOrchestrator', () => {
        expect(DefaultExport).toBe(VoiceNexusOrchestrator);
    });

    it('router functions work end-to-end through barrel export', () => {
        const result = analyzeComplexity('Explain the architecture of distributed systems');
        expect(result).toHaveProperty('score');
        expect(result).toHaveProperty('tier');
        expect(result).toHaveProperty('signals');
        expect(result).toHaveProperty('recommendedProvider');
        expect(['fast', 'balanced', 'deep']).toContain(result.tier);
    });
});
