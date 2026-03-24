// ── Ticker ──────────────────────────────────────────────────

export interface TickerDefinition {
  symbol: string;
  fullName: string;
  iconColor: string;
  basePrice: number;
}

export interface TickerSnapshot {
  symbol: string;
  fullName: string;
  iconColor: string;
  price: number;
  change: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  timestamp: number;
}

// ── Price Tick ──────────────────────────────────────────────

export interface PriceTick {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  timestamp: number;
}

// ── OHLCV Candle ────────────────────────────────────────────

export type Interval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export interface OHLCVCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ── Alerts ──────────────────────────────────────────────────

export type AlertDirection = 'above' | 'below';

export interface Alert {
  id: string;
  symbol: string;
  threshold: number;
  direction: AlertDirection;
  triggered: boolean;
  createdAt: number;
  triggeredAt?: number;
}

// ── WebSocket Messages ──────────────────────────────────────

export interface WsSubscribeMessage {
  type: 'subscribe';
  symbols: string[];
}

export interface WsUnsubscribeMessage {
  type: 'unsubscribe';
  symbols: string[];
}

export type WsClientMessage = WsSubscribeMessage | WsUnsubscribeMessage;

export interface WsPriceUpdateMessage {
  type: 'price_update';
  data: PriceTick;
}

export interface WsAlertTriggeredMessage {
  type: 'alert_triggered';
  data: {
    symbol: string;
    threshold: number;
    direction: AlertDirection;
    currentPrice: number;
  };
}

export type WsServerMessage = WsPriceUpdateMessage | WsAlertTriggeredMessage;
