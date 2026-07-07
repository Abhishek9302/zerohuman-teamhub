'use client';
import { useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '@/src/context';

const ROLES = ['Owner', 'Admin', 'Member', 'Viewer'];

export function InviteMemberModal() {
  const { inviteMemberOpen, setInviteMemberOpen, inviteMember } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Member');

  if (!inviteMemberOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    inviteMember(name.trim(), email.trim(), role);
    setName(''); setEmail(''); setRole('Member');
    setInviteMemberOpen(false);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}
      onClick={e => e.target === e.currentTarget && setInviteMemberOpen(false)}
    >
      <div style={{
        width: 420, maxWidth: '92vw', borderRadius: 16,
        background: 'var(--surface, #13131f)', border: '1px solid var(--border, #2e2e3e)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)', overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border, #2e2e3e)' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Invite team member</h3>
          <button type="button" onClick={() => setInviteMemberOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text, #fff)', opacity: 0.5 }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12, opacity: 0.6 }}>Full name *</label>
            <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" required style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12, opacity: 0.6 }}>Email *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" required style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12, opacity: 0.6 }}>Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} style={inputStyle}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="ghost-button" onClick={() => setInviteMemberOpen(false)}>Cancel</button>
            <button type="submit" className="primary-button">Send invite</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'var(--surface-2, #1e1e2e)',
  border: '1px solid var(--border, #2e2e3e)',
  borderRadius: 8, padding: '9px 12px',
  color: 'var(--text, #fff)', fontSize: 14, width: '100%', boxSizing: 'border-box'
};
