import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import TickerCard from '../components/TickerCard';
import type { TickerSnapshot } from '../types';

const ticker: TickerSnapshot = {
  symbol: 'BTC/USDT',
  fullName: 'Bitcoin',
  iconColor: '#f7931a',
  price: 87250.42,
  change: 123.5,
  changePercent: 0.14,
  high24h: 87464.46,
  low24h: 87159.96,
  volume24h: 1580000,
  timestamp: Date.now(),
};

describe('TickerCard', () => {
  const onClick = vi.fn();
  const onAlertClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render symbol and full name', () => {
    render(<TickerCard ticker={ticker} selected={false} onClick={onClick} />);

    expect(screen.getByText('BTC/USDT')).toBeInTheDocument();
    expect(screen.getByText('Bitcoin')).toBeInTheDocument();
  });

  it('should display formatted price', () => {
    render(<TickerCard ticker={ticker} selected={false} onClick={onClick} />);
    expect(screen.getByText('$87,250.42')).toBeInTheDocument();
  });

  it('should show positive change with + prefix', () => {
    render(<TickerCard ticker={ticker} selected={false} onClick={onClick} />);
    expect(screen.getByText(/\+0\.14%/)).toBeInTheDocument();
  });

  it('should show negative change without + prefix', () => {
    const negativeTicker = { ...ticker, changePercent: -1.23 };
    render(<TickerCard ticker={negativeTicker} selected={false} onClick={onClick} />);
    expect(screen.getByText(/-1\.23%/)).toBeInTheDocument();
  });

  it('should apply positive class for positive change', () => {
    const { container } = render(<TickerCard ticker={ticker} selected={false} onClick={onClick} />);
    expect(container.querySelector('.positive')).toBeInTheDocument();
  });

  it('should apply negative class for negative change', () => {
    const negativeTicker = { ...ticker, changePercent: -1.23 };
    const { container } = render(<TickerCard ticker={negativeTicker} selected={false} onClick={onClick} />);
    expect(container.querySelector('.negative')).toBeInTheDocument();
  });

  it('should show first character of symbol in icon', () => {
    render(<TickerCard ticker={ticker} selected={false} onClick={onClick} />);
    const icon = screen.getByText('B');
    expect(icon).toBeInTheDocument();
  });

  it('should apply selected class when selected', () => {
    const { container } = render(<TickerCard ticker={ticker} selected={true} onClick={onClick} />);
    expect(container.querySelector('.ticker-card.selected')).toBeInTheDocument();
  });

  it('should not apply selected class when not selected', () => {
    const { container } = render(<TickerCard ticker={ticker} selected={false} onClick={onClick} />);
    expect(container.querySelector('.ticker-card.selected')).not.toBeInTheDocument();
  });

  it('should call onClick when the card is clicked', async () => {
    const user = userEvent.setup();
    render(<TickerCard ticker={ticker} selected={false} onClick={onClick} />);

    await user.click(screen.getByText('BTC/USDT'));
    expect(onClick).toHaveBeenCalled();
  });

  it('should render alert button when onAlertClick is provided', () => {
    render(<TickerCard ticker={ticker} selected={false} onClick={onClick} onAlertClick={onAlertClick} />);
    expect(screen.getByTitle('Set price alert')).toBeInTheDocument();
  });

  it('should not render alert button when onAlertClick is not provided', () => {
    render(<TickerCard ticker={ticker} selected={false} onClick={onClick} />);
    expect(screen.queryByTitle('Set price alert')).not.toBeInTheDocument();
  });

  it('should call onAlertClick with the symbol when alert button is clicked', async () => {
    const user = userEvent.setup();
    render(<TickerCard ticker={ticker} selected={false} onClick={onClick} onAlertClick={onAlertClick} />);

    await user.click(screen.getByTitle('Set price alert'));
    expect(onAlertClick).toHaveBeenCalledWith('BTC/USDT');
    // Alert control stops propagation — card onClick must not run
    expect(onClick).not.toHaveBeenCalled();
  });

  it('should apply has-alert class when hasActiveAlert is true', () => {
    const { container } = render(
      <TickerCard ticker={ticker} selected={false} onClick={onClick} onAlertClick={onAlertClick} hasActiveAlert />,
    );
    expect(container.querySelector('.has-alert')).toBeInTheDocument();
  });

  it('should format prices under 1000 with fixed decimals', () => {
    const cheapTicker = { ...ticker, symbol: 'AAPL', price: 232.5 };
    render(<TickerCard ticker={cheapTicker} selected={false} onClick={onClick} />);
    expect(screen.getByText('$232.50')).toBeInTheDocument();
  });
});
