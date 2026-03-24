import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { PORT } from './config.js';
import { MarketDataGenerator } from './services/marketDataGenerator.js';
import { HistoricalDataService } from './services/historicalDataService.js';
import { createTickerRouter } from './routes/tickers.js';

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());

// ── Services ────────────────────────────────────────────────
const generator = new MarketDataGenerator();
const historyService = new HistoricalDataService();
historyService.attachGenerator(generator);
generator.start();

// ── Routes ──────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.use('/api/tickers', createTickerRouter(generator, historyService));

server.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

export { app, server, generator, historyService };
