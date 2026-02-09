/**
 * VOICE NEXUS - Health Check System
 *
 * Provides health monitoring for all voice providers.
 * Enables quick diagnosis of what's broken in the voice pipeline.
 */

import type { STTProviderType, TTSProviderType, ReasoningProviderType } from './types';

// Provider imports
import { geminiLiveSTT } from './providers/stt/geminiLive';
import { browserSTT } from './providers/stt/browserSTT';
import { claudeReasoning } from './providers/reasoning/claudeReasoning';
import { geminiReasoning } from './providers/reasoning/geminiReasoning';
import { elevenLabsTTS } from './providers/tts/elevenLabsTTS';
import { browserTTS } from './providers/tts/browserTTS';
import { knowledgeInjector } from './knowledgeInjector';

// =============================================================================
// Types
// =============================================================================

export type ProviderHealthStatus = 'healthy' | 'degraded' | 'unavailable' | 'error';

export interface ProviderHealth {
    name: string;
    status: ProviderHealthStatus;
    available: boolean;
    error?: string;
    latencyMs?: number;
    lastChecked: number;
    details?: Record<string, unknown>;
}

export interface VoiceSystemHealth {
    overall: ProviderHealthStatus;
    timestamp: number;
    stt: {
        gemini: ProviderHealth;
        browser: ProviderHealth;
        recommended: STTProviderType;
    };
    reasoning: {
        claude: ProviderHealth;
        gemini: ProviderHealth;
        recommended: ReasoningProviderType;
    };
    tts: {
        elevenlabs: ProviderHealth;
        browser: ProviderHealth;
        recommended: TTSProviderType;
    };
    knowledge: ProviderHealth;
    issues: string[];
    recommendations: string[];
}

// =============================================================================
// Individual Provider Health Checks
// =============================================================================

/**
 * Check Gemini Live STT health
 */
export async function checkGeminiSTTHealth(): Promise<ProviderHealth> {
    const startTime = Date.now();
    try {
        const available = geminiLiveSTT.isAvailable();
        return {
            name: 'gemini-live-stt',
            status: available ? 'healthy' : 'unavailable',
            available,
            latencyMs: Date.now() - startTime,
            lastChecked: Date.now(),
            details: {
                supportsStreaming: geminiLiveSTT.supportsStreaming,
            },
            error: available ? undefined : 'Gemini API key not configured',
        };
    } catch (error) {
        return {
            name: 'gemini-live-stt',
            status: 'error',
            available: false,
            error: error instanceof Error ? error.message : String(error),
            latencyMs: Date.now() - startTime,
            lastChecked: Date.now(),
        };
    }
}

/**
 * Check Browser STT health (Web Speech API)
 */
export async function checkBrowserSTTHealth(): Promise<ProviderHealth> {
    const startTime = Date.now();
    try {
        const available = browserSTT.isAvailable();
        const isStreaming = browserSTT.isCurrentlyStreaming();

        return {
            name: 'browser-stt',
            status: available ? 'healthy' : 'unavailable',
            available,
            latencyMs: Date.now() - startTime,
            lastChecked: Date.now(),
            details: {
                supportsStreaming: browserSTT.supportsStreaming,
                isCurrentlyStreaming: isStreaming,
                webSpeechApiSupported: typeof window !== 'undefined' &&
                    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window),
            },
            error: available ? undefined : 'Web Speech API not available in this browser',
        };
    } catch (error) {
        return {
            name: 'browser-stt',
            status: 'error',
            available: false,
            error: error instanceof Error ? error.message : String(error),
            latencyMs: Date.now() - startTime,
            lastChecked: Date.now(),
        };
    }
}

/**
 * Check Claude Reasoning health
 */
export async function checkClaudeHealth(): Promise<ProviderHealth> {
    const startTime = Date.now();
    try {
        const available = claudeReasoning.isAvailable();
        return {
            name: 'claude-reasoning',
            status: available ? 'healthy' : 'unavailable',
            available,
            latencyMs: Date.now() - startTime,
            lastChecked: Date.now(),
            details: {
                models: claudeReasoning.models,
            },
            error: available ? undefined : 'Claude API key not configured',
        };
    } catch (error) {
        return {
            name: 'claude-reasoning',
            status: 'error',
            available: false,
            error: error instanceof Error ? error.message : String(error),
            latencyMs: Date.now() - startTime,
            lastChecked: Date.now(),
        };
    }
}

/**
 * Check Gemini Reasoning health
 */
export async function checkGeminiReasoningHealth(): Promise<ProviderHealth> {
    const startTime = Date.now();
    try {
        const available = geminiReasoning.isAvailable();
        return {
            name: 'gemini-reasoning',
            status: available ? 'healthy' : 'unavailable',
            available,
            latencyMs: Date.now() - startTime,
            lastChecked: Date.now(),
            details: {
                models: geminiReasoning.models,
            },
            error: available ? undefined : 'Gemini API key not configured',
        };
    } catch (error) {
        return {
            name: 'gemini-reasoning',
            status: 'error',
            available: false,
            error: error instanceof Error ? error.message : String(error),
            latencyMs: Date.now() - startTime,
            lastChecked: Date.now(),
        };
    }
}

/**
 * Check ElevenLabs TTS health
 */
export async function checkElevenLabsHealth(): Promise<ProviderHealth> {
    const startTime = Date.now();
    try {
        const available = elevenLabsTTS.isAvailable();
        return {
            name: 'elevenlabs-tts',
            status: available ? 'healthy' : 'unavailable',
            available,
            latencyMs: Date.now() - startTime,
            lastChecked: Date.now(),
            details: {
                supportsStreaming: elevenLabsTTS.supportsStreaming,
                voiceCount: elevenLabsTTS.voices.length,
                availableVoices: elevenLabsTTS.voices.map(v => v.name),
            },
            error: available ? undefined : 'ElevenLabs API key not configured',
        };
    } catch (error) {
        return {
            name: 'elevenlabs-tts',
            status: 'error',
            available: false,
            error: error instanceof Error ? error.message : String(error),
            latencyMs: Date.now() - startTime,
            lastChecked: Date.now(),
        };
    }
}

/**
 * Check Browser TTS health (Web Speech Synthesis)
 */
export async function checkBrowserTTSHealth(): Promise<ProviderHealth> {
    const startTime = Date.now();
    try {
        const available = browserTTS.isAvailable();
        return {
            name: 'browser-tts',
            status: available ? 'healthy' : 'unavailable',
            available,
            latencyMs: Date.now() - startTime,
            lastChecked: Date.now(),
            details: {
                speechSynthesisSupported: typeof window !== 'undefined' && 'speechSynthesis' in window,
            },
            error: available ? undefined : 'Speech Synthesis API not available',
        };
    } catch (error) {
        return {
            name: 'browser-tts',
            status: 'error',
            available: false,
            error: error instanceof Error ? error.message : String(error),
            latencyMs: Date.now() - startTime,
            lastChecked: Date.now(),
        };
    }
}

/**
 * Check Knowledge Injector health (Agent Core API)
 */
export async function checkKnowledgeHealth(): Promise<ProviderHealth> {
    const startTime = Date.now();
    try {
        const available = await knowledgeInjector.checkAvailability();
        return {
            name: 'knowledge-injector',
            status: available ? 'healthy' : 'degraded',
            available,
            latencyMs: Date.now() - startTime,
            lastChecked: Date.now(),
            details: {
                endpoint: import.meta.env.VITE_AGENT_CORE_URL || 'http://localhost:3847',
            },
            error: available ? undefined : 'Agent Core API not reachable (knowledge injection disabled)',
        };
    } catch (error) {
        return {
            name: 'knowledge-injector',
            status: 'degraded',
            available: false,
            error: error instanceof Error ? error.message : String(error),
            latencyMs: Date.now() - startTime,
            lastChecked: Date.now(),
        };
    }
}

// =============================================================================
// Full System Health Check
// =============================================================================

/**
 * Perform comprehensive health check on all voice providers
 */
export async function checkVoiceSystemHealth(): Promise<VoiceSystemHealth> {
    const timestamp = Date.now();

    // Run all checks in parallel
    const [
        geminiSTT,
        browserSTTHealth,
        claude,
        geminiReasoningHealth,
        elevenlabs,
        browserTTSHealth,
        knowledge,
    ] = await Promise.all([
        checkGeminiSTTHealth(),
        checkBrowserSTTHealth(),
        checkClaudeHealth(),
        checkGeminiReasoningHealth(),
        checkElevenLabsHealth(),
        checkBrowserTTSHealth(),
        checkKnowledgeHealth(),
    ]);

    // Collect issues
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Analyze STT providers
    if (!geminiSTT.available && !browserSTTHealth.available) {
        issues.push('CRITICAL: No STT providers available - voice input will not work');
        recommendations.push('Configure Gemini API key or use a browser that supports Web Speech API');
    } else if (!geminiSTT.available) {
        issues.push('Gemini STT unavailable - using browser fallback (higher latency)');
        recommendations.push('Configure VITE_GEMINI_API_KEY for better STT performance');
    }

    // Analyze Reasoning providers
    if (!claude.available && !geminiReasoningHealth.available) {
        issues.push('CRITICAL: No reasoning providers available - cannot generate responses');
        recommendations.push('Configure Claude (VITE_ANTHROPIC_API_KEY) or Gemini API key');
    } else if (!claude.available) {
        issues.push('Claude unavailable - using Gemini fallback for all reasoning');
    }

    // Analyze TTS providers
    if (!elevenlabs.available && !browserTTSHealth.available) {
        issues.push('CRITICAL: No TTS providers available - voice output will not work');
        recommendations.push('Configure ElevenLabs API key or use a browser that supports Speech Synthesis');
    } else if (!elevenlabs.available) {
        issues.push('ElevenLabs unavailable - using browser TTS fallback (lower quality)');
        recommendations.push('Configure VITE_ELEVEN_LABS_KEY for premium voice quality');
    }

    // Knowledge injection is optional but recommended
    if (!knowledge.available) {
        issues.push('Knowledge injection unavailable - responses will lack research context');
        recommendations.push('Start Agent Core server (python3 ~/researchgravity/agent_core_server.py)');
    }

    // Determine recommended providers
    const recommendedSTT: STTProviderType = geminiSTT.available ? 'gemini' : 'browser';
    const recommendedReasoning: ReasoningProviderType = claude.available ? 'claude' : 'gemini';
    const recommendedTTS: TTSProviderType = elevenlabs.available ? 'elevenlabs' : 'browser';

    // Calculate overall status
    let overall: ProviderHealthStatus = 'healthy';
    if (issues.some(i => i.startsWith('CRITICAL'))) {
        overall = 'unavailable';
    } else if (issues.length > 0) {
        overall = 'degraded';
    }

    return {
        overall,
        timestamp,
        stt: {
            gemini: geminiSTT,
            browser: browserSTTHealth,
            recommended: recommendedSTT,
        },
        reasoning: {
            claude,
            gemini: geminiReasoningHealth,
            recommended: recommendedReasoning,
        },
        tts: {
            elevenlabs,
            browser: browserTTSHealth,
            recommended: recommendedTTS,
        },
        knowledge,
        issues,
        recommendations,
    };
}

// =============================================================================
// Health Report Formatting
// =============================================================================

/**
 * Format health status for console output
 */
export function formatHealthReport(health: VoiceSystemHealth): string {
    const statusEmoji = {
        healthy: '✅',
        degraded: '⚠️',
        unavailable: '❌',
        error: '💥',
    };

    const lines: string[] = [
        '╔══════════════════════════════════════════════════════════════╗',
        '║              VOICE NEXUS HEALTH REPORT                      ║',
        '╠══════════════════════════════════════════════════════════════╣',
        `║  Overall Status: ${statusEmoji[health.overall]} ${health.overall.toUpperCase().padEnd(42)}║`,
        '╠══════════════════════════════════════════════════════════════╣',
        '║  STT PROVIDERS                                               ║',
        `║    ${statusEmoji[health.stt.gemini.status]} Gemini Live: ${health.stt.gemini.status.padEnd(43)}║`,
        `║    ${statusEmoji[health.stt.browser.status]} Browser STT: ${health.stt.browser.status.padEnd(44)}║`,
        `║    → Recommended: ${health.stt.recommended.padEnd(40)}║`,
        '╠══════════════════════════════════════════════════════════════╣',
        '║  REASONING PROVIDERS                                         ║',
        `║    ${statusEmoji[health.reasoning.claude.status]} Claude: ${health.reasoning.claude.status.padEnd(48)}║`,
        `║    ${statusEmoji[health.reasoning.gemini.status]} Gemini: ${health.reasoning.gemini.status.padEnd(48)}║`,
        `║    → Recommended: ${health.reasoning.recommended.padEnd(40)}║`,
        '╠══════════════════════════════════════════════════════════════╣',
        '║  TTS PROVIDERS                                               ║',
        `║    ${statusEmoji[health.tts.elevenlabs.status]} ElevenLabs: ${health.tts.elevenlabs.status.padEnd(44)}║`,
        `║    ${statusEmoji[health.tts.browser.status]} Browser TTS: ${health.tts.browser.status.padEnd(43)}║`,
        `║    → Recommended: ${health.tts.recommended.padEnd(40)}║`,
        '╠══════════════════════════════════════════════════════════════╣',
        '║  KNOWLEDGE INJECTION                                         ║',
        `║    ${statusEmoji[health.knowledge.status]} Agent Core: ${health.knowledge.status.padEnd(44)}║`,
        '╚══════════════════════════════════════════════════════════════╝',
    ];

    if (health.issues.length > 0) {
        lines.push('');
        lines.push('ISSUES:');
        health.issues.forEach(issue => {
            lines.push(`  • ${issue}`);
        });
    }

    if (health.recommendations.length > 0) {
        lines.push('');
        lines.push('RECOMMENDATIONS:');
        health.recommendations.forEach(rec => {
            lines.push(`  → ${rec}`);
        });
    }

    return lines.join('\n');
}

/**
 * Quick health check - returns true if minimum viable voice system is available
 */
export async function isVoiceSystemViable(): Promise<{ viable: boolean; reason?: string }> {
    const health = await checkVoiceSystemHealth();

    // Need at least one STT provider
    const hasSTT = health.stt.gemini.available || health.stt.browser.available;
    if (!hasSTT) {
        return { viable: false, reason: 'No speech-to-text provider available' };
    }

    // Need at least one reasoning provider
    const hasReasoning = health.reasoning.claude.available || health.reasoning.gemini.available;
    if (!hasReasoning) {
        return { viable: false, reason: 'No reasoning provider available' };
    }

    // Need at least one TTS provider
    const hasTTS = health.tts.elevenlabs.available || health.tts.browser.available;
    if (!hasTTS) {
        return { viable: false, reason: 'No text-to-speech provider available' };
    }

    return { viable: true };
}

// =============================================================================
// Export singleton health checker
// =============================================================================

export const voiceHealthCheck = {
    checkAll: checkVoiceSystemHealth,
    checkSTT: {
        gemini: checkGeminiSTTHealth,
        browser: checkBrowserSTTHealth,
    },
    checkReasoning: {
        claude: checkClaudeHealth,
        gemini: checkGeminiReasoningHealth,
    },
    checkTTS: {
        elevenlabs: checkElevenLabsHealth,
        browser: checkBrowserTTSHealth,
    },
    checkKnowledge: checkKnowledgeHealth,
    isViable: isVoiceSystemViable,
    formatReport: formatHealthReport,
};
