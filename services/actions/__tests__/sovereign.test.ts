import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SOVEREIGN_ACTIONS } from '../handlers/sovereign';

// Mock the store
vi.mock('../../../store', () => ({
    useAppStore: {
        getState: vi.fn(() => ({
            actions: {
                addLog: vi.fn(),
                setProcessState: vi.fn(),
                setVoiceState: vi.fn(),
                setFocusedSelector: vi.fn(),
                updateTask: vi.fn(),
                setMode: vi.fn(),
                addSwarmProposal: vi.fn(),
            },
            process: {
                nodes: []
            },
            voice: {
                mentalState: { skepticism: 50, excitement: 50, alignment: 50 }
            }
        }))
    }
}));

// Mock gemini service - create mock functions for access in tests
const mockGenerateStructuredWorkflow = vi.fn(async () => ({
    title: 'Test Workflow',
    coherenceScore: 85,
    protocols: [],
    taxonomy: { root: ['node1', 'node2'] }
}));
const mockSearchGroundedIntel = vi.fn(async () => 'Test search results');
const mockConvergeStrategicLattices = vi.fn(async () => ({
    nodes: [{ id: 'n1', label: 'Node 1' }],
    coherence_index: 0.9,
    unified_goal: 'Test goal'
}));

vi.mock('../../geminiService', () => ({
    generateStructuredWorkflow: (...args: unknown[]) => (mockGenerateStructuredWorkflow as any)(...args),
    searchGroundedIntel: (...args: unknown[]) => (mockSearchGroundedIntel as any)(...args),
    convergeStrategicLattices: (...args: unknown[]) => (mockConvergeStrategicLattices as any)(...args)
}));

describe('Sovereign Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Action Registration', () => {
        it('should export 8 sovereign actions', () => {
            expect(SOVEREIGN_ACTIONS).toHaveLength(8);
        });

        it('should have all required action IDs', () => {
            const ids = SOVEREIGN_ACTIONS.map(a => a.id);
            expect(ids).toContain('architect_generate_process');
            expect(ids).toContain('adjust_agent_dna');
            expect(ids).toContain('converge_strategic_lattices');
            expect(ids).toContain('focus_element');
            expect(ids).toContain('update_task_priority');
            expect(ids).toContain('system_navigate');
            expect(ids).toContain('search_intel');
            expect(ids).toContain('propose_structural_change');
        });

        it('should have valid complexity levels', () => {
            const validComplexities = ['simple', 'navigation', 'analysis', 'architecture', 'critical'];
            SOVEREIGN_ACTIONS.forEach(action => {
                expect(validComplexities).toContain(action.complexity);
            });
        });

        it('should have sovereign source', () => {
            SOVEREIGN_ACTIONS.forEach(action => {
                expect(action.source).toBe('sovereign');
            });
        });

        it('should have handlers that are functions', () => {
            SOVEREIGN_ACTIONS.forEach(action => {
                expect(typeof action.handler).toBe('function');
            });
        });
    });

    describe('adjust_agent_dna', () => {
        it('should return error when no weights provided', async () => {
            const action = SOVEREIGN_ACTIONS.find(a => a.id === 'adjust_agent_dna')!;
            const result = await action.handler({});
            expect(result.success).toBe(false);
            expect(result.error).toBe('No weights provided');
        });

        it('should succeed with valid weights', async () => {
            const action = SOVEREIGN_ACTIONS.find(a => a.id === 'adjust_agent_dna')!;
            const result = await action.handler({
                weights: { skepticism: 70 }
            });
            expect(result.success).toBe(true);
            expect(result.status).toBe('SYNAPTIC_BOND_STABLE');
        });
    });

    describe('focus_element', () => {
        it('should return error when no selector provided', async () => {
            const action = SOVEREIGN_ACTIONS.find(a => a.id === 'focus_element')!;
            const result = await action.handler({});
            expect(result.success).toBe(false);
            expect(result.error).toBe('No selector provided');
        });

        it('should succeed with valid selector', async () => {
            const action = SOVEREIGN_ACTIONS.find(a => a.id === 'focus_element')!;
            const result = await action.handler({ selector: '#main-panel' });
            expect(result.success).toBe(true);
        });
    });

    describe('update_task_priority', () => {
        it('should return error when taskId or priority missing', async () => {
            const action = SOVEREIGN_ACTIONS.find(a => a.id === 'update_task_priority')!;
            const result = await action.handler({ taskId: 'task-1' });
            expect(result.success).toBe(false);
        });

        it('should succeed with valid params', async () => {
            const action = SOVEREIGN_ACTIONS.find(a => a.id === 'update_task_priority')!;
            const result = await action.handler({ taskId: 'task-1', priority: 'HIGH' });
            expect(result.success).toBe(true);
        });
    });

    describe('system_navigate', () => {
        it('should return error when no target provided', async () => {
            const action = SOVEREIGN_ACTIONS.find(a => a.id === 'system_navigate')!;
            const result = await action.handler({});
            expect(result.success).toBe(false);
            expect(result.error).toBe('No target sector provided');
        });

        it('should return error for invalid sector', async () => {
            const action = SOVEREIGN_ACTIONS.find(a => a.id === 'system_navigate')!;
            const result = await action.handler({ target: 'INVALID_SECTOR' });
            expect(result.success).toBe(false);
        });

        it('should succeed with valid sector', async () => {
            const action = SOVEREIGN_ACTIONS.find(a => a.id === 'system_navigate')!;
            const result = await action.handler({ target: 'DASHBOARD' });
            expect(result.success).toBe(true);
        });
    });

    describe('search_intel', () => {
        it('should return error when no query provided', async () => {
            const action = SOVEREIGN_ACTIONS.find(a => a.id === 'search_intel')!;
            const result = await action.handler({});
            expect(result.success).toBe(false);
            expect(result.error).toBe('No query provided');
        });

        it('should succeed with valid query', async () => {
            const action = SOVEREIGN_ACTIONS.find(a => a.id === 'search_intel')!;
            const result = await action.handler({ query: 'test search' });
            expect(result.success).toBe(true);
            expect(result.result).toBe('Test search results');
        });

        it('should handle service errors gracefully', async () => {
            mockSearchGroundedIntel.mockRejectedValueOnce(new Error('Service unavailable'));
            const action = SOVEREIGN_ACTIONS.find(a => a.id === 'search_intel')!;
            const result = await action.handler({ query: 'test search' });
            expect(result.success).toBe(false);
            expect(result.error).toBe('Service unavailable');
        });
    });

    describe('propose_structural_change', () => {
        it('should return error when title or description missing', async () => {
            const action = SOVEREIGN_ACTIONS.find(a => a.id === 'propose_structural_change')!;
            const result = await action.handler({ title: 'Test' });
            expect(result.success).toBe(false);
        });

        it('should succeed with valid params', async () => {
            const action = SOVEREIGN_ACTIONS.find(a => a.id === 'propose_structural_change')!;
            const result = await action.handler({
                title: 'Test Proposal',
                description: 'Test description'
            });
            expect(result.success).toBe(true);
            expect(result.status).toBe('STAGED_FOR_REVIEW');
        });
    });

    describe('architect_generate_process', () => {
        it('should return error when no description provided', async () => {
            const action = SOVEREIGN_ACTIONS.find(a => a.id === 'architect_generate_process')!;
            const result = await action.handler({});
            expect(result.success).toBe(false);
            expect(result.error).toBe('No description provided');
        });

        it('should succeed with valid description', async () => {
            const action = SOVEREIGN_ACTIONS.find(a => a.id === 'architect_generate_process')!;
            const result = await action.handler({
                description: 'Create a data pipeline',
                type: 'SYSTEM_ARCHITECTURE'
            });
            expect(result.success).toBe(true);
            expect(result.coherence).toBe(85);
        });

        it('should handle workflow generation errors', async () => {
            mockGenerateStructuredWorkflow.mockRejectedValueOnce(new Error('Generation failed'));
            const action = SOVEREIGN_ACTIONS.find(a => a.id === 'architect_generate_process')!;
            const result = await action.handler({
                description: 'Create a data pipeline',
                type: 'SYSTEM_ARCHITECTURE'
            });
            expect(result.success).toBe(false);
            expect(result.error).toBe('Generation failed');
        });
    });

    describe('converge_strategic_lattices', () => {
        it('should return error when no targetGoal provided', async () => {
            const action = SOVEREIGN_ACTIONS.find(a => a.id === 'converge_strategic_lattices')!;
            const result = await action.handler({});
            expect(result.success).toBe(false);
            expect(result.error).toBe('No target goal provided');
        });

        it('should succeed with valid goal', async () => {
            const action = SOVEREIGN_ACTIONS.find(a => a.id === 'converge_strategic_lattices')!;
            const result = await action.handler({ targetGoal: 'Increase revenue' });
            expect(result.success).toBe(true);
            expect(result.goal).toBe('Test goal');
        });

        it('should handle convergence errors', async () => {
            mockConvergeStrategicLattices.mockRejectedValueOnce(new Error('Convergence failed'));
            const action = SOVEREIGN_ACTIONS.find(a => a.id === 'converge_strategic_lattices')!;
            const result = await action.handler({ targetGoal: 'Increase revenue' });
            expect(result.success).toBe(false);
            expect(result.error).toBe('Convergence failed');
        });
    });
});
