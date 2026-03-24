import { HistoricalDataService } from '../services/historicalDataService.js';
import { MarketDataGenerator } from '../services/marketDataGenerator.js';
import type { TickerDefinition } from '../types/index.js';

const TEST_TICKERS: TickerDefinition[] = [
  { symbol: 'TEST/USD', fullName: 'Test Coin', iconColor: '#fff', basePrice: 100 },
  { symbol: 'ACME', fullName: 'Acme Corp', iconColor: '#000', basePrice: 50 },
];

describe('HistoricalDataService', () => {
  let service: HistoricalDataService;

  beforeEach(() => {
    service = new HistoricalDataService(TEST_TICKERS, 30, 10);
  });

  // ── Candle generation ───────────────────────────────────

  it('should generate candles for a valid symbol and interval', () => {
    const candles = service.getCandles('TEST/USD', '1h');
    expect(candles).toBeDefined();
    expect(candles!.length).toBeGreaterThan(0);
  });

  it('should return undefined for unknown symbol', () => {
    expect(service.getCandles('NOPE', '1h')).toBeUndefined();
  });

  it('should return undefined for unsupported interval', () => {
    expect(service.getCandles('TEST/USD', '2h' as never)).toBeUndefined();
  });

  it('should generate valid OHLCV candles', () => {
    const candles = service.getCandles('TEST/USD', '1h')!;
    for (const c of candles) {
      expect(c.time).toBeGreaterThan(0);
      expect(c.open).toBeGreaterThan(0);
      expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close));
      expect(c.low).toBeLessThanOrEqual(Math.min(c.open, c.close));
      expect(c.low).toBeGreaterThan(0);
      expect(c.close).toBeGreaterThan(0);
      expect(c.volume).toBeGreaterThan(0);
    }
  });

  it('should produce candles in ascending time order', () => {
    const candles = service.getCandles('ACME', '15m')!;
    for (let i = 1; i < candles.length; i++) {
      expect(candles[i].time).toBeGreaterThan(candles[i - 1].time);
    }
  });

  // ── Interval support ────────────────────────────────────

  it.each(['1m', '5m', '15m', '1h', '4h', '1d'] as const)(
    'should generate candles for interval %s',
    (interval) => {
      const candles = service.getCandles('TEST/USD', interval);
      expect(candles).toBeDefined();
      expect(candles!.length).toBeGreaterThan(0);
    },
  );

  it('should generate more candles for smaller intervals', () => {
    const hourly = service.getCandles('TEST/USD', '1h')!;
    const daily = service.getCandles('TEST/USD', '1d')!;
    expect(hourly.length).toBeGreaterThan(daily.length);
  });

  it('should filter candles by days parameter', () => {
    const all = service.getCandles('TEST/USD', '1h')!;
    const week = service.getCandles('TEST/USD', '1h', 7)!;
    expect(week.length).toBeLessThan(all.length);
    expect(week.length).toBeGreaterThan(0);
  });

  // ── LRU cache ───────────────────────────────────────────

  it('should cache results on repeated calls', () => {
    const first = service.getCandles('TEST/USD', '1h');
    const second = service.getCandles('TEST/USD', '1h');
    expect(first).toBe(second); // same reference = cache hit
  });

  it('should track cache size', () => {
    expect(service.getCacheSize()).toBe(0);

    service.getCandles('TEST/USD', '1h');
    expect(service.getCacheSize()).toBe(1);

    service.getCandles('TEST/USD', '1d');
    expect(service.getCacheSize()).toBe(2);

    // Same key — no new entry
    service.getCandles('TEST/USD', '1h');
    expect(service.getCacheSize()).toBe(2);
  });

  it('should evict entries when cache is full', () => {
    const small = new HistoricalDataService(TEST_TICKERS, 1, 2);

    small.getCandles('TEST/USD', '1h');
    small.getCandles('TEST/USD', '1d');
    expect(small.getCacheSize()).toBe(2);

    // Third entry should evict the LRU
    small.getCandles('ACME', '1h');
    expect(small.getCacheSize()).toBe(2);
  });

  // ── Live candle appending ───────────────────────────────

  it('should update the latest candle when ticks arrive within the same interval', () => {
    const candles = service.getCandles('TEST/USD', '1d')!;
    const countBefore = candles.length;
    const volBefore = candles[candles.length - 1].volume;

    const generator = new MarketDataGenerator(TEST_TICKERS, 1000);
    service.attachGenerator(generator);

    for (let i = 0; i < 10; i++) generator.tick();

    // Candle is updated in-place (volume grows) rather than appending new ones
    // since all ticks land in the same 1d boundary
    expect(candles.length).toBe(countBefore);
    expect(candles[candles.length - 1].volume).toBeGreaterThan(volBefore);
  });

  it('should only update cached intervals, not uncached ones', () => {
    // Request 1d so it gets cached
    service.getCandles('TEST/USD', '1d');
    // Don't request 1m

    const generator = new MarketDataGenerator(TEST_TICKERS, 1000);
    service.attachGenerator(generator);
    generator.tick();

    // 1d was cached, so it should have been updated
    expect(service.getCacheSize()).toBe(1);
  });

  it('should accumulate volume on live candle updates', () => {
    const candles = service.getCandles('TEST/USD', '1d')!;

    const generator = new MarketDataGenerator(TEST_TICKERS, 1000);
    service.attachGenerator(generator);

    const volBefore = candles[candles.length - 1].volume;
    generator.tick();
    generator.tick();
    generator.tick();
    const volAfter = candles[candles.length - 1].volume;

    expect(volAfter).toBeGreaterThan(volBefore);
  });
});
