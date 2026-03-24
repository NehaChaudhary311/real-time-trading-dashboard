import { useState, useEffect, useCallback } from 'react';
import type { PriceTick } from '../types';
import type { UseWebSocketReturn } from '../hooks/useWebSocket';

interface TickerInfoBarProps {
  symbol: string;
  ws: UseWebSocketReturn;
}

function formatPrice(price: number): string {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatVolume(volume: number): string {
  if (volume >= 1_000_000_000) return `$${(volume / 1_000_000_000).toFixed(1)}B`;
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(1)}K`;
  return `$${volume.toFixed(0)}`;
}

export default function TickerInfoBar({ symbol, ws }: TickerInfoBarProps) {
  const [data, setData] = useState<PriceTick | null>(null);
  const { onTick } = ws;

  const handleTick = useCallback(
    (tick: PriceTick) => {
      if (tick.symbol === symbol) setData(tick);
    },
    [symbol],
  );

  useEffect(() => {
    setData(null);
    return onTick(handleTick);
  }, [onTick, handleTick]);

  const price = data?.price ?? 0;
  const change = data?.change ?? 0;
  const changePercent = data?.changePercent ?? 0;
  const high24h = data?.high24h ?? 0;
  const low24h = data?.low24h ?? 0;
  const volume24h = data?.volume24h ?? 0;
  const isPositive = changePercent >= 0;

  return (
    <div className="ticker-info-bar">
      <div className="info-bar-symbol">
        <span className="info-bar-symbol-text">{symbol}</span>
        <span className="info-bar-tag">Perpetual</span>
      </div>

      <span className="info-bar-price">
        ${data ? formatPrice(price) : '—'}
      </span>

      <div className="info-bar-stat">
        <span className="info-bar-label">24H Change</span>
        <span className={`info-bar-value ${isPositive ? 'positive' : 'negative'}`}>
          {data
            ? `${isPositive ? '+' : ''}${formatPrice(change)} (${isPositive ? '+' : ''}${changePercent.toFixed(2)}%)`
            : '—'}
        </span>
      </div>

      <div className="info-bar-stat">
        <span className="info-bar-label">24H High</span>
        <span className="info-bar-value">
          {data ? `$${formatPrice(high24h)}` : '—'}
        </span>
      </div>

      <div className="info-bar-stat">
        <span className="info-bar-label">24H Low</span>
        <span className="info-bar-value">
          {data ? `$${formatPrice(low24h)}` : '—'}
        </span>
      </div>

      <div className="info-bar-stat">
        <span className="info-bar-label">24H Volume</span>
        <span className="info-bar-value">
          {data ? formatVolume(volume24h) : '—'}
        </span>
      </div>
    </div>
  );
}
