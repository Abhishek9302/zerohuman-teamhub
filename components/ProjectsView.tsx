'use client';
import { useState } from 'react';
import { Plus, Trash2, Archive, Edit2, Check, X } from 'lucide-react';
import { useApp } from '@/src/context';

export function ProjectsView() {
  const { projects, activeProjectId, setActiveProjectId, setNewTaskOpen, setNewProjectOpen, updateProject, deleteProject, setTaskDetailOpen } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const project = projects.find(p => p.id === activeProjectId) ?? projects[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <section className="panel section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Projects</p>
            <h3>All workspaces</h3>
          </div>
          <button className="primary-button" type="button" onClick={() => setNewProjectOpen(true)}>
            <Plus size={14} /> New project
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14, marginTop: 4 }}>
          {projects.map(p => (
            <article
              key={p.id}
              className="panel"
              style={{
                cursor: 'pointer',
                border: p.id === activeProjectId ? `2px solid ${p.color}` : '2px solid transparent',
                transition: 'border-color 0.2s'
              }}
              onClick={() => setActiveProjectId(p.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>{p.icon}</span>
                <div style={{ flex: 1 }}>
                  {editingId === p.id ? (
                    <input
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      style={{ background: 'var(--surface-2,#1e1e2e)', border: '1px solid var(--border,#2e2e3e)', borderRadius: 6, padding: '4px 8px', color: 'var(--text,#fff)', fontSize: 14, width: '100%' }}
                    />
                  ) : (
                    <strong style={{ fontSize: 15 }}>{p.name}</strong>
                  )}
                  <p style={{ margin: 0, fontSize: 12, opacity: 0.5 }}>{p.tasks.length} tasks</p>
                </div>
                <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                  {editingId === p.id ? (
                    <>
                      <button type="button" className="ghost-button" style={{ padding: '3px 6px' }}
                        onClick={() => { updateProject(p.id, { name: editName }); setEditingId(null); }}>
                        <Check size={12} />
                      </button>
                      <button type="button" className="ghost-button" style={{ padding: '3px 6px' }}
                        onClick={() => setEditingId(null)}>
                        <X size={12} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="ghost-button" style={{ padding: '3px 6px' }}
                        onClick={() => { setEditingId(p.id); setEditName(p.name); }}>
                        <Edit2 size={12} />
                      </button>
                      <button type="button" className="ghost-button" style={{ padding: '3px 6px' }}
                        onClick={() => updateProject(p.id, { archived: !p.archived })}>
                        <Archive size={12} style={{ opacity: p.archived ? 1 : 0.5 }} />
                      </button>
                      {projects.length > 1 && (
                        <button type="button" className="ghost-button" style={{ padding: '3px 6px', color: '#ef4444' }}
                          onClick={() => deleteProject(p.id)}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              <p style={{ fontSize: 13, opacity: 0.6, margin: 0 }}>{p.description}</p>
              <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                {['Todo', 'In Progress', 'In Review', 'Done'].map(s => {
                  const count = p.tasks.filter(t => t.status === s).length;
                  return count > 0 ? (
                    <span key={s} className="badge subtle" style={{ fontSize: 11 }}>{s}: {count}</span>
                  ) : null;
                })}
              </div>
            </article>
          ))}
        </div>
      </section>

      {project && (
        <section className="panel section-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{project.icon} {project.name}</p>
              <h3>Task list</h3>
            </div>
            <button className="primary-button" type="button" onClick={() => setNewTaskOpen(true)}>
              <Plus size={14} /> New task
            </button>
          </div>
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Task</th><th>Status</th><th>Priority</th><th>Assignee</th><th>Due</th>
                </tr>
              </thead>
              <tbody>
                {project.tasks.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', opacity: 0.4, padding: 24 }}>No tasks. Create one!</td></tr>
                )}
                {project.tasks.map(task => (
                  <tr key={task.id} style={{ cursor: 'pointer' }} onClick={() => setTaskDetailOpen(true, task)} className="task-row-hover">
                    <td><strong>{task.title}</strong></td>
                    <td><span className="badge subtle">{task.status}</span></td>
                    <td><span className={`badge priority priority--${task.priority.toLowerCase()}`}>{task.priority}</span></td>
                    <td>{task.assignee}</td>
                    <td>{task.dueDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
