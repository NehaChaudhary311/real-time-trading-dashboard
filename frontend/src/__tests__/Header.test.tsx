import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Header from '../components/Header';
import type { Notification } from '../components/Header';

const baseProps = {
  connected: true,
  user: { id: '1', username: 'admin', displayName: 'Neha Chaudhary' },
  notifications: [] as Notification[],
  onLogout: vi.fn(),
  onClearNotifications: vi.fn(),
};

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render brand name', () => {
    render(<Header {...baseProps} />);
    expect(screen.getByText('VESTED')).toBeInTheDocument();
  });

  it('should show "Online" when connected', () => {
    render(<Header {...baseProps} connected={true} />);
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('should show "Offline" when disconnected', () => {
    render(<Header {...baseProps} connected={false} />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('should show user initial when logged in', () => {
    render(<Header {...baseProps} />);
    expect(screen.getByText('N')).toBeInTheDocument();
  });

  it('should open user menu when avatar is clicked', async () => {
    const user = userEvent.setup();
    render(<Header {...baseProps} />);

    await user.click(screen.getByText('N'));

    expect(screen.getByText('Neha Chaudhary')).toBeInTheDocument();
    expect(screen.getByText('@admin')).toBeInTheDocument();
    expect(screen.getByText('Sign out')).toBeInTheDocument();
  });

  it('should call onLogout when Sign out is clicked', async () => {
    const user = userEvent.setup();
    render(<Header {...baseProps} />);

    await user.click(screen.getByText('N'));
    await user.click(screen.getByText('Sign out'));

    expect(baseProps.onLogout).toHaveBeenCalled();
  });

  it('should not show badge when there are no notifications', () => {
    const { container } = render(<Header {...baseProps} notifications={[]} />);
    expect(container.querySelector('.bell-badge')).not.toBeInTheDocument();
  });

  it('should show notification count badge', () => {
    const notifications: Notification[] = [
      { id: '1', text: 'BTC alert', time: Date.now() },
      { id: '2', text: 'ETH alert', time: Date.now() },
    ];
    render(<Header {...baseProps} notifications={notifications} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should show "9+" for more than 9 notifications', () => {
    const notifications: Notification[] = Array.from({ length: 12 }, (_, i) => ({
      id: String(i),
      text: `Alert ${i}`,
      time: Date.now(),
    }));
    render(<Header {...baseProps} notifications={notifications} />);
    expect(screen.getByText('9+')).toBeInTheDocument();
  });

  it('should open notification dropdown when bell is clicked', async () => {
    const user = userEvent.setup();
    const notifications: Notification[] = [
      { id: '1', text: 'BTC rose above $90,000', time: Date.now() },
    ];
    render(<Header {...baseProps} notifications={notifications} />);

    await user.click(screen.getByTitle('Notifications'));

    expect(screen.getByText('BTC rose above $90,000')).toBeInTheDocument();
    expect(screen.getByText('Clear all')).toBeInTheDocument();
  });

  it('should show "No notifications" when bell is opened with empty list', async () => {
    const user = userEvent.setup();
    render(<Header {...baseProps} notifications={[]} />);

    await user.click(screen.getByTitle('Notifications'));
    expect(screen.getByText('No notifications')).toBeInTheDocument();
  });

  it('should call onClearNotifications when Clear all is clicked', async () => {
    const user = userEvent.setup();
    const notifications: Notification[] = [
      { id: '1', text: 'alert', time: Date.now() },
    ];
    render(<Header {...baseProps} notifications={notifications} />);

    await user.click(screen.getByTitle('Notifications'));
    await user.click(screen.getByText('Clear all'));

    expect(baseProps.onClearNotifications).toHaveBeenCalled();
  });
});
