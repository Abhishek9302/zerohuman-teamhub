import type { TeamHubData } from './types';

export const teamHubData: TeamHubData = {
  organization: {
    name: 'TeamHub Labs',
    members: [
      { id: 'u1', name: 'Ava Patel', email: 'ava@teamhub.dev', role: 'Owner', avatar: 'AP', taskCount: 12 },
      { id: 'u2', name: 'Jon Park', email: 'jon@teamhub.dev', role: 'Admin', avatar: 'JP', taskCount: 8 },
      { id: 'u3', name: 'Mia Chen', email: 'mia@teamhub.dev', role: 'Member', avatar: 'MC', taskCount: 6 },
      { id: 'u4', name: 'Leo Gomez', email: 'leo@teamhub.dev', role: 'Viewer', avatar: 'LG', taskCount: 2 }
    ]
  },
  currentUser: { id: 'u2', name: 'Jon Park', email: 'jon@teamhub.dev', role: 'Admin', avatar: 'JP', taskCount: 8 },
  dashboard: {
    myTasks: 8,
    overdue: 2,
    dueToday: 3,
    completedThisWeek: 14
  },
  projects: [
    {
      id: 'p1',
      name: 'TeamHub Platform',
      icon: '🚀',
      color: '#7c3aed',
      archived: false,
      description: 'Core product delivery for project, task, and collaboration workflows.',
      tasks: [
        {
          id: 't1',
          title: 'Launch authentication API',
          description: 'Implement signup, login, logout, refresh token handling, and route protection with JWT.',
          assignee: 'Jon Park',
          dueDate: 'Today',
          priority: 'Urgent',
          status: 'In Progress',
          labels: [
            { id: 'l1', name: 'Backend', color: '#22c55e' },
            { id: 'l2', name: 'Auth', color: '#f97316' }
          ],
          subtasks: [
            { id: 's1', title: 'JWT middleware', done: true },
            { id: 's2', title: 'Refresh token rotation', done: false },
            { id: 's3', title: 'Logout blacklist strategy', done: false }
          ],
          comments: [
            { id: 'c1', author: 'Ava Patel', body: '@Jon make sure invite acceptance also uses the same auth session semantics.', time: '1h ago' },
            { id: 'c2', author: 'Jon Park', body: 'JWT flow is wired; I am finishing refresh rotation and revocation handling.', time: '38m ago' }
          ],
          activity: [
            { id: 'a1', actor: 'Ava Patel', action: 'assigned', target: 'Launch authentication API', time: '2h ago' },
            { id: 'a2', actor: 'Jon Park', action: 'updated status to In Progress', target: 'Launch authentication API', time: '1h ago' }
          ]
        },
        {
          id: 't2',
          title: 'Design dashboard summary cards',
          description: 'Create the overview with my tasks, overdue items, due today, and project distribution.',
          assignee: 'Mia Chen',
          dueDate: 'Tomorrow',
          priority: 'High',
          status: 'Todo',
          labels: [
            { id: 'l3', name: 'Frontend', color: '#38bdf8' },
            { id: 'l4', name: 'Dashboard', color: '#ec4899' }
          ],
          subtasks: [
            { id: 's4', title: 'Responsive widget layout', done: false },
            { id: 's5', title: 'Project distribution chart', done: false }
          ],
          comments: [
            { id: 'c3', author: 'Mia Chen', body: 'Pulling together a compact card system with dark mode support.', time: '25m ago' }
          ],
          activity: [
            { id: 'a3', actor: 'Ava Patel', action: 'created', target: 'Design dashboard summary cards', time: '3h ago' }
          ]
        },
        {
          id: 't3',
          title: 'Ship command palette',
          description: 'Add quick navigation for projects, tasks, and people with Cmd+K behavior.',
          assignee: 'Jon Park',
          dueDate: 'Friday',
          priority: 'Medium',
          status: 'Done',
          labels: [
            { id: 'l5', name: 'UX', color: '#a855f7' }
          ],
          subtasks: [
            { id: 's6', title: 'Keyboard shortcut listener', done: true },
            { id: 's7', title: 'Result grouping', done: true }
          ],
          comments: [
            { id: 'c4', author: 'Leo Gomez', body: 'Nice polish on the quick switcher.', time: 'Yesterday' }
          ],
          activity: [
            { id: 'a4', actor: 'Jon Park', action: 'completed', target: 'Ship command palette', time: 'Yesterday' }
          ]
        }
      ]
    },
    {
      id: 'p2',
      name: 'Mobile Expansion',
      icon: '📱',
      color: '#0ea5e9',
      archived: false,
      description: 'Tablet-first planning and notification flows for the mobile web experience.',
      tasks: [
        {
          id: 't4',
          title: 'Tablet kanban refinement',
          description: 'Tune card spacing, side gutters, and drag targets for tablet sizes.',
          assignee: 'Ava Patel',
          dueDate: 'Today',
          priority: 'High',
          status: 'In Review',
          labels: [
            { id: 'l6', name: 'Responsive', color: '#14b8a6' }
          ],
          subtasks: [
            { id: 's8', title: 'Landscape validation', done: true },
            { id: 's9', title: 'Touch-friendly controls', done: false }
          ],
          comments: [
            { id: 'c5', author: 'Ava Patel', body: '@Mia please sanity check drag handles on iPad widths.', time: '12m ago' }
          ],
          activity: [
            { id: 'a5', actor: 'Ava Patel', action: 'requested review on', target: 'Tablet kanban refinement', time: '19m ago' }
          ]
        }
      ]
    }
  ],
  notifications: [
    { id: 'n1', type: 'assignment', message: 'You were assigned to Launch authentication API.', time: '1h ago', read: false },
    { id: 'n2', type: 'comment', message: 'Ava mentioned you in a task comment.', time: '58m ago', read: false },
    { id: 'n3', type: 'due_date', message: '2 tasks are due today.', time: '30m ago', read: true },
    { id: 'n4', type: 'invite', message: 'Leo Gomez accepted the TeamHub Labs invite.', time: 'Yesterday', read: true }
  ]
};
