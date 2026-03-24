import type { TickerSnapshot, OHLCVCandle, Interval } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// ── Auth ────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || 'Login failed');
  }

  return res.json() as Promise<LoginResponse>;
}

// ── Data ────────────────────────────────────────────────────

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
