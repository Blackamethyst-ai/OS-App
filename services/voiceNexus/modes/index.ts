/**
 * VOICE NEXUS - Mode Handlers
 *
 * Modular voice mode implementations for different use cases.
 */

export { realtimeMode } from './realtimeMode';
export { hybridMode } from './hybridMode';
export { browserMode } from './browserMode';

export type { ModeHandler, ModeContext, ModeHandlerFactory } from './types';

// Mode registry for dynamic lookup
import { realtimeMode } from './realtimeMode';
import { hybridMode } from './hybridMode';
import { browserMode } from './browserMode';
import type { ModeHandler } from './types';

/**
 * Get mode handler by name
 */
export function getModeHandler(mode: 'realtime' | 'hybrid' | 'browser'): ModeHandler {
    switch (mode) {
        case 'realtime':
            return realtimeMode;
        case 'hybrid':
            return hybridMode;
        case 'browser':
            return browserMode;
        default:
            throw new Error(`Unknown mode: ${mode}`);
    }
}

/**
 * Get the best available mode based on current configuration
 */
export function getBestAvailableMode(): ModeHandler {
    // Prefer realtime if Gemini is available
    if (realtimeMode.isAvailable()) {
        return realtimeMode;
    }

    // Fall back to browser mode
    if (browserMode.isAvailable()) {
        return browserMode;
    }

    throw new Error('No voice mode available - check API keys and browser support');
}

/**
 * Check which modes are available
 */
export function getAvailableModes(): { realtime: boolean; hybrid: boolean; browser: boolean } {
    return {
        realtime: realtimeMode.isAvailable(),
        hybrid: hybridMode.isAvailable(),
        browser: browserMode.isAvailable(),
    };
}
