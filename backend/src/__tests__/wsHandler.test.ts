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

    const received: Record<string, unknown>[] = [];
    ws.on('message', (raw) => received.push(JSON.parse(raw.toString())));

    generator.tick();
    await new Promise((r) => setTimeout(r, 200));

    const symbols = received
      .filter((m) => m.type === 'price_update')
      .map((m) => (m.data as Record<string, unknown>).symbol);
    expect(symbols).not.toContain('ACME');
    ws.close();
  });

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
    ws.send(JSON.stringify({ type: 'subscribe' }));
    const msg = await msgPromise;

    expect(msg.type).toBe('error');
    expect(msg.message).toMatch(/Invalid message/);
    ws.close();
  });

  it('should broadcast message to all connected clients via broadcastAll', async () => {
    const ws1 = connect();
    const ws2 = connect();
    await waitForOpen(ws1);
    await waitForOpen(ws2);

    const msg1Promise = waitForMessage(ws1);
    const msg2Promise = waitForMessage(ws2);

    handler.broadcastAll({
      type: 'alert_triggered',
      data: { symbol: 'TEST/USD', threshold: 150, direction: 'above', currentPrice: 155 },
    });

    const [msg1, msg2] = await Promise.all([msg1Promise, msg2Promise]);

    expect(msg1.type).toBe('alert_triggered');
    expect(msg2.type).toBe('alert_triggered');
    expect((msg1.data as Record<string, unknown>).symbol).toBe('TEST/USD');
    expect((msg2.data as Record<string, unknown>).currentPrice).toBe(155);

    ws1.close();
    ws2.close();
  });

  it('should work via the fromWss static factory', async () => {
    const httpServer2 = createServer();
    const generator2 = new MarketDataGenerator(TEST_TICKERS, 100_000);
    const wss2 = new WebSocketServer({ server: httpServer2, path: '/ws2' });
    const handler2 = WsHandler.fromWss(wss2, generator2);

    await new Promise<void>((resolve) => {
      httpServer2.listen(0, () => resolve());
    });
    const addr2 = httpServer2.address();
    const port2 = typeof addr2 === 'object' && addr2 ? addr2.port : 0;

    const ws = new WebSocket(`ws://localhost:${port2}/ws2`);
    await waitForOpen(ws);

    expect(handler2.getClientCount()).toBe(1);

    const subPromise = waitForMessage(ws);
    ws.send(JSON.stringify({ type: 'subscribe', symbols: ['TEST/USD'] }));
    const msg = await subPromise;
    expect(msg.type).toBe('subscribed');

    ws.close();
    await new Promise((r) => setTimeout(r, 50));
    handler2.close();
    generator2.stop();
    await new Promise<void>((resolve) => httpServer2.close(() => resolve()));
  });

  it('should drop unresponsive clients on heartbeat', async () => {
    const httpServer3 = createServer();
    const generator3 = new MarketDataGenerator(TEST_TICKERS, 100_000);
    const handler3 = new WsHandler(httpServer3, generator3);

    await new Promise<void>((resolve) => {
      httpServer3.listen(0, () => resolve());
    });
    const addr3 = httpServer3.address();
    const port3 = typeof addr3 === 'object' && addr3 ? addr3.port : 0;

    const ws = new WebSocket(`ws://localhost:${port3}/ws`);
    await waitForOpen(ws);

    expect(handler3.getClientCount()).toBe(1);

    // Suppress pong responses so the client appears unresponsive
    ws.pong = () => {};

    // Private heartbeat: first call pings; second call drops client that never pongs
    (handler3 as unknown as { heartbeat: () => void }).heartbeat();
    (handler3 as unknown as { heartbeat: () => void }).heartbeat();

    await new Promise((r) => setTimeout(r, 100));
    expect(handler3.getClientCount()).toBe(0);

    handler3.close();
    generator3.stop();
    await new Promise<void>((resolve) => httpServer3.close(() => resolve()));
  });
});
