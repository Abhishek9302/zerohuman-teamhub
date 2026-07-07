import { teamHubData } from '@/src/data';

export function NotificationsPanel() {
  return (
    <section className="panel section-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Notifications</p>
          <h3>Assignments, mentions, and due dates</h3>
        </div>
        <button className="ghost-button" type="button">Mark all read</button>
      </div>

      <div className="notification-list">
        {teamHubData.notifications.map((notification) => (
          <article className={`notification-card ${notification.read ? '' : 'unread'}`} key={notification.id}>
            <strong>{notification.message}</strong>
            <p>{notification.type.replace('_', ' ')}</p>
            <small>{notification.time}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
