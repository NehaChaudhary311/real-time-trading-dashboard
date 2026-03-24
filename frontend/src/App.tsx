import Header from './components/Header';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <div className="app">
      <Header connected={true} />
      <Dashboard
        sidebar={
          <>
            <div className="sidebar-header">
              <span className="sidebar-title">Watchlist</span>
            </div>
            <div className="sidebar-search">
              <input type="text" placeholder="Search Assets..." />
            </div>
            <div className="ticker-list">
              {/* TickerList will go here in step 10 */}
            </div>
          </>
        }
      >
        <div className="ticker-info-bar">
          <div className="info-bar-symbol">
            <span className="info-bar-symbol-text">BTC/USDT</span>
            <span className="info-bar-tag">Perpetual</span>
          </div>
          <span className="info-bar-price">$87,250.00</span>
          <div className="info-bar-stat">
            <span className="info-bar-label">24H Change</span>
            <span className="info-bar-value positive">+1.24%</span>
          </div>
          <div className="info-bar-stat">
            <span className="info-bar-label">24H High</span>
            <span className="info-bar-value">$88,100.00</span>
          </div>
          <div className="info-bar-stat">
            <span className="info-bar-label">24H Low</span>
            <span className="info-bar-value">$86,200.00</span>
          </div>
          <div className="info-bar-stat">
            <span className="info-bar-label">24H Volume</span>
            <span className="info-bar-value">$1.2B</span>
          </div>
        </div>

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
