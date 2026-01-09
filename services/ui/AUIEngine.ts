/**
 * AUI ENGINE - Adaptive User Interface Generator
 *
 * LLM-driven layout generator that synthesizes optimal React component trees
 * based on biometric state, gaze semantics, and task context.
 *
 * Reference: AUI (arXiv:2511.15567) - Computer-Use Agents as Judges
 */

import { getAI, safeParseJson } from '../geminiService';
import {
  UILayoutSpec,
  UIRegion,
  UIComponentSpec,
  AUIGenerationContext,
  BiometricTrigger,
  GazeSemanticContext,
  AUIEvent,
  AUIEventType,
} from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const AUI_MODEL = 'gemini-2.0-flash';
const GENERATION_TIMEOUT_MS = 3000;
const MAX_GENERATION_RETRIES = 2;

// Available components that can be synthesized
const AVAILABLE_COMPONENTS = [
  'BiometricPanel',
  'TerminalOutput',
  'CodeEditor',
  'MetricsChart',
  'NavigationTabs',
  'StatusIndicator',
  'ActionButton',
  'ContextPanel',
  'FileExplorer',
  'AgentStatus',
  'AlertBanner',
  'QuickActions',
  'FocusOverlay',
] as const;

// ============================================================================
// AUI ENGINE
// ============================================================================

class AUIEngineService {
  private eventHandlers: Map<AUIEventType, Set<(event: AUIEvent) => void>> = new Map();
  private currentLayout: UILayoutSpec | null = null;
  private generationInProgress: boolean = false;
  private lastGenerationTime: number = 0;
  private generationCooldownMs: number = 1000;

  // ============================================================================
  // LAYOUT GENERATION
  // ============================================================================

  /**
   * Generate an optimal UI layout based on current context
   */
  async generateLayout(context: AUIGenerationContext): Promise<UILayoutSpec> {
    // Cooldown check
    const now = Date.now();
    if (now - this.lastGenerationTime < this.generationCooldownMs) {
      console.log('AUI: Generation cooldown active, returning current layout');
      return this.currentLayout || this.getDefaultLayout();
    }

    if (this.generationInProgress) {
      console.log('AUI: Generation already in progress');
      return this.currentLayout || this.getDefaultLayout();
    }

    this.generationInProgress = true;
    this.lastGenerationTime = now;
    this.emit('REGENERATION_STARTED', { context });

    const startTime = performance.now();

    try {
      const layout = await this.synthesizeLayout(context);
      const latency = performance.now() - startTime;

      console.log(`AUI: Layout generated in ${latency.toFixed(0)}ms`);
      this.currentLayout = layout;
      this.emit('REGENERATION_COMPLETE', { layout, latencyMs: latency });

      return layout;
    } catch (error) {
      console.error('AUI: Layout generation failed', error);
      return this.currentLayout || this.getDefaultLayout();
    } finally {
      this.generationInProgress = false;
    }
  }

  /**
   * Core synthesis logic using LLM
   */
  private async synthesizeLayout(context: AUIGenerationContext): Promise<UILayoutSpec> {
    const ai = getAI();

    const prompt = this.buildGenerationPrompt(context);

    try {
      const response = await Promise.race([
        ai.models.generateContent({
          model: AUI_MODEL,
          contents: prompt,
          config: {
            systemInstruction: this.getSystemInstruction(),
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Generation timeout')), GENERATION_TIMEOUT_MS)
        ),
      ]);

      const layoutSpec = safeParseJson<Partial<UILayoutSpec>>(response.text);
      return this.validateAndComplete(layoutSpec, context);
    } catch (error: any) {
      console.error('AUI: LLM generation failed', error.message);
      // Fallback to rule-based generation
      return this.generateRuleBasedLayout(context);
    }
  }

  /**
   * Build the generation prompt from context
   */
  private buildGenerationPrompt(context: AUIGenerationContext): string {
    const gazeInfo = context.gazeSemantics
      ? `
User Gaze:
- Looking at: ${context.gazeSemantics.primaryTarget?.semanticLabel || 'Unknown'}
- Element type: ${context.gazeSemantics.primaryTarget?.elementType || 'Unknown'}
- Intent: ${context.gazeSemantics.primaryTarget?.inferredIntent || 'Unknown'}
- Pattern: ${context.gazeSemantics.gazePattern}
- Inferred task: ${context.gazeSemantics.inferredTask}`
      : 'No gaze data available';

    return `Generate an optimal UI layout for the following user state:

BIOMETRIC STATE:
- Stress Level: ${context.stressLevel}% (trend: ${context.stressTrend})
- Attention Score: ${context.attentionScore}%
- Cognitive Load: ${context.cognitiveLoad}%

${gazeInfo}

CONTEXT:
- Current Mode: ${context.currentMode}
- Active Task: ${context.activeTask || 'None'}
- Recent Actions: ${context.recentActions.slice(-3).join(', ') || 'None'}
- User Complexity Preference: ${context.preferredComplexity}

AVAILABLE COMPONENTS: ${AVAILABLE_COMPONENTS.join(', ')}

Generate a UILayoutSpec JSON that:
1. Prioritizes components relevant to the user's current gaze target
2. Reduces complexity if stress is high (>70%)
3. Expands relevant panels if user is focused
4. Hides distractions if cognitive load is high
5. Maintains good visual hierarchy

Response format (JSON only):
{
  "regions": [
    {
      "id": "main",
      "type": "MAIN",
      "position": { "x": 0, "y": 0, "width": "100%", "height": "100%" },
      "components": [
        {
          "id": "component-id",
          "type": "ComponentName",
          "props": {},
          "visible": true,
          "priority": 1,
          "contextualRelevance": 80,
          "transitionStyle": "FADE"
        }
      ],
      "priority": 1,
      "collapsible": false,
      "collapsed": false
    }
  ],
  "visiblePanels": ["panel-ids"],
  "hiddenPanels": ["hidden-ids"],
  "focusPriority": ["ordered-by-importance"],
  "theme": "DEFAULT|MINIMAL|FOCUS|DENSE",
  "animationLevel": "FULL|REDUCED|NONE",
  "generationReason": "Brief explanation"
}`;
  }

  /**
   * System instruction for layout generation
   */
  private getSystemInstruction(): string {
    return `You are an Adaptive UI Engine that generates optimal interface layouts based on user biometrics and behavior.

PRINCIPLES:
1. STRESS RESPONSE: High stress (>70%) → Simplify UI, hide non-essential panels, use calm colors
2. FOCUS SUPPORT: When user is fixated on an element → Maximize that element, minimize distractions
3. COGNITIVE LOAD: High load → Reduce information density, increase whitespace
4. GAZE FOLLOWING: Elements the user looks at should be prioritized and accessible
5. SMOOTH TRANSITIONS: Use appropriate transition styles for morphing

OUTPUT: Always respond with valid JSON for a UILayoutSpec. No markdown, no explanation.`;
  }

  /**
   * Validate and complete a partial layout spec
   */
  private validateAndComplete(
    partial: Partial<UILayoutSpec>,
    context: AUIGenerationContext
  ): UILayoutSpec {
    const now = Date.now();

    return {
      id: `layout-${now}`,
      version: 1,
      timestamp: now,
      regions: partial.regions || this.getDefaultRegions(context),
      visiblePanels: partial.visiblePanels || [],
      hiddenPanels: partial.hiddenPanels || [],
      focusPriority: partial.focusPriority || [],
      theme: partial.theme || this.selectTheme(context),
      colorAccent: partial.colorAccent || '#9d4edd',
      animationLevel: partial.animationLevel || (context.stressLevel > 70 ? 'REDUCED' : 'FULL'),
      generationReason: partial.generationReason || 'Synthesized layout',
      biometricTrigger: this.identifyTrigger(context),
      confidence: 0.85,
    };
  }

  /**
   * Rule-based fallback layout generation
   */
  private generateRuleBasedLayout(context: AUIGenerationContext): UILayoutSpec {
    const regions: UIRegion[] = [];
    const visiblePanels: string[] = [];
    const hiddenPanels: string[] = [];
    const focusPriority: string[] = [];

    // Determine stress-based complexity
    const isHighStress = context.stressLevel > 70;
    const isHighCognitiveLoad = context.cognitiveLoad > 75;
    const isFocused = context.gazeSemantics?.gazePattern === 'FIXATED';

    // Main content region
    const mainComponents: UIComponentSpec[] = [];

    // Always show biometric panel (but maybe compact)
    mainComponents.push({
      id: 'biometric-panel',
      type: 'BiometricPanel',
      props: { compact: isHighStress, showControls: !isHighStress },
      visible: true,
      priority: 1,
      contextualRelevance: 90,
      transitionStyle: 'FADE',
    });

    // Add gaze-targeted component with high priority
    if (context.gazeSemantics?.primaryTarget) {
      const target = context.gazeSemantics.primaryTarget;
      const componentType = this.mapElementTypeToComponent(target.elementType);

      if (componentType) {
        mainComponents.push({
          id: `focus-${target.elementId}`,
          type: componentType,
          props: { expanded: isFocused, highlighted: true },
          visible: true,
          priority: 0, // Highest priority
          contextualRelevance: target.contextualImportance,
          transitionStyle: 'SCALE',
        });
        focusPriority.push(`focus-${target.elementId}`);
        visiblePanels.push(target.elementId);
      }
    }

    // Add metrics if not high stress
    if (!isHighStress && !isHighCognitiveLoad) {
      mainComponents.push({
        id: 'metrics-chart',
        type: 'MetricsChart',
        props: { minimal: context.preferredComplexity === 'MINIMAL' },
        visible: true,
        priority: 2,
        contextualRelevance: 60,
        transitionStyle: 'FADE',
      });
    } else {
      hiddenPanels.push('metrics-chart');
    }

    // Status indicator always visible
    mainComponents.push({
      id: 'status-indicator',
      type: 'StatusIndicator',
      props: { showDetails: !isHighStress },
      visible: true,
      priority: 3,
      contextualRelevance: 70,
      transitionStyle: 'NONE',
    });

    regions.push({
      id: 'main',
      type: 'MAIN',
      position: { x: 0, y: 0, width: '100%', height: '100%' },
      components: mainComponents.sort((a, b) => a.priority - b.priority),
      priority: 1,
      collapsible: false,
      collapsed: false,
    });

    return {
      id: `layout-${Date.now()}`,
      version: 1,
      timestamp: Date.now(),
      regions,
      visiblePanels,
      hiddenPanels,
      focusPriority,
      theme: this.selectTheme(context),
      colorAccent: '#9d4edd',
      animationLevel: isHighStress ? 'REDUCED' : 'FULL',
      generationReason: isHighStress
        ? 'Simplified layout due to high stress'
        : isFocused
        ? 'Focused layout based on gaze fixation'
        : 'Standard layout',
      biometricTrigger: this.identifyTrigger(context),
      confidence: 0.7,
    };
  }

  /**
   * Map semantic element type to component name
   */
  private mapElementTypeToComponent(
    elementType: string
  ): string | null {
    const mapping: Record<string, string> = {
      TERMINAL: 'TerminalOutput',
      CODE_EDITOR: 'CodeEditor',
      CHART: 'MetricsChart',
      METRICS: 'MetricsChart',
      NAVIGATION: 'NavigationTabs',
      PANEL: 'ContextPanel',
      BUTTON: 'QuickActions',
    };
    return mapping[elementType] || null;
  }

  /**
   * Select theme based on context
   */
  private selectTheme(context: AUIGenerationContext): UILayoutSpec['theme'] {
    if (context.stressLevel > 80) return 'MINIMAL';
    if (context.gazeSemantics?.gazePattern === 'FIXATED') return 'FOCUS';
    if (context.preferredComplexity === 'DENSE') return 'DENSE';
    return 'DEFAULT';
  }

  /**
   * Identify what triggered this generation
   */
  private identifyTrigger(context: AUIGenerationContext): BiometricTrigger | null {
    if (context.stressLevel > 70) {
      return {
        type: 'STRESS_HIGH',
        value: context.stressLevel,
        threshold: 70,
        timestamp: Date.now(),
      };
    }
    if (context.cognitiveLoad > 75) {
      return {
        type: 'COGNITIVE_OVERLOAD',
        value: context.cognitiveLoad,
        threshold: 75,
        timestamp: Date.now(),
      };
    }
    if (context.gazeSemantics?.gazePattern === 'FIXATED') {
      return {
        type: 'FIXATION_LONG',
        value: 0,
        threshold: 0,
        timestamp: Date.now(),
      };
    }
    return null;
  }

  /**
   * Get default regions structure
   */
  private getDefaultRegions(context: AUIGenerationContext): UIRegion[] {
    return [
      {
        id: 'main',
        type: 'MAIN',
        position: { x: 0, y: 0, width: '100%', height: '100%' },
        components: [
          {
            id: 'default-content',
            type: 'ContextPanel',
            props: {},
            visible: true,
            priority: 1,
            contextualRelevance: 50,
            transitionStyle: 'FADE',
          },
        ],
        priority: 1,
        collapsible: false,
        collapsed: false,
      },
    ];
  }

  /**
   * Get default layout when no context available
   */
  getDefaultLayout(): UILayoutSpec {
    return {
      id: 'default-layout',
      version: 1,
      timestamp: Date.now(),
      regions: [
        {
          id: 'main',
          type: 'MAIN',
          position: { x: 0, y: 0, width: '100%', height: '100%' },
          components: [],
          priority: 1,
          collapsible: false,
          collapsed: false,
        },
      ],
      visiblePanels: [],
      hiddenPanels: [],
      focusPriority: [],
      theme: 'DEFAULT',
      colorAccent: '#9d4edd',
      animationLevel: 'FULL',
      generationReason: 'Default layout',
      biometricTrigger: null,
      confidence: 1,
    };
  }

  /**
   * Get current layout
   */
  getCurrentLayout(): UILayoutSpec | null {
    return this.currentLayout;
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
        console.error('AUI: Event handler error', e);
      }
    });
  }
}

// Singleton export
export const auiEngine = new AUIEngineService();
