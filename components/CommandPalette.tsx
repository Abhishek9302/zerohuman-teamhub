import { teamHubData } from '@/src/data';

export function CommandPalette() {
  const shortcuts = [
    'Jump to dashboard',
    'Open TeamHub Platform',
    'Create new task',
    'Review due today',
    `Message ${teamHubData.organization.members[0].name}`
  ];

  return (
    <section className="panel command-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Cmd + K</p>
          <h3>Quick actions</h3>
        </div>
      </div>

      <div className="command-box">
        <input aria-label="Command palette" defaultValue="Create a task in TeamHub Platform" />
        <div className="command-results">
          {shortcuts.map((item) => (
            <div className="command-result" key={item}>{item}</div>
          ))}
        </div>
      </div>
    </section>
  );
}
