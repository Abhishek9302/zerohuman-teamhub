'use client';
import { FolderKanban, LayoutDashboard, Bell, Users, Settings, Search, Plus } from 'lucide-react';
import { useApp } from '@/src/context';
import type { View } from '@/src/types';

const navItems: { label: string; view: View; icon: typeof LayoutDashboard }[] = [
  { label: 'Dashboard', view: 'dashboard', icon: LayoutDashboard },
  { label: 'Projects', view: 'projects', icon: FolderKanban },
  { label: 'Notifications', view: 'notifications', icon: Bell },
  { label: 'Team Members', view: 'team', icon: Users },
  { label: 'Settings', view: 'settings', icon: Settings }
];

export function Sidebar() {
  const { activeView, setActiveView, projects, activeProjectId, setActiveProjectId, notifications, setCmdPaletteOpen, setNewProjectOpen } = useApp();
  const unread = notifications.filter(n => !n.read).length;

  return (
    <aside className="sidebar panel">
      <div className="sidebar__brand">
        <div className="brand-mark">TH</div>
        <div>
          <p className="eyebrow">Organization</p>
          <h1>TeamHub Labs</h1>
        </div>
      </div>

      <button className="command-trigger" type="button" onClick={() => setCmdPaletteOpen(true)}>
        <Search size={16} />
        <span>Command palette</span>
        <kbd>⌘K</kbd>
      </button>

      <nav className="sidebar__nav">
        {navItems.map(({ label, view, icon: Icon }) => (
          <button
            key={label}
            type="button"
            className={`nav-link ${activeView === view ? 'active' : ''}`}
            onClick={() => setActiveView(view)}
          >
            <Icon size={18} />
            <span>{label}</span>
            {view === 'notifications' && unread > 0 && (
              <span className="badge" style={{ marginLeft: 'auto', minWidth: 20, textAlign: 'center' }}>{unread}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar__projects">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <p className="section-title" style={{ margin: 0 }}>Projects</p>
          <button
            type="button"
            className="ghost-button"
            style={{ padding: '2px 6px', fontSize: 12 }}
            onClick={() => setNewProjectOpen(true)}
            title="New project"
          >
            <Plus size={12} />
          </button>
        </div>
        {projects.map((project) => (
          <button
            type="button"
            key={project.id}
            className={`project-link ${activeProjectId === project.id && activeView === 'projects' ? 'active' : ''}`}
            onClick={() => { setActiveProjectId(project.id); setActiveView('projects'); }}
            style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span className="project-dot" style={{ background: project.color }} />
            <span>{project.icon} {project.name}</span>
            <small>{project.tasks.length}</small>
          </button>
        ))}
      </div>
    </aside>
  );
}
