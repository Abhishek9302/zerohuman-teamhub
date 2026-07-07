'use client';

import { LogIn, UserPlus } from 'lucide-react';

interface AuthPanelProps {
  mode: 'login' | 'signup';
  email: string;
  password: string;
  loading: boolean;
  error: string | null;
  onModeChange: (mode: 'login' | 'signup') => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
}

export function AuthPanel({
  mode,
  email,
  password,
  loading,
  error,
  onModeChange,
  onEmailChange,
  onPasswordChange,
  onSubmit
}: AuthPanelProps) {
  return (
    <section className="panel auth-panel">
      <div className="panel__header">
        <p className="eyebrow">Authentication</p>
        <h2>{mode === 'login' ? 'Welcome back' : 'Create your Sniplet account'}</h2>
        <p className="muted">Sign in or create an account, then create short links backed by the API.</p>
      </div>

      <div className="segmented-control" role="tablist" aria-label="Authentication mode">
        <button
          className={mode === 'login' ? 'active' : ''}
          onClick={() => onModeChange('login')}
          type="button"
        >
          Login
        </button>
        <button
          className={mode === 'signup' ? 'active' : ''}
          onClick={() => onModeChange('signup')}
          type="button"
        >
          Sign up
        </button>
      </div>

      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label className="field">
          <span>Email</span>
          <input
            autoComplete="email"
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="you@example.com"
            type="email"
            value={email}
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={6}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="At least 6 characters"
            type="password"
            value={password}
          />
        </label>

        {error ? <p className="error-banner">{error}</p> : null}

        <button className="primary-button" disabled={loading} type="submit">
          {mode === 'login' ? <LogIn size={16} aria-hidden="true" /> : <UserPlus size={16} aria-hidden="true" />}
          {loading ? 'Working…' : mode === 'login' ? 'Login' : 'Create account'}
        </button>
      </form>
    </section>
  );
}
