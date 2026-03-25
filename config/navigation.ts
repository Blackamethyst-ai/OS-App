import { AppMode } from '../types/domain/core';
import { logger } from '../services/logger';

export interface NavItem {
    id: AppMode;
    label: string;
    path: string;
    fixedLayout?: boolean;
    requiredClearance?: number; // Minimum clearance level to see this tab (1-10)
    demoVisible?: boolean; // Show in demo/observer mode (curated showcase tabs only)
}

// Default navigation configuration
// requiredClearance: tabs with higher clearance require elevated user access (1-10 scale)
export const DEFAULT_NAV_CONFIG: NavItem[] = [
    { id: AppMode.METAVENTIONS_HUB, label: 'ECOSYSTEM', path: '/metaventions-hub', fixedLayout: true },
    { id: AppMode.ARCHON, label: 'ARCHON', path: '/archon', requiredClearance: 7, demoVisible: true },
    { id: AppMode.BIBLIOMORPHIC, label: 'RESEARCH', path: '/bibliomorphic', demoVisible: true },
    { id: AppMode.META_LEARNING, label: 'PREDICTIONS', path: '/predictions', fixedLayout: true, demoVisible: true },
    { id: AppMode.PROCESS_MAP, label: 'TOPOLOGY', path: '/process', fixedLayout: true, demoVisible: true },
    { id: AppMode.AUTONOMOUS_FINANCE, label: 'TREASURY', path: '/finance', fixedLayout: true, requiredClearance: 3 },
    { id: AppMode.CODE_STUDIO, label: 'LOGIC', path: '/code', fixedLayout: true },
    { id: AppMode.AGENT_CONTROL, label: 'SWARM', path: '/agents', fixedLayout: true, requiredClearance: 5, demoVisible: true },
    { id: AppMode.MEMORY_CORE, label: 'MEMORY', path: '/memory' },
    { id: AppMode.IMAGE_GEN, label: 'CINEMA', path: '/assets', fixedLayout: true, demoVisible: true },
    { id: AppMode.SOVEREIGN_GALLERY, label: 'VAULT', path: '/vault', fixedLayout: true },
    { id: AppMode.HARDWARE_ENGINEER, label: 'HARDWARE', path: '/hardware', fixedLayout: true, requiredClearance: 6 },
    { id: AppMode.VOICE_MODE, label: 'VOICE CORE', path: '/voice', fixedLayout: true, demoVisible: true },
    { id: AppMode.SYNTHESIS_BRIDGE, label: 'SYNTHESIS', path: '/bridge', fixedLayout: true, requiredClearance: 4, demoVisible: true },
    { id: AppMode.CPB_TEST, label: 'CPB', path: '/cpb-test', fixedLayout: true, demoVisible: true },
    { id: AppMode.NEXUS, label: 'NEXUS', path: '/nexus', requiredClearance: 8 },
];

// Storage key for persisted nav order
const NAV_ORDER_KEY = 'metaventions_nav_order';

// Get user's custom nav order from localStorage
export const getPersistedNavOrder = (): string[] | null => {
    try {
        const stored = localStorage.getItem(NAV_ORDER_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
};

// Save custom nav order to localStorage
export const persistNavOrder = (order: string[]): void => {
    try {
        localStorage.setItem(NAV_ORDER_KEY, JSON.stringify(order));
    } catch {
        logger.warn('Failed to persist nav order');
    }
};

// Reset nav order to default
export const resetNavOrder = (): void => {
    localStorage.removeItem(NAV_ORDER_KEY);
};

// Get navigation config filtered by clearance and ordered by user preference
export const getNavConfig = (clearanceLevel: number = 10, demoMode: boolean = false): NavItem[] => {
    const customOrder = getPersistedNavOrder();

    // Filter by clearance level, and by demoVisible in demo mode
    const filtered = DEFAULT_NAV_CONFIG.filter(item => {
        if (demoMode && !item.demoVisible) return false;
        return !item.requiredClearance || item.requiredClearance <= clearanceLevel;
    });

    // Apply custom ordering if exists
    if (customOrder) {
        const orderMap = new Map(customOrder.map((id, index) => [id, index]));
        return [...filtered].sort((a, b) => {
            const aIndex = orderMap.get(a.id as string) ?? Infinity;
            const bIndex = orderMap.get(b.id as string) ?? Infinity;
            return aIndex - bIndex;
        });
    }

    return filtered;
};

// Legacy export for backward compatibility
export const NAV_CONFIG = DEFAULT_NAV_CONFIG;

// Helper to check if current mode uses fixed layout
export const isFixedLayoutMode = (mode: AppMode): boolean => {
    const navItem = DEFAULT_NAV_CONFIG.find(item => item.id === mode);
    return navItem?.fixedLayout ?? false;
};

// Also include DASHBOARD which isn't in nav but uses fixed layout
const FIXED_LAYOUT_MODES = new Set([
    ...DEFAULT_NAV_CONFIG.filter(item => item.fixedLayout).map(item => item.id),
    AppMode.DASHBOARD
]);

export const hasFixedLayout = (mode: AppMode): boolean => {
    return FIXED_LAYOUT_MODES.has(mode);
};
