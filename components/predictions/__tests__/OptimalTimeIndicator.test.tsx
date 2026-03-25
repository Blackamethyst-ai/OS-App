// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { OptimalTimeIndicator } from '../OptimalTimeIndicator';

// Mock CSS import
vi.mock('../styles/predictions.css', () => ({}));

describe('OptimalTimeIndicator', () => {
  it('renders optimal status when isOptimalNow is true', () => {
    render(
      <OptimalTimeIndicator
        optimalHour={14}
        currentHour={14}
        isOptimalNow={true}
        reasoning="Peak focus hours"
      />
    );
    expect(screen.getByText("You're in the optimal window!")).toBeTruthy();
  });

  it('renders suboptimal status with wait time', () => {
    render(
      <OptimalTimeIndicator
        optimalHour={20}
        currentHour={15}
        isOptimalNow={false}
        reasoning="Evening is better"
      />
    );
    expect(screen.getByText(/Wait 5 hours for better results/)).toBeTruthy();
  });

  it('uses singular "hour" when wait is 1 hour', () => {
    render(
      <OptimalTimeIndicator
        optimalHour={16}
        currentHour={15}
        isOptimalNow={false}
        reasoning="Almost there"
      />
    );
    expect(screen.getByText(/Wait 1 hour for better results/)).toBeTruthy();
  });

  it('wraps around midnight for wait time calculation', () => {
    render(
      <OptimalTimeIndicator
        optimalHour={2}
        currentHour={23}
        isOptimalNow={false}
        reasoning="Late night"
      />
    );
    // 2 - 23 = -21, + 24 = 3 hours
    expect(screen.getByText(/Wait 3 hours for better results/)).toBeTruthy();
  });

  it('formats optimal hour in 24-hour format', () => {
    render(
      <OptimalTimeIndicator
        optimalHour={8}
        currentHour={8}
        isOptimalNow={true}
        reasoning="Morning focus"
      />
    );
    expect(screen.getByText('08:00')).toBeTruthy();
  });

  it('renders the reasoning text', () => {
    render(
      <OptimalTimeIndicator
        optimalHour={10}
        currentHour={10}
        isOptimalNow={true}
        reasoning="Historical peak performance at this hour"
      />
    );
    expect(screen.getByText('Historical peak performance at this hour')).toBeTruthy();
  });

  it('renders compact mode when optimal', () => {
    render(
      <OptimalTimeIndicator
        optimalHour={14}
        currentHour={14}
        isOptimalNow={true}
        reasoning="Good time"
        compact={true}
      />
    );
    expect(screen.getByText(/Optimal Time/)).toBeTruthy();
  });

  it('renders compact mode when suboptimal with wait info', () => {
    render(
      <OptimalTimeIndicator
        optimalHour={20}
        currentHour={15}
        isOptimalNow={false}
        reasoning="Wait"
        compact={true}
      />
    );
    expect(screen.getByText(/Wait 5h/)).toBeTruthy();
    expect(screen.getByText(/20:00/)).toBeTruthy();
  });

  it('shows time comparison when not optimal', () => {
    render(
      <OptimalTimeIndicator
        optimalHour={20}
        currentHour={15}
        isOptimalNow={false}
        reasoning="Evening better"
      />
    );
    expect(screen.getByText('Current:')).toBeTruthy();
    expect(screen.getByText('15:00')).toBeTruthy();
    expect(screen.getByText('Optimal:')).toBeTruthy();
  });

  it('does not show time comparison when optimal', () => {
    render(
      <OptimalTimeIndicator
        optimalHour={14}
        currentHour={14}
        isOptimalNow={true}
        reasoning="Good"
      />
    );
    expect(screen.queryByText('Current:')).toBeNull();
  });

  it('renders header with clock icon and title', () => {
    render(
      <OptimalTimeIndicator
        optimalHour={10}
        currentHour={10}
        isOptimalNow={true}
        reasoning="Test"
      />
    );
    expect(screen.getByText('Optimal Timing')).toBeTruthy();
  });

  it('applies custom className', () => {
    const { container } = render(
      <OptimalTimeIndicator
        optimalHour={10}
        currentHour={10}
        isOptimalNow={true}
        reasoning="Test"
        className="my-custom"
      />
    );
    expect(container.querySelector('.my-custom')).toBeTruthy();
  });

  it('applies timing-optimal class when optimal', () => {
    const { container } = render(
      <OptimalTimeIndicator
        optimalHour={10}
        currentHour={10}
        isOptimalNow={true}
        reasoning="Test"
      />
    );
    expect(container.querySelector('.timing-optimal')).toBeTruthy();
  });

  it('applies timing-suboptimal class when not optimal', () => {
    const { container } = render(
      <OptimalTimeIndicator
        optimalHour={20}
        currentHour={10}
        isOptimalNow={false}
        reasoning="Test"
      />
    );
    expect(container.querySelector('.timing-suboptimal')).toBeTruthy();
  });
});
