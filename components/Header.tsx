'use client';
import { Bell, MoonStar, Sun, Plus, Sparkles, Settings } from 'lucide-react';
import { useApp } from '@/src/context';

export function Header() {
  const { currentUser, toggleDarkMode, darkMode, setNewTaskOpen, setActiveView, notifications, activeView } = useApp();
  const unread = notifications.filter(n => !n.read).length;

  return (
    <header className="header panel">
      <div>
        <p className="eyebrow">Welcome back</p>
        <h2>{currentUser.name}</h2>
        <p className="muted">Ship work across projects, tasks, and comments from one workspace.</p>
      </div>

      <div className="header__actions">
        <button
          className="ghost-button"
          type="button"
          onClick={toggleDarkMode}
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? <Sun size={16} /> : <MoonStar size={16} />}
          {darkMode ? 'Light' : 'Dark'}
        </button>
        <button
          className={`ghost-button ${activeView === 'notifications' ? 'active' : ''}`}
          type="button"
          onClick={() => setActiveView('notifications')}
          style={{ position: 'relative' }}
        >
          <Bell size={16} />
          Alerts
          {unread > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4, background: '#ef4444',
              color: '#fff', borderRadius: '50%', width: 16, height: 16,
              fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700
            }}>{unread}</span>
          )}
        </button>
        <button
          className="primary-button"
          type="button"
          onClick={() => setNewTaskOpen(true)}
        >
          <Plus size={16} /> New task
        </button>
        <button
          type="button"
          className="user-pill"
          onClick={() => setActiveView('settings')}
          title="Settings"
          style={{ cursor: 'pointer', border: 'none', background: 'none' }}
        >
          <Sparkles size={16} />
          <span>{currentUser.avatar}</span>
        </button>
      </div>
    </header>
  );
}
