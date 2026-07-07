'use client';
import { useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '@/src/context';

const ICONS = ['🚀', '📱', '🎯', '🛠', '📊', '💡', '🔥', '⚡', '🌟', '🏆'];
const COLORS = ['#7c3aed', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#6366f1'];

export function NewProjectModal() {
  const { newProjectOpen, setNewProjectOpen, createProject } = useApp();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('🚀');
  const [color, setColor] = useState('#7c3aed');

  if (!newProjectOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createProject({ name: name.trim(), description: description.trim(), icon, color, archived: false });
    setName(''); setDescription(''); setIcon('🚀'); setColor('#7c3aed');
    setNewProjectOpen(false);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}
      onClick={e => e.target === e.currentTarget && setNewProjectOpen(false)}
    >
      <div style={{
        width: 460, maxWidth: '92vw', borderRadius: 16,
        background: 'var(--surface, #13131f)', border: '1px solid var(--border, #2e2e3e)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)', overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border, #2e2e3e)' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Create new project</h3>
          <button type="button" onClick={() => setNewProjectOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text, #fff)', opacity: 0.5 }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12, opacity: 0.6 }}>Project name *</label>
            <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)} placeholder="My Project" required style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12, opacity: 0.6 }}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this project about?" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 12, opacity: 0.6 }}>Icon</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ICONS.map(i => (
                <button key={i} type="button" onClick={() => setIcon(i)}
                  style={{ fontSize: 20, background: icon === i ? '#7c3aed22' : 'none', border: icon === i ? '2px solid #7c3aed' : '2px solid transparent', borderRadius: 8, padding: '4px 8px', cursor: 'pointer' }}>
                  {i}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 12, opacity: 0.6 }}>Color</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: color === c ? '3px solid #fff' : '3px solid transparent', cursor: 'pointer' }} />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="ghost-button" onClick={() => setNewProjectOpen(false)}>Cancel</button>
            <button type="submit" className="primary-button">Create project</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'var(--surface-2, #1e1e2e)',
  border: '1px solid var(--border, #2e2e3e)',
  borderRadius: 8, padding: '9px 12px',
  color: 'var(--text, #fff)', fontSize: 14, width: '100%', boxSizing: 'border-box'
};
