'use client';
import { useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '@/src/context';
import type { Priority, TaskStatus } from '@/src/types';

const PRIORITIES: Priority[] = ['Low', 'Medium', 'High', 'Urgent'];
const STATUSES: TaskStatus[] = ['Todo', 'In Progress', 'In Review', 'Done'];

export function NewTaskModal() {
  const { newTaskOpen, setNewTaskOpen, projects, activeProjectId, createTask, members } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState(members[0]?.name ?? '');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [status, setStatus] = useState<TaskStatus>('Todo');
  const [projectId, setProjectId] = useState(activeProjectId);

  if (!newTaskOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    createTask(projectId || activeProjectId, {
      title: title.trim(),
      description: description.trim() || 'No description provided.',
      assignee,
      dueDate: dueDate || 'No due date',
      priority,
      status,
      labels: []
    });
    setTitle(''); setDescription(''); setDueDate('');
    setPriority('Medium'); setStatus('Todo');
    setNewTaskOpen(false);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}
      onClick={e => e.target === e.currentTarget && setNewTaskOpen(false)}
    >
      <div style={{
        width: 520, maxWidth: '92vw', borderRadius: 16,
        background: 'var(--surface, #13131f)', border: '1px solid var(--border, #2e2e3e)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)', overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border, #2e2e3e)' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Create new task</h3>
          <button type="button" onClick={() => setNewTaskOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text, #fff)', opacity: 0.5 }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FieldRow label="Title *">
            <input
              autoFocus
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Task title"
              required
              style={inputStyle}
            />
          </FieldRow>
          <FieldRow label="Description">
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What needs to be done?"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </FieldRow>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FieldRow label="Project">
              <select value={projectId} onChange={e => setProjectId(e.target.value)} style={inputStyle}>
                {projects.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
              </select>
            </FieldRow>
            <FieldRow label="Assignee">
              <select value={assignee} onChange={e => setAssignee(e.target.value)} style={inputStyle}>
                {members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            </FieldRow>
            <FieldRow label="Priority">
              <select value={priority} onChange={e => setPriority(e.target.value as Priority)} style={inputStyle}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </FieldRow>
            <FieldRow label="Status">
              <select value={status} onChange={e => setStatus(e.target.value as TaskStatus)} style={inputStyle}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FieldRow>
          </div>
          <FieldRow label="Due date">
            <input type="text" value={dueDate} onChange={e => setDueDate(e.target.value)} placeholder="Today, Tomorrow, Friday..." style={inputStyle} />
          </FieldRow>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="ghost-button" onClick={() => setNewTaskOpen(false)}>Cancel</button>
            <button type="submit" className="primary-button">Create task</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, opacity: 0.6, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'var(--surface-2, #1e1e2e)',
  border: '1px solid var(--border, #2e2e3e)',
  borderRadius: 8, padding: '9px 12px',
  color: 'var(--text, #fff)', fontSize: 14, width: '100%', boxSizing: 'border-box'
};
