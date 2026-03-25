import { vi, describe, it, expect, beforeEach } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

// Must import after stubbing fetch
const api = await import('../services/api');

beforeEach(() => {
  fetchMock.mockReset();
});

describe('login', () => {
  it('should POST hashed password and return token + user', async () => {
    const mockResponse = {
      token: 'jwt-token',
      user: { id: '1', username: 'admin', displayName: 'Neha' },
    };
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await api.login('admin', 'admin');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/auth/login');
    expect(options.method).toBe('POST');
    expect(options.credentials).toBe('include');

    const body = JSON.parse(options.body);
    expect(body.username).toBe('admin');
    // Password should be SHA-256 hashed, not plaintext
    expect(body.password).not.toBe('admin');
    expect(body.password).toHaveLength(64); // SHA-256 hex is 64 chars

    expect(result).toEqual(mockResponse);
  });

  it('should throw on non-ok response', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Invalid credentials' }),
    });

    await expect(api.login('admin', 'wrong')).rejects.toThrow('Invalid credentials');
  });

  it('should throw generic message when error body is not JSON', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.reject(new Error('not json')),
    });

    await expect(api.login('admin', 'wrong')).rejects.toThrow('Login failed');
  });
});

describe('logout', () => {
  it('should POST to /api/auth/logout with credentials', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });

    await api.logout();

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/auth/logout');
    expect(options.method).toBe('POST');
    expect(options.credentials).toBe('include');
  });
});

describe('fetchTickers', () => {
  it('should GET /api/tickers and return the array', async () => {
    const tickers = [{ symbol: 'BTC/USDT', price: 87000 }];
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(tickers),
    });

    const result = await api.fetchTickers();
    expect(result).toEqual(tickers);

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/tickers');
  });

  it('should throw on API error', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(api.fetchTickers()).rejects.toThrow('API error 500');
  });
});

describe('fetchHistory', () => {
  it('should GET /api/tickers/:symbol/history with interval', async () => {
    const candles = [{ time: 1000, open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 }];
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ symbol: 'BTC/USDT', interval: '1h', count: 1, candles }),
    });

    const result = await api.fetchHistory('BTC/USDT', '1h');
    expect(result).toEqual(candles);

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain(encodeURIComponent('BTC/USDT'));
    expect(url).toContain('interval=1h');
  });

  it('should include days param when provided', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ candles: [] }),
    });

    await api.fetchHistory('AAPL', '1d', 7);

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('days=7');
  });
});

describe('fetchAlerts', () => {
  it('should GET /api/alerts with credentials', async () => {
    const alerts = [{ id: '1', symbol: 'BTC/USDT', threshold: 90000 }];
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(alerts),
    });

    const result = await api.fetchAlerts();
    expect(result).toEqual(alerts);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/alerts');
    expect(options.credentials).toBe('include');
  });

  it('should throw on failure', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401 });
    await expect(api.fetchAlerts()).rejects.toThrow('Failed to fetch alerts');
  });
});

describe('createAlert', () => {
  it('should POST to /api/alerts with alert payload', async () => {
    const alert = { id: '1', symbol: 'BTC/USDT', threshold: 90000, direction: 'above', frequency: 'once' };
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(alert),
    });

    const result = await api.createAlert('BTC/USDT', 90000, 'above', 'once');
    expect(result).toEqual(alert);

    const [, options] = fetchMock.mock.calls[0];
    expect(options.method).toBe('POST');
    const body = JSON.parse(options.body);
    expect(body).toEqual({ symbol: 'BTC/USDT', threshold: 90000, direction: 'above', frequency: 'once' });
  });

  it('should throw on failure', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 400 });
    await expect(api.createAlert('BTC/USDT', 90000, 'above')).rejects.toThrow('Failed to create alert');
  });
});

describe('deleteAlert', () => {
  it('should DELETE /api/alerts/:id', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });

    await api.deleteAlert('alert-123');

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/alerts/alert-123');
    expect(options.method).toBe('DELETE');
    expect(options.credentials).toBe('include');
  });

  it('should throw on failure', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 });
    await expect(api.deleteAlert('nope')).rejects.toThrow('Failed to delete alert');
  });
});
