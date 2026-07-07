import { teamHubData } from '@/src/data';

export function TeamMembers() {
  return (
    <section className="panel section-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Team members</p>
          <h3>Organization access and workload</h3>
        </div>
        <button className="ghost-button" type="button">Invite member</button>
      </div>

      <div className="team-list">
        {teamHubData.organization.members.map((member) => (
          <article className="team-card" key={member.id}>
            <div className="avatar-circle">{member.avatar}</div>
            <div>
              <strong>{member.name}</strong>
              <p>{member.email}</p>
            </div>
            <span className="badge subtle">{member.role}</span>
            <span className="task-count">{member.taskCount} tasks</span>
          </article>
        ))}
      </div>
    </section>
  );
}
