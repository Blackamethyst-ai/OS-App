/**
 * ARCHON Goal Decomposer
 *
 * Converts natural language goals into executable TaskGraphs.
 * Uses a 3-tier hierarchy for decomposition:
 *
 * 1. Pattern Match (fast path) — Check memory for similar successful patterns
 * 2. LLM Decomposition (slow path) — Use LLM to break down the goal
 * 3. Rule-Based Fallback — Domain-specific templates
 *
 * Based on GoalParser from Python reference with TypeScript enhancements.
 */

import { SubsystemType } from '../types';
import { generateId, estimateGoalComplexity, inferSubsystems, hashString } from '../utils';
import { TaskGraph, Task, createTask, TaskPriority } from './taskGraph';
import {
  DecompositionConfig,
  DecompositionResult,
  DecompositionAnalysis,
  SubtaskDefinition,
  DEFAULT_DECOMPOSITION_CONFIG,
  CachedDecomposition,
} from './types';

// =============================================================================
// INTERFACES FOR ADAPTERS
// =============================================================================

export interface IPatternStore {
  findSimilar(goal: string, threshold?: number): Promise<CachedDecomposition[]>;
  store(goalHash: string, result: DecompositionResult): Promise<void>;
}

export interface ILLMProvider {
  decomposeGoal(goal: string, context: DecompositionContext): Promise<SubtaskDefinition[]>;
}

export interface IComplexityRouter {
  analyze(goal: string): Promise<ComplexityAnalysis>;
}

export interface ComplexityAnalysis {
  complexityScore: number;
  estimatedTasks: number;
  recommendedSwarmSize: number;
  domainTags: string[];
}

export interface DecompositionContext {
  complexity: ComplexityAnalysis;
  guidelines: string;
  existingSubsystems: SubsystemType[];
}

// =============================================================================
// GOAL DECOMPOSER
// =============================================================================

export class GoalDecomposer {
  private config: DecompositionConfig;
  private patternStore?: IPatternStore;
  private llmProvider?: ILLMProvider;
  private complexityRouter?: IComplexityRouter;

  constructor(
    config: Partial<DecompositionConfig> = {},
    adapters?: {
      patternStore?: IPatternStore;
      llmProvider?: ILLMProvider;
      complexityRouter?: IComplexityRouter;
    }
  ) {
    this.config = { ...DEFAULT_DECOMPOSITION_CONFIG, ...config };
    this.patternStore = adapters?.patternStore;
    this.llmProvider = adapters?.llmProvider;
    this.complexityRouter = adapters?.complexityRouter;
  }

  /**
   * Decompose a natural language goal into a TaskGraph
   */
  async decompose(goal: string): Promise<DecompositionResult> {
    // Step 1: Analyze complexity
    const complexity = await this.analyzeComplexity(goal);

    // Step 2: Check if goal is simple enough to not decompose
    if (complexity.complexityScore < this.config.atomicThreshold) {
      return this.createAtomicResult(goal, complexity);
    }

    // Step 3: Try pattern matching (fast path)
    if (this.config.useCache && this.patternStore) {
      const patterns = await this.patternStore.findSimilar(goal, 0.8);
      if (patterns.length > 0 && patterns[0].avgDqScore >= 0.7) {
        return this.adaptPattern(goal, patterns[0], complexity);
      }
    }

    // Step 4: LLM decomposition (slow path)
    if (this.llmProvider) {
      return this.decomposeWithLLM(goal, complexity);
    }

    // Step 5: Rule-based fallback
    return this.ruleBasedDecomposition(goal, complexity);
  }

  /**
   * Analyze goal complexity
   */
  private async analyzeComplexity(goal: string): Promise<ComplexityAnalysis> {
    if (this.complexityRouter) {
      return this.complexityRouter.analyze(goal);
    }

    // Fallback heuristic
    const wordCount = goal.split(/\s+/).length;
    const complexity = estimateGoalComplexity(goal);
    const subsystems = inferSubsystems(goal);

    return {
      complexityScore: complexity,
      estimatedTasks: Math.max(2, Math.min(10, Math.ceil(wordCount / 10))),
      recommendedSwarmSize: Math.min(5, Math.ceil(complexity * 5) + 1),
      domainTags: this.extractDomainTags(goal),
    };
  }

  /**
   * Extract domain tags from goal text
   */
  private extractDomainTags(goal: string): string[] {
    const tags: string[] = [];
    const goalLower = goal.toLowerCase();

    const domainKeywords: Record<string, string[]> = {
      frontend: ['landing page', 'website', 'ui', 'interface', 'dashboard', 'react', 'css', 'component'],
      backend: ['api', 'server', 'database', 'endpoint', 'authentication', 'graphql'],
      data: ['analyze', 'data', 'csv', 'report', 'visualization', 'chart', 'metrics'],
      devops: ['deploy', 'ci/cd', 'docker', 'kubernetes', 'infrastructure', 'pipeline'],
      content: ['write', 'blog', 'article', 'copy', 'documentation', 'readme'],
      design: ['design', 'mockup', 'wireframe', 'prototype', 'figma', 'layout'],
      testing: ['test', 'coverage', 'e2e', 'integration', 'unit test'],
      refactor: ['refactor', 'optimize', 'improve', 'clean up', 'restructure'],
    };

    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      if (keywords.some((kw) => goalLower.includes(kw))) {
        tags.push(domain);
      }
    }

    return tags.length > 0 ? tags : ['general'];
  }

  /**
   * Create result for atomic (non-decomposable) goals
   */
  private createAtomicResult(goal: string, complexity: ComplexityAnalysis): DecompositionResult {
    const graph = new TaskGraph(goal);
    graph.complexityRating = complexity.complexityScore;

    const task = createTask({
      name: 'execute_goal',
      description: goal,
      requiredSubsystems: inferSubsystems(goal),
      estimatedComplexity: complexity.complexityScore,
      priority: TaskPriority.CRITICAL,
    });

    graph.addTask(task);

    return {
      goalId: graph.id,
      tree: graph,
      plan: this.createExecutionPlan(graph),
      analysis: this.analyzeDecomposition(graph, complexity),
      cached: false,
    };
  }

  /**
   * Adapt an existing pattern to the current goal
   */
  private adaptPattern(
    goal: string,
    pattern: CachedDecomposition,
    complexity: ComplexityAnalysis
  ): DecompositionResult {
    const sourceGraph = pattern.decomposition.tree;
    const graph = new TaskGraph(goal);
    graph.complexityRating = complexity.complexityScore;

    const taskIdMap = new Map<string, string>();

    // Clone tasks from pattern
    for (const [oldId, oldTask] of Array.from(sourceGraph.tasks.entries())) {
      const newTask = createTask({
        name: oldTask.name,
        description: oldTask.description,
        requiredCapabilities: [...oldTask.requiredCapabilities],
        requiredSubsystems: [...oldTask.requiredSubsystems],
        estimatedComplexity: oldTask.estimatedComplexity,
        priority: oldTask.priority,
        minDqScore: oldTask.minDqScore,
      });

      taskIdMap.set(oldId, newTask.id);
      graph.addTask(newTask);
    }

    // Remap dependencies
    for (const task of Array.from(graph.tasks.values())) {
      const oldTask = Array.from(sourceGraph.tasks.values()).find((t) => t.name === task.name);
      if (oldTask) {
        task.dependsOn = oldTask.dependsOn
          .map((oldDep) => taskIdMap.get(oldDep))
          .filter((id): id is string => id !== undefined);
      }
    }

    return {
      goalId: graph.id,
      tree: graph,
      plan: this.createExecutionPlan(graph),
      analysis: this.analyzeDecomposition(graph, complexity),
      cached: true,
    };
  }

  /**
   * Decompose using LLM
   */
  private async decomposeWithLLM(
    goal: string,
    complexity: ComplexityAnalysis
  ): Promise<DecompositionResult> {
    const context: DecompositionContext = {
      complexity,
      guidelines: this.getDecompositionGuidelines(),
      existingSubsystems: ['ace', 'dq', 'dream', 'evolution', 'kernel', 'voice', 'cpb'],
    };

    const subtasks = await this.llmProvider!.decomposeGoal(goal, context);

    const graph = new TaskGraph(goal);
    graph.complexityRating = complexity.complexityScore;

    const nameToId = new Map<string, string>();

    // First pass: create all tasks
    for (const subtask of subtasks) {
      const task = createTask({
        name: subtask.description.toLowerCase().replace(/\s+/g, '_').substring(0, 30),
        description: subtask.description,
        requiredSubsystems: [subtask.subsystem],
        estimatedComplexity: subtask.complexity,
        priority: subtask.type === 'atomic' ? TaskPriority.MEDIUM : TaskPriority.HIGH,
      });

      nameToId.set(task.name, task.id);
      graph.addTask(task);
    }

    // Second pass: resolve dependencies
    const taskArray = Array.from(graph.tasks.values());
    for (let i = 0; i < subtasks.length; i++) {
      const task = taskArray[i];
      const subtask = subtasks[i];

      task.dependsOn = subtask.dependencies
        .map((depIdx) => taskArray[depIdx]?.id)
        .filter((id): id is string => id !== undefined);
    }

    // Validate
    const validation = graph.validate();
    const warnings = validation.errors;

    return {
      goalId: graph.id,
      tree: graph,
      plan: this.createExecutionPlan(graph),
      analysis: this.analyzeDecomposition(graph, complexity),
      cached: false,
    };
  }

  /**
   * Rule-based decomposition fallback
   */
  private ruleBasedDecomposition(
    goal: string,
    complexity: ComplexityAnalysis
  ): DecompositionResult {
    const graph = new TaskGraph(goal);
    graph.complexityRating = complexity.complexityScore;

    const tags = complexity.domainTags;
    let tasks: Task[];

    if (tags.includes('frontend')) {
      tasks = this.createFrontendTasks(goal);
    } else if (tags.includes('backend')) {
      tasks = this.createBackendTasks(goal);
    } else if (tags.includes('refactor')) {
      tasks = this.createRefactorTasks(goal);
    } else if (tags.includes('testing')) {
      tasks = this.createTestingTasks(goal);
    } else {
      tasks = this.createGenericTasks(goal);
    }

    // Add tasks and set up sequential dependencies
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      if (i > 0 && task.dependsOn.length === 0) {
        task.dependsOn = [tasks[i - 1].id];
      }
      graph.addTask(task);
    }

    return {
      goalId: graph.id,
      tree: graph,
      plan: this.createExecutionPlan(graph),
      analysis: this.analyzeDecomposition(graph, complexity),
      cached: false,
    };
  }

  // ===========================================================================
  // DOMAIN-SPECIFIC TASK TEMPLATES
  // ===========================================================================

  private createFrontendTasks(goal: string): Task[] {
    return [
      createTask({
        name: 'analyze_requirements',
        description: 'Understand what needs to be built and define acceptance criteria',
        requiredSubsystems: ['cpb'],
        requiredCapabilities: ['planning'],
        priority: TaskPriority.CRITICAL,
        estimatedComplexity: 0.3,
      }),
      createTask({
        name: 'design_mockup',
        description: 'Create visual design and wireframe',
        requiredSubsystems: ['dream'],
        requiredCapabilities: ['design', 'ui'],
        estimatedComplexity: 0.5,
      }),
      createTask({
        name: 'implement_structure',
        description: 'Build the HTML/component structure',
        requiredSubsystems: ['evolution'],
        requiredCapabilities: ['frontend', 'coding'],
        estimatedComplexity: 0.5,
      }),
      createTask({
        name: 'implement_styling',
        description: 'Add CSS/styling',
        requiredSubsystems: ['evolution'],
        requiredCapabilities: ['frontend', 'css'],
        estimatedComplexity: 0.4,
      }),
      createTask({
        name: 'add_interactivity',
        description: 'Add JavaScript/interactivity',
        requiredSubsystems: ['evolution'],
        requiredCapabilities: ['frontend', 'javascript'],
        estimatedComplexity: 0.5,
      }),
      createTask({
        name: 'test_and_validate',
        description: 'Test functionality and validate against requirements',
        requiredSubsystems: ['dq'],
        requiredCapabilities: ['testing'],
        estimatedComplexity: 0.4,
      }),
    ];
  }

  private createBackendTasks(goal: string): Task[] {
    return [
      createTask({
        name: 'define_api_contract',
        description: 'Define API contracts, data models, and endpoints',
        requiredSubsystems: ['cpb'],
        requiredCapabilities: ['architecture', 'planning'],
        priority: TaskPriority.CRITICAL,
        estimatedComplexity: 0.4,
      }),
      createTask({
        name: 'implement_data_layer',
        description: 'Implement database models and data access',
        requiredSubsystems: ['evolution'],
        requiredCapabilities: ['backend', 'database'],
        estimatedComplexity: 0.5,
      }),
      createTask({
        name: 'implement_business_logic',
        description: 'Build the core business logic',
        requiredSubsystems: ['evolution'],
        requiredCapabilities: ['backend', 'coding'],
        estimatedComplexity: 0.6,
      }),
      createTask({
        name: 'implement_api_endpoints',
        description: 'Create API endpoints and routing',
        requiredSubsystems: ['evolution'],
        requiredCapabilities: ['backend', 'api'],
        estimatedComplexity: 0.5,
      }),
      createTask({
        name: 'write_tests',
        description: 'Write unit and integration tests',
        requiredSubsystems: ['evolution'],
        requiredCapabilities: ['testing'],
        estimatedComplexity: 0.4,
      }),
    ];
  }

  private createRefactorTasks(goal: string): Task[] {
    return [
      createTask({
        name: 'analyze_current_code',
        description: 'Analyze current implementation and identify issues',
        requiredSubsystems: ['cpb'],
        requiredCapabilities: ['analysis', 'review'],
        priority: TaskPriority.CRITICAL,
        estimatedComplexity: 0.4,
      }),
      createTask({
        name: 'plan_refactor',
        description: 'Plan the refactoring approach and identify risks',
        requiredSubsystems: ['ace'],
        requiredCapabilities: ['planning', 'architecture'],
        estimatedComplexity: 0.5,
      }),
      createTask({
        name: 'execute_refactor',
        description: 'Execute the refactoring changes',
        requiredSubsystems: ['evolution'],
        requiredCapabilities: ['coding', 'refactoring'],
        estimatedComplexity: 0.6,
      }),
      createTask({
        name: 'verify_behavior',
        description: 'Verify behavior is preserved and tests pass',
        requiredSubsystems: ['dq'],
        requiredCapabilities: ['testing', 'verification'],
        estimatedComplexity: 0.4,
      }),
    ];
  }

  private createTestingTasks(goal: string): Task[] {
    return [
      createTask({
        name: 'analyze_test_requirements',
        description: 'Identify what needs to be tested and coverage gaps',
        requiredSubsystems: ['cpb'],
        requiredCapabilities: ['analysis', 'testing'],
        priority: TaskPriority.CRITICAL,
        estimatedComplexity: 0.3,
      }),
      createTask({
        name: 'write_unit_tests',
        description: 'Write unit tests for individual components',
        requiredSubsystems: ['evolution'],
        requiredCapabilities: ['testing', 'coding'],
        estimatedComplexity: 0.5,
      }),
      createTask({
        name: 'write_integration_tests',
        description: 'Write integration tests for component interactions',
        requiredSubsystems: ['evolution'],
        requiredCapabilities: ['testing', 'coding'],
        estimatedComplexity: 0.5,
      }),
      createTask({
        name: 'run_and_validate',
        description: 'Run tests and validate coverage',
        requiredSubsystems: ['dq'],
        requiredCapabilities: ['testing'],
        estimatedComplexity: 0.3,
      }),
    ];
  }

  private createGenericTasks(goal: string): Task[] {
    return [
      createTask({
        name: 'plan',
        description: 'Plan the approach and identify requirements',
        requiredSubsystems: ['cpb'],
        requiredCapabilities: ['planning'],
        priority: TaskPriority.CRITICAL,
        estimatedComplexity: 0.3,
      }),
      createTask({
        name: 'execute',
        description: 'Execute the main work',
        requiredSubsystems: ['evolution'],
        requiredCapabilities: ['general'],
        estimatedComplexity: 0.5,
      }),
      createTask({
        name: 'review',
        description: 'Review and refine the output',
        requiredSubsystems: ['dq'],
        requiredCapabilities: ['review'],
        estimatedComplexity: 0.3,
      }),
    ];
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private getDecompositionGuidelines(): string {
    return `
Decompose the goal into discrete, parallelizable tasks where possible.

Rules:
1. Each task should be completable by a single subsystem
2. Tasks should have clear success criteria
3. Minimize dependencies to maximize parallelization
4. Include validation/testing tasks
5. Estimate complexity 0-1 (0.5 = medium)

Available subsystems:
- ace: Multi-agent consensus for complex decisions
- dq: Quality scoring and validation
- dream: Background research and pattern discovery
- evolution: Code generation and refactoring
- kernel: Task dispatch and coordination
- voice: Natural language processing
- cpb: Reasoning path selection and verification

Output format:
{
  "tasks": [
    {
      "description": "What this task accomplishes",
      "type": "atomic" | "composite",
      "subsystem": "evolution" | "ace" | "dq" | etc.,
      "dependencies": [indices of prerequisite tasks],
      "complexity": 0.5
    }
  ]
}
`.trim();
  }

  private createExecutionPlan(graph: TaskGraph): DecompositionResult['plan'] {
    const steps = Array.from(graph.tasks.values()).map((task) => ({
      id: task.id,
      goalId: graph.id,
      description: task.description,
      subsystem: task.requiredSubsystems[0] || ('kernel' as SubsystemType),
      priority: (task.priority === TaskPriority.CRITICAL ? 'critical' : 'normal') as 'critical' | 'normal',
      dependencies: task.dependsOn,
      status: 'pending' as const,
    }));

    const dependencies = new Map<string, string[]>();
    for (const task of Array.from(graph.tasks.values())) {
      dependencies.set(task.id, task.dependsOn);
    }

    const estimatedTokens = Array.from(graph.tasks.values()).reduce(
      (sum, task) => sum + Math.round(task.estimatedComplexity * 5000),
      0
    );

    return {
      goalId: graph.id,
      steps,
      dependencies,
      estimatedTokens,
      estimatedDuration: estimatedTokens / 100, // Rough estimate
    };
  }

  private analyzeDecomposition(
    graph: TaskGraph,
    complexity: ComplexityAnalysis
  ): DecompositionAnalysis {
    const tasks = Array.from(graph.tasks.values());
    const criticalPath = graph.getCriticalPath();

    // Calculate parallelizable percentage
    const withDeps = tasks.filter((t) => t.dependsOn.length > 0).length;
    const parallelizable = tasks.length > 0 ? (tasks.length - withDeps) / tasks.length : 0;

    // Collect all subsystems
    const subsystems = new Set<SubsystemType>();
    for (const task of tasks) {
      for (const sub of task.requiredSubsystems) {
        subsystems.add(sub);
      }
    }

    return {
      totalSubtasks: tasks.length,
      maxDepth: criticalPath.length,
      estimatedComplexity: complexity.complexityScore,
      subsystemsRequired: Array.from(subsystems),
      estimatedTokenCost: tasks.reduce((sum, t) => sum + Math.round(t.estimatedComplexity * 5000), 0),
      parallelizable: Math.round(parallelizable * 100),
      criticalPath: criticalPath.map((t) => t.id),
    };
  }
}

// =============================================================================
// STUB IMPLEMENTATIONS FOR TESTING
// =============================================================================

export class StubPatternStore implements IPatternStore {
  private patterns: CachedDecomposition[] = [];

  async findSimilar(goal: string, threshold = 0.7): Promise<CachedDecomposition[]> {
    // No patterns stored yet
    return [];
  }

  async store(goalHash: string, result: DecompositionResult): Promise<void> {
    this.patterns.push({
      goalHash,
      decomposition: result,
      hitCount: 0,
      lastUsed: Date.now(),
      createdAt: Date.now(),
      avgDqScore: 0.8,
      successRate: 1.0,
    });
  }
}

export class StubLLMProvider implements ILLMProvider {
  async decomposeGoal(goal: string, context: DecompositionContext): Promise<SubtaskDefinition[]> {
    // Simple decomposition for testing
    return [
      {
        description: 'Plan the approach',
        type: 'atomic',
        subsystem: 'cpb',
        dependencies: [],
        complexity: 0.3,
      },
      {
        description: 'Execute the implementation',
        type: 'composite',
        subsystem: 'evolution',
        dependencies: [0],
        complexity: 0.6,
      },
      {
        description: 'Validate the result',
        type: 'atomic',
        subsystem: 'dq',
        dependencies: [1],
        complexity: 0.3,
      },
    ];
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let decomposerInstance: GoalDecomposer | null = null;

export function getGoalDecomposer(): GoalDecomposer {
  if (!decomposerInstance) {
    decomposerInstance = new GoalDecomposer();
  }
  return decomposerInstance;
}
