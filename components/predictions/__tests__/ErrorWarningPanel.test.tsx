// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ErrorWarningPanel } from '../ErrorWarningPanel';
import type { ErrorWarningPanelProps } from '../ErrorWarningPanel';

// Mock CSS import
vi.mock('../styles/predictions.css', () => ({}));

// Helper to create ErrorPattern objects
const makeError = (overrides: Partial<{
  error_type: string;
  context: string;
  solution: string;
  success_rate: number;
  severity: 'high' | 'medium';
  score: number;
}> = {}) => ({
  error_type: 'type_error',
  context: 'Missing type annotation',
  solution: 'Add explicit type annotations\nMore details here',
  success_rate: 0.85,
  severity: 'high' as const,
  score: 0.9,
  ...overrides,
});

describe('ErrorWarningPanel', () => {
  it('renders null when errors array is empty', () => {
    const { container } = render(<ErrorWarningPanel errors={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders null when errors is undefined-like (empty)', () => {
    const { container } = render(<ErrorWarningPanel errors={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders the panel header with error count', () => {
    const errors = [makeError(), makeError({ error_type: 'syntax_error' })];
    render(<ErrorWarningPanel errors={errors} />);
    expect(screen.getByText('Potential Errors (2)')).toBeTruthy();
  });

  it('renders compact mode with count', () => {
    const errors = [makeError(), makeError({ error_type: 'runtime_error' })];
    render(<ErrorWarningPanel errors={errors} compact={true} />);
    // Compact mode shows count in a different format
    expect(screen.getByText(/2 Potential Errors/)).toBeTruthy();
  });

  it('renders compact mode with singular form for 1 error', () => {
    const errors = [makeError()];
    render(<ErrorWarningPanel errors={errors} compact={true} />);
    expect(screen.getByText(/1 Potential Error$/)).toBeTruthy();
  });

  it('displays severity emoji for high severity', () => {
    render(<ErrorWarningPanel errors={[makeError({ severity: 'high' })]} />);
    expect(screen.getByText('🔴')).toBeTruthy();
  });

  it('displays severity emoji for medium severity', () => {
    render(<ErrorWarningPanel errors={[makeError({ severity: 'medium' })]} />);
    expect(screen.getByText('🟡')).toBeTruthy();
  });

  it('formats error_type as uppercase with spaces', () => {
    render(<ErrorWarningPanel errors={[makeError({ error_type: 'null_reference' })]} />);
    expect(screen.getByText('NULL REFERENCE')).toBeTruthy();
  });

  it('displays success rate as percentage', () => {
    render(<ErrorWarningPanel errors={[makeError({ success_rate: 0.85 })]} />);
    expect(screen.getByText('85% preventable')).toBeTruthy();
  });

  it('renders context when provided', () => {
    render(<ErrorWarningPanel errors={[makeError({ context: 'Missing return type' })]} />);
    expect(screen.getByText('Missing return type')).toBeTruthy();
  });

  it('renders only the first line of solution', () => {
    render(<ErrorWarningPanel errors={[makeError({ solution: 'Fix line 1\nMore details' })]} />);
    expect(screen.getByText('Fix line 1')).toBeTruthy();
  });

  it('shows dismiss button when onDismiss is provided', () => {
    const onDismiss = vi.fn();
    render(<ErrorWarningPanel errors={[makeError()]} onDismiss={onDismiss} />);
    expect(screen.getByLabelText('Dismiss error')).toBeTruthy();
  });

  it('does not show dismiss button when onDismiss is not provided', () => {
    render(<ErrorWarningPanel errors={[makeError()]} />);
    expect(screen.queryByLabelText('Dismiss error')).toBeNull();
  });

  it('calls onDismiss and hides error when dismissed', () => {
    const onDismiss = vi.fn();
    const errors = [makeError({ error_type: 'my_error' })];
    render(<ErrorWarningPanel errors={errors} onDismiss={onDismiss} />);

    fireEvent.click(screen.getByLabelText('Dismiss error'));
    expect(onDismiss).toHaveBeenCalledWith('my_error');
  });

  it('renders null after all errors are dismissed', () => {
    const onDismiss = vi.fn();
    const errors = [makeError({ error_type: 'only_error' })];
    const { container } = render(<ErrorWarningPanel errors={errors} onDismiss={onDismiss} />);

    fireEvent.click(screen.getByLabelText('Dismiss error'));
    expect(container.querySelector('.error-warning-panel')).toBeNull();
  });

  it('respects maxDisplay prop', () => {
    const errors = [
      makeError({ error_type: 'e1' }),
      makeError({ error_type: 'e2' }),
      makeError({ error_type: 'e3' }),
      makeError({ error_type: 'e4' }),
    ];
    render(<ErrorWarningPanel errors={errors} maxDisplay={2} />);
    // Should show "+2 more errors"
    expect(screen.getByText('+2 more errors')).toBeTruthy();
  });

  it('shows singular "more error" when only 1 extra', () => {
    const errors = [
      makeError({ error_type: 'e1' }),
      makeError({ error_type: 'e2' }),
      makeError({ error_type: 'e3' }),
    ];
    render(<ErrorWarningPanel errors={errors} maxDisplay={2} />);
    expect(screen.getByText('+1 more error')).toBeTruthy();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ErrorWarningPanel errors={[makeError()]} className="custom-class" />
    );
    expect(container.querySelector('.custom-class')).toBeTruthy();
  });
});
