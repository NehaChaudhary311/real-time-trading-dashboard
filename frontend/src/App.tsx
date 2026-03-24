import { useState, useCallback, useEffect, useRef } from 'react';
import Header from './components/Header';
import type { Notification } from './components/Header';
import Dashboard from './components/Dashboard';
import TickerList from './components/TickerList';
import TickerInfoBar from './components/TickerInfoBar';
import IntervalSelector from './components/IntervalSelector';
import PriceChart from './components/PriceChart';
import LoginModal from './components/LoginModal';
import AlertModal from './components/AlertModal';
import { useWebSocket } from './hooks/useWebSocket';
import { useAuth } from './hooks/useAuth';
import { fetchAlerts, createAlert, deleteAlert } from './services/api';
import type { Interval, Alert, AlertDirection, AlertFrequency, PriceTick } from './types';
import type { ChartType } from './components/IntervalSelector';

function App() {
  const ws = useWebSocket();
  const auth = useAuth();
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USDT');
  const [interval, setInterval] = useState<Interval>('1h');
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [showLogin, setShowLogin] = useState(false);

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [alertSymbol, setAlertSymbol] = useState<string | null>(null);
  const pricesRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    return ws.onTick((tick: PriceTick) => {
      pricesRef.current.set(tick.symbol, tick.price);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws.onTick]);

  useEffect(() => {
    if (!auth.user) { setAlerts([]); return; }
    fetchAlerts().then(setAlerts).catch(() => {});
  }, [auth.user]);

  const handleAlertClick = useCallback((symbol: string) => {
    if (!auth.user) { setShowLogin(true); return; }
    setAlertSymbol(symbol);
  }, [auth.user]);

  const handleAlertSubmit = useCallback(async (threshold: number, direction: AlertDirection, frequency: AlertFrequency) => {
    if (!auth.user || !alertSymbol) return;
    try {
      const alert = await createAlert(alertSymbol, threshold, direction, frequency);
      setAlerts((prev) => [...prev, alert]);
    } catch { /* ignore */ }
    setAlertSymbol(null);
  }, [auth.user, alertSymbol]);

  const handleAlertDelete = useCallback(async (id: string) => {
    if (!auth.user) return;
    try {
      await deleteAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch { /* ignore */ }
  }, [auth.user]);

  useEffect(() => {
    return ws.onAlert((data) => {
      const { symbol: sym, threshold: th, direction: dir, currentPrice } = data;
      const text = `${sym} ${dir === 'above' ? 'rose above' : 'fell below'} $${th.toLocaleString()} (now $${currentPrice.toLocaleString()})`;
      setNotifications((prev) => [{ id: `${Date.now()}-${Math.random()}`, text, time: Date.now() }, ...prev]);

      setAlerts((prev) => prev.map((a) =>
        a.symbol === sym && a.threshold === th && a.direction === dir
          ? { ...a, triggered: true, triggeredAt: Date.now(), triggerCount: a.triggerCount + 1 }
          : a
      ));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws.onAlert]);

  const clearNotifications = useCallback(() => setNotifications([]), []);

  if (!auth.user) {
    return (
      <div className="app">
        <div className="login-landing">
          <div className="login-landing-brand">VESTED</div>
          <p className="login-landing-tagline">Real-time trading dashboard</p>
          <LoginModal
            onLogin={auth.login}
            onClose={() => {}}
            inline
          />
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        connected={ws.connected}
        user={auth.user}
        notifications={notifications}
        onLoginClick={() => setShowLogin(true)}
        onLogout={auth.logout}
        onClearNotifications={clearNotifications}
      />
      <Dashboard
        sidebar={
          <TickerList
            ws={ws}
            selectedSymbol={selectedSymbol}
            onSelect={setSelectedSymbol}
            onAlertClick={handleAlertClick}
            activeAlerts={alerts}
          />
        }
      >
        <TickerInfoBar symbol={selectedSymbol} ws={ws} />
        <IntervalSelector
          interval={interval}
          chartType={chartType}
          onIntervalChange={setInterval}
          onChartTypeChange={setChartType}
        />
        <PriceChart
          symbol={selectedSymbol}
          interval={interval}
          chartType={chartType}
          ws={ws}
        />
      </Dashboard>

      {showLogin && (
        <LoginModal
          onLogin={auth.login}
          onClose={() => setShowLogin(false)}
        />
      )}

      {alertSymbol && (
        <AlertModal
          symbol={alertSymbol}
          currentPrice={pricesRef.current.get(alertSymbol) ?? 0}
          alerts={alerts}
          onSubmit={handleAlertSubmit}
          onDelete={handleAlertDelete}
          onClose={() => setAlertSymbol(null)}
        />
      )}
    </div>
  );
}

export default App;
