import { useState, useRef, useEffect } from 'react';
import type { AuthUser } from '../services/api';

interface HeaderProps {
  connected: boolean;
  user: AuthUser | null;
  onLoginClick: () => void;
  onLogout: () => void;
}

export default function Header({ connected, user, onLoginClick, onLogout }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  return (
    <header className="header">
      <div className="header-brand">VESTED</div>

      <div className="header-right">
        <div className="header-status">
          <span
            className="status-dot"
            style={connected ? undefined : { background: 'var(--negative)', animation: 'none' }}
          />
          {connected ? 'Online' : 'Offline'}
        </div>

        {/* Signal strength icon */}
        <div className="header-icon" title="Signal">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="11" width="3" height="4" rx="0.5" fill="currentColor" />
            <rect x="5" y="8" width="3" height="7" rx="0.5" fill="currentColor" />
            <rect x="9" y="5" width="3" height="10" rx="0.5" fill="currentColor" />
            <rect x="13" y="1" width="3" height="14" rx="0.5" fill="currentColor" opacity={connected ? 1 : 0.3} />
          </svg>
        </div>

        {/* Settings icon */}
        <div className="header-icon" title="Settings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </div>

        {/* Avatar + dropdown */}
        <div className="avatar-wrapper" ref={menuRef}>
          {user ? (
            <div
              className="header-avatar"
              onClick={() => setMenuOpen((o) => !o)}
              style={{ cursor: 'pointer' }}
            >
              {user.displayName.charAt(0).toUpperCase()}
            </div>
          ) : (
            <div
              className="header-avatar"
              title="Sign in"
              onClick={onLoginClick}
              style={{ cursor: 'pointer', opacity: 0.5 }}
            >
              ?
            </div>
          )}

          {menuOpen && user && (
            <div className="avatar-menu">
              <div className="avatar-menu-name">{user.displayName}</div>
              <div className="avatar-menu-username">@{user.username}</div>
              <div className="avatar-menu-divider" />
              <button
                className="avatar-menu-item"
                onClick={() => { onLogout(); setMenuOpen(false); }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
