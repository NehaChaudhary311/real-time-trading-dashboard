import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchHistory } from '../services/api';
import type { Interval, OHLCVCandle, PriceTick } from '../types';
import type { UseWebSocketReturn } from './useWebSocket';

export interface UseTickerDataReturn {
  candles: OHLCVCandle[];
  loading: boolean;
}

const INTERVAL_MS: Record<Interval, number> = {
  '1m': 60_000,
  '5m': 5 * 60_000,
  '15m': 15 * 60_000,
  '1h': 60 * 60_000,
  '4h': 4 * 60 * 60_000,
  '1d': 24 * 60 * 60_000,
};

export function useTickerData(
  symbol: string,
  interval: Interval,
  ws: UseWebSocketReturn,
): UseTickerDataReturn {
  const [candles, setCandles] = useState<OHLCVCandle[]>([]);
  const [loading, setLoading] = useState(true);
  const candlesRef = useRef<OHLCVCandle[]>([]);

  // Fetch history when symbol or interval changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchHistory(symbol, interval)
      .then((data) => {
        if (cancelled) return;
        candlesRef.current = data;
        setCandles(data);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [symbol, interval]);

  // Merge live ticks into candle data
  const handleTick = useCallback(
    (tick: PriceTick) => {
      if (tick.symbol !== symbol) return;

      const intervalMs = INTERVAL_MS[interval];
      const currentBoundary = Math.floor(tick.timestamp / intervalMs) * intervalMs;
      const prev = candlesRef.current;

      if (prev.length === 0) return;

      const last = prev[prev.length - 1];

      if (last.time === currentBoundary) {
        const updated: OHLCVCandle = {
          ...last,
          close: tick.price,
          high: Math.max(last.high, tick.price),
          low: Math.min(last.low, tick.price),
          volume: last.volume + Math.round(tick.price * (50 + Math.random() * 100)),
        };
        const next = [...prev.slice(0, -1), updated];
        candlesRef.current = next;
        setCandles(next);
      } else if (currentBoundary > last.time) {
        const newCandle: OHLCVCandle = {
          time: currentBoundary,
          open: tick.price,
          high: tick.price,
          low: tick.price,
          close: tick.price,
          volume: Math.round(tick.price * (50 + Math.random() * 100)),
        };
        const next = [...prev, newCandle];
        candlesRef.current = next;
        setCandles(next);
      }
    },
    [symbol, interval],
  );

  useEffect(() => {
    return ws.onTick(handleTick);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws.onTick, handleTick]);

  return { candles, loading };
}
