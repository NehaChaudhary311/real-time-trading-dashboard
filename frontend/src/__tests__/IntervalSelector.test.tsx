import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import IntervalSelector from '../components/IntervalSelector';

describe('IntervalSelector', () => {
  const onIntervalChange = vi.fn();
  const onChartTypeChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all interval buttons', () => {
    render(
      <IntervalSelector
        interval="1h"
        chartType="candlestick"
        onIntervalChange={onIntervalChange}
        onChartTypeChange={onChartTypeChange}
      />,
    );

    expect(screen.getByText('1M')).toBeInTheDocument();
    expect(screen.getByText('5M')).toBeInTheDocument();
    expect(screen.getByText('15M')).toBeInTheDocument();
    expect(screen.getByText('1H')).toBeInTheDocument();
    expect(screen.getByText('4H')).toBeInTheDocument();
    expect(screen.getByText('1D')).toBeInTheDocument();
  });

  it('should mark the active interval with the active class', () => {
    render(
      <IntervalSelector
        interval="4h"
        chartType="candlestick"
        onIntervalChange={onIntervalChange}
        onChartTypeChange={onChartTypeChange}
      />,
    );

    expect(screen.getByText('4H').className).toContain('active');
    expect(screen.getByText('1H').className).not.toContain('active');
  });

  it('should call onIntervalChange when an interval button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <IntervalSelector
        interval="1h"
        chartType="candlestick"
        onIntervalChange={onIntervalChange}
        onChartTypeChange={onChartTypeChange}
      />,
    );

    await user.click(screen.getByText('5M'));
    expect(onIntervalChange).toHaveBeenCalledWith('5m');

    await user.click(screen.getByText('1D'));
    expect(onIntervalChange).toHaveBeenCalledWith('1d');
  });

  it('should render chart type toggle buttons', () => {
    render(
      <IntervalSelector
        interval="1h"
        chartType="candlestick"
        onIntervalChange={onIntervalChange}
        onChartTypeChange={onChartTypeChange}
      />,
    );

    expect(screen.getByTitle('Candlestick')).toBeInTheDocument();
    expect(screen.getByTitle('Area')).toBeInTheDocument();
  });

  it('should mark the active chart type with the active class', () => {
    render(
      <IntervalSelector
        interval="1h"
        chartType="area"
        onIntervalChange={onIntervalChange}
        onChartTypeChange={onChartTypeChange}
      />,
    );

    expect(screen.getByTitle('Area').className).toContain('active');
    expect(screen.getByTitle('Candlestick').className).not.toContain('active');
  });

  it('should call onChartTypeChange when chart type button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <IntervalSelector
        interval="1h"
        chartType="candlestick"
        onIntervalChange={onIntervalChange}
        onChartTypeChange={onChartTypeChange}
      />,
    );

    await user.click(screen.getByTitle('Area'));
    expect(onChartTypeChange).toHaveBeenCalledWith('area');

    await user.click(screen.getByTitle('Candlestick'));
    expect(onChartTypeChange).toHaveBeenCalledWith('candlestick');
  });
});
