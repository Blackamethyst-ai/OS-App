
import { create } from 'zustand';

interface TelemetryData {
  [key: string]: any;
}

export interface MindNotification {
  id: string;
  type: 'ERROR' | 'SUCCESS' | 'INFO' | 'WARNING';
  title: string;
  message: string;
  timestamp: number;
}

interface SystemState {
  voiceActive: boolean;
  currentLocation: string;
  activeTelemetry: TelemetryData;
  notifications: MindNotification[];
  
  // Actions
  toggleVoice: () => void;
  setSector: (location: string) => void;
  uplinkData: (id: string, data: any) => void;
  severUplink: (id: string) => void;
  getSnapshot: () => any;
  
  // Notification System
  pushNotification: (type: MindNotification['type'], title: string, message: string) => void;
  dismissNotification: (id: string) => void;
}

const useSystemMind = create<SystemState>((set, get) => ({
  voiceActive: false,
  currentLocation: 'UNKNOWN_SECTOR',
  activeTelemetry: {},
  notifications: [],

  toggleVoice: () => set((state) => ({ voiceActive: !state.voiceActive })),

  setSector: (location) => {
    set({ currentLocation: location });
  },

  uplinkData: (id, data) => set((state) => ({
    activeTelemetry: { ...state.activeTelemetry, [id]: data }
  })),

  severUplink: (id) => set((state) => {
    const newTelemetry = { ...state.activeTelemetry };
    delete newTelemetry[id];
    return { activeTelemetry: newTelemetry };
  }),

  getSnapshot: () => {
    const state = get();
    return {
      sector: state.currentLocation,
      data: state.activeTelemetry,
      timestamp: Date.now()
    };
  },

  pushNotification: (type, title, message) => set((state) => {
    const id = crypto.randomUUID();
    // Auto-dismiss logic is handled in the UI component, 
    // but we limit queue size here to prevent memory leaks
    const newQueue = [...state.notifications, { id, type, title, message, timestamp: Date.now() }];
    if (newQueue.length > 5) newQueue.shift(); 
    return { notifications: newQueue };
  }),

  dismissNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id)
  }))
}));

export default useSystemMind;
