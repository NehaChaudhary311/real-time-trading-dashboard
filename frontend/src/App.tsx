import { useState } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import TickerList from './components/TickerList';
import TickerInfoBar from './components/TickerInfoBar';
import { useWebSocket } from './hooks/useWebSocket';

function App() {
  const ws = useWebSocket();
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USDT');

  return (
    <div className="app">
      <Header connected={ws.connected} />
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

        <div className="interval-bar">
          {['1M', '5M', '15M', '1H', '4H', '1D'].map((label, i) => (
            <button
              key={label}
              className={`interval-btn${i === 3 ? ' active' : ''}`}
            >
              {label}
            </button>
          ))}
          <div className="interval-separator" />
          <button className="chart-type-btn active" title="Candlestick">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="3" y="2" width="2" height="12" rx="0.5" />
              <rect x="7" y="5" width="2" height="8" rx="0.5" />
              <rect x="11" y="1" width="2" height="10" rx="0.5" />
            </svg>
          </button>
          <button className="chart-type-btn" title="Area">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="1,12 4,8 8,10 12,4 15,6" />
            </svg>
          </button>
        </div>

        <div className="chart-container">
          {/* PriceChart will go here in step 13 */}
        </div>
      </Dashboard>
    </div>
  );
}

export default App;
