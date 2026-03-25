import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { createAlertRouter } from '../routes/alerts.js';
import { AlertService } from '../services/alertService.js';
import { MarketDataGenerator } from '../services/marketDataGenerator.js';
import { JWT_SECRET } from '../config.js';
import type { TickerDefinition } from '../types/index.js';

const TEST_TICKERS: TickerDefinition[] = [
  { symbol: 'TEST/USD', fullName: 'Test Coin', iconColor: '#fff', basePrice: 100 },
];

function makeToken(payload = { id: '1', username: 'admin' }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

describe('Alert REST routes', () => {
  let app: express.Express;
  let generator: MarketDataGenerator;
  let alertService: AlertService;
  let token: string;

  beforeEach(() => {
    generator = new MarketDataGenerator(TEST_TICKERS, 100_000);
    alertService = new AlertService(generator);

    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/alerts', createAlertRouter(alertService));

    token = makeToken();
  });

  afterEach(() => {
    generator.stop();
  });

  it('should return 401 when no token is provided', async () => {
    const res = await request(app).get('/api/alerts');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Authentication required/);
  });

  it('should return 401 for an invalid token', async () => {
    const res = await request(app)
      .get('/api/alerts')
      .set('Authorization', 'Bearer invalid.token.here');

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Invalid or expired/);
  });

  describe('GET /api/alerts', () => {
    it('should return an empty array when no alerts exist', async () => {
      const res = await request(app)
        .get('/api/alerts')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should return all alerts', async () => {
      alertService.create('TEST/USD', 110, 'above');
      alertService.create('TEST/USD', 90, 'below');

      const res = await request(app)
        .get('/api/alerts')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  describe('POST /api/alerts', () => {
    it('should create an alert and return 201', async () => {
      const res = await request(app)
        .post('/api/alerts')
        .set('Authorization', `Bearer ${token}`)
        .send({ symbol: 'TEST/USD', threshold: 110, direction: 'above' });

      expect(res.status).toBe(201);
      expect(res.body.symbol).toBe('TEST/USD');
      expect(res.body.threshold).toBe(110);
      expect(res.body.direction).toBe('above');
      expect(res.body.frequency).toBe('once');
      expect(res.body.id).toBeDefined();
    });

    it('should accept every_time frequency', async () => {
      const res = await request(app)
        .post('/api/alerts')
        .set('Authorization', `Bearer ${token}`)
        .send({ symbol: 'TEST/USD', threshold: 90, direction: 'below', frequency: 'every_time' });

      expect(res.status).toBe(201);
      expect(res.body.frequency).toBe('every_time');
    });

    it('should return 400 when symbol is missing', async () => {
      const res = await request(app)
        .post('/api/alerts')
        .set('Authorization', `Bearer ${token}`)
        .send({ threshold: 110, direction: 'above' });

      expect(res.status).toBe(400);
    });

    it('should return 400 when threshold is not a number', async () => {
      const res = await request(app)
        .post('/api/alerts')
        .set('Authorization', `Bearer ${token}`)
        .send({ symbol: 'TEST/USD', threshold: 'high', direction: 'above' });

      expect(res.status).toBe(400);
    });

    it('should return 400 when direction is invalid', async () => {
      const res = await request(app)
        .post('/api/alerts')
        .set('Authorization', `Bearer ${token}`)
        .send({ symbol: 'TEST/USD', threshold: 110, direction: 'sideways' });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/alerts/:id', () => {
    it('should delete an existing alert and return 200', async () => {
      const alert = alertService.create('TEST/USD', 110, 'above');

      const res = await request(app)
        .delete(`/api/alerts/${alert.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
      expect(alertService.list()).toHaveLength(0);
    });

    it('should return 404 for a nonexistent alert', async () => {
      const res = await request(app)
        .delete('/api/alerts/no-such-id')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/Alert not found/);
    });
  });
});
