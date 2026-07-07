'use client';
import { useState } from 'react';
import { UserPlus, Trash2, Shield } from 'lucide-react';
import { useApp } from '@/src/context';

const ROLES = ['Owner', 'Admin', 'Member', 'Viewer'];

export function TeamMembers() {
  const { members, currentUser, setInviteMemberOpen, removeMember, updateMemberRole } = useApp();

  return (
    <section className="panel section-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Team members</p>
          <h3>Organization access and workload</h3>
        </div>
        <button className="ghost-button" type="button" onClick={() => setInviteMemberOpen(true)}>
          <UserPlus size={14} /> Invite member
        </button>
      </div>

      <div className="team-list">
        {members.map((member) => (
          <article className="team-card" key={member.id}>
            <div className="avatar-circle">{member.avatar}</div>
            <div style={{ flex: 1 }}>
              <strong>{member.name} {member.id === currentUser.id && <span style={{ opacity: 0.5, fontSize: 11 }}>(you)</span>}</strong>
              <p>{member.email}</p>
            </div>
            <select
              value={member.role}
              onChange={e => updateMemberRole(member.id, e.target.value)}
              disabled={member.id === currentUser.id}
              style={{
                background: 'var(--surface-2, #1e1e2e)', border: '1px solid var(--border, #2e2e3e)',
                borderRadius: 6, padding: '4px 8px', color: 'var(--text, #fff)', fontSize: 12, cursor: member.id === currentUser.id ? 'not-allowed' : 'pointer'
              }}
            >
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <span className="task-count">{member.taskCount} tasks</span>
            {member.id !== currentUser.id && (
              <button
                type="button"
                className="ghost-button"
                style={{ padding: '4px 6px', color: '#ef4444' }}
                onClick={() => removeMember(member.id)}
                title="Remove member"
              >
                <Trash2 size={14} />
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
