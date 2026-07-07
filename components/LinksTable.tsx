'use client';

import type { ShortLink } from '@/src/types';
import { getShortUrl } from '@/src/lib';

interface LinksTableProps {
  links: ShortLink[];
  deletingId: number | null;
  onDelete: (id: number) => void;
}

export function LinksTable({ links, deletingId, onDelete }: LinksTableProps) {
  if (!links.length) {
    return (
      <section className="panel links-panel empty-state">
        <p className="eyebrow">Your links</p>
        <h2>No Sniplets yet</h2>
        <p className="muted">Create your first short link to start tracking clicks.</p>
      </section>
    );
  }

  return (
    <section className="panel links-panel">
      <div className="panel__header">
        <p className="eyebrow">Your links</p>
        <h2>Live analytics</h2>
        <p className="muted">Each redirect increments the click counter in the database.</p>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Short link</th>
              <th>Destination</th>
              <th>Clicks</th>
              <th>Created</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {links.map((link) => (
              <tr key={link.id}>
                <td>
                  <a className="short-link" href={getShortUrl(link.slug)} rel="noreferrer" target="_blank">
                    {link.slug}
                  </a>
                </td>
                <td>
                  <span className="url-cell">{link.target_url}</span>
                </td>
                <td>
                  <span className="click-badge">{link.clicks}</span>
                </td>
                <td>{new Date(link.created_at).toLocaleString()}</td>
                <td>
                  <button
                    className="ghost-button"
                    disabled={deletingId === link.id}
                    onClick={() => onDelete(link.id)}
                    type="button"
                  >
                    {deletingId === link.id ? 'Deleting…' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
