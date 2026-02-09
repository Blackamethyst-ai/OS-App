/**
 * JUDGE AGENT
 *
 * Evaluates generated UI layouts against task efficiency metrics.
 * Uses LLM to assess whether a layout is optimal for the user's current task.
 *
 * Reference: AUI (arXiv:2511.15567) - Computer-Use Agents as Judges
 */

import { getAI, safeParseJson } from '../geminiService';
import {
  UILayoutSpec,
  UIEvaluation,
  UIImprovement,
  AUIGenerationContext,
  AUIEvent,
  AUIEventType,
} from './types';
import { logger } from '../logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const JUDGE_MODEL = 'gemini-2.0-flash';
const EVALUATION_TIMEOUT_MS = 2000;
const MAX_ITERATIONS = 3;

// Minimum scores for verdicts
const VERDICT_THRESHOLDS = {
  OPTIMAL: 85,
  ACCEPTABLE: 70,
  SUBOPTIMAL: 50,
};

// ============================================================================
// JUDGE AGENT SERVICE
// ============================================================================

class JudgeAgentService {
  private eventHandlers: Map<AUIEventType, Set<(event: AUIEvent) => void>> = new Map();
  private evaluationHistory: UIEvaluation[] = [];
  private iterationCount: number = 0;

  // ============================================================================
  // LAYOUT EVALUATION
  // ============================================================================

  /**
   * Evaluate a generated layout against task efficiency metrics
   */
  async evaluateLayout(
    layout: UILayoutSpec,
    context: AUIGenerationContext
  ): Promise<UIEvaluation> {
    const startTime = performance.now();
    this.emit('EVALUATION_STARTED', { layout, context });

    try {
      const evaluation = await this.performEvaluation(layout, context);
      const latency = performance.now() - startTime;

      if (import.meta.env.DEV) console.log(`JUDGE: Evaluation complete in ${latency.toFixed(0)}ms - Score: ${evaluation.score}`);

      this.evaluationHistory.push(evaluation);
      if (this.evaluationHistory.length > 50) {
        this.evaluationHistory = this.evaluationHistory.slice(-25);
      }

      this.emit('EVALUATION_COMPLETE', { evaluation, latencyMs: latency });

      return evaluation;
    } catch (error: any) {
      logger.error('Evaluation failed', error, 'JUDGE');
      return this.getFallbackEvaluation(layout);
    }
  }

  /**
   * Perform LLM-based evaluation
   */
  private async performEvaluation(
    layout: UILayoutSpec,
    context: AUIGenerationContext
  ): Promise<UIEvaluation> {
    const ai = getAI();

    const prompt = this.buildEvaluationPrompt(layout, context);

    try {
      const response = await Promise.race([
        ai.models.generateContent({
          model: JUDGE_MODEL,
          contents: prompt,
          config: {
            systemInstruction: this.getSystemInstruction(),
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Evaluation timeout')), EVALUATION_TIMEOUT_MS)
        ),
      ]);

      const result = safeParseJson<Partial<UIEvaluation>>(response.text);
      return this.validateAndComplete(result, layout);
    } catch (error) {
      logger.warn('LLM evaluation failed, using rule-based', error, 'JUDGE');
      return this.ruleBasedEvaluation(layout, context);
    }
  }

  /**
   * Build evaluation prompt
   */
  private buildEvaluationPrompt(
    layout: UILayoutSpec,
    context: AUIGenerationContext
  ): string {
    const componentsInfo = layout.regions
      .flatMap(r => r.components)
      .map(c => `- ${c.type} (priority: ${c.priority}, relevance: ${c.contextualRelevance}%, visible: ${c.visible})`)
      .join('\n');

    return `Evaluate this UI layout for optimal user experience:

LAYOUT:
- Theme: ${layout.theme}
- Animation Level: ${layout.animationLevel}
- Generation Reason: ${layout.generationReason}
- Visible Panels: ${layout.visiblePanels.join(', ') || 'None'}
- Hidden Panels: ${layout.hiddenPanels.join(', ') || 'None'}

COMPONENTS:
${componentsInfo}

USER STATE:
- Stress Level: ${context.stressLevel}% (${context.stressTrend})
- Attention Score: ${context.attentionScore}%
- Cognitive Load: ${context.cognitiveLoad}%
- Current Task: ${context.activeTask || 'Unknown'}
- Gaze Target: ${context.gazeSemantics?.primaryTarget?.semanticLabel || 'Unknown'}

EVALUATE:
1. Task Alignment (0-100): Does the UI support the user's current task?
2. Cognitive Load (0-100): Is the UI complexity appropriate for user's state?
3. Gaze Efficiency (0-100): Can user easily find what they're looking at?
4. Stress Response (0-100): Does UI help reduce stress if stress is high?

Respond with JSON:
{
  "score": 0-100,
  "verdict": "OPTIMAL|ACCEPTABLE|SUBOPTIMAL|POOR",
  "taskAlignment": 0-100,
  "cognitiveLoad": 0-100,
  "gazeEfficiency": 0-100,
  "stressResponse": 0-100,
  "improvements": [
    { "type": "SHOW_PANEL|HIDE_PANEL|RESIZE|REORDER|HIGHLIGHT|SIMPLIFY|EXPAND", "target": "component-id", "rationale": "reason", "priority": "CRITICAL|HIGH|MEDIUM|LOW" }
  ],
  "reasoning": "Brief explanation of evaluation",
  "iterationSuggested": true/false
}`;
  }

  /**
   * System instruction for judge
   */
  private getSystemInstruction(): string {
    return `You are a UI Judge Agent that evaluates adaptive user interface layouts.

EVALUATION PRINCIPLES:
1. HIGH STRESS users need SIMPLER UIs - fewer panels, larger text, calm colors
2. FOCUSED users should have their gaze target maximized and distractions minimized
3. CONFUSED users (erratic gaze) need clearer hierarchy and navigation aids
4. HIGH COGNITIVE LOAD users need reduced information density
5. UI should ADAPT to biometrics, not fight them

SCORING GUIDE:
- 90-100: Optimal - UI perfectly supports user's state and task
- 70-89: Acceptable - Minor improvements possible but functional
- 50-69: Suboptimal - Significant issues that impact usability
- 0-49: Poor - UI actively hinders user's task

Always respond with valid JSON. Be specific with improvement suggestions.`;
  }

  /**
   * Rule-based evaluation fallback
   */
  private ruleBasedEvaluation(
    layout: UILayoutSpec,
    context: AUIGenerationContext
  ): UIEvaluation {
    let score = 70; // Base score
    const improvements: UIImprovement[] = [];

    // Task Alignment
    let taskAlignment = 70;
    const gazeTarget = context.gazeSemantics?.primaryTarget;
    if (gazeTarget) {
      const hasTargetComponent = layout.regions
        .flatMap(r => r.components)
        .some(c => c.contextualRelevance > 70);

      if (hasTargetComponent) {
        taskAlignment = 85;
      } else {
        taskAlignment = 55;
        improvements.push({
          type: 'SHOW_PANEL',
          target: gazeTarget.elementId,
          rationale: 'User is looking at this element but it has low visibility',
          priority: 'HIGH',
        });
      }
    }

    // Cognitive Load
    let cognitiveLoadScore = 70;
    const visibleCount = layout.regions.flatMap(r => r.components).filter(c => c.visible).length;

    if (context.cognitiveLoad > 75) {
      // High cognitive load - should have fewer elements
      if (visibleCount > 5) {
        cognitiveLoadScore = 50;
        improvements.push({
          type: 'SIMPLIFY',
          target: 'layout',
          rationale: 'Too many visible elements for high cognitive load',
          priority: 'HIGH',
        });
      } else {
        cognitiveLoadScore = 85;
      }
    } else {
      // Normal cognitive load
      if (visibleCount < 3) {
        cognitiveLoadScore = 60;
        improvements.push({
          type: 'EXPAND',
          target: 'layout',
          rationale: 'Could show more information given low cognitive load',
          priority: 'LOW',
        });
      }
    }

    // Gaze Efficiency
    let gazeEfficiency = 70;
    if (gazeTarget && layout.focusPriority.includes(gazeTarget.elementId)) {
      gazeEfficiency = 90;
    } else if (gazeTarget) {
      gazeEfficiency = 55;
      improvements.push({
        type: 'HIGHLIGHT',
        target: gazeTarget.elementId,
        rationale: 'Gaze target should be prioritized in layout',
        priority: 'MEDIUM',
      });
    }

    // Stress Response
    let stressResponse = 70;
    if (context.stressLevel > 70) {
      if (layout.theme === 'MINIMAL' || layout.animationLevel === 'REDUCED') {
        stressResponse = 85;
      } else {
        stressResponse = 50;
        improvements.push({
          type: 'SIMPLIFY',
          target: 'theme',
          rationale: 'High stress - should use minimal theme',
          priority: 'CRITICAL',
        });
      }
    }

    // Calculate final score
    score = Math.round(
      (taskAlignment * 0.35) +
      (cognitiveLoadScore * 0.25) +
      (gazeEfficiency * 0.25) +
      (stressResponse * 0.15)
    );

    // Determine verdict
    let verdict: UIEvaluation['verdict'] = 'ACCEPTABLE';
    if (score >= VERDICT_THRESHOLDS.OPTIMAL) verdict = 'OPTIMAL';
    else if (score >= VERDICT_THRESHOLDS.ACCEPTABLE) verdict = 'ACCEPTABLE';
    else if (score >= VERDICT_THRESHOLDS.SUBOPTIMAL) verdict = 'SUBOPTIMAL';
    else verdict = 'POOR';

    return {
      layoutId: layout.id,
      score,
      verdict,
      taskAlignment,
      cognitiveLoad: cognitiveLoadScore,
      gazeEfficiency,
      stressResponse,
      improvements,
      reasoning: this.generateReasoning(score, verdict, improvements),
      iterationSuggested: verdict === 'SUBOPTIMAL' || verdict === 'POOR',
    };
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    score: number,
    verdict: UIEvaluation['verdict'],
    improvements: UIImprovement[]
  ): string {
    const criticalCount = improvements.filter(i => i.priority === 'CRITICAL').length;
    const highCount = improvements.filter(i => i.priority === 'HIGH').length;

    if (verdict === 'OPTIMAL') {
      return 'Layout is well-optimized for current user state and task.';
    } else if (verdict === 'ACCEPTABLE') {
      return `Layout is functional with ${improvements.length} minor improvements possible.`;
    } else if (verdict === 'SUBOPTIMAL') {
      return `Layout has ${highCount} significant issues. ${criticalCount > 0 ? `${criticalCount} critical.` : ''}`;
    } else {
      return `Layout is poor for current context. ${criticalCount} critical issues require immediate attention.`;
    }
  }

  /**
   * Validate and complete partial evaluation
   */
  private validateAndComplete(
    partial: Partial<UIEvaluation>,
    layout: UILayoutSpec
  ): UIEvaluation {
    const score = partial.score ?? 70;

    let verdict: UIEvaluation['verdict'] = 'ACCEPTABLE';
    if (score >= VERDICT_THRESHOLDS.OPTIMAL) verdict = 'OPTIMAL';
    else if (score >= VERDICT_THRESHOLDS.ACCEPTABLE) verdict = 'ACCEPTABLE';
    else if (score >= VERDICT_THRESHOLDS.SUBOPTIMAL) verdict = 'SUBOPTIMAL';
    else verdict = 'POOR';

    return {
      layoutId: layout.id,
      score,
      verdict: partial.verdict || verdict,
      taskAlignment: partial.taskAlignment ?? 70,
      cognitiveLoad: partial.cognitiveLoad ?? 70,
      gazeEfficiency: partial.gazeEfficiency ?? 70,
      stressResponse: partial.stressResponse ?? 70,
      improvements: partial.improvements || [],
      reasoning: partial.reasoning || 'Evaluation completed.',
      iterationSuggested: partial.iterationSuggested ?? (score < VERDICT_THRESHOLDS.ACCEPTABLE),
    };
  }

  /**
   * Get fallback evaluation
   */
  private getFallbackEvaluation(layout: UILayoutSpec): UIEvaluation {
    return {
      layoutId: layout.id,
      score: 70,
      verdict: 'ACCEPTABLE',
      taskAlignment: 70,
      cognitiveLoad: 70,
      gazeEfficiency: 70,
      stressResponse: 70,
      improvements: [],
      reasoning: 'Fallback evaluation - unable to fully analyze layout.',
      iterationSuggested: false,
    };
  }

  // ============================================================================
  // ITERATION CONTROL
  // ============================================================================

  /**
   * Check if iteration should continue
   */
  shouldIterate(evaluation: UIEvaluation): boolean {
    if (this.iterationCount >= MAX_ITERATIONS) {
      if (import.meta.env.DEV) console.log('JUDGE: Max iterations reached');
      return false;
    }

    if (evaluation.verdict === 'OPTIMAL' || evaluation.verdict === 'ACCEPTABLE') {
      return false;
    }

    return evaluation.iterationSuggested;
  }

  /**
   * Start new evaluation cycle
   */
  startCycle(): void {
    this.iterationCount = 0;
  }

  /**
   * Increment iteration count
   */
  incrementIteration(): void {
    this.iterationCount++;
    this.emit('ITERATION_TRIGGERED', { iteration: this.iterationCount });
  }

  /**
   * Get current iteration count
   */
  getIterationCount(): number {
    return this.iterationCount;
  }

  /**
   * Get evaluation history
   */
  getHistory(): UIEvaluation[] {
    return [...this.evaluationHistory];
  }

  // ============================================================================
  // EVENT SYSTEM
  // ============================================================================

  on(eventType: AUIEventType, handler: (event: AUIEvent) => void): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);
    return () => this.eventHandlers.get(eventType)?.delete(handler);
  }

  private emit(type: AUIEventType, payload: any): void {
    const event: AUIEvent = {
      id: crypto.randomUUID(),
      type,
      timestamp: Date.now(),
      payload,
    };

    this.eventHandlers.get(type)?.forEach(handler => {
      try {
        handler(event);
      } catch (e) {
        logger.error('Event handler error', e, 'JUDGE');
      }
    });
  }
}

// Singleton export
export const judgeAgent = new JudgeAgentService();
