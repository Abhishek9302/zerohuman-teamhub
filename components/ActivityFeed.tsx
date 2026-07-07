import { getActivityFeed } from '@/src/lib';

export function ActivityFeed() {
  const items = getActivityFeed().slice(0, 6);

  return (
    <section className="panel section-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Activity feed</p>
          <h3>Recent project changes</h3>
        </div>
      </div>

      <div className="activity-list">
        {items.map((item) => (
          <div className="activity-item" key={item.id}>
            <div className="activity-dot" />
            <div>
              <strong>{item.actor}</strong>
              <p>
                {item.action} <span>{item.target}</span>
              </p>
              <small>{item.project} • {item.time}</small>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
