'use client';
import { useApp } from '@/src/context';
import { getCalendarBuckets } from '@/src/lib';

export function CalendarView() {
  const { projects, activeProjectId, setTaskDetailOpen } = useApp();
  const project = projects.find(p => p.id === activeProjectId) ?? projects[0];
  if (!project) return null;

  const buckets = Object.entries(getCalendarBuckets(project.tasks));

  return (
    <section className="panel section-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Calendar view</p>
          <h3>Upcoming schedule</h3>
        </div>
        <span className="badge">{project.name}</span>
      </div>

      <div className="calendar-grid">
        {buckets.length === 0 && <p className="muted" style={{ padding: 16 }}>No scheduled tasks.</p>}
        {buckets.map(([day, tasks]) => (
          <article className="calendar-day" key={day}>
            <h4>{day}</h4>
            {tasks.map((task) => (
              <div
                className="calendar-task"
                key={task.id}
                style={{ cursor: 'pointer' }}
                onClick={() => setTaskDetailOpen(true, task)}
              >
                <strong>{task.title}</strong>
                <span>{task.assignee}</span>
              </div>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}
