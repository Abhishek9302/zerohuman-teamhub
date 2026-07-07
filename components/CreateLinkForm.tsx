'use client';

import { Scissors } from 'lucide-react';

interface CreateLinkFormProps {
  targetUrl: string;
  loading: boolean;
  error: string | null;
  onTargetUrlChange: (value: string) => void;
  onSubmit: () => void;
}

export function CreateLinkForm({
  targetUrl,
  loading,
  error,
  onTargetUrlChange,
  onSubmit
}: CreateLinkFormProps) {
  return (
    <section className="panel create-panel">
      <div className="panel__header">
        <p className="eyebrow">Create link</p>
        <h2>Shorten a URL</h2>
        <p className="muted">Every submission hits the backend and persists directly to Postgres.</p>
      </div>

      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label className="field">
          <span>Target URL</span>
          <input
            onChange={(event) => onTargetUrlChange(event.target.value)}
            placeholder="https://example.com/your/long/link"
            type="url"
            value={targetUrl}
          />
        </label>

        {error ? <p className="error-banner">{error}</p> : null}

        <button className="primary-button" disabled={loading} type="submit">
          <Scissors size={16} aria-hidden="true" />
          {loading ? 'Creating…' : 'Create Sniplet'}
        </button>
      </form>
    </section>
  );
}
