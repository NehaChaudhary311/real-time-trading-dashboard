import { WebSocketServer, WebSocket } from 'ws';
import { createServer, Server } from 'http';
import { WsHandler } from '../websocket/handler.js';
import { MarketDataGenerator } from '../services/marketDataGenerator.js';
import type { TickerDefinition } from '../types/index.js';

const TEST_TICKERS: TickerDefinition[] = [
  { symbol: 'TEST/USD', fullName: 'Test Coin', iconColor: '#fff', basePrice: 100 },
  { symbol: 'ACME', fullName: 'Acme Corp', iconColor: '#000', basePrice: 50 },
];

function waitForMessage(ws: WebSocket): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    ws.once('message', (raw) => resolve(JSON.parse(raw.toString())));
  });
}

function waitForOpen(ws: WebSocket): Promise<void> {
  return new Promise((resolve) => {
    if (ws.readyState === WebSocket.OPEN) return resolve();
    ws.once('open', () => resolve());
  });
}

describe('WsHandler', () => {
  let httpServer: Server;
  let generator: MarketDataGenerator;
  let handler: WsHandler;
  let port: number;

  beforeAll((done) => {
    generator = new MarketDataGenerator(TEST_TICKERS, 100_000);
    httpServer = createServer();
    handler = new WsHandler(httpServer, generator);

    httpServer.listen(0, () => {
      const addr = httpServer.address();
      port = typeof addr === 'object' && addr ? addr.port : 0;
      done();
    });
  });

  afterAll((done) => {
    handler.close();
    generator.stop();
    httpServer.close(done);
  });

  function connect(): WebSocket {
    return new WebSocket(`ws://localhost:${port}/ws`);
  }

  // ── Connection ──────────────────────────────────────────

  it('should accept WebSocket connections', async () => {
    const ws = connect();
    await waitForOpen(ws);

    expect(handler.getClientCount()).toBeGreaterThanOrEqual(1);
    ws.close();
  });

  it('should track and clean up disconnected clients', async () => {
    const ws = connect();
    await waitForOpen(ws);

    const countBefore = handler.getClientCount();
    ws.close();

    await new Promise((r) => setTimeout(r, 100));
    expect(handler.getClientCount()).toBe(countBefore - 1);
  });

  // ── Subscribe / Unsubscribe ─────────────────────────────

  it('should acknowledge subscribe with current subscriptions', async () => {
    const ws = connect();
    await waitForOpen(ws);

    const msgPromise = waitForMessage(ws);
    ws.send(JSON.stringify({ type: 'subscribe', symbols: ['TEST/USD', 'ACME'] }));
    const msg = await msgPromise;

    expect(msg.type).toBe('subscribed');
    expect((msg.symbols as string[]).sort()).toEqual(['ACME', 'TEST/USD']);
    ws.close();
  });

  it('should acknowledge unsubscribe and remove symbols', async () => {
    const ws = connect();
    await waitForOpen(ws);

    const subPromise = waitForMessage(ws);
    ws.send(JSON.stringify({ type: 'subscribe', symbols: ['TEST/USD', 'ACME'] }));
    await subPromise;

    const unsubPromise = waitForMessage(ws);
    ws.send(JSON.stringify({ type: 'unsubscribe', symbols: ['ACME'] }));
    const msg = await unsubPromise;

    expect(msg.type).toBe('unsubscribed');
    expect(msg.symbols).toEqual(['TEST/USD']);
    ws.close();
  });

  // ── Price updates ───────────────────────────────────────

  it('should broadcast price_update only for subscribed symbols', async () => {
    const ws = connect();
    await waitForOpen(ws);

    const subPromise = waitForMessage(ws);
    ws.send(JSON.stringify({ type: 'subscribe', symbols: ['TEST/USD'] }));
    await subPromise;

    const updatePromise = waitForMessage(ws);
    generator.tick();
    const msg = await updatePromise;

    expect(msg.type).toBe('price_update');
    const data = msg.data as Record<string, unknown>;
    expect(data.symbol).toBe('TEST/USD');
    expect(typeof data.price).toBe('number');
    expect(typeof data.change).toBe('number');
    expect(typeof data.changePercent).toBe('number');
    expect(typeof data.high24h).toBe('number');
    expect(typeof data.low24h).toBe('number');
    expect(typeof data.volume24h).toBe('number');
    expect(typeof data.timestamp).toBe('number');
    ws.close();
  });

  it('should not send updates for unsubscribed symbols', async () => {
    const ws = connect();
    await waitForOpen(ws);

    const subPromise = waitForMessage(ws);
    ws.send(JSON.stringify({ type: 'subscribe', symbols: ['TEST/USD'] }));
    await subPromise;

    // Collect all messages for 200ms after a tick
    const received: Record<string, unknown>[] = [];
    ws.on('message', (raw) => received.push(JSON.parse(raw.toString())));

    generator.tick();
    await new Promise((r) => setTimeout(r, 200));

    // Should only get TEST/USD, not ACME
    const symbols = received
      .filter((m) => m.type === 'price_update')
      .map((m) => (m.data as Record<string, unknown>).symbol);
    expect(symbols).not.toContain('ACME');
    ws.close();
  });

  // ── Error handling ──────────────────────────────────────

  it('should return error for invalid JSON', async () => {
    const ws = connect();
    await waitForOpen(ws);

    const msgPromise = waitForMessage(ws);
    ws.send('not json');
    const msg = await msgPromise;

    expect(msg.type).toBe('error');
    expect(msg.message).toBe('Invalid JSON');
    ws.close();
  });

  it('should return error for malformed message', async () => {
    const ws = connect();
    await waitForOpen(ws);

    const msgPromise = waitForMessage(ws);
    ws.send(JSON.stringify({ type: 'subscribe' })); // missing symbols
    const msg = await msgPromise;

    expect(msg.type).toBe('error');
    expect(msg.message).toMatch(/Invalid message/);
    ws.close();
  });
});
