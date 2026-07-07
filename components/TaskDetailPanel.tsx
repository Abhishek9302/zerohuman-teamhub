import { CheckCircle2, MessageSquareText, Paperclip, Clock3 } from 'lucide-react';
import { getPrimaryProject } from '@/src/lib';

export function TaskDetailPanel() {
  const task = getPrimaryProject().tasks[0];

  return (
    <section className="panel detail-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Task details</p>
          <h3>{task.title}</h3>
        </div>
        <span className="badge priority">{task.priority}</span>
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

      <div className="subsection">
        <h4><CheckCircle2 size={16} /> Subtasks</h4>
        <div className="subtask-list">
          {task.subtasks.map((subtask) => (
            <div className="subtask-row" key={subtask.id}>
              <span className={`checkbox ${subtask.done ? 'checked' : ''}`} />
              <span>{subtask.title}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="subsection">
        <h4><MessageSquareText size={16} /> Comments</h4>
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
      </div>
    </section>
  );
}
