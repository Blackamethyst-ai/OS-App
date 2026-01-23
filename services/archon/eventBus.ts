/**
 * ARCHON Event Bus
 *
 * Pub/sub system for inter-subsystem communication.
 * Enables loose coupling between ARCHON and OS-App subsystems.
 *
 * SYNCHRONIZED CLOCK INTEGRATION:
 * Significant Archon events trigger SystemMind epoch updates,
 * ensuring voice context stays fresh when Archon makes decisions.
 */

import { ArchonEvent, ArchonEventType, EventHandler } from './types';
import { generateId, archonLog } from './utils';
import { useSystemMind } from '../../stores/useSystemMind';

// Events that should trigger epoch updates (significant state changes)
const EPOCH_TRIGGERING_EVENTS: Set<ArchonEventType> = new Set([
  'goal:received',
  'goal:decomposed',
  'goal:completed',
  'goal:blocked',
  'decision:made',
  'escalation:requested',
  'escalation:resolved',
  'pattern:learned',
  'subsystem:completed',
]);

// =============================================================================
// EVENT BUS IMPLEMENTATION
// =============================================================================

type Unsubscribe = () => void;

interface EventBusOptions {
  maxHistorySize?: number;
  debugMode?: boolean;
}

class ArchonEventBus {
  private handlers: Map<ArchonEventType, Set<EventHandler>>;
  private wildcardHandlers: Set<EventHandler>;
  private eventHistory: ArchonEvent[];
  private maxHistorySize: number;
  private debugMode: boolean;

  constructor(options: EventBusOptions = {}) {
    this.handlers = new Map();
    this.wildcardHandlers = new Set();
    this.eventHistory = [];
    this.maxHistorySize = options.maxHistorySize ?? 100;
    this.debugMode = options.debugMode ?? false;
  }

  /**
   * Subscribe to a specific event type
   */
  on<T = unknown>(eventType: ArchonEventType, handler: EventHandler<T>): Unsubscribe {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    this.handlers.get(eventType)!.add(handler as EventHandler);

    if (this.debugMode) {
      archonLog('debug', `Subscribed to ${eventType}`);
    }

    return () => {
      this.handlers.get(eventType)?.delete(handler as EventHandler);
    };
  }

  /**
   * Subscribe to all events (wildcard)
   */
  onAll(handler: EventHandler): Unsubscribe {
    this.wildcardHandlers.add(handler);

    if (this.debugMode) {
      archonLog('debug', 'Subscribed to all events');
    }

    return () => {
      this.wildcardHandlers.delete(handler);
    };
  }

  /**
   * Subscribe once to an event type
   */
  once<T = unknown>(eventType: ArchonEventType, handler: EventHandler<T>): Unsubscribe {
    const wrappedHandler: EventHandler<T> = (event) => {
      unsubscribe();
      return handler(event);
    };

    const unsubscribe = this.on(eventType, wrappedHandler);
    return unsubscribe;
  }

  /**
   * Emit an event
   */
  async emit<T = unknown>(
    type: ArchonEventType,
    payload: T,
    source = 'archon'
  ): Promise<void> {
    const event: ArchonEvent<T> = {
      type,
      payload,
      timestamp: Date.now(),
      source,
    };

    // Add to history
    this.eventHistory.push(event as ArchonEvent);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    if (this.debugMode) {
      archonLog('debug', `Emitting ${type}`, payload);
    }

    // Get handlers for this event type
    const typeHandlers = this.handlers.get(type) || new Set();

    // Execute all handlers (type-specific + wildcards)
    const allHandlers = [...Array.from(typeHandlers), ...Array.from(this.wildcardHandlers)];

    await Promise.all(
      allHandlers.map(async (handler) => {
        try {
          await handler(event as ArchonEvent);
        } catch (error) {
          archonLog('error', `Error in event handler for ${type}`, error);
        }
      })
    );

    // SYNCHRONIZED CLOCK: Trigger epoch update for significant events
    // This ensures voice context stays fresh when Archon makes decisions
    if (EPOCH_TRIGGERING_EVENTS.has(type)) {
      try {
        const systemMind = useSystemMind.getState();
        // Use telemetry update to signal Archon state change
        systemMind.uplinkData('archon_event', {
          type,
          source,
          timestamp: event.timestamp,
          summary: typeof payload === 'object' && payload !== null
            ? (payload as any).description || (payload as any).goalId || type
            : String(payload)
        });
      } catch (e) {
        // SystemMind may not be initialized during early boot
        if (this.debugMode) {
          archonLog('debug', `Could not sync epoch for ${type}`, e);
        }
      }
    }
  }

  /**
   * Get event history
   */
  getHistory(filter?: { type?: ArchonEventType; since?: number; limit?: number }): ArchonEvent[] {
    let events = [...this.eventHistory];

    if (filter?.type) {
      events = events.filter((e) => e.type === filter.type);
    }

    if (filter?.since) {
      events = events.filter((e) => e.timestamp >= filter.since);
    }

    if (filter?.limit) {
      events = events.slice(-filter.limit);
    }

    return events;
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Wait for a specific event
   */
  waitFor<T = unknown>(eventType: ArchonEventType, timeoutMs = 30000): Promise<ArchonEvent<T>> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        unsubscribe();
        reject(new Error(`Timeout waiting for ${eventType}`));
      }, timeoutMs);

      const unsubscribe = this.once<T>(eventType, (event) => {
        clearTimeout(timeout);
        resolve(event as ArchonEvent<T>);
      });
    });
  }

  /**
   * Remove all handlers
   */
  removeAllHandlers(): void {
    this.handlers.clear();
    this.wildcardHandlers.clear();
  }

  /**
   * Get subscriber count for an event type
   */
  getSubscriberCount(eventType?: ArchonEventType): number {
    if (eventType) {
      return (this.handlers.get(eventType)?.size ?? 0) + this.wildcardHandlers.size;
    }
    let total = this.wildcardHandlers.size;
    this.handlers.forEach((handlers) => {
      total += handlers.size;
    });
    return total;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const eventBus = new ArchonEventBus({
  maxHistorySize: 100,
  debugMode: process.env.NODE_ENV === 'development',
});

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Emit a goal-related event
 */
export function emitGoalEvent(
  action: 'received' | 'decomposed' | 'completed' | 'blocked',
  payload: { goalId: string; [key: string]: unknown }
): Promise<void> {
  return eventBus.emit(`goal:${action}` as ArchonEventType, payload);
}

/**
 * Emit a decision event
 */
export function emitDecisionEvent(payload: {
  goalId: string;
  decisionId: string;
  type: string;
  subsystem?: string;
}): Promise<void> {
  return eventBus.emit('decision:made', payload);
}

/**
 * Emit a subsystem event
 */
export function emitSubsystemEvent(
  action: 'invoked' | 'completed',
  payload: {
    subsystemId: string;
    goalId: string;
    dqScore?: number;
    latencyMs?: number;
  }
): Promise<void> {
  return eventBus.emit(`subsystem:${action}` as ArchonEventType, payload);
}

/**
 * Emit an escalation event
 */
export function emitEscalationEvent(
  action: 'requested' | 'resolved',
  payload: {
    goalId: string;
    escalationId?: string;
    options?: unknown[];
    selectedOption?: string;
  }
): Promise<void> {
  return eventBus.emit(`escalation:${action}` as ArchonEventType, payload);
}

/**
 * Emit a learning event
 */
export function emitPatternEvent(payload: {
  patternId: string;
  type: string;
  confidence: number;
}): Promise<void> {
  return eventBus.emit('pattern:learned', payload);
}

/**
 * Emit an error event
 */
export function emitErrorEvent(payload: {
  error: Error;
  context: string;
  goalId?: string;
}): Promise<void> {
  return eventBus.emit('error:occurred', {
    message: payload.error.message,
    stack: payload.error.stack,
    context: payload.context,
    goalId: payload.goalId,
  });
}

// =============================================================================
// TYPED EVENT PAYLOADS
// =============================================================================

export interface GoalReceivedPayload {
  goalId: string;
  goalText: string;
  complexity: number;
}

export interface GoalDecomposedPayload {
  goalId: string;
  subtaskCount: number;
  estimatedSubsystems: string[];
}

export interface GoalCompletedPayload {
  goalId: string;
  dqScore: number;
  latencyMs: number;
  tokenCost: number;
}

export interface GoalBlockedPayload {
  goalId: string;
  reason: string;
  attempts: number;
}

export interface DecisionMadePayload {
  goalId: string;
  decisionId: string;
  type: string;
  subsystem?: string;
  reasoning: string;
  confidence: number;
}

export interface SubsystemInvokedPayload {
  subsystemId: string;
  goalId: string;
  taskDescription: string;
}

export interface SubsystemCompletedPayload {
  subsystemId: string;
  goalId: string;
  dqScore: number;
  latencyMs: number;
  tokenUsage: number;
  success: boolean;
}

export interface EscalationRequestedPayload {
  goalId: string;
  escalationId: string;
  attempts: number;
  failureReasons: string[];
  options: Array<{
    id: string;
    label: string;
    description: string;
  }>;
}

export interface EscalationResolvedPayload {
  goalId: string;
  escalationId: string;
  selectedOptionId: string;
  customInput?: string;
}

export interface PatternLearnedPayload {
  patternId: string;
  type: string;
  goalType: string;
  confidence: number;
}

export interface ErrorOccurredPayload {
  message: string;
  stack?: string;
  context: string;
  goalId?: string;
}

// =============================================================================
// EXPORT
// =============================================================================

export { ArchonEventBus };
export default eventBus;
