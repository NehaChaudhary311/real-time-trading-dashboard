import type { Interval } from '../types';

export type ChartType = 'candlestick' | 'area';

interface IntervalSelectorProps {
  interval: Interval;
  chartType: ChartType;
  onIntervalChange: (interval: Interval) => void;
  onChartTypeChange: (chartType: ChartType) => void;
}

const INTERVALS: { label: string; value: Interval }[] = [
  { label: '1M', value: '1m' },
  { label: '5M', value: '5m' },
  { label: '15M', value: '15m' },
  { label: '1H', value: '1h' },
  { label: '4H', value: '4h' },
  { label: '1D', value: '1d' },
];

export default function IntervalSelector({
  interval,
  chartType,
  onIntervalChange,
  onChartTypeChange,
}: IntervalSelectorProps) {
  return (
    <div className="interval-bar">
      {INTERVALS.map(({ label, value }) => (
        <button
          key={value}
          className={`interval-btn${value === interval ? ' active' : ''}`}
          onClick={() => onIntervalChange(value)}
        >
          {label}
        </button>
      ))}

      <div className="interval-separator" />

      <button
        className={`chart-type-btn${chartType === 'candlestick' ? ' active' : ''}`}
        title="Candlestick"
        onClick={() => onChartTypeChange('candlestick')}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <rect x="3" y="2" width="2" height="12" rx="0.5" />
          <rect x="7" y="5" width="2" height="8" rx="0.5" />
          <rect x="11" y="1" width="2" height="10" rx="0.5" />
        </svg>
      </button>
      <button
        className={`chart-type-btn${chartType === 'area' ? ' active' : ''}`}
        title="Area"
        onClick={() => onChartTypeChange('area')}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polyline points="1,12 4,8 8,10 12,4 15,6" />
        </svg>
      </button>
    </div>
  );
}
