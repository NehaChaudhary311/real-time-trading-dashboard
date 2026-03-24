import { useEffect, useRef, useState, useCallback } from 'react';
import type { PriceTick, WsServerMessage } from '../types';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4000/ws';

const MIN_RECONNECT_MS = 1_000;
const MAX_RECONNECT_MS = 30_000;

export interface UseWebSocketReturn {
  connected: boolean;
  subscribe: (symbols: string[]) => void;
  unsubscribe: (symbols: string[]) => void;
  lastTick: PriceTick | null;
  onTick: (handler: (tick: PriceTick) => void) => () => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelay = useRef(MIN_RECONNECT_MS);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const subscribedSymbols = useRef<Set<string>>(new Set());
  const tickHandlers = useRef<Set<(tick: PriceTick) => void>>(new Set());

  const [connected, setConnected] = useState(false);
  const [lastTick, setLastTick] = useState<PriceTick | null>(null);

  const send = useCallback((data: unknown) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }, []);

  const subscribe = useCallback((symbols: string[]) => {
    symbols.forEach((s) => subscribedSymbols.current.add(s));
    send({ type: 'subscribe', symbols });
  }, [send]);

  const unsubscribe = useCallback((symbols: string[]) => {
    symbols.forEach((s) => subscribedSymbols.current.delete(s));
    send({ type: 'unsubscribe', symbols });
  }, [send]);

  const onTick = useCallback((handler: (tick: PriceTick) => void) => {
    tickHandlers.current.add(handler);
    return () => { tickHandlers.current.delete(handler); };
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      reconnectDelay.current = MIN_RECONNECT_MS;

      // Re-subscribe to previously tracked symbols
      if (subscribedSymbols.current.size > 0) {
        send({ type: 'subscribe', symbols: Array.from(subscribedSymbols.current) });
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WsServerMessage;
        if (msg.type === 'price_update') {
          setLastTick(msg.data);
          tickHandlers.current.forEach((h) => h(msg.data));
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      scheduleReconnect();
    };

    ws.onerror = () => {
      ws.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scheduleReconnect = useCallback(() => {
    clearTimeout(reconnectTimer.current);
    reconnectTimer.current = setTimeout(() => {
      reconnectDelay.current = Math.min(
        reconnectDelay.current * 2,
        MAX_RECONNECT_MS,
      );
      connect();
    }, reconnectDelay.current);
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { connected, subscribe, unsubscribe, lastTick, onTick };
}
