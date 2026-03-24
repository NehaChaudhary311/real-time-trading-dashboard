import { useState } from 'react';
import type { Alert, AlertDirection, AlertFrequency } from '../types';

interface AlertModalProps {
  symbol: string;
  currentPrice: number;
  alerts: Alert[];
  onSubmit: (threshold: number, direction: AlertDirection, frequency: AlertFrequency) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

type Screen = 'manage' | 'create';

function formatPrice(price: number): string {
  return price >= 1000
    ? price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : price.toFixed(2);
}

export default function AlertModal({ symbol, currentPrice, alerts, onSubmit, onDelete, onClose }: AlertModalProps) {
  const symbolAlerts = alerts.filter((a) => a.symbol === symbol);
  const [screen, setScreen] = useState<Screen>(symbolAlerts.length > 0 ? 'manage' : 'create');

  const [threshold, setThreshold] = useState('');
  const [direction, setDirection] = useState<AlertDirection>('above');
  const [frequency, setFrequency] = useState<AlertFrequency>('every_time');
  const [editingId, setEditingId] = useState<string | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setThreshold('');
    setDirection('above');
    setFrequency('every_time');
    setScreen('create');
  };

  const openEdit = (alert: Alert) => {
    setEditingId(alert.id);
    setThreshold(String(alert.threshold));
    setDirection(alert.direction);
    setFrequency(alert.frequency);
    setScreen('create');
  };

  const handleSubmit = () => {
    const val = parseFloat(threshold);
    if (isNaN(val) || val <= 0) return;
    if (editingId) {
      onDelete(editingId);
      setEditingId(null);
    }
    onSubmit(val, direction, frequency);
  };

  const handleBack = () => {
    if (symbolAlerts.length > 0) {
      setEditingId(null);
      setScreen('manage');
    } else {
      onClose();
    }
  };

  const priceDisplay = formatPrice(currentPrice);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="alert-modal" onClick={(e) => e.stopPropagation()}>

        {screen === 'manage' ? (
          <>
            <div className="alert-modal-header">
              <button className="alert-modal-back" onClick={onClose}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
              </button>
              <span className="alert-modal-title">Manage alerts</span>
            </div>

            <div className="alert-modal-divider" />

            <div className="alert-modal-body">
              {symbolAlerts.length === 0 ? (
                <div className="alert-manage-empty">No active alerts for {symbol}</div>
              ) : (
                <div className="alert-manage-list">
                  {symbolAlerts.map((a) => (
                    <div key={a.id} className={`alert-manage-item${a.triggered && a.frequency === 'once' ? ' triggered' : ''}`}>
                      <div className="alert-manage-item-info">
                        <span className="alert-manage-item-dir">
                          {a.direction === 'above' ? '\u2191' : '\u2193'}
                        </span>
                        <span className="alert-manage-item-price">
                          ${formatPrice(a.threshold)}
                        </span>
                        <span className="alert-manage-item-freq">
                          {a.frequency === 'every_time' ? 'Every time' : 'Once'}
                        </span>
                      </div>
                      <div className="alert-manage-item-actions">
                        {a.triggered && a.frequency === 'once' && (
                          <span className="alert-manage-item-badge">Triggered</span>
                        )}
                        {a.frequency === 'every_time' && a.triggerCount > 0 && (
                          <span className="alert-manage-item-count">{a.triggerCount}x</span>
                        )}
                        <button
                          className="alert-manage-edit"
                          onClick={() => openEdit(a)}
                          title="Edit alert"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          className="alert-manage-delete"
                          onClick={() => onDelete(a.id)}
                          title="Delete alert"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="alert-modal-footer">
              <button className="alert-modal-submit" onClick={openCreate}>
                Add new alert
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="alert-modal-header">
              <button className="alert-modal-back" onClick={handleBack}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
              </button>
              <span className="alert-modal-title">{editingId ? 'Edit alert' : 'Set alert'}</span>
            </div>

            <div className="alert-modal-divider" />

            <div className="alert-modal-body">
              <div className="alert-modal-symbol">{symbol}</div>
              <div className="alert-modal-current">Current: ${priceDisplay}</div>

              <div className="alert-modal-field">
                <label className="alert-modal-label">Direction</label>
                <div className="alert-modal-toggle-group">
                  <button
                    className={`alert-modal-toggle${direction === 'above' ? ' active' : ''}`}
                    onClick={() => setDirection('above')}
                  >
                    Above
                  </button>
                  <button
                    className={`alert-modal-toggle${direction === 'below' ? ' active' : ''}`}
                    onClick={() => setDirection('below')}
                  >
                    Below
                  </button>
                </div>
              </div>

              <div className="alert-modal-field">
                <label className="alert-modal-label">Target price</label>
                <input
                  className="alert-modal-input"
                  type="number"
                  placeholder={priceDisplay}
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  autoFocus
                />
              </div>

              <div className="alert-modal-field">
                <label className="alert-modal-label">Notify me</label>
                <div className="alert-modal-toggle-group">
                  <button
                    className={`alert-modal-toggle${frequency === 'every_time' ? ' active' : ''}`}
                    onClick={() => setFrequency('every_time')}
                  >
                    Every time
                  </button>
                  <button
                    className={`alert-modal-toggle${frequency === 'once' ? ' active' : ''}`}
                    onClick={() => setFrequency('once')}
                  >
                    Once
                  </button>
                </div>
              </div>
            </div>

            <div className="alert-modal-footer">
              <button
                className="alert-modal-submit"
                disabled={!threshold || isNaN(parseFloat(threshold))}
                onClick={handleSubmit}
              >
                {editingId ? 'UPDATE ALERT' : 'SET ALERT'}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
