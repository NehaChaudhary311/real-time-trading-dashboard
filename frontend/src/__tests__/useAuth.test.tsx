import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../services/api', () => ({
  login: vi.fn(),
  logout: vi.fn(),
}));

import { useAuth } from '../hooks/useAuth';
import { login as apiLogin, logout as apiLogout } from '../services/api';

const mockApiLogin = vi.mocked(apiLogin);
const mockApiLogout = vi.mocked(apiLogout);

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('useAuth', () => {
  it('should start with null user when localStorage is empty', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toBeNull();
  });

  it('should restore user from localStorage on mount', () => {
    const storedUser = { id: '1', username: 'admin', displayName: 'Neha' };
    localStorage.setItem('auth_user', JSON.stringify(storedUser));

    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toEqual(storedUser);
  });

  it('should handle corrupted localStorage gracefully', () => {
    localStorage.setItem('auth_user', 'not-valid-json');

    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toBeNull();
  });

  it('should call api login and store user on success', async () => {
    const user = { id: '1', username: 'admin', displayName: 'Neha' };
    mockApiLogin.mockResolvedValueOnce({ token: 'jwt', user });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('admin', 'admin');
    });

    expect(mockApiLogin).toHaveBeenCalledWith('admin', 'admin');
    expect(result.current.user).toEqual(user);
    expect(localStorage.getItem('auth_user')).toBe(JSON.stringify(user));
  });

  it('should propagate login errors', async () => {
    mockApiLogin.mockRejectedValueOnce(new Error('Invalid credentials'));

    const { result } = renderHook(() => useAuth());

    await expect(
      act(async () => {
        await result.current.login('admin', 'wrong');
      }),
    ).rejects.toThrow('Invalid credentials');

    expect(result.current.user).toBeNull();
  });

  it('should clear user and localStorage on logout', async () => {
    const user = { id: '1', username: 'admin', displayName: 'Neha' };
    localStorage.setItem('auth_user', JSON.stringify(user));
    mockApiLogout.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toEqual(user);

    await act(async () => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('auth_user')).toBeNull();
  });

  it('should still clear user even if api logout fails', async () => {
    const user = { id: '1', username: 'admin', displayName: 'Neha' };
    localStorage.setItem('auth_user', JSON.stringify(user));
    mockApiLogout.mockRejectedValueOnce(new Error('network error'));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('auth_user')).toBeNull();
  });
});
