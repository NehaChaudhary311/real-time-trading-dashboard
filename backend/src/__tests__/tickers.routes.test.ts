import request from 'supertest';
import express from 'express';
import { createTickerRouter } from '../routes/tickers.js';
import { MarketDataGenerator } from '../services/marketDataGenerator.js';
import { HistoricalDataService } from '../services/historicalDataService.js';
import type { TickerDefinition } from '../types/index.js';

const TEST_TICKERS: TickerDefinition[] = [
  { symbol: 'BTC/USDT', fullName: 'Bitcoin', iconColor: '#f7931a', basePrice: 87_250 },
  { symbol: 'AAPL', fullName: 'Apple Inc.', iconColor: '#a2aaad', basePrice: 232 },
];

describe('Ticker REST routes', () => {
  let app: express.Express;
  let generator: MarketDataGenerator;
  let historyService: HistoricalDataService;

  beforeAll(() => {
    generator = new MarketDataGenerator(TEST_TICKERS, 1000);
    historyService = new HistoricalDataService(TEST_TICKERS, 30, 10);
    historyService.attachGenerator(generator);
    generator.tick();

    app = express();
    app.use(express.json());
    app.use('/api/tickers', createTickerRouter(generator, historyService, TEST_TICKERS));
  });

  afterAll(() => {
    generator.stop();
  });

  // ── GET /api/tickers ────────────────────────────────────

  describe('GET /api/tickers', () => {
    it('should return 200 with an array of ticker snapshots', async () => {
      const res = await request(app).get('/api/tickers');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
    });

    it('should include all expected fields on each ticker', async () => {
      const res = await request(app).get('/api/tickers');
      const btc = res.body.find((t: { symbol: string }) => t.symbol === 'BTC/USDT');

      expect(btc).toBeDefined();
      expect(btc.fullName).toBe('Bitcoin');
      expect(btc.iconColor).toBe('#f7931a');
      expect(typeof btc.price).toBe('number');
      expect(typeof btc.change).toBe('number');
      expect(typeof btc.changePercent).toBe('number');
      expect(typeof btc.high24h).toBe('number');
      expect(typeof btc.low24h).toBe('number');
      expect(typeof btc.volume24h).toBe('number');
      expect(typeof btc.timestamp).toBe('number');
    });
  });

  // ── GET /api/tickers/:symbol/history ────────────────────

  describe('GET /api/tickers/:symbol/history', () => {
    it('should return candles with default interval (1h)', async () => {
      const res = await request(app).get('/api/tickers/AAPL/history');

      expect(res.status).toBe(200);
      expect(res.body.symbol).toBe('AAPL');
      expect(res.body.interval).toBe('1h');
      expect(res.body.count).toBeGreaterThan(0);
      expect(Array.isArray(res.body.candles)).toBe(true);
    });

    it('should respect the interval query param', async () => {
      const res = await request(app)
        .get('/api/tickers/AAPL/history')
        .query({ interval: '1d' });

      expect(res.status).toBe(200);
      expect(res.body.interval).toBe('1d');
      expect(res.body.count).toBe(res.body.candles.length);
    });

    it('should filter by days query param', async () => {
      const allRes = await request(app)
        .get('/api/tickers/AAPL/history')
        .query({ interval: '1h' });

      const weekRes = await request(app)
        .get('/api/tickers/AAPL/history')
        .query({ interval: '1h', days: 7 });

      expect(weekRes.body.count).toBeLessThan(allRes.body.count);
      expect(weekRes.body.count).toBeGreaterThan(0);
    });

    it('should return valid OHLCV candle shape', async () => {
      const res = await request(app)
        .get('/api/tickers/AAPL/history')
        .query({ interval: '4h' });

      const candle = res.body.candles[0];
      expect(candle).toHaveProperty('time');
      expect(candle).toHaveProperty('open');
      expect(candle).toHaveProperty('high');
      expect(candle).toHaveProperty('low');
      expect(candle).toHaveProperty('close');
      expect(candle).toHaveProperty('volume');
    });

    it('should return 400 for invalid interval', async () => {
      const res = await request(app)
        .get('/api/tickers/AAPL/history')
        .query({ interval: '2h' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Invalid interval/);
    });

    it('should return 404 for unknown symbol', async () => {
      const res = await request(app).get('/api/tickers/NOPE/history');

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/Unknown symbol/);
    });

    it('should handle URL-encoded symbols like BTC/USDT', async () => {
      const res = await request(app).get(
        `/api/tickers/${encodeURIComponent('BTC/USDT')}/history`,
      );

      expect(res.status).toBe(200);
      expect(res.body.symbol).toBe('BTC/USDT');
    });
  });
});
