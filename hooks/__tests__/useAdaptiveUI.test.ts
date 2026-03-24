// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ============================================================================
// MOCKS
// ============================================================================

const mockAddLog = vi.hoisted(() => vi.fn());
const mockSetAUIEnabled = vi.hoisted(() => vi.fn());
const mockTriggerUIRegeneration = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockKernelOn = vi.hoisted(() => vi.fn().mockReturnValue(() => {}));
const mockSetLayout = vi.hoisted(() => vi.fn());
const mockBuildSemanticContext = vi.hoisted(() => vi.fn().mockResolvedValue(null));

vi.mock('../../store', () => ({
    useAppStore: () => ({
        actions: {
            addLog: mockAddLog,
        },
    }),
}));

vi.mock('../../services/kernel', () => ({
    agentKernel: {
        on: mockKernelOn,
        setAUIEnabled: mockSetAUIEnabled,
        triggerUIRegeneration: mockTriggerUIRegeneration,
    },
}));

vi.mock('../../services/ui', () => ({
    auiEngine: {},
    judgeAgent: {},
    semanticGaze: {
        buildSemanticContext: mockBuildSemanticContext,
    },
    domRegenerator: {
        setLayout: mockSetLayout,
    },
}));

import { useAdaptiveUI } from '../useAdaptiveUI';

// ============================================================================
// HELPERS
// ============================================================================

function makeLayout(overrides: Record<string, any> = {}) {
    return {
        id: 'layout-1',
        version: 1,
        timestamp: Date.now(),
        regions: [
            {
                id: 'main',
                type: 'MAIN' as const,
                position: { x: 0, y: 0, width: '100%', height: '100%' },
                components: [
                    {
                        id: 'comp-1',
                        type: 'Terminal',
                        props: {},
                        visible: true,
                        priority: 10,
                        contextualRelevance: 80,
                        transitionStyle: 'FADE' as const,
                    },
                    {
                        id: 'comp-2',
                        type: 'Dashboard',
                        props: {},
                        visible: false,
                        priority: 5,
                        contextualRelevance: 40,
                        transitionStyle: 'SLIDE' as const,
                    },
                ],
                priority: 1,
                collapsible: false,
                collapsed: false,
            },
        ],
        visiblePanels: ['main'],
        hiddenPanels: [],
        focusPriority: ['main'],
        theme: 'DEFAULT' as const,
        colorAccent: '#00ff00',
        animationLevel: 'FULL' as const,
        generationReason: 'test',
        biometricTrigger: null,
        ...overrides,
    };
}

function makeEvaluation(overrides: Record<string, any> = {}) {
    return {
        layoutId: 'layout-1',
        score: 85,
        verdict: 'OPTIMAL' as const,
        taskAlignment: 90,
        cognitiveLoad: 80,
        gazeEfficiency: 85,
        stressResponse: 75,
        improvements: [],
        reasoning: 'Good layout',
        iterationSuggested: false,
        ...overrides,
    };
}

// ============================================================================
// TESTS
// ============================================================================

describe('useAdaptiveUI', () => {
    let kernelHandlers: Record<string, (event: any) => void>;

    beforeEach(() => {
        vi.clearAllMocks();
        kernelHandlers = {};

        mockKernelOn.mockImplementation((eventName: string, handler: (event: any) => void) => {
            kernelHandlers[eventName] = handler;
            return () => { delete kernelHandlers[eventName]; };
        });
    });

    describe('initial state', () => {
        it('returns correct default state', () => {
            const { result } = renderHook(() => useAdaptiveUI());

            expect(result.current.isEnabled).toBe(true);
            expect(result.current.isRegenerating).toBe(false);
            expect(result.current.lastRegenerationTime).toBeNull();
            expect(result.current.currentLayout).toBeNull();
            expect(result.current.layoutVersion).toBe(0);
            expect(result.current.lastEvaluation).toBeNull();
            expect(result.current.evaluationScore).toBe(0);
            expect(result.current.gazeSemantics).toBeNull();
            expect(result.current.regenerationLatency).toBe(0);
            expect(result.current.iterationCount).toBe(0);
        });
    });

    describe('enable/disable', () => {
        it('disable sets isEnabled to false and calls kernel', () => {
            const { result } = renderHook(() => useAdaptiveUI());

            act(() => {
                result.current.disable();
            });

            expect(result.current.isEnabled).toBe(false);
            expect(mockSetAUIEnabled).toHaveBeenCalledWith(false);
            expect(mockAddLog).toHaveBeenCalledWith('SYSTEM', 'AUI: Adaptive UI disabled');
        });

        it('enable sets isEnabled to true and calls kernel', () => {
            const { result } = renderHook(() => useAdaptiveUI());

            act(() => {
                result.current.disable();
            });

            act(() => {
                result.current.enable();
            });

            expect(result.current.isEnabled).toBe(true);
            expect(mockSetAUIEnabled).toHaveBeenCalledWith(true);
            expect(mockAddLog).toHaveBeenCalledWith('SYSTEM', 'AUI: Adaptive UI enabled');
        });
    });

    describe('kernel event handling', () => {
        it('sets isRegenerating on UI_REGENERATION_START', () => {
            const { result } = renderHook(() => useAdaptiveUI());

            act(() => {
                kernelHandlers['UI_REGENERATION_START']?.({});
            });

            expect(result.current.isRegenerating).toBe(true);
        });

        it('updates full state on UI_REGENERATION_COMPLETE', () => {
            const layout = makeLayout();
            const evaluation = makeEvaluation();

            const { result } = renderHook(() => useAdaptiveUI());

            act(() => {
                kernelHandlers['UI_REGENERATION_COMPLETE']?.({
                    payload: {
                        layout,
                        evaluation,
                        iterations: 3,
                        latencyMs: 150.5,
                    },
                });
            });

            expect(result.current.isRegenerating).toBe(false);
            expect(result.current.currentLayout).toEqual(layout);
            expect(result.current.layoutVersion).toBe(1);
            expect(result.current.lastEvaluation).toEqual(evaluation);
            expect(result.current.evaluationScore).toBe(85);
            expect(result.current.regenerationLatency).toBe(150.5);
            expect(result.current.iterationCount).toBe(3);
            expect(result.current.lastRegenerationTime).toBeGreaterThan(0);
        });

        it('updates evaluation on UI_EVALUATION event', () => {
            const evaluation = makeEvaluation({ score: 72, verdict: 'ACCEPTABLE' });

            const { result } = renderHook(() => useAdaptiveUI());

            act(() => {
                kernelHandlers['UI_EVALUATION']?.({
                    payload: { evaluation },
                });
            });

            expect(result.current.lastEvaluation).toEqual(evaluation);
            expect(result.current.evaluationScore).toBe(72);
        });
    });

    describe('triggerRegeneration', () => {
        it('calls kernel triggerUIRegeneration when enabled', async () => {
            const { result } = renderHook(() => useAdaptiveUI());

            await act(async () => {
                await result.current.triggerRegeneration('test reason');
            });

            expect(mockTriggerUIRegeneration).toHaveBeenCalledWith('test reason');
        });

        it('uses default reason when none provided', async () => {
            const { result } = renderHook(() => useAdaptiveUI());

            await act(async () => {
                await result.current.triggerRegeneration();
            });

            expect(mockTriggerUIRegeneration).toHaveBeenCalledWith('Manual trigger');
        });

        it('does not trigger when disabled', async () => {
            const { result } = renderHook(() => useAdaptiveUI());

            act(() => {
                result.current.disable();
            });

            await act(async () => {
                await result.current.triggerRegeneration('test');
            });

            expect(mockTriggerUIRegeneration).not.toHaveBeenCalled();
        });
    });

    describe('forceLayout', () => {
        it('sets layout directly and increments version', () => {
            const layout = makeLayout({ id: 'forced-layout' });
            const { result } = renderHook(() => useAdaptiveUI());

            act(() => {
                result.current.forceLayout(layout as any);
            });

            expect(mockSetLayout).toHaveBeenCalledWith(layout);
            expect(result.current.currentLayout).toEqual(layout);
            expect(result.current.layoutVersion).toBe(1);
        });
    });

    describe('query functions', () => {
        it('getLayoutForRegion returns matching region', () => {
            const layout = makeLayout();
            const { result } = renderHook(() => useAdaptiveUI());

            act(() => {
                result.current.forceLayout(layout as any);
            });

            const region = result.current.getLayoutForRegion('main');
            expect(region).toBeDefined();
            expect(region!.id).toBe('main');
        });

        it('getLayoutForRegion returns null for missing region', () => {
            const layout = makeLayout();
            const { result } = renderHook(() => useAdaptiveUI());

            act(() => {
                result.current.forceLayout(layout as any);
            });

            expect(result.current.getLayoutForRegion('nonexistent')).toBeNull();
        });

        it('getLayoutForRegion returns null when no layout set', () => {
            const { result } = renderHook(() => useAdaptiveUI());
            expect(result.current.getLayoutForRegion('main')).toBeNull();
        });

        it('shouldShowComponent returns visibility from layout', () => {
            const layout = makeLayout();
            const { result } = renderHook(() => useAdaptiveUI());

            act(() => {
                result.current.forceLayout(layout as any);
            });

            expect(result.current.shouldShowComponent('comp-1')).toBe(true);
            expect(result.current.shouldShowComponent('comp-2')).toBe(false);
        });

        it('shouldShowComponent returns true when no layout', () => {
            const { result } = renderHook(() => useAdaptiveUI());
            expect(result.current.shouldShowComponent('any')).toBe(true);
        });

        it('shouldShowComponent returns true for unknown component', () => {
            const layout = makeLayout();
            const { result } = renderHook(() => useAdaptiveUI());

            act(() => {
                result.current.forceLayout(layout as any);
            });

            expect(result.current.shouldShowComponent('unknown-comp')).toBe(true);
        });

        it('getComponentPriority returns priority from layout', () => {
            const layout = makeLayout();
            const { result } = renderHook(() => useAdaptiveUI());

            act(() => {
                result.current.forceLayout(layout as any);
            });

            expect(result.current.getComponentPriority('comp-1')).toBe(10);
            expect(result.current.getComponentPriority('comp-2')).toBe(5);
        });

        it('getComponentPriority returns 0 when no layout', () => {
            const { result } = renderHook(() => useAdaptiveUI());
            expect(result.current.getComponentPriority('any')).toBe(0);
        });
    });

    describe('event subscriptions', () => {
        it('onLayoutChange notifies callback on regeneration complete', () => {
            const layout = makeLayout();
            const evaluation = makeEvaluation();
            const callback = vi.fn();

            const { result } = renderHook(() => useAdaptiveUI());

            let unsub: () => void;
            act(() => {
                unsub = result.current.onLayoutChange(callback);
            });

            act(() => {
                kernelHandlers['UI_REGENERATION_COMPLETE']?.({
                    payload: { layout, evaluation, iterations: 1, latencyMs: 50 },
                });
            });

            expect(callback).toHaveBeenCalledWith(layout);

            // Unsubscribe and verify no more calls
            act(() => {
                unsub();
            });

            act(() => {
                kernelHandlers['UI_REGENERATION_COMPLETE']?.({
                    payload: { layout, evaluation, iterations: 2, latencyMs: 60 },
                });
            });

            expect(callback).toHaveBeenCalledTimes(1);
        });

        it('onEvaluation notifies callback on evaluation events', () => {
            const evaluation = makeEvaluation();
            const callback = vi.fn();

            const { result } = renderHook(() => useAdaptiveUI());

            act(() => {
                result.current.onEvaluation(callback);
            });

            act(() => {
                kernelHandlers['UI_EVALUATION']?.({
                    payload: { evaluation },
                });
            });

            expect(callback).toHaveBeenCalledWith(evaluation);
        });
    });

    describe('cleanup', () => {
        it('unsubscribes from kernel events on unmount', () => {
            const unsubFns = [vi.fn(), vi.fn(), vi.fn()];
            let callIndex = 0;
            mockKernelOn.mockImplementation((eventName: string, handler: (event: any) => void) => {
                kernelHandlers[eventName] = handler;
                const fn = unsubFns[callIndex++];
                return fn || (() => {});
            });

            const { unmount } = renderHook(() => useAdaptiveUI());

            unmount();

            expect(unsubFns[0]).toHaveBeenCalled();
            expect(unsubFns[1]).toHaveBeenCalled();
            expect(unsubFns[2]).toHaveBeenCalled();
        });
    });
});
