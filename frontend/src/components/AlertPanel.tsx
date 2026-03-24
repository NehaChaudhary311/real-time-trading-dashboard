import { useState, useEffect, useCallback } from 'react';
import { fetchAlerts, createAlert, deleteAlert } from '../services/api';
import type { Alert, AlertDirection } from '../types';
import type { UseWebSocketReturn } from '../hooks/useWebSocket';

interface AlertPanelProps {
  symbol: string;
  token: string | null;
  ws: UseWebSocketReturn;
  onLoginClick: () => void;
}

export default function AlertPanel({ symbol, token, ws, onLoginClick }: AlertPanelProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [threshold, setThreshold] = useState('');
  const [direction, setDirection] = useState<AlertDirection>('above');
  const [toasts, setToasts] = useState<{ id: string; text: string }[]>([]);

  // Load alerts
  useEffect(() => {
    if (!token) return;
    fetchAlerts(token).then(setAlerts).catch(() => {});
  }, [token]);

  // Listen for alert_triggered via WS
  const handleTick = useCallback(() => {}, []);
  useEffect(() => {
    const unsub = ws.onTick(handleTick);
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws.onTick, handleTick]);

  // Listen to raw WS messages for alert_triggered
  useEffect(() => {
    const handleMsg = (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'alert_triggered') {
          const { symbol: sym, threshold: th, direction: dir, currentPrice } = msg.data;
          const id = `${Date.now()}`;
          const text = `${sym} ${dir === 'above' ? 'rose above' : 'fell below'} $${th.toLocaleString()} (now $${currentPrice.toLocaleString()})`;
          setToasts((prev) => [...prev, { id, text }]);
          setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);

          setAlerts((prev) => prev.map((a) =>
            a.symbol === sym && a.threshold === th && a.direction === dir
              ? { ...a, triggered: true, triggeredAt: Date.now() }
              : a
          ));
        }
      } catch { /* ignore */ }
    };

    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:4000/ws';
    const socket = new WebSocket(wsUrl);
    socket.addEventListener('message', handleMsg);
    return () => { socket.close(); };
  }, []);

  const handleCreate = async () => {
    if (!token || !threshold) return;
    const val = parseFloat(threshold);
    if (isNaN(val)) return;

    const alert = await createAlert(token, symbol, val, direction);
    setAlerts((prev) => [...prev, alert]);
    setThreshold('');
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    await deleteAlert(token, id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const symbolAlerts = alerts.filter((a) => a.symbol === symbol);

  if (!token) {
    return (
      <div className="alert-panel">
        <div className="alert-panel-header">
          <span className="sidebar-title">Price Alerts</span>
        </div>
        <div className="alert-panel-login">
          <button className="form-btn" onClick={onLoginClick} style={{ width: 'auto', padding: '6px 16px', fontSize: 12 }}>
            Sign in to set alerts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="alert-panel">
      <div className="alert-panel-header">
        <span className="sidebar-title">Price Alerts</span>
      </div>

      <div className="alert-form">
        <select
          className="form-input alert-select"
          value={direction}
          onChange={(e) => setDirection(e.target.value as AlertDirection)}
        >
          <option value="above">Above</option>
          <option value="below">Below</option>
        </select>
        <input
          className="form-input alert-input"
          type="number"
          placeholder="Price..."
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
        <button className="alert-add-btn" onClick={handleCreate}>+</button>
      </div>

      <div className="alert-list">
        {symbolAlerts.length === 0 && (
          <div className="alert-empty">No alerts for {symbol}</div>
        )}
        {symbolAlerts.map((a) => (
          <div key={a.id} className={`alert-item${a.triggered ? ' triggered' : ''}`}>
            <span className="alert-item-text">
              {a.direction === 'above' ? '\u2191' : '\u2193'} ${a.threshold.toLocaleString()}
            </span>
            {a.triggered && <span className="alert-item-badge">Triggered</span>}
            <button className="alert-delete-btn" onClick={() => handleDelete(a.id)}>&times;</button>
          </div>
        ))}
      </div>

      {/* Toast notifications */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className="toast">{t.text}</div>
        ))}
      </div>
    </div>
  );
}
