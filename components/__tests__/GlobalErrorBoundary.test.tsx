// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ============================================================================
// MOCKS
// ============================================================================

vi.mock('lucide-react', () => ({
  AlertTriangle: (props: Record<string, unknown>) => <span data-testid="icon-alert" {...props} />,
  RefreshCw: (props: Record<string, unknown>) => <span data-testid="icon-refresh" {...props} />,
}));

const mockLoggerError = vi.hoisted(() => vi.fn());
vi.mock('../../services/logger', () => ({
  logger: {
    error: mockLoggerError,
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { GlobalErrorBoundary } from '../GlobalErrorBoundary';

// A component that throws an error on render
const ThrowingComponent = ({ message }: { message: string }) => {
  throw new Error(message);
};

// A component that renders normally
const GoodChild = () => <div>Child rendered OK</div>;

describe('GlobalErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error from React's error boundary logging
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when there is no error', () => {
    render(
      <GlobalErrorBoundary>
        <GoodChild />
      </GlobalErrorBoundary>
    );
    expect(screen.getByText('Child rendered OK')).toBeTruthy();
  });

  it('displays default fallback UI when a child throws', () => {
    render(
      <GlobalErrorBoundary>
        <ThrowingComponent message="Test crash" />
      </GlobalErrorBoundary>
    );
    expect(screen.getByText('System Critical')).toBeTruthy();
    expect(screen.getByText('Reboot System Kernel')).toBeTruthy();
  });

  it('displays the error message in the fallback UI', () => {
    render(
      <GlobalErrorBoundary>
        <ThrowingComponent message="Something broke badly" />
      </GlobalErrorBoundary>
    );
    expect(screen.getByText(/Something broke badly/)).toBeTruthy();
  });

  it('renders custom fallback when provided', () => {
    render(
      <GlobalErrorBoundary fallback={<div>Custom error page</div>}>
        <ThrowingComponent message="fail" />
      </GlobalErrorBoundary>
    );
    expect(screen.getByText('Custom error page')).toBeTruthy();
    expect(screen.queryByText('System Critical')).toBeNull();
  });

  it('calls logger.error when an error is caught', () => {
    render(
      <GlobalErrorBoundary>
        <ThrowingComponent message="Logged error" />
      </GlobalErrorBoundary>
    );
    expect(mockLoggerError).toHaveBeenCalled();
    expect(mockLoggerError.mock.calls[0][0]).toBe('GLOBAL ERROR CAUGHT:');
  });

  it('calls window.location.reload when reboot button is clicked', () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
    });

    render(
      <GlobalErrorBoundary>
        <ThrowingComponent message="crash" />
      </GlobalErrorBoundary>
    );

    fireEvent.click(screen.getByText('Reboot System Kernel'));
    expect(reloadMock).toHaveBeenCalled();
  });

  it('displays the stabilization protocol subtitle', () => {
    render(
      <GlobalErrorBoundary>
        <ThrowingComponent message="err" />
      </GlobalErrorBoundary>
    );
    expect(screen.getByText('Master Stabilization Protocol Active')).toBeTruthy();
  });
});
