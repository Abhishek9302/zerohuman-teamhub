'use client';
import { useApp } from '@/src/context';

const TYPE_ICONS: Record<string, string> = {
  assignment: '📋',
  comment: '💬',
  due_date: '📅',
  invite: '✉️'
};

export function NotificationsPanel() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useApp();

  return (
    <section className="panel section-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Notifications</p>
          <h3>Assignments, mentions, and due dates</h3>
        </div>
        <button className="ghost-button" type="button" onClick={markAllNotificationsRead}>
          Mark all read
        </button>
      </div>

      <div className="notification-list">
        {notifications.length === 0 && <p className="muted" style={{ padding: 16 }}>All caught up!</p>}
        {notifications.map((notification) => (
          <article
            className={`notification-card ${notification.read ? '' : 'unread'}`}
            key={notification.id}
            style={{ cursor: notification.read ? 'default' : 'pointer' }}
            onClick={() => !notification.read && markNotificationRead(notification.id)}
            title={notification.read ? '' : 'Click to mark as read'}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 16 }}>{TYPE_ICONS[notification.type] ?? '🔔'}</span>
              <div style={{ flex: 1 }}>
                <strong>{notification.message}</strong>
                <p>{notification.type.replace('_', ' ')}</p>
                <small>{notification.time}</small>
              </div>
              {!notification.read && (
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed', flexShrink: 0, marginTop: 4 }} />
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
