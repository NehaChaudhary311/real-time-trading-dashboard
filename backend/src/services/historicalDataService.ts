import { LRUCache } from 'lru-cache';
import { TICKERS, HISTORY_DAYS, SUPPORTED_INTERVALS } from '../config.js';
import type {
  Interval,
  OHLCVCandle,
  PriceTick,
  TickerDefinition,
} from '../types/index.js';
import type { MarketDataGenerator } from './marketDataGenerator.js';

const INTERVAL_MS: Record<Interval, number> = {
  '1m': 60_000,
  '5m': 5 * 60_000,
  '15m': 15 * 60_000,
  '1h': 60 * 60_000,
  '4h': 4 * 60 * 60_000,
  '1d': 24 * 60 * 60_000,
};

// Annualised volatility reused for candle generation (mirrors marketDataGenerator)
const VOLATILITY: Record<string, number> = {
  'BTC/USDT': 0.65,
  'ETH/USDT': 0.75,
  'SOL/USDT': 0.90,
  AAPL: 0.30,
  TSLA: 0.55,
  NVDA: 0.50,
};
const DEFAULT_VOLATILITY = 0.40;

function randomNormal(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export class HistoricalDataService {
  private cache: LRUCache<string, OHLCVCandle[]>;
  private tickers: Map<string, TickerDefinition>;
  private historyDays: number;

  constructor(
    tickers: TickerDefinition[] = TICKERS,
    historyDays: number = HISTORY_DAYS,
    cacheMax: number = 50,
  ) {
    this.tickers = new Map(tickers.map((t) => [t.symbol, t]));
    this.historyDays = historyDays;
    this.cache = new LRUCache({ max: cacheMax });
  }

  /**
   * Subscribe to a MarketDataGenerator so live ticks automatically
   * update the most recent candle (or start a new one).
   */
  attachGenerator(generator: MarketDataGenerator): void {
    generator.on('tick', (tick: PriceTick) => this.applyTick(tick));
  }

  getCandles(
    symbol: string,
    interval: Interval,
    days?: number,
  ): OHLCVCandle[] | undefined {
    if (!this.tickers.has(symbol)) return undefined;
    if (!SUPPORTED_INTERVALS.includes(interval)) return undefined;

    const key = `${symbol}:${interval}`;
    let candles = this.cache.get(key);

    if (!candles) {
      candles = this.generateHistory(symbol, interval);
      this.cache.set(key, candles);
    }

    if (days !== undefined && days > 0) {
      const cutoff = Date.now() - days * 24 * 60 * 60_000;
      return candles.filter((c) => c.time >= cutoff);
    }

    return candles;
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  // ── History generation ──────────────────────────────────

  private generateHistory(symbol: string, interval: Interval): OHLCVCandle[] {
    const def = this.tickers.get(symbol)!;
    const intervalMs = INTERVAL_MS[interval];
    const totalMs = this.historyDays * 24 * 60 * 60_000;
    const candleCount = Math.floor(totalMs / intervalMs);

    const sigma = VOLATILITY[symbol] ?? DEFAULT_VOLATILITY;
    // Scale volatility to the candle's time-span (annualised → per-candle)
    const dt = intervalMs / 1000 / (365.25 * 24 * 3600);
    const sqrtDt = Math.sqrt(dt);

    // Walk backwards from basePrice so the most recent candle lands on it
    const closes: number[] = new Array(candleCount);
    let price = def.basePrice;

    for (let i = candleCount - 1; i >= 0; i--) {
      closes[i] = price;
      const z = randomNormal();
      price = Math.max(price - price * sigma * sqrtDt * z, def.basePrice * 0.1);
    }

    const now = Date.now();
    // Align the latest candle boundary to interval
    const latestBoundary = Math.floor(now / intervalMs) * intervalMs;

    const candles: OHLCVCandle[] = [];

    for (let i = 0; i < candleCount; i++) {
      const time = latestBoundary - (candleCount - 1 - i) * intervalMs;
      const close = closes[i];

      // Generate open as a small deviation from close
      const openDelta = close * sigma * sqrtDt * randomNormal() * 0.3;
      const open = Math.max(close + openDelta, def.basePrice * 0.1);

      // High is above both, low is below both
      const spread = Math.abs(open - close);
      const high = Math.max(open, close) + Math.abs(randomNormal()) * spread * 0.5;
      const low = Math.min(open, close) - Math.abs(randomNormal()) * spread * 0.5;

      const volume = def.basePrice * (5000 + Math.random() * 10000);

      candles.push({
        time,
        open: round(open, 2),
        high: round(Math.max(high, open, close), 2),
        low: round(Math.max(Math.min(low, open, close), 0.01), 2),
        close: round(close, 2),
        volume: round(volume, 0),
      });
    }

    return candles;
  }

  // ── Live candle updates ─────────────────────────────────

  private applyTick(tick: PriceTick): void {
    for (const interval of SUPPORTED_INTERVALS) {
      const key = `${tick.symbol}:${interval}`;
      const candles = this.cache.get(key);
      if (!candles) continue; // only update intervals that have been requested

      const intervalMs = INTERVAL_MS[interval];
      const currentBoundary = Math.floor(tick.timestamp / intervalMs) * intervalMs;
      const last = candles[candles.length - 1];

      if (last && last.time === currentBoundary) {
        // Update existing candle
        last.close = round(tick.price, 2);
        if (tick.price > last.high) last.high = round(tick.price, 2);
        if (tick.price < last.low) last.low = round(tick.price, 2);
        last.volume += Math.round(tick.price * (50 + Math.random() * 100));
      } else {
        // New candle period
        candles.push({
          time: currentBoundary,
          open: round(tick.price, 2),
          high: round(tick.price, 2),
          low: round(tick.price, 2),
          close: round(tick.price, 2),
          volume: Math.round(tick.price * (50 + Math.random() * 100)),
        });
      }
    }
  }
}
