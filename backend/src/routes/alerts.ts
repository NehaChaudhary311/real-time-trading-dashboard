import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import type { AlertService } from '../services/alertService.js';
import type { AlertDirection, AlertFrequency } from '../types/index.js';

export function createAlertRouter(alertService: AlertService): Router {
  const router = Router();

  router.use(requireAuth);

  router.get('/', (_req, res) => {
    res.json(alertService.list());
  });

  router.post('/', (req, res) => {
    const { symbol, threshold, direction, frequency } = req.body;

    if (!symbol || typeof threshold !== 'number' || !['above', 'below'].includes(direction)) {
      res.status(400).json({ error: 'Required: symbol (string), threshold (number), direction ("above"|"below")' });
      return;
    }

    const freq: AlertFrequency = frequency === 'every_time' ? 'every_time' : 'once';
    const alert = alertService.create(symbol, threshold, direction as AlertDirection, freq);
    res.status(201).json(alert);
  });

  router.delete('/:id', (req, res) => {
    const deleted = alertService.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }
    res.json({ ok: true });
  });

  return router;
}
