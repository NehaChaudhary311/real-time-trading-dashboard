import { EventEmitter } from 'events';
import { TICKERS, TICK_INTERVAL_MS } from '../config.js';
import type { PriceTick, TickerDefinition } from '../types/index.js';

// Per-ticker mutable state tracked across ticks
interface TickerState {
  definition: TickerDefinition;
  price: number;
  openPrice: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  lastResetTime: number;
}

// Annualised volatility — crypto is wilder than equities
const VOLATILITY: Record<string, number> = {
  'BTC/USDT': 0.65,
  'ETH/USDT': 0.75,
  'SOL/USDT': 0.90,
  AAPL: 0.30,
  TSLA: 0.55,
  NVDA: 0.50,
};

const DEFAULT_VOLATILITY = 0.40;
const ANNUAL_DRIFT = 0.0;
const SECONDS_PER_YEAR = 365.25 * 24 * 3600;
const MS_24H = 24 * 60 * 60 * 1000;

/**
 * Box-Muller transform — returns a standard-normal random variate.
 */
function randomNormal(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export class MarketDataGenerator extends EventEmitter {
  private states: Map<string, TickerState> = new Map();
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly intervalMs: number;

  constructor(
    tickers: TickerDefinition[] = TICKERS,
    intervalMs: number = TICK_INTERVAL_MS,
  ) {
    super();
    this.intervalMs = intervalMs;

    const now = Date.now();
    for (const def of tickers) {
      this.states.set(def.symbol, {
        definition: def,
        price: def.basePrice,
        openPrice: def.basePrice,
        high24h: def.basePrice,
        low24h: def.basePrice,
        volume24h: 0,
        lastResetTime: now,
      });
    }
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), this.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  isRunning(): boolean {
    return this.timer !== null;
  }

  /** Force a single tick, useful for testing and on-demand generation. */
  tick(): void {
    const now = Date.now();
    for (const state of this.states.values()) {
      this.updateTicker(state, now);
    }
  }

  getSnapshot(symbol: string): PriceTick | undefined {
    const state = this.states.get(symbol);
    if (!state) return undefined;
    return this.stateToTick(state);
  }

  getAllSnapshots(): PriceTick[] {
    return Array.from(this.states.values()).map((s) => this.stateToTick(s));
  }

  // ── internals ─────────────────────────────────────────────

  private updateTicker(state: TickerState, now: number): void {
    const sigma =
      VOLATILITY[state.definition.symbol] ?? DEFAULT_VOLATILITY;

    // Geometric Brownian Motion formula
    const dt = this.intervalMs / 1000 / SECONDS_PER_YEAR;
    const sqrtDt = Math.sqrt(dt);
    const z = randomNormal();
    const dS = state.price * (ANNUAL_DRIFT * dt + sigma * sqrtDt * z);

    state.price = Math.max(state.price + dS, 0.01);

    // Reset 24h window when it rolls over
    if (now - state.lastResetTime >= MS_24H) {
      state.openPrice = state.price;
      state.high24h = state.price;
      state.low24h = state.price;
      state.volume24h = 0;
      state.lastResetTime = now;
    }

    if (state.price > state.high24h) state.high24h = state.price;
    if (state.price < state.low24h) state.low24h = state.price;

    // Simulated volume per tick, proportional to price with random noise
    state.volume24h += state.price * (50 + Math.random() * 100);

    const tick = this.stateToTick(state);
    this.emit('tick', tick);
    this.emit(`tick:${state.definition.symbol}`, tick);
  }

  private stateToTick(state: TickerState): PriceTick {
    const change = state.price - state.openPrice;
    const changePercent =
      state.openPrice !== 0 ? (change / state.openPrice) * 100 : 0;

    return {
      symbol: state.definition.symbol,
      price: round(state.price, 2),
      change: round(change, 2),
      changePercent: round(changePercent, 4),
      high24h: round(state.high24h, 2),
      low24h: round(state.low24h, 2),
      volume24h: round(state.volume24h, 0),
      timestamp: Date.now(),
    };
  }
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
