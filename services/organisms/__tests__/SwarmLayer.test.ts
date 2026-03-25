/**
 * Tests for SwarmLayer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { OrganismTask } from '../../archon/types';

// Mock logger
vi.mock('../../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock swarm dependencies — inline values to avoid hoisting issues
vi.mock('../swarm/adaptiveMoE', () => ({
  adaptiveMoE: {
    routeAndExecute: vi.fn(async () => ({
      success: true,
      expertId: 'expert-1',
      dqScore: { score: 0.9, components: { validity: 0.9, specificity: 0.8, correctness: 0.9 }, isActionable: true, timestamp: Date.now() },
      output: { result: 'routed' },
    })),
    registerExpert: vi.fn(),
    getExpert: vi.fn(() => null),
  },
}));

vi.mock('../swarm/stigmergy', () => ({
  stigmergicEnvironment: {
    depositVote: vi.fn(),
    depositDQTrace: vi.fn(),
    depositPattern: vi.fn(),
  },
}));

vi.mock('../swarm/aceIntegration', () => ({
  aceIntegration: {
    connectToACE: vi.fn(),
    getSwarmPriors: vi.fn(() => []),
    enrichAuctionWithStigmergy: vi.fn(() => ({ enriched: true })),
  },
}));

// Mock OrganismLayer to prevent side effects from organismRegistry.register(swarmLayer)
vi.mock('../OrganismLayer', async () => {
  const actual = await vi.importActual<typeof import('../OrganismLayer')>('../OrganismLayer');
  return {
    ...actual,
    organismRegistry: {
      register: vi.fn(),
      get: vi.fn(),
      getAll: vi.fn(() => []),
      initializeAll: vi.fn(),
      shutdownAll: vi.fn(),
    },
  };
});

// Import after mocks
import { SwarmLayer } from '../SwarmLayer';
import { adaptiveMoE } from '../swarm/adaptiveMoE';
import { stigmergicEnvironment } from '../swarm/stigmergy';
import { aceIntegration } from '../swarm/aceIntegration';

describe('SwarmLayer', () => {
  let layer: SwarmLayer;

  beforeEach(() => {
    vi.clearAllMocks();
    layer = new SwarmLayer();
  });

  describe('constructor', () => {
    it('should set correct id and layerType', () => {
      expect(layer.id).toBe('swarm');
      expect(layer.layerType).toBe('swarm');
      expect(layer.name).toBe('Swarm Orchestration');
    });

    it('should have swarm-specific capabilities', () => {
      expect(layer.capabilities).toContain('expert-routing');
      expect(layer.capabilities).toContain('stigmergic-coordination');
      expect(layer.capabilities).toContain('consensus-voting');
      expect(layer.capabilities).toContain('load-balancing');
    });
  });

  describe('lifecycle', () => {
    it('should connect to ACE on initialize', async () => {
      await layer.initialize();
      expect(aceIntegration.connectToACE).toHaveBeenCalled();
    });

    it('should shutdown cleanly', async () => {
      await layer.initialize();
      await layer.shutdown();
      expect(layer.status).toBe('disabled');
    });
  });

  describe('dispatch — route', () => {
    it('should route a task via MoE and record stigmergic trace', async () => {
      const task: OrganismTask = {
        intent: 'route',
        contextPages: [],
      };

      const result = await layer.dispatch(task);

      expect(result.success).toBe(true);
      expect(adaptiveMoE.routeAndExecute).toHaveBeenCalledWith(task);
      expect(stigmergicEnvironment.depositDQTrace).toHaveBeenCalled();
    });

    it('should not deposit trace on route failure', async () => {
      (adaptiveMoE.routeAndExecute as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: false,
        expertId: 'expert-1',
        dqScore: { score: 0.3, components: { validity: 0.3, specificity: 0.3, correctness: 0.3 }, isActionable: false, timestamp: Date.now() },
        output: null,
      });

      const task: OrganismTask = {
        intent: 'route',
        contextPages: [],
      };

      const result = await layer.dispatch(task);

      expect(result.success).toBe(true); // createSuccessResult wraps it
      expect(stigmergicEnvironment.depositDQTrace).not.toHaveBeenCalled();
    });
  });

  describe('dispatch — signal_deposit', () => {
    it('should deposit a vote signal', async () => {
      const signal = { type: 'vote', agentId: 'a1', taskId: 't1', vote: 'approve', confidence: 0.9 };
      const task: OrganismTask = {
        intent: 'deposit',
        contextPages: [JSON.stringify(signal)],
      };

      const result = await layer.dispatch(task);

      expect(result.success).toBe(true);
      expect(stigmergicEnvironment.depositVote).toHaveBeenCalledWith('a1', 't1', 'approve', 0.9);
    });

    it('should deposit a dq_trace signal', async () => {
      const signal = { type: 'dq_trace', context: 'ctx-123', dqScore: 0.8, subsystem: 'genome' };
      const task: OrganismTask = {
        intent: 'signal_deposit',
        contextPages: [JSON.stringify(signal)],
      };

      const result = await layer.dispatch(task);

      expect(result.success).toBe(true);
      expect(stigmergicEnvironment.depositDQTrace).toHaveBeenCalledWith('ctx-123', 0.8, 'genome', undefined);
    });

    it('should deposit a pattern signal', async () => {
      const signal = {
        type: 'pattern',
        patternId: 'pat-1',
        context: { intentKeywords: ['test'], complexity: 'low' },
        outcome: { success: true, dqScore: 0.9, routedTo: 'expert-1' },
      };
      const task: OrganismTask = {
        intent: 'deposit',
        contextPages: [JSON.stringify(signal)],
      };

      const result = await layer.dispatch(task);

      expect(result.success).toBe(true);
      expect(stigmergicEnvironment.depositPattern).toHaveBeenCalled();
    });

    it('should return error for unknown signal type', async () => {
      const signal = { type: 'unknown_type' };
      const task: OrganismTask = {
        intent: 'deposit',
        contextPages: [JSON.stringify(signal)],
      };

      const result = await layer.dispatch(task);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown signal type');
    });

    it('should return error if no signal data provided', async () => {
      const task: OrganismTask = {
        intent: 'deposit',
        contextPages: [],
      };

      const result = await layer.dispatch(task);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No signal data provided');
    });
  });

  describe('dispatch — signal_query / query', () => {
    it('should query swarm priors', async () => {
      (aceIntegration.getSwarmPriors as ReturnType<typeof vi.fn>).mockReturnValue([{ id: 'p1', score: 0.8 }]);

      const task: OrganismTask = {
        intent: 'query',
        contextPages: [],
      };

      const result = await layer.dispatch(task);

      expect(result.success).toBe(true);
      expect(aceIntegration.getSwarmPriors).toHaveBeenCalledWith(task);
    });
  });

  describe('dispatch — register_expert / register', () => {
    it('should register an expert with MoE', async () => {
      const expert = {
        id: 'expert-test',
        specialization: ['analysis'],
        capacity: 10,
      };
      const task: OrganismTask = {
        intent: 'register',
        contextPages: [JSON.stringify(expert)],
      };

      const result = await layer.dispatch(task);

      expect(result.success).toBe(true);
      expect(adaptiveMoE.registerExpert).toHaveBeenCalled();
      const call = (adaptiveMoE.registerExpert as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[0]).toBe('expert-test');
      expect(call[1].specialization).toEqual(['analysis']);
    });

    it('should return error if no expert data', async () => {
      const task: OrganismTask = {
        intent: 'register',
        contextPages: [],
      };

      const result = await layer.dispatch(task);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No expert specification provided');
    });
  });

  describe('dispatch — list_experts', () => {
    it('should list registered experts', async () => {
      const task: OrganismTask = {
        intent: 'list_experts',
        contextPages: [],
      };

      const result = await layer.dispatch(task);

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
    });
  });

  describe('dispatch — enrich_auction', () => {
    it('should enrich auction config with stigmergy', async () => {
      const auctionConfig = { minBid: 0.5 };
      const task: OrganismTask = {
        intent: 'enrich_auction',
        contextPages: [JSON.stringify(auctionConfig)],
      };

      const result = await layer.dispatch(task);

      expect(result.success).toBe(true);
      expect(aceIntegration.enrichAuctionWithStigmergy).toHaveBeenCalledWith(task, auctionConfig);
    });
  });

  describe('dispatch — priors', () => {
    it('should get swarm priors', async () => {
      (aceIntegration.getSwarmPriors as ReturnType<typeof vi.fn>).mockReturnValue([{ id: 'prior1' }]);

      const task: OrganismTask = {
        intent: 'priors',
        contextPages: [],
      };

      const result = await layer.dispatch(task);

      expect(result.success).toBe(true);
    });
  });

  describe('dispatch — unknown operation', () => {
    it('should return error for unknown operation', async () => {
      const task: OrganismTask = {
        intent: 'unknown_op',
        contextPages: [],
      };

      const result = await layer.dispatch(task);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown swarm operation');
    });
  });

  describe('getLayerMetrics()', () => {
    it('should return metrics with swarm-specific fields', () => {
      const metrics = layer.getLayerMetrics();
      expect(metrics.invocations).toBe(0);
      expect('teamsFormed' in metrics).toBe(true);
      expect('stigmergicSignals' in metrics).toBe(true);
      expect('convergenceRounds' in metrics).toBe(true);
    });
  });
});
