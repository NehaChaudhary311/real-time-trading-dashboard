import { Router } from 'express';
import { TICKERS, SUPPORTED_INTERVALS } from '../config.js';
import type { MarketDataGenerator } from '../services/marketDataGenerator.js';
import type { HistoricalDataService } from '../services/historicalDataService.js';
import type { Interval, TickerDefinition, TickerSnapshot } from '../types/index.js';

export function createTickerRouter(
  generator: MarketDataGenerator,
  historyService: HistoricalDataService,
  tickers: TickerDefinition[] = TICKERS,
): Router {
  const router = Router();

  // GET /api/tickers — list all tickers with current snapshot
  router.get('/', (_req, res) => {
    const snapshots: TickerSnapshot[] = tickers.map((def) => {
      const tick = generator.getSnapshot(def.symbol);
      return {
        symbol: def.symbol,
        fullName: def.fullName,
        iconColor: def.iconColor,
        price: tick?.price ?? def.basePrice,
        change: tick?.change ?? 0,
        changePercent: tick?.changePercent ?? 0,
        high24h: tick?.high24h ?? def.basePrice,
        low24h: tick?.low24h ?? def.basePrice,
        volume24h: tick?.volume24h ?? 0,
        timestamp: tick?.timestamp ?? Date.now(),
      };
    });

    res.json(snapshots);
  });

  // GET /api/tickers/:symbol/history?interval=1h&days=7
  router.get('/:symbol/history', (req, res) => {
    const { symbol } = req.params;
    const interval = (req.query.interval as string) || '1h';
    const days = req.query.days ? Number(req.query.days) : undefined;

    if (!SUPPORTED_INTERVALS.includes(interval as Interval)) {
      res.status(400).json({
        error: `Invalid interval. Supported: ${SUPPORTED_INTERVALS.join(', ')}`,
      });
      return;
    }

    const candles = historyService.getCandles(
      symbol,
      interval as Interval,
      days,
    );

    if (!candles) {
      res.status(404).json({ error: `Unknown symbol: ${symbol}` });
      return;
    }

    res.json({ symbol, interval, count: candles.length, candles });
  });

  return router;
}
