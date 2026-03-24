// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted so mock references are available in vi.mock factories
const {
    mockGetAI,
    mockSafeParseJson,
    mockClaudeGenerateContent,
    mockClaudeIsConfigured,
    mockApiKeyServiceGetKey,
} = vi.hoisted(() => ({
    mockGetAI: vi.fn(),
    mockSafeParseJson: vi.fn(),
    mockClaudeGenerateContent: vi.fn(),
    mockClaudeIsConfigured: vi.fn(),
    mockApiKeyServiceGetKey: vi.fn(),
}));

vi.mock('../../geminiService', () => ({
    getAI: mockGetAI,
    safeParseJson: mockSafeParseJson,
}));

vi.mock('../../logger', () => ({
    logger: {
        debug: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

vi.mock('../../claudeService', () => ({
    claudeService: {
        generateContent: mockClaudeGenerateContent,
        isConfigured: mockClaudeIsConfigured,
    },
}));

vi.mock('../../apiKeyService', () => ({
    apiKeyService: {
        getKey: mockApiKeyServiceGetKey,
    },
}));

import { auiEngine } from '../AUIEngine';
import type { AUIGenerationContext, AUIEvent, GazeSemanticContext } from '../types';

// Helper: create a minimal generation context
function createTestContext(overrides: Partial<AUIGenerationContext> = {}): AUIGenerationContext {
    return {
        stressLevel: 30,
        stressTrend: 'STABLE',
        attentionScore: 70,
        cognitiveLoad: 40,
        gazeSemantics: null,
        recentFixations: [],
        currentMode: 'standard',
        activeTask: null,
        recentActions: [],
        currentLayout: null,
        visiblePanels: [],
        preferredComplexity: 'STANDARD',
        frequentActions: [],
        ...overrides,
    };
}

describe('AUIEngine', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default: no API keys available, forces rule-based generation
        mockApiKeyServiceGetKey.mockReturnValue(null);
    });

    // =========================================================================
    // DEFAULT LAYOUT
    // =========================================================================
    describe('getDefaultLayout', () => {
        it('should return a valid default layout', () => {
            const layout = auiEngine.getDefaultLayout();

            expect(layout.id).toBe('default-layout');
            expect(layout.theme).toBe('DEFAULT');
            expect(layout.animationLevel).toBe('FULL');
            expect(layout.regions).toHaveLength(1);
            expect(layout.regions[0].type).toBe('MAIN');
            expect(layout.confidence).toBe(1);
        });
    });

    // =========================================================================
    // RULE-BASED GENERATION
    // =========================================================================
    describe('Rule-based layout generation', () => {
        it('should generate layout with biometric panel for normal stress', async () => {
            const ctx = createTestContext({ stressLevel: 30 });
            const layout = await auiEngine.generateLayout(ctx);

            expect(layout.regions).toHaveLength(1);
            const main = layout.regions[0];
            const bio = main.components.find((c) => c.type === 'BiometricPanel');
            expect(bio).toBeDefined();
            expect(bio!.props.compact).toBe(false);
        });

        it('should simplify layout under high stress (>70)', async () => {
            await new Promise((r) => setTimeout(r, 1100));

            const ctx = createTestContext({ stressLevel: 85 });
            const layout = await auiEngine.generateLayout(ctx);

            expect(layout.animationLevel).toBe('REDUCED');
            expect(layout.theme).toBe('MINIMAL');
            expect(layout.biometricTrigger?.type).toBe('STRESS_HIGH');

            const bio = layout.regions[0].components.find((c) => c.type === 'BiometricPanel');
            expect(bio!.props.compact).toBe(true);

            expect(layout.hiddenPanels).toContain('metrics-chart');
        });

        it('should hide metrics under high cognitive load', async () => {
            await new Promise((r) => setTimeout(r, 1100));

            const ctx = createTestContext({ cognitiveLoad: 80, stressLevel: 30 });
            const layout = await auiEngine.generateLayout(ctx);

            expect(layout.hiddenPanels).toContain('metrics-chart');
            expect(layout.biometricTrigger?.type).toBe('COGNITIVE_OVERLOAD');
        });

        it('should use FOCUS theme when gaze is fixated', async () => {
            await new Promise((r) => setTimeout(r, 1100));

            const gazeSemantics: GazeSemanticContext = {
                primaryTarget: {
                    elementId: 'terminal-1',
                    elementType: 'TERMINAL',
                    semanticLabel: 'Terminal',
                    confidence: 0.9,
                    inferredIntent: 'DEBUGGING',
                    boundingBox: { x: 0, y: 0, width: 100, height: 100 },
                    contextualImportance: 80,
                },
                secondaryTargets: [],
                gazePattern: 'FIXATED',
                inferredTask: 'Debugging',
                attentionDistribution: new Map(),
                timestamp: Date.now(),
            };

            const ctx = createTestContext({ gazeSemantics, stressLevel: 30 });
            const layout = await auiEngine.generateLayout(ctx);

            expect(layout.theme).toBe('FOCUS');
            expect(layout.biometricTrigger?.type).toBe('FIXATION_LONG');
        });
    });

    // =========================================================================
    // EVENT SYSTEM
    // =========================================================================
    describe('Event system', () => {
        it('should emit REGENERATION_STARTED and REGENERATION_COMPLETE events', async () => {
            await new Promise((r) => setTimeout(r, 1100));

            const events: AUIEvent[] = [];
            const unsub1 = auiEngine.on('REGENERATION_STARTED', (e) => events.push(e));
            const unsub2 = auiEngine.on('REGENERATION_COMPLETE', (e) => events.push(e));

            const ctx = createTestContext();
            await auiEngine.generateLayout(ctx);

            expect(events.length).toBe(2);
            expect(events[0].type).toBe('REGENERATION_STARTED');
            expect(events[1].type).toBe('REGENERATION_COMPLETE');

            unsub1();
            unsub2();
        });

        it('should support unsubscribing from events', async () => {
            await new Promise((r) => setTimeout(r, 1100));

            const events: AUIEvent[] = [];
            const unsub = auiEngine.on('REGENERATION_STARTED', (e) => events.push(e));

            unsub();

            await auiEngine.generateLayout(createTestContext());

            const startedEvents = events.filter((e) => e.type === 'REGENERATION_STARTED');
            expect(startedEvents.length).toBe(0);
        });
    });

    // =========================================================================
    // LLM STATS
    // =========================================================================
    describe('LLM Stats', () => {
        it('should track LLM call count', () => {
            const stats = auiEngine.getLLMStats();
            expect(typeof stats.callCount).toBe('number');
            expect(stats.callCount).toBeGreaterThanOrEqual(0);
        });
    });

    // =========================================================================
    // CURRENT LAYOUT
    // =========================================================================
    describe('getCurrentLayout', () => {
        it('should return last generated layout', async () => {
            await new Promise((r) => setTimeout(r, 1100));

            const ctx = createTestContext();
            const generated = await auiEngine.generateLayout(ctx);
            const current = auiEngine.getCurrentLayout();

            expect(current).toBe(generated);
        });
    });
});
