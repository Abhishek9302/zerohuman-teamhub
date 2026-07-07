'use client';

import { useEffect, useMemo, useState } from 'react';
import { LogOut } from 'lucide-react';
import { AuthPanel } from '@/components/AuthPanel';
import { CreateLinkForm } from '@/components/CreateLinkForm';
import { HeroStats } from '@/components/HeroStats';
import { LinksTable } from '@/components/LinksTable';
import { createLink, deleteLink, fetchLinks, login, signup } from '@/src/lib';
import type { ShortLink } from '@/src/types';

type AuthMode = 'login' | 'signup';

const TOKEN_KEY = 'sniplet-token';
const EMAIL_KEY = 'sniplet-email';

export default function HomePage() {
  const [mode, setMode] = useState<AuthMode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [token, setToken] = useState('');
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [authLoading, setAuthLoading] = useState(false);
  const [linksLoading, setLinksLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Connect to the API to start shortening links.');

  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_KEY) ?? '';
    const storedEmail = window.localStorage.getItem(EMAIL_KEY) ?? '';

    setToken(storedToken);
    setEmail(storedEmail);
  }, []);

  useEffect(() => {
    if (!token) {
      setLinks([]);
      return;
    }

    void refreshLinks(token);
  }, [token]);

  const totalClicks = useMemo(() => links.reduce((sum, link) => sum + link.clicks, 0), [links]);

  async function refreshLinks(activeToken: string) {
    setLinksLoading(true);
    setLinkError(null);

    try {
      const nextLinks = await fetchLinks(activeToken);
      setLinks(nextLinks);
      setStatusMessage(`Loaded ${nextLinks.length} link${nextLinks.length === 1 ? '' : 's'} from the backend.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load links.';
      setLinkError(message);
      if (message.toLowerCase().includes('token')) {
        handleLogout();
      }
    } finally {
      setLinksLoading(false);
    }
  }

  async function handleAuthSubmit() {
    setAuthLoading(true);
    setAuthError(null);

    try {
      const response = mode === 'login' ? await login(email, password) : await signup(email, password);
      window.localStorage.setItem(TOKEN_KEY, response.token);
      window.localStorage.setItem(EMAIL_KEY, response.user.email);
      setToken(response.token);
      setEmail(response.user.email);
      setPassword('');
      setStatusMessage(mode === 'login' ? 'Logged in successfully.' : 'Account created successfully.');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleCreateLink() {
    if (!token) {
      setLinkError('Login first to create a link.');
      return;
    }

    setCreateLoading(true);
    setLinkError(null);

    try {
      await createLink(targetUrl, token);
      setTargetUrl('');
      setStatusMessage('Short link created and stored in Postgres.');
      await refreshLinks(token);
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : 'Failed to create link.');
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleDeleteLink(id: number) {
    if (!token) {
      return;
    }

    setDeletingId(id);
    setLinkError(null);

    try {
      await deleteLink(id, token);
      setStatusMessage('Link deleted successfully.');
      await refreshLinks(token);
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : 'Failed to delete link.');
    } finally {
      setDeletingId(null);
    }
  }

  function handleLogout() {
    window.localStorage.removeItem(TOKEN_KEY);
    setToken('');
    setLinks([]);
    setStatusMessage('Logged out.');
  }

  return (
    <main className="app-shell">
      <div className="app-frame">
        <HeroStats authenticated={Boolean(token)} totalClicks={totalClicks} totalLinks={links.length} />

        <section className="status-bar panel">
          <div>
            <p className="eyebrow">Environment</p>
            <strong>{process.env.NEXT_PUBLIC_API_URL ?? 'NEXT_PUBLIC_API_URL missing'}</strong>
          </div>
          <div>
            <p className="eyebrow">Session</p>
            <strong>{token ? email : 'Not authenticated'}</strong>
          </div>
          <div>
            <p className="eyebrow">State</p>
            <strong>{linksLoading ? 'Refreshing links…' : statusMessage}</strong>
          </div>
          {token ? (
            <button className="ghost-button ghost-button--icon" onClick={handleLogout} type="button">
              <LogOut size={16} aria-hidden="true" />
              Logout
            </button>
          ) : null}
        </section>

        <div className="content-grid two-column">
          <AuthPanel
            email={email}
            error={authError}
            loading={authLoading}
            mode={mode}
            onEmailChange={setEmail}
            onModeChange={setMode}
            onPasswordChange={setPassword}
            onSubmit={handleAuthSubmit}
            password={password}
          />
          <CreateLinkForm
            error={linkError}
            loading={createLoading}
            onSubmit={handleCreateLink}
            onTargetUrlChange={setTargetUrl}
            targetUrl={targetUrl}
          />
        </div>

        <LinksTable
          deletingId={deletingId}
          links={links}
          loading={linksLoading}
          onDelete={handleDeleteLink}
          onRefresh={token ? () => void refreshLinks(token) : undefined}
        />
      </div>
    </main>
  );
}
