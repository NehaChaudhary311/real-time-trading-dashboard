import type { TickerSnapshot, OHLCVCandle, Interval, Alert, AlertDirection, AlertFrequency } from '../types';

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

// ── Alerts ──────────────────────────────────────────────────

function authHeaders(token: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export async function fetchAlerts(token: string): Promise<Alert[]> {
  const res = await fetch(`${API_BASE}/api/alerts`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json() as Promise<Alert[]>;
}

export async function createAlert(
  token: string,
  symbol: string,
  threshold: number,
  direction: AlertDirection,
  frequency: AlertFrequency = 'once',
): Promise<Alert> {
  const res = await fetch(`${API_BASE}/api/alerts`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ symbol, threshold, direction, frequency }),
  });
  if (!res.ok) throw new Error('Failed to create alert');
  return res.json() as Promise<Alert>;
}

export async function deleteAlert(token: string, id: string): Promise<void> {
  await fetch(`${API_BASE}/api/alerts/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}
