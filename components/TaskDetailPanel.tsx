'use client';
import { CheckCircle2, MessageSquareText, Paperclip, Clock3, X, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '@/src/context';
import { taskStatuses } from '@/src/lib';
import type { TaskStatus } from '@/src/types';

export function TaskDetailPanel() {
  const { editingTask, taskDetailOpen, setTaskDetailOpen, projects, activeProjectId, updateTask, deleteTask, addComment, toggleSubtask, moveTaskStatus } = useApp();
  const [commentInput, setCommentInput] = useState('');

  const projectId = projects.find(p => p.tasks.some(t => t.id === editingTask?.id))?.id ?? activeProjectId;

  if (!taskDetailOpen || !editingTask) {
    const defaultProject = projects.find(p => p.id === activeProjectId) ?? projects[0];
    const defaultTask = defaultProject?.tasks[0];
    if (!defaultTask) return null;
    return (
      <section className="panel detail-panel" style={{ opacity: 0.4 }}>
        <div className="section-heading">
          <div><p className="eyebrow">Task details</p><h3>Select a task</h3></div>
        </div>
        <p className="detail-copy muted">Click any task to view its details here.</p>
      </section>
    );
  }

  const task = editingTask;

  const handleComment = () => {
    if (!commentInput.trim()) return;
    addComment(projectId, task.id, commentInput.trim());
    setCommentInput('');
  };

  return (
    <section className="panel detail-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Task details</p>
          <h3>{task.title}</h3>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className={`badge priority priority--${task.priority.toLowerCase()}`}>{task.priority}</span>
          <button
            type="button"
            className="ghost-button"
            style={{ padding: '4px 6px', color: '#ef4444' }}
            onClick={() => deleteTask(projectId, task.id)}
            title="Delete task"
          >
            <Trash2 size={14} />
          </button>
          <button
            type="button"
            className="ghost-button"
            style={{ padding: '4px 6px' }}
            onClick={() => setTaskDetailOpen(false)}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <p className="detail-copy">{task.description}</p>

      <div className="detail-meta-grid">
        <div className="meta-card">
          <Clock3 size={16} />
          <div>
            <span>Due date</span>
            <strong>{task.dueDate}</strong>
          </div>
        </div>
        <div className="meta-card">
          <Paperclip size={16} />
          <div>
            <span>Assignee</span>
            <strong>{task.assignee}</strong>
          </div>
        </div>
      </div>

      <div className="subsection" style={{ marginTop: 12 }}>
        <label style={{ fontSize: 12, opacity: 0.6, marginBottom: 4, display: 'block' }}>Status</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {taskStatuses.map(s => (
            <button
              key={s}
              type="button"
              className={`badge subtle ${task.status === s ? 'active' : ''}`}
              style={{
                cursor: 'pointer',
                border: task.status === s ? '1px solid #7c3aed' : '1px solid transparent',
                background: task.status === s ? '#7c3aed22' : undefined
              }}
              onClick={() => moveTaskStatus(projectId, task.id, s as TaskStatus)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="subsection">
        <h4><CheckCircle2 size={16} /> Subtasks ({task.subtasks.filter(s => s.done).length}/{task.subtasks.length})</h4>
        <div className="subtask-list">
          {task.subtasks.length === 0 && <p className="muted" style={{ fontSize: 13 }}>No subtasks.</p>}
          {task.subtasks.map((subtask) => (
            <div
              className="subtask-row"
              key={subtask.id}
              style={{ cursor: 'pointer' }}
              onClick={() => toggleSubtask(projectId, task.id, subtask.id)}
            >
              <span className={`checkbox ${subtask.done ? 'checked' : ''}`} />
              <span style={{ textDecoration: subtask.done ? 'line-through' : 'none', opacity: subtask.done ? 0.5 : 1 }}>
                {subtask.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="subsection">
        <h4><MessageSquareText size={16} /> Comments ({task.comments.length})</h4>
        <div className="comment-list">
          {task.comments.map((comment) => (
            <article className="comment-card" key={comment.id}>
              <div className="comment-head">
                <strong>{comment.author}</strong>
                <span>{comment.time}</span>
              </div>
              <p>{comment.body}</p>
            </article>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            type="text"
            value={commentInput}
            onChange={e => setCommentInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleComment()}
            placeholder="Add a comment..."
            style={{
              flex: 1, background: 'var(--surface-2, #1e1e2e)', border: '1px solid var(--border, #2e2e3e)',
              borderRadius: 8, padding: '8px 12px', color: 'var(--text, #fff)', fontSize: 13
            }}
          />
          <button type="button" className="primary-button" onClick={handleComment} style={{ padding: '8px 14px' }}>Post</button>
        </div>
      </div>
    </section>
  );
}
