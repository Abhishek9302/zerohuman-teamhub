'use client';
import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useApp } from '@/src/context';
import type { View } from '@/src/types';

export function CommandPalette() {
  const { cmdPaletteOpen, setCmdPaletteOpen, projects, setActiveView, setActiveProjectId, setNewTaskOpen, setTaskDetailOpen } = useApp();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cmdPaletteOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [cmdPaletteOpen]);

  const navCommands = [
    { label: 'Go to Dashboard', action: () => { setActiveView('dashboard'); close(); } },
    { label: 'Go to Projects', action: () => { setActiveView('projects'); close(); } },
    { label: 'Go to Notifications', action: () => { setActiveView('notifications'); close(); } },
    { label: 'Go to Team Members', action: () => { setActiveView('team'); close(); } },
    { label: 'Go to Settings', action: () => { setActiveView('settings'); close(); } },
    { label: 'Create new task', action: () => { setNewTaskOpen(true); close(); } }
  ];

  const projectCommands = projects.map(p => ({
    label: `Open ${p.icon} ${p.name}`,
    action: () => { setActiveProjectId(p.id); setActiveView('projects'); close(); }
  }));

  const taskCommands = projects.flatMap(p =>
    p.tasks.map(t => ({
      label: `Task: ${t.title}`,
      action: () => { setTaskDetailOpen(true, t); close(); }
    }))
  );

  const all = [...navCommands, ...projectCommands, ...taskCommands];
  const filtered = query
    ? all.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
    : all;

  function close() {
    setCmdPaletteOpen(false);
    setQuery('');
  }

  if (!cmdPaletteOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', display: 'flex',
        alignItems: 'flex-start', justifyContent: 'center', paddingTop: 100
      }}
      onClick={e => e.target === e.currentTarget && close()}
    >
      <div style={{
        width: 560, maxWidth: '90vw', borderRadius: 16,
        background: 'var(--surface, #13131f)', border: '1px solid var(--border, #2e2e3e)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)', overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border, #2e2e3e)', gap: 10 }}>
          <Search size={16} style={{ opacity: 0.5 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search commands, projects, tasks..."
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: 'var(--text, #fff)', fontSize: 15
            }}
          />
          <button type="button" onClick={close} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, color: 'var(--text, #fff)' }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', opacity: 0.4 }}>No results</div>
          )}
          {filtered.slice(0, 10).map((cmd, i) => (
            <button
              key={i}
              type="button"
              onClick={cmd.action}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '12px 20px', background: 'none', border: 'none',
                color: 'var(--text, #fff)', cursor: 'pointer', fontSize: 14,
                borderBottom: '1px solid var(--border, #1e1e2e)'
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2, #1e1e2e)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              {cmd.label}
            </button>
          ))}
        </div>
        <div style={{ padding: '8px 16px', opacity: 0.4, fontSize: 11, borderTop: '1px solid var(--border, #2e2e3e)' }}>
          ↑↓ navigate • ↵ select • Esc close
        </div>
      </div>
    </div>
  );
}
