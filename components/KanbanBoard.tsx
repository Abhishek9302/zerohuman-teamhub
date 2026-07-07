'use client';
import { useState } from 'react';
import { useApp } from '@/src/context';
import { groupTasksByStatus } from '@/src/lib';
import type { TaskStatus } from '@/src/types';

const STATUS_COLORS: Record<TaskStatus, string> = {
  'Todo': '#6b7280',
  'In Progress': '#3b82f6',
  'In Review': '#f59e0b',
  'Done': '#22c55e'
};

export function KanbanBoard() {
  const { projects, activeProjectId, moveTaskStatus, setTaskDetailOpen } = useApp();
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);

  const project = projects.find(p => p.id === activeProjectId) ?? projects[0];
  if (!project) return null;

  const grouped = groupTasksByStatus(project.tasks);

  function handleDrop(status: TaskStatus) {
    if (dragTaskId) {
      moveTaskStatus(project.id, dragTaskId, status);
    }
    setDragTaskId(null);
    setDragOverStatus(null);
  }

  return (
    <section className="section-card kanban-shell">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Kanban board</p>
          <h3>{project.name}</h3>
        </div>
        <span className="badge">Drag cards to change status</span>
      </div>

      <div className="kanban-grid">
        {grouped.map((column) => (
          <article
            className="panel kanban-column"
            key={column.status}
            onDragOver={e => { e.preventDefault(); setDragOverStatus(column.status as TaskStatus); }}
            onDragLeave={() => setDragOverStatus(null)}
            onDrop={() => handleDrop(column.status as TaskStatus)}
            style={{
              outline: dragOverStatus === column.status ? `2px dashed ${STATUS_COLORS[column.status as TaskStatus]}` : undefined,
              transition: 'outline 0.15s'
            }}
          >
            <div className="kanban-column__header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLORS[column.status as TaskStatus], display: 'inline-block' }} />
                <h4 style={{ margin: 0 }}>{column.status}</h4>
              </div>
              <span>{column.tasks.length}</span>
            </div>
            <div className="kanban-stack">
              {column.tasks.length === 0 && (
                <div style={{ opacity: 0.3, textAlign: 'center', padding: 16, fontSize: 13 }}>Drop here</div>
              )}
              {column.tasks.map((task) => (
                <div
                  className="kanban-card"
                  key={task.id}
                  draggable
                  onDragStart={() => setDragTaskId(task.id)}
                  onDragEnd={() => { setDragTaskId(null); setDragOverStatus(null); }}
                  onClick={() => setTaskDetailOpen(true, task)}
                  style={{
                    cursor: 'grab',
                    opacity: dragTaskId === task.id ? 0.5 : 1,
                    transition: 'opacity 0.15s'
                  }}
                >
                  <div className="label-row">
                    {task.labels.map((label) => (
                      <span className="label-chip" key={label.id} style={{ background: `${label.color}22`, color: label.color }}>
                        {label.name}
                      </span>
                    ))}
                  </div>
                  <h5>{task.title}</h5>
                  <p style={{ fontSize: 12, opacity: 0.7, margin: '4px 0' }}>{task.description.slice(0, 60)}...</p>
                  <div className="kanban-meta">
                    <span style={{ fontSize: 12 }}>{task.assignee}</span>
                    <span style={{ fontSize: 12, opacity: 0.7 }}>{task.dueDate}</span>
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
