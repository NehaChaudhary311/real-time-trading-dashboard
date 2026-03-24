import { useState, useRef, useEffect } from 'react';
import type { AuthUser } from '../services/api';

export interface Notification {
  id: string;
  text: string;
  time: number;
}

interface HeaderProps {
  connected: boolean;
  user: AuthUser | null;
  notifications: Notification[];
  onLoginClick: () => void;
  onLogout: () => void;
  onClearNotifications: () => void;
}

export default function Header({ connected, user, notifications, onLoginClick, onLogout, onClearNotifications }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const unread = notifications.length;

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

        {/* Bell / Notifications */}
        <div className="bell-wrapper" ref={bellRef}>
          <div
            className="header-icon"
            title="Notifications"
            onClick={() => setBellOpen((o) => !o)}
            style={{ cursor: 'pointer', position: 'relative' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unread > 0 && <span className="bell-badge">{unread > 9 ? '9+' : unread}</span>}
          </div>

          {bellOpen && (
            <div className="bell-menu">
              <div className="bell-menu-header">
                <span>Notifications</span>
                {unread > 0 && (
                  <button className="bell-clear-btn" onClick={onClearNotifications}>Clear all</button>
                )}
              </div>
              <div className="bell-menu-list">
                {notifications.length === 0 ? (
                  <div className="bell-menu-empty">No notifications</div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="bell-menu-item">
                      <div className="bell-menu-item-text">{n.text}</div>
                      <div className="bell-menu-item-time">
                        {new Date(n.time).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
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
