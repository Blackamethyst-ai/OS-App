/**
 * BIOMETRIC COMPONENTS
 *
 * Biometric sensing: BiometricPanel, GazeReticle, error handling
 *
 * NOTE: BiometricPanel is NOT re-exported here to enable code splitting.
 * Import it via React.lazy(() => import('./biometric/BiometricPanel')) instead.
 */

export { BiometricErrorBoundary } from './BiometricErrorBoundary';
export { default as GazeReticle } from './GazeReticle';
