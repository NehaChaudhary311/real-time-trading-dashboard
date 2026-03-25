import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { ToastProvider, useToast } from '../context/ToastContext';

function TestConsumer() {
  const { toasts, addToast, removeToast } = useToast();
  return (
    <div>
      <button onClick={() => addToast('Hello', 'success')}>add-success</button>
      <button onClick={() => addToast('Oops', 'error')}>add-error</button>
      <button onClick={() => addToast('FYI')}>add-info</button>
      <span data-testid="count">{toasts.length}</span>
      {toasts.map((t) => (
        <div key={t.id} data-testid={`toast-${t.type}`}>
          <span>{t.message}</span>
          <button onClick={() => removeToast(t.id)}>remove-{t.id}</button>
        </div>
      ))}
    </div>
  );
}

function renderWithProvider() {
  return render(
    <ToastProvider>
      <TestConsumer />
    </ToastProvider>,
  );
}

describe('ToastContext', () => {
  it('should start with no toasts', () => {
    renderWithProvider();
    expect(screen.getByTestId('count').textContent).toBe('0');
  });

  it('should add a success toast', () => {
    renderWithProvider();

    act(() => { screen.getByText('add-success').click(); });

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByTestId('toast-success')).toBeInTheDocument();
  });

  it('should add an error toast', () => {
    renderWithProvider();

    act(() => { screen.getByText('add-error').click(); });

    expect(screen.getByText('Oops')).toBeInTheDocument();
    expect(screen.getByTestId('toast-error')).toBeInTheDocument();
  });

  it('should default to info type', () => {
    renderWithProvider();

    act(() => { screen.getByText('add-info').click(); });

    expect(screen.getByTestId('toast-info')).toBeInTheDocument();
    expect(screen.getByText('FYI')).toBeInTheDocument();
  });

  it('should remove a toast manually', () => {
    renderWithProvider();

    act(() => { screen.getByText('add-success').click(); });
    expect(screen.getByText('Hello')).toBeInTheDocument();

    const removeBtn = screen.getByText(/^remove-/);
    act(() => { removeBtn.click(); });

    expect(screen.queryByText('Hello')).not.toBeInTheDocument();
  });

  it('should auto-remove toast after 4 seconds', () => {
    vi.useFakeTimers();

    renderWithProvider();

    act(() => { screen.getByText('add-success').click(); });
    expect(screen.getByText('Hello')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.queryByText('Hello')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('should support multiple toasts at once', () => {
    renderWithProvider();

    act(() => { screen.getByText('add-success').click(); });
    act(() => { screen.getByText('add-error').click(); });

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Oops')).toBeInTheDocument();
    expect(screen.getByTestId('count').textContent).toBe('2');
  });

  it('should throw when useToast is used outside of ToastProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useToast must be used within ToastProvider');
    spy.mockRestore();
  });
});
