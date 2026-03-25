import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import AlertModal from '../components/AlertModal';
import type { Alert } from '../types';

const baseProps = {
  symbol: 'BTC/USDT',
  currentPrice: 87000,
  alerts: [] as Alert[],
  onSubmit: vi.fn(),
  onDelete: vi.fn(),
  onClose: vi.fn(),
};

function makeAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: 'alert-1',
    symbol: 'BTC/USDT',
    threshold: 90000,
    direction: 'above',
    frequency: 'every_time',
    triggered: false,
    triggerCount: 0,
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('AlertModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show the create screen when there are no existing alerts', () => {
    render(<AlertModal {...baseProps} />);

    expect(screen.getByText('Set alert')).toBeInTheDocument();
    expect(screen.getByText('BTC/USDT')).toBeInTheDocument();
    expect(screen.getByText(/Current:/)).toBeInTheDocument();
  });

  it('should render direction toggle buttons', () => {
    render(<AlertModal {...baseProps} />);

    expect(screen.getByText('Above')).toBeInTheDocument();
    expect(screen.getByText('Below')).toBeInTheDocument();
  });

  it('should render frequency toggle buttons', () => {
    render(<AlertModal {...baseProps} />);

    expect(screen.getByText('Every time')).toBeInTheDocument();
    expect(screen.getByText('Once')).toBeInTheDocument();
  });

  it('should have a disabled SET ALERT button when threshold is empty', () => {
    render(<AlertModal {...baseProps} />);

    const button = screen.getByText('SET ALERT');
    expect(button).toBeDisabled();
  });

  it('should call onSubmit with correct values', async () => {
    const user = userEvent.setup();
    render(<AlertModal {...baseProps} />);

    const input = screen.getByRole('spinbutton');
    await user.type(input, '95000');
    await user.click(screen.getByText('SET ALERT'));

    expect(baseProps.onSubmit).toHaveBeenCalledWith(95000, 'above', 'every_time');
  });

  it('should allow switching direction to Below', async () => {
    const user = userEvent.setup();
    render(<AlertModal {...baseProps} />);

    await user.click(screen.getByText('Below'));

    const input = screen.getByRole('spinbutton');
    await user.type(input, '80000');
    await user.click(screen.getByText('SET ALERT'));

    expect(baseProps.onSubmit).toHaveBeenCalledWith(80000, 'below', 'every_time');
  });

  it('should allow switching frequency to Once', async () => {
    const user = userEvent.setup();
    render(<AlertModal {...baseProps} />);

    await user.click(screen.getByText('Once'));

    const input = screen.getByRole('spinbutton');
    await user.type(input, '95000');
    await user.click(screen.getByText('SET ALERT'));

    expect(baseProps.onSubmit).toHaveBeenCalledWith(95000, 'above', 'once');
  });

  it('should not submit with invalid (non-numeric) threshold', async () => {
    render(<AlertModal {...baseProps} />);

    const button = screen.getByText('SET ALERT');
    expect(button).toBeDisabled();

    // Number inputs reject non-digits, so threshold stays empty and submit never runs
    expect(baseProps.onSubmit).not.toHaveBeenCalled();
  });

  it('should show manage screen when alerts exist for the symbol', () => {
    const alerts = [makeAlert()];
    render(<AlertModal {...baseProps} alerts={alerts} />);

    expect(screen.getByText('Manage alerts')).toBeInTheDocument();
    expect(screen.getByText('$90,000.00')).toBeInTheDocument();
    expect(screen.getByText('Every time')).toBeInTheDocument();
  });

  it('should show Add new alert button on manage screen', () => {
    const alerts = [makeAlert()];
    render(<AlertModal {...baseProps} alerts={alerts} />);

    expect(screen.getByText('Add new alert')).toBeInTheDocument();
  });

  it('should switch to create screen when Add new alert is clicked', async () => {
    const user = userEvent.setup();
    const alerts = [makeAlert()];
    render(<AlertModal {...baseProps} alerts={alerts} />);

    await user.click(screen.getByText('Add new alert'));
    expect(screen.getByText('Set alert')).toBeInTheDocument();
  });

  it('should call onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    const alerts = [makeAlert({ id: 'del-me' })];
    render(<AlertModal {...baseProps} alerts={alerts} />);

    const deleteBtn = screen.getByTitle('Delete alert');
    await user.click(deleteBtn);

    expect(baseProps.onDelete).toHaveBeenCalledWith('del-me');
  });

  it('should switch to edit screen when edit button is clicked', async () => {
    const user = userEvent.setup();
    const alerts = [makeAlert({ threshold: 95000 })];
    render(<AlertModal {...baseProps} alerts={alerts} />);

    await user.click(screen.getByTitle('Edit alert'));

    expect(screen.getByText('Edit alert')).toBeInTheDocument();
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveValue(95000);
  });

  it('should show Triggered badge for once-triggered alerts', () => {
    const alerts = [makeAlert({ frequency: 'once', triggered: true })];
    render(<AlertModal {...baseProps} alerts={alerts} />);

    expect(screen.getByText('Triggered')).toBeInTheDocument();
  });

  it('should show trigger count for every_time alerts', () => {
    const alerts = [makeAlert({ frequency: 'every_time', triggerCount: 3 })];
    render(<AlertModal {...baseProps} alerts={alerts} />);

    expect(screen.getByText('3x')).toBeInTheDocument();
  });

  it('should only show alerts matching the current symbol', () => {
    const alerts = [
      makeAlert({ symbol: 'BTC/USDT', threshold: 90000 }),
      makeAlert({ id: 'other', symbol: 'ETH/USDT', threshold: 3500 }),
    ];
    render(<AlertModal {...baseProps} alerts={alerts} />);

    expect(screen.getByText('$90,000.00')).toBeInTheDocument();
    expect(screen.queryByText('$3,500.00')).not.toBeInTheDocument();
  });

  it('should delete the old alert and submit the new one when editing', async () => {
    const user = userEvent.setup();
    const alerts = [makeAlert({ id: 'edit-me', threshold: 85000, direction: 'below', frequency: 'once' })];
    render(<AlertModal {...baseProps} alerts={alerts} />);

    await user.click(screen.getByTitle('Edit alert'));
    expect(screen.getByText('UPDATE ALERT')).toBeInTheDocument();

    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '92000');
    await user.click(screen.getByText('UPDATE ALERT'));

    expect(baseProps.onDelete).toHaveBeenCalledWith('edit-me');
    expect(baseProps.onSubmit).toHaveBeenCalledWith(92000, 'below', 'once');
  });

  it('should go back to manage screen when back is clicked and alerts exist', async () => {
    const user = userEvent.setup();
    const alerts = [makeAlert()];
    render(<AlertModal {...baseProps} alerts={alerts} />);

    await user.click(screen.getByText('Add new alert'));
    expect(screen.getByText('Set alert')).toBeInTheDocument();

    const backBtns = screen.getAllByRole('button').filter(
      (btn) => btn.classList.contains('alert-modal-back'),
    );
    await user.click(backBtns[0]);

    expect(screen.getByText('Manage alerts')).toBeInTheDocument();
  });

  it('should call onClose when back is clicked and no alerts exist', async () => {
    const user = userEvent.setup();
    render(<AlertModal {...baseProps} alerts={[]} />);

    expect(screen.getByText('Set alert')).toBeInTheDocument();

    const backBtns = screen.getAllByRole('button').filter(
      (btn) => btn.classList.contains('alert-modal-back'),
    );
    await user.click(backBtns[0]);

    expect(baseProps.onClose).toHaveBeenCalled();
  });

  it('should handle clicking the already-active Above direction', async () => {
    const user = userEvent.setup();
    render(<AlertModal {...baseProps} />);

    await user.click(screen.getByText('Above'));

    const input = screen.getByRole('spinbutton');
    await user.type(input, '95000');
    await user.click(screen.getByText('SET ALERT'));

    expect(baseProps.onSubmit).toHaveBeenCalledWith(95000, 'above', 'every_time');
  });

  it('should handle clicking the already-active Every time frequency', async () => {
    const user = userEvent.setup();
    render(<AlertModal {...baseProps} />);

    await user.click(screen.getByText('Every time'));

    const input = screen.getByRole('spinbutton');
    await user.type(input, '95000');
    await user.click(screen.getByText('SET ALERT'));

    expect(baseProps.onSubmit).toHaveBeenCalledWith(95000, 'above', 'every_time');
  });

  it('should format prices below 1000 with fixed 2 decimals', () => {
    render(<AlertModal {...baseProps} currentPrice={42.5} />);
    expect(screen.getByText(/Current: \$42\.50/)).toBeInTheDocument();
  });

  it('should call onClose when clicking the overlay', async () => {
    const user = userEvent.setup();
    const { container } = render(<AlertModal {...baseProps} />);

    await user.click(container.querySelector('.modal-overlay')!);
    expect(baseProps.onClose).toHaveBeenCalled();
  });
});
