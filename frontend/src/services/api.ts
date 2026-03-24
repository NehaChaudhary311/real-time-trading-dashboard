import type { TickerSnapshot, OHLCVCandle, Interval } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchTickers(): Promise<TickerSnapshot[]> {
  return fetchJson<TickerSnapshot[]>(`${API_BASE}/api/tickers`);
}

interface HistoryResponse {
  symbol: string;
  interval: string;
  count: number;
  candles: OHLCVCandle[];
}

export async function fetchHistory(
  symbol: string,
  interval: Interval = '1h',
  days?: number,
): Promise<OHLCVCandle[]> {
  const params = new URLSearchParams({ interval });
  if (days !== undefined) params.set('days', String(days));

  const encoded = encodeURIComponent(symbol);
  const data = await fetchJson<HistoryResponse>(
    `${API_BASE}/api/tickers/${encoded}/history?${params}`,
  );
  return data.candles;
}
