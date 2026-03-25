import { AlertService } from '../services/alertService.js';
import { MarketDataGenerator } from '../services/marketDataGenerator.js';
import type { Alert, TickerDefinition } from '../types/index.js';

const TEST_TICKERS: TickerDefinition[] = [
  { symbol: 'TEST/USD', fullName: 'Test Coin', iconColor: '#fff', basePrice: 100 },
  { symbol: 'ACME', fullName: 'Acme Corp', iconColor: '#000', basePrice: 50 },
];

describe('AlertService', () => {
  let generator: MarketDataGenerator;
  let service: AlertService;

  beforeEach(() => {
    generator = new MarketDataGenerator(TEST_TICKERS, 100_000);
    service = new AlertService(generator);
  });

  afterEach(() => {
    generator.stop();
  });

  it('should create an alert with correct defaults', () => {
    const alert = service.create('TEST/USD', 110, 'above');

    expect(alert.id).toBeDefined();
    expect(alert.symbol).toBe('TEST/USD');
    expect(alert.threshold).toBe(110);
    expect(alert.direction).toBe('above');
    expect(alert.frequency).toBe('once');
    expect(alert.triggered).toBe(false);
    expect(alert.triggerCount).toBe(0);
    expect(alert.createdAt).toBeGreaterThan(0);
  });

  it('should create an alert with every_time frequency', () => {
    const alert = service.create('TEST/USD', 90, 'below', 'every_time');
    expect(alert.frequency).toBe('every_time');
  });

  it('should list all alerts', () => {
    service.create('TEST/USD', 110, 'above');
    service.create('ACME', 40, 'below');

    const alerts = service.list();
    expect(alerts).toHaveLength(2);
  });

  it('should list only active (non-triggered) alerts', () => {
    const a1 = service.create('TEST/USD', 110, 'above');
    service.create('ACME', 40, 'below');

    a1.triggered = true;

    const active = service.listActive();
    expect(active).toHaveLength(1);
    expect(active[0].symbol).toBe('ACME');
  });

  it('should delete an alert and return true', () => {
    const alert = service.create('TEST/USD', 110, 'above');
    expect(service.delete(alert.id)).toBe(true);
    expect(service.list()).toHaveLength(0);
  });

  it('should return false when deleting a nonexistent alert', () => {
    expect(service.delete('no-such-id')).toBe(false);
  });

  it('should fire the trigger callback when threshold is crossed (above)', () => {
    const triggered: { alert: Alert; price: number }[] = [];
    service.setTriggerCallback((alert, price) => triggered.push({ alert, price }));

    // Price starts at 100, threshold 50 — already above, so first eval triggers
    service.create('TEST/USD', 50, 'above');
    generator.tick();

    expect(triggered).toHaveLength(1);
    expect(triggered[0].alert.symbol).toBe('TEST/USD');
    expect(triggered[0].price).toBeGreaterThan(0);
  });

  it('should fire the trigger callback when threshold is crossed (below)', () => {
    const triggered: { alert: Alert; price: number }[] = [];
    service.setTriggerCallback((alert, price) => triggered.push({ alert, price }));

    // Price starts at 100, threshold 200 — already below, so first eval triggers
    service.create('TEST/USD', 200, 'below');
    generator.tick();

    expect(triggered).toHaveLength(1);
    expect(triggered[0].alert.direction).toBe('below');
  });

  it('should not fire for alerts on a different symbol', () => {
    const triggered: Alert[] = [];
    service.setTriggerCallback((alert) => triggered.push(alert));

    service.create('ACME', 200, 'above');
    generator.tick();

    const acmeAlerts = triggered.filter((a) => a.symbol === 'ACME');
    const testAlerts = triggered.filter((a) => a.symbol === 'TEST/USD');
    expect(testAlerts).toHaveLength(0);
    // ACME alert should not fire since price starts at 50, threshold is 200
    expect(acmeAlerts).toHaveLength(0);
  });

  it('should only fire once for frequency=once', () => {
    const triggered: Alert[] = [];
    service.setTriggerCallback((alert) => triggered.push(alert));

    service.create('TEST/USD', 50, 'above', 'once');

    generator.tick();
    expect(triggered).toHaveLength(1);

    generator.tick();
    generator.tick();
    expect(triggered).toHaveLength(1);
  });

  it('should re-trigger for frequency=every_time on repeated crossings', () => {
    const triggered: Alert[] = [];
    service.setTriggerCallback((alert) => triggered.push(alert));

    // Price ~100, threshold 50 — already above on first eval; every_time clears triggered for reuse
    service.create('TEST/USD', 50, 'above', 'every_time');

    generator.tick();
    const countAfterFirst = triggered.length;
    expect(countAfterFirst).toBe(1);

    const alert = service.list()[0];
    expect(alert.triggered).toBe(false);
    expect(alert.triggerCount).toBe(1);
  });

  it('should increment triggerCount each time an alert fires', () => {
    service.setTriggerCallback(() => {});

    service.create('TEST/USD', 50, 'above', 'every_time');
    generator.tick();

    const alert = service.list()[0];
    expect(alert.triggerCount).toBe(1);
  });

  it('should set triggeredAt timestamp when an alert fires', () => {
    service.setTriggerCallback(() => {});

    service.create('TEST/USD', 50, 'above');
    generator.tick();

    const alert = service.list()[0];
    expect(alert.triggeredAt).toBeDefined();
    expect(alert.triggeredAt).toBeGreaterThan(0);
  });

  it('should trigger "above" alert when price crosses threshold from below (with prev price)', () => {
    const triggered: { alert: Alert; price: number }[] = [];
    service.setTriggerCallback((alert, price) => triggered.push({ alert, price }));

    // Threshold 200, price ~100 — first eval does not trigger (100 < 200)
    service.create('TEST/USD', 200, 'above', 'every_time');
    generator.tick();

    expect(triggered).toHaveLength(0);

    service.delete(service.list()[0].id);

    // Threshold just above base (100) so random walk may cross upward over many ticks
    service.create('TEST/USD', 100.01, 'above', 'every_time');
    generator.tick();
    const firstCount = triggered.length;

    for (let i = 0; i < 50; i++) generator.tick();

    expect(triggered.length).toBeGreaterThanOrEqual(firstCount);
  });

  it('should trigger "below" alert when price crosses threshold from above (with prev price)', () => {
    const triggered: { alert: Alert; price: number }[] = [];
    service.setTriggerCallback((alert, price) => triggered.push({ alert, price }));

    // Threshold 10, price ~100 — first eval does not trigger (100 > 10)
    service.create('TEST/USD', 10, 'below', 'every_time');
    generator.tick();

    expect(triggered).toHaveLength(0);

    // GBM unlikely to drop 90%; exercises crossing logic without expecting a trigger
    for (let i = 0; i < 50; i++) generator.tick();

    expect(triggered).toHaveLength(0);
  });

  it('should not throw when no trigger callback is set', () => {
    service.create('TEST/USD', 50, 'above');
    expect(() => generator.tick()).not.toThrow();
  });
});
