/**
 * DOM REGENERATOR
 *
 * Real-time React component synthesis with liquid metal transitions.
 * Morphs existing UI layouts with smooth AnimatePresence animations.
 *
 * Reference: Adaptive-Generative-UI-for-Accessibility
 */

import React from 'react';
import {
  UILayoutSpec,
  UIComponentSpec,
  UIRegion,
  MorphTransition,
  ComponentTransition,
  AUIEvent,
  AUIEventType,
} from './types';
import { logger } from '../logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_TRANSITION_DURATION = 300; // ms
const DEFAULT_STAGGER_DELAY = 50; // ms
const MAX_PARALLEL_TRANSITIONS = 10;

// Easing presets for different transition types
const EASING_PRESETS = {
  FADE: 'ease-out',
  SLIDE: 'cubic-bezier(0.16, 1, 0.3, 1)',
  SCALE: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  MORPH: 'cubic-bezier(0.4, 0, 0.2, 1)',
  NONE: 'linear',
};

// ============================================================================
// DOM REGENERATOR SERVICE
// ============================================================================

class DOMRegeneratorService {
  private currentLayout: UILayoutSpec | null = null;
  private transitionQueue: MorphTransition[] = [];
  private isTransitioning: boolean = false;
  private eventHandlers: Map<AUIEventType, Set<(event: AUIEvent) => void>> = new Map();

  // Registered component renderers
  private componentRegistry: Map<string, React.ComponentType<any>> = new Map();

  // ============================================================================
  // COMPONENT REGISTRATION
  // ============================================================================

  /**
   * Register a React component for dynamic rendering
   */
  registerComponent(name: string, component: React.ComponentType<any>): void {
    this.componentRegistry.set(name, component);
  }

  /**
   * Unregister a component
   */
  unregisterComponent(name: string): void {
    this.componentRegistry.delete(name);
  }

  /**
   * Get a registered component by name
   */
  getComponent(name: string): React.ComponentType<any> | null {
    return this.componentRegistry.get(name) || null;
  }

  // ============================================================================
  // LAYOUT MORPHING
  // ============================================================================

  /**
   * Morph from current layout to new layout with transitions
   */
  async morphToLayout(
    newLayout: UILayoutSpec,
    options: MorphOptions = {}
  ): Promise<MorphResult> {
    const startTime = performance.now();

    if (this.isTransitioning && !options.force) {
      if (import.meta.env.DEV) console.log('DOM_REGEN: Transition in progress, queueing...');
      return { success: false, reason: 'TRANSITION_IN_PROGRESS' };
    }

    this.isTransitioning = true;
    this.emit('MORPH_STARTED', { fromLayout: this.currentLayout, toLayout: newLayout });

    try {
      // Calculate transition plan
      const transition = this.calculateTransition(
        this.currentLayout,
        newLayout,
        options.duration || DEFAULT_TRANSITION_DURATION
      );

      // Apply transitions
      await this.executeTransition(transition);

      // Update current layout
      this.currentLayout = newLayout;

      const latency = performance.now() - startTime;
      if (import.meta.env.DEV) console.log(`DOM_REGEN: Morph complete in ${latency.toFixed(0)}ms`);

      this.emit('MORPH_COMPLETE', {
        layout: newLayout,
        latencyMs: latency,
        transitionCount: transition.componentTransitions.length,
      });

      return { success: true, latencyMs: latency };
    } catch (error: any) {
      logger.error('Morph failed', error, 'DOM_REGEN');
      return { success: false, reason: error.message };
    } finally {
      this.isTransitioning = false;
    }
  }

  /**
   * Calculate transition plan between two layouts
   */
  private calculateTransition(
    fromLayout: UILayoutSpec | null,
    toLayout: UILayoutSpec,
    duration: number
  ): MorphTransition {
    const componentTransitions: ComponentTransition[] = [];

    const fromComponents = this.flattenComponents(fromLayout);
    const toComponents = this.flattenComponents(toLayout);

    const fromIds = new Set(fromComponents.map(c => c.id));
    const toIds = new Set(toComponents.map(c => c.id));

    let transitionIndex = 0;

    // Components being removed (EXIT)
    for (const component of fromComponents) {
      if (!toIds.has(component.id)) {
        componentTransitions.push({
          componentId: component.id,
          type: 'EXIT',
          from: this.getComponentRect(component, true),
          to: { ...this.getComponentRect(component, true), opacity: 0 },
          delay: transitionIndex * DEFAULT_STAGGER_DELAY,
          duration: duration * 0.6,
        });
        transitionIndex++;
      }
    }

    // Components being added (ENTER)
    for (const component of toComponents) {
      if (!fromIds.has(component.id)) {
        componentTransitions.push({
          componentId: component.id,
          type: 'ENTER',
          from: { ...this.getComponentRect(component, false), opacity: 0 },
          to: this.getComponentRect(component, false),
          delay: (transitionIndex * DEFAULT_STAGGER_DELAY) + (duration * 0.3),
          duration: duration * 0.7,
        });
        transitionIndex++;
      }
    }

    // Components being modified (MOVE/RESIZE/MORPH)
    for (const toComponent of toComponents) {
      const fromComponent = fromComponents.find(c => c.id === toComponent.id);
      if (fromComponent) {
        const fromRect = this.getComponentRect(fromComponent, true);
        const toRect = this.getComponentRect(toComponent, false);

        // Detect type of change
        let type: ComponentTransition['type'] = 'MORPH';
        if (fromRect.x !== toRect.x || fromRect.y !== toRect.y) {
          type = 'MOVE';
        } else if (fromRect.width !== toRect.width || fromRect.height !== toRect.height) {
          type = 'RESIZE';
        }

        if (type !== 'MORPH' || fromComponent.visible !== toComponent.visible) {
          componentTransitions.push({
            componentId: toComponent.id,
            type,
            from: fromRect,
            to: toRect,
            delay: transitionIndex * DEFAULT_STAGGER_DELAY,
            duration,
          });
          transitionIndex++;
        }
      }
    }

    return {
      id: `transition-${Date.now()}`,
      fromLayout: fromLayout || toLayout,
      toLayout,
      duration,
      easing: EASING_PRESETS.MORPH,
      staggerDelay: DEFAULT_STAGGER_DELAY,
      componentTransitions,
    };
  }

  /**
   * Execute a transition plan
   */
  private async executeTransition(transition: MorphTransition): Promise<void> {
    // Batch transitions for performance
    const batches = this.batchTransitions(transition.componentTransitions);

    for (const batch of batches) {
      await Promise.all(batch.map(t => this.animateComponent(t)));
    }
  }

  /**
   * Batch transitions to avoid overwhelming the browser
   */
  private batchTransitions(
    transitions: ComponentTransition[]
  ): ComponentTransition[][] {
    const batches: ComponentTransition[][] = [];
    let currentBatch: ComponentTransition[] = [];

    // Sort by delay
    const sorted = [...transitions].sort((a, b) => a.delay - b.delay);

    for (const t of sorted) {
      if (currentBatch.length >= MAX_PARALLEL_TRANSITIONS) {
        batches.push(currentBatch);
        currentBatch = [];
      }
      currentBatch.push(t);
    }

    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }

  /**
   * Animate a single component transition
   */
  private async animateComponent(transition: ComponentTransition): Promise<void> {
    return new Promise(resolve => {
      // In a real implementation, this would use Web Animations API or
      // communicate with React's AnimatePresence. For now, we simulate timing.
      setTimeout(() => {
        resolve();
      }, transition.delay + transition.duration);
    });
  }

  /**
   * Get bounding rect for a component
   */
  private getComponentRect(
    component: UIComponentSpec,
    isFrom: boolean
  ): { x: number; y: number; width: number; height: number; opacity: number } {
    // Try to get actual DOM position
    const element = document.getElementById(component.id) ||
      document.querySelector(`[data-component-id="${component.id}"]`);

    if (element) {
      const rect = element.getBoundingClientRect();
      return {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        opacity: component.visible ? 1 : 0,
      };
    }

    // Default positioning
    return {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      opacity: component.visible ? 1 : 0,
    };
  }

  /**
   * Flatten components from all regions
   */
  private flattenComponents(layout: UILayoutSpec | null): UIComponentSpec[] {
    if (!layout) return [];

    const components: UIComponentSpec[] = [];

    for (const region of layout.regions) {
      for (const component of region.components) {
        components.push(component);
        if (component.children) {
          components.push(...this.flattenComponentTree(component.children));
        }
      }
    }

    return components;
  }

  /**
   * Recursively flatten component tree
   */
  private flattenComponentTree(components: UIComponentSpec[]): UIComponentSpec[] {
    const flat: UIComponentSpec[] = [];
    for (const c of components) {
      flat.push(c);
      if (c.children) {
        flat.push(...this.flattenComponentTree(c.children));
      }
    }
    return flat;
  }

  // ============================================================================
  // REACT ELEMENT SYNTHESIS
  // ============================================================================

  /**
   * Synthesize React elements from layout spec
   */
  synthesizeElements(layout: UILayoutSpec): SynthesizedElements {
    const elements: Map<string, React.ReactElement> = new Map();
    const styles: Map<string, React.CSSProperties> = new Map();
    const animations: Map<string, AnimationConfig> = new Map();

    for (const region of layout.regions) {
      for (const componentSpec of region.components) {
        const element = this.synthesizeComponent(componentSpec, layout);
        if (element) {
          elements.set(componentSpec.id, element);
          styles.set(componentSpec.id, this.generateComponentStyle(componentSpec, layout));
          animations.set(componentSpec.id, this.generateAnimationConfig(componentSpec, layout));
        }
      }
    }

    return { elements, styles, animations, layout };
  }

  /**
   * Synthesize a single component
   */
  private synthesizeComponent(
    spec: UIComponentSpec,
    layout: UILayoutSpec
  ): React.ReactElement | null {
    const Component = this.componentRegistry.get(spec.type);

    if (!Component) {
      logger.warn(`Component '${spec.type}' not registered`, undefined, 'DOM_REGEN');
      return null;
    }

    const props = {
      ...spec.props,
      key: spec.id,
      'data-component-id': spec.id,
      'data-priority': spec.priority,
      'data-relevance': spec.contextualRelevance,
    };

    // Synthesize children if present
    let children: React.ReactNode = undefined;
    if (spec.children && spec.children.length > 0) {
      children = spec.children
        .filter(c => c.visible)
        .map(c => this.synthesizeComponent(c, layout))
        .filter(Boolean);
    }

    return React.createElement(Component, props, children);
  }

  /**
   * Generate style for a component based on layout
   */
  private generateComponentStyle(
    spec: UIComponentSpec,
    layout: UILayoutSpec
  ): React.CSSProperties {
    const baseStyle: React.CSSProperties = {
      transition: `all ${DEFAULT_TRANSITION_DURATION}ms ${EASING_PRESETS[spec.transitionStyle]}`,
      opacity: spec.visible ? 1 : 0,
      pointerEvents: spec.visible ? 'auto' : 'none',
    };

    // Theme-based styling
    if (layout.theme === 'MINIMAL') {
      baseStyle.backgroundColor = 'transparent';
      baseStyle.boxShadow = 'none';
    } else if (layout.theme === 'FOCUS') {
      if (spec.priority === 0) {
        baseStyle.transform = 'scale(1.02)';
        baseStyle.boxShadow = '0 0 20px rgba(157, 78, 221, 0.3)';
      }
    }

    return baseStyle;
  }

  /**
   * Generate animation config for framer-motion
   */
  private generateAnimationConfig(
    spec: UIComponentSpec,
    layout: UILayoutSpec
  ): AnimationConfig {
    const reduced = layout.animationLevel === 'REDUCED' || layout.animationLevel === 'NONE';
    const duration = reduced ? 0.1 : 0.3;

    const variants = {
      enter: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { duration, ease: [0.16, 1, 0.3, 1] },
      },
      exit: {
        opacity: 0,
        scale: reduced ? 1 : 0.95,
        y: reduced ? 0 : 10,
        transition: { duration: duration * 0.6 },
      },
      morph: {
        transition: { duration, ease: [0.4, 0, 0.2, 1] },
      },
    };

    return {
      variants,
      initial: 'exit',
      animate: 'enter',
      exit: 'exit',
      layoutId: spec.id,
    };
  }

  // ============================================================================
  // MORPHING UTILITIES
  // ============================================================================

  /**
   * Generate CSS for liquid morphing effect
   */
  generateMorphCSS(transition: MorphTransition): string {
    const keyframes: string[] = [];
    const animations: string[] = [];

    for (const ct of transition.componentTransitions) {
      const keyframeName = `morph-${ct.componentId}`;

      keyframes.push(`
@keyframes ${keyframeName} {
  0% {
    transform: translate(${ct.from.x}px, ${ct.from.y}px);
    width: ${ct.from.width}px;
    height: ${ct.from.height}px;
    opacity: ${ct.from.opacity};
  }
  100% {
    transform: translate(${ct.to.x}px, ${ct.to.y}px);
    width: ${ct.to.width}px;
    height: ${ct.to.height}px;
    opacity: ${ct.to.opacity};
  }
}`);

      animations.push(`
[data-component-id="${ct.componentId}"] {
  animation: ${keyframeName} ${ct.duration}ms ${transition.easing} ${ct.delay}ms forwards;
}`);
    }

    return [...keyframes, ...animations].join('\n');
  }

  /**
   * Get current layout
   */
  getCurrentLayout(): UILayoutSpec | null {
    return this.currentLayout;
  }

  /**
   * Set current layout without transition
   */
  setLayout(layout: UILayoutSpec): void {
    this.currentLayout = layout;
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
        logger.error('Event handler error', e, 'DOM_REGEN');
      }
    });
  }
}

// ============================================================================
// TYPES
// ============================================================================

interface MorphOptions {
  duration?: number;
  force?: boolean;
  easing?: string;
}

interface MorphResult {
  success: boolean;
  reason?: string;
  latencyMs?: number;
}

interface SynthesizedElements {
  elements: Map<string, React.ReactElement>;
  styles: Map<string, React.CSSProperties>;
  animations: Map<string, AnimationConfig>;
  layout: UILayoutSpec;
}

interface AnimationConfig {
  variants: Record<string, any>;
  initial: string;
  animate: string;
  exit: string;
  layoutId: string;
}

// Singleton export
export const domRegenerator = new DOMRegeneratorService();
