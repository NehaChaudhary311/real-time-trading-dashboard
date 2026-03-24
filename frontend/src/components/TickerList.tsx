import { useState, useEffect, useCallback } from 'react';
import TickerCard from './TickerCard';
import { fetchTickers } from '../services/api';
import type { TickerSnapshot, PriceTick } from '../types';
import type { UseWebSocketReturn } from '../hooks/useWebSocket';

interface TickerListProps {
  ws: UseWebSocketReturn;
  selectedSymbol: string;
  onSelect: (symbol: string) => void;
}

export default function TickerList({ ws, selectedSymbol, onSelect }: TickerListProps) {
  const [tickers, setTickers] = useState<TickerSnapshot[]>([]);
  const [search, setSearch] = useState('');

  // Fetch initial ticker list from REST API
  useEffect(() => {
    fetchTickers()
      .then(setTickers)
      .catch(() => {/* TODO: log error */});
  }, []);

  // Subscribe to all symbols once connected
  useEffect(() => {
    if (!ws.connected || tickers.length === 0) return;
    const symbols = tickers.map((t) => t.symbol);
    ws.subscribe(symbols);
    return () => { ws.unsubscribe(symbols); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws.connected, tickers.length]);

  // Update ticker prices from WS ticks
  const handleTick = useCallback((tick: PriceTick) => {
    setTickers((prev) =>
      prev.map((t) =>
        t.symbol === tick.symbol
          ? {
              ...t,
              price: tick.price,
              change: tick.change,
              changePercent: tick.changePercent,
              high24h: tick.high24h,
              low24h: tick.low24h,
              volume24h: tick.volume24h,
              timestamp: tick.timestamp,
            }
          : t,
      ),
    );
  }, []);

  useEffect(() => {
    return ws.onTick(handleTick);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws.onTick, handleTick]);

  const filtered = search
    ? tickers.filter(
        (t) =>
          t.symbol.toLowerCase().includes(search.toLowerCase()) ||
          t.fullName.toLowerCase().includes(search.toLowerCase()),
      )
    : tickers;

  return (
    <>
      <div className="sidebar-header">
        <span className="sidebar-title">Watchlist</span>
      </div>
      <div className="sidebar-search">
        <input
          type="text"
          placeholder="Search Assets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="ticker-list">
        {filtered.map((t) => (
          <TickerCard
            key={t.symbol}
            ticker={t}
            selected={t.symbol === selectedSymbol}
            onClick={() => onSelect(t.symbol)}
          />
        ))}
      </div>
    </>
  );
}
