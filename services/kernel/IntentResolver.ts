/**
 * INTENT RESOLVER
 *
 * Resolves raw user input into structured intents for the Agentic Kernel.
 * Uses pattern matching and optional LLM-based classification.
 */

import {
  ResolvedIntent,
  IntentCategory,
  ExtractedEntity,
  BiometricContext,
} from './types';
import { AppMode } from '../../types';

interface ResolveOptions {
  biometricContext?: BiometricContext | null;
  currentMode?: string;
}

// Navigation intent patterns
const NAVIGATION_PATTERNS: { pattern: RegExp; mode: AppMode }[] = [
  { pattern: /\b(go|switch|open|show|navigate)\s+(to\s+)?dashboard\b/i, mode: AppMode.DASHBOARD },
  { pattern: /\b(go|switch|open|show|navigate)\s+(to\s+)?metaventions?\b/i, mode: AppMode.METAVENTIONS_HUB },
  { pattern: /\b(go|switch|open|show|navigate)\s+(to\s+)?research\b/i, mode: AppMode.BIBLIOMORPHIC },
  { pattern: /\b(go|switch|open|show|navigate)\s+(to\s+)?process\s*(map|view)?\b/i, mode: AppMode.PROCESS_MAP },
  { pattern: /\b(go|switch|open|show|navigate)\s+(to\s+)?memory\b/i, mode: AppMode.MEMORY_CORE },
  { pattern: /\b(go|switch|open|show|navigate)\s+(to\s+)?image\b/i, mode: AppMode.IMAGE_GEN },
  { pattern: /\b(go|switch|open|show|navigate)\s+(to\s+)?code\s*(studio)?\b/i, mode: AppMode.CODE_STUDIO },
  { pattern: /\b(go|switch|open|show|navigate)\s+(to\s+)?voice\b/i, mode: AppMode.VOICE_MODE },
  { pattern: /\b(go|switch|open|show|navigate)\s+(to\s+)?agents?\b/i, mode: AppMode.AGENT_CONTROL },
  { pattern: /\b(go|switch|open|show|navigate)\s+(to\s+)?finance\b/i, mode: AppMode.AUTONOMOUS_FINANCE },
];

// Intent category patterns
const CATEGORY_PATTERNS: { pattern: RegExp; category: IntentCategory }[] = [
  { pattern: /\b(what|who|where|when|why|how|explain|describe|tell me)\b/i, category: 'QUERY' },
  { pattern: /\b(create|make|generate|build|new|add)\b/i, category: 'CREATION' },
  { pattern: /\b(change|update|modify|set|toggle|enable|disable|delete|remove)\b/i, category: 'MUTATION' },
  { pattern: /\b(analyze|evaluate|assess|compare|examine|investigate)\b/i, category: 'ANALYSIS' },
  { pattern: /\b(agents?|swarm|coordinate|orchestrate|delegate)\b/i, category: 'ORCHESTRATION' },
];

// Entity extraction patterns
const ENTITY_PATTERNS: { pattern: RegExp; type: ExtractedEntity['type'] }[] = [
  { pattern: /@(\w+)/g, type: 'AGENT' },
  { pattern: /\b(file|document|artifact):\s*["']?([^"'\s]+)["']?/gi, type: 'FILE' },
  { pattern: /\b(concept|idea|topic):\s*["']?([^"'\s]+)["']?/gi, type: 'CONCEPT' },
];

// Tool suggestion mapping
const INTENT_TOOLS: Record<IntentCategory, string[]> = {
  NAVIGATION: ['navigate', 'setMode'],
  QUERY: ['search', 'retrieve', 'vectorQuery'],
  MUTATION: ['update', 'setState', 'persist'],
  CREATION: ['generate', 'create', 'synthesize'],
  ANALYSIS: ['analyze', 'evaluate', 'compare'],
  ORCHESTRATION: ['spawnAgent', 'coordinateSwarm', 'delegate'],
  BIOMETRIC: ['adaptUI', 'prefetchContext', 'reduceComplexity'],
};

export class IntentResolver {
  private initialized: boolean = false;

  /**
   * Initialize the resolver (load models, patterns, etc.)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Future: Load fine-tuned intent classification model
    this.initialized = true;
    console.log('🧠 INTENT_RESOLVER: Initialized');
  }

  /**
   * Resolve raw input into structured intent
   */
  async resolve(input: string, options: ResolveOptions = {}): Promise<ResolvedIntent> {
    const { biometricContext, currentMode } = options;

    // Check for biometric-triggered intent first
    if (biometricContext && this.shouldTriggerBiometricIntent(biometricContext)) {
      return this.createBiometricIntent(input, biometricContext);
    }

    // Check for navigation intent
    const navigationMatch = this.matchNavigation(input);
    if (navigationMatch) {
      return this.createIntent(input, 'NAVIGATION', {
        targetMode: navigationMatch,
        confidence: 0.95,
      });
    }

    // Classify intent category
    const category = this.classifyCategory(input);

    // Extract entities
    const entities = this.extractEntities(input);

    // Generate context hints
    const contextHints = this.generateContextHints(input, category, currentMode);

    return this.createIntent(input, category, {
      entities,
      contextHints,
      confidence: 0.85,
    });
  }

  /**
   * Quick classification without full resolution
   */
  quickClassify(input: string): IntentCategory {
    return this.classifyCategory(input);
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private matchNavigation(input: string): AppMode | null {
    for (const { pattern, mode } of NAVIGATION_PATTERNS) {
      if (pattern.test(input)) {
        return mode;
      }
    }
    return null;
  }

  private classifyCategory(input: string): IntentCategory {
    for (const { pattern, category } of CATEGORY_PATTERNS) {
      if (pattern.test(input)) {
        return category;
      }
    }
    return 'QUERY'; // Default to query
  }

  private extractEntities(input: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    for (const { pattern, type } of ENTITY_PATTERNS) {
      // Reset regex state
      pattern.lastIndex = 0;

      let match;
      while ((match = pattern.exec(input)) !== null) {
        entities.push({
          type,
          value: match[1] || match[2] || match[0],
          confidence: 0.9,
          span: [match.index, match.index + match[0].length],
        });
      }
    }

    return entities;
  }

  private generateContextHints(
    input: string,
    category: IntentCategory,
    currentMode?: string
  ): string[] {
    const hints: string[] = [];

    // Add current mode as context
    if (currentMode) {
      hints.push(`current_mode:${currentMode}`);
    }

    // Extract key terms for context retrieval
    const keyTerms = input
      .toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 3)
      .filter(term => !['what', 'when', 'where', 'which', 'that', 'this', 'with'].includes(term))
      .slice(0, 5);

    hints.push(...keyTerms.map(t => `term:${t}`));

    return hints;
  }

  private shouldTriggerBiometricIntent(context: BiometricContext): boolean {
    // High stress should trigger UI simplification
    if (context.stressLevel.value > 75) {
      return true;
    }

    // Extended gaze fixation should trigger context prefetch
    const longFixation = context.recentFixations.find(f => f.duration > 2000);
    if (longFixation) {
      return true;
    }

    return false;
  }

  private createBiometricIntent(
    rawInput: string,
    biometricContext: BiometricContext
  ): ResolvedIntent {
    const isStressTrigger = biometricContext.stressLevel.value > 75;

    return {
      id: crypto.randomUUID(),
      category: 'BIOMETRIC',
      rawInput,
      confidence: 0.9,
      entities: [],
      contextHints: isStressTrigger ? ['stress_response'] : ['gaze_prefetch'],
      suggestedTools: INTENT_TOOLS.BIOMETRIC,
      biometricContext,
    };
  }

  private createIntent(
    rawInput: string,
    category: IntentCategory,
    overrides: Partial<ResolvedIntent> = {}
  ): ResolvedIntent {
    return {
      id: crypto.randomUUID(),
      category,
      rawInput,
      confidence: 0.8,
      entities: [],
      contextHints: [],
      suggestedTools: INTENT_TOOLS[category] || [],
      ...overrides,
    };
  }
}
