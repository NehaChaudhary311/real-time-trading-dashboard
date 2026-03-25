import { sha256 } from 'js-sha256';
import type { TickerSnapshot, OHLCVCandle, Interval, Alert, AlertDirection, AlertFrequency } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

// ── Auth ────────────────────────────────────────────────────

function hashPassword(password: string): string {
  return sha256(password);
}

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
  const hashed = hashPassword(password);
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password: hashed }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || 'Login failed');
  }

  return res.json() as Promise<LoginResponse>;
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}

// ── Data ────────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
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

// ── Alerts (auth via HttpOnly cookie — no token param needed) ─

export async function fetchAlerts(): Promise<Alert[]> {
  const res = await fetch(`${API_BASE}/api/alerts`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json() as Promise<Alert[]>;
}

export async function createAlert(
  symbol: string,
  threshold: number,
  direction: AlertDirection,
  frequency: AlertFrequency = 'once',
): Promise<Alert> {
  const res = await fetch(`${API_BASE}/api/alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ symbol, threshold, direction, frequency }),
  });
  if (!res.ok) throw new Error('Failed to create alert');
  return res.json() as Promise<Alert>;
}

export async function deleteAlert(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/alerts/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to delete alert');
}
