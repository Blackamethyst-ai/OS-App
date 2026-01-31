/**
 * SkillWeaver - Skill Synthesis Engine
 *
 * Composes multiple skills into new emergent skills using four synthesis patterns:
 * - sequential: A -> B -> C (output of N becomes input of N+1)
 * - parallel: A + B -> merge (all run concurrently, outputs merged)
 * - conditional: if(cond) A else B (choose branch based on condition)
 * - feedback_loop: A -> B -> critic -> A (iterate until DQ threshold met)
 *
 * Research basis:
 * - arXiv:2504.07079 (SkillWeaver) - 31.8% improvement via skill synthesis
 * - arXiv:2512.23880 (CASCADE) - 93.3% success in autonomous skill creation
 * - arXiv:2511.15755 (DQ Scoring) - Quality validation
 *
 * @module genome/skillWeaver
 */

import type {
  SkillGenome,
  SynthesisPattern,
  SynthesisRequest,
  SynthesizedSkill,
  ExecutionPlan,
  ExecutionStep,
  SynthesisConstraints,
  JSONSchema,
  SerializedFunction,
  SkillRef,
  MCPSkillResource,
  PortabilitySpec,
  SkillOrigin,
} from './types';

import { skillGenomeCodec } from './codec';
import type { DQScore, SubsystemType } from '../../archon/types';

// =============================================================================
// TYPES
// =============================================================================

/** Skill registry for resolving skill references */
export interface SkillRegistry {
  get(skillId: string): SkillGenome | undefined;
  getByName(name: string): SkillGenome | undefined;
  getAll(): SkillGenome[];
}

/** Condition evaluator for conditional pattern */
export interface ConditionEvaluator {
  (input: unknown, context: SynthesisContext): boolean;
}

/** Context passed during synthesis */
export interface SynthesisContext {
  goal: string;
  pattern: SynthesisPattern;
  iteration: number;
  previousOutputs: Map<string, unknown>;
  dqThreshold: number;
  maxIterations: number;
}

/** Merge strategy for parallel pattern */
export type MergeStrategy = 'concat' | 'deepMerge' | 'first' | 'last' | 'custom';

/** Configuration for SkillWeaver */
export interface SkillWeaverConfig {
  /** Default DQ threshold for feedback loops */
  defaultDQThreshold: number;

  /** Maximum iterations for feedback loops */
  maxFeedbackIterations: number;

  /** Default merge strategy for parallel pattern */
  defaultMergeStrategy: MergeStrategy;

  /** Timeout for synthesis operations (ms) */
  synthesisTimeoutMs: number;

  /** Enable caching of synthesized skills */
  cacheSynthesizedSkills: boolean;
}

const DEFAULT_CONFIG: SkillWeaverConfig = {
  defaultDQThreshold: 0.7,
  maxFeedbackIterations: 5,
  defaultMergeStrategy: 'deepMerge',
  synthesisTimeoutMs: 30000,
  cacheSynthesizedSkills: true,
};

// =============================================================================
// SKILL WEAVER CLASS
// =============================================================================

/**
 * SkillWeaver synthesizes new skills by composing existing skills.
 *
 * The synthesis process:
 * 1. Resolve base skills from registry
 * 2. Validate schema compatibility
 * 3. Generate execution plan with dependency resolution
 * 4. Create synthesized skill genome
 * 5. Validate synthesis with DQ scoring
 */
export class SkillWeaver {
  private registry: SkillRegistry;
  private config: SkillWeaverConfig;
  private cache: Map<string, SynthesizedSkill> = new Map();

  constructor(registry: SkillRegistry, config: Partial<SkillWeaverConfig> = {}) {
    this.registry = registry;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ---------------------------------------------------------------------------
  // Main API
  // ---------------------------------------------------------------------------

  /**
   * Synthesize a new skill from base skills.
   *
   * @param baseSkills - IDs or names of skills to compose
   * @param pattern - Synthesis pattern to use
   * @param goal - Description of what the synthesized skill should achieve
   * @returns Synthesized skill with execution plan and validation
   */
  async synthesize(
    baseSkills: string[],
    pattern: SynthesisPattern,
    goal: string
  ): Promise<SynthesizedSkill> {
    const startTime = Date.now();
    let iterations = 1;

    // Check cache
    const cacheKey = this.getCacheKey(baseSkills, pattern, goal);
    if (this.config.cacheSynthesizedSkills && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Resolve skills
    const skills = this.resolveSkills(baseSkills);
    if (skills.length === 0) {
      throw new Error('No valid skills found for synthesis');
    }

    // Validate compatibility
    this.validateCompatibility(skills, pattern);

    // Generate execution plan
    const executionPlan = this.compose(skills, pattern);

    // Create synthesized skill genome
    const skill = this.createSynthesizedGenome(skills, pattern, goal, executionPlan);

    // Validate synthesis
    const validation = await this.validateSynthesis(skill);

    // For feedback loop, iterate until DQ threshold met
    if (pattern === 'feedback_loop' && validation.score < this.config.defaultDQThreshold) {
      const result = await this.iterateFeedbackLoop(
        skills,
        goal,
        validation,
        startTime
      );
      iterations = result.iterations;
    }

    const synthesizedSkill: SynthesizedSkill = {
      skill,
      executionPlan,
      validation,
      metadata: {
        patternsUsed: pattern,
        baseSkillCount: skills.length,
        synthesisTimeMs: Date.now() - startTime,
        iterationsRequired: iterations,
      },
    };

    // Cache result
    if (this.config.cacheSynthesizedSkills) {
      this.cache.set(cacheKey, synthesizedSkill);
    }

    return synthesizedSkill;
  }

  /**
   * Compose skills into an execution plan.
   *
   * @param skills - Skills to compose
   * @param pattern - Synthesis pattern
   * @returns Execution plan with dependency resolution
   */
  compose(skills: SkillGenome[], pattern: SynthesisPattern): ExecutionPlan {
    switch (pattern) {
      case 'sequential':
        return this.composeSequential(skills);
      case 'parallel':
        return this.composeParallel(skills);
      case 'conditional':
        return this.composeConditional(skills);
      case 'feedback_loop':
        return this.composeFeedbackLoop(skills);
      default:
        throw new Error(`Unknown synthesis pattern: ${pattern}`);
    }
  }

  /**
   * Validate a synthesized skill using DQ scoring.
   *
   * @param skill - Skill to validate
   * @returns DQ score with validity, specificity, and correctness
   */
  async validateSynthesis(skill: SkillGenome): Promise<DQScore> {
    // Validate structure
    try {
      skillGenomeCodec.validateSkillGenome(skill);
    } catch (error) {
      return {
        score: 0,
        components: { validity: 0, specificity: 0, correctness: 0 },
        isActionable: false,
        timestamp: Date.now(),
      };
    }

    // Compute DQ components
    const validity = this.computeValidity(skill);
    const specificity = this.computeSpecificity(skill);
    const correctness = this.computeCorrectness(skill);

    // DQ formula: validity (40%) + specificity (30%) + correctness (30%)
    const score = validity * 0.4 + specificity * 0.3 + correctness * 0.3;

    return {
      score,
      components: { validity, specificity, correctness },
      isActionable: score >= this.config.defaultDQThreshold,
      timestamp: Date.now(),
    };
  }

  // ---------------------------------------------------------------------------
  // Pattern Implementations
  // ---------------------------------------------------------------------------

  /**
   * Sequential pattern: A -> B -> C
   * Output of step N becomes input of step N+1
   */
  private composeSequential(skills: SkillGenome[]): ExecutionPlan {
    const steps: ExecutionStep[] = [];
    const dependencyGraph = new Map<string, string[]>();
    let estimatedTime = 0;

    for (let i = 0; i < skills.length; i++) {
      const skill = skills[i];
      const stepId = `seq_step_${i}`;
      const prevStepId = i > 0 ? `seq_step_${i - 1}` : undefined;

      // Build input mapping from previous step's output
      const inputMapping: Record<string, string> = {};
      if (prevStepId) {
        // Map all properties from previous output to current input
        const prevSkill = skills[i - 1];
        if (prevSkill.outputSchema.properties && skill.inputSchema.properties) {
          for (const prop of Object.keys(skill.inputSchema.properties)) {
            if (prevSkill.outputSchema.properties[prop]) {
              inputMapping[prop] = `${prevStepId}.output.${prop}`;
            }
          }
        }
        // Also provide entire previous output as special key
        inputMapping['_previousOutput'] = `${prevStepId}.output`;
      }

      steps.push({
        id: stepId,
        skillId: skill.id,
        inputMapping,
        dependsOn: prevStepId ? [prevStepId] : [],
      });

      dependencyGraph.set(stepId, prevStepId ? [prevStepId] : []);
      estimatedTime += skill.timeoutMs;
    }

    return {
      steps,
      dependencyGraph,
      estimatedTimeMs: estimatedTime,
    };
  }

  /**
   * Parallel pattern: A + B -> merge
   * All skills run concurrently, outputs merged at end
   */
  private composeParallel(skills: SkillGenome[]): ExecutionPlan {
    const steps: ExecutionStep[] = [];
    const dependencyGraph = new Map<string, string[]>();
    const parallelStepIds: string[] = [];

    // Create parallel steps (no dependencies on each other)
    for (let i = 0; i < skills.length; i++) {
      const skill = skills[i];
      const stepId = `par_step_${i}`;
      parallelStepIds.push(stepId);

      steps.push({
        id: stepId,
        skillId: skill.id,
        inputMapping: { _input: 'root.input' }, // All get same input
        dependsOn: [],
      });

      dependencyGraph.set(stepId, []);
    }

    // Create merge step that depends on all parallel steps
    const mergeStepId = 'par_merge';
    const mergeInputMapping: Record<string, string> = {};
    for (let i = 0; i < parallelStepIds.length; i++) {
      mergeInputMapping[`output_${i}`] = `${parallelStepIds[i]}.output`;
    }

    steps.push({
      id: mergeStepId,
      skillId: '__merge__',
      inputMapping: mergeInputMapping,
      dependsOn: parallelStepIds,
    });

    dependencyGraph.set(mergeStepId, parallelStepIds);

    // Estimated time is max of all parallel skills (they run concurrently)
    const maxTime = Math.max(...skills.map((s) => s.timeoutMs));

    return {
      steps,
      dependencyGraph,
      estimatedTimeMs: maxTime + 100, // Add merge overhead
    };
  }

  /**
   * Conditional pattern: if(cond) A else B
   * Choose branch based on condition evaluation
   */
  private composeConditional(skills: SkillGenome[]): ExecutionPlan {
    if (skills.length < 2) {
      throw new Error('Conditional pattern requires at least 2 skills (branches)');
    }

    const steps: ExecutionStep[] = [];
    const dependencyGraph = new Map<string, string[]>();

    // Condition evaluation step
    const conditionStepId = 'cond_eval';
    steps.push({
      id: conditionStepId,
      skillId: '__condition__',
      inputMapping: { _input: 'root.input' },
      dependsOn: [],
    });
    dependencyGraph.set(conditionStepId, []);

    // Branch steps (mutually exclusive based on condition)
    for (let i = 0; i < skills.length; i++) {
      const skill = skills[i];
      const stepId = `cond_branch_${i}`;

      steps.push({
        id: stepId,
        skillId: skill.id,
        inputMapping: { _input: 'root.input' },
        condition: `branch === ${i}`, // Execute only if condition selects this branch
        dependsOn: [conditionStepId],
      });

      dependencyGraph.set(stepId, [conditionStepId]);
    }

    // Merge step to collect whichever branch executed
    const mergeStepId = 'cond_merge';
    const branchIds = skills.map((_, i) => `cond_branch_${i}`);
    const mergeInputMapping: Record<string, string> = {};
    branchIds.forEach((id, i) => {
      mergeInputMapping[`branch_${i}`] = `${id}.output`;
    });

    steps.push({
      id: mergeStepId,
      skillId: '__merge_conditional__',
      inputMapping: mergeInputMapping,
      dependsOn: branchIds,
    });
    dependencyGraph.set(mergeStepId, branchIds);

    // Estimated time is max of all branches
    const maxTime = Math.max(...skills.map((s) => s.timeoutMs));

    return {
      steps,
      dependencyGraph,
      estimatedTimeMs: maxTime + 50, // Add condition overhead
    };
  }

  /**
   * Feedback loop pattern: A -> B -> critic -> A (if DQ < threshold)
   * Iterate until DQ threshold met or max iterations reached
   */
  private composeFeedbackLoop(skills: SkillGenome[]): ExecutionPlan {
    if (skills.length < 2) {
      throw new Error('Feedback loop requires at least 2 skills (executor + critic)');
    }

    const steps: ExecutionStep[] = [];
    const dependencyGraph = new Map<string, string[]>();

    // Executor skill (first skill)
    const executorStepId = 'loop_executor';
    steps.push({
      id: executorStepId,
      skillId: skills[0].id,
      inputMapping: {
        _input: 'root.input',
        _feedback: 'loop_critic.output', // Feedback from previous iteration
      },
      dependsOn: [],
    });
    dependencyGraph.set(executorStepId, []);

    // Additional processing skills (middle skills)
    let prevStepId = executorStepId;
    for (let i = 1; i < skills.length - 1; i++) {
      const skill = skills[i];
      const stepId = `loop_process_${i}`;

      steps.push({
        id: stepId,
        skillId: skill.id,
        inputMapping: { _input: `${prevStepId}.output` },
        dependsOn: [prevStepId],
      });

      dependencyGraph.set(stepId, [prevStepId]);
      prevStepId = stepId;
    }

    // Critic skill (last skill)
    const criticStepId = 'loop_critic';
    steps.push({
      id: criticStepId,
      skillId: skills[skills.length - 1].id,
      inputMapping: {
        _input: `${prevStepId}.output`,
        _goal: 'root.goal',
        _iteration: 'loop.iteration',
      },
      dependsOn: [prevStepId],
    });
    dependencyGraph.set(criticStepId, [prevStepId]);

    // Loop control step
    const loopControlStepId = 'loop_control';
    steps.push({
      id: loopControlStepId,
      skillId: '__loop_control__',
      inputMapping: {
        _dqScore: `${criticStepId}.dqScore`,
        _threshold: 'config.dqThreshold',
        _iteration: 'loop.iteration',
        _maxIterations: 'config.maxIterations',
      },
      condition: 'dqScore < threshold && iteration < maxIterations',
      dependsOn: [criticStepId],
    });
    dependencyGraph.set(loopControlStepId, [criticStepId]);

    // Estimated time: single pass * max iterations
    const singlePassTime = skills.reduce((sum, s) => sum + s.timeoutMs, 0);
    const estimatedTime = singlePassTime * this.config.maxFeedbackIterations;

    return {
      steps,
      dependencyGraph,
      estimatedTimeMs: estimatedTime,
    };
  }

  // ---------------------------------------------------------------------------
  // Genome Creation
  // ---------------------------------------------------------------------------

  /**
   * Create a synthesized SkillGenome from composed skills.
   */
  private createSynthesizedGenome(
    skills: SkillGenome[],
    pattern: SynthesisPattern,
    goal: string,
    executionPlan: ExecutionPlan
  ): SkillGenome {
    const id = this.generateSkillId();
    const name = this.generateSkillName(skills, pattern, goal);
    const now = Date.now();

    // Derive input schema from first skill(s) or merge
    const inputSchema = this.deriveInputSchema(skills, pattern);

    // Derive output schema from last skill(s) or merge
    const outputSchema = this.deriveOutputSchema(skills, pattern);

    // Create handler that executes the plan
    const handler = this.createPlanHandler(executionPlan, pattern);

    // Aggregate dependencies
    const dependencies = this.aggregateDependencies(skills);

    // Create MCP resource
    const mcpResource = this.createMCPResource(id, name, goal, inputSchema);

    // Create portability spec
    const portability = this.createPortabilitySpec(skills);

    // Create origin
    const origin: SkillOrigin = {
      type: 'synthesized',
      parentSkills: skills.map((s) => s.id),
      synthesisPattern: pattern,
      createdAt: now,
    };

    const skill: SkillGenome = {
      id,
      version: '1.0.0',
      name,
      description: `Synthesized skill: ${goal}. Composed from ${skills.length} skills using ${pattern} pattern.`,
      tags: ['synthesized', pattern, ...this.extractUniqueTags(skills)],
      inputSchema,
      outputSchema,
      handler,
      dependencies,
      runtime: 'async',
      timeoutMs: executionPlan.estimatedTimeMs,
      mcpResource,
      portability,
      origin,
      checksum: '', // Will be computed
      dqScore: 0, // Will be set after validation
      createdAt: now,
      updatedAt: now,
    };

    // Compute checksum
    skill.checksum = skillGenomeCodec.computeChecksum(skill);

    return skill;
  }

  /**
   * Derive input schema based on pattern.
   */
  private deriveInputSchema(skills: SkillGenome[], pattern: SynthesisPattern): JSONSchema {
    switch (pattern) {
      case 'sequential':
        // Input is first skill's input
        return skills[0].inputSchema;

      case 'parallel':
        // Input is shared, use first skill or merge all required inputs
        return this.mergeSchemas(skills.map((s) => s.inputSchema));

      case 'conditional': {
        // Input includes condition plus merged branch inputs
        const conditionSchema: JSONSchema = {
          type: 'object',
          properties: {
            condition: {
              type: 'string',
              description: 'Condition to evaluate for branch selection',
            },
            input: this.mergeSchemas(skills.map((s) => s.inputSchema)),
          },
          required: ['condition', 'input'],
        };
        return conditionSchema;
      }

      case 'feedback_loop':
        // Input is executor's input
        return skills[0].inputSchema;

      default:
        return skills[0].inputSchema;
    }
  }

  /**
   * Derive output schema based on pattern.
   */
  private deriveOutputSchema(skills: SkillGenome[], pattern: SynthesisPattern): JSONSchema {
    switch (pattern) {
      case 'sequential':
        // Output is last skill's output
        return skills[skills.length - 1].outputSchema;

      case 'parallel':
        // Output is merged from all skills
        return {
          type: 'object',
          properties: skills.reduce(
            (acc, skill, i) => {
              acc[`result_${i}`] = skill.outputSchema;
              return acc;
            },
            {} as Record<string, JSONSchema>
          ),
        };

      case 'conditional':
        // Output is union of all branch outputs (they're mutually exclusive)
        return this.mergeSchemas(skills.map((s) => s.outputSchema));

      case 'feedback_loop':
        // Output is final executor output after refinement
        return skills[0].outputSchema;

      default:
        return skills[skills.length - 1].outputSchema;
    }
  }

  /**
   * Create handler function for execution plan.
   */
  private createPlanHandler(
    executionPlan: ExecutionPlan,
    pattern: SynthesisPattern
  ): SerializedFunction {
    const planJson = JSON.stringify(
      {
        steps: executionPlan.steps,
        estimatedTimeMs: executionPlan.estimatedTimeMs,
      },
      null,
      2
    );

    // Generate handler body based on pattern
    let body: string;

    switch (pattern) {
      case 'sequential':
        body = `
          const plan = ${planJson};
          const results = new Map();
          let currentInput = input;

          for (const step of plan.steps) {
            const skill = await skillRegistry.get(step.skillId);
            if (!skill) throw new Error('Skill not found: ' + step.skillId);

            const stepInput = step.inputMapping._previousOutput
              ? results.get(step.dependsOn[0]) || currentInput
              : currentInput;

            const result = await executeSkill(skill, stepInput, context);
            results.set(step.id, result);
            currentInput = result;
          }

          return results.get(plan.steps[plan.steps.length - 1].id);
        `;
        break;

      case 'parallel':
        body = `
          const plan = ${planJson};
          const parallelSteps = plan.steps.filter(s => s.skillId !== '__merge__');
          const mergeStep = plan.steps.find(s => s.skillId === '__merge__');

          const promises = parallelSteps.map(async (step) => {
            const skill = await skillRegistry.get(step.skillId);
            if (!skill) throw new Error('Skill not found: ' + step.skillId);
            return { stepId: step.id, result: await executeSkill(skill, input, context) };
          });

          const results = await Promise.all(promises);
          const merged = {};
          results.forEach((r, i) => { merged['result_' + i] = r.result; });

          return merged;
        `;
        break;

      case 'conditional':
        body = `
          const plan = ${planJson};
          const { condition, input: branchInput } = input;
          const branchIndex = evaluateCondition(condition, branchInput, context);
          const branchStep = plan.steps.find(s => s.id === 'cond_branch_' + branchIndex);

          if (!branchStep) throw new Error('Invalid branch: ' + branchIndex);

          const skill = await skillRegistry.get(branchStep.skillId);
          if (!skill) throw new Error('Skill not found: ' + branchStep.skillId);

          return await executeSkill(skill, branchInput, context);
        `;
        break;

      case 'feedback_loop':
        body = `
          const plan = ${planJson};
          const maxIterations = context.maxIterations || 5;
          const dqThreshold = context.dqThreshold || 0.7;

          let currentInput = input;
          let iteration = 0;
          let dqScore = 0;

          const executorSkill = await skillRegistry.get(plan.steps[0].skillId);
          const criticSkill = await skillRegistry.get(plan.steps[plan.steps.length - 2].skillId);

          while (iteration < maxIterations && dqScore < dqThreshold) {
            const executorResult = await executeSkill(executorSkill, {
              ...currentInput,
              _feedback: iteration > 0 ? lastFeedback : null,
              _iteration: iteration
            }, context);

            const criticResult = await executeSkill(criticSkill, {
              _input: executorResult,
              _goal: context.goal,
              _iteration: iteration
            }, context);

            dqScore = criticResult.dqScore || computeDQScore(criticResult);
            lastFeedback = criticResult.feedback;
            currentInput = { ...currentInput, _refinement: criticResult.suggestions };
            iteration++;

            if (dqScore >= dqThreshold) {
              return executorResult;
            }
          }

          return await executeSkill(executorSkill, currentInput, context);
        `;
        break;

      default:
        body = 'throw new Error("Unknown pattern");';
    }

    return {
      body: body.trim(),
      params: ['input', 'context', 'skillRegistry', 'executeSkill', 'evaluateCondition', 'computeDQScore'],
      isAsync: true,
    };
  }

  // ---------------------------------------------------------------------------
  // Validation Helpers
  // ---------------------------------------------------------------------------

  /**
   * Validate skills are compatible for the given pattern.
   */
  private validateCompatibility(skills: SkillGenome[], pattern: SynthesisPattern): void {
    if (skills.length === 0) {
      throw new Error('No skills provided for synthesis');
    }

    switch (pattern) {
      case 'sequential':
        // Each skill's output must be compatible with next skill's input
        for (let i = 0; i < skills.length - 1; i++) {
          const current = skills[i];
          const next = skills[i + 1];
          if (!this.schemasCompatible(current.outputSchema, next.inputSchema)) {
            throw new Error(
              `Schema incompatibility: ${current.name} output not compatible with ${next.name} input`
            );
          }
        }
        break;

      case 'conditional':
        if (skills.length < 2) {
          throw new Error('Conditional pattern requires at least 2 skills');
        }
        break;

      case 'feedback_loop':
        if (skills.length < 2) {
          throw new Error('Feedback loop requires at least 2 skills (executor + critic)');
        }
        break;

      // parallel has no specific constraints
    }
  }

  /**
   * Check if output schema is compatible with input schema.
   */
  private schemasCompatible(output: JSONSchema, input: JSONSchema): boolean {
    // Basic compatibility: output type matches input type
    if (output.type !== input.type) {
      // Allow object -> object even if properties differ
      if (output.type !== 'object' || input.type !== 'object') {
        return false;
      }
    }

    // If input has required properties, check output provides them
    if (input.required && output.properties) {
      for (const required of input.required) {
        if (!output.properties[required]) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Compute validity component of DQ score.
   */
  private computeValidity(skill: SkillGenome): number {
    let score = 1.0;

    // Check handler
    if (!skill.handler.body || skill.handler.body.length < 10) {
      score -= 0.3;
    }

    // Check schemas
    if (!skill.inputSchema.type) score -= 0.2;
    if (!skill.outputSchema.type) score -= 0.2;

    // Check MCP resource
    if (!skill.mcpResource.uri.startsWith('mcp://')) score -= 0.1;

    // Check checksum
    if (!skill.checksum) score -= 0.2;

    return Math.max(0, score);
  }

  /**
   * Compute specificity component of DQ score.
   */
  private computeSpecificity(skill: SkillGenome): number {
    let score = 0;

    // Description length and quality
    if (skill.description.length > 50) score += 0.3;
    if (skill.description.length > 100) score += 0.1;

    // Tags
    if (skill.tags.length >= 2) score += 0.2;
    if (skill.tags.length >= 4) score += 0.1;

    // Schema properties defined
    if (skill.inputSchema.properties && Object.keys(skill.inputSchema.properties).length > 0) {
      score += 0.15;
    }
    if (skill.outputSchema.properties && Object.keys(skill.outputSchema.properties).length > 0) {
      score += 0.15;
    }

    return Math.min(1, score);
  }

  /**
   * Compute correctness component of DQ score.
   */
  private computeCorrectness(skill: SkillGenome): number {
    let score = 1.0;

    // Origin validation
    if (skill.origin.type === 'synthesized') {
      if (!skill.origin.parentSkills || skill.origin.parentSkills.length === 0) {
        score -= 0.3;
      }
      if (!skill.origin.synthesisPattern) {
        score -= 0.2;
      }
    }

    // Runtime specified
    if (!['sync', 'async'].includes(skill.runtime)) {
      score -= 0.2;
    }

    // Timeout reasonable
    if (skill.timeoutMs <= 0 || skill.timeoutMs > 300000) {
      score -= 0.1;
    }

    // Dependencies valid (have skillId)
    for (const dep of skill.dependencies) {
      if (!dep.skillId) {
        score -= 0.1;
        break;
      }
    }

    return Math.max(0, score);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Resolve skill IDs to SkillGenome objects.
   */
  private resolveSkills(skillIds: string[]): SkillGenome[] {
    const skills: SkillGenome[] = [];

    for (const id of skillIds) {
      let skill = this.registry.get(id);
      if (!skill) {
        skill = this.registry.getByName(id);
      }
      if (skill) {
        skills.push(skill);
      }
    }

    return skills;
  }

  /**
   * Generate unique skill ID.
   */
  private generateSkillId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `syn_${timestamp}_${random}`;
  }

  /**
   * Generate skill name from components.
   */
  private generateSkillName(
    skills: SkillGenome[],
    pattern: SynthesisPattern,
    goal: string
  ): string {
    const patternPrefix = {
      sequential: 'Seq',
      parallel: 'Par',
      conditional: 'Cond',
      feedback_loop: 'Loop',
    }[pattern];

    // Extract key words from goal
    const goalWords = goal
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('');

    return `${patternPrefix}${goalWords}_${skills.length}skills`;
  }

  /**
   * Merge multiple JSON schemas.
   */
  private mergeSchemas(schemas: JSONSchema[]): JSONSchema {
    const merged: JSONSchema = {
      type: 'object',
      properties: {},
      required: [],
    };

    for (const schema of schemas) {
      if (schema.properties) {
        merged.properties = { ...merged.properties, ...schema.properties };
      }
      if (schema.required) {
        merged.required = Array.from(new Set([...(merged.required || []), ...schema.required]));
      }
    }

    return merged;
  }

  /**
   * Extract unique tags from skills.
   */
  private extractUniqueTags(skills: SkillGenome[]): string[] {
    const tags = new Set<string>();
    for (const skill of skills) {
      for (const tag of skill.tags) {
        tags.add(tag);
      }
    }
    return Array.from(tags).slice(0, 10); // Limit to 10 tags
  }

  /**
   * Aggregate dependencies from all skills.
   */
  private aggregateDependencies(skills: SkillGenome[]): SkillRef[] {
    const deps = new Map<string, SkillRef>();

    for (const skill of skills) {
      for (const dep of skill.dependencies) {
        if (!deps.has(dep.skillId)) {
          deps.set(dep.skillId, dep);
        }
      }
      // Also add the skill itself as a dependency
      deps.set(skill.id, {
        skillId: skill.id,
        versionRange: `^${skill.version}`,
        optional: false,
      });
    }

    return Array.from(deps.values());
  }

  /**
   * Create MCP resource for skill.
   */
  private createMCPResource(
    id: string,
    name: string,
    goal: string,
    inputSchema: JSONSchema
  ): MCPSkillResource {
    return {
      uri: `mcp://agent-genome/skills/${id}`,
      mimeType: 'application/json',
      toolSchema: {
        name: `genome_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        description: goal,
        inputSchema,
      },
    };
  }

  /**
   * Create portability spec from composed skills.
   */
  private createPortabilitySpec(skills: SkillGenome[]): PortabilitySpec {
    // Aggregate compatible subsystems (intersection)
    const compatibleSubsystems = skills.reduce<SubsystemType[]>(
      (acc, skill, i) => {
        if (i === 0) return skill.portability.compatibility;
        return acc.filter((s) => skill.portability.compatibility.includes(s));
      },
      []
    );

    // Aggregate required context (union)
    const requiredContext = new Set<string>();
    for (const skill of skills) {
      for (const ctx of skill.portability.requiresContext) {
        requiredContext.add(ctx);
      }
    }

    return {
      isPortable: compatibleSubsystems.length > 0,
      requiresContext: Array.from(requiredContext),
      compatibility: compatibleSubsystems,
      orthogonalDimensions: [], // Will be computed separately
    };
  }

  /**
   * Iterate feedback loop until DQ threshold met.
   */
  private async iterateFeedbackLoop(
    skills: SkillGenome[],
    goal: string,
    initialValidation: DQScore,
    startTime: number
  ): Promise<{ iterations: number }> {
    let iterations = 1;
    let currentScore = initialValidation.score;

    while (
      currentScore < this.config.defaultDQThreshold &&
      iterations < this.config.maxFeedbackIterations
    ) {
      // In a real implementation, this would re-execute the synthesis
      // with feedback from the previous iteration
      iterations++;

      // Simulate improvement (in practice, this would be actual re-synthesis)
      currentScore = Math.min(1, currentScore + 0.1);

      // Check timeout
      if (Date.now() - startTime > this.config.synthesisTimeoutMs) {
        break;
      }
    }

    return { iterations };
  }

  /**
   * Generate cache key for synthesis request.
   */
  private getCacheKey(baseSkills: string[], pattern: SynthesisPattern, goal: string): string {
    return `${baseSkills.sort().join('|')}:${pattern}:${goal}`;
  }

  /**
   * Clear synthesis cache.
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// =============================================================================
// FACTORY AND SINGLETON
// =============================================================================

/**
 * Create a SkillWeaver instance with a registry.
 */
export function createSkillWeaver(
  registry: SkillRegistry,
  config?: Partial<SkillWeaverConfig>
): SkillWeaver {
  return new SkillWeaver(registry, config);
}

/**
 * In-memory skill registry implementation.
 */
export class InMemorySkillRegistry implements SkillRegistry {
  private skills: Map<string, SkillGenome> = new Map();
  private nameIndex: Map<string, string> = new Map();

  register(skill: SkillGenome): void {
    this.skills.set(skill.id, skill);
    this.nameIndex.set(skill.name.toLowerCase(), skill.id);
  }

  unregister(skillId: string): boolean {
    const skill = this.skills.get(skillId);
    if (skill) {
      this.skills.delete(skillId);
      this.nameIndex.delete(skill.name.toLowerCase());
      return true;
    }
    return false;
  }

  get(skillId: string): SkillGenome | undefined {
    return this.skills.get(skillId);
  }

  getByName(name: string): SkillGenome | undefined {
    const id = this.nameIndex.get(name.toLowerCase());
    return id ? this.skills.get(id) : undefined;
  }

  getAll(): SkillGenome[] {
    return Array.from(this.skills.values());
  }

  clear(): void {
    this.skills.clear();
    this.nameIndex.clear();
  }

  size(): number {
    return this.skills.size;
  }
}
