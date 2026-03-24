import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { PORT } from './config.js';
import { MarketDataGenerator } from './services/marketDataGenerator.js';
import { HistoricalDataService } from './services/historicalDataService.js';
import { AlertService } from './services/alertService.js';
import { createTickerRouter } from './routes/tickers.js';
import { createAuthRouter } from './routes/auth.js';
import { createAlertRouter } from './routes/alerts.js';
import { WsHandler } from './websocket/handler.js';

const app = express();
const server = createServer(app);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// ── Services ────────────────────────────────────────────────
const generator = new MarketDataGenerator();
const historyService = new HistoricalDataService();
historyService.attachGenerator(generator);

const alertService = new AlertService(generator);

generator.start();

// ── Routes ──────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.use('/api/auth', createAuthRouter());
app.use('/api/tickers', createTickerRouter(generator, historyService));
app.use('/api/alerts', createAlertRouter(alertService));

// ── WebSocket ───────────────────────────────────────────────
const wsHandler = new WsHandler(server, generator);

alertService.setTriggerCallback((alert, currentPrice) => {
  wsHandler.broadcastAll({
    type: 'alert_triggered',
    data: {
      symbol: alert.symbol,
      threshold: alert.threshold,
      direction: alert.direction,
      currentPrice,
    },
  });
});

server.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`WebSocket server listening on ws://localhost:${PORT}/ws`);
});

export { app, server, generator, historyService, alertService, wsHandler };
