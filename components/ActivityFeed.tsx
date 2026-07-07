'use client';
import { useApp } from '@/src/context';

export function ActivityFeed() {
  const { projects } = useApp();

  const items = projects.flatMap(project =>
    project.tasks.flatMap(task =>
      task.activity.map(item => ({ ...item, project: project.name, projectColor: project.color }))
    )
  ).slice(0, 8);

  return (
    <section className="panel section-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Activity feed</p>
          <h3>Recent project changes</h3>
        </div>
      </div>

      <div className="activity-list">
        {items.length === 0 && <p className="muted" style={{ padding: 16 }}>No activity yet.</p>}
        {items.map((item) => (
          <div className="activity-item" key={item.id}>
            <div className="activity-dot" style={{ background: item.projectColor }} />
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
