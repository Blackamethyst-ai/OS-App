import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from '../store';
import { NavItem, getNavConfig, persistNavOrder } from '../config/navigation';

interface UseNavigationResult {
    navItems: NavItem[];
    onDragStart: (e: React.DragEvent, index: number) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent, dropIndex: number) => void;
    onDragEnd: () => void;
    draggedIndex: number | null;
}

export const useNavigation = (): UseNavigationResult => {
    const clearanceLevel = useAppStore(s => s.user.clearanceLevel);
    const displayName = useAppStore(s => s.user.displayName);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    // Demo mode: "Enter as Observer" or ?demo=true
    const isDemoMode = displayName === 'Demo Observer';

    // Get filtered and ordered nav items based on clearance and demo mode
    const baseNavItems = useMemo(() =>
        getNavConfig(clearanceLevel, isDemoMode),
        [clearanceLevel, isDemoMode]
    );

    const [navItems, setNavItems] = useState<NavItem[]>(baseNavItems);

    // Update when clearance or demo mode changes
    useEffect(() => {
        setNavItems(getNavConfig(clearanceLevel, isDemoMode));
    }, [clearanceLevel, isDemoMode]);

    const onDragStart = useCallback((e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index.toString());
        // Add visual feedback
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '0.5';
        }
    }, []);

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        const sourceIndex = draggedIndex;

        if (sourceIndex === null || sourceIndex === dropIndex) return;

        setNavItems(prev => {
            const newItems = [...prev];
            const [removed] = newItems.splice(sourceIndex, 1);
            newItems.splice(dropIndex, 0, removed);

            // Persist the new order
            const order = newItems.map(item => item.id as string);
            persistNavOrder(order);

            return newItems;
        });
    }, [draggedIndex]);

    const onDragEnd = useCallback(() => {
        setDraggedIndex(null);
    }, []);

    return {
        navItems,
        onDragStart,
        onDragOver,
        onDrop,
        onDragEnd,
        draggedIndex
    };
};
