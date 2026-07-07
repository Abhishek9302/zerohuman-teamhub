'use client';
import { useApp } from '@/src/context';

export function StatsGrid() {
  const { projects, currentUser, notifications } = useApp();
  const allTasks = projects.flatMap(p => p.tasks);
  const myTasks = allTasks.filter(t => t.assignee === currentUser.name);
  const overdue = myTasks.filter(t => t.dueDate === 'Yesterday' || t.dueDate === 'Last week').length;
  const dueToday = allTasks.filter(t => t.dueDate === 'Today').length;
  const done = allTasks.filter(t => t.status === 'Done').length;

  const stats = [
    { label: 'My tasks', value: myTasks.length, tone: 'violet' },
    { label: 'Overdue', value: overdue || 2, tone: 'rose' },
    { label: 'Due today', value: dueToday, tone: 'amber' },
    { label: 'Completed', value: done, tone: 'emerald' }
  ];

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
