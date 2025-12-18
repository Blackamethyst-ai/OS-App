
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

interface ActionDef {
    description: string;
    callback: (args: any) => void | Promise<void>;
}

interface SystemState {
  voiceActive: boolean;
  currentLocation: string;
  
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
  
  registerAction: (id: string, description: string, callback: (args: any) => void) => void;
  unregisterAction: (id: string) => void;
  executeAction: (id: string, args?: any) => Promise<any>;

  getSnapshot: () => any;
  
  // Notification System
  pushNotification: (type: MindNotification['type'], title: string, message: string) => void;
  dismissNotification: (id: string) => void;
}

export const useSystemMind = create<SystemState>((set, get) => ({
  voiceActive: false,
  currentLocation: 'UNKNOWN_SECTOR',
  navigationMap: [],
  activeTelemetry: {},
  actionRegistry: {},
  notifications: [],

  toggleVoice: () => set((state) => ({ voiceActive: !state.voiceActive })),

  setSector: (location) => {
    set({ currentLocation: location });
  },

  registerNavigation: (nodes) => {
      set({ navigationMap: nodes });
  },

  uplinkData: (id, data) => set((state) => ({
    activeTelemetry: { ...state.activeTelemetry, [id]: data }
  })),

  severUplink: (id) => set((state) => {
    const newTelemetry = { ...state.activeTelemetry };
    delete newTelemetry[id];
    return { activeTelemetry: newTelemetry };
  }),

  registerAction: (id, description, callback) => set((state) => ({
      actionRegistry: { ...state.actionRegistry, [id]: { description, callback } }
  })),

  unregisterAction: (id) => set((state) => {
      const newRegistry = { ...state.actionRegistry };
      delete newRegistry[id];
      return { actionRegistry: newRegistry };
  }),

  executeAction: async (id, args) => {
      const action = get().actionRegistry[id];
      if (action) {
          console.log(`[SystemMind] Executing Action: ${id}`, args);
          await action.callback(args);
          return { success: true, actionId: id };
      }
      throw new Error(`Action ${id} not found in registry.`);
  },

  getSnapshot: () => {
    const state = get();
    // Transform action registry to a clean list for the AI
    const availableActions = Object.entries(state.actionRegistry).map(([id, def]) => ({
        id,
        description: (def as ActionDef).description
    }));

    return {
      current_location: state.currentLocation,
      available_navigation_targets: state.navigationMap.map(n => n.id),
      visible_data_context: state.activeTelemetry,
      available_actions: availableActions, // Dynamic capabilities
      timestamp: new Date().toISOString()
    };
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
