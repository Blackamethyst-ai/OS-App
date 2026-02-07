/**
 * Security Module
 *
 * Provides security features for the OS-App:
 * - Prompt isolation (prevents extraction attacks)
 * - Access monitoring (detects suspicious queries)
 *
 * Research basis: arXiv:2601.21233 ("Just Ask" autonomous agent attacks)
 */

export * from './promptIsolation';
export * from './promptAccessMonitor';

export { default as promptIsolation } from './promptIsolation';
export { default as promptAccessMonitor } from './promptAccessMonitor';
