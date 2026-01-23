/**
 * INITIAL AGENTS DATA
 *
 * Default agent configurations for the Swarm Hub.
 * Extracted from store.ts for maintainability.
 */

import { AutonomousAgent, OperationalContext } from '../types';

export const INITIAL_AGENTS: AutonomousAgent[] = [
    {
        id: 'mike',
        name: 'Mike',
        role: 'Implementation Architect',
        context: OperationalContext.STRATEGY_SYNTHESIS,
        status: 'IDLE',
        memoryBuffer: [],
        capabilities: ['system_navigate', 'search_intel', 'architect_generate_process', 'propose_structural_change'],
        currentMindset: { skepticism: 10, excitement: 95, alignment: 75 },
        energyLevel: 100,
        tasks: []
    },
    {
        id: 'dr_ira',
        name: 'Dr. Ira',
        role: 'Audit Sentinel',
        context: OperationalContext.SYSTEM_MONITORING,
        status: 'IDLE',
        memoryBuffer: [],
        capabilities: ['search_intel', 'update_task_priority', 'propose_structural_change'],
        currentMindset: { skepticism: 95, excitement: 15, alignment: 90 },
        energyLevel: 100,
        tasks: []
    },
    {
        id: 'caleb',
        name: 'Caleb',
        role: 'Execution Lead',
        context: OperationalContext.CODE_GENERATION,
        status: 'IDLE',
        memoryBuffer: [],
        capabilities: ['search_intel', 'architect_generate_process', 'perform_code_review'],
        currentMindset: { skepticism: 35, excitement: 65, alignment: 85 },
        energyLevel: 100,
        tasks: []
    },
    {
        id: 'paramdeep',
        name: 'Paramdeep',
        role: 'Systems Strategist',
        context: OperationalContext.DATA_ANALYSIS,
        status: 'IDLE',
        memoryBuffer: [],
        capabilities: ['analyze_data', 'optimize_flow', 'predict_vectors'],
        currentMindset: { skepticism: 60, excitement: 80, alignment: 95 },
        energyLevel: 100,
        tasks: []
    },
    {
        id: 'bilal',
        name: 'Bilal',
        role: 'Kinetic Operator',
        context: OperationalContext.GENERAL_PURPOSE,
        status: 'IDLE',
        memoryBuffer: [],
        capabilities: ['quick_response', 'route_tasks', 'manage_uplink'],
        currentMindset: { skepticism: 20, excitement: 90, alignment: 80 },
        energyLevel: 100,
        tasks: []
    }
];
