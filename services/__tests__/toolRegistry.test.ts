import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockAddLog = vi.fn();
const mockSetProcessState = vi.fn();
const mockSetVoiceState = vi.fn();
const mockSetFocusedSelector = vi.fn();
const mockUpdateTask = vi.fn();
const mockSetMode = vi.fn();
const mockAddSwarmProposal = vi.fn();

const mockGenerateStructuredWorkflow = vi.fn();
const mockSearchGroundedIntel = vi.fn();
const mockConvergeStrategicLattices = vi.fn();

vi.mock('../../store', () => ({
  useAppStore: {
    getState: () => ({
      actions: {
        addLog: mockAddLog,
        setProcessState: mockSetProcessState,
        setVoiceState: mockSetVoiceState,
        setFocusedSelector: mockSetFocusedSelector,
        updateTask: mockUpdateTask,
        setMode: mockSetMode,
        addSwarmProposal: mockAddSwarmProposal,
      },
      process: {
        nodes: [
          { id: '1', data: { label: 'node1' } },
          { id: '2', data: { label: 'node2' } },
          { id: '3', data: { label: 'node3' } },
        ],
      },
    }),
  },
}));

vi.mock('../geminiService', () => ({
  generateStructuredWorkflow: (...args: any[]) => mockGenerateStructuredWorkflow(...args),
  searchGroundedIntel: (...args: any[]) => mockSearchGroundedIntel(...args),
  convergeStrategicLattices: (...args: any[]) => mockConvergeStrategicLattices(...args),
}));

// Must import after mocks
import { OS_TOOLS } from '../toolRegistry';

describe('toolRegistry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('architect_generate_process', () => {
    it('should return SUCCESS with workflow data on success', async () => {
      mockGenerateStructuredWorkflow.mockResolvedValue({
        title: 'Test Workflow',
        internalPlanningMonologue: 'planning...',
        protocols: [],
        coherenceScore: 92,
        taxonomy: { root: ['a', 'b', 'c'] },
      });

      const result = await OS_TOOLS.architect_generate_process({
        description: 'Test description',
        type: 'SYSTEM_ARCHITECTURE',
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.toolName).toBe('architect_generate_process');
      expect(result.data.coherence).toBe(92);
      expect(result.data.sectors).toBe(3);
      expect(mockSetProcessState).toHaveBeenCalled();
      expect(mockAddLog).toHaveBeenCalled();
    });

    it('should return ERROR when generateStructuredWorkflow fails', async () => {
      mockGenerateStructuredWorkflow.mockRejectedValue(new Error('API failed'));

      const result = await OS_TOOLS.architect_generate_process({
        description: 'Test',
        type: 'DRIVE_ORGANIZATION',
      });

      expect(result.status).toBe('ERROR');
      expect(result.data.error).toBe('API failed');
    });
  });

  describe('adjust_agent_dna', () => {
    it('should update voice state and return SUCCESS', async () => {
      const result = await OS_TOOLS.adjust_agent_dna({
        agentId: 'agent-1',
        weights: { skepticism: 0.8 } as any,
        reasoning: 'Testing',
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.toolName).toBe('adjust_agent_dna');
      expect(result.data.agentId).toBe('agent-1');
      expect(result.data.status).toBe('SYNAPTIC_BOND_STABLE');
      expect(mockSetVoiceState).toHaveBeenCalled();
      expect(mockAddLog).toHaveBeenCalledWith('SUCCESS', expect.stringContaining('agent-1'));
    });
  });

  describe('converge_strategic_lattices', () => {
    it('should return SUCCESS with convergence data', async () => {
      mockConvergeStrategicLattices.mockResolvedValue({
        nodes: [{ id: 'n1', label: 'Node 1' }, { id: 'n2', label: 'Node 2' }],
        coherence_index: 0.87,
        unified_goal: 'Unified vision',
      });

      const result = await OS_TOOLS.converge_strategic_lattices({
        targetGoal: 'Build a system',
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.data.coherence).toBe(0.87);
      expect(result.data.goal).toBe('Unified vision');
      expect(mockSetProcessState).toHaveBeenCalled();
    });

    it('should return ERROR on failure', async () => {
      mockConvergeStrategicLattices.mockRejectedValue(new Error('Convergence failed'));

      const result = await OS_TOOLS.converge_strategic_lattices({
        targetGoal: 'Test',
      });

      expect(result.status).toBe('ERROR');
      expect(result.data.error).toBe('Convergence failed');
    });
  });

  describe('focus_element', () => {
    it('should set focused selector and return SUCCESS', async () => {
      const result = await OS_TOOLS.focus_element({ selector: '#my-element' });

      expect(result.status).toBe('SUCCESS');
      expect(result.toolName).toBe('focus_element');
      expect(result.uiHint).toBe('NAV');
      expect(mockSetFocusedSelector).toHaveBeenCalledWith('#my-element');
    });
  });

  describe('update_task_priority', () => {
    it('should update task and return SUCCESS', async () => {
      const result = await OS_TOOLS.update_task_priority({
        taskId: 'task-1',
        priority: 'HIGH' as any,
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.toolName).toBe('update_task_priority');
      expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { priority: 'HIGH' });
    });
  });

  describe('system_navigate', () => {
    it('should return ERROR for an unknown target', async () => {
      const result = await OS_TOOLS.system_navigate({ target: 'nonexistent_sector' });

      expect(result.status).toBe('ERROR');
      expect(result.data.error).toContain('not found');
    });

    it('should navigate to valid mode and return SUCCESS', async () => {
      const result = await OS_TOOLS.system_navigate({ target: 'DASHBOARD' });

      expect(result.status).toBe('SUCCESS');
      expect(result.uiHint).toBe('NAV');
      expect(mockSetMode).toHaveBeenCalled();
    });
  });

  describe('search_intel', () => {
    it('should return SUCCESS with search results', async () => {
      mockSearchGroundedIntel.mockResolvedValue('Found intelligence data');

      const result = await OS_TOOLS.search_intel({ query: 'AI trends' });

      expect(result.status).toBe('SUCCESS');
      expect(result.data.message).toBe('Found intelligence data');
    });

    it('should return ERROR on failure', async () => {
      mockSearchGroundedIntel.mockRejectedValue(new Error('Search failed'));

      const result = await OS_TOOLS.search_intel({ query: 'test' });

      expect(result.status).toBe('ERROR');
      expect(result.data.error).toBe('Search failed');
    });
  });

  describe('propose_structural_change', () => {
    it('should create a proposal and return SUCCESS', async () => {
      const result = await OS_TOOLS.propose_structural_change({
        agentId: 'agent-1',
        agentName: 'Dr. Ira',
        type: 'OPTIMIZATION',
        title: 'Optimize routing',
        description: 'Improve routing efficiency',
        impact: 'High',
        manifest_summary: 'Routing logic refactor',
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.data.proposalId).toMatch(/^prop-/);
      expect(result.data.status).toBe('STAGED_FOR_REVIEW');
      expect(mockAddSwarmProposal).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'agent-1',
          agentName: 'Dr. Ira',
          type: 'OPTIMIZATION',
          title: 'Optimize routing',
        })
      );
    });
  });
});
