
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
  velocity: 15,
  confidenceScore: 0.6,
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
      const recent = updatedMetrics.slice(-15);
      
      // Calculate weighted success (Modified is 0.7 success, Reject is -0.5)
      const successPoints = recent.reduce((acc, m) => {
          if (m.outcome === 'ACCEPTED') return acc + 1;
          if (m.outcome === 'MODIFIED') return acc + 0.7;
          if (m.outcome === 'REJECTED') return acc - 0.5;
          return acc;
      }, 0);
      
      const newConfidence = Math.max(0.1, Math.min(1.0, (successPoints / Math.max(1, recent.length)) + 0.4));

      let newVelocity = state.velocity;
      if (outcome === 'ACCEPTED') newVelocity = Math.min(state.velocity + 30, 100);
      if (outcome === 'REJECTED') newVelocity = Math.max(state.velocity - 40, 2);
      if (outcome === 'MODIFIED') newVelocity = Math.min(state.velocity + 15, 85);

      return {
        metrics: updatedMetrics,
        confidenceScore: newConfidence,
        velocity: newVelocity
      };
    });

    // Smooth Exponential Decay to Cruise Speed
    const decayInterval = setInterval(() => {
        const { velocity, confidenceScore } = get();
        const cruiseSpeed = confidenceScore * 35;
        
        if (Math.abs(velocity - cruiseSpeed) < 0.5) {
            clearInterval(decayInterval);
            return;
        }

        set({ velocity: velocity + (cruiseSpeed - velocity) * 0.08 });
    }, 50);
  },

  resetFlywheel: () => set({ metrics: [], confidenceScore: 0.6, velocity: 15 }),
}));
