'use client';
import { useApp } from '@/src/context';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { StatsGrid } from '@/components/StatsGrid';
import { TaskListView } from '@/components/TaskListView';
import { TaskDetailPanel } from '@/components/TaskDetailPanel';
import { KanbanBoard } from '@/components/KanbanBoard';
import { CalendarView } from '@/components/CalendarView';
import { ActivityFeed } from '@/components/ActivityFeed';
import { TeamMembers } from '@/components/TeamMembers';
import { NotificationsPanel } from '@/components/NotificationsPanel';
import { CommandPalette } from '@/components/CommandPalette';
import { NewTaskModal } from '@/components/NewTaskModal';
import { NewProjectModal } from '@/components/NewProjectModal';
import { InviteMemberModal } from '@/components/InviteMemberModal';
import { ProjectsView } from '@/components/ProjectsView';
import { SettingsView } from '@/components/SettingsView';

function DashboardContent() {
  return (
    <>
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
    </>
  );
}

function NotificationsContent() {
  return (
    <div style={{ maxWidth: 700 }}>
      <NotificationsPanel />
    </div>
  );
}

function TeamContent() {
  return (
    <div style={{ maxWidth: 800 }}>
      <TeamMembers />
    </div>
  );
}

export default function AppShell() {
  const { activeView } = useApp();

  return (
    <main className="app-shell">
      <Sidebar />
      <div className="content-shell">
        <Header />
        <div style={{ padding: '0 0 40px' }}>
          {activeView === 'dashboard' && <DashboardContent />}
          {activeView === 'projects' && <ProjectsView />}
          {activeView === 'notifications' && <NotificationsContent />}
          {activeView === 'team' && <TeamContent />}
          {activeView === 'settings' && <SettingsView />}
        </div>
      </div>
      <CommandPalette />
      <NewTaskModal />
      <NewProjectModal />
      <InviteMemberModal />
    </main>
  );
}
