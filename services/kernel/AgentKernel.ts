/**
 * AGENTIC KERNEL - LLM-as-a-Kernel Dispatcher
 *
 * The core of the Agentic OS architecture. This kernel treats the entire
 * operating system as an autonomous agent, dispatching tasks based on
 * resolved user intent and biometric feedback.
 *
 * Architecture:
 * - IntentResolver: Parses user input into structured intents
 * - KernelScheduler: Priority-based task queue management
 * - SemanticPager: MemOS-style context window management
 * - BiometricLoop: Gaze/stress feedback integration
 *
 * Reference: arXiv:2512.05470 (Agentic File System)
 */

import {
  KernelState,
  KernelTask,
  ResolvedIntent,
  KernelEvent,
  KernelEventType,
  KernelEventHandler,
  KernelMetrics,
  BiometricContext,
  TaskPriority,
} from './types';
import { KernelScheduler } from './KernelScheduler';
import { IntentResolver } from './IntentResolver';
import { SemanticPager } from '../memory/SemanticPager';

const KERNEL_VERSION = '1.0.0-agentic';

class AgentKernelService {
  private state: KernelState = 'BOOTING';
  private bootTime: number = 0;
  private eventHandlers: Map<KernelEventType, Set<KernelEventHandler>> = new Map();
  private globalHandlers: Set<KernelEventHandler> = new Set();

  // Core subsystems
  private scheduler: KernelScheduler;
  private intentResolver: IntentResolver;
  private semanticPager: SemanticPager;

  // Metrics
  private metrics: KernelMetrics = {
    uptime: 0,
    tasksProcessed: 0,
    taskQueueDepth: 0,
    pagesInMemory: 0,
    totalPageSize: 0,
    pageFaults: 0,
    cacheHitRate: 0,
    avgTaskLatency: 0,
    biometricSamples: 0,
    currentStressLevel: 0,
  };

  // Biometric state
  private biometricContext: BiometricContext | null = null;
  private adaptiveUIEnabled: boolean = false;

  constructor() {
    this.scheduler = new KernelScheduler();
    this.intentResolver = new IntentResolver();
    this.semanticPager = new SemanticPager();
  }

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  /**
   * Boot the kernel and initialize all subsystems
   */
  async boot(): Promise<void> {
    if (this.state !== 'BOOTING' && this.state !== 'ERROR') {
      console.warn('KERNEL: Already booted');
      return;
    }

    console.log(`⚡ KERNEL: Booting v${KERNEL_VERSION}...`);
    this.state = 'BOOTING';
    this.bootTime = Date.now();

    try {
      // Initialize subsystems in order
      await this.intentResolver.initialize();
      await this.semanticPager.initialize();
      this.scheduler.start();

      // Start the main dispatch loop
      this.startDispatchLoop();

      this.state = 'IDLE';
      this.emit('BOOT_COMPLETE', { version: KERNEL_VERSION, bootTime: this.bootTime });
      console.log('⚡ KERNEL: Boot complete');
    } catch (error) {
      this.state = 'ERROR';
      console.error('⚡ KERNEL: Boot failed', error);
      throw error;
    }
  }

  /**
   * Gracefully shutdown the kernel
   */
  async shutdown(): Promise<void> {
    console.log('⚡ KERNEL: Initiating shutdown...');
    this.state = 'SUSPENDED';

    // Complete pending tasks
    await this.scheduler.drain();

    // Flush semantic pages to storage
    await this.semanticPager.flush();

    this.state = 'BOOTING'; // Ready for reboot
    console.log('⚡ KERNEL: Shutdown complete');
  }

  // ============================================================================
  // MAIN DISPATCH INTERFACE
  // ============================================================================

  /**
   * Primary entry point for all user interactions.
   * Resolves intent, pages context, and dispatches to appropriate handler.
   */
  async dispatch(input: string, options: DispatchOptions = {}): Promise<DispatchResult> {
    if (this.state === 'BOOTING' || this.state === 'ERROR') {
      return { success: false, error: 'Kernel not ready' };
    }

    this.state = 'PROCESSING';
    const startTime = Date.now();

    try {
      // 1. Resolve intent from raw input
      const intent = await this.intentResolver.resolve(input, {
        biometricContext: this.biometricContext,
        currentMode: options.currentMode,
      });
      this.emit('INTENT_RESOLVED', intent);

      // 2. Page in relevant context
      this.state = 'PAGING';
      const pages = await this.semanticPager.pageForIntent(intent);
      this.metrics.pagesInMemory = pages.length;
      this.metrics.totalPageSize = pages.reduce((sum, p) => sum + p.size, 0);

      // 3. Create and queue the task
      const task: KernelTask = {
        id: crypto.randomUUID(),
        intent,
        priority: this.determinePriority(intent, options),
        status: 'QUEUED',
        createdAt: Date.now(),
        contextPages: pages.map(p => p.id),
      };

      this.emit('TASK_QUEUED', task);

      // 4. Execute via scheduler (may be immediate or queued)
      const result = await this.scheduler.submit(task, async (t) => {
        return this.executeTask(t);
      });

      // 5. Update metrics
      const latency = Date.now() - startTime;
      this.metrics.tasksProcessed++;
      this.metrics.avgTaskLatency =
        (this.metrics.avgTaskLatency * (this.metrics.tasksProcessed - 1) + latency) /
        this.metrics.tasksProcessed;

      this.state = 'IDLE';
      return { success: true, result, intent, latencyMs: latency };
    } catch (error: any) {
      this.state = 'IDLE';
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute a kernel task with full context
   */
  private async executeTask(task: KernelTask): Promise<any> {
    task.status = 'RUNNING';
    task.startedAt = Date.now();
    this.emit('TASK_STARTED', task);

    try {
      // Route to appropriate handler based on intent category
      let result: any;

      switch (task.intent.category) {
        case 'NAVIGATION':
          result = await this.handleNavigation(task);
          break;
        case 'QUERY':
          result = await this.handleQuery(task);
          break;
        case 'MUTATION':
          result = await this.handleMutation(task);
          break;
        case 'CREATION':
          result = await this.handleCreation(task);
          break;
        case 'ANALYSIS':
          result = await this.handleAnalysis(task);
          break;
        case 'ORCHESTRATION':
          result = await this.handleOrchestration(task);
          break;
        case 'BIOMETRIC':
          result = await this.handleBiometricResponse(task);
          break;
        default:
          result = await this.handleGeneric(task);
      }

      task.status = 'COMPLETED';
      task.completedAt = Date.now();
      task.result = result;
      this.emit('TASK_COMPLETED', task);

      return result;
    } catch (error: any) {
      task.status = 'FAILED';
      task.completedAt = Date.now();
      task.error = error.message;
      this.emit('TASK_FAILED', task);
      throw error;
    }
  }

  // ============================================================================
  // INTENT HANDLERS
  // ============================================================================

  private async handleNavigation(task: KernelTask): Promise<any> {
    const { intent } = task;
    return {
      action: 'NAVIGATE',
      targetMode: intent.targetMode,
      entities: intent.entities,
    };
  }

  private async handleQuery(task: KernelTask): Promise<any> {
    // Query handler would integrate with RAG/memory system
    return {
      action: 'QUERY',
      contextLoaded: task.contextPages.length,
      suggestedTools: task.intent.suggestedTools,
    };
  }

  private async handleMutation(task: KernelTask): Promise<any> {
    return {
      action: 'MUTATE',
      entities: task.intent.entities,
    };
  }

  private async handleCreation(task: KernelTask): Promise<any> {
    return {
      action: 'CREATE',
      entities: task.intent.entities,
    };
  }

  private async handleAnalysis(task: KernelTask): Promise<any> {
    return {
      action: 'ANALYZE',
      contextLoaded: task.contextPages.length,
    };
  }

  private async handleOrchestration(task: KernelTask): Promise<any> {
    return {
      action: 'ORCHESTRATE',
      agents: task.intent.entities.filter(e => e.type === 'AGENT'),
    };
  }

  private async handleBiometricResponse(task: KernelTask): Promise<any> {
    // Handle gaze-triggered or stress-triggered actions
    const biometricCtx = task.intent.biometricContext;
    if (!biometricCtx) {
      return { action: 'BIOMETRIC_NOOP' };
    }

    if (biometricCtx.stressLevel.value > 70 && this.adaptiveUIEnabled) {
      return {
        action: 'UI_SIMPLIFY',
        reason: 'HIGH_STRESS',
        stressLevel: biometricCtx.stressLevel.value,
      };
    }

    if (biometricCtx.recentFixations.length > 0) {
      const lastFixation = biometricCtx.recentFixations[0];
      return {
        action: 'CONTEXT_PREFETCH',
        reason: 'GAZE_FIXATION',
        target: lastFixation.targetElement,
        duration: lastFixation.duration,
      };
    }

    return { action: 'BIOMETRIC_NOOP' };
  }

  private async handleGeneric(task: KernelTask): Promise<any> {
    return {
      action: 'GENERIC',
      intent: task.intent,
    };
  }

  // ============================================================================
  // BIOMETRIC INTEGRATION
  // ============================================================================

  /**
   * Update biometric context from sensor hooks
   */
  updateBiometricContext(context: BiometricContext): void {
    this.biometricContext = context;
    this.metrics.biometricSamples++;
    this.metrics.currentStressLevel = context.stressLevel.value;

    if (context.recentFixations.length > 0) {
      this.metrics.lastGazeFixation = context.recentFixations[0].startTime;
    }

    // Check for stress threshold
    if (context.stressLevel.value > 80) {
      this.emit('STRESS_THRESHOLD', {
        level: context.stressLevel.value,
        trend: context.stressLevel.trend,
      });
    }

    // Check for significant gaze fixation
    const longFixation = context.recentFixations.find(f => f.duration > 2000);
    if (longFixation) {
      this.emit('GAZE_FIXATION', longFixation);
    }
  }

  /**
   * Enable/disable adaptive UI based on biometrics
   */
  setAdaptiveUIEnabled(enabled: boolean): void {
    this.adaptiveUIEnabled = enabled;
    console.log(`⚡ KERNEL: Adaptive UI ${enabled ? 'enabled' : 'disabled'}`);
  }

  // ============================================================================
  // EVENT SYSTEM
  // ============================================================================

  /**
   * Subscribe to specific kernel events
   */
  on(eventType: KernelEventType, handler: KernelEventHandler): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);
    return () => this.eventHandlers.get(eventType)?.delete(handler);
  }

  /**
   * Subscribe to all kernel events
   */
  onAll(handler: KernelEventHandler): () => void {
    this.globalHandlers.add(handler);
    return () => this.globalHandlers.delete(handler);
  }

  /**
   * Emit a kernel event
   */
  private emit(type: KernelEventType, payload: any): void {
    const event: KernelEvent = {
      id: crypto.randomUUID(),
      type,
      timestamp: Date.now(),
      payload,
      source: 'AgentKernel',
    };

    // Notify specific handlers
    this.eventHandlers.get(type)?.forEach(handler => {
      try {
        handler(event);
      } catch (e) {
        console.error('KERNEL: Event handler error', e);
      }
    });

    // Notify global handlers
    this.globalHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (e) {
        console.error('KERNEL: Global handler error', e);
      }
    });
  }

  // ============================================================================
  // METRICS & STATE
  // ============================================================================

  /**
   * Get current kernel state
   */
  getState(): KernelState {
    return this.state;
  }

  /**
   * Get kernel metrics
   */
  getMetrics(): KernelMetrics {
    return {
      ...this.metrics,
      uptime: this.bootTime ? Date.now() - this.bootTime : 0,
      taskQueueDepth: this.scheduler.getQueueDepth(),
    };
  }

  /**
   * Get semantic pager instance for direct access
   */
  getSemanticPager(): SemanticPager {
    return this.semanticPager;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private determinePriority(intent: ResolvedIntent, options: DispatchOptions): TaskPriority {
    // Biometric-triggered tasks get elevated priority
    if (intent.category === 'BIOMETRIC') {
      return 'HIGH';
    }

    // User-specified priority
    if (options.priority) {
      return options.priority;
    }

    // Navigation is typically quick and high priority
    if (intent.category === 'NAVIGATION') {
      return 'HIGH';
    }

    // Analysis tasks can be background
    if (intent.category === 'ANALYSIS') {
      return 'NORMAL';
    }

    return 'NORMAL';
  }

  private startDispatchLoop(): void {
    // Background loop for proactive tasks
    setInterval(() => {
      if (this.state !== 'IDLE') return;

      // Check for gaze-triggered prefetch opportunities
      if (this.biometricContext?.recentFixations.length) {
        const fixation = this.biometricContext.recentFixations[0];
        if (fixation.duration > 1500 && fixation.targetElement) {
          this.semanticPager.prefetchForElement(fixation.targetElement);
        }
      }
    }, 500);
  }
}

// ============================================================================
// TYPES FOR DISPATCH
// ============================================================================

export interface DispatchOptions {
  currentMode?: string;
  priority?: TaskPriority;
  timeout?: number;
  skipPaging?: boolean;
}

export interface DispatchResult {
  success: boolean;
  result?: any;
  intent?: ResolvedIntent;
  error?: string;
  latencyMs?: number;
}

// Singleton export
export const agentKernel = new AgentKernelService();
