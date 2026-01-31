/**
 * Voice Adapter
 *
 * Provides voice-specific interface to the capability registry
 */

import type {
  Capability,
  AppMode,
  VoiceContext,
  CapabilityMatch,
  CapabilityComplexity,
} from '../types';
import {
  getCapabilitiesForSector,
  searchCapabilities,
  executeCapability,
  generateVoiceContext,
} from '../registry';

// ============================================================================
// Voice Command Processing
// ============================================================================

export interface VoiceCommand {
  intent: string;
  confidence: number;
  entities?: Record<string, string>;
  rawTranscript: string;
}

export interface VoiceCommandResult {
  success: boolean;
  response: string;
  capability?: Capability;
  executionResult?: unknown;
  suggestions?: string[];
}

/**
 * Process a voice command and execute the matching capability
 */
export async function processVoiceCommand(
  command: VoiceCommand,
  context: { sector?: AppMode }
): Promise<VoiceCommandResult> {
  // Search for matching capability
  const matches = searchCapabilities(command.intent, {
    sector: context.sector,
    limit: 5,
  });

  if (matches.length === 0) {
    return {
      success: false,
      response: `I don't understand "${command.intent}". Try saying "help" for available commands.`,
      suggestions: getVoiceSuggestions(context.sector),
    };
  }

  const bestMatch = matches[0];

  // Check confidence threshold
  if (bestMatch.score < 30) {
    return {
      success: false,
      response: `Did you mean "${bestMatch.capability.description}"?`,
      capability: bestMatch.capability,
      suggestions: matches.slice(0, 3).map((m) => m.capability.description),
    };
  }

  // Execute the capability
  const result = await executeCapability(bestMatch.capability.id, command.entities || {});

  return {
    success: result.success,
    response: result.success
      ? `Done: ${bestMatch.capability.description}`
      : `Failed: ${result.error || 'Unknown error'}`,
    capability: bestMatch.capability,
    executionResult: result.result,
  };
}

// ============================================================================
// Voice Context Generation
// ============================================================================

/**
 * Get voice context for a sector (for AI system prompt)
 */
export function getVoiceContextForSector(sector: AppMode): VoiceContext {
  return generateVoiceContext(sector);
}

/**
 * Generate a voice-friendly capability list
 */
export function getVoiceCapabilityList(sector?: AppMode): string {
  const capabilities = sector
    ? getCapabilitiesForSector(sector)
    : getCapabilitiesForSector('DASHBOARD');

  const lines: string[] = ['Available voice commands:'];

  // Group by complexity
  const byComplexity: Record<CapabilityComplexity, Capability[]> = {
    simple: [],
    navigation: [],
    analysis: [],
    architecture: [],
    critical: [],
  };

  for (const cap of capabilities.slice(0, 20)) {
    byComplexity[cap.complexity].push(cap);
  }

  // Output grouped
  if (byComplexity.navigation.length > 0) {
    lines.push('\nNavigation:');
    for (const cap of byComplexity.navigation.slice(0, 5)) {
      lines.push(`  - ${cap.examples?.[0] || cap.description}`);
    }
  }

  if (byComplexity.simple.length > 0) {
    lines.push('\nQuick Actions:');
    for (const cap of byComplexity.simple.slice(0, 5)) {
      lines.push(`  - ${cap.examples?.[0] || cap.description}`);
    }
  }

  if (byComplexity.analysis.length > 0) {
    lines.push('\nAnalysis:');
    for (const cap of byComplexity.analysis.slice(0, 3)) {
      lines.push(`  - ${cap.examples?.[0] || cap.description}`);
    }
  }

  return lines.join('\n');
}

/**
 * Get voice command suggestions for a sector
 */
export function getVoiceSuggestions(sector?: AppMode): string[] {
  const capabilities = sector
    ? getCapabilitiesForSector(sector)
    : getCapabilitiesForSector('DASHBOARD');

  return capabilities
    .filter((c) => c.examples && c.examples.length > 0)
    .slice(0, 5)
    .map((c) => c.examples![0]);
}

// ============================================================================
// Voice-Specific Formatters
// ============================================================================

/**
 * Format a capability for voice output
 */
export function formatForVoice(capability: Capability): string {
  const example = capability.examples?.[0] || capability.description;
  return `You can say "${example}"`;
}

/**
 * Generate help response for voice
 */
export function generateVoiceHelp(sector?: AppMode): string {
  const capabilities = sector
    ? getCapabilitiesForSector(sector)
    : getCapabilitiesForSector('DASHBOARD');

  const navigationCaps = capabilities.filter((c) => c.kind === 'tab' || c.complexity === 'navigation');
  const actionCaps = capabilities.filter((c) => c.kind === 'action');

  let help = 'Here are some things you can do:\n\n';

  if (navigationCaps.length > 0) {
    help += 'To navigate, say things like:\n';
    for (const cap of navigationCaps.slice(0, 3)) {
      help += `  "${cap.examples?.[0] || cap.description}"\n`;
    }
    help += '\n';
  }

  if (actionCaps.length > 0) {
    help += 'For actions, try:\n';
    for (const cap of actionCaps.slice(0, 3)) {
      help += `  "${cap.examples?.[0] || cap.description}"\n`;
    }
  }

  return help;
}

// ============================================================================
// Voice State Management
// ============================================================================

let lastVoiceCommand: VoiceCommand | null = null;
let voiceHistory: VoiceCommand[] = [];

/**
 * Record a voice command in history
 */
export function recordVoiceCommand(command: VoiceCommand): void {
  lastVoiceCommand = command;
  voiceHistory.push(command);
  if (voiceHistory.length > 50) {
    voiceHistory = voiceHistory.slice(-50);
  }
}

/**
 * Get last voice command
 */
export function getLastVoiceCommand(): VoiceCommand | null {
  return lastVoiceCommand;
}

/**
 * Get voice command history
 */
export function getVoiceHistory(): VoiceCommand[] {
  return [...voiceHistory];
}

/**
 * Clear voice history
 */
export function clearVoiceHistory(): void {
  voiceHistory = [];
  lastVoiceCommand = null;
}
