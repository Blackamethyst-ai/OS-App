// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ResearchChips } from '../ResearchChips';

// Mock CSS import
vi.mock('../styles/predictions.css', () => ({}));

// Helper to create SearchResult objects
const makeResult = (overrides: Partial<{
  content: string;
  category: string;
  similarity: number;
  tags: string[];
}> = {}) => ({
  content: 'Sample research finding about AI agents',
  category: 'research',
  similarity: 0.85,
  tags: ['ai', 'agents'],
  ...overrides,
});

describe('ResearchChips', () => {
  it('renders null when research array is empty', () => {
    const { container } = render(<ResearchChips research={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders header with research count', () => {
    const research = [makeResult(), makeResult({ content: 'Another finding' })];
    render(<ResearchChips research={research} />);
    expect(screen.getByText('Recommended Research (2)')).toBeTruthy();
  });

  it('renders compact mode with count', () => {
    const research = [makeResult(), makeResult({ content: 'Two' })];
    render(<ResearchChips research={research} compact={true} />);
    expect(screen.getByText('2 research findings')).toBeTruthy();
  });

  it('renders compact mode with singular for 1 finding', () => {
    render(<ResearchChips research={[makeResult()]} compact={true} />);
    expect(screen.getByText('1 research finding')).toBeTruthy();
  });

  it('truncates long content to 50 chars', () => {
    const longContent = 'A'.repeat(60);
    render(<ResearchChips research={[makeResult({ content: longContent })]} />);
    const expected = 'A'.repeat(50) + '...';
    expect(screen.getByText(expected)).toBeTruthy();
  });

  it('does not truncate short content', () => {
    render(<ResearchChips research={[makeResult({ content: 'Short text' })]} />);
    expect(screen.getByText('Short text')).toBeTruthy();
  });

  it('shows similarity scores when showScores is true', () => {
    render(<ResearchChips research={[makeResult({ similarity: 0.85 })]} showScores={true} />);
    expect(screen.getByText('85%')).toBeTruthy();
  });

  it('hides similarity scores when showScores is false', () => {
    render(<ResearchChips research={[makeResult({ similarity: 0.85 })]} showScores={false} />);
    expect(screen.queryByText('85%')).toBeNull();
  });

  it('applies correct score class for high similarity', () => {
    const { container } = render(
      <ResearchChips research={[makeResult({ similarity: 0.9 })]} />
    );
    expect(container.querySelector('.score-high')).toBeTruthy();
  });

  it('applies correct score class for medium similarity', () => {
    const { container } = render(
      <ResearchChips research={[makeResult({ similarity: 0.7 })]} />
    );
    expect(container.querySelector('.score-medium')).toBeTruthy();
  });

  it('applies correct score class for low similarity', () => {
    const { container } = render(
      <ResearchChips research={[makeResult({ similarity: 0.4 })]} />
    );
    expect(container.querySelector('.score-low')).toBeTruthy();
  });

  it('respects maxDisplay prop and shows expand button', () => {
    const research = Array.from({ length: 8 }, (_, i) =>
      makeResult({ content: `Finding ${i}` })
    );
    render(<ResearchChips research={research} maxDisplay={3} />);
    expect(screen.getByText('+5 more')).toBeTruthy();
  });

  it('expands to show all items when expand button clicked', () => {
    const research = Array.from({ length: 6 }, (_, i) =>
      makeResult({ content: `Finding ${i}` })
    );
    render(<ResearchChips research={research} maxDisplay={3} />);

    fireEvent.click(screen.getByText('+3 more'));
    // After expanding, should show "Show less" button
    expect(screen.getByText('Show less')).toBeTruthy();
  });

  it('collapses back when "Show less" clicked', () => {
    const research = Array.from({ length: 6 }, (_, i) =>
      makeResult({ content: `Finding ${i}` })
    );
    render(<ResearchChips research={research} maxDisplay={3} />);

    fireEvent.click(screen.getByText('+3 more'));
    fireEvent.click(screen.getByText('Show less'));
    // Should show expand button again
    expect(screen.getByText('+3 more')).toBeTruthy();
  });

  it('calls onSelect when chip is clicked', () => {
    const onSelect = vi.fn();
    const result = makeResult({ content: 'Clickable finding' });
    render(<ResearchChips research={[result]} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Clickable finding'));
    expect(onSelect).toHaveBeenCalledWith(result);
  });

  it('disables chips when no onSelect handler', () => {
    render(<ResearchChips research={[makeResult({ content: 'No click' })]} />);
    const button = screen.getByRole('button', { name: /No click/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('shows hint text when onSelect is provided', () => {
    render(<ResearchChips research={[makeResult()]} onSelect={vi.fn()} />);
    expect(screen.getByText(/Click a chip to inject into context/)).toBeTruthy();
  });

  it('does not show hint text when onSelect is not provided', () => {
    render(<ResearchChips research={[makeResult()]} />);
    expect(screen.queryByText(/Click a chip to inject into context/)).toBeNull();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ResearchChips research={[makeResult()]} className="custom-chips" />
    );
    expect(container.querySelector('.custom-chips')).toBeTruthy();
  });
});
