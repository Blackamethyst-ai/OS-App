// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock crypto.randomUUID
Object.defineProperty(globalThis, 'crypto', {
  value: { randomUUID: () => 'ABCD1234-5678-9012-3456-789012345678' },
  writable: true,
});

vi.mock('motion/react', () => ({
  motion: {
    div: 'div',
    span: 'span',
    button: 'button',
    p: 'p',
    svg: 'svg',
    path: 'path',
    li: 'li',
    ul: 'ul',
    h2: 'h2',
    h3: 'h3',
    section: 'section',
  },
  AnimatePresence: ({ children }: any) => children,
}));

vi.mock('lucide-react', () => ({
  X: (props: any) => <span data-testid="icon-x" {...props}>X</span>,
  Database: (props: any) => <span data-testid="icon-database" {...props}>Database</span>,
  Zap: (props: any) => <span data-testid="icon-zap" {...props}>Zap</span>,
  Activity: (props: any) => <span data-testid="icon-activity" {...props}>Activity</span>,
  Shield: (props: any) => <span data-testid="icon-shield" {...props}>Shield</span>,
  ArrowUpRight: (props: any) => <span data-testid="icon-arrow" {...props}>ArrowUpRight</span>,
  Cpu: (props: any) => <span data-testid="icon-cpu" {...props}>Cpu</span>,
}));

import DynamicWidget from '../DynamicWidget';

describe('DynamicWidget', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when result is null', () => {
    const { container } = render(<DynamicWidget result={null} onClose={mockOnClose} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders the widget when result is provided', () => {
    const result = { toolName: 'test-tool', status: 'SUCCESS' as const, data: { message: 'hello' }, uiHint: 'MESSAGE' as const };
    render(<DynamicWidget result={result} onClose={mockOnClose} />);
    expect(screen.getByText(/test-tool/)).toBeTruthy();
  });

  it('displays the tool name in the header', () => {
    const result = { toolName: 'myTool', status: 'SUCCESS' as const, data: {}, uiHint: undefined };
    render(<DynamicWidget result={result} onClose={mockOnClose} />);
    expect(screen.getByText(/myTool/)).toBeTruthy();
  });

  it('calls onClose when close button is clicked', () => {
    const result = { toolName: 'tool', status: 'SUCCESS' as const, data: { message: 'hi' }, uiHint: 'MESSAGE' as const };
    render(<DynamicWidget result={result} onClose={mockOnClose} />);
    const closeButton = screen.getByText('X').closest('button');
    if (closeButton) fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('renders TABLE view with table rows when uiHint is TABLE', () => {
    const result = {
      toolName: 'dbQuery',
      status: 'SUCCESS' as const,
      data: [
        { name: 'Alice', score: 95 },
        { name: 'Bob', score: 87 },
      ],
      uiHint: 'TABLE' as const,
    };
    render(<DynamicWidget result={result} onClose={mockOnClose} />);
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.getByText('95')).toBeTruthy();
    expect(screen.getByText('name')).toBeTruthy();
    expect(screen.getByText('score')).toBeTruthy();
  });

  it('renders STAT view with key-value cards when uiHint is STAT', () => {
    const result = {
      toolName: 'statTool',
      status: 'SUCCESS' as const,
      data: { cpu: '45%', memory: '2.3GB' },
      uiHint: 'STAT' as const,
    };
    render(<DynamicWidget result={result} onClose={mockOnClose} />);
    expect(screen.getByText('cpu')).toBeTruthy();
    expect(screen.getByText('45%')).toBeTruthy();
    expect(screen.getByText('memory')).toBeTruthy();
    expect(screen.getByText('2.3GB')).toBeTruthy();
  });

  it('renders MESSAGE view when uiHint is MESSAGE', () => {
    const result = {
      toolName: 'msgTool',
      status: 'SUCCESS' as const,
      data: { message: 'Operation completed successfully' },
      uiHint: 'MESSAGE' as const,
    };
    render(<DynamicWidget result={result} onClose={mockOnClose} />);
    expect(screen.getByText('Operation completed successfully')).toBeTruthy();
  });

  it('renders raw JSON when no uiHint is set', () => {
    const result = {
      toolName: 'rawTool',
      status: 'SUCCESS' as const,
      data: { foo: 'bar' },
      uiHint: undefined,
    };
    render(<DynamicWidget result={result} onClose={mockOnClose} />);
    const pre = screen.getByText(/"foo": "bar"/);
    expect(pre).toBeTruthy();
  });

  it('shows Database icon for TABLE hint', () => {
    const result = {
      toolName: 'tbl',
      status: 'SUCCESS' as const,
      data: [{ a: 1 }],
      uiHint: 'TABLE' as const,
    };
    render(<DynamicWidget result={result} onClose={mockOnClose} />);
    expect(screen.getByTestId('icon-database')).toBeTruthy();
  });

  it('shows Zap icon for STAT hint', () => {
    const result = {
      toolName: 'stat',
      status: 'SUCCESS' as const,
      data: { x: 1 },
      uiHint: 'STAT' as const,
    };
    render(<DynamicWidget result={result} onClose={mockOnClose} />);
    expect(screen.getByTestId('icon-zap')).toBeTruthy();
  });

  it('displays footer telemetry info', () => {
    const result = { toolName: 'tool', status: 'SUCCESS' as const, data: { message: 'hi' }, uiHint: 'MESSAGE' as const };
    render(<DynamicWidget result={result} onClose={mockOnClose} />);
    expect(screen.getByText(/SECURITY: ATTESTED/)).toBeTruthy();
    expect(screen.getByText(/SYNC_STABLE/)).toBeTruthy();
  });
});
