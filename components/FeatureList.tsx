import { BarChart3, Link2, Lock, Zap } from 'lucide-react';

const FEATURES = [
  {
    icon: Zap,
    title: 'Instant short links',
    body: 'Paste any long URL and get an unguessable, crypto-random slug in a single click.'
  },
  {
    icon: BarChart3,
    title: 'Live click analytics',
    body: 'Every redirect increments a counter in Postgres so your numbers are always real.'
  },
  {
    icon: Lock,
    title: 'Secure by default',
    body: 'JWT auth, bcrypt-hashed passwords, and per-user ownership on every link.'
  },
  {
    icon: Link2,
    title: 'Manage your library',
    body: 'List, copy, open, and delete your Sniplets from one focused dashboard.'
  }
] as const;

export function FeatureList() {
  return (
    <section className="panel feature-panel">
      <div className="panel__header">
        <p className="eyebrow">Why Sniplet</p>
        <h2>Everything a link needs</h2>
        <p className="muted">Sign up on the left to start creating links that persist to a real database.</p>
      </div>

      <ul className="feature-list">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <li key={title} className="feature-item">
            <span className="feature-item__icon" aria-hidden="true">
              <Icon size={18} />
            </span>
            <div>
              <strong>{title}</strong>
              <p className="muted">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
