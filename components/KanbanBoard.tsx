import { groupTasksByStatus, getPrimaryProject } from '@/src/lib';

export function KanbanBoard() {
  const grouped = groupTasksByStatus(getPrimaryProject().tasks);

  return (
    <section className="section-card kanban-shell">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Kanban board</p>
          <h3>Delivery workflow</h3>
        </div>
        <span className="badge">Drag-ready layout</span>
      </div>

      <div className="kanban-grid">
        {grouped.map((column) => (
          <article className="panel kanban-column" key={column.status}>
            <div className="kanban-column__header">
              <h4>{column.status}</h4>
              <span>{column.tasks.length}</span>
            </div>
            <div className="kanban-stack">
              {column.tasks.map((task) => (
                <div className="kanban-card" key={task.id}>
                  <div className="label-row">
                    {task.labels.map((label) => (
                      <span className="label-chip" key={label.id} style={{ background: `${label.color}22`, color: label.color }}>
                        {label.name}
                      </span>
                    ))}
                  </div>
                  <h5>{task.title}</h5>
                  <p>{task.description}</p>
                  <div className="kanban-meta">
                    <span>{task.assignee}</span>
                    <span>{task.dueDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
