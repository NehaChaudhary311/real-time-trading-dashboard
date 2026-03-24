import { randomUUID } from 'crypto';
import type { Alert, AlertDirection, AlertFrequency, PriceTick } from '../types/index.js';
import type { MarketDataGenerator } from './marketDataGenerator.js';

export class AlertService {
  private alerts: Map<string, Alert> = new Map();
  private onTrigger: ((alert: Alert, price: number) => void) | null = null;
  /** Last evaluated price per alert ID — undefined means the alert hasn't been evaluated yet */
  private lastSeen: Map<string, number> = new Map();

  constructor(generator: MarketDataGenerator) {
    generator.on('tick', (tick: PriceTick) => this.evaluate(tick));
  }

  setTriggerCallback(cb: (alert: Alert, price: number) => void): void {
    this.onTrigger = cb;
  }

  create(symbol: string, threshold: number, direction: AlertDirection, frequency: AlertFrequency = 'once'): Alert {
    const alert: Alert = {
      id: randomUUID(),
      symbol,
      threshold,
      direction,
      frequency,
      triggered: false,
      triggerCount: 0,
      createdAt: Date.now(),
    };
    this.alerts.set(alert.id, alert);
    return alert;
  }

  list(): Alert[] {
    return Array.from(this.alerts.values());
  }

  listActive(): Alert[] {
    return this.list().filter((a) => !a.triggered);
  }

  delete(id: string): boolean {
    this.lastSeen.delete(id);
    return this.alerts.delete(id);
  }

  private evaluate(tick: PriceTick): void {
    for (const alert of this.alerts.values()) {
      if (alert.symbol !== tick.symbol) continue;
      if (alert.frequency === 'once' && alert.triggered) continue;

      const prev = this.lastSeen.get(alert.id);
      this.lastSeen.set(alert.id, tick.price);

      const crossed = this.hasCrossed(alert, prev, tick.price);

      if (crossed) {
        alert.triggered = true;
        alert.triggerCount += 1;
        alert.triggeredAt = Date.now();
        this.onTrigger?.(alert, tick.price);

        if (alert.frequency === 'every_time') {
          alert.triggered = false;
        }
      }
    }
  }

  private hasCrossed(alert: Alert, prevPrice: number | undefined, currentPrice: number): boolean {
    if (alert.direction === 'above') {
      if (prevPrice === undefined) return currentPrice > alert.threshold;
      return prevPrice <= alert.threshold && currentPrice > alert.threshold;
    } else {
      if (prevPrice === undefined) return currentPrice < alert.threshold;
      return prevPrice >= alert.threshold && currentPrice < alert.threshold;
    }
  }
}
