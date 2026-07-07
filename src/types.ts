export type Role = 'Owner' | 'Admin' | 'Member' | 'Viewer';
export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TaskStatus = 'Todo' | 'In Progress' | 'In Review' | 'Done';
export type NotificationType = 'assignment' | 'comment' | 'due_date' | 'invite';
export type View = 'dashboard' | 'projects' | 'notifications' | 'team' | 'settings';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  taskCount: number;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Comment {
  id: string;
  author: string;
  body: string;
  time: string;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  target: string;
  time: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string;
  dueDate: string;
  priority: Priority;
  status: TaskStatus;
  labels: Label[];
  subtasks: Subtask[];
  comments: Comment[];
  activity: ActivityItem[];
}

export interface Project {
  id: string;
  name: string;
  icon: string;
  color: string;
  archived: boolean;
  description: string;
  tasks: Task[];
}

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  time: string;
  read: boolean;
}

export interface DashboardStats {
  myTasks: number;
  overdue: number;
  dueToday: number;
  completedThisWeek: number;
}

export interface TeamHubData {
  organization: {
    name: string;
    members: User[];
  };
  currentUser: User;
  dashboard: DashboardStats;
  projects: Project[];
  notifications: Notification[];
}
