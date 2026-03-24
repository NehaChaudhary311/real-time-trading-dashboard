import type { TickerSnapshot } from '../types';

interface TickerCardProps {
  ticker: TickerSnapshot;
  selected: boolean;
  onClick: () => void;
  onAlertClick?: (symbol: string) => void;
  hasActiveAlert?: boolean;
}

function formatPrice(price: number): string {
  return price >= 1000
    ? price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : price.toFixed(2);
}

export default function TickerCard({ ticker, selected, onClick, onAlertClick, hasActiveAlert }: TickerCardProps) {
  const isPositive = ticker.changePercent >= 0;

  return (
    <div className={`ticker-card${selected ? ' selected' : ''}`}>
      <div className="ticker-card-main" onClick={onClick}>
        <div
          className="ticker-icon"
          style={{ background: ticker.iconColor }}
        >
          {ticker.symbol.charAt(0)}
        </div>

        <div className="ticker-info">
          <div className="ticker-symbol">{ticker.symbol}</div>
          <div className="ticker-name">{ticker.fullName}</div>
        </div>

        <div className="ticker-price-col">
          <div className="ticker-price">${formatPrice(ticker.price)}</div>
          <div className={`ticker-change ${isPositive ? 'positive' : 'negative'}`}>
            1D: {isPositive ? '+' : ''}{ticker.changePercent.toFixed(2)}%
          </div>
        </div>
      </div>

      {onAlertClick && (
        <button
          className={`ticker-alert-btn${hasActiveAlert ? ' has-alert' : ''}`}
          title="Set price alert"
          onClick={(e) => { e.stopPropagation(); onAlertClick(ticker.symbol); }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>
      )}
    </div>
  );
}
