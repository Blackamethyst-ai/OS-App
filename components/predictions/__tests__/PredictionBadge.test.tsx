// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { PredictionBadge } from '../PredictionBadge';

// Mock CSS import
vi.mock('../styles/predictions.css', () => ({}));

describe('PredictionBadge', () => {
  const defaultProps = {
    quality: 4.2,
    successRate: 0.78,
    confidence: 0.85,
  };

  it('renders the badge with header', () => {
    render(<PredictionBadge {...defaultProps} />);
    expect(screen.getByText('Prediction')).toBeTruthy();
  });

  it('displays quality score as X.X/5', () => {
    render(<PredictionBadge {...defaultProps} />);
    expect(screen.getByText('4.2/5')).toBeTruthy();
  });

  it('displays success rate as percentage', () => {
    render(<PredictionBadge {...defaultProps} />);
    expect(screen.getByText('78%')).toBeTruthy();
  });

  it('displays confidence as percentage', () => {
    render(<PredictionBadge {...defaultProps} />);
    expect(screen.getByText('85%')).toBeTruthy();
  });

  it('shows green emoji for high quality (>= 4.0)', () => {
    render(<PredictionBadge {...defaultProps} quality={4.5} />);
    const emojis = screen.getAllByText('🟢');
    expect(emojis.length).toBeGreaterThan(0);
  });

  it('shows yellow emoji for medium quality (>= 3.0)', () => {
    render(<PredictionBadge {...defaultProps} quality={3.5} />);
    const emojis = screen.getAllByText('🟡');
    expect(emojis.length).toBeGreaterThan(0);
  });

  it('shows red emoji for low quality (< 3.0)', () => {
    render(<PredictionBadge {...defaultProps} quality={2.0} />);
    const emojis = screen.getAllByText('🔴');
    expect(emojis.length).toBeGreaterThan(0);
  });

  it('applies prediction-quality-high class for quality >= 4', () => {
    const { container } = render(<PredictionBadge {...defaultProps} quality={4.5} />);
    expect(container.querySelector('.prediction-quality-high')).toBeTruthy();
  });

  it('applies prediction-quality-medium class for quality >= 3', () => {
    const { container } = render(<PredictionBadge {...defaultProps} quality={3.5} />);
    expect(container.querySelector('.prediction-quality-medium')).toBeTruthy();
  });

  it('applies prediction-quality-low class for quality < 3', () => {
    const { container } = render(<PredictionBadge {...defaultProps} quality={2.0} />);
    expect(container.querySelector('.prediction-quality-low')).toBeTruthy();
  });

  it('renders correct number of star emojis', () => {
    render(<PredictionBadge {...defaultProps} quality={3.0} />);
    // quality 3.0 -> 3 full stars, no half star
    const stars = screen.getAllByText('⭐');
    expect(stars.length).toBe(3);
  });

  it('renders half star when quality has >= 0.5 fraction', () => {
    render(<PredictionBadge {...defaultProps} quality={3.5} />);
    // 3 full + 1 half = 4 star emojis total
    const stars = screen.getAllByText('⭐');
    expect(stars.length).toBe(4);
  });

  it('renders compact mode with quality and success', () => {
    render(<PredictionBadge {...defaultProps} compact={true} />);
    expect(screen.getByText('4.2★')).toBeTruthy();
    expect(screen.getByText('78%')).toBeTruthy();
    expect(screen.getByText('|')).toBeTruthy();
  });

  it('does not show full layout in compact mode', () => {
    render(<PredictionBadge {...defaultProps} compact={true} />);
    expect(screen.queryByText('Prediction')).toBeNull();
    expect(screen.queryByText('4.2/5')).toBeNull();
  });

  it('renders metric labels in full mode', () => {
    render(<PredictionBadge {...defaultProps} />);
    expect(screen.getByText('Success:')).toBeTruthy();
    expect(screen.getByText('Confidence:')).toBeTruthy();
  });

  it('applies custom className', () => {
    const { container } = render(
      <PredictionBadge {...defaultProps} className="my-badge" />
    );
    expect(container.querySelector('.my-badge')).toBeTruthy();
  });

  it('rounds success rate correctly', () => {
    render(<PredictionBadge quality={4.0} successRate={0.666} confidence={0.5} />);
    expect(screen.getByText('67%')).toBeTruthy();
  });
});
