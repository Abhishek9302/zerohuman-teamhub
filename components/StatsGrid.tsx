import { teamHubData } from '@/src/data';

const stats = [
  { label: 'My tasks', value: teamHubData.dashboard.myTasks, tone: 'violet' },
  { label: 'Overdue', value: teamHubData.dashboard.overdue, tone: 'rose' },
  { label: 'Due today', value: teamHubData.dashboard.dueToday, tone: 'amber' },
  { label: 'Completed this week', value: teamHubData.dashboard.completedThisWeek, tone: 'emerald' }
];

export function StatsGrid() {
  return (
    <section className="stats-grid">
      {stats.map((stat) => (
        <article className="panel stat-card" key={stat.label} data-tone={stat.tone}>
          <p className="muted">{stat.label}</p>
          <strong>{stat.value}</strong>
        </article>
      ))}
    </section>
  );
}
