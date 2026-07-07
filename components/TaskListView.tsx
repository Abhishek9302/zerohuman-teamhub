'use client';
import { useApp } from '@/src/context';
import type { Task } from '@/src/types';

export function TaskListView() {
  const { projects, activeProjectId, setTaskDetailOpen, setActiveView, setActiveProjectId } = useApp();
  const project = projects.find(p => p.id === activeProjectId) ?? projects[0];

  if (!project) return <section className="panel section-card"><p className="muted" style={{ padding: 16 }}>No projects yet.</p></section>;

  return (
    <section className="panel section-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">List view</p>
          <h3>{project.name}</h3>
        </div>
        <span className="badge">{project.tasks.length} tasks</span>
      </div>

      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>Task</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Assignee</th>
              <th>Due</th>
              <th>Labels</th>
            </tr>
          </thead>
          <tbody>
            {project.tasks.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', opacity: 0.5, padding: 24 }}>No tasks yet. Create one!</td>
              </tr>
            )}
            {project.tasks.map((task: Task) => (
              <tr
                key={task.id}
                style={{ cursor: 'pointer' }}
                onClick={() => { setTaskDetailOpen(true, task); }}
                className="task-row-hover"
              >
                <td>
                  <strong>{task.title}</strong>
                  <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>{task.description.slice(0, 60)}...</p>
                </td>
                <td><span className="badge subtle">{task.status}</span></td>
                <td><span className={`badge priority priority--${task.priority.toLowerCase()}`}>{task.priority}</span></td>
                <td>{task.assignee}</td>
                <td>{task.dueDate}</td>
                <td>
                  <div className="label-row">
                    {task.labels.map((label) => (
                      <span className="label-chip" key={label.id} style={{ background: `${label.color}22`, color: label.color }}>
                        {label.name}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
