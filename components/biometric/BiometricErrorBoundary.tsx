/**
 * BIOMETRIC ERROR BOUNDARY
 *
 * STABILIZATION Protocol §3: Graceful Fallbacks
 *
 * Catches errors in biometric/adaptive UI components and:
 * - Reverts to default static layout
 * - Shows non-intrusive error notification
 * - Logs error for debugging
 * - Prevents white-screen crashes
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

export class BiometricErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error
    console.error('BIOMETRIC_ERROR_BOUNDARY: Caught error:', error);
    console.error('Component stack:', errorInfo.componentStack);

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Emit event for toast notification
    window.dispatchEvent(new CustomEvent('biometric-error', {
      detail: {
        message: 'Adaptive UI encountered an error - reverting to default layout',
        error: error.message,
      }
    }));

    // Track error count without triggering re-render (use class field)
    const newCount = this.state.errorCount + 1;

    // Auto-recover after 5 seconds (if less than 3 errors)
    if (newCount < 3) {
      this.resetTimeoutId = setTimeout(() => {
        this.setState(prev => ({ hasError: false, error: null, errorCount: prev.errorCount + 1 }));
      }, 5000);
    }
  }

  componentWillUnmount(): void {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Show fallback UI or custom fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback: minimal error state
      return (
        <div className="biometric-error-fallback p-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-red-400 text-sm font-medium mb-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Adaptive UI Error
            </div>
            <p className="text-white/60 text-xs mb-3">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            {this.state.errorCount < 3 ? (
              <button
                onClick={this.handleRetry}
                className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs rounded transition-colors"
              >
                Retry
              </button>
            ) : (
              <p className="text-red-400/60 text-xs">
                Too many errors. Please refresh the page.
              </p>
            )}
          </div>
          {/* Do NOT re-render children here — they threw the error */}
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap any component with error boundary
 */
export function withBiometricErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
): React.FC<P> {
  return function WithErrorBoundary(props: P) {
    return (
      <BiometricErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </BiometricErrorBoundary>
    );
  };
}

export default BiometricErrorBoundary;
