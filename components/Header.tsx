import { Bell, MoonStar, Plus, Sparkles } from 'lucide-react';
import { teamHubData } from '@/src/data';

export function Header() {
  return (
    <header className="header panel">
      <div>
        <p className="eyebrow">Welcome back</p>
        <h2>{teamHubData.currentUser.name}</h2>
        <p className="muted">Ship work across projects, tasks, and comments from one workspace.</p>
      </div>

      <div className="header__actions">
        <button className="ghost-button" type="button"><MoonStar size={16} /> Dark</button>
        <button className="ghost-button" type="button"><Bell size={16} /> Alerts</button>
        <button className="primary-button" type="button"><Plus size={16} /> New task</button>
        <div className="user-pill">
          <Sparkles size={16} />
          <span>{teamHubData.currentUser.avatar}</span>
        </div>
      </div>
    </header>
  );
}
