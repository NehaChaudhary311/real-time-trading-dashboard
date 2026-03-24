import type { TickerDefinition, Interval } from './types/index.js';

export const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

export const TICK_INTERVAL_MS = 1_000;

export const SUPPORTED_INTERVALS: Interval[] = [
  '1m',
  '5m',
  '15m',
  '1h',
  '4h',
  '1d',
];

export const HISTORY_DAYS = 30;

export const TICKERS: TickerDefinition[] = [
  {
    symbol: 'BTC/USDT',
    fullName: 'Bitcoin',
    iconColor: '#f7931a',
    basePrice: 87_250,
  },
  {
    symbol: 'ETH/USDT',
    fullName: 'Ethereum',
    iconColor: '#627eea',
    basePrice: 3_180,
  },
  {
    symbol: 'SOL/USDT',
    fullName: 'Solana',
    iconColor: '#00ffa3',
    basePrice: 168,
  },
  {
    symbol: 'AAPL',
    fullName: 'Apple Inc.',
    iconColor: '#a2aaad',
    basePrice: 232,
  },
  {
    symbol: 'TSLA',
    fullName: 'Tesla Inc.',
    iconColor: '#cc0000',
    basePrice: 345,
  },
  {
    symbol: 'NVDA',
    fullName: 'NVIDIA Corp.',
    iconColor: '#76b900',
    basePrice: 138,
  },
];

export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-do-not-use-in-prod';
export const JWT_EXPIRES_IN = '24h';
