import { getPrimaryProject } from '@/src/lib';

export function TaskListView() {
  const project = getPrimaryProject();

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
            {project.tasks.map((task) => (
              <tr key={task.id}>
                <td>
                  <strong>{task.title}</strong>
                  <p>{task.description}</p>
                </td>
                <td><span className="badge subtle">{task.status}</span></td>
                <td><span className="badge priority">{task.priority}</span></td>
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
