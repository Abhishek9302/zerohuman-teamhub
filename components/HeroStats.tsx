import { Link2, MousePointerClick, ShieldCheck, Sparkles } from 'lucide-react';

interface HeroStatsProps {
  totalLinks: number;
  totalClicks: number;
  authenticated: boolean;
}

export function HeroStats({ totalLinks, totalClicks, authenticated }: HeroStatsProps) {
  return (
    <section className="hero-card panel">
      <div>
        <p className="eyebrow">
          <Sparkles size={14} aria-hidden="true" /> Sniplet
        </p>
        <h1>Short links with real persistence and click analytics.</h1>
        <p className="muted hero-copy">
          Authenticate, create short links, manage them, and watch click counts update through the live backend.
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span>
            <Link2 size={16} aria-hidden="true" /> Total links
          </span>
          <strong>{totalLinks}</strong>
        </div>
        <div className="stat-card">
          <span>
            <MousePointerClick size={16} aria-hidden="true" /> Total clicks
          </span>
          <strong>{totalClicks}</strong>
        </div>
        <div className="stat-card">
          <span>
            <ShieldCheck size={16} aria-hidden="true" /> Status
          </span>
          <strong className={authenticated ? 'status-live' : ''}>
            {authenticated ? 'Authenticated' : 'Guest'}
          </strong>
        </div>
      </div>
    </section>
  );
}
