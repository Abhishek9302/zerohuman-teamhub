interface HeroStatsProps {
  totalLinks: number;
  totalClicks: number;
  authenticated: boolean;
}

export function HeroStats({ totalLinks, totalClicks, authenticated }: HeroStatsProps) {
  return (
    <section className="hero-card panel">
      <div>
        <p className="eyebrow">Sniplet</p>
        <h1>Short links with real persistence and click analytics.</h1>
        <p className="muted hero-copy">
          Authenticate, create short links, manage them, and watch click counts update through the live backend.
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span>Total links</span>
          <strong>{totalLinks}</strong>
        </div>
        <div className="stat-card">
          <span>Total clicks</span>
          <strong>{totalClicks}</strong>
        </div>
        <div className="stat-card">
          <span>Status</span>
          <strong>{authenticated ? 'Authenticated' : 'Guest'}</strong>
        </div>
      </div>
    </section>
  );
}
