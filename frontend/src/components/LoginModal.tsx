import { useState } from 'react';

interface LoginModalProps {
  onLogin: (username: string, password: string) => Promise<void>;
  onClose: () => void;
  inline?: boolean;
}

export default function LoginModal({ onLogin, onClose, inline }: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onLogin(username, password);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const form = (
    <div className="modal" onClick={(e) => e.stopPropagation()}>
      <h2 className="modal-title">Sign In</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Username</label>
          <input
            className="form-input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            autoFocus
          />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            className="form-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
          />
        </div>
        {error && <div className="form-error">{error}</div>}
        <button className="form-btn" type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );

  if (inline) return form;

  return (
    <div className="modal-overlay" onClick={onClose}>
      {form}
    </div>
  );
}
