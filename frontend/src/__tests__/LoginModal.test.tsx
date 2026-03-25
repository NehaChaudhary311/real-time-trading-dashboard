import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import LoginModal from '../components/LoginModal';

describe('LoginModal', () => {
  const onLogin = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render username and password fields', () => {
    render(<LoginModal onLogin={onLogin} onClose={onClose} />);

    expect(screen.getByPlaceholderText('admin')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('password')).toBeInTheDocument();
  });

  it('should render Sign In heading', () => {
    render(<LoginModal onLogin={onLogin} onClose={onClose} />);
    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('should call onLogin with username and password on submit', async () => {
    onLogin.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();

    render(<LoginModal onLogin={onLogin} onClose={onClose} />);

    await user.type(screen.getByPlaceholderText('admin'), 'admin');
    await user.type(screen.getByPlaceholderText('password'), 'secret');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(onLogin).toHaveBeenCalledWith('admin', 'secret');
    });
  });

  it('should call onClose after successful login', async () => {
    onLogin.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();

    render(<LoginModal onLogin={onLogin} onClose={onClose} />);

    await user.type(screen.getByPlaceholderText('admin'), 'admin');
    await user.type(screen.getByPlaceholderText('password'), 'pass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('should display error message on login failure', async () => {
    onLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
    const user = userEvent.setup();

    render(<LoginModal onLogin={onLogin} onClose={onClose} />);

    await user.type(screen.getByPlaceholderText('admin'), 'admin');
    await user.type(screen.getByPlaceholderText('password'), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('should show "Signing in..." while loading', async () => {
    let resolveLogin: () => void;
    onLogin.mockReturnValueOnce(new Promise<void>((r) => { resolveLogin = r; }));
    const user = userEvent.setup();

    render(<LoginModal onLogin={onLogin} onClose={onClose} />);

    await user.type(screen.getByPlaceholderText('admin'), 'a');
    await user.type(screen.getByPlaceholderText('password'), 'p');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText('Signing in...')).toBeInTheDocument();

    resolveLogin!();
    await waitFor(() => {
      expect(screen.queryByText('Signing in...')).not.toBeInTheDocument();
    });
  });

  it('should render inline when inline prop is true (no overlay)', () => {
    const { container } = render(<LoginModal onLogin={onLogin} onClose={onClose} inline />);
    expect(container.querySelector('.modal-overlay')).not.toBeInTheDocument();
    expect(container.querySelector('.modal')).toBeInTheDocument();
  });

  it('should render with overlay when inline is false', () => {
    const { container } = render(<LoginModal onLogin={onLogin} onClose={onClose} />);
    expect(container.querySelector('.modal-overlay')).toBeInTheDocument();
  });

  it('should call onClose when clicking the overlay', async () => {
    const user = userEvent.setup();
    const { container } = render(<LoginModal onLogin={onLogin} onClose={onClose} />);

    const overlay = container.querySelector('.modal-overlay')!;
    await user.click(overlay);

    expect(onClose).toHaveBeenCalled();
  });
});
