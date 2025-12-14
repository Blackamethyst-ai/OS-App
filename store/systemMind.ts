
import { create } from 'zustand';

interface SystemMindState {
  currentLocation: string; // e.g., "DASHBOARD", "ASSET_STUDIO"
  
  // The "Visual Cortex" - stores data from every active component on screen
  // Format: { "power-grid": { voltage: 240, status: "OK" }, "user-profile": { ... } }
  activeTelemetry: Record<string, any>; 

  // Actions
  setSector: (locationName: string) => void;
  uplinkData: (componentId: string, data: any) => void;
  severUplink: (componentId: string) => void;
  getSnapshot: () => any;
}

// The "Brain" of your OS
export const useSystemMind = create<SystemMindState>((set, get) => ({
  currentLocation: 'UNKNOWN_SECTOR',
  activeTelemetry: {},

  // Update where the user is physically looking (Navigation)
  setSector: (locationName) => {
    // console.debug(`[OS] Navigating to sector: ${locationName}`);
    set({ currentLocation: locationName });
  },

  // Components "Jack In" to the system here
  uplinkData: (componentId, data) => set((state) => ({
    activeTelemetry: {
      ...state.activeTelemetry,
      [componentId]: data
    }
  })),

  // Components "Jack Out" when unmounted
  severUplink: (componentId) => set((state) => {
    const newTelemetry = { ...state.activeTelemetry };
    delete newTelemetry[componentId];
    return { activeTelemetry: newTelemetry };
  }),

  // The "Eye": A function the LLM/Voice calls to "see" everything
  getSnapshot: () => {
    const state = get();
    return {
      location: state.currentLocation,
      visibleData: state.activeTelemetry,
      timestamp: new Date().toISOString()
    };
  }
}));
