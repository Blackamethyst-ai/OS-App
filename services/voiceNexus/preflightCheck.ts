/**
 * VOICE NEXUS - Pre-flight Check
 *
 * Validates voice system requirements before attempting connection.
 * Provides clear, actionable error messages.
 */

import { apiKeyService } from '../apiKeyService';
import { browserSTT } from './providers/stt/browserSTT';
import { browserTTS } from './providers/tts/browserTTS';
import { logger } from '../logger';

export interface PreflightResult {
    canProceed: boolean;
    mode: 'gemini-live' | 'browser-fallback' | 'unavailable';
    errors: string[];
    warnings: string[];
    recommendations: string[];
}

/**
 * Run pre-flight checks before starting a voice session
 */
export function runPreflightCheck(): PreflightResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check vault status first
    if (!apiKeyService.isVaultUnlocked()) {
        if (apiKeyService.hasVault()) {
            errors.push('API key vault is locked. Please unlock it in Settings.');
            recommendations.push('Go to Settings > API Keys and enter your master password');
        } else {
            errors.push('No API keys configured. Please set up API keys in Settings.');
            recommendations.push('Go to Settings > API Keys to configure your API keys');
        }
    }

    // Check Gemini API key (required for Gemini Live mode)
    const hasGemini = apiKeyService.hasGeminiKey();
    if (!hasGemini) {
        warnings.push('Gemini API key not configured - Gemini Live voice mode unavailable');
        recommendations.push('Add GEMINI_API_KEY for real-time bidirectional voice');
    }

    // Check Claude API key (used for reasoning in hybrid mode)
    const hasClaude = apiKeyService.getKey('claude');
    if (!hasClaude) {
        warnings.push('Claude API key not configured - will use Gemini for all reasoning');
    }

    // Check ElevenLabs API key (premium TTS)
    const hasElevenLabs = apiKeyService.getKey('eleven_labs');
    if (!hasElevenLabs) {
        warnings.push('ElevenLabs API key not configured - using browser TTS fallback');
    }

    // Check browser capabilities
    const hasBrowserSTT = browserSTT.isAvailable();
    const hasBrowserTTS = browserTTS.isAvailable();

    if (!hasBrowserSTT) {
        warnings.push('Browser Speech Recognition not available');
    }

    if (!hasBrowserTTS) {
        warnings.push('Browser Speech Synthesis not available');
    }

    // Determine mode and viability
    let mode: 'gemini-live' | 'browser-fallback' | 'unavailable' = 'unavailable';
    let canProceed = false;

    if (hasGemini) {
        mode = 'gemini-live';
        canProceed = true;
    } else if (hasBrowserSTT && (hasClaude || hasGemini)) {
        mode = 'browser-fallback';
        canProceed = true;
        warnings.push('Running in browser fallback mode (higher latency)');
    } else if (hasBrowserSTT && hasBrowserTTS) {
        // Absolute minimum - browser STT + browser TTS, no AI reasoning
        mode = 'browser-fallback';
        canProceed = false;
        errors.push('No AI reasoning provider available. Configure Gemini or Claude API key.');
    } else {
        errors.push('Voice system requirements not met. No STT provider available.');
    }

    // Check microphone permission hint
    if (typeof navigator !== 'undefined' && navigator.permissions) {
        // Note: This is async and won't block, just a hint
        navigator.permissions.query({ name: 'microphone' as PermissionName }).then(result => {
            if (result.state === 'denied') {
                logger.warn('Microphone permission denied', undefined, 'PreflightCheck');
            }
        }).catch(() => {
            // Permission query not supported
        });
    }

    return {
        canProceed,
        mode,
        errors,
        warnings,
        recommendations,
    };
}

/**
 * Format preflight result for display
 */
export function formatPreflightResult(result: PreflightResult): string {
    const lines: string[] = [];

    if (result.canProceed) {
        lines.push(`✅ Voice system ready (${result.mode} mode)`);
    } else {
        lines.push('❌ Voice system NOT ready');
    }

    if (result.errors.length > 0) {
        lines.push('\nErrors:');
        result.errors.forEach(e => lines.push(`  ❌ ${e}`));
    }

    if (result.warnings.length > 0) {
        lines.push('\nWarnings:');
        result.warnings.forEach(w => lines.push(`  ⚠️ ${w}`));
    }

    if (result.recommendations.length > 0) {
        lines.push('\nRecommendations:');
        result.recommendations.forEach(r => lines.push(`  → ${r}`));
    }

    return lines.join('\n');
}

/**
 * Quick check if voice can start at all
 */
export function canStartVoice(): { ok: boolean; reason?: string } {
    const result = runPreflightCheck();

    if (!result.canProceed) {
        return {
            ok: false,
            reason: result.errors[0] || 'Voice system requirements not met',
        };
    }

    return { ok: true };
}

// Export for console debugging
if (typeof window !== 'undefined') {
    (window as any).__voicePreflight = {
        check: () => {
            const result = runPreflightCheck();
            logger.info(formatPreflightResult(result), undefined, 'PreflightCheck');
            return result;
        },
        canStart: canStartVoice,
    };
}
