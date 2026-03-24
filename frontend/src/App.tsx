import { useState } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import TickerList from './components/TickerList';
import TickerInfoBar from './components/TickerInfoBar';
import IntervalSelector from './components/IntervalSelector';
import PriceChart from './components/PriceChart';
import LoginModal from './components/LoginModal';
import { useWebSocket } from './hooks/useWebSocket';
import { useAuth } from './hooks/useAuth';
import type { Interval } from './types';
import type { ChartType } from './components/IntervalSelector';

function App() {
  const ws = useWebSocket();
  const auth = useAuth();
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USDT');
  const [interval, setInterval] = useState<Interval>('1h');
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div className="app">
      <Header
        connected={ws.connected}
        user={auth.user}
        onLoginClick={() => setShowLogin(true)}
        onLogout={auth.logout}
      />
      <Dashboard
        sidebar={
          <TickerList
            ws={ws}
            selectedSymbol={selectedSymbol}
            onSelect={setSelectedSymbol}
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
    </div>
  );
}

export default App;
