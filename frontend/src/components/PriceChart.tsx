import { useEffect, useRef } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type AreaData,
  type Time,
} from 'lightweight-charts';
import { useTickerData } from '../hooks/useTickerData';
import type { Interval, OHLCVCandle } from '../types';
import type { ChartType } from './IntervalSelector';
import type { UseWebSocketReturn } from '../hooks/useWebSocket';

interface PriceChartProps {
  symbol: string;
  interval: Interval;
  chartType: ChartType;
  ws: UseWebSocketReturn;
}

function toTime(ms: number): Time {
  return (ms / 1000) as Time;
}

function toCandlestickData(candles: OHLCVCandle[]): CandlestickData[] {
  return candles.map((c) => ({
    time: toTime(c.time),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }));
}

function toAreaData(candles: OHLCVCandle[]): AreaData[] {
  return candles.map((c) => ({
    time: toTime(c.time),
    value: c.close,
  }));
}

export default function PriceChart({ symbol, interval, chartType, ws }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Area'> | null>(null);
  const chartTypeRef = useRef(chartType);

  const { candles, loading } = useTickerData(symbol, interval, ws);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0b0e11' },
        textColor: '#6b7280',
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#1c203040' },
        horzLines: { color: '#1c203040' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#00d4aa50', width: 1, style: 2, labelBackgroundColor: '#131722' },
        horzLine: { color: '#00d4aa50', width: 1, style: 2, labelBackgroundColor: '#131722' },
      },
      rightPriceScale: {
        borderColor: '#1c2030',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: '#1c2030',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: true,
      handleScale: true,
    });

    chartRef.current = chart;

    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (seriesRef.current) {
      chart.removeSeries(seriesRef.current);
      seriesRef.current = null;
    }

    if (chartType === 'candlestick') {
      seriesRef.current = chart.addCandlestickSeries({
        upColor: '#00c087',
        downColor: '#ff4d4d',
        borderUpColor: '#00c087',
        borderDownColor: '#ff4d4d',
        wickUpColor: '#00c087',
        wickDownColor: '#ff4d4d',
      });
    } else {
      seriesRef.current = chart.addAreaSeries({
        lineColor: '#00d4aa',
        topColor: 'rgba(0, 212, 170, 0.3)',
        bottomColor: 'rgba(0, 212, 170, 0.02)',
        lineWidth: 2,
      });
    }

    chartTypeRef.current = chartType;
  }, [chartType]);

  useEffect(() => {
    if (!seriesRef.current || candles.length === 0) return;

    if (chartTypeRef.current === 'candlestick') {
      (seriesRef.current as ISeriesApi<'Candlestick'>).setData(toCandlestickData(candles));
    } else {
      (seriesRef.current as ISeriesApi<'Area'>).setData(toAreaData(candles));
    }

    chartRef.current?.timeScale().fitContent();
  }, [candles, chartType]);

  return (
    <div className="chart-container" style={{ position: 'relative' }}>
      {loading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: 13,
          zIndex: 2,
        }}>
          Loading chart...
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
