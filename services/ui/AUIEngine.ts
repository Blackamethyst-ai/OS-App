/**
 * AUI ENGINE - Adaptive User Interface Generator
 *
 * LLM-driven layout generator that synthesizes optimal React component trees
 * based on biometric state, gaze semantics, and task context.
 *
 * Reference: AUI (arXiv:2511.15567) - Computer-Use Agents as Judges
 *
 * Features:
 * - Real LLM integration (Claude + Gemini with auto-selection)
 * - Biometric-aware layout synthesis
 * - Gaze-following component prioritization
 * - Stress-responsive simplification
 */

import { getAI, safeParseJson } from '../geminiService';
import { logger } from '../logger';
import { claudeService } from '../claudeService';
import { apiKeyService } from '../apiKeyService';
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

type LLMProvider = 'claude' | 'gemini' | 'auto';

const CONFIG = {
  provider: 'auto' as LLMProvider,
  claudeModel: 'claude-sonnet-4-6',
  geminiModel: 'gemini-2.0-flash',
  generationTimeoutMs: 3000,
  maxRetries: 2,
  cooldownMs: 1000,
};

const GENERATION_TIMEOUT_MS = CONFIG.generationTimeoutMs;
const MAX_GENERATION_RETRIES = CONFIG.maxRetries;

// Available components that can be synthesized (matching actual app components)
const AVAILABLE_COMPONENTS = [
  // Dashboard & Hub
  'MetaventionsHub',
  'Dashboard',
  'GlobalStatusBar',
  'NeuralDock',
  // Biometrics
  'BiometricPanel',
  'GazeReticle',
  // Agent & Process
  'AgentControlCenter',
  'AgenticHUD',
  'ProcessVisualizer',
  'SynapticRouter',
  'TaskBoard',
  // Code & Development
  'CodeStudio',
  'NexusAPIExplorer',
  'HolographicCommandDeck',
  'CommandPalette',
  // Visualizations
  'DEcosystem',
  'ContextVelocityChart',
  'KnowledgeGraph',
  'EmotionalResonanceGraph',
  'FlywheelOrbit',
  // Voice & Media
  'VoiceMode',
  'VoiceManager',
  'ImageGen',
  // Memory & Knowledge
  'MemoryCore',
  'SynapticContextHub',
  // System
  'HelpCenter',
  'StrategicConsole',
  'ZenithDisplay',
] as const;

// ============================================================================
// AUI ENGINE
// ============================================================================

class AUIEngineService {
  private eventHandlers: Map<AUIEventType, Set<(event: AUIEvent) => void>> = new Map();
  private currentLayout: UILayoutSpec | null = null;
  private generationInProgress: boolean = false;
  private lastGenerationTime: number = 0;
  private generationCooldownMs: number = CONFIG.cooldownMs;
  private llmCallCount: number = 0;
  private lastProvider: LLMProvider | null = null;

  /**
   * Get the best available LLM provider
   */
  private getLLMProvider(): LLMProvider | null {
    if (CONFIG.provider !== 'auto') {
      const key = CONFIG.provider === 'claude' ? 'claude' : 'gemini';
      return apiKeyService.getKey(key) ? CONFIG.provider : null;
    }

    // Auto mode: prefer Claude for complex reasoning, fall back to Gemini
    if (apiKeyService.getKey('claude')) return 'claude';
    if (apiKeyService.getKey('gemini')) return 'gemini';
    return null;
  }

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
      logger.debug('Generation cooldown active, returning current layout', undefined, 'AUIEngine');
      return this.currentLayout || this.getDefaultLayout();
    }

    if (this.generationInProgress) {
      logger.debug('Generation already in progress', undefined, 'AUIEngine');
      return this.currentLayout || this.getDefaultLayout();
    }

    this.generationInProgress = true;
    this.lastGenerationTime = now;
    this.emit('REGENERATION_STARTED', { context });

    const startTime = performance.now();

    try {
      const layout = await this.synthesizeLayout(context);
      const latency = performance.now() - startTime;

      logger.debug(`Layout generated in ${latency.toFixed(0)}ms`, undefined, 'AUIEngine');
      this.currentLayout = layout;
      this.emit('REGENERATION_COMPLETE', { layout, latencyMs: latency });

      return layout;
    } catch (error) {
      logger.error('Layout generation failed', error, 'AUI');
      return this.currentLayout || this.getDefaultLayout();
    } finally {
      this.generationInProgress = false;
    }
  }

  /**
   * Core synthesis logic using LLM
   */
  private async synthesizeLayout(context: AUIGenerationContext): Promise<UILayoutSpec> {
    const provider = this.getLLMProvider();
    this.lastProvider = provider;
    this.llmCallCount++;

    const prompt = this.buildGenerationPrompt(context);
    const systemInstruction = this.getSystemInstruction();

    try {
      let responseText: string;

      if (provider === 'claude') {
        // Use Claude for layout generation
        responseText = await Promise.race([
          claudeService.generateContent(
            [{ role: 'user', content: prompt }],
            systemInstruction,
            CONFIG.claudeModel
          ),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Generation timeout')), GENERATION_TIMEOUT_MS)
          ),
        ]);
        logger.debug('Layout generated via Claude', undefined, 'AUIEngine');
      } else if (provider === 'gemini') {
        // Use Gemini for layout generation
        const ai = getAI();
        const response = await Promise.race([
          ai.models.generateContent({
            model: CONFIG.geminiModel,
            contents: prompt,
            config: {
              systemInstruction: systemInstruction,
            },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Generation timeout')), GENERATION_TIMEOUT_MS)
          ),
        ]);
        responseText = response.text || '';
        logger.debug('Layout generated via Gemini', undefined, 'AUIEngine');
      } else {
        // No LLM available, use rule-based
        logger.debug('No LLM available, using rule-based generation', undefined, 'AUIEngine');
        return this.generateRuleBasedLayout(context);
      }

      const layoutSpec = this.parseLayoutResponse(responseText);
      return this.validateAndComplete(layoutSpec, context);
    } catch (error: any) {
      logger.error('LLM generation failed', error.message, 'AUI');
      // Fallback to rule-based generation
      return this.generateRuleBasedLayout(context);
    }
  }

  /**
   * Parse LLM response into layout spec
   */
  private parseLayoutResponse(responseText: string): Partial<UILayoutSpec> {
    try {
      let jsonStr = responseText.trim();

      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7);
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3);
      }

      return JSON.parse(jsonStr.trim());
    } catch (error) {
      logger.error('Failed to parse layout response', error, 'AUI');
      return {};
    }
  }

  /**
   * Get LLM usage statistics
   */
  getLLMStats(): { callCount: number; lastProvider: LLMProvider | null } {
    return {
      callCount: this.llmCallCount,
      lastProvider: this.lastProvider,
    };
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
        logger.error('Event handler error', e, 'AUI');
      }
    });
  }
}

// Singleton export
export const auiEngine = new AUIEngineService();
