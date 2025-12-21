
import { create } from 'zustand';

export type ActionOutcome = 'ACCEPTED' | 'REJECTED' | 'MODIFIED' | 'IGNORED';
export type KnowledgeContext = 'BUILDER PROTOCOL' | 'CRYPTO CONTEXT' | 'FUTURISM' | 'SYSTEM';

interface FlywheelMetric {
  id: string;
  context: KnowledgeContext;
  action: string;
  outcome: ActionOutcome;
  timestamp: number;
}

interface FlywheelState {
  velocity: number;
  confidenceScore: number;
  metrics: FlywheelMetric[];
  recordAction: (context: KnowledgeContext, action: string, outcome: ActionOutcome) => void;
  resetFlywheel: () => void;
}

export const useFlywheelStore = create<FlywheelState>((set, get) => ({
  velocity: 10,
  confidenceScore: 0.5,
  metrics: [],

  recordAction: (context, action, outcome) => {
    const newMetric: FlywheelMetric = {
      id: crypto.randomUUID(),
      context,
      action,
      outcome,
      timestamp: Date.now(),
    };

    set((state) => {
      const updatedMetrics = [...state.metrics, newMetric];
      const recent = updatedMetrics.slice(-10);
      const successful = recent.filter(m => 
        m.outcome === 'ACCEPTED' || m.outcome === 'MODIFIED'
      ).length;
      
      const newConfidence = Math.min((successful / Math.max(1, recent.length)) + 0.1, 1.0);

      let newVelocity = state.velocity;
      if (outcome === 'ACCEPTED') newVelocity = Math.min(state.velocity + 15, 100);
      if (outcome === 'REJECTED') newVelocity = Math.max(state.velocity - 20, 5);

      return {
        metrics: updatedMetrics,
        confidenceScore: newConfidence,
        velocity: newVelocity
      };
    });

    // Decay velocity back to cruise speed
    setTimeout(() => {
        const { confidenceScore } = get();
        set({ velocity: Math.max(confidenceScore * 40, 5) });
    }, 2000);
  },

  resetFlywheel: () => set({ metrics: [], confidenceScore: 0.5, velocity: 10 }),
}));
