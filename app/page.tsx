import { ActivityFeed } from '@/components/ActivityFeed';
import { CalendarView } from '@/components/CalendarView';
import { CommandPalette } from '@/components/CommandPalette';
import { Header } from '@/components/Header';
import { KanbanBoard } from '@/components/KanbanBoard';
import { NotificationsPanel } from '@/components/NotificationsPanel';
import { Sidebar } from '@/components/Sidebar';
import { StatsGrid } from '@/components/StatsGrid';
import { TaskDetailPanel } from '@/components/TaskDetailPanel';
import { TaskListView } from '@/components/TaskListView';
import { TeamMembers } from '@/components/TeamMembers';

export default function HomePage() {
  return (
    <main className="app-shell">
      <Sidebar />
      <div className="content-shell">
        <Header />
        <StatsGrid />
        <div className="content-grid content-grid--primary">
          <TaskListView />
          <TaskDetailPanel />
        </div>
        <KanbanBoard />
        <div className="content-grid">
          <CalendarView />
          <ActivityFeed />
        </div>
        <div className="content-grid">
          <TeamMembers />
          <NotificationsPanel />
        </div>
        <CommandPalette />
      </div>
    </main>
  );
}
