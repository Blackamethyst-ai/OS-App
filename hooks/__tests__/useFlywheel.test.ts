// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const mockRecordAction = vi.hoisted(() => vi.fn());

vi.mock('../../store/flywheelStore', () => ({
    useFlywheelStore: (selector: any) => selector({ recordAction: mockRecordAction }),
    KnowledgeContext: {},
    ActionOutcome: {},
}));

import { useFlywheel } from '../useFlywheel';

describe('useFlywheel', () => {
    beforeEach(() => {
        mockRecordAction.mockReset();
    });

    it('should return a track function', () => {
        const { result } = renderHook(() => useFlywheel('BUILDER PROTOCOL'));
        expect(result.current.track).toBeTypeOf('function');
    });

    it('should record ACCEPTED outcome on success()', () => {
        const { result } = renderHook(() => useFlywheel('BUILDER PROTOCOL'));
        result.current.track('test-action').success();
        expect(mockRecordAction).toHaveBeenCalledWith('BUILDER PROTOCOL', 'test-action', 'ACCEPTED');
    });

    it('should record REJECTED outcome on fail()', () => {
        const { result } = renderHook(() => useFlywheel('CRYPTO CONTEXT'));
        result.current.track('test-action').fail();
        expect(mockRecordAction).toHaveBeenCalledWith('CRYPTO CONTEXT', 'test-action', 'REJECTED');
    });

    it('should record MODIFIED outcome on modify()', () => {
        const { result } = renderHook(() => useFlywheel('FUTURISM'));
        result.current.track('test-action').modify();
        expect(mockRecordAction).toHaveBeenCalledWith('FUTURISM', 'test-action', 'MODIFIED');
    });

    it('should record IGNORED outcome on ignore()', () => {
        const { result } = renderHook(() => useFlywheel('SYSTEM'));
        result.current.track('test-action').ignore();
        expect(mockRecordAction).toHaveBeenCalledWith('SYSTEM', 'test-action', 'IGNORED');
    });
});
