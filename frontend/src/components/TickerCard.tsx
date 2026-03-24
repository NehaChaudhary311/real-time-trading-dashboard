import type { TickerSnapshot } from '../types';

interface TickerCardProps {
  ticker: TickerSnapshot;
  selected: boolean;
  onClick: () => void;
}

function formatPrice(price: number): string {
  return price >= 1000
    ? price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : price.toFixed(2);
}

export default function TickerCard({ ticker, selected, onClick }: TickerCardProps) {
  const isPositive = ticker.changePercent >= 0;

  return (
    <div
      className={`ticker-card${selected ? ' selected' : ''}`}
      onClick={onClick}
    >
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
  );
}
