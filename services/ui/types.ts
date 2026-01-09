/**
 * ADAPTIVE UI TYPES
 *
 * Type definitions for the Self-Synthesizing Adaptive UI system.
 * Based on: AUI (arXiv:2511.15567), VL4Gaze (arXiv:2512.20735)
 */

// ============================================================================
// SEMANTIC GAZE TYPES
// ============================================================================

export interface SemanticGazeTarget {
  elementId: string;
  elementType: 'TERMINAL' | 'CODE_EDITOR' | 'PANEL' | 'BUTTON' | 'NAVIGATION' | 'METRICS' | 'CHART' | 'TEXT' | 'UNKNOWN';
  semanticLabel: string;       // e.g., "Terminal Output", "Code Editor", "Navigation Tab"
  confidence: number;          // 0-1
  inferredIntent: SemanticIntent;
  boundingBox: { x: number; y: number; width: number; height: number };
  contextualImportance: number; // 0-100, based on current task
}

export type SemanticIntent =
  | 'READING'           // User is reading content
  | 'SEARCHING'         // User is looking for something
  | 'DEBUGGING'         // User appears to be debugging
  | 'COMPARING'         // User is comparing two elements
  | 'NAVIGATING'        // User wants to navigate
  | 'WAITING'           // User is waiting for something
  | 'CONFUSED'          // User appears confused (erratic gaze)
  | 'FOCUSED'           // Deep focus on single element
  | 'SCANNING'          // Quick overview scan
  | 'IDLE';             // No clear intent

export interface GazeSemanticContext {
  primaryTarget: SemanticGazeTarget | null;
  secondaryTargets: SemanticGazeTarget[];
  gazePattern: GazePattern;
  inferredTask: string;        // e.g., "Reviewing terminal logs", "Writing code"
  attentionDistribution: Map<string, number>; // elementId -> attention %
  timestamp: number;
}

export type GazePattern =
  | 'FIXATED'           // Single point focus
  | 'SCANNING_H'        // Horizontal scan
  | 'SCANNING_V'        // Vertical scan
  | 'ERRATIC'           // Confused/searching
  | 'ALTERNATING'       // Switching between 2 elements
  | 'SEQUENTIAL';       // Following a sequence

// ============================================================================
// AUI ENGINE TYPES
// ============================================================================

export interface UILayoutSpec {
  id: string;
  version: number;
  timestamp: number;

  // Layout structure
  regions: UIRegion[];

  // Visibility and priority
  visiblePanels: string[];
  hiddenPanels: string[];
  focusPriority: string[];     // Ordered by importance

  // Styling
  theme: 'DEFAULT' | 'MINIMAL' | 'FOCUS' | 'DENSE' | 'CUSTOM';
  colorAccent: string;
  animationLevel: 'FULL' | 'REDUCED' | 'NONE';

  // Metadata
  generationReason: string;
  biometricTrigger: BiometricTrigger | null;
  confidence: number;
}

export interface UIRegion {
  id: string;
  type: 'MAIN' | 'SIDEBAR' | 'HEADER' | 'FOOTER' | 'OVERLAY' | 'FLOATING';
  position: { x: number; y: number; width: string; height: string };
  components: UIComponentSpec[];
  priority: number;
  collapsible: boolean;
  collapsed: boolean;
}

export interface UIComponentSpec {
  id: string;
  type: string;                 // React component name
  props: Record<string, any>;
  children?: UIComponentSpec[];
  visible: boolean;
  priority: number;
  contextualRelevance: number; // 0-100
  transitionStyle: 'FADE' | 'SLIDE' | 'SCALE' | 'MORPH' | 'NONE';
}

export interface BiometricTrigger {
  type: 'STRESS_HIGH' | 'STRESS_LOW' | 'GAZE_SHIFT' | 'FIXATION_LONG' | 'ATTENTION_DROP' | 'COGNITIVE_OVERLOAD';
  value: number;
  threshold: number;
  timestamp: number;
}

// ============================================================================
// AUI GENERATION CONTEXT
// ============================================================================

export interface AUIGenerationContext {
  // Biometric state
  stressLevel: number;
  stressTrend: 'RISING' | 'STABLE' | 'FALLING';
  attentionScore: number;
  cognitiveLoad: number;

  // Gaze context
  gazeSemantics: GazeSemanticContext | null;
  recentFixations: { target: string; duration: number }[];

  // Task context
  currentMode: string;
  activeTask: string | null;
  recentActions: string[];

  // UI state
  currentLayout: UILayoutSpec | null;
  visiblePanels: string[];

  // User preferences (learned)
  preferredComplexity: 'MINIMAL' | 'STANDARD' | 'DENSE';
  frequentActions: string[];
}

// ============================================================================
// JUDGE AGENT TYPES
// ============================================================================

export interface UIEvaluation {
  layoutId: string;
  score: number;                // 0-100
  verdict: 'OPTIMAL' | 'ACCEPTABLE' | 'SUBOPTIMAL' | 'POOR';

  // Dimension scores
  taskAlignment: number;        // How well does UI support current task?
  cognitiveLoad: number;        // Is UI overwhelming or too sparse?
  gazeEfficiency: number;       // Can user find what they need?
  stressResponse: number;       // Does UI help reduce stress?

  // Recommendations
  improvements: UIImprovement[];

  // Reasoning
  reasoning: string;
  iterationSuggested: boolean;
}

export interface UIImprovement {
  type: 'SHOW_PANEL' | 'HIDE_PANEL' | 'RESIZE' | 'REORDER' | 'HIGHLIGHT' | 'SIMPLIFY' | 'EXPAND';
  target: string;               // Component/region ID
  rationale: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

// ============================================================================
// DOM REGENERATION TYPES
// ============================================================================

export interface MorphTransition {
  id: string;
  fromLayout: UILayoutSpec;
  toLayout: UILayoutSpec;
  duration: number;             // ms
  easing: string;
  staggerDelay: number;

  // Per-component transitions
  componentTransitions: ComponentTransition[];
}

export interface ComponentTransition {
  componentId: string;
  type: 'ENTER' | 'EXIT' | 'MOVE' | 'RESIZE' | 'MORPH';
  from: { x: number; y: number; width: number; height: number; opacity: number };
  to: { x: number; y: number; width: number; height: number; opacity: number };
  delay: number;
  duration: number;
}

// ============================================================================
// AUI ENGINE EVENTS
// ============================================================================

export type AUIEventType =
  | 'REGENERATION_STARTED'
  | 'REGENERATION_COMPLETE'
  | 'EVALUATION_STARTED'
  | 'EVALUATION_COMPLETE'
  | 'ITERATION_TRIGGERED'
  | 'MORPH_STARTED'
  | 'MORPH_COMPLETE'
  | 'SEMANTIC_GAZE_UPDATE';

export interface AUIEvent {
  id: string;
  type: AUIEventType;
  timestamp: number;
  payload: any;
}
