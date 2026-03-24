import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { MarketDataGenerator } from '../services/marketDataGenerator.js';
import type { PriceTick, WsClientMessage, WsServerMessage } from '../types/index.js';

interface ClientState {
  subscriptions: Set<string>;
  alive: boolean;
}

export class WsHandler {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, ClientState> = new Map();
  private generator: MarketDataGenerator;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(server: Server, generator: MarketDataGenerator, path = '/ws') {
    this.generator = generator;

    this.wss = new WebSocketServer({ server, path });

    this.wss.on('connection', (ws) => this.onConnection(ws));

    this.generator.on('tick', (tick: PriceTick) => this.broadcast(tick));

    // Ping clients every 30s, drop unresponsive ones
    this.heartbeatTimer = setInterval(() => this.heartbeat(), 30_000);
  }

  /** For testing — create from a raw WebSocketServer instead of an HTTP server */
  static fromWss(wss: WebSocketServer, generator: MarketDataGenerator): WsHandler {
    const handler = Object.create(WsHandler.prototype) as WsHandler;
    handler.wss = wss;
    handler.clients = new Map();
    handler.generator = generator;
    handler.heartbeatTimer = null;

    wss.on('connection', (ws) => handler.onConnection(ws));
    generator.on('tick', (tick: PriceTick) => handler.broadcast(tick));

    return handler;
  }

  getClientCount(): number {
    return this.clients.size;
  }

  close(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.wss.close();
  }

  // ── Connection lifecycle ────────────────────────────────

  private onConnection(ws: WebSocket): void {
    const state: ClientState = { subscriptions: new Set(), alive: true };
    this.clients.set(ws, state);

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as WsClientMessage;
        this.handleMessage(ws, state, msg);
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      }
    });

    ws.on('pong', () => {
      state.alive = true;
    });

    ws.on('close', () => {
      this.clients.delete(ws);
    });
  }

  private handleMessage(ws: WebSocket, state: ClientState, msg: WsClientMessage): void {
    if (!msg.type || !Array.isArray(msg.symbols)) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      return;
    }

    if (msg.type === 'subscribe') {
      for (const sym of msg.symbols) state.subscriptions.add(sym);
      ws.send(JSON.stringify({
        type: 'subscribed',
        symbols: Array.from(state.subscriptions),
      }));
    } else if (msg.type === 'unsubscribe') {
      for (const sym of msg.symbols) state.subscriptions.delete(sym);
      ws.send(JSON.stringify({
        type: 'unsubscribed',
        symbols: Array.from(state.subscriptions),
      }));
    }
  }

  // ── Broadcasting ────────────────────────────────────────

  private broadcast(tick: PriceTick): void {
    const message: WsServerMessage = { type: 'price_update', data: tick };
    const payload = JSON.stringify(message);

    for (const [ws, state] of this.clients) {
      if (ws.readyState === WebSocket.OPEN && state.subscriptions.has(tick.symbol)) {
        ws.send(payload);
      }
    }
  }

  // ── Heartbeat ───────────────────────────────────────────

  private heartbeat(): void {
    for (const [ws, state] of this.clients) {
      if (!state.alive) {
        ws.terminate();
        this.clients.delete(ws);
        return;
      }
      state.alive = false;
      ws.ping();
    }
  }
}
