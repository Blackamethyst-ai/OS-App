
import { create } from 'zustand';

export interface NavigationNode {
    id: string;
    label: string;
    description?: string;
}

export interface MindNotification {
  id: string;
  type: 'ERROR' | 'SUCCESS' | 'INFO' | 'WARNING';
  title: string;
  message: string;
  timestamp: number;
}

// =============================================================================
// SYNCHRONIZED CLOCK - The "Epigenetic Age" of the Voice System
// =============================================================================

/**
 * ActionDef with sector awareness for synchronized context
 *
 * Like biological cells that express different genes based on tissue type,
 * actions are tagged with the sectors where they're most relevant.
 * The epoch counter ensures all parts of the voice system "age" together.
 */
interface ActionDef {
    description: string;
    callback: (args: any) => void | Promise<void>;
    sectors?: string[];  // Which sectors this action is relevant to (empty = global)
    priority?: number;   // 0-100, higher = more prominent in context
}

export type EpochChangeReason = 'action_registered' | 'action_unregistered' | 'sector_changed' | 'bulk_update' | 'telemetry_update';

export interface EpochEvent {
    epoch: number;
    reason: EpochChangeReason;
    timestamp: number;
    details?: string;
}

type EpochListener = (event: EpochEvent) => void;

interface SystemState {
  voiceActive: boolean;
  currentLocation: string;

  // ==========================================================================
  // SYNCHRONIZED CLOCK STATE - The Master Timing Signal
  // ==========================================================================

  /**
   * Monotonically increasing epoch counter.
   * Like telomere length or epigenetic methylation marks,
   * this tracks the "age" of the system's action context.
   * All voice components key off this single value.
   */
  epoch: number;
  lastEpochChange: number;  // Timestamp of last epoch increment
  lastEpochReason: EpochChangeReason | null;

  // GLOBAL MAP (The "Known World")
  navigationMap: NavigationNode[];

  // SENSORY INPUT (The "Visual Cortex")
  activeTelemetry: Record<string, any>;

  // MOTOR CORTEX (Available Actions)
  actionRegistry: Record<string, ActionDef>;

  notifications: MindNotification[];

  // Actions
  toggleVoice: () => void;
  setSector: (location: string) => void;
  registerNavigation: (nodes: NavigationNode[]) => void;

  uplinkData: (id: string, data: any) => void;
  severUplink: (id: string) => void;

  // Enhanced action registration with sector awareness
  registerAction: (id: string, description: string, callback: (args: any) => void, options?: { sectors?: string[]; priority?: number }) => void;
  registerActions: (actions: Array<{ id: string; description: string; callback: (args: any) => void; sectors?: string[]; priority?: number }>) => void;
  unregisterAction: (id: string) => void;
  executeAction: (id: string, args?: any) => Promise<any>;

  // Synchronized clock methods
  getActionsForSector: (sector?: string) => Array<{ id: string; description: string; priority: number }>;
  getEpoch: () => number;
  hasEpochChanged: (sinceEpoch: number) => boolean;
  subscribeToEpoch: (listener: EpochListener) => () => void;

  getSnapshot: () => any;
  getContextDigest: () => string;  // Quick hash of current context for staleness check

  // Notification System
  pushNotification: (type: MindNotification['type'], title: string, message: string) => void;
  dismissNotification: (id: string) => void;
}

// Epoch listeners stored outside Zustand to avoid serialization issues
const epochListeners = new Set<EpochListener>();

/**
 * Increment epoch and notify all listeners.
 * This is the "heartbeat" that synchronizes all voice components.
 */
const incrementEpoch = (set: any, get: any, reason: EpochChangeReason, details?: string) => {
    const newEpoch = get().epoch + 1;
    const timestamp = Date.now();

    set({
        epoch: newEpoch,
        lastEpochChange: timestamp,
        lastEpochReason: reason
    });

    // Notify all epoch subscribers (like cells receiving a systemic signal)
    const event: EpochEvent = { epoch: newEpoch, reason, timestamp, details };
    epochListeners.forEach(listener => {
        try {
            listener(event);
        } catch (e) {
            console.error('[SystemMind] Epoch listener error:', e);
        }
    });

    if (import.meta.env.DEV) {
        console.log(`[SystemMind] Epoch ${newEpoch}: ${reason}${details ? ` (${details})` : ''}`);
    }
};

export const useSystemMind = create<SystemState>((set, get) => ({
  voiceActive: false,
  currentLocation: 'UNKNOWN_SECTOR',

  // Synchronized Clock State
  epoch: 0,
  lastEpochChange: Date.now(),
  lastEpochReason: null,

  navigationMap: [],
  activeTelemetry: {},
  actionRegistry: {},
  notifications: [],

  toggleVoice: () => set((state) => ({ voiceActive: !state.voiceActive })),

  setSector: (location) => {
    const prevLocation = get().currentLocation;
    if (prevLocation !== location) {
      set({ currentLocation: location });
      incrementEpoch(set, get, 'sector_changed', `${prevLocation} → ${location}`);
    }
  },

  registerNavigation: (nodes) => {
      set({ navigationMap: nodes });
  },

  uplinkData: (id, data) => {
    set((state) => ({
      activeTelemetry: { ...state.activeTelemetry, [id]: data }
    }));
    // Increment epoch for significant telemetry updates
    // These represent major state changes that voice should know about
    const epochTriggers = ['ui_state', 'visible_elements', 'archon_event', 'tab_change', 'command_executed'];
    if (epochTriggers.includes(id)) {
      incrementEpoch(set, get, 'telemetry_update', id);
    }
  },

  severUplink: (id) => set((state) => {
    const newTelemetry = { ...state.activeTelemetry };
    delete newTelemetry[id];
    return { activeTelemetry: newTelemetry };
  }),

  // Enhanced action registration with sector tagging
  registerAction: (id, description, callback, options = {}) => {
    set((state) => ({
      actionRegistry: {
        ...state.actionRegistry,
        [id]: {
          description,
          callback,
          sectors: options.sectors || [],
          priority: options.priority ?? 50
        }
      }
    }));
    incrementEpoch(set, get, 'action_registered', id);
  },

  // Bulk register actions (more efficient, single epoch increment)
  registerActions: (actions) => {
    set((state) => {
      const newRegistry = { ...state.actionRegistry };
      for (const action of actions) {
        newRegistry[action.id] = {
          description: action.description,
          callback: action.callback,
          sectors: action.sectors || [],
          priority: action.priority ?? 50
        };
      }
      return { actionRegistry: newRegistry };
    });
    incrementEpoch(set, get, 'bulk_update', `${actions.length} actions`);
  },

  unregisterAction: (id) => {
    const existed = !!get().actionRegistry[id];
    set((state) => {
      const newRegistry = { ...state.actionRegistry };
      delete newRegistry[id];
      return { actionRegistry: newRegistry };
    });
    if (existed) {
      incrementEpoch(set, get, 'action_unregistered', id);
    }
  },

  executeAction: async (id, args) => {
      const action = get().actionRegistry[id];
      if (action) {
          console.log(`[SystemMind] Executing Action: ${id}`, args);
          await action.callback(args);
          return { success: true, actionId: id };
      }
      throw new Error(`Action ${id} not found in registry.`);
  },

  // ==========================================================================
  // SYNCHRONIZED CLOCK METHODS
  // ==========================================================================

  /**
   * Get actions filtered and sorted by relevance to current sector.
   * Like how different tissues express different genes from the same genome.
   */
  getActionsForSector: (sector?: string) => {
    const state = get();
    const targetSector = (sector || state.currentLocation || '').toUpperCase();

    const actions = Object.entries(state.actionRegistry).map(([id, def]) => {
      const actionDef = def as ActionDef;
      let relevanceScore = actionDef.priority ?? 50;

      // Boost relevance if action is tagged for this sector
      if (actionDef.sectors && actionDef.sectors.length > 0) {
        const sectorMatch = actionDef.sectors.some(s =>
          s.toUpperCase() === targetSector ||
          targetSector.includes(s.toUpperCase()) ||
          s.toUpperCase().includes(targetSector)
        );
        if (sectorMatch) {
          relevanceScore += 30; // Significant boost for sector-relevant actions
        } else {
          relevanceScore -= 20; // Reduce priority for non-relevant sectored actions
        }
      }
      // Global actions (no sectors) get slight boost
      else {
        relevanceScore += 5;
      }

      return {
        id,
        description: actionDef.description,
        priority: Math.max(0, Math.min(100, relevanceScore))
      };
    });

    // Sort by priority descending
    return actions.sort((a, b) => b.priority - a.priority);
  },

  getEpoch: () => get().epoch,

  hasEpochChanged: (sinceEpoch: number) => get().epoch > sinceEpoch,

  /**
   * Subscribe to epoch changes.
   * This is how voice components stay synchronized - they all react to the same clock.
   */
  subscribeToEpoch: (listener: EpochListener) => {
    epochListeners.add(listener);
    return () => {
      epochListeners.delete(listener);
    };
  },

  getSnapshot: () => {
    const state = get();
    // Get sector-relevant actions instead of all actions
    const relevantActions = get().getActionsForSector();

    return {
      epoch: state.epoch,
      current_location: state.currentLocation,
      available_navigation_targets: state.navigationMap.map(n => n.id),
      visible_data_context: state.activeTelemetry,
      available_actions: relevantActions,
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Quick digest for staleness checks.
   * Voice session can compare this to detect if context changed.
   */
  getContextDigest: () => {
    const state = get();
    return `e${state.epoch}:${state.currentLocation}:${Object.keys(state.actionRegistry).length}`;
  },

  pushNotification: (type, title, message) => set((state) => {
    const id = crypto.randomUUID();
    const newQueue = [...state.notifications, { id, type, title, message, timestamp: Date.now() }];
    if (newQueue.length > 5) newQueue.shift();
    return { notifications: newQueue };
  }),

  dismissNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id)
  }))
}));
