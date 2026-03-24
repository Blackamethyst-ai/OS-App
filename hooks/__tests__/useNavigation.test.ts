// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockUseAppStore = vi.hoisted(() => vi.fn());
const mockGetNavConfig = vi.hoisted(() => vi.fn());
const mockPersistNavOrder = vi.hoisted(() => vi.fn());

vi.mock('../../store', () => ({
    useAppStore: mockUseAppStore,
}));

vi.mock('../../config/navigation', () => ({
    getNavConfig: mockGetNavConfig,
    persistNavOrder: mockPersistNavOrder,
}));

import { useNavigation } from '../useNavigation';

const makeNavItems = (ids: string[]) =>
    ids.map((id) => ({ id, label: id, path: `/${id.toLowerCase()}` }));

describe('useNavigation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default store: clearance 10, regular user
        mockUseAppStore.mockImplementation((selector: any) => {
            const state = {
                user: { clearanceLevel: 10, displayName: 'Admin' },
            };
            return selector(state);
        });
        mockGetNavConfig.mockReturnValue(makeNavItems(['A', 'B', 'C']));
    });

    it('should return nav items from getNavConfig', () => {
        const { result } = renderHook(() => useNavigation());
        expect(result.current.navItems).toHaveLength(3);
        expect(result.current.navItems[0].id).toBe('A');
    });

    it('should call getNavConfig with clearance level and demo mode false', () => {
        renderHook(() => useNavigation());
        expect(mockGetNavConfig).toHaveBeenCalledWith(10, false);
    });

    it('should detect demo mode when displayName is Demo Observer', () => {
        mockUseAppStore.mockImplementation((selector: any) => {
            const state = {
                user: { clearanceLevel: 5, displayName: 'Demo Observer' },
            };
            return selector(state);
        });
        renderHook(() => useNavigation());
        expect(mockGetNavConfig).toHaveBeenCalledWith(5, true);
    });

    it('should initialize draggedIndex as null', () => {
        const { result } = renderHook(() => useNavigation());
        expect(result.current.draggedIndex).toBeNull();
    });

    it('should update nav items when clearance level changes', () => {
        let clearance = 5;
        mockUseAppStore.mockImplementation((selector: any) => {
            const state = {
                user: { clearanceLevel: clearance, displayName: 'User' },
            };
            return selector(state);
        });
        mockGetNavConfig.mockReturnValue(makeNavItems(['A']));

        const { result, rerender } = renderHook(() => useNavigation());
        expect(result.current.navItems).toHaveLength(1);

        clearance = 10;
        mockGetNavConfig.mockReturnValue(makeNavItems(['A', 'B', 'C']));
        rerender();

        expect(result.current.navItems).toHaveLength(3);
    });

    it('should handle onDragStart by setting draggedIndex and dataTransfer', () => {
        const { result } = renderHook(() => useNavigation());

        const mockEvent = {
            dataTransfer: {
                effectAllowed: '',
                setData: vi.fn(),
            },
            currentTarget: document.createElement('div'),
        } as any;

        act(() => {
            result.current.onDragStart(mockEvent, 1);
        });

        expect(result.current.draggedIndex).toBe(1);
        expect(mockEvent.dataTransfer.effectAllowed).toBe('move');
        expect(mockEvent.dataTransfer.setData).toHaveBeenCalledWith('text/plain', '1');
        expect(mockEvent.currentTarget.style.opacity).toBe('0.5');
    });

    it('should handle onDragOver by preventing default and setting dropEffect', () => {
        const { result } = renderHook(() => useNavigation());

        const mockEvent = {
            preventDefault: vi.fn(),
            dataTransfer: { dropEffect: '' },
        } as any;

        act(() => {
            result.current.onDragOver(mockEvent);
        });

        expect(mockEvent.preventDefault).toHaveBeenCalled();
        expect(mockEvent.dataTransfer.dropEffect).toBe('move');
    });

    it('should handle onDrop by reordering items and persisting', () => {
        const { result } = renderHook(() => useNavigation());

        // First start a drag from index 0
        act(() => {
            result.current.onDragStart(
                {
                    dataTransfer: { effectAllowed: '', setData: vi.fn() },
                    currentTarget: document.createElement('div'),
                } as any,
                0,
            );
        });

        // Then drop at index 2
        act(() => {
            result.current.onDrop(
                { preventDefault: vi.fn() } as any,
                2,
            );
        });

        // A was at 0, moved to 2: order becomes B, C, A
        expect(result.current.navItems[0].id).toBe('B');
        expect(result.current.navItems[1].id).toBe('C');
        expect(result.current.navItems[2].id).toBe('A');
        expect(mockPersistNavOrder).toHaveBeenCalledWith(['B', 'C', 'A']);
    });

    it('should not reorder when dropping on same index', () => {
        const { result } = renderHook(() => useNavigation());

        act(() => {
            result.current.onDragStart(
                {
                    dataTransfer: { effectAllowed: '', setData: vi.fn() },
                    currentTarget: document.createElement('div'),
                } as any,
                1,
            );
        });

        act(() => {
            result.current.onDrop(
                { preventDefault: vi.fn() } as any,
                1,
            );
        });

        // Order unchanged
        expect(result.current.navItems.map((i: any) => i.id)).toEqual(['A', 'B', 'C']);
        expect(mockPersistNavOrder).not.toHaveBeenCalled();
    });

    it('should reset draggedIndex on onDragEnd', () => {
        const { result } = renderHook(() => useNavigation());

        act(() => {
            result.current.onDragStart(
                {
                    dataTransfer: { effectAllowed: '', setData: vi.fn() },
                    currentTarget: document.createElement('div'),
                } as any,
                2,
            );
        });

        expect(result.current.draggedIndex).toBe(2);

        act(() => {
            result.current.onDragEnd();
        });

        expect(result.current.draggedIndex).toBeNull();
    });
});
