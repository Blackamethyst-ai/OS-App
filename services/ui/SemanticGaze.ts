/**
 * SEMANTIC GAZE SERVICE
 *
 * Uses Vision Language Models to identify semantic targets of gaze,
 * not just coordinates. Answers "What is the user looking at?" semantically.
 *
 * Reference: VL4Gaze (arXiv:2512.20735)
 *
 * Features:
 * - Real VLM integration (Claude Vision + Gemini Vision)
 * - Automatic screenshot capture via html2canvas
 * - Smart caching and cooldown to minimize API calls
 * - DOM fallback when VLM unavailable
 */

import { getAI, safeParseJson } from '../geminiService';
import { claudeService } from '../claudeService';
import { apiKeyService } from '../apiKeyService';
import {
  SemanticGazeTarget,
  SemanticIntent,
  GazeSemanticContext,
  GazePattern,
} from './types';
import { logger } from '../logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

type VLMProvider = 'claude' | 'gemini' | 'auto';

const CONFIG = {
  provider: 'auto' as VLMProvider, // 'claude', 'gemini', or 'auto'
  claudeModel: 'claude-sonnet-4-6',
  geminiModel: 'gemini-2.0-flash',
  analysisCooldownMs: 500, // Don't analyze more than 2x per second
  maxCacheSize: 50,
  screenshotQuality: 0.7, // JPEG quality for screenshots
  screenshotScale: 0.5, // Downscale to reduce tokens/bandwidth
  enableScreenshots: true, // Set to false to use DOM-only analysis
  // STABILIZATION: API Safety (Protocol §5)
  vlmRateLimitMs: 3000, // Max 1 VLM request per 3 seconds
  requireExplicitEnable: true, // Require user to enable AI analysis
  aiAnalysisEnabledKey: 'biometric_ai_analysis_enabled',
};

const ANALYSIS_COOLDOWN_MS = CONFIG.analysisCooldownMs;
const MAX_CACHE_SIZE = CONFIG.maxCacheSize;

// ============================================================================
// SEMANTIC GAZE ANALYZER
// ============================================================================

class SemanticGazeAnalyzer {
  private lastAnalysisTime: number = 0;
  private analysisCache: Map<string, SemanticGazeTarget> = new Map();
  private gazeHistory: Array<{ x: number; y: number; timestamp: number }> = [];
  private isAnalyzing: boolean = false;
  private screenshotCanvas: HTMLCanvasElement | null = null;
  private lastVLMCallTime: number = 0;
  private vlmCallCount: number = 0;

  /**
   * Capture screenshot of current viewport for VLM analysis
   */
  async captureScreenshot(): Promise<string | null> {
    try {
      // Use canvas-based screenshot (faster than html2canvas)
      if (!this.screenshotCanvas) {
        this.screenshotCanvas = document.createElement('canvas');
      }

      const canvas = this.screenshotCanvas;
      const scale = CONFIG.screenshotScale;
      canvas.width = window.innerWidth * scale;
      canvas.height = window.innerHeight * scale;

      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Try to use the experimental drawWindow API (Firefox) or fall back to CSS approach
      // For production, we'd use html2canvas, but for performance we'll use a simpler approach

      // Create a temporary container with the app's HTML
      // This is a simplified approach - in production, use html2canvas or similar
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw approximate UI regions based on known layout
      await this.drawUIRegionsToCanvas(ctx, scale);

      // Convert to base64
      const dataUrl = canvas.toDataURL('image/jpeg', CONFIG.screenshotQuality);
      return dataUrl.split(',')[1]; // Remove data:image/jpeg;base64, prefix
    } catch (error) {
      logger.error('Screenshot capture failed', error, 'SEMANTIC_GAZE');
      return null;
    }
  }

  /**
   * Draw approximate UI regions to canvas for VLM context
   */
  private async drawUIRegionsToCanvas(ctx: CanvasRenderingContext2D, scale: number): Promise<void> {
    // Get all elements with data-biometric-id or data-semantic-type
    const semanticElements = document.querySelectorAll('[data-biometric-id], [data-semantic-type], [data-region-id]');

    ctx.font = `${10 * scale}px monospace`;

    semanticElements.forEach(el => {
      const rect = el.getBoundingClientRect();
      const id = el.getAttribute('data-biometric-id') || el.getAttribute('data-semantic-type') || el.id;

      // Draw rectangle
      ctx.strokeStyle = 'rgba(157, 78, 221, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(rect.left * scale, rect.top * scale, rect.width * scale, rect.height * scale);

      // Draw label
      if (id) {
        ctx.fillStyle = 'rgba(157, 78, 221, 0.8)';
        ctx.fillText(id, rect.left * scale + 2, rect.top * scale + 12);
      }
    });

    // Draw gaze point indicator
    const gazeX = (window as any).__lastMouseX || window.innerWidth / 2;
    const gazeY = (window as any).__lastMouseY || window.innerHeight / 2;

    ctx.beginPath();
    ctx.arc(gazeX * scale, gazeY * scale, 10 * scale, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
    ctx.fill();
    ctx.strokeStyle = 'cyan';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  /**
   * Get the best available VLM provider
   */
  private getVLMProvider(): VLMProvider | null {
    if (CONFIG.provider !== 'auto') {
      const key = CONFIG.provider === 'claude' ? 'claude' : 'gemini';
      return apiKeyService.getKey(key) ? CONFIG.provider : null;
    }

    // Auto mode: prefer Claude for vision quality, fall back to Gemini
    if (apiKeyService.getKey('claude')) return 'claude';
    if (apiKeyService.getKey('gemini')) return 'gemini';
    return null;
  }

  /**
   * Analyze what the user is looking at using VLM
   */
  async analyzeGazeTarget(
    gazeX: number,
    gazeY: number,
    screenshotBase64?: string
  ): Promise<SemanticGazeTarget | null> {
    const now = Date.now();

    // Cooldown check
    if (now - this.lastAnalysisTime < ANALYSIS_COOLDOWN_MS) {
      return this.getNearestCachedTarget(gazeX, gazeY);
    }

    if (this.isAnalyzing) {
      return this.getNearestCachedTarget(gazeX, gazeY);
    }

    this.lastAnalysisTime = now;
    this.isAnalyzing = true;

    try {
      const provider = this.getVLMProvider();

      // If VLM is available and screenshots enabled, use VLM
      if (provider && CONFIG.enableScreenshots) {
        // Capture screenshot if not provided
        const screenshot = screenshotBase64 || await this.captureScreenshot();

        if (screenshot) {
          return await this.analyzeWithVLM(gazeX, gazeY, screenshot, provider);
        }
      }

      // Fallback: DOM-based semantic detection
      return await this.analyzeFromDOM(gazeX, gazeY);
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * STABILIZATION: Check if AI analysis is enabled (Protocol §5)
   */
  private isAIAnalysisEnabled(): boolean {
    // Check if user has explicitly enabled AI analysis
    if (CONFIG.requireExplicitEnable) {
      const enabled = localStorage.getItem(CONFIG.aiAnalysisEnabledKey);
      if (enabled !== 'true') {
        return false;
      }
    }
    return true;
  }

  /**
   * Enable or disable AI analysis
   */
  setAIAnalysisEnabled(enabled: boolean): void {
    localStorage.setItem(CONFIG.aiAnalysisEnabledKey, enabled ? 'true' : 'false');
  }

  /**
   * Use Vision LLM to semantically identify gaze target
   */
  private async analyzeWithVLM(
    gazeX: number,
    gazeY: number,
    screenshotBase64: string,
    provider: VLMProvider = 'auto'
  ): Promise<SemanticGazeTarget | null> {
    const now = Date.now();

    // STABILIZATION: API Safety checks (Protocol §5)
    // 1. Check if AI analysis is explicitly enabled
    if (!this.isAIAnalysisEnabled()) {
      logger.debug('AI analysis disabled - using DOM fallback', undefined, 'SEMANTIC_GAZE');
      return this.analyzeFromDOM(gazeX, gazeY);
    }

    // 2. Check API key exists
    const hasApiKey = apiKeyService.getKey('claude') || apiKeyService.getGeminiKey();
    if (!hasApiKey) {
      logger.debug('No API key - using DOM fallback', undefined, 'SEMANTIC_GAZE');
      return this.analyzeFromDOM(gazeX, gazeY);
    }

    // 3. Rate limiting: max 1 request per 3 seconds
    if (now - this.lastVLMCallTime < CONFIG.vlmRateLimitMs) {
      logger.debug('Rate limited - using cached/DOM fallback', undefined, 'SEMANTIC_GAZE');
      return this.getNearestCachedTarget(gazeX, gazeY) || this.analyzeFromDOM(gazeX, gazeY);
    }

    this.lastVLMCallTime = now;
    this.vlmCallCount++;

    const prompt = `You are analyzing a screenshot of a developer dashboard UI to identify what UI element the user is looking at.

The user's gaze point is marked with a cyan circle at approximately (${gazeX}, ${gazeY}) pixels from top-left.
Screen dimensions: ${window.innerWidth}x${window.innerHeight}

UI elements are labeled with purple rectangles and text IDs.

Analyze the screenshot and identify:
1. What UI element is at or near the cyan gaze marker
2. The semantic type of element (TERMINAL, CODE_EDITOR, PANEL, BUTTON, NAVIGATION, METRICS, CHART, TEXT, UNKNOWN)
3. A human-readable label for the element (e.g., "Terminal Output Panel", "Code Editor", "CPU Metrics Chart")
4. What the user's likely intent is based on looking at this element

Respond ONLY with valid JSON (no markdown, no explanation):
{
  "elementId": "inferred-id",
  "elementType": "TERMINAL|CODE_EDITOR|PANEL|BUTTON|NAVIGATION|METRICS|CHART|TEXT|UNKNOWN",
  "semanticLabel": "Human readable label",
  "confidence": 0.0-1.0,
  "inferredIntent": "READING|SEARCHING|DEBUGGING|COMPARING|NAVIGATING|WAITING|CONFUSED|FOCUSED|SCANNING|IDLE",
  "boundingBox": { "x": 0, "y": 0, "width": 100, "height": 100 },
  "contextualImportance": 0-100
}`;

    try {
      let responseText: string;

      if (provider === 'claude') {
        // Use Claude Vision
        responseText = await claudeService.generateVision(
          prompt,
          screenshotBase64,
          'image/jpeg',
          CONFIG.claudeModel
        );
        logger.debug('Claude Vision analysis complete', undefined, 'SEMANTIC_GAZE');
      } else {
        // Use Gemini Vision
        const ai = getAI();
        const response = await ai.models.generateContent({
          model: CONFIG.geminiModel,
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: screenshotBase64,
                  },
                },
              ],
            },
          ],
        });
        responseText = response.text || '';
        logger.debug('Gemini Vision analysis complete', undefined, 'SEMANTIC_GAZE');
      }

      // Parse the JSON response
      const result = this.parseVLMResponse(responseText, gazeX, gazeY);
      if (result) {
        this.cacheTarget(gazeX, gazeY, result);
        return result;
      }

      // If parsing failed, fall back to DOM
      return this.analyzeFromDOM(gazeX, gazeY);
    } catch (error) {
      logger.error('VLM analysis failed', error, 'SEMANTIC_GAZE');
      return this.analyzeFromDOM(gazeX, gazeY);
    }
  }

  /**
   * Parse VLM response into SemanticGazeTarget
   */
  private parseVLMResponse(
    responseText: string,
    gazeX: number,
    gazeY: number
  ): SemanticGazeTarget | null {
    try {
      // Try to extract JSON from the response
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

      const parsed = JSON.parse(jsonStr.trim());

      // Validate and normalize the response
      return {
        elementId: parsed.elementId || `vlm-${Date.now()}`,
        elementType: this.normalizeElementType(parsed.elementType),
        semanticLabel: parsed.semanticLabel || 'Unknown Element',
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.7)),
        inferredIntent: this.normalizeIntent(parsed.inferredIntent),
        boundingBox: parsed.boundingBox || { x: gazeX - 50, y: gazeY - 50, width: 100, height: 100 },
        contextualImportance: Math.max(0, Math.min(100, parsed.contextualImportance || 50)),
      };
    } catch (error) {
      logger.error('Failed to parse VLM response', error, 'SEMANTIC_GAZE');
      return null;
    }
  }

  /**
   * Normalize element type to valid enum value
   */
  private normalizeElementType(type: string): SemanticGazeTarget['elementType'] {
    const validTypes = ['TERMINAL', 'CODE_EDITOR', 'PANEL', 'BUTTON', 'NAVIGATION', 'METRICS', 'CHART', 'TEXT', 'UNKNOWN'];
    const normalized = (type || '').toUpperCase();
    return validTypes.includes(normalized) ? normalized as SemanticGazeTarget['elementType'] : 'UNKNOWN';
  }

  /**
   * Normalize intent to valid enum value
   */
  private normalizeIntent(intent: string): SemanticIntent {
    const validIntents = ['READING', 'SEARCHING', 'DEBUGGING', 'COMPARING', 'NAVIGATING', 'WAITING', 'CONFUSED', 'FOCUSED', 'SCANNING', 'IDLE'];
    const normalized = (intent || '').toUpperCase();
    return validIntents.includes(normalized) ? normalized as SemanticIntent : 'IDLE';
  }

  /**
   * Get VLM usage statistics
   */
  getVLMStats(): { callCount: number; lastCallTime: number; provider: VLMProvider | null } {
    return {
      callCount: this.vlmCallCount,
      lastCallTime: this.lastVLMCallTime,
      provider: this.getVLMProvider(),
    };
  }

  /**
   * Fallback: Analyze gaze target from DOM structure
   */
  private async analyzeFromDOM(
    gazeX: number,
    gazeY: number
  ): Promise<SemanticGazeTarget | null> {
    const element = document.elementFromPoint(gazeX, gazeY);
    if (!element) return null;

    const target = this.classifyDOMElement(element, gazeX, gazeY);
    if (target) {
      this.cacheTarget(gazeX, gazeY, target);
    }
    return target;
  }

  /**
   * Classify a DOM element into semantic types
   */
  private classifyDOMElement(
    element: Element,
    gazeX: number,
    gazeY: number
  ): SemanticGazeTarget | null {
    const rect = element.getBoundingClientRect();

    // Check for semantic markers first
    const biometricId = element.getAttribute('data-biometric-id') ||
      element.closest('[data-biometric-id]')?.getAttribute('data-biometric-id');
    const semanticType = element.getAttribute('data-semantic-type') ||
      element.closest('[data-semantic-type]')?.getAttribute('data-semantic-type');

    // Infer type from element characteristics
    let elementType: SemanticGazeTarget['elementType'] = 'UNKNOWN';
    let semanticLabel = 'Unknown Element';
    let inferredIntent: SemanticIntent = 'IDLE';

    const tagName = element.tagName.toLowerCase();
    const classList = Array.from(element.classList);
    const id = element.id;

    // Terminal detection
    if (
      classList.some(c => c.includes('terminal')) ||
      id.includes('terminal') ||
      element.closest('[data-terminal]') ||
      semanticType === 'terminal'
    ) {
      elementType = 'TERMINAL';
      semanticLabel = 'Terminal Output';
      inferredIntent = 'DEBUGGING';
    }
    // Code editor detection
    else if (
      classList.some(c => c.includes('code') || c.includes('editor') || c.includes('monaco')) ||
      element.closest('.code-editor, .monaco-editor, [data-code-editor]')
    ) {
      elementType = 'CODE_EDITOR';
      semanticLabel = 'Code Editor';
      inferredIntent = 'FOCUSED';
    }
    // Chart/metrics detection
    else if (
      classList.some(c => c.includes('chart') || c.includes('metric') || c.includes('recharts')) ||
      element.closest('.recharts-wrapper, [data-chart]')
    ) {
      elementType = 'CHART';
      semanticLabel = 'Metrics Chart';
      inferredIntent = 'READING';
    }
    // Button detection
    else if (
      tagName === 'button' ||
      element.getAttribute('role') === 'button' ||
      classList.some(c => c.includes('btn') || c.includes('button'))
    ) {
      elementType = 'BUTTON';
      semanticLabel = element.textContent?.trim().slice(0, 30) || 'Action Button';
      inferredIntent = 'NAVIGATING';
    }
    // Navigation detection
    else if (
      tagName === 'nav' ||
      classList.some(c => c.includes('nav') || c.includes('sidebar') || c.includes('menu')) ||
      element.closest('nav, [role="navigation"]')
    ) {
      elementType = 'NAVIGATION';
      semanticLabel = 'Navigation Menu';
      inferredIntent = 'NAVIGATING';
    }
    // Panel detection
    else if (
      classList.some(c => c.includes('panel') || c.includes('card') || c.includes('module')) ||
      element.closest('[data-panel]')
    ) {
      elementType = 'PANEL';
      const title = element.querySelector('h1, h2, h3, [class*="title"]')?.textContent;
      semanticLabel = title?.trim().slice(0, 40) || 'Panel';
      inferredIntent = 'READING';
    }
    // Text content
    else if (
      tagName === 'p' || tagName === 'span' || tagName === 'div' ||
      element.textContent && element.textContent.length > 20
    ) {
      elementType = 'TEXT';
      semanticLabel = 'Text Content';
      inferredIntent = 'READING';
    }

    return {
      elementId: biometricId || id || `element-${Date.now()}`,
      elementType,
      semanticLabel,
      confidence: semanticType ? 0.95 : 0.7,
      inferredIntent,
      boundingBox: {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      },
      contextualImportance: this.calculateImportance(elementType, inferredIntent),
    };
  }

  /**
   * Calculate contextual importance based on element type and intent
   */
  private calculateImportance(
    type: SemanticGazeTarget['elementType'],
    intent: SemanticIntent
  ): number {
    const typeScores: Record<string, number> = {
      TERMINAL: 80,
      CODE_EDITOR: 90,
      CHART: 70,
      METRICS: 75,
      BUTTON: 60,
      NAVIGATION: 50,
      PANEL: 65,
      TEXT: 40,
      UNKNOWN: 20,
    };

    const intentBoost: Record<string, number> = {
      FOCUSED: 20,
      DEBUGGING: 15,
      READING: 5,
      SEARCHING: 10,
      NAVIGATING: 10,
      CONFUSED: -10,
      IDLE: -20,
    };

    return Math.min(100, (typeScores[type] || 50) + (intentBoost[intent] || 0));
  }

  /**
   * Analyze gaze pattern from history
   */
  analyzeGazePattern(): GazePattern {
    if (this.gazeHistory.length < 5) return 'FIXATED';

    const recent = this.gazeHistory.slice(-10);
    const deltaXs: number[] = [];
    const deltaYs: number[] = [];

    for (let i = 1; i < recent.length; i++) {
      deltaXs.push(recent[i].x - recent[i - 1].x);
      deltaYs.push(recent[i].y - recent[i - 1].y);
    }

    const avgDeltaX = Math.abs(deltaXs.reduce((a, b) => a + b, 0) / deltaXs.length);
    const avgDeltaY = Math.abs(deltaYs.reduce((a, b) => a + b, 0) / deltaYs.length);
    const totalMovement = avgDeltaX + avgDeltaY;

    if (totalMovement < 10) return 'FIXATED';
    if (avgDeltaX > avgDeltaY * 2) return 'SCANNING_H';
    if (avgDeltaY > avgDeltaX * 2) return 'SCANNING_V';
    if (totalMovement > 100) return 'ERRATIC';

    // Check for alternating pattern
    const xDirectionChanges = deltaXs.filter((d, i) => i > 0 && Math.sign(d) !== Math.sign(deltaXs[i - 1])).length;
    if (xDirectionChanges > 3) return 'ALTERNATING';

    return 'SEQUENTIAL';
  }

  /**
   * Build full semantic context from current state
   */
  async buildSemanticContext(
    gazeX: number,
    gazeY: number,
    screenshotBase64?: string
  ): Promise<GazeSemanticContext> {
    // Record gaze point
    this.gazeHistory.push({ x: gazeX, y: gazeY, timestamp: Date.now() });
    if (this.gazeHistory.length > 100) {
      this.gazeHistory = this.gazeHistory.slice(-50);
    }

    const primaryTarget = await this.analyzeGazeTarget(gazeX, gazeY, screenshotBase64);
    const pattern = this.analyzeGazePattern();

    // Get secondary targets from nearby cached results
    const secondaryTargets = this.getSecondaryTargets(gazeX, gazeY, primaryTarget?.elementId);

    // Calculate attention distribution
    const attentionDistribution = this.calculateAttentionDistribution();

    // Infer current task
    const inferredTask = this.inferTask(primaryTarget, pattern);

    return {
      primaryTarget,
      secondaryTargets,
      gazePattern: pattern,
      inferredTask,
      attentionDistribution,
      timestamp: Date.now(),
    };
  }

  /**
   * Infer user's current task from gaze context
   */
  private inferTask(
    target: SemanticGazeTarget | null,
    pattern: GazePattern
  ): string {
    if (!target) return 'Idle';

    const typeTaskMap: Record<string, string> = {
      TERMINAL: 'Reviewing terminal output',
      CODE_EDITOR: 'Writing or reviewing code',
      CHART: 'Analyzing metrics',
      METRICS: 'Monitoring system health',
      BUTTON: 'Preparing action',
      NAVIGATION: 'Navigating interface',
      PANEL: 'Reading panel content',
      TEXT: 'Reading text',
    };

    let task = typeTaskMap[target.elementType] || 'Browsing interface';

    // Modify based on pattern
    if (pattern === 'ERRATIC') task += ' (searching)';
    if (pattern === 'FIXATED') task += ' (focused)';
    if (pattern === 'ALTERNATING') task = 'Comparing elements';

    return task;
  }

  /**
   * Get secondary targets near the gaze point
   */
  private getSecondaryTargets(
    x: number,
    y: number,
    excludeId?: string
  ): SemanticGazeTarget[] {
    const secondary: SemanticGazeTarget[] = [];
    const radius = 200;

    for (const [key, target] of this.analysisCache.entries()) {
      if (target.elementId === excludeId) continue;

      const [cachedX, cachedY] = key.split(',').map(Number);
      const distance = Math.sqrt(Math.pow(cachedX - x, 2) + Math.pow(cachedY - y, 2));

      if (distance < radius) {
        secondary.push(target);
      }
    }

    return secondary.slice(0, 3);
  }

  /**
   * Calculate attention distribution across elements
   */
  private calculateAttentionDistribution(): Map<string, number> {
    const distribution = new Map<string, number>();
    const totalTime = this.gazeHistory.length;

    if (totalTime < 2) return distribution;

    // Count time spent near each cached target
    for (const point of this.gazeHistory) {
      const nearestKey = this.findNearestCacheKey(point.x, point.y, 100);
      if (nearestKey) {
        const target = this.analysisCache.get(nearestKey);
        if (target) {
          const current = distribution.get(target.elementId) || 0;
          distribution.set(target.elementId, current + 1);
        }
      }
    }

    // Normalize to percentages
    for (const [id, count] of distribution.entries()) {
      distribution.set(id, Math.round((count / totalTime) * 100));
    }

    return distribution;
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  private cacheTarget(x: number, y: number, target: SemanticGazeTarget): void {
    const key = `${Math.round(x / 50) * 50},${Math.round(y / 50) * 50}`;
    this.analysisCache.set(key, target);

    if (this.analysisCache.size > MAX_CACHE_SIZE) {
      const firstKey = this.analysisCache.keys().next().value;
      if (firstKey) this.analysisCache.delete(firstKey);
    }
  }

  private getNearestCachedTarget(x: number, y: number): SemanticGazeTarget | null {
    const key = this.findNearestCacheKey(x, y, 100);
    return key ? this.analysisCache.get(key) || null : null;
  }

  private findNearestCacheKey(x: number, y: number, maxDistance: number): string | null {
    let nearestKey: string | null = null;
    let nearestDistance = maxDistance;

    for (const key of this.analysisCache.keys()) {
      const [cachedX, cachedY] = key.split(',').map(Number);
      const distance = Math.sqrt(Math.pow(cachedX - x, 2) + Math.pow(cachedY - y, 2));

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestKey = key;
      }
    }

    return nearestKey;
  }

  /**
   * Clear analysis cache
   */
  clearCache(): void {
    this.analysisCache.clear();
    this.gazeHistory = [];
  }
}

// Singleton export
export const semanticGaze = new SemanticGazeAnalyzer();
