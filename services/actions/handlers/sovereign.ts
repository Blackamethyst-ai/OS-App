/**
 * SOVEREIGN ACTION HANDLERS
 * Core OS-level tools migrated from legacy toolRegistry.ts
 * These are the foundational capabilities of the Sovereign OS.
 */

import { useAppStore } from '../../../store';
import { AppMode, TaskPriority, MentalState, SwarmProposal } from '../../../types';
import { generateStructuredWorkflow, searchGroundedIntel, convergeStrategicLattices } from '../../geminiService';
import type { UnifiedAction } from '../types';

export const SOVEREIGN_ACTIONS: UnifiedAction[] = [
  // ==========================================================================
  // 1. ARCHITECTURAL PROTOCOLS
  // ==========================================================================
  {
    id: 'architect_generate_process',
    description: 'Generate structured process topology with multi-modal parsing protocols',
    handler: async (args) => {
      const { setProcessState, addLog } = useAppStore.getState().actions;
      const description = args.description as string;
      const type = (args.type as string) || 'SYSTEM_ARCHITECTURE';
      const customDirective = args.custom_directive as string | undefined;
      const dnaProfile = args.dna_profile as Partial<MentalState> | undefined;

      if (!description) {
        return { success: false, error: 'No description provided' };
      }

      addLog('SYSTEM', `ARCHITECT: Synthesizing ${type} topology with Multi-modal Parsing protocols...`);

      try {
        const domainContext = type === 'DRIVE_ORGANIZATION'
          ? "Forge a high-end PARA (Projects, Areas, Resources, Archives) drive organization. Include Zettelkasten-style atomic note linking. Protocols: 1. Semantic Tagging, 2. Auto-Archival TTL, 3. Multi-modal indexing for Images/PDFs."
          : type === 'SYSTEM_ARCHITECTURE'
            ? "Forge a cloud-native architecture with a dedicated Deep Ingestion Layer. Stages: Edge Data Filtering -> Persistent Event Bus -> Autonomous Indexing -> Refractive Storage (Glacier + Hot Access)."
            : "Focus on swarm consensus, weighted voting delegation, and recursive agentic self-correction.";

        const fullPrompt = `${description} | DOMAIN_GUIDANCE: ${domainContext} | DIRECTIVE: ${customDirective || 'Standard Optimization'}`;

        const workflowResult = await generateStructuredWorkflow([], 'SOVEREIGN_CORE', type as any, {
          prompt: fullPrompt,
          dna: dnaProfile
        });

        const workflow = workflowResult as unknown as {
          title: string;
          internalPlanningMonologue: string;
          protocols: any[];
          coherenceScore: number;
          taxonomy?: any;
        };

        setProcessState({
          generatedWorkflow: workflow,
          activeTab: 'workflow',
          workflowType: type,
          coherenceScore: workflow.coherenceScore || 85
        });

        return {
          success: true,
          message: `Lattice for ${type} crystallized. Multi-modal parsing nodes verified.`,
          coherence: workflow.coherenceScore,
          sectors: workflow.taxonomy?.root?.length || 0
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
    sectors: ['PROCESS_MAP', 'ARCHON', 'SYNTHESIS_BRIDGE'],
    priority: 95,
    executionPath: 'cascade',
    complexity: 'architecture',
    source: 'sovereign',
    examples: [
      'generate a process for organizing my drive',
      'create system architecture for data pipeline',
      'architect an agentic orchestration workflow'
    ],
    schema: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'Description of the process to generate' },
        type: { type: 'string', enum: ['DRIVE_ORGANIZATION', 'SYSTEM_ARCHITECTURE', 'AGENTIC_ORCHESTRATION', 'CONVERGENT_SYNTHESIS'] },
        custom_directive: { type: 'string', description: 'Optional custom directive' }
      },
      required: ['description']
    }
  },

  // ==========================================================================
  // 2. DNA RECALIBRATION
  // ==========================================================================
  {
    id: 'adjust_agent_dna',
    description: 'Recalibrate agent mental state weights (skepticism, excitement, alignment)',
    handler: async (args) => {
      const { setVoiceState, addLog } = useAppStore.getState().actions;
      const agentId = (args.agentId as string) || 'default';
      const weights = args.weights as Partial<MentalState>;
      const reasoning = args.reasoning as string | undefined;

      if (!weights) {
        return { success: false, error: 'No weights provided' };
      }

      setVoiceState(prev => ({
        mentalState: { ...prev.mentalState, ...weights }
      }));

      addLog('SUCCESS', `DNA_RECUT: Agent ${agentId} weights adjusted. Reasoning: ${reasoning || 'System optimization'}`);

      return {
        success: true,
        agentId,
        newWeights: weights,
        status: 'SYNAPTIC_BOND_STABLE'
      };
    },
    sectors: ['AGENT_CONTROL', 'VOICE_MODE'],
    priority: 80,
    executionPath: 'direct',
    complexity: 'simple',
    source: 'sovereign',
    examples: [
      'adjust agent skepticism to 70',
      'increase excitement level',
      'recalibrate agent DNA'
    ],
    schema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'Agent identifier' },
        weights: {
          type: 'object',
          properties: {
            skepticism: { type: 'number', minimum: 0, maximum: 100 },
            excitement: { type: 'number', minimum: 0, maximum: 100 },
            alignment: { type: 'number', minimum: 0, maximum: 100 }
          }
        },
        reasoning: { type: 'string', description: 'Reason for adjustment' }
      },
      required: ['weights']
    }
  },

  // ==========================================================================
  // 3. LATTICE CONVERGENCE
  // ==========================================================================
  {
    id: 'converge_strategic_lattices',
    description: 'Orchestrate multi-lattice synthesis for goal convergence',
    handler: async (args) => {
      const { actions, process } = useAppStore.getState();
      const { addLog, setProcessState } = actions;
      const targetGoal = args.targetGoal as string || args.goal as string;

      if (!targetGoal) {
        return { success: false, error: 'No target goal provided' };
      }

      addLog('SYSTEM', `CONVERGENCE: Orchestrating multi-lattice synthesis for "${targetGoal}"...`);

      try {
        const contextNodes = process.nodes.slice(-3);
        const result = await convergeStrategicLattices(contextNodes, targetGoal) as {
          nodes: any[];
          coherence_index: number;
          unified_goal: string;
        };

        setProcessState({
          nodes: result.nodes.map((n: any, i: number) => ({
            id: n.id,
            type: 'holographic',
            position: { x: 500 + i * 100, y: 300 + i * 50 },
            data: { label: n.label, subtext: 'CONVERGED_AXIOM', status: 'SYNTHESIZED', color: '#10b981' }
          })),
          coherenceScore: Math.round(result.coherence_index * 100)
        });

        return {
          success: true,
          goal: result.unified_goal,
          coherence: result.coherence_index
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
    sectors: ['PROCESS_MAP', 'SYNTHESIS_BRIDGE'],
    priority: 85,
    executionPath: 'ace',
    complexity: 'analysis',
    source: 'sovereign',
    examples: [
      'converge lattices toward revenue growth',
      'synthesize strategy for product launch',
      'unify goals around customer acquisition'
    ],
    schema: {
      type: 'object',
      properties: {
        targetGoal: { type: 'string', description: 'The goal to converge toward' }
      },
      required: ['targetGoal']
    }
  },

  // ==========================================================================
  // 4. UI CONTEXT FOCUS
  // ==========================================================================
  {
    id: 'focus_element',
    description: 'Set UI context focus to a specific element selector',
    handler: async (args) => {
      const { setFocusedSelector, addLog } = useAppStore.getState().actions;
      const selector = args.selector as string;

      if (!selector) {
        return { success: false, error: 'No selector provided' };
      }

      setFocusedSelector(selector);
      addLog('SUCCESS', `UI_FOCUS: Targeted element context [${selector}]`);

      return {
        success: true,
        message: `Context focus shifted to ${selector}`
      };
    },
    sectors: [],
    priority: 60,
    executionPath: 'direct',
    complexity: 'simple',
    source: 'sovereign',
    examples: [
      'focus on the sidebar',
      'highlight the header',
      'select the main panel'
    ],
    schema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector or element identifier' }
      },
      required: ['selector']
    }
  },

  // ==========================================================================
  // 5. TASK MANAGEMENT
  // ==========================================================================
  {
    id: 'update_task_priority',
    description: 'Adjust task priority level',
    handler: async (args) => {
      const { updateTask, addLog } = useAppStore.getState().actions;
      const taskId = args.taskId as string;
      const priority = args.priority as TaskPriority;

      if (!taskId || !priority) {
        return { success: false, error: 'Task ID and priority required' };
      }

      updateTask(taskId, { priority });
      addLog('SUCCESS', `TASK_UPDATE: Prioritized task ${taskId} to ${priority}`);

      return {
        success: true,
        taskId,
        priority,
        message: 'Priority adjusted'
      };
    },
    sectors: ['DASHBOARD', 'METAVENTIONS_HUB'],
    priority: 70,
    executionPath: 'direct',
    complexity: 'simple',
    source: 'sovereign',
    examples: [
      'set task priority to high',
      'mark task as urgent',
      'lower priority of task'
    ],
    schema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task identifier' },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] }
      },
      required: ['taskId', 'priority']
    }
  },

  // ==========================================================================
  // 6. SYSTEM NAVIGATION
  // ==========================================================================
  {
    id: 'system_navigate',
    description: 'Navigate to a specific sector or mode',
    handler: async (args) => {
      const { setMode, addLog } = useAppStore.getState().actions;
      const target = args.target as string;

      if (!target) {
        return { success: false, error: 'No target sector provided' };
      }

      const targetMode = AppMode[target.toUpperCase() as keyof typeof AppMode];

      if (targetMode) {
        setMode(targetMode);
        addLog('SUCCESS', `NAV: Redirected to ${target} sector`);
        return {
          success: true,
          sector: targetMode,
          message: `Redirected to ${target} sector`
        };
      }

      return { success: false, error: `Sector ${target} not found` };
    },
    sectors: [],
    priority: 75,
    executionPath: 'direct',
    complexity: 'navigation',
    source: 'sovereign',
    examples: [
      'go to dashboard',
      'navigate to agents',
      'open the research sector'
    ],
    schema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'Target sector name' }
      },
      required: ['target']
    }
  },

  // ==========================================================================
  // 7. SEARCH INTELLIGENCE
  // ==========================================================================
  {
    id: 'search_intel',
    description: 'Search for grounded intelligence using web search',
    handler: async (args) => {
      const { addLog } = useAppStore.getState().actions;
      const query = args.query as string;

      if (!query) {
        return { success: false, error: 'No query provided' };
      }

      addLog('SYSTEM', `SEARCH_INTEL: Grounding intelligence for "${query}"...`);

      try {
        const result = await searchGroundedIntel(query);
        return {
          success: true,
          query,
          result
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
    sectors: ['BIBLIOMORPHIC', 'NEXUS'],
    priority: 85,
    executionPath: 'ace',
    complexity: 'analysis',
    source: 'sovereign',
    examples: [
      'search for latest AI research',
      'find information about quantum computing',
      'research market trends'
    ],
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' }
      },
      required: ['query']
    }
  },

  // ==========================================================================
  // 8. SWARM PROPOSAL
  // ==========================================================================
  {
    id: 'propose_structural_change',
    description: 'Generate a swarm proposal for structural changes',
    handler: async (args) => {
      const { addSwarmProposal, addLog } = useAppStore.getState().actions;

      const agentId = (args.agentId as string) || 'system';
      const agentName = (args.agentName as string) || 'System';
      const type = (args.type as 'OPTIMIZATION' | 'EXPANSION' | 'SECURITY') || 'OPTIMIZATION';
      const title = args.title as string;
      const description = args.description as string;
      const impact = (args.impact as string) || 'Medium';
      const manifestSummary = (args.manifest_summary as string) || description;

      if (!title || !description) {
        return { success: false, error: 'Title and description required' };
      }

      const proposal: SwarmProposal = {
        id: `prop-${Date.now()}`,
        agentId,
        agentName,
        type,
        title,
        description,
        impact,
        manifest: { title, logic: manifestSummary, complexity: 'PRODUCTION' },
        timestamp: Date.now()
      };

      addSwarmProposal(proposal);
      addLog('SYSTEM', `SWARM_SIGNAL: [${agentName}] issued a structural ${type} proposal.`);

      return {
        success: true,
        proposalId: proposal.id,
        status: 'STAGED_FOR_REVIEW'
      };
    },
    sectors: ['AGENT_CONTROL', 'ARCHON'],
    priority: 80,
    executionPath: 'hybrid',
    complexity: 'analysis',
    source: 'sovereign',
    examples: [
      'propose optimization for memory usage',
      'suggest security enhancement',
      'create expansion proposal'
    ],
    schema: {
      type: 'object',
      properties: {
        agentId: { type: 'string' },
        agentName: { type: 'string' },
        type: { type: 'string', enum: ['OPTIMIZATION', 'EXPANSION', 'SECURITY'] },
        title: { type: 'string', description: 'Proposal title' },
        description: { type: 'string', description: 'Detailed description' },
        impact: { type: 'string', description: 'Impact assessment' },
        manifest_summary: { type: 'string', description: 'Technical summary' }
      },
      required: ['title', 'description']
    }
  }
];
