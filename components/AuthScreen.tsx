'use client';
import { useState } from 'react';
import { useApp } from '@/src/context';

export function AuthScreen() {
  const { login, signup, authError } = useApp();
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'signup') await signup(name, email, password);
      else await login(email, password);
    } catch {
      // authError is surfaced from context
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-brand">
          <span className="auth-logo">TH</span>
          <h1>TeamHub</h1>
        </div>
        <p className="auth-sub">Full-stack project management. Sign {mode === 'signup' ? 'up' : 'in'} to continue.</p>

        {mode === 'signup' && (
          <label className="auth-field">
            <span>Name</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" required />
          </label>
        )}
        <label className="auth-field">
          <span>Email</span>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@company.com" required />
        </label>
        <label className="auth-field">
          <span>Password</span>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" minLength={6} required />
        </label>

        {authError && <div className="auth-error">{authError}</div>}

        <button className="auth-submit" type="submit" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>

        <button type="button" className="auth-toggle" onClick={() => setMode(m => (m === 'signup' ? 'login' : 'signup'))}>
          {mode === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </form>
    </div>
  );
}
