import { FolderKanban, LayoutDashboard, Bell, Users, Settings, Search } from 'lucide-react';
import { teamHubData } from '@/src/data';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Projects', icon: FolderKanban },
  { label: 'Notifications', icon: Bell },
  { label: 'Team Members', icon: Users },
  { label: 'Settings', icon: Settings }
];

export function Sidebar() {
  return (
    <aside className="sidebar panel">
      <div className="sidebar__brand">
        <div className="brand-mark">TH</div>
        <div>
          <p className="eyebrow">Organization</p>
          <h1>{teamHubData.organization.name}</h1>
        </div>
      </div>

      <button className="command-trigger" type="button">
        <Search size={16} />
        <span>Command palette</span>
        <kbd>⌘K</kbd>
      </button>

      <nav className="sidebar__nav">
        {navItems.map(({ label, icon: Icon }) => (
          <a href="#" key={label} className={`nav-link ${label === 'Dashboard' ? 'active' : ''}`}>
            <Icon size={18} />
            <span>{label}</span>
          </a>
        ))}
      </nav>

      <div className="sidebar__projects">
        <p className="section-title">Projects</p>
        {teamHubData.projects.map((project) => (
          <div className="project-link" key={project.id}>
            <span className="project-dot" style={{ background: project.color }} />
            <span>{project.icon} {project.name}</span>
            <small>{project.tasks.length}</small>
          </div>
        ))}
      </div>
    </aside>
  );
}
