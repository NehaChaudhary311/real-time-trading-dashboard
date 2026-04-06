import { useState, useEffect, useCallback, useMemo } from 'react';
import TickerCard from './TickerCard';
import { fetchTickers } from '../services/api';
import type { TickerSnapshot, PriceTick, Alert } from '../types';
import type { UseWebSocketReturn } from '../hooks/useWebSocket';

interface TickerListProps {
  ws: UseWebSocketReturn;
  selectedSymbol: string;
  onSelect: (symbol: string) => void;
  onAlertClick?: (symbol: string) => void;
  activeAlerts?: Alert[];
}

export default function TickerList({ ws, selectedSymbol, onSelect, onAlertClick, activeAlerts }: TickerListProps) {
  const [tickers, setTickers] = useState<TickerSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');

  const loadTickers = useCallback(() => {
    setLoading(true);
    setError(false);
    fetchTickers()
      .then((data) => { setTickers(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  useEffect(() => {
    loadTickers();
  }, []);

  useEffect(() => {
    if (!ws.connected || tickers.length === 0) return;
    const symbols = tickers.map((t) => t.symbol);
    ws.subscribe(symbols);
    return () => { ws.unsubscribe(symbols); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws.connected, tickers.length]);

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

  const alertSymbols = useMemo(
    () => new Set((activeAlerts ?? []).map((a) => a.symbol)),
    [activeAlerts],
  );

  const filtered = useMemo(
    () =>
      search
        ? tickers.filter(
            (t) =>
              t.symbol.toLowerCase().includes(search.toLowerCase()) ||
              t.fullName.toLowerCase().includes(search.toLowerCase()),
          )
        : tickers,
    [tickers, search],
  );

  function renderList() {
    if (loading) {
      return Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="ticker-card skeleton-card">
          <div className="ticker-card-main">
            <div className="skeleton skeleton-icon" />
            <div className="ticker-info">
              <div className="skeleton skeleton-line-short" />
              <div className="skeleton skeleton-line-shorter" />
            </div>
            <div className="ticker-price-col">
              <div className="skeleton skeleton-line-price" />
              <div className="skeleton skeleton-line-change" />
            </div>
          </div>
        </div>
      ));
    }

    if (error) {
      return (
        <div className="ticker-list-empty">
          <span>Failed to load tickers</span>
          <button className="ticker-list-retry" onClick={loadTickers}>Retry</button>
        </div>
      );
    }

    if (filtered.length === 0) {
      return (
        <div className="ticker-list-empty">
          {search ? `No results for "${search}"` : 'No tickers available'}
        </div>
      );
    }

    return filtered.map((t) => (
      <TickerCard
        key={t.symbol}
        ticker={t}
        selected={t.symbol === selectedSymbol}
        onClick={() => onSelect(t.symbol)}
        onAlertClick={onAlertClick}
        hasActiveAlert={alertSymbols.has(t.symbol)}
      />
    ));
  }

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
      <div className={`ticker-list${ws.connected ? '' : ' stale'}`}>
        {renderList()}
      </div>
    </>
  );
}
