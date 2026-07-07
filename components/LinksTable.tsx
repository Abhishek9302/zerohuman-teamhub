'use client';

import { ArrowUpRight, BarChart3, ExternalLink, Link2, RefreshCw, Trash2, Trophy } from 'lucide-react';
import type { ShortLink } from '@/src/types';
import { getShortUrl } from '@/src/lib';
import { CopyButton } from '@/components/CopyButton';

interface LinksTableProps {
  links: ShortLink[];
  deletingId: number | null;
  loading?: boolean;
  onDelete: (id: number) => void;
  onRefresh?: () => void;
}

export function LinksTable({ links, deletingId, loading = false, onDelete, onRefresh }: LinksTableProps) {
  if (!links.length) {
    return (
      <section className="panel links-panel empty-state">
        <div className="empty-icon" aria-hidden="true">
          <Link2 size={26} />
        </div>
        <p className="eyebrow">Your links</p>
        <h2>No Sniplets yet</h2>
        <p className="muted">Create your first short link to start tracking clicks.</p>
      </section>
    );
  }

  const maxClicks = links.reduce((max, link) => Math.max(max, link.clicks), 0);
  const topLinkId = maxClicks > 0 ? links.reduce((top, link) => (link.clicks > top.clicks ? link : top), links[0]).id : null;

  return (
    <section className="panel links-panel">
      <div className="panel__header links-panel__header">
        <div>
          <p className="eyebrow">
            <BarChart3 size={14} aria-hidden="true" /> Your links
          </p>
          <h2>Live analytics</h2>
          <p className="muted">Each redirect increments the click counter in the database.</p>
        </div>
        {onRefresh ? (
          <button
            aria-label="Refresh links"
            className="ghost-button ghost-button--icon"
            disabled={loading}
            onClick={onRefresh}
            type="button"
          >
            <RefreshCw className={loading ? 'spin' : ''} size={16} />
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        ) : null}
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
            {links.map((link) => {
              const shortUrl = getShortUrl(link.slug);
              const percentage = maxClicks > 0 ? Math.round((link.clicks / maxClicks) * 100) : 0;
              const isTop = link.id === topLinkId && link.clicks > 0;

              return (
                <tr key={link.id}>
                  <td>
                    <div className="short-link-cell">
                      <a className="short-link" href={shortUrl} rel="noreferrer" target="_blank">
                        <Link2 size={14} aria-hidden="true" />
                        {link.slug}
                        <ArrowUpRight size={14} aria-hidden="true" />
                      </a>
                      <CopyButton value={shortUrl} />
                    </div>
                  </td>
                  <td>
                    <a
                      className="url-cell"
                      href={link.target_url}
                      rel="noreferrer"
                      target="_blank"
                      title={link.target_url}
                    >
                      <ExternalLink size={13} aria-hidden="true" />
                      <span>{link.target_url}</span>
                    </a>
                  </td>
                  <td>
                    <div className="click-cell">
                      <span className="click-badge">
                        {isTop ? <Trophy size={13} aria-hidden="true" /> : null}
                        {link.clicks}
                      </span>
                      <span
                        aria-hidden="true"
                        className="click-bar"
                        title={`${percentage}% of top performer`}
                      >
                        <span className="click-bar__fill" style={{ width: `${percentage}%` }} />
                      </span>
                    </div>
                  </td>
                  <td className="created-cell">{new Date(link.created_at).toLocaleString()}</td>
                  <td>
                    <button
                      aria-label={`Delete ${link.slug}`}
                      className="ghost-button ghost-button--danger"
                      disabled={deletingId === link.id}
                      onClick={() => onDelete(link.id)}
                      type="button"
                    >
                      <Trash2 size={15} />
                      {deletingId === link.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
