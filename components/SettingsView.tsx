'use client';
import { useState } from 'react';
import { useApp } from '@/src/context';

export function SettingsView() {
  const { currentUser, toggleDarkMode, darkMode, members } = useApp();
  const [orgName, setOrgName] = useState('TeamHub Labs');
  const [saved, setSaved] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 640 }}>
      <section className="panel section-card">
        <div className="section-heading">
          <div><p className="eyebrow">Settings</p><h3>Organization</h3></div>
        </div>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12, opacity: 0.6 }}>Organization name</label>
            <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12, opacity: 0.6 }}>Plan</label>
            <div style={{ padding: '9px 12px', background: 'var(--surface-2,#1e1e2e)', borderRadius: 8, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Free plan</span>
              <span className="badge" style={{ background: '#7c3aed22', color: '#a78bfa' }}>Pro available</span>
            </div>
          </div>
          <button type="submit" className="primary-button" style={{ alignSelf: 'flex-start' }}>
            {saved ? '✓ Saved' : 'Save changes'}
          </button>
        </form>
      </section>

      <section className="panel section-card">
        <div className="section-heading">
          <div><p className="eyebrow">Profile</p><h3>Your account</h3></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="avatar-circle" style={{ width: 48, height: 48, fontSize: 18 }}>{currentUser.avatar}</div>
            <div>
              <strong style={{ fontSize: 15 }}>{currentUser.name}</strong>
              <p style={{ margin: 0, fontSize: 13, opacity: 0.6 }}>{currentUser.email}</p>
              <span className="badge subtle" style={{ marginTop: 4, display: 'inline-block' }}>{currentUser.role}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="panel section-card">
        <div className="section-heading">
          <div><p className="eyebrow">Preferences</p><h3>Display</h3></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
          <div>
            <strong>Dark mode</strong>
            <p style={{ margin: 0, fontSize: 13, opacity: 0.6 }}>Toggle light/dark theme</p>
          </div>
          <button
            type="button"
            onClick={toggleDarkMode}
            style={{
              width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
              background: darkMode ? '#7c3aed' : '#374151', position: 'relative', transition: 'background 0.2s'
            }}
          >
            <span style={{
              position: 'absolute', top: 3, left: darkMode ? 25 : 3, width: 20, height: 20,
              borderRadius: '50%', background: '#fff', transition: 'left 0.2s'
            }} />
          </button>
        </div>
      </section>

      <section className="panel section-card">
        <div className="section-heading">
          <div><p className="eyebrow">Members</p><h3>Team overview</h3></div>
        </div>
        <p style={{ fontSize: 13, opacity: 0.6 }}>{members.length} members in your organization.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          {members.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'var(--surface-2,#1e1e2e)', borderRadius: 20 }}>
              <div className="avatar-circle" style={{ width: 24, height: 24, fontSize: 10 }}>{m.avatar}</div>
              <span style={{ fontSize: 13 }}>{m.name}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'var(--surface-2, #1e1e2e)',
  border: '1px solid var(--border, #2e2e3e)',
  borderRadius: 8, padding: '9px 12px',
  color: 'var(--text, #fff)', fontSize: 14, width: '100%', boxSizing: 'border-box'
};
