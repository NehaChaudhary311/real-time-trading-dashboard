import { MarketDataGenerator } from '../services/marketDataGenerator.js';
import type { PriceTick, TickerDefinition } from '../types/index.js';

const TEST_TICKERS: TickerDefinition[] = [
  { symbol: 'TEST/USD', fullName: 'Test Coin', iconColor: '#fff', basePrice: 100 },
  { symbol: 'ACME', fullName: 'Acme Corp', iconColor: '#000', basePrice: 50 },
];

describe('MarketDataGenerator', () => {
  let generator: MarketDataGenerator;

  beforeEach(() => {
    generator = new MarketDataGenerator(TEST_TICKERS, 1000);
  });

  afterEach(() => {
    generator.stop();
  });

  // ── Tick validity ───────────────────────────────────────

  it('should produce a valid PriceTick on manual tick()', () => {
    generator.tick();
    const snap = generator.getSnapshot('TEST/USD');

    expect(snap).toBeDefined();
    expect(snap!.symbol).toBe('TEST/USD');
    expect(typeof snap!.price).toBe('number');
    expect(snap!.price).toBeGreaterThan(0);
    expect(typeof snap!.change).toBe('number');
    expect(typeof snap!.changePercent).toBe('number');
    expect(typeof snap!.high24h).toBe('number');
    expect(typeof snap!.low24h).toBe('number');
    expect(typeof snap!.volume24h).toBe('number');
    expect(typeof snap!.timestamp).toBe('number');
  });

  it('should return snapshots for all tickers', () => {
    generator.tick();
    const all = generator.getAllSnapshots();

    expect(all).toHaveLength(2);
    const symbols = all.map((t) => t.symbol).sort();
    expect(symbols).toEqual(['ACME', 'TEST/USD']);
  });

  it('should return undefined for unknown symbol', () => {
    expect(generator.getSnapshot('NOPE')).toBeUndefined();
  });

  it('should keep price positive after many ticks', () => {
    for (let i = 0; i < 500; i++) generator.tick();

    const snap = generator.getSnapshot('TEST/USD');
    expect(snap!.price).toBeGreaterThan(0);
  });

  // ── Event emission ──────────────────────────────────────

  it('should emit "tick" event for every ticker on each tick()', () => {
    const received: PriceTick[] = [];
    generator.on('tick', (t: PriceTick) => received.push(t));

    generator.tick();

    expect(received).toHaveLength(2);
    expect(received.map((r) => r.symbol).sort()).toEqual(['ACME', 'TEST/USD']);
  });

  it('should emit per-symbol events', () => {
    const received: PriceTick[] = [];
    generator.on('tick:ACME', (t: PriceTick) => received.push(t));

    generator.tick();

    expect(received).toHaveLength(1);
    expect(received[0].symbol).toBe('ACME');
  });

  // ── 24H stat tracking ──────────────────────────────────

  it('should track high24h correctly across ticks', () => {
    for (let i = 0; i < 100; i++) generator.tick();

    const snap = generator.getSnapshot('TEST/USD')!;
    expect(snap.high24h).toBeGreaterThanOrEqual(snap.price);
    expect(snap.low24h).toBeLessThanOrEqual(snap.price);
    expect(snap.high24h).toBeGreaterThanOrEqual(snap.low24h);
  });

  it('should accumulate volume over ticks', () => {
    generator.tick();
    const v1 = generator.getSnapshot('TEST/USD')!.volume24h;

    generator.tick();
    const v2 = generator.getSnapshot('TEST/USD')!.volume24h;

    expect(v2).toBeGreaterThan(v1);
  });

  it('should compute change and changePercent relative to opening price', () => {
    const snap0 = generator.getSnapshot('TEST/USD')!;
    expect(snap0.change).toBe(0);
    expect(snap0.changePercent).toBe(0);

    for (let i = 0; i < 50; i++) generator.tick();

    const snap1 = generator.getSnapshot('TEST/USD')!;
    const expectedChange = snap1.price - 100;
    expect(snap1.change).toBeCloseTo(expectedChange, 1);
  });

  // ── Start / stop lifecycle ─────────────────────────────

  it('should start and stop the interval timer', () => {
    expect(generator.isRunning()).toBe(false);

    generator.start();
    expect(generator.isRunning()).toBe(true);

    generator.stop();
    expect(generator.isRunning()).toBe(false);
  });

  it('should not start duplicate timers', () => {
    generator.start();
    generator.start(); // no-op
    expect(generator.isRunning()).toBe(true);
    generator.stop();
  });

  it('should emit ticks on a timer when started', (done) => {
    const fast = new MarketDataGenerator(TEST_TICKERS, 50);
    const received: PriceTick[] = [];
    fast.on('tick', (t: PriceTick) => received.push(t));

    fast.start();

    setTimeout(() => {
      fast.stop();
      // 2 tickers × at least 2 intervals ≈ ≥4 ticks
      expect(received.length).toBeGreaterThanOrEqual(4);
      done();
    }, 180);
  });
});
