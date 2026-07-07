import { getCalendarBuckets, getPrimaryProject } from '@/src/lib';

export function CalendarView() {
  const buckets = Object.entries(getCalendarBuckets(getPrimaryProject().tasks));

  return (
    <section className="panel section-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Calendar view</p>
          <h3>Upcoming schedule</h3>
        </div>
      </div>

      <div className="calendar-grid">
        {buckets.map(([day, tasks]) => (
          <article className="calendar-day" key={day}>
            <h4>{day}</h4>
            {tasks.map((task) => (
              <div className="calendar-task" key={task.id}>
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
